import type { GameState } from '../engine/state';
import type { GameMap } from './maps';
import type { LogLine, Seat } from './store';

const KEY = 'yass-cities-of-gold.save';
const VERSION = 1;

export type SavedGame = { game: GameState; map: GameMap; seats: Seat[]; viewer: number; log: LogLine[] };

// The strongest bot was stored as 'strong' before it became 'extreme'.
export const withCurrentLevels = (seats: Seat[]): Seat[] =>
  seats.map((seat) => (seat.kind === 'bot' && (seat.level as string) === 'strong' ? { ...seat, level: 'extreme' } : seat));

export const parseSave = (raw: string | null): SavedGame | null => {
  if (!raw) return null;
  try {
    const save = JSON.parse(raw) as Partial<SavedGame> & { version?: number };
    if (save.version !== VERSION || !save.game || !save.map || !Array.isArray(save.seats) || !Array.isArray(save.log)) return null;
    // Games saved before removed cards were kept per player resume with empty removed piles.
    const players = save.game.players.map((player) => ({ ...player, removed: player.removed ?? [] }));
    return { game: { ...save.game, players }, map: save.map, seats: withCurrentLevels(save.seats), viewer: save.viewer ?? 0, log: save.log };
  } catch {
    return null;
  }
};

export const serializeSave = (save: SavedGame) => JSON.stringify({ version: VERSION, ...save });

export const loadSave = (): SavedGame | null => {
  try {
    return parseSave(localStorage.getItem(KEY));
  } catch {
    return null;
  }
};

export const writeSave = (save: SavedGame | null) => {
  try {
    if (save) localStorage.setItem(KEY, serializeSave(save));
    else localStorage.removeItem(KEY);
  } catch (error) {
    console.warn('The game could not be saved', error);
  }
};
