import { nextRandom } from '../engine/rng';

export type Random = {
  next: () => number;
  int: (max: number) => number;
  between: (min: number, max: number) => number;
  chance: (probability: number) => boolean;
  pick: <T>(items: readonly T[]) => T;
};

export const makeRandom = (seed: number): Random => {
  let state = seed >>> 0;
  const next = () => {
    const roll = nextRandom(state);
    state = roll.state;
    return roll.value;
  };
  return {
    next,
    int: (max) => Math.floor(next() * max),
    between: (min, max) => min + next() * (max - min),
    chance: (probability) => next() < probability,
    pick: (items) => items[Math.floor(next() * items.length)]!,
  };
};
