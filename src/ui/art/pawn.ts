// The explorer pawn, seen from the front: a figure in the player's colour under a tan fedora. Feet at the origin,
// about 42 units tall; the board and the menus draw the same layers in this order.
const BODY =
  'M -3.2 -21.6 L 3.2 -21.6 C 6.4 -21.4 8.9 -19.6 9.9 -16.4 L 11.1 -11.6 Q 11.6 -9 9.3 -8.9 Q 7.5 -8.9 7.3 -10.4 ' +
  'L 6.1 -14.4 L 7.9 -1.5 Q 8 0 6.6 0 L 2.4 0 Q 1.2 0 1.2 -1.2 L 1 -8.2 L -1 -8.2 L -1.2 -1.2 Q -1.2 0 -2.4 0 ' +
  'L -6.6 0 Q -8 0 -7.9 -1.5 L -6.1 -14.4 L -7.3 -10.4 Q -7.5 -8.9 -9.3 -8.9 Q -11.6 -9 -11.1 -11.6 L -9.9 -16.4 ' +
  'C -8.9 -19.6 -6.4 -21.4 -3.2 -21.6 Z';

const BODY_SHADE =
  'M 5.6 -21.2 C 7.8 -20.6 9.3 -19 9.9 -16.4 L 11.1 -11.6 Q 11.5 -9.3 10 -9 L 9.5 -11.2 L 8.4 -15.9 C 7.9 -18 6.9 -19.6 5.6 -21.2 Z ' +
  'M 6.1 -14.4 L 7.9 -1.5 Q 8 0 6.6 0 L 5.4 0 L 5 -12.8 Z ' +
  'M -1 -8.2 L -1.2 -1.2 Q -1.2 0 -2.4 0 L -2.5 0 L -2.2 -8.2 Z ' +
  'M -6.1 -14.4 L -7.3 -10.4 Q -7.5 -8.9 -8.4 -8.9 L -7.9 -11 Z ' +
  'M -6.4 -20.6 Q 0 -15.4 6.4 -20.6 Q 0 -17.4 -6.4 -20.6 Z';

const HEAD = 'M -7.8 -27 A 7.8 7.8 0 1 1 7.8 -27 A 7.8 7.8 0 1 1 -7.8 -27 Z';

const HEAD_SHADE = 'M 2.5 -34.39 A 7.8 7.8 0 0 1 2.5 -19.61 A 3.2 7.39 0 0 0 2.5 -34.39 Z';

const BRIM = 'M -12.5 -33.1 A 12.8 3.1 10 1 1 12.7 -28.7 A 12.8 3.1 10 1 1 -12.5 -33.1 Z';

const BRIM_TOP = 'M -12.01 -33.65 A 12.4 2.45 10 1 1 12.41 -29.35 A 12.4 2.45 10 1 1 -12.01 -33.65 Z';

const CROWN =
  'M -7.6 -33.7 C -7.5 -37.9 -4.8 -41.7 -1.4 -41.8 C 0.4 -41.8 1 -40.1 2.4 -40 C 3.6 -40 4 -41.5 5.2 -41.5 ' +
  'C 7.2 -41.4 8.2 -36.7 8.4 -31.5 Z';

const CROWN_SHADE =
  'M 5.2 -41.5 C 7.2 -41.4 8.2 -36.7 8.4 -31.5 L 6.6 -31.8 C 6.8 -36.1 6.4 -39.7 5.2 -41.5 Z ' +
  'M 2.4 -40 C 1.6 -38.9 1.4 -37.9 1.5 -36.5 L 2.3 -36.5 C 2.3 -37.9 2.4 -38.9 2.4 -40 Z';

const BAND = 'M -7.5 -33.9 L 8.3 -32.25 L 8.2 -34.05 L -7.35 -35.7 Z';

export type PawnLayer = { d: string; fill: 'player' | string; alpha?: number };

export const PAWN_LAYERS: PawnLayer[] = [
  { d: BODY, fill: 'player' },
  { d: BODY_SHADE, fill: '#000000', alpha: 0.18 },
  { d: HEAD, fill: 'player' },
  { d: HEAD_SHADE, fill: '#000000', alpha: 0.14 },
  { d: BRIM, fill: '#8b5a2b' },
  { d: BRIM_TOP, fill: '#dcaa66' },
  { d: CROWN, fill: '#e4b571' },
  { d: CROWN_SHADE, fill: '#b98244' },
  { d: BAND, fill: '#5c3a1c' },
];

// Every part winds the same way, so the parts together fill as one shape: the outline and one-colour icons.
export const PAWN_SILHOUETTE = [BODY, HEAD, BRIM, CROWN].join(' ');

export const PAWN_VIEWBOX = '-13.8 -43.1 27.6 44.4';
