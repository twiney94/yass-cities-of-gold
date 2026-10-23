import type { Blockade, Board } from '../board';
import { type HexKey, hexKey } from '../hex';
import { parseSpaceToken } from '../tiles';

// Space tokens as in tiles.ts, plus "." (no space) and "|" (next tile: T0, T1, …).
// Odd rows sit half a hex to the right of the row above.
export const boardFromRows = (rows: string[], blockades: Blockade[] = []): Board => {
  const spaces: Board['spaces'] = {};
  rows.forEach((row, r) => {
    let tile = 0;
    let col = 0;
    for (const token of row.split(/\s+/).filter(Boolean)) {
      if (token === '|') {
        tile++;
        continue;
      }
      if (token !== '.') {
        const hex = { q: col - Math.floor(r / 2), r };
        spaces[hexKey(hex)] = { hex, tile: `T${tile}`, ...parseSpaceToken(token) };
      }
      col++;
    }
  });
  return { spaces, blockades };
};

export const at = (col: number, row = 0): HexKey => hexKey({ q: col - Math.floor(row / 2), r: row });

export const trackBoard = (track: string, blockades: Blockade[] = []): Board =>
  boardFromRows([track, '', 'S1 S2 S3 S4'], blockades);
