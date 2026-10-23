import { STANDIN_BLOCKADES, STANDIN_ROUTE } from '../content/standin';
import type { Board } from '../engine/board';
import { buildBoard } from '../engine/route';
import type { Difficulty } from '../gen/code';
import type { GeneratedMap } from '../gen/search';

export type GameMap = { board: Board; name: string; summary: string | null };

const CODE = /^([EMH])-([0-9A-Z]+)$/;
const DIFFICULTY_OF: Record<string, Difficulty> = { E: 'easy', M: 'medium', H: 'hard' };

export const parseMapCode = (code: string): { difficulty: Difficulty; seed: number } | null => {
  const match = CODE.exec(code.trim().toUpperCase());
  if (!match) return null;
  const seed = Number.parseInt(match[2]!, 36);
  return Number.isSafeInteger(seed) ? { difficulty: DIFFICULTY_OF[match[1]!]!, seed } : null;
};

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export const standinMap = (): GameMap => ({
  board: buildBoard(STANDIN_ROUTE, STANDIN_BLOCKADES, randomSeed()),
  name: STANDIN_ROUTE.name,
  summary: null,
});

export const generateInWorker = (difficulty: Difficulty, seed: number): Promise<GameMap> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<GeneratedMap>) => {
      worker.terminate();
      const playtests = [...data.playtestRounds].sort((a, b) => a - b);
      resolve({
        board: data.board,
        name: data.name,
        summary: `bot playtests finished in ${playtests[Math.floor(playtests.length / 2)]} rounds`,
      });
    };
    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };
    worker.postMessage({ difficulty, seed });
  });
