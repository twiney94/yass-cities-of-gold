// mulberry32: the whole generator state is one uint32, so it serializes with the game state.
export type RngState = number;

export const nextRandom = (state: RngState): { value: number; state: RngState } => {
  const next = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: next >>> 0 };
};

export const shuffle = <T>(items: readonly T[], state: RngState): { items: T[]; state: RngState } => {
  const result = [...items];
  let rng = state;
  for (let i = result.length - 1; i > 0; i--) {
    const roll = nextRandom(rng);
    rng = roll.state;
    const j = Math.floor(roll.value * (i + 1));
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return { items: result, state: rng };
};
