import { describe, expect, it } from 'vitest';
import type { Action } from './actions';
import { type Blockade, type Board, adjacentSpaces, touchesBlockade } from './board';
import { CARDS, COPIES_PER_MARKET_PILE } from './cards';
import { type HexKey, hexKey } from './hex';
import { nextRandom } from './rng';
import { applyAction } from './rules';
import { createGame } from './setup';
import type { Card, GameState } from './state';
import { STANDIN_BLOCKADES, STANDIN_ROUTE } from '../content/standin';
import { buildBoard } from './route';
import { boardFromRows } from './testing/boards';

const blockades: Blockade[] = [
  { id: 1, tiles: ['T0', 'T1'], requirement: { kind: 'landscape', suit: 'machete', power: 1 } },
  { id: 2, tiles: ['T1', 'T2'], requirement: { kind: 'rubble', cards: 1 } },
];

const testBoard = boardFromRows(
  [
    'S1 G1 G1 Y1 | G2 B1 B1 G1 | Y2 G1 M  FG1',
    'S2 G1 R1 G1 | M  B2 G1 C1 | G1 Y1 G2 FB1',
    'S3 Y1 G1 B1 | G1 G1 R2 G2 | M  G2 G1 FY1',
    'S4 G1 B1 G1 | Y2 G1 G1 Y1 | B1 G1 Y1 FG1',
  ],
  blockades,
);

const distancesToFinish = (board: Board): Map<HexKey, number> => {
  const spaces = Object.values(board.spaces).flatMap((space) => space ?? []);
  const distance = new Map<HexKey, number>();
  const queue = spaces.filter((space) => space.finish);
  for (const space of queue) distance.set(hexKey(space.hex), 0);
  for (const space of queue) {
    const d = distance.get(hexKey(space.hex))!;
    for (const neighbor of adjacentSpaces(board, hexKey(space.hex))) {
      const key = hexKey(neighbor.hex);
      if (distance.has(key) || neighbor.terrain.kind === 'mountain') continue;
      distance.set(key, d + 1);
      if (neighbor.terrain.kind !== 'start') queue.push(neighbor);
    }
  }
  return distance;
};

// A crude bot: it tries forward moves first, then actions and a purchase, then ends its turn.
const proposals = (state: GameState, distance: Map<HexKey, number>, random: () => number): Action[] => {
  const pick = <T>(items: readonly T[]): T[] => items.filter(() => random() < 0.5);
  const { turn } = state;
  const hand = state.players[turn.player]!.hand;
  if (turn.pending) return [{ type: 'removeFromHand', cardIds: pick(hand).slice(0, turn.pending.max).map((c) => c.id) }];

  const actions: Action[] = [];
  const occupied = new Set(state.pieces.map((p) => p.at));
  const forward = (from: HexKey) =>
    adjacentSpaces(state.board, from).filter(
      (s) => !occupied.has(hexKey(s.hex)) && (distance.get(hexKey(s.hex)) ?? 99) < (distance.get(from) ?? 99),
    );
  const touching = (from: HexKey) =>
    state.board.blockades.filter((b) => state.blockades.includes(b.id) && touchesBlockade(state.board, from, b));
  const cardsFor = (count: number): Card[] => [...hand].sort(() => random() - 0.5).slice(0, count);

  if (turn.movement) {
    const piece = state.pieces[turn.movement.pieceId]!;
    if (piece.at !== 'eldorado') {
      for (const space of forward(piece.at)) actions.push({ type: 'step', target: { kind: 'space', hex: hexKey(space.hex) } });
      for (const b of touching(piece.at)) actions.push({ type: 'step', target: { kind: 'blockade', id: b.id } });
    }
  }

  for (const piece of state.pieces) {
    if (piece.owner !== turn.player || piece.at === 'eldorado') continue;
    const targets = [
      ...touching(piece.at).map((b) => ({ target: { kind: 'blockade', id: b.id } as const, terrain: b.requirement })),
      ...forward(piece.at).map((s) => ({ target: { kind: 'space', hex: hexKey(s.hex) } as const, terrain: s.terrain })),
    ];
    for (const { target, terrain } of targets) {
      if (terrain.kind === 'landscape') {
        for (const card of hand) {
          const face = CARDS[card.type].face;
          const suits = face.kind === 'joker' || (face.kind === 'expedition' && face.suit === terrain.suit);
          if (face.kind !== 'action' && suits && face.power >= terrain.power) {
            actions.push({ type: 'playForMovement', cardId: card.id, pieceId: piece.id, suit: face.kind === 'joker' ? terrain.suit : undefined });
          }
        }
      }
      if (terrain.kind === 'rubble' || terrain.kind === 'basecamp') {
        actions.push({ type: 'payCards', pieceId: piece.id, target, cardIds: cardsFor(terrain.cards).map((c) => c.id) });
      }
      for (const card of hand) {
        if (card.type === 'native') actions.push({ type: 'playNative', cardId: card.id, pieceId: piece.id, target });
      }
    }
  }

  for (const card of hand) {
    const face = CARDS[card.type].face;
    if (face.kind !== 'action' || random() < 0.3) continue;
    if (face.effect === 'transmitter') {
      const types = Object.keys(state.market.remaining) as (keyof typeof state.market.remaining)[];
      actions.push({ type: 'playTransmitter', cardId: card.id, take: types[Math.floor(random() * types.length)]! });
    } else if (face.effect !== 'native') {
      actions.push({ type: 'playAction', cardId: card.id });
    }
  }

  for (const cardType of pick(Object.keys(state.market.remaining) as (keyof typeof state.market.remaining)[])) {
    actions.push({ type: 'buy', cardType, cardIds: hand.map((c) => c.id) });
  }
  actions.push({ type: 'endTurn', discard: pick(hand).map((c) => c.id) });
  return actions;
};

