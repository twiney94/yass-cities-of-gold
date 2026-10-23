export type Hex = { readonly q: number; readonly r: number };
export type HexKey = `${number},${number}`;

export const DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const hexKey = ({ q, r }: Hex): HexKey => `${q},${r}`;

export const addHex = (a: Hex, b: Hex): Hex => ({ q: a.q + b.q, r: a.r + b.r });

export const neighbors = (h: Hex): Hex[] => DIRECTIONS.map((d) => addHex(h, d));

export const hexDistance = (a: Hex, b: Hex): number => {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
};

export const rotateHex = (h: Hex, sixths: number): Hex => {
  let { q, r } = h;
  for (let i = 0; i < ((sixths % 6) + 6) % 6; i++) {
    [q, r] = [0 - r, q + r];
  }
  return { q, r };
};

export const hexDisk = (radius: number): Hex[] => {
  const hexes: Hex[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
};
