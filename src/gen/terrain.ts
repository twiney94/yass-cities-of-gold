import type { Terrain } from '../engine/board';
import type { Suit } from '../engine/cards';
import { DIRECTIONS, type Hex, type HexKey, addHex, hexDisk, hexDistance, hexKey, neighbors } from '../engine/hex';
import { type RouteDef, finishHexes, tileOffset } from '../engine/route';
import { type Layout, chainLayout } from './layout';
import { type Random, makeRandom } from './random';

// The dials the search turns. Counts are for the whole route; strength and rubble are probabilities.
export type Knobs = {
  tiles: number;
  winding: number;
  rivers: number;
  villages: number;
  ridges: number;
  peaks: number;
  strength: number;
  rubble: number;
  camps: number;
  finish: Suit;
};

type Cell = { hex: Hex; tile: number; terrain: Terrain; calm: boolean };

const TILE = hexDisk(3).sort((a, b) => a.r - b.r || a.q - b.q);
const ROW_LENGTHS = [4, 5, 6, 7, 6, 5, 4];
const SUIT_CODE: Record<Suit, string> = { machete: 'G', paddle: 'B', coin: 'Y' };
const CALM_RADIUS = 2;

const pixel = ({ q, r }: Hex) => ({ x: Math.sqrt(3) * (q + r / 2), y: 1.5 * r });
const landscape = (suit: Suit, power: number): Terrain => ({ kind: 'landscape', suit, power });

const token = (terrain: Terrain): string => {
  switch (terrain.kind) {
    case 'landscape':
      return `${SUIT_CODE[terrain.suit]}${terrain.power}`;
    case 'rubble':
      return `R${terrain.cards}`;
    case 'basecamp':
      return `C${terrain.cards}`;
    case 'mountain':
      return 'M';
    case 'start':
      return `S${terrain.slot}`;
  }
};

export const generateRoute = (knobs: Knobs, seed: number, name: string): RouteDef | null => {
  const random = makeRandom(seed);
  const layout = chainLayout(random, knobs.tiles, knobs.winding);
  return layout && paintRoute(random, knobs, layout, name);
};

const paintRoute = (random: Random, knobs: Knobs, layout: Layout, name: string): RouteDef => {
  const cells = new Map<HexKey, Cell>();
  layout.centers.forEach((center, tile) => {
    for (const offset of TILE) {
      const hex = addHex(center, offset);
      cells.set(hexKey(hex), { hex, tile, terrain: landscape('machete', 1), calm: false });
    }
  });
  const cellAt = (hex: Hex) => cells.get(hexKey(hex));
  const roll = (high: number) => {
    const value = random.next();
    return value < knobs.strength * knobs.strength * high ? 3 : value < knobs.strength * 0.6 ? 2 : 1;
  };

  const slots = startSlots(layout);
  for (const cell of cells.values()) {
    if (cell.tile === 0 && slots.some((slot) => hexDistance(slot, cell.hex) <= CALM_RADIUS)) {
      cell.calm = true;
      if (random.chance(0.2)) cell.terrain = landscape('coin', 1);
    }
  }
  slots.forEach((hex, i) => {
    cellAt(hex)!.terrain = { kind: 'start', slot: i + 1 };
  });

  const wild = () => [...cells.values()].filter((cell) => !cell.calm);
  const plain = () => wild().filter((cell) => cell.terrain.kind === 'landscape' && cell.terrain.suit !== 'paddle');

  for (let i = 0; i < knobs.rivers; i++) {
    let at = random.pick(wild()).hex;
    let direction = random.int(6);
    const length = 5 + random.int(7);
    for (let step = 0; step < length; step++) {
      const cell = cellAt(at);
      if (!cell || cell.calm) break;
      cell.terrain = landscape('paddle', roll(0.4));
      if (random.chance(0.35)) direction = (direction + random.pick([-1, 1]) + 6) % 6;
      at = addHex(at, DIRECTIONS[direction]!);
    }
  }

  for (let i = 0; i < knobs.villages; i++) {
    const candidates = plain();
    if (candidates.length === 0) break;
    const blob = [random.pick(candidates)];
    const size = 3 + random.int(4);
    for (let tries = 0; blob.length < size && tries < 30; tries++) {
      const next = cellAt(random.pick(neighbors(random.pick(blob).hex)));
      if (next && !next.calm && !blob.includes(next) && !(next.terrain.kind === 'landscape' && next.terrain.suit === 'paddle')) blob.push(next);
    }
    for (const cell of blob) cell.terrain = landscape('coin', roll(0.5));
  }

  for (const cell of plain()) {
    if (cell.terrain.kind !== 'landscape' || cell.terrain.suit !== 'machete') continue;
    if (random.chance(knobs.strength * 0.45)) cell.terrain = landscape('machete', random.chance(knobs.strength * 0.5) ? 3 : 2);
  }

  for (let i = 0; i < knobs.ridges; i++) {
    let at = random.pick(plain()).hex;
    const length = 2 + random.int(3);
    for (let step = 0; step < length; step++) {
      const cell = cellAt(at);
      if (!cell || cell.calm || cell.terrain.kind !== 'landscape' || cell.terrain.suit === 'paddle') break;
      cell.terrain = { kind: 'mountain' };
      at = addHex(at, random.pick(DIRECTIONS));
    }
  }
  for (let i = 0; i < knobs.peaks; i++) random.pick(plain()).terrain = { kind: 'mountain' };

  for (const mountain of [...cells.values()].filter((cell) => cell.terrain.kind === 'mountain')) {
    for (const hex of neighbors(mountain.hex)) {
      const cell = cellAt(hex);
      if (!cell || cell.calm || cell.terrain.kind !== 'landscape' || cell.terrain.suit === 'paddle') continue;
      if (random.chance(knobs.rubble)) cell.terrain = { kind: 'rubble', cards: random.chance(knobs.strength * 0.5) ? 2 : 1 };
    }
  }

  layout.centers.forEach((_, tile) => {
    const count = Math.floor(knobs.camps + random.next());
    const spots = plain().filter((cell) => cell.tile === tile);
    for (let i = 0; i < count && spots.length > 0; i++) {
      spots.splice(random.int(spots.length), 1)[0]!.terrain = { kind: 'basecamp', cards: random.chance(knobs.strength * 0.4) ? 2 : 1 };
    }
  });

  clearWayToFinish(cells, layout, slots);

  const rows = (center: Hex): string[] => {
    const tokens = TILE.map((offset) => token(cellAt(addHex(center, offset))!.terrain));
    let start = 0;
    return ROW_LENGTHS.map((length) => tokens.slice(start, (start += length)).join(' '));
  };
  return {
    name,
    start: { name: 'Start', rows: rows(layout.centers[0]!) },
    tiles: layout.directions.map((direction, i) => ({ tile: { name: `Tile ${i + 1}`, rows: rows(layout.centers[i + 1]!) }, direction })),
    finish: { direction: layout.finish, suit: knobs.finish, power: 1 },
  };
};

