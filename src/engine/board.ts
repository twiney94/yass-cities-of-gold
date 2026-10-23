import type { Suit } from './cards';
import { type Hex, type HexKey, hexKey, neighbors } from './hex';

export type TileId = string;
export type BlockadeId = number;

export type Requirement =
  | { kind: 'landscape'; suit: Suit; power: number }
  | { kind: 'rubble'; cards: number };

export type Terrain =
  | Requirement
  | { kind: 'basecamp'; cards: number }
  | { kind: 'mountain' }
  | { kind: 'start'; slot: number };

export type Space = { hex: Hex; tile: TileId; terrain: Terrain; finish: boolean };

export type Blockade = { id: BlockadeId; tiles: readonly [TileId, TileId]; requirement: Requirement };

export type Board = { spaces: Partial<Record<HexKey, Space>>; blockades: readonly Blockade[] };

export const adjacentSpaces = (board: Board, key: HexKey): Space[] => {
  const space = board.spaces[key];
  if (!space) return [];
  return neighbors(space.hex).flatMap((hex) => board.spaces[hexKey(hex)] ?? []);
};

export const separates = (blockade: Blockade, a: TileId, b: TileId): boolean => {
  const [x, y] = blockade.tiles;
  return (x === a && y === b) || (x === b && y === a);
};

export const blockadeBetween = (
  board: Board,
  remaining: readonly BlockadeId[],
  a: TileId,
  b: TileId,
): Blockade | undefined =>
  a === b ? undefined : board.blockades.find((blockade) => remaining.includes(blockade.id) && separates(blockade, a, b));

export const touchesBlockade =(board: Board, key: HexKey, blockade: Blockade): boolean => {
  const space = board.spaces[key];
  if (!space) return false;
  return adjacentSpaces(board, key).some((other) => separates(blockade, space.tile, other.tile));
};
