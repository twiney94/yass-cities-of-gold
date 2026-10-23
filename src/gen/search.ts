import { STANDIN_BLOCKADES } from '../content/standin';
import type { Board } from '../engine/board';
import { buildBoard } from '../engine/route';
import { type Difficulty, mapCode } from './code';
import { type Random, makeRandom } from './random';
import { type MapScore, botRounds, scoreBoard } from './score';
import { type Knobs, generateRoute } from './terrain';

export { type Difficulty, mapCode };

// Median rounds that three bots need to finish, per difficulty.
export const DIFFICULTY_ROUNDS: Record<Difficulty, readonly [number, number]> = {
  easy: [8, 10],
  medium: [11, 13],
  hard: [14, 17],
};

// Fitted on 140 random maps against 3-bot playtests (correlation 0.94).
const ROUNDS_PER_EFFORT = 0.28;
const ROUNDS_BASE = 1.27;

const INITIAL = 40;
const ITERATIONS = 260;
const PLAYTESTS = 4;
const VALIDATED = 4;
const OPENNESS_STEP = 0.5;
const OPENNESS_FLOOR = 4;

export type GeneratedMap = {
  board: Board;
  name: string;
  difficulty: Difficulty;
  code: string;
  predictedRounds: number;
  playtestRounds: number[];
  score: MapScore;
  evaluations: number;
};

type Elite = { knobs: Knobs; seed: number; score: MapScore; quality: number; rounds: number };

const LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const predictRounds = (score: MapScore) => score.effort * ROUNDS_PER_EFFORT + ROUNDS_BASE;

// The rulebook's advice for good routes: mixed terrain, no long stretch of one colour, fair starting spaces.
const quality = (score: MapScore) => 2 * score.mix - 0.25 * Math.max(0, score.longestRun - 4) - 0.5 * score.fairness;

const randomKnobs = (random: Random): Knobs => ({
  tiles: 2 + random.int(4),
  winding: random.next(),
  rivers: random.between(0, 1.2),
  villages: random.between(0.3, 1.6),
  ridges: random.between(0, 1.5),
  peaks: random.between(0, 1.5),
  crossings: random.between(0.3, 1),
  strength: random.between(0.05, 0.6),
  rubble: random.between(0, 0.5),
  camps: random.between(0, 2),
  finish: random.pick(['machete', 'paddle', 'coin'] as const),
});

const mutate = (random: Random, knobs: Knobs): Knobs => {
  const next = { ...knobs };
  const nudge = (value: number, by: number) => value + (random.next() * 2 - 1) * by;
  for (let changes = 1 + random.int(3); changes > 0; changes--) {
    switch (random.int(11)) {
      case 0:
        next.tiles = clamp(next.tiles + random.pick([-1, 1]), 2, 5);
        break;
      case 1:
        next.winding = clamp(nudge(next.winding, 0.25), 0, 1);
        break;
      case 2:
        next.rivers = clamp(nudge(next.rivers, 0.3), 0, 1.5);
        break;
      case 3:
        next.villages = clamp(nudge(next.villages, 0.3), 0, 2);
        break;
      case 4:
        next.ridges = clamp(nudge(next.ridges, 0.3), 0, 2);
        break;
      case 5:
        next.peaks = clamp(nudge(next.peaks, 0.3), 0, 2);
        break;
      case 9:
        next.crossings = clamp(nudge(next.crossings, 0.2), 0, 1);
        break;
      case 6:
        next.strength = clamp(nudge(next.strength, 0.12), 0.03, 0.7);
        break;
      case 7:
        next.rubble = clamp(nudge(next.rubble, 0.12), 0, 0.6);
        break;
      case 8:
        next.camps = clamp(nudge(next.camps, 0.5), 0, 2.5);
        break;
      default:
        next.finish = random.pick(['machete', 'paddle', 'coin'] as const);
    }
  }
  return next;
};

const buildElite = (elite: Elite, name: string): Board => buildBoard(generateRoute(elite.knobs, elite.seed, name)!, STANDIN_BLOCKADES, elite.seed);

// MAP-Elites: keep the best map (by quality) in every cell of predicted rounds × openness, refine by mutating
// elites near the wanted difficulty, then confirm the best candidates with bot playtests.
export const generateMap = (difficulty: Difficulty, seed: number): GeneratedMap => {
  const random = makeRandom(seed);
  const code = mapCode(difficulty, seed);
  const name = `${LABEL[difficulty]} trail ${code}`;
  const [low, high] = DIFFICULTY_ROUNDS[difficulty];
  const archive = new Map<string, Elite>();
  let evaluations = 0;

  const consider = (knobs: Knobs) => {
    evaluations++;
    const paintSeed = random.int(2 ** 31);
    const route = generateRoute(knobs, paintSeed, name);
    if (!route) return;
    const score = scoreBoard(buildBoard(route, STANDIN_BLOCKADES, paintSeed));
    if (!score.valid) return;
    const elite: Elite = { knobs, seed: paintSeed, score, quality: quality(score), rounds: predictRounds(score) };
    const cell = `${Math.round(elite.rounds)}:${Math.max(0, Math.floor((score.openness - OPENNESS_FLOOR) / OPENNESS_STEP))}`;
    if ((archive.get(cell)?.quality ?? -Infinity) < elite.quality) archive.set(cell, elite);
  };

  for (let i = 0; i < INITIAL; i++) consider(randomKnobs(random));
  for (let i = 0; i < ITERATIONS; i++) {
    const elites = [...archive.values()];
    const near = elites.filter((elite) => elite.rounds >= low - 2 && elite.rounds <= high + 2);
    consider(mutate(random, random.pick(near.length > 0 && random.chance(0.75) ? near : elites).knobs));
  }

  const inBand = (rounds: number) => rounds >= low - 0.5 && rounds <= high + 0.5;
  const ranked = [...archive.values()]
    .filter((elite) => inBand(elite.rounds))
    .sort((a, b) => b.quality - a.quality);
  const fallback = [...archive.values()].sort(
    (a, b) => Math.abs(a.rounds - (low + high) / 2) - Math.abs(b.rounds - (low + high) / 2),
  );
  const candidates = ranked.length > 0 ? ranked.slice(0, VALIDATED) : fallback.slice(0, 1);

  let chosen: { elite: Elite; board: Board; rounds: number[] } | null = null;
  for (const elite of candidates) {
    const board = buildElite(elite, name);
    const rounds = botRounds(board, PLAYTESTS);
    if (!chosen) chosen = { elite, board, rounds };
    if (inBand(median(rounds))) {
      chosen = { elite, board, rounds };
      break;
    }
  }
  const { elite, board, rounds } = chosen!;
  return {
    board,
    name,
    difficulty,
    code,
    predictedRounds: elite.rounds,
    playtestRounds: rounds,
    score: elite.score,
    evaluations,
  };
};
