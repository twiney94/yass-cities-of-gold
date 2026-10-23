import { describe, expect, it } from 'vitest';
import { STANDIN_BLOCKADES } from '../content/standin';
import { buildBoard } from '../engine/route';
import { makeRandom } from './random';
import { scoreBoard } from './score';
import { DIFFICULTY_ROUNDS, type Difficulty, generateMap, mapCode } from './search';
import { type Knobs, generateRoute } from './terrain';

const knobs = (overrides: Partial<Knobs> = {}): Knobs => ({
  tiles: 3,
  winding: 0.5,
  rivers: 0.6,
  villages: 0.8,
  ridges: 0.6,
  peaks: 0.6,
  crossings: 0.7,
  strength: 0.3,
  rubble: 0.2,
  camps: 1,
  finish: 'paddle',
  ...overrides,
});

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

describe('generateRoute', () => {
  it('builds the same route from the same settings and seed', () => {
    expect(generateRoute(knobs(), 42, 'A')).toEqual(generateRoute(knobs(), 42, 'A'));
    expect(generateRoute(knobs(), 42, 'A')).not.toEqual(generateRoute(knobs(), 43, 'A'));
  });

  it('makes boards with 4 starting spaces, 3 finishing spaces and a blockade per tile border', () => {
    const board = buildBoard(generateRoute(knobs({ tiles: 4 }), 7, 'A')!, STANDIN_BLOCKADES, 7);
    const spaces = Object.values(board.spaces).flatMap((space) => space ?? []);

    expect(spaces.filter((space) => space.terrain.kind === 'start')).toHaveLength(4);
    expect(spaces.filter((space) => space.finish)).toHaveLength(3);
    expect(board.blockades).toHaveLength(4);
  });

  it('always leaves a way from every starting space to the finish, even when crowded with mountains', () => {
    const random = makeRandom(5);
    for (let i = 0; i < 40; i++) {
      const crowded = knobs({ tiles: 2 + random.int(4), ridges: 2.5, peaks: 2.5, winding: random.next() });
      const seed = random.int(2 ** 31);

      const board = buildBoard(generateRoute(crowded, seed, 'A')!, STANDIN_BLOCKADES, seed);

      expect(scoreBoard(board).valid).toBe(true);
    }
  });
});

describe('generateMap', () => {
  it('gives the same map for the same difficulty and seed', () => {
    expect(generateMap('easy', 9).board).toEqual(generateMap('easy', 9).board);
  });

  it('names maps with a code that encodes difficulty and seed', () => {
    expect(mapCode('medium', 1234)).toBe('M-YA');
    expect(generateMap('easy', 1234).name).toBe('Easy trail E-YA');
  });

  it('keeps long hard routes varied: mixed colours and no long stretch of one colour', () => {
    for (const seed of [11, 22, 33]) {
      const { score } = generateMap('hard', seed);

      expect(score.mix).toBeGreaterThanOrEqual(0.65);
      expect(score.longestRun).toBeLessThanOrEqual(5);
    }
  });

  it('orders difficulties by how many rounds bots need', () => {
    const rounds = (difficulty: Difficulty) => median([3, 4, 5].map((seed) => median(generateMap(difficulty, seed).playtestRounds)));

    const easy = rounds('easy');
    const medium = rounds('medium');
    const hard = rounds('hard');

    expect(easy).toBeLessThan(medium);
    expect(medium).toBeLessThan(hard);
    expect(easy).toBeLessThanOrEqual(DIFFICULTY_ROUNDS.easy[1] + 1);
    expect(hard).toBeGreaterThanOrEqual(DIFFICULTY_ROUNDS.hard[0] - 1);
  }, 60000);
});
