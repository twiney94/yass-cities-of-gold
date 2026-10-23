import { describe, expect, it } from 'vitest';
import { nextRandom, shuffle } from './rng';

describe('seeded rng', () => {
  it('replays the same sequence from the same seed', () => {
    const roll = (seed: number) => {
      const values: number[] = [];
      let state = seed;
      for (let i = 0; i < 5; i++) {
        const next = nextRandom(state);
        values.push(next.value);
        state = next.state;
      }
      return values;
    };

    expect(roll(42)).toEqual(roll(42));
    expect(roll(42)).not.toEqual(roll(43));
    expect(roll(42).every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('shuffles into a permutation, deterministically', () => {
    const deck = Array.from({ length: 8 }, (_, i) => i);

    const first = shuffle(deck, 7);
    const again = shuffle(deck, 7);

    expect(first).toEqual(again);
    expect([...first.items].sort((a, b) => a - b)).toEqual(deck);
    expect(first.items).not.toEqual(deck);
    expect(first.state).not.toBe(7);
  });
});
