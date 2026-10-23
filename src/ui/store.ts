import { create } from 'zustand';
import type { BotLevel } from '../bot/bot';
import type { Action, GameEvent } from '../engine/actions';
import { applyActions } from '../engine/rules';
import { createGame } from '../engine/setup';
import type { CardId, GameState, PieceId } from '../engine/state';
import { type TurnOrderRoll, d6, rollTurnOrder } from './dice';
import type { Selection } from './intents';
import { type LogEntry, type PlayerColor, describeEvents } from './labels';
import type { GameMap } from './maps';

export type Seat = { color: PlayerColor } & ({ kind: 'human' } | { kind: 'bot'; level: BotLevel });
export type LogLine = { id: number; entry: LogEntry };
export type Animation = { id: number; events: GameEvent[] };
export type PendingRoll = { seats: Seat[]; map: GameMap; result: TurnOrderRoll };

// After a turn ends, the cards on screen stay the previous player's (handoff) while their clean-up
// animates. Then the next human takes the screen: behind a pass screen when another human may be
// looking, straight away otherwise. During a bot's turn the screen stays with the last human, so
// they can plan with the hand they just drew.
type GameStore = {
  roll: PendingRoll | null;
  game: GameState | null;
  map: GameMap | null;
  seats: Seat[];
  viewer: number;
  selection: Selection;
  handoff: boolean;
  covered: boolean;
  animation: Animation;
  focusCue: number;
  log: LogLine[];
  error: string | null;
  prepare: (seats: Seat[], map: GameMap) => void;
  begin: () => void;
  newGame: (seats: Seat[], map: GameMap) => void;
  quit: () => void;
  toggleCard: (id: CardId) => void;
  choosePiece: (id: PieceId) => void;
  perform: (actions: Action[]) => void;
  finishHandoff: () => void;
  reveal: () => void;
  clearError: () => void;
};

const NO_SELECTION: Selection = { cards: [], pieceId: null };
const LOG_LENGTH = 60;
let nextId = 0;

const lines = (entries: LogEntry[]): LogLine[] => entries.map((entry) => ({ id: nextId++, entry }));
const animation = (events: GameEvent[]): Animation => ({ id: nextId++, events });
const needsPassScreen = (seats: Seat[], player: number) =>
  seats[player]?.kind === 'human' && seats.filter((seat) => seat.kind === 'human').length > 1;

export const nextViewer = (seats: Seat[], player: number, viewer: number) =>
  seats[player]?.kind === 'human' || seats[viewer]?.kind !== 'human' ? player : viewer;

const firstViewer = (seats: Seat[]) => {
  const humans = seats.flatMap((seat, i) => (seat.kind === 'human' ? [i] : []));
  return nextViewer(seats, 0, humans.length === 1 ? humans[0]! : 0);
};

export const useGame = create<GameStore>((set, get) => ({
  roll: null,
  game: null,
  map: null,
  seats: [],
  viewer: 0,
  selection: NO_SELECTION,
  handoff: false,
  covered: false,
  animation: animation([]),
  focusCue: 0,
  log: [],
  error: null,

  prepare: (seats, map) => set({ roll: { seats, map, result: rollTurnOrder(seats.length, d6) }, game: null }),

  begin: () => {
    const { roll } = get();
    if (!roll) return;
    set({ roll: null });
    get().newGame(
      roll.result.order.map((i) => roll.seats[i]!),
      roll.map,
    );
  },

  newGame: (seats, map) => {
    const seed = Math.floor(Math.random() * 2 ** 32);
    const covered = needsPassScreen(seats, 0);
    set({
      game: createGame({ board: map.board, playerCount: seats.length as 2 | 3 | 4, seed }),
      map,
      seats,
      viewer: firstViewer(seats),
      selection: NO_SELECTION,
      handoff: false,
      covered,
      animation: animation([]),
      focusCue: covered ? 0 : 1,
      log: lines([{ kind: 'newGame' }]),
      error: null,
    });
  },

  quit: () => set({ game: null, selection: NO_SELECTION, handoff: false, covered: false, log: [] }),

  toggleCard: (id) =>
    set(({ selection }) => ({
      selection: {
        ...selection,
        cards: selection.cards.includes(id) ? selection.cards.filter((c) => c !== id) : [...selection.cards, id],
      },
    })),

  choosePiece: (pieceId) => set(({ selection }) => ({ selection: { ...selection, pieceId } })),

  perform: (actions) => {
    const { game, selection, log } = get();
    if (!game) return;
    const result = applyActions(game, actions);
    if (!result.ok) {
      console.warn('Move rejected:', result.error);
      set({ error: result.error });
      return;
    }
    const turnPassed = result.events.some((e) => e.type === 'turnStarted');
    set({
      game: result.state,
      selection: turnPassed ? NO_SELECTION : { ...NO_SELECTION, pieceId: selection.pieceId },
      handoff: turnPassed,
      animation: animation(result.events),
      log: [...log, ...lines(describeEvents(result.events, result.state))].slice(-LOG_LENGTH),
      error: null,
    });
  },

  finishHandoff: () => {
    const { game, seats } = get();
    if (!game) return;
    if (needsPassScreen(seats, game.turn.player)) set({ handoff: false, covered: true });
    else get().reveal();
  },

  reveal: () => {
    const { game, seats } = get();
    if (game) {
      set(({ focusCue, viewer }) => ({
        handoff: false,
        covered: false,
        viewer: nextViewer(seats, game.turn.player, viewer),
        animation: animation([]),
        focusCue: focusCue + 1,
      }));
    }
  },

  clearError: () => set({ error: null }),
}));
