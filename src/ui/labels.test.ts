import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../engine/actions';
import { at, trackBoard } from '../engine/testing/boards';
import { newGame } from '../engine/testing/fixtures';
import { en } from './i18n/en';
import { fr } from './i18n/fr';
import { describeEvents, logText } from './labels';

const players = [
  { name: 'Red', hex: '#d9483b' },
  { name: 'Blue', hex: '#2f7fd8' },
];

describe('describeEvents', () => {
  it('folds consecutive hops into one move and keeps the other events in order', () => {
    const game = newGame(trackBoard('G1 G1 G1'));
    const events: GameEvent[] = [
      { type: 'cardPlayed', player: 0, card: { id: 1, type: 'scout' } },
      { type: 'pieceMoved', pieceId: 0, from: at(0, 2), to: at(0) },
      { type: 'pieceMoved', pieceId: 0, from: at(0), to: at(1) },
      { type: 'turnStarted', player: 1 },
    ];

    expect(describeEvents(events, game)).toEqual([
      { kind: 'played', player: 0, card: 'scout' },
      { kind: 'moved', player: 0, spaces: 2 },
      { kind: 'turn', player: 1 },
    ]);
  });
});

describe('logText', () => {
  it('writes the same entry in either language', () => {
    const entry = { kind: 'moved', player: 1, spaces: 2 } as const;

    expect(logText(entry, en, players, 'Map')).toBe('Blue moved 2 spaces');
    expect(logText(entry, fr, [players[0]!, { ...players[1]!, name: 'Bleu' }], 'Carte')).toBe('Bleu avance de 2 cases');
  });
});
