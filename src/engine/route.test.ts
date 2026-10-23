import { describe, expect, it } from 'vitest';
import { STANDIN_BLOCKADES, STANDIN_ROUTE } from '../content/standin';
import { adjacentSpaces } from './board';
import { type HexKey, hexDistance, hexKey } from './hex';
import { buildBoard, tileOffset } from './route';
import { parseTile } from './tiles';

describe('parseTile', () => {
  it('reads a 37-space hexagon written as rows of 4 to 7 spaces', () => {
    const rows = ['G1 G1 G1 G1', 'G1 G1 G1 G1 G1', 'G1 G1 G1 G1 G1 G1', 'G1 G1 G1 B2 G1 G1 G1', 'G1 G1 G1 G1 G1 G1', 'G1 G1 G1 G1 G1', 'G1 G1 G1 .'];

    const spaces = parseTile(rows);

    expect(spaces).toHaveLength(36);
    expect(spaces.find((s) => s.hex.q === 0 && s.hex.r === 0)?.terrain).toEqual({ kind: 'landscape', suit: 'paddle', power: 2 });
  });

  it('rejects rows of the wrong length', () => {
    expect(() => parseTile(['G1'])).toThrow('rows of 4,5,6,7,6,5,4');
  });
});

describe('buildBoard', () => {
  const board = buildBoard(STANDIN_ROUTE, STANDIN_BLOCKADES, 7);
  const spaces = Object.values(board.spaces).flatMap((s) => s ?? []);

  it('lays neighbouring tiles edge to edge, 7 hexes apart', () => {
    expect(hexDistance({ q: 0, r: 0 }, tileOffset('downRight'))).toBe(7);
    expect(spaces).toHaveLength(37 * 5 + 3);
  });

  it('puts a random blockade between each pair of consecutive tiles, none before the finish', () => {
    expect(board.blockades.map((b) => b.tiles)).toEqual([
      ['0:Camp', '1:Jungle'],
      ['1:Jungle', '2:River'],
      ['2:River', '3:Village'],
      ['3:Village', '4:Highlands'],
    ]);
    expect(new Set(board.blockades.map((b) => b.id)).size).toBe(4);
    expect(buildBoard(STANDIN_ROUTE, STANDIN_BLOCKADES, 7)).toEqual(board);
  });

  it('adds 3 finishing spaces touching the last tile', () => {
    const finish = spaces.filter((s) => s.finish);

    expect(finish).toHaveLength(3);
    for (const space of finish) {
      expect(adjacentSpaces(board, hexKey(space.hex)).some((n) => n.tile === '4:Highlands')).toBe(true);
    }
  });

  it('connects every starting space to the finish', () => {
    const reached = new Set<HexKey>();
    const queue = spaces.filter((s) => s.terrain.kind === 'start').map((s) => hexKey(s.hex));
    for (const key of queue) {
      reached.add(key);
      for (const next of adjacentSpaces(board, key)) {
        const nextKey = hexKey(next.hex);
        if (!reached.has(nextKey) && next.terrain.kind !== 'mountain' && next.terrain.kind !== 'start') {
          reached.add(nextKey);
          queue.push(nextKey);
        }
      }
    }

    expect(spaces.filter((s) => s.finish).every((s) => reached.has(hexKey(s.hex)))).toBe(true);
  });
});
