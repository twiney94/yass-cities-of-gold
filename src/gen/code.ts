export type Difficulty = 'easy' | 'medium' | 'hard';

export const mapCode = (difficulty: Difficulty, seed: number) => `${difficulty[0]!.toUpperCase()}-${(seed >>> 0).toString(36).toUpperCase()}`;
