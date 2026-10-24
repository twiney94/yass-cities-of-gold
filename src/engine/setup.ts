import type { Board } from './board';
import { ALL_CARDS, COPIES_PER_MARKET_PILE } from './cards';
import { type HexKey, hexKey } from './hex';
import { shuffle } from './rng';
import { HAND_SIZE, drawCards } from './rules';
import type { GameState } from './state';

export type GameConfig = { board: Board; playerCount: 2 | 3 | 4; seed: number };

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

  for (let owner = 0; owner < playerCount; owner++) {
    const deck = STARTER_TYPES.map((type) => ({ id: state.nextCardId++, type }));
    const shuffled = shuffle(deck, state.rng);
    state.rng = shuffled.state;
    state.players.push({ drawPile: shuffled.items, hand: [], played: [], discard: [], removed: [], blockades: [], finishedOrder: null });
    drawCards(state, [], owner, HAND_SIZE);
    const at = startSpaces.get(owner + 1);
    if (!at) throw new Error(`The board has no starting space ${owner + 1}`);
    state.pieces.push({ id: owner, owner, at });
  }

  return state;
};
