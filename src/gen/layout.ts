import { type Hex, addHex, hexDistance } from '../engine/hex';
import { type Direction, tileOffset } from '../engine/route';
import type { Random } from './random';

const DIRECTIONS: readonly Direction[] = ['downRight', 'down', 'downLeft', 'upLeft', 'up', 'upRight'];
const TILE_SPAN = 7;
const ATTEMPTS = 40;

export type Layout = { centers: Hex[]; directions: Direction[]; finish: Direction };

const turn = (direction: Direction, by: number): Direction => DIRECTIONS[(DIRECTIONS.indexOf(direction) + by + 6) % 6]!;

// A chain of tiles that heads broadly one way: every step keeps the heading or turns 60° off it, and no tile
// touches any tile but its neighbours in the chain (tiles sharing an edge have centres TILE_SPAN apart).
export const chainLayout = (random: Random, tiles: number, winding: number): Layout | null => {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const heading = random.pick(['downRight', 'upRight'] as const);
    const centers: Hex[] = [{ q: 0, r: 0 }];
    const fits = (center: Hex) => centers.every((other, i) => i === centers.length - 1 || hexDistance(other, center) > TILE_SPAN);
    const nextStep = (): Direction | null => {
      const side = random.pick([-1, 1]);
      const order = random.chance(winding) ? [side, 0, -side] : [0, side, -side];
      return order.map((by) => turn(heading, by)).find((d) => fits(addHex(centers.at(-1)!, tileOffset(d)))) ?? null;
    };
    const directions: Direction[] = [];
    for (let i = 0; i < tiles; i++) {
      const direction = nextStep();
      if (!direction) break;
      directions.push(direction);
      centers.push(addHex(centers.at(-1)!, tileOffset(direction)));
    }
    const finish = directions.length === tiles ? nextStep() : null;
    if (finish) return { centers, directions, finish };
  }
  return null;
};
