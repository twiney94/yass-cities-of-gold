import { create } from 'zustand';
import type { Action, GameEvent } from '../engine/actions';
import { applyActions } from '../engine/rules';
import { createGame } from '../engine/setup';
import type { CardId, GameState, PieceId } from '../engine/state';
import type { Selection } from './intents';
import { describeEvents } from './labels';
import type { GameMap } from './maps';

export type Seat = 'human' | 'bot';
export type LogLine = { id: number; text: string };
export type Animation = { id: number; events: GameEvent[] };

// After a turn ends, the cards on screen stay the previous player's (handoff) while their clean-up
// animates. Then the next player takes the screen: behind a pass screen when another human may be
// looking, straight away otherwise (a bot, or the only human at the table).
type GameStore = {
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

const lines = (texts: string[]): LogLine[] => texts.map((text) => ({ id: nextId++, text }));
const animation = (events: GameEvent[]): Animation => ({ id: nextId++, events });
const needsPassScreen = (seats: Seat[], player: number) =>
  seats[player] === 'human' && seats.filter((seat) => seat === 'human').length > 1;

export const useGame = create<GameStore>((set, get) => ({
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

  newGame: (seats, map) => {
    const seed = Math.floor(Math.random() * 2 ** 32);
    const covered = needsPassScreen(seats, 0);
    set({
      game: createGame({ board: map.board, playerCount: seats.length as 2 | 3 | 4, seed }),
      map,
      seats,
      viewer: 0,
      selection: NO_SELECTION,
      handoff: false,
      covered,
      animation: animation([]),
      focusCue: covered ? 0 : 1,
      log: lines([`New game on ${map.name}${map.summary ? ` (${map.summary})` : ''}`]),
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
    const { game } = get();
    if (game) {
      set(({ focusCue }) => ({
        handoff: false,
        covered: false,
        viewer: game.turn.player,
        animation: animation([]),
        focusCue: focusCue + 1,
      }));
    }
  },

  clearError: () => set({ error: null }),
}));
