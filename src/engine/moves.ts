import type { Target } from './actions';
import { type BlockadeId, type Terrain, adjacentSpaces, blockadeBetween, touchesBlockade } from './board';
import { CARDS, type Suit } from './cards';
import { type HexKey, hexKey } from './hex';
import type { Card, GameState, PieceId } from './state';

export type TargetKey = `space:${HexKey}` | `blockade:${number}`;

export const targetKey = (target: Target): TargetKey =>
  target.kind === 'space' ? `space:${target.hex}` : `blockade:${target.id}`;

export type MovePlan = { target: Target; path: Target[]; remaining: number };

const boardPosition = (state: GameState, pieceId: PieceId): HexKey | null => {
  const at = state.pieces.find((p) => p.id === pieceId)?.at;
  return at === undefined || at === 'eldorado' ? null : at;
};

const occupiedBy = (state: GameState, except: PieceId): Set<string> =>
  new Set(state.pieces.flatMap((p) => (p.id === except || p.at === 'eldorado' ? [] : [p.at])));

// Every space or blockade one movement card can reach, keeping the path that leaves the most power over.
export const movementPlans = (state: GameState, pieceId: PieceId, suit: Suit, power: number): Map<TargetKey, MovePlan> => {
  const plans = new Map<TargetKey, MovePlan>();
  const origin = boardPosition(state, pieceId);
  if (!origin) return plans;
  const { board, blockades } = state;
  const occupied = occupiedBy(state, pieceId);

  const offer = (target: Target, remaining: number, path: Target[]): boolean => {
    const key = targetKey(target);
    if ((plans.get(key)?.remaining ?? -1) >= remaining) return false;
    plans.set(key, { target, path, remaining });
    return true;
  };

  const queue: { at: HexKey; remaining: number; path: Target[] }[] = [{ at: origin, remaining: power, path: [] }];
  for (let next = queue.shift(); next; next = queue.shift()) {
    const { at, remaining, path } = next;
    const from = board.spaces[at]!;
    for (const blockade of board.blockades) {
      const requirement = blockade.requirement;
      if (!blockades.includes(blockade.id) || !touchesBlockade(board, at, blockade)) continue;
      if (requirement.kind !== 'landscape' || requirement.suit !== suit || requirement.power > remaining) continue;
      const target: Target = { kind: 'blockade', id: blockade.id };
      offer(target, remaining - requirement.power, [...path, target]);
    }
    for (const space of adjacentSpaces(board, at)) {
      const key = hexKey(space.hex);
      const terrain = space.terrain;
      if (key === origin || occupied.has(key) || terrain.kind !== 'landscape' || terrain.suit !== suit) continue;
      let cost = terrain.power;
      let prefix = path;
      const blockade = blockadeBetween(board, blockades, from.tile, space.tile);
      if (blockade) {
        const requirement = blockade.requirement;
        if (requirement.kind !== 'landscape' || requirement.suit !== suit) continue;
        cost += requirement.power;
        prefix = [...path, { kind: 'blockade', id: blockade.id }];
      }
      if (cost > remaining) continue;
      const target: Target = { kind: 'space', hex: key };
      const stepPath = [...prefix, target];
      if (offer(target, remaining - cost, stepPath) && !space.finish) {
        queue.push({ at: key, remaining: remaining - cost, path: stepPath });
      }
    }
  }
  return plans;
};

export type AdjacentTarget = { target: Target; terrain: Terrain };

