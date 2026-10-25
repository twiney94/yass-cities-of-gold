import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../engine/actions';
import { at, trackBoard } from '../engine/testing/boards';
import { newGame } from '../engine/testing/fixtures';
import { en } from './i18n/en';
import { fr } from './i18n/fr';
import { describeEvents, logText, playBanner, recolor } from './labels';

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

describe('recolor', () => {
  it('changes only the chosen seat when the colour is free', () => {
    expect(recolor([{ color: 'red' }, { color: 'blue' }], 1, 'yellow')).toEqual([{ color: 'red' }, { color: 'yellow' }]);
  });

  it('moves the seat that had the colour on to the next colour nobody uses', () => {
    const seats = [{ color: 'red' as const }, { color: 'blue' as const }, { color: 'yellow' as const }];
    expect(recolor(seats, 2, 'red')).toEqual([{ color: 'white' }, { color: 'blue' }, { color: 'red' }]);
  });

  it('wraps round the palette and can hand back the chooser’s old colour', () => {
    const seats = [{ color: 'black' as const }, { color: 'red' as const }];
    expect(recolor(seats, 1, 'black')).toEqual([{ color: 'red' }, { color: 'black' }]);
  });
});

describe('playBanner', () => {
  const trader = { id: 1, type: 'traveler' as const };
  const scout = { id: 2, type: 'scout' as const };
  const pathfinder = { id: 3, type: 'explorer' as const };

  it('shows the cards played', () => {
    const events: GameEvent[] = [
      { type: 'cardPlayed', player: 1, card: trader },
      { type: 'cardPlayed', player: 1, card: scout },
      { type: 'pieceMoved', pieceId: 1, from: at(0), to: at(1) },
    ];
    expect(playBanner(events)).toEqual({ player: 1, verb: 'play', cards: [trader, scout] });
  });

  it('shows the card bought rather than the coins paid for it', () => {
    const events: GameEvent[] = [
      { type: 'cardPlayed', player: 1, card: trader },
      { type: 'cardGained', player: 1, card: pathfinder, via: 'purchase' },
    ];
    expect(playBanner(events)).toEqual({ player: 1, verb: 'buy', cards: [pathfinder] });
  });

  it('shows a card taken for free with the Telegraph as taken', () => {
    expect(playBanner([{ type: 'cardGained', player: 2, card: pathfinder, via: 'transmitter' }])?.verb).toBe('take');
  });

  it('shows nothing for actions without cards', () => {
    expect(playBanner([{ type: 'pieceMoved', pieceId: 1, from: at(0), to: at(1) }])).toBeNull();
  });
});
