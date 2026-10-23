import { create } from 'zustand';
import { STANDIN_BLOCKADES, STANDIN_ROUTE } from '../content/standin';
import type { Action, GameEvent } from '../engine/actions';
import { buildBoard } from '../engine/route';
import { applyActions } from '../engine/rules';
import { createGame } from '../engine/setup';
import type { CardId, GameState, PieceId } from '../engine/state';
import type { Selection } from './intents';
import { describeEvents } from './labels';

export type LogLine = { id: number; text: string };
export type Animation = { id: number; events: GameEvent[] };

// After a turn ends, the hand on screen stays the previous player's (handoff) while their clean-up
// animates; then the pass screen covers it, and revealing switches the viewer to the new player.
type GameStore = {
  game: GameState | null;
  viewer: number;
  selection: Selection;
  handoff: boolean;
  covered: boolean;
  animation: Animation;
  focusCue: number;
  log: LogLine[];
  error: string | null;
  newGame: (playerCount: 2 | 3 | 4) => void;
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

export const useGame = create<GameStore>((set, get) => ({
  game: null,
  viewer: 0,
  selection: NO_SELECTION,
  handoff: false,
  covered: false,
  animation: animation([]),
  focusCue: 0,
  log: [],
  error: null,

  newGame: (playerCount) => {
    const seed = Math.floor(Math.random() * 2 ** 32);
    const board = buildBoard(STANDIN_ROUTE, STANDIN_BLOCKADES, seed);
    set({
      game: createGame({ board, playerCount, seed }),
      viewer: 0,
      selection: NO_SELECTION,
      handoff: false,
      covered: true,
      animation: animation([]),
      focusCue: 0,
      log: lines([`New game on ${STANDIN_ROUTE.name} (seed ${seed})`]),
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

  finishHandoff: () => set({ handoff: false, covered: true }),

  reveal: () => {
    const { game } = get();
    if (game) set(({ focusCue }) => ({ covered: false, viewer: game.turn.player, animation: animation([]), focusCue: focusCue + 1 }));
  },

  clearError: () => set({ error: null }),
}));
