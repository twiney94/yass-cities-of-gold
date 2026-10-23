import { describe, expect, it } from 'vitest';
import { createGame } from './setup';
import { at, trackBoard } from './testing/boards';
import { ids, types } from './testing/fixtures';

const board = trackBoard('G1 G1 G1');

describe('createGame', () => {
  it('deals each player 4 cards from their shuffled 8-card starting deck', () => {
    const state = createGame({ board, playerCount: 4, seed: 3 });

    for (const player of state.players) {
      expect(player.hand).toHaveLength(4);
      expect(player.drawPile).toHaveLength(4);
      expect(types([...player.hand, ...player.drawPile]).sort()).toEqual(
        ['explorer', 'explorer', 'explorer', 'sailor', 'traveler', 'traveler', 'traveler', 'traveler'],
      );
    }
  });

  it('places one piece per player on the starting spaces, in turn order', () => {
    const state = createGame({ board, playerCount: 4, seed: 3 });

    expect(state.pieces.map((p) => [p.owner, p.at])).toEqual([
      [0, at(0, 2)],
      [1, at(1, 2)],
      [2, at(2, 2)],
      [3, at(3, 2)],
    ]);
  });

  it('gives one piece each in a 2-player game, on spaces 1 and 2', () => {
    const state = createGame({ board, playerCount: 2, seed: 3 });

    expect(state.pieces.map((p) => [p.owner, p.at])).toEqual([
      [0, at(0, 2)],
      [1, at(1, 2)],
    ]);
  });

  it('opens the market with the 6 starting piles on the board and 3 copies of every card', () => {
    const state = createGame({ board, playerCount: 2, seed: 3 });

    expect(state.market.slots).toEqual(['scout', 'trailblazer', 'photographer', 'treasureChest', 'jackOfAllTrades', 'transmitter']);
    expect(Object.values(state.market.remaining)).toHaveLength(18);
    expect(Object.values(state.market.remaining).every((left) => left === 3)).toBe(true);
  });

  it('deals the same cards from the same seed', () => {
    const order = (seed: number) =>
      createGame({ board, playerCount: 2, seed }).players.map((p) => ids([...p.hand, ...p.drawPile]));

    expect(order(9)).toEqual(order(9));
    expect(order(9)).not.toEqual(order(10));
  });

  it('refuses a board without enough starting spaces', () => {
    const tooSmall = trackBoard('G1').spaces;
    delete tooSmall[at(3, 2)];

    expect(() => createGame({ board: { spaces: tooSmall, blockades: [] }, playerCount: 4, seed: 1 })).toThrow(
      'no starting space 4',
    );
  });
});
