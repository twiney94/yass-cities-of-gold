import { describe, expect, it } from 'vitest';
import { STANDIN_BLOCKADES, STANDIN_ROUTE } from '../content/standin';
import type { Blockade } from '../engine/board';
import { buildBoard } from '../engine/route';
import { applyActions } from '../engine/rules';
import { createGame } from '../engine/setup';
import type { GameState } from '../engine/state';
import { at, trackBoard } from '../engine/testing/boards';
import { newGame, placePiece, run, setDiscard, setDrawPile, setHand, types } from '../engine/testing/fixtures';
import { type BotLevel, botStep, effortToFinish } from './bot';

const game = (track: string, blockades: Blockade[] = []) => {
  const state = newGame(trackBoard(track, blockades));
  placePiece(state, 0, at(0));
  placePiece(state, 1, at(0, 1));
  return state;
};

const playTurn = (state: GameState): GameState => {
  let current = state;
  for (let step = 0; step < 30; step++) {
    const actions = botStep(current);
    current = run(current, ...actions).state;
    if (actions.some((action) => action.type === 'endTurn')) return current;
  }
  throw new Error('The bot did not end its turn');
};

describe('effortToFinish', () => {
  it('adds up what each space asks for on the way to the finish, blockades included', () => {
    const blockade: Blockade = { id: 1, tiles: ['T0', 'T1'], requirement: { kind: 'landscape', suit: 'machete', power: 2 } };
    const state = game('G1 G2 | G1 FG1', [blockade]);

    const effort = effortToFinish(state);

    expect(effort.get(at(2))).toBe(1);
    expect(effort.get(at(1))).toBe(1 + 1 + 2);
    expect(effort.get(at(0))).toBe(1 + 1 + 2 + 2);
  });
});

describe('botStep', () => {
  it('plays drawing cards before anything else', () => {
    const state = game('G1 G1 FG1');
    const [, cartographer] = setHand(state, 0, 'explorer', 'cartographer');
    setDrawPile(state, 0, 'scout', 'scout');

    expect(botStep(state)).toEqual([{ type: 'playAction', cardId: cartographer!.id }]);
  });

  it('chains its cards to reach the City of Gold when it can', () => {
    const state = game('G1 G1 G1 G1 FG1');
    setHand(state, 0, 'scout', 'scout', 'traveler');

    const after = run(state, ...botStep(state)).state;

    expect(after.pieces[0]!.at).toBe('eldorado');
  });

  it('buys the strongest card the terrain ahead calls for', () => {
    const state = game('G1 B2 B2 B2 FB1');
    state.market.slots[0] = null;
    state.market.remaining.scout = 0;
    setHand(state, 0, 'traveler', 'traveler');

    const after = playTurn(state);

    expect(types(after.players[0]!.discard)).toContain('captain');
  });

  it('thins weak starting cards when the Scientist lets it', () => {
    const state = game('G1 G1 FG1');
    setHand(state, 0, 'scientist', 'explorer', 'traveler');
    setDrawPile(state, 0, 'scout');
    setDiscard(state, 0, 'traveler', 'traveler', 'explorer', 'sailor', 'captain');

    const drawn = run(state, ...botStep(state)).state;
    const removal = botStep(drawn);

    expect(removal).toEqual([{ type: 'removeFromHand', cardIds: [drawn.players[0]!.hand.find((c) => c.type === 'explorer')!.id] }]);
  });
});

describe('easy level', () => {
  it('never thins its deck when a card lets it', () => {
    const state = game('G1 G1 FG1');
    setHand(state, 0, 'scientist', 'explorer', 'traveler');
    setDrawPile(state, 0, 'scout');
    setDiscard(state, 0, 'traveler', 'traveler', 'explorer', 'sailor', 'captain');

    const drawn = run(state, ...botStep(state, 'easy')).state;

    expect(botStep(drawn, 'easy')).toEqual([{ type: 'removeFromHand', cardIds: [] }]);
  });

  it('keeps no cards from one turn to the next', () => {
    const state = game('G1 M');
    const hand = setHand(state, 0, 'captain', 'pioneer');

    expect(botStep(state, 'easy')).toEqual([{ type: 'endTurn', discard: hand.map((card) => card.id) }]);
  });

  it('makes the same choice every time from the same position', () => {
    const state = createGame({ board: buildBoard(STANDIN_ROUTE, STANDIN_BLOCKADES, 3), playerCount: 3, seed: 3 });

    expect(botStep(state, 'easy')).toEqual(botStep(state, 'easy'));
  });
});

describe('bot-only games on the stand-in route', () => {
  const games = (['easy', 'normal', 'strong'] as const).flatMap((level) =>
    ([2, 3, 4] as const).flatMap((players) => (level === 'normal' ? [1, 2, 3, 4] : [1, 2]).map((seed) => ({ level, players, seed }))),
  );

  it.each(games)('$level, $players players, seed $seed: legal moves only, finished in reasonable time', ({ level, players, seed }) => {
    let state = createGame({ board: buildBoard(STANDIN_ROUTE, STANDIN_BLOCKADES, seed), playerCount: players, seed });
    let turns = 0;
    let steps = 0;
    while (state.status.kind !== 'over' && turns < 400) {
      const actions = botStep(state, level as BotLevel);
      const result = applyActions(state, actions);
      if (!result.ok) throw new Error(`${result.error}: ${JSON.stringify(actions)}`);
      state = result.state;
      steps++;
      if (actions.some((action) => action.type === 'endTurn')) turns++;
    }

    expect(state.status.kind).toBe('over');
    expect(Math.ceil(turns / players)).toBeLessThanOrEqual(players === 2 ? 30 : 20);
    expect(steps / turns).toBeLessThan(10);
  });
});
