import type { Terrain } from './board';
import { type Hex, hexDisk } from './hex';

export type TileSpace = { hex: Hex; terrain: Terrain; finish: boolean };

const SUITS = { G: 'machete', B: 'paddle', Y: 'coin' } as const;

const parseTerrain = (token: string): Terrain => {
  const code = token[0];
  const n = Number(token.slice(1));
  switch (code) {
    case 'G':
    case 'B':
    case 'Y':
      return { kind: 'landscape', suit: SUITS[code], power: n };
    case 'R':
      return { kind: 'rubble', cards: n };
    case 'C':
      return { kind: 'basecamp', cards: n };
    case 'M':
      return { kind: 'mountain' };
    case 'S':
      return { kind: 'start', slot: n };
  }
  throw new Error(`Unknown space "${token}"`);
};

// G/B/Y + power (machete/paddle/coin), R + cards (rubble), C + cards (base camp), M (mountain), S + slot (start),
// F prefix for a finishing space (e.g. FG1).
export const parseSpaceToken = (token: string): { terrain: Terrain; finish: boolean } => {
  const finish = token.startsWith('F');
  return { terrain: parseTerrain(finish ? token.slice(1) : token), finish };
};

const TILE_RADIUS = 3;

// A tile is a 37-hex hexagon written as 7 rows of 4, 5, 6, 7, 6, 5, 4 tokens; "." leaves a hex empty.
export const parseTile = (rows: readonly string[]): TileSpace[] => {
  const tokens = rows.map((row) => row.split(/\s+/).filter(Boolean));
  const disk = hexDisk(TILE_RADIUS).sort((a, b) => a.r - b.r || a.q - b.q);
  const lengths = tokens.map((row) => row.length).join(',');
  if (lengths !== '4,5,6,7,6,5,4') throw new Error(`A tile needs rows of 4,5,6,7,6,5,4 spaces, got ${lengths}`);
  return tokens.flat().flatMap((token, i) => (token === '.' ? [] : [{ hex: disk[i]!, ...parseSpaceToken(token) }]));
};
