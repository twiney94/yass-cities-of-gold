import { describe, expect, it } from 'vitest';
import { hexDisk, hexDistance, hexKey, neighbors, rotateHex } from './hex';

describe('hex math', () => {
  it('finds 6 neighbors, all at distance 1', () => {
    const origin = { q: 2, r: -1 };

    const around = neighbors(origin);

    expect(new Set(around.map(hexKey)).size).toBe(6);
    expect(around.every((h) => hexDistance(origin, h) === 1)).toBe(true);
  });

  it('builds a 37-hex tile from a radius-3 disk', () => {
    expect(hexDisk(3)).toHaveLength(37);
  });

  it('rotates around the origin, preserving distance and cycling after 6 turns', () => {
    const h = { q: 3, r: -1 };

    expect(rotateHex(h, 6)).toEqual(h);
    expect(rotateHex(h, -1)).toEqual(rotateHex(h, 5));
    for (let i = 0; i < 6; i++) {
      expect(hexDistance({ q: 0, r: 0 }, rotateHex(h, i))).toBe(3);
    }
  });

  it('maps a full tile onto itself under rotation', () => {
    const tile = new Set(hexDisk(3).map(hexKey));

    const rotated = new Set(hexDisk(3).map((h) => hexKey(rotateHex(h, 2))));

    expect(rotated).toEqual(tile);
  });
});
