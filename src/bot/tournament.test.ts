import { describe, expect, it } from 'vitest';
import { STANDIN_BLOCKADES, STANDIN_ROUTE } from '../content/standin';
import { buildBoard } from '../engine/route';
import { applyActions } from '../engine/rules';
import { createGame } from '../engine/setup';
import { type BotLevel, botStep } from './bot';

const GAMES = 60;
const FIRST_SEED = 2000;

const winShare = (level: BotLevel, rival: BotLevel): number => {
  let wins = 0;
  for (let game = 0; game < GAMES; game++) {
    const seats: BotLevel[] = game % 2 === 0 ? [level, rival] : [rival, level];
    const seed = FIRST_SEED + game;
    let state = createGame({ board: buildBoard(STANDIN_ROUTE, STANDIN_BLOCKADES, seed), playerCount: 2, seed });
    while (state.status.kind !== 'over') {
      const result = applyActions(state, botStep(state, seats[state.turn.player]!));
      if (!result.ok) throw new Error(result.error);
      state = result.state;
    }
    if (seats[state.status.winner] === level) wins++;
  }
  return wins / GAMES;
};

describe('head-to-head on the stand-in route, seats alternating', () => {
  it('strong beats normal', () => {
    expect(winShare('strong', 'normal')).toBeGreaterThan(0.55);
  }, 60000);

  it('normal beats easy', () => {
    expect(winShare('normal', 'easy')).toBeGreaterThan(0.65);
  }, 60000);
});
