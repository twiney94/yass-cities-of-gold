import { describe, expect, it } from 'vitest';
import { trackBoard } from '../engine/testing/boards';
import { newGame } from '../engine/testing/fixtures';
import { type SavedGame, parseSave, serializeSave } from './save';

const board = trackBoard('G1 G1');
const save: SavedGame = {
  game: newGame(board),
  map: { board, origin: { kind: 'standin' } },
  seats: [
    { kind: 'human', color: 'red' },
    { kind: 'bot', level: 'normal', color: 'blue' },
  ],
  viewer: 0,
  log: [{ id: 1, entry: { kind: 'newGame' } }],
};

describe('saved games', () => {
  it('come back exactly as they were stored', () => {
    expect(parseSave(serializeSave(save))).toEqual(save);
  });

  it('are ignored when missing, broken or from another save format', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('{not json')).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, version: 0 }))).toBeNull();
  });

  it('resume the strongest bot, stored as strong, as the extreme bot', () => {
    const stored = JSON.parse(serializeSave(save));
    stored.seats[1].level = 'strong';
    expect(parseSave(JSON.stringify(stored))?.seats[1]).toEqual({ kind: 'bot', level: 'extreme', color: 'blue' });
  });

  it('resume with empty removed piles when stored before players kept them', () => {
    const stored = JSON.parse(serializeSave(save));
    for (const player of stored.game.players) delete player.removed;
    expect(parseSave(JSON.stringify(stored))?.game.players.map((player) => player.removed)).toEqual([[], []]);
  });
});
