import { STANDIN_BLOCKADES, STANDIN_ROUTE } from '../content/standin';
import type { Board } from '../engine/board';
import { buildBoard } from '../engine/route';
import { type Difficulty, mapCode } from '../gen/code';
import type { GeneratedMap } from '../gen/search';
import type { Messages } from './i18n/en';

export type MapOrigin = { kind: 'standin' } | { kind: 'generated'; difficulty: Difficulty; code: string; playtestRounds: number };
export type GameMap = { board: Board; origin: MapOrigin };

export const mapTitle = ({ origin }: GameMap, m: Messages) =>
  origin.kind === 'standin' ? m.maps.standin : m.maps.generated(origin.difficulty, origin.code);

export const mapSummary = ({ origin }: GameMap, m: Messages) =>
  origin.kind === 'standin' ? null : m.maps.playtested(origin.playtestRounds);

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
  origin: { kind: 'standin' },
});

export const generateInWorker = (difficulty: Difficulty, seed: number): Promise<GameMap> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<GeneratedMap>) => {
      worker.terminate();
      const playtests = [...data.playtestRounds].sort((a, b) => a - b);
      resolve({
        board: data.board,
        origin: { kind: 'generated', difficulty, code: mapCode(difficulty, seed), playtestRounds: playtests[Math.floor(playtests.length / 2)]! },
      });
    };
    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };
    worker.postMessage({ difficulty, seed });
  });