// Spaces and blockades right next to a piece that are not occupied or behind a blockade.
export const adjacentTargets = (state: GameState, pieceId: PieceId): AdjacentTarget[] => {
  const at = boardPosition(state, pieceId);
  if (!at) return [];
  const { board, blockades } = state;
  const from = board.spaces[at]!;
  const occupied = occupiedBy(state, pieceId);
  const spaces = adjacentSpaces(board, at)
    .filter((space) => !occupied.has(hexKey(space.hex)) && !blockadeBetween(board, blockades, from.tile, space.tile))
    .map((space) => ({ target: { kind: 'space', hex: hexKey(space.hex) } as Target, terrain: space.terrain }));
  const touched = board.blockades
    .filter((blockade) => blockades.includes(blockade.id) && touchesBlockade(board, at, blockade))
    .map((blockade) => ({ target: { kind: 'blockade', id: blockade.id } as Target, terrain: blockade.requirement }));
  return [...spaces, ...touched];
};

export type Segment = { card: Card | null; suit: Suit; path: Target[] };
export type RoutePlan = { target: Target; segments: Segment[]; cardsUsed: number };
type Leftover = { suit: Suit; remaining: number };

const SUITS: readonly Suit[] = ['machete', 'paddle', 'coin'];

const movementOptions = (card: Card): { suit: Suit; power: number }[] => {
  const face = CARDS[card.type].face;
  if (face.kind === 'expedition') return [{ suit: face.suit, power: face.power }];
  if (face.kind === 'joker') return SUITS.map((suit) => ({ suit, power: face.power }));
  return [];
};

// Chains the leftover of the card in play (first, if any) and the given cards one after another, keeping
// for each target the plan that spends the fewest cards. Jokers take whichever symbol each stretch needs.
export const routePlans = (
  state: GameState,
  pieceId: PieceId,
  cards: readonly Card[],
  leftover: Leftover | null,
): Map<TargetKey, RoutePlan> => {
  const plans = new Map<TargetKey, RoutePlan>();
  const origin = boardPosition(state, pieceId);
  if (!origin) return plans;

  type Node = { at: HexKey; unused: Card[]; broken: BlockadeId[]; segments: Segment[]; cardsUsed: number };
  const seen = new Set<string>();
  const queue: Node[] = [
    { at: origin, unused: cards.filter((card) => movementOptions(card).length > 0), broken: [], segments: [], cardsUsed: 0 },
  ];

  for (let node = queue.shift(); node; node = queue.shift()) {
    const { at, unused, broken, segments, cardsUsed } = node;
    const here: GameState = {
      ...state,
      pieces: state.pieces.map((p) => (p.id === pieceId ? { ...p, at } : p)),
      blockades: state.blockades.filter((id) => !broken.includes(id)),
    };
    const options: { card: Card | null; suit: Suit; power: number; rest: Card[] }[] = [];
    if (leftover && segments.length === 0) options.push({ card: null, suit: leftover.suit, power: leftover.remaining, rest: unused });
    const tried = new Set<string>();
    unused.forEach((card, i) => {
      if (tried.has(card.type)) return;
      tried.add(card.type);
      const rest = unused.filter((_, j) => j !== i);
      for (const { suit, power } of movementOptions(card)) options.push({ card, suit, power, rest });
    });

    for (const { card, suit, power, rest } of options) {
      const used = cardsUsed + (card ? 1 : 0);
      for (const plan of movementPlans(here, pieceId, suit, power).values()) {
        const nextSegments = [...segments, { card, suit, path: plan.path }];
        const key = targetKey(plan.target);
        if (key !== `space:${origin}` && (plans.get(key)?.cardsUsed ?? Infinity) > used) {
          plans.set(key, { target: plan.target, segments: nextSegments, cardsUsed: used });
        }
        if (plan.target.kind !== 'space' || rest.length === 0 || state.board.spaces[plan.target.hex]?.finish) continue;
        const nextBroken = [...broken, ...plan.path.flatMap((t) => (t.kind === 'blockade' ? [t.id] : []))];
        const signature = `${plan.target.hex}|${rest.map((c) => c.type).sort()}|${nextBroken.sort()}`;
        if (seen.has(signature)) continue;
        seen.add(signature);
        queue.push({ at: plan.target.hex, unused: rest, broken: nextBroken, segments: nextSegments, cardsUsed: used });
      }
    }
  }
  return plans;
};
