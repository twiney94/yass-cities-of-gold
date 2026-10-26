import { botStep, effortToFinish, requirementEffort } from '../bot/bot';
import { type Board, adjacentSpaces, blockadeBetween } from '../engine/board';
import type { Suit } from '../engine/cards';
import { type HexKey, hexKey } from '../engine/hex';
import { applyActions } from '../engine/rules';
import { createGame } from '../engine/setup';

export type MapScore = {
  valid: boolean;
  effort: number;
  fairness: number;
  openness: number;
  mix: number;
  longestRun: number;
};

const NEAR_BEST = 1.25;
const MAX_BOT_ROUNDS = 60;

// Effort to get from any starting space to each space, entering costs counted as in the bot's estimate.
const effortFromStarts = (board: Board, blockades: readonly number[]): Map<HexKey, number> => {
  const effort = new Map<HexKey, number>();
  const open = new Set<HexKey>();
  for (const space of Object.values(board.spaces)) {
    if (space?.terrain.kind !== 'start') continue;
    effort.set(hexKey(space.hex), 0);
    open.add(hexKey(space.hex));
  }
  while (open.size > 0) {
    let current = open.values().next().value!;
    for (const key of open) if (effort.get(key)! < effort.get(current)!) current = key;
    open.delete(current);
    const from = board.spaces[current]!;
    if (from.finish) continue;
    for (const into of adjacentSpaces(board, current)) {
      const blockade = blockadeBetween(board, blockades, from.tile, into.tile);
      const total = effort.get(current)! + requirementEffort(into.terrain) + (blockade ? requirementEffort(blockade.requirement) : 0);
      const key = hexKey(into.hex);
      if (total < (effort.get(key) ?? Infinity)) {
        effort.set(key, total);
        open.add(key);
      }
    }
  }
  return effort;
};

export const scoreBoard = (board: Board): MapScore => {
  const state = createGame({ board, playerCount: 4, seed: 1 });
  const toFinish = effortToFinish(state);
  const fromStarts = effortFromStarts(board, state.blockades);
  const spaces = Object.values(board.spaces).flatMap((space) => space ?? []);
  const starts = spaces.filter((space) => space.terrain.kind === 'start').map((space) => toFinish.get(hexKey(space.hex)) ?? Infinity);
  const best = Math.min(...starts);
  if (starts.length !== 4 || !starts.every(Number.isFinite)) {
    return { valid: false, effort: Infinity, fairness: Infinity, openness: 0, mix: 0, longestRun: Infinity };
  }

  const suits: (Suit | null)[] = [];
  let at = spaces.find((space) => space.terrain.kind === 'start' && toFinish.get(hexKey(space.hex)) === best)!;
  for (let guard = 0; guard < 200 && !at.finish; guard++) {
    const next = adjacentSpaces(board, hexKey(at.hex))
      .filter((space) => space.terrain.kind !== 'start')
      .map((space) => ({ space, total: requirementEffort(space.terrain) + (toFinish.get(hexKey(space.hex)) ?? Infinity) }))
      .sort((a, b) => a.total - b.total)[0];
    if (!next) break;
    at = next.space;
    suits.push(at.terrain.kind === 'landscape' ? at.terrain.suit : null);
  }

  const counts = { machete: 0, paddle: 0, coin: 0 };
  let run = 0;
  let longestRun = 0;
  suits.forEach((suit, i) => {
    if (suit) counts[suit]++;
    run = suit && suit === suits[i - 1] ? run + 1 : suit ? 1 : 0;
    longestRun = Math.max(longestRun, run);
  });
  const landscape = counts.machete + counts.paddle + counts.coin || 1;
  const mix = -Object.values(counts).reduce((sum, n) => (n === 0 ? sum : sum + (n / landscape) * Math.log(n / landscape)), 0) / Math.log(3);
  const corridor = spaces.filter(
    (space) => (fromStarts.get(hexKey(space.hex)) ?? Infinity) + (toFinish.get(hexKey(space.hex)) ?? Infinity) <= best * NEAR_BEST + 1,
  ).length;

  return {
    valid: true,
    effort: starts.reduce((sum, e) => sum + e, 0) / starts.length,
    fairness: Math.max(...starts) - best,
    openness: corridor / Math.max(1, suits.length),
    mix,
    longestRun,
  };
};

// Rounds that bot-only games take on a board; a game that does not finish counts as MAX_BOT_ROUNDS.
export const botRounds = (board: Board, games: number, playerCount: 2 | 3 | 4 = 3): number[] =>
  Array.from({ length: games }, (_, i) => {
    let state = createGame({ board, playerCount, seed: i + 1 });
    let turns = 0;
    while (state.status.kind !== 'over' && turns < MAX_BOT_ROUNDS * playerCount) {
      const actions = botStep(state, 'hard');
      const result = applyActions(state, actions);
      if (!result.ok) throw new Error(`Bot played an illegal move: ${result.error}`);
      state = result.state;
      if (actions.some((action) => action.type === 'endTurn')) turns++;
    }
    return state.status.kind === 'over' ? Math.ceil(turns / playerCount) : MAX_BOT_ROUNDS;
  });