const assertInvariants = (state: GameState) => {
  const owned = state.players.flatMap((p) => [...p.drawPile, ...p.hand, ...p.played, ...p.discard]);
  const all = [...owned, ...state.box];
  const sold = Object.values(state.market.remaining).reduce((sum, left = 0) => sum + COPIES_PER_MARKET_PILE - left, 0);
  expect(new Set(all.map((c) => c.id)).size).toBe(all.length);
  expect(all.length).toBe(state.players.length * 8 + sold);

  const occupied = state.pieces.flatMap((p) => (p.at === 'eldorado' ? [] : [p.at]));
  expect(new Set(occupied).size).toBe(occupied.length);
  for (const at of occupied) expect(state.board.spaces[at]?.terrain.kind).not.toBe('mountain');

  const slotted = state.market.slots.filter((slot) => slot !== null);
  expect(new Set(slotted).size).toBe(slotted.length);
  expect(Object.values(state.market.remaining).every((left = 0) => left >= 0)).toBe(true);
  for (const player of state.players) {
    for (const id of player.blockades) expect(state.blockades).not.toContain(id);
  }
};

const playGame = (board: Board, seed: number, playerCount: 2 | 3 | 4) => {
  const distance = distancesToFinish(board);
  let state = createGame({ board, playerCount, seed });
  let botState = seed;
  const random = () => {
    const roll = nextRandom(botState);
    botState = roll.state;
    return roll.value;
  };
  let turns = 0;
  while (state.status.kind !== 'over' && turns < 500) {
    const before = JSON.stringify(state);
    const accepted = proposals(state, distance, random).find((action) => applyAction(state, action).ok)!;
    const result = applyAction(state, accepted);
    if (!result.ok) throw new Error(result.error);
    expect(JSON.stringify(state)).toBe(before);
    state = result.state;
    assertInvariants(state);
    if (accepted.type === 'endTurn') turns++;
  }
  return { state, turns };
};

describe('random games', () => {
  const games = ([2, 3, 4] as const).flatMap((players) => Array.from({ length: 8 }, (_, i) => ({ players, seed: i + 1 })));

  it.each(games)('$players players, seed $seed: plays to the end without breaking any invariant', ({ players, seed }) => {
    const { state } = playGame(testBoard, seed, players);

    expect(state.status.kind).toBe('over');
  });

  it('replays a game identically from the same seed', () => {
    expect(playGame(testBoard, 5, 3)).toEqual(playGame(testBoard, 5, 3));
  });

  it.each(games.filter(({ seed }) => seed <= 3))('stand-in route, $players players, seed $seed: can be finished', ({ players, seed }) => {
    const { state } = playGame(buildBoard(STANDIN_ROUTE, STANDIN_BLOCKADES, seed), seed, players);

    expect(state.status.kind).toBe('over');
  });
});
