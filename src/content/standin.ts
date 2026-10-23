import type { BlockadeDef, RouteDef, TileDef } from '../engine/route';

// Invented content to play with until the real tiles and blockades are transcribed from photos.

export const STANDIN_BLOCKADES: readonly BlockadeDef[] = [
  { id: 1, requirement: { kind: 'landscape', suit: 'machete', power: 1 } },
  { id: 2, requirement: { kind: 'landscape', suit: 'paddle', power: 1 } },
  { id: 3, requirement: { kind: 'landscape', suit: 'coin', power: 1 } },
  { id: 4, requirement: { kind: 'rubble', cards: 1 } },
  { id: 5, requirement: { kind: 'landscape', suit: 'machete', power: 2 } },
  { id: 6, requirement: { kind: 'rubble', cards: 2 } },
];

const camp: TileDef = {
  name: 'Camp',
  rows: [
    'G1 G1 Y1 G1',
    'G1 G1 G1 B1 G1',
    'G1 G1 Y1 G1 M G1',
    'S1 G1 G1 G1 B1 G1 G1',
    'S2 G1 G1 C1 G1 Y1',
    'S3 G1 M G1 G1',
    'S4 B1 G1 G1',
  ],
};

const jungle: TileDef = {
  name: 'Jungle',
  rows: [
    'G1 G2 G2 B1',
    'G1 G1 M B1 B1',
    'Y1 G2 G1 M B2 G1',
    'G1 G1 R1 G2 G1 G1 G1',
    'Y1 Y1 G1 G2 C1 G1',
    'Y2 G1 G1 G3 G1',
    'G1 B1 B1 G1',
  ],
};

const river: TileDef = {
  name: 'River',
  rows: [
    'B1 B1 G1 G1',
    'B1 B2 B1 G2 G1',
    'G1 B1 M B1 Y1 G1',
    'G1 G2 M B2 B1 Y2 G1',
    'G1 G1 R2 B1 B1 G1',
    'Y1 G1 G2 B1 B3',
    'G1 Y1 G1 B1',
  ],
};

const village: TileDef = {
  name: 'Village',
  rows: [
    'Y1 Y2 G1 G1',
    'Y1 Y1 C1 G2 G1',
    'G1 Y2 Y1 M G1 B1',
    'G1 G1 M Y3 Y1 G1 B1',
    'R1 G1 Y1 Y1 G2 G1',
    'G1 G2 M Y2 G1',
    'G1 G1 R1 G1',
  ],
};

const highlands: TileDef = {
  name: 'Highlands',
  rows: [
    'M G2 G2 R1',
    'G1 M G3 G1 G1',
    'G1 G2 M M B1 G1',
    'B1 G1 G2 C2 G1 Y1 G1',
    'B2 B1 G1 M G2 Y1',
    'G1 G1 R2 G1 G2',
    'Y1 G1 G1 M',
  ],
};

export const STANDIN_ROUTE: RouteDef = {
  name: 'Stand-in Trail',
  start: camp,
  tiles: [
    { tile: jungle, direction: 'downRight' },
    { tile: river, direction: 'upRight' },
    { tile: village, direction: 'downRight' },
    { tile: highlands, direction: 'upRight' },
  ],
  finish: { direction: 'downRight', suit: 'paddle', power: 1 },
};
