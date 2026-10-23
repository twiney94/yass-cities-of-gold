import type { BlockadeId, Board, Requirement } from './board';
import type { Suit } from './cards';
import { type Hex, type HexKey, addHex, hexDisk, hexKey, neighbors, rotateHex } from './hex';
import { type RngState, shuffle } from './rng';
import { parseTile } from './tiles';

export type Direction = 'downRight' | 'down' | 'downLeft' | 'upLeft' | 'up' | 'upRight';

const DIRECTIONS: readonly Direction[] = ['downRight', 'down', 'downLeft', 'upLeft', 'up', 'upRight'];

// Two 37-hex tiles laid edge to edge have centres 7 hexes apart; the other directions are 60° rotations.
const TILE_STEP: Hex = { q: 4, r: 3 };
const FINISH_SPACES = 3;

export const tileOffset = (direction: Direction): Hex => rotateHex(TILE_STEP, DIRECTIONS.indexOf(direction));

export type TileDef = { name: string; rows: readonly string[] };

export type RouteDef = {
  name: string;
  start: TileDef;
  tiles: readonly { tile: TileDef; direction: Direction; rotation?: number }[];
  finish: { direction: Direction; suit: Suit; power: number };
};

export type BlockadeDef = { id: BlockadeId; requirement: Requirement };

export const buildBoard = (route: RouteDef, blockadeSet: readonly BlockadeDef[], seed: RngState): Board => {
  const spaces: Board['spaces'] = {};
  const place = (tile: TileDef, tileId: string, center: Hex, rotation: number): Set<HexKey> => {
    const placed = new Set<HexKey>();
    for (const space of parseTile(tile.rows)) {
      const hex = addHex(center, rotateHex(space.hex, rotation));
      const key = hexKey(hex);
      if (spaces[key]) throw new Error(`Tile "${tile.name}" overlaps another tile`);
      spaces[key] = { hex, tile: tileId, terrain: space.terrain, finish: space.finish };
      placed.add(key);
    }
    return placed;
  };

  let center: Hex = { q: 0, r: 0 };
  const tileIds = [`0:${route.start.name}`];
  let last = place(route.start, tileIds[0]!, center, 0);
  route.tiles.forEach(({ tile, direction, rotation = 0 }, i) => {
    center = addHex(center, tileOffset(direction));
    const id = `${i + 1}:${tile.name}`;
    tileIds.push(id);
    last = place(tile, id, center, rotation);
  });

  const { direction, suit, power } = route.finish;
  for (const hex of finishHexes(last, center, addHex(center, tileOffset(direction)))) {
    spaces[hexKey(hex)] = { hex, tile: 'finish', terrain: { kind: 'landscape', suit, power }, finish: true };
  }

  const connections = tileIds.length - 1;
  if (connections > blockadeSet.length) throw new Error(`${connections} tile connections but only ${blockadeSet.length} blockades`);
  const drawn = shuffle(blockadeSet, seed).items;
  const blockades = drawn.slice(0, connections).map(({ id, requirement }, i) => ({
    id,
    requirement,
    tiles: [tileIds[i]!, tileIds[i + 1]!] as const,
  }));

  return { spaces, blockades };
};

const toPixel = ({ q, r }: Hex) => ({ x: Math.sqrt(3) * (q + r / 2), y: 1.5 * r });

export const finishHexes = (lastTile: Set<HexKey>, lastCenter: Hex, finishCenter: Hex): Hex[] => {
  const a = toPixel(lastCenter);
  const b = toPixel(finishCenter);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const fromMid = (hex: Hex) => Math.hypot(toPixel(hex).x - mid.x, toPixel(hex).y - mid.y);
  return hexDisk(3)
    .map((hex) => addHex(finishCenter, hex))
    .filter((hex) => neighbors(hex).some((n) => lastTile.has(hexKey(n))))
    .sort((x, y) => fromMid(x) - fromMid(y))
    .slice(0, FINISH_SPACES);
};