// The four hexes of the start tile's edge that faces away from the rest of the route, in order along it.
const startSlots = (layout: Layout): Hex[] => {
  const [first, second] = layout.centers;
  const toward = pixel({ q: second!.q - first!.q, r: second!.r - first!.r });
  const along = { x: -toward.y, y: toward.x };
  const dot = (hex: Hex, axis: { x: number; y: number }) => pixel(hex).x * axis.x + pixel(hex).y * axis.y;
  return TILE.filter((hex) => hexDistance(hex, { q: 0, r: 0 }) === 3)
    .sort((a, b) => dot(a, toward) - dot(b, toward))
    .slice(0, 4)
    .sort((a, b) => dot(a, along) - dot(b, along))
    .map((hex) => addHex(first!, hex));
};

// Opens a way from every starting space to the finish by turning the fewest mountains back into jungle.
const clearWayToFinish = (cells: Map<HexKey, Cell>, layout: Layout, slots: Hex[]) => {
  const last = layout.centers.at(-1)!;
  const lastTile = new Set([...cells.values()].filter((cell) => cell.tile === layout.centers.length - 1).map((cell) => hexKey(cell.hex)));
  const finish = finishHexes(lastTile, last, addHex(last, tileOffset(layout.finish)));
  const cost = new Map<HexKey, number>();
  const next = new Map<HexKey, HexKey>();
  const queue: HexKey[] = [];
  for (const hex of finish) {
    for (const neighbor of neighbors(hex)) {
      const key = hexKey(neighbor);
      if (!lastTile.has(key) || cost.has(key)) continue;
      cost.set(key, cells.get(key)!.terrain.kind === 'mountain' ? 1 : 0);
      queue.push(key);
    }
  }
  while (queue.length > 0) {
    queue.sort((a, b) => cost.get(a)! - cost.get(b)!);
    const key = queue.shift()!;
    const cell = cells.get(key)!;
    if (cell.terrain.kind === 'start') continue;
    for (const neighbor of neighbors(cell.hex)) {
      const nextKey = hexKey(neighbor);
      const other = cells.get(nextKey);
      if (!other) continue;
      const total = cost.get(key)! + (other.terrain.kind === 'mountain' ? 1 : 0);
      if (total < (cost.get(nextKey) ?? Infinity)) {
        cost.set(nextKey, total);
        next.set(nextKey, key);
        queue.push(nextKey);
      }
    }
  }
  for (const slot of slots) {
    for (let key = next.get(hexKey(slot)); key; key = next.get(key)) {
      const cell = cells.get(key)!;
      if (cell.terrain.kind === 'mountain') cell.terrain = landscape('machete', 1);
    }
  }
};
