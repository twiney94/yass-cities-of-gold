import { describe, expect, it } from 'vitest';
import { rollTurnOrder } from './dice';

const scripted = (...faces: number[]) => () => faces.shift()!;

describe('rollTurnOrder', () => {
  it('puts the highest roll first', () => {
    expect(rollTurnOrder(3, scripted(2, 6, 4))).toEqual({ rolls: [[2], [6], [4]], order: [1, 2, 0] });
  });

  it('has only the tied players roll again, until they part', () => {
    const result = rollTurnOrder(4, scripted(3, 5, 3, 1, 4, 4, 2, 6));

    expect(result.rolls).toEqual([[3, 4, 2], [5], [3, 4, 6], [1]]);
    expect(result.order).toEqual([1, 2, 0, 3]);
  });
});
