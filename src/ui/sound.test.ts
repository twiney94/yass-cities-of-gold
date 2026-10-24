import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../engine/actions';
import { at } from '../engine/testing/boards';
import { soundsFor } from './sound';

describe('soundsFor', () => {
  it('times a hop for every step and plays other sounds once per batch', () => {
    const card = { id: 1, type: 'explorer' } as const;
    const events: GameEvent[] = [
      { type: 'cardPlayed', player: 0, card },
      { type: 'pieceMoved', pieceId: 0, from: at(0), to: at(1) },
      { type: 'pieceMoved', pieceId: 0, from: at(1), to: at(2) },
      { type: 'cardsDrawn', player: 0, cards: [card] },
      { type: 'cardsDrawn', player: 0, cards: [card] },
      { type: 'turnStarted', player: 1 },
    ];

    expect(soundsFor(events, 200)).toEqual([
      { sound: 'card', at: 0 },
      { sound: 'hop', at: 0 },
      { sound: 'hop', at: 200 },
      { sound: 'draw', at: 120 },
      { sound: 'turn', at: 0 },
    ]);
  });
});
