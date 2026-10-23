import type { Board } from './board';
import { ALL_CARDS, COPIES_PER_MARKET_PILE } from './cards';
import { type HexKey, hexKey } from './hex';
import { shuffle } from './rng';
import { HAND_SIZE, drawCards } from './rules';
import type { GameState } from './state';

export type GameConfig = { board: Board; playerCount: 2 | 3 | 4; seed: number };

const START_SLOTS: Record<GameConfig['playerCount'], number[][]> = {
  2: [[1, 3], [2, 4]],
  3: [[1], [2], [3]],
  4: [[1], [2], [3], [4]],
};

const STARTER_TYPES = ALL_CARDS.flatMap((card) =>
  card.supply.from === 'starterDeck' ? Array.from({ length: card.supply.copies }, () => card.type) : [],
);

const MARKET_CARDS = ALL_CARDS.filter((card) => card.supply.from !== 'starterDeck');

export const createGame = ({ board, playerCount, seed }: GameConfig): GameState => {
  const startSpaces = new Map<number, HexKey>();
  for (const space of Object.values(board.spaces)) {
    if (space && space.terrain.kind === 'start') startSpaces.set(space.terrain.slot, hexKey(space.hex));
  }

  const state: GameState = {
    board,
    players: [],
    pieces: [],
    market: {
      slots: MARKET_CARDS.filter((card) => card.supply.from === 'marketBoard').map((card) => card.type),
      remaining: Object.fromEntries(MARKET_CARDS.map((card) => [card.type, COPIES_PER_MARKET_PILE])),
    },
    box: [],
    blockades: board.blockades.map((blockade) => blockade.id),
    turn: { player: 0, stage: 'moving', movement: null, pending: null },
    status: { kind: 'playing' },
    rng: seed >>> 0,
    nextCardId: 0,
    finishers: 0,
  };

  START_SLOTS[playerCount].forEach((slots, owner) => {
    const deck = STARTER_TYPES.map((type) => ({ id: state.nextCardId++, type }));
    const shuffled = shuffle(deck, state.rng);
    state.rng = shuffled.state;
    state.players.push({ drawPile: shuffled.items, hand: [], played: [], discard: [], blockades: [], finishedOrder: null });
    drawCards(state, [], owner, HAND_SIZE);
    for (const slot of slots) {
      const at = startSpaces.get(slot);
      if (!at) throw new Error(`The board has no starting space ${slot}`);
      state.pieces.push({ id: state.pieces.length, owner, at });
    }
  });

  return state;
};
