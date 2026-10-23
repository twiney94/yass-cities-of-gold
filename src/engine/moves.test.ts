import { describe, expect, it } from 'vitest';
import type { Blockade } from './board';
import { adjacentTargets, movementPlans, routePlans, targetKey } from './moves';
import { at, trackBoard } from './testing/boards';
import { newGame, placePiece, run } from './testing/fixtures';

const game = (track: string, blockades: Blockade[] = []) => {
  const state = newGame(trackBoard(track, blockades));
  placePiece(state, 0, at(0));
  return state;
};

const keys = (plans: Map<string, unknown>) => [...plans.keys()].sort();

describe('movementPlans', () => {
  it('reaches every matching space the card has power for', () => {
    const state = game('G1 G1 G2 G2 G1');

    const plans = movementPlans(state, 0, 'machete', 5);

    expect(keys(plans)).toEqual([`space:${at(1)}`, `space:${at(2)}`, `space:${at(3)}`]);
    expect(plans.get(`space:${at(3)}`)?.remaining).toBe(0);
  });

  it('stops at other symbols, occupied spaces and finishing spaces', () => {
    const state = game('G1 G1 B1 . G1 FG1 G1');
    placePiece(state, 1, at(4));
    const besideFinish = game('G1 FG1 G1');

    expect(keys(movementPlans(state, 0, 'machete', 6))).toEqual([`space:${at(1)}`]);
    expect(keys(movementPlans(besideFinish, 0, 'machete', 6))).toEqual([`space:${at(1)}`]);
  });

  it('plans through a blockade, and offers the blockade itself as a target', () => {
    const blockade: Blockade = { id: 2, tiles: ['T0', 'T1'], requirement: { kind: 'landscape', suit: 'machete', power: 1 } };
    const state = game('G1 | G2 G1', [blockade]);

    const plans = movementPlans(state, 0, 'machete', 3);

    expect(plans.get(`space:${at(1)}`)?.path).toEqual([{ kind: 'blockade', id: 2 }, { kind: 'space', hex: at(1) }]);
    expect(plans.has('blockade:2')).toBe(true);
    expect(plans.has(`space:${at(2)}`)).toBe(false);
  });

  it('produces paths the rules accept', () => {
    const blockade: Blockade = { id: 2, tiles: ['T0', 'T1'], requirement: { kind: 'landscape', suit: 'machete', power: 1 } };
    const state = game('G1 G1 | G1 G1', [blockade]);
    state.players[0]!.hand = [{ id: 999, type: 'pioneer' }];
    const plan = movementPlans(state, 0, 'machete', 5).get(`space:${at(3)}`)!;

    const after = run(
      state,
      { type: 'playForMovement', cardId: 999, pieceId: 0 },
      ...plan.path.map((target) => ({ type: 'step' as const, target })),
    ).state;

    expect(after.pieces[0]!.at).toBe(at(3));
    expect(after.turn.movement?.remaining).toBe(plan.remaining);
  });
});

describe('adjacentTargets', () => {
  it('lists free neighbours and touching blockades, but nothing behind a blockade', () => {
    const blockade: Blockade = { id: 3, tiles: ['T0', 'T1'], requirement: { kind: 'rubble', cards: 1 } };
    const state = game('R1 G1 R2 | G1', [blockade]);
    placePiece(state, 0, at(2));

    const targets = adjacentTargets(state, 0).map((t) => targetKey(t.target)).sort();

    expect(targets).toEqual(['blockade:3', `space:${at(1)}`]);
  });
});

describe('routePlans', () => {
  const card = (id: number, type: 'scout' | 'explorer' | 'sailor' | 'jackOfAllTrades' | 'traveler') => ({ id, type });

  it('chains several cards into one move, spending as few as it can', () => {
    const state = game('G1 G1 G1 G1 G1 G1');

    const plans = routePlans(state, 0, [card(1, 'scout'), card(2, 'scout')], null);

    expect(plans.get(`space:${at(2)}`)?.cardsUsed).toBe(1);
    expect(plans.get(`space:${at(4)}`)?.segments.map((s) => s.path.length)).toEqual([2, 2]);
    expect(plans.has(`space:${at(5)}`)).toBe(false);
  });

  it('switches symbols between cards', () => {
    const state = game('G1 B1 B1');

    const plan = routePlans(state, 0, [card(1, 'explorer'), card(2, 'sailor')], null).get(`space:${at(2)}`);

    expect(plan).toBeUndefined();
    const reach = routePlans(game('G1 G1 B1'), 0, [card(1, 'explorer'), card(2, 'sailor')], null).get(`space:${at(2)}`);
    expect(reach?.segments.map((s) => [s.card?.type, s.suit])).toEqual([
      ['explorer', 'machete'],
      ['sailor', 'paddle'],
    ]);
  });

  it('lets a joker take the symbol each stretch needs', () => {
    const state = game('G1 B1 Y1');

    const plans = routePlans(state, 0, [card(1, 'jackOfAllTrades'), card(2, 'traveler')], null);

    expect(plans.get(`space:${at(2)}`)?.segments.map((s) => s.suit)).toEqual(['paddle', 'coin']);
  });

  it('starts with the leftover of the card in play, which costs no new card', () => {
    const state = game('G1 G1 G1 G1');

    const plans = routePlans(state, 0, [card(1, 'explorer')], { suit: 'machete', remaining: 1 });

    expect(plans.get(`space:${at(1)}`)?.cardsUsed).toBe(0);
    expect(plans.get(`space:${at(2)}`)?.segments.map((s) => s.card?.type ?? 'leftover')).toEqual(['leftover', 'explorer']);
  });

  it('produces action sequences the rules accept', () => {
    const state = game('G1 G1 G1 B1');
    state.players[0]!.hand = [card(1, 'scout'), card(2, 'jackOfAllTrades')];
    const plan = routePlans(state, 0, state.players[0]!.hand, null).get(`space:${at(3)}`)!;

    const after = run(
      state,
      ...plan.segments.flatMap((segment) => [
        { type: 'playForMovement' as const, cardId: segment.card!.id, pieceId: 0, suit: segment.suit },
        ...segment.path.map((target) => ({ type: 'step' as const, target })),
      ]),
    ).state;

    expect(after.pieces[0]!.at).toBe(at(3));
  });
});
