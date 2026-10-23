import type { Action, Target } from '../engine/actions';
import { type BlockadeId, type Board, type Terrain, adjacentSpaces, blockadeBetween } from '../engine/board';
import { type ActionEffect, ALL_CARDS, CARDS, type CardType, type Suit, coinPower, coinValue } from '../engine/cards';
import { type HexKey, hexKey } from '../engine/hex';
import { adjacentTargets, planActions, routePlans } from '../engine/moves';
import { nextRandom } from '../engine/rng';
import { applyActions } from '../engine/rules';
import type { Card, GameState, PlayerState } from '../engine/state';

export type BotLevel = 'easy' | 'normal' | 'strong';

type Effort = Map<HexKey, number>;
type Option = { score: number; actions: Action[] };
type Demand = {
  share: Record<Suit, number>;
  peak: Record<Suit, number>;
  soon: Record<Suit, number>;
  owned: Record<Suit, number>;
};

const SUITS: readonly Suit[] = ['machete', 'paddle', 'coin'];
const MARKET_TYPES = ALL_CARDS.filter((card) => card.supply.from !== 'starterDeck').map((card) => card.type);
const STARTERS: readonly CardType[] = ['sailor', 'explorer', 'traveler'];
const DRAW_EFFECTS: ReadonlySet<ActionEffect> = new Set(['cartographer', 'compass', 'scientist', 'travelLog']);

// Paddle cards are the scarcest in the market, coin the next, so the same power costs more effort.
const SUIT_EFFORT: Record<Suit, number> = { machete: 1, coin: 1.15, paddle: 1.35 };
const ACTION_VALUE: Record<ActionEffect, number> = {
  cartographer: 2.6,
  scientist: 2.2,
  travelLog: 1.8,
  compass: 1.8,
  native: 2.8,
  transmitter: 2.4,
};
const ARRIVAL_BONUS = 20;
const MIN_MOVE_SCORE = 0.25;
const THINNING_BONUS = 0.6;
const NATIVE_COST = 0.6;
const UNLOCK_BONUS = 3;
const SOON_STEPS = 4;
const TRANSMITTER_MIN_VALUE = 2.5;
const MIN_DECK_SIZE = 6;
const EASY_SLIP = 0.5;
const EASY_CHOICES = 3;
const LOOKAHEAD_MOVES = 6;
const LOOKAHEAD_BUYS = 3;
const SIMULATED_STEPS = 12;
const BLOCKADE_VALUE = 0.3;

export const requirementEffort = (terrain: Terrain): number => {
  switch (terrain.kind) {
    case 'landscape':
      return terrain.power * SUIT_EFFORT[terrain.suit];
    case 'rubble':
      return terrain.cards * 1.2;
    case 'basecamp':
      return terrain.cards * 0.9;
    case 'mountain':
    case 'start':
      return Infinity;
  }
};

const effortCache = new WeakMap<Board, Map<string, Effort>>();

// Effort still needed from each space to reach the City of Gold, with remaining blockades charged at their border.
// It only depends on the board and the blockades left, so results are cached per board.
export const effortToFinish = (state: GameState, ignoring: BlockadeId | null = null): Effort => {
  const { board } = state;
  const blockades = state.blockades.filter((id) => id !== ignoring);
  const cacheKey = blockades.join(',');
  const cached = effortCache.get(board)?.get(cacheKey);
  if (cached) return cached;
  const effort: Effort = new Map();
  const open = new Set<HexKey>();
  for (const space of Object.values(board.spaces)) {
    if (!space?.finish) continue;
    effort.set(hexKey(space.hex), 0);
    open.add(hexKey(space.hex));
  }
  while (open.size > 0) {
    let current = open.values().next().value!;
    for (const key of open) if (effort.get(key)! < effort.get(current)!) current = key;
    open.delete(current);
    const into = board.spaces[current]!;
    for (const from of adjacentSpaces(board, current)) {
      if (from.terrain.kind === 'mountain') continue;
      const blockade = blockadeBetween(board, blockades, from.tile, into.tile);
      const total = effort.get(current)! + requirementEffort(into.terrain) + (blockade ? requirementEffort(blockade.requirement) : 0);
      const key = hexKey(from.hex);
      if (total < (effort.get(key) ?? Infinity)) {
        effort.set(key, total);
        open.add(key);
      }
    }
  }
  if (!effortCache.has(board)) effortCache.set(board, new Map());
  effortCache.get(board)!.set(cacheKey, effort);
  return effort;
};

const demandAhead = (state: GameState, effort: Effort): Demand => {
  const sums: Record<Suit, number> = { machete: 0, paddle: 0, coin: 0 };
  const peak: Record<Suit, number> = { machete: 0, paddle: 0, coin: 0 };
  const soon: Record<Suit, number> = { machete: 0, paddle: 0, coin: 0 };
  for (const piece of state.pieces) {
    if (piece.owner !== state.turn.player || piece.at === 'eldorado') continue;
    let at: HexKey = piece.at;
    for (let step = 0; step < 80; step++) {
      const next = adjacentSpaces(state.board, at)
        .map((space) => ({ space, total: requirementEffort(space.terrain) + (effort.get(hexKey(space.hex)) ?? Infinity) }))
        .sort((a, b) => a.total - b.total)[0];
      if (!next || !Number.isFinite(next.total)) break;
      const terrain = next.space.terrain;
      if (terrain.kind === 'landscape') {
        sums[terrain.suit] += terrain.power;
        peak[terrain.suit] = Math.max(peak[terrain.suit], terrain.power);
        if (step < SOON_STEPS) soon[terrain.suit] = Math.max(soon[terrain.suit], terrain.power);
      }
      if (next.space.finish) break;
      at = hexKey(next.space.hex);
    }
  }
  const owned: Record<Suit, number> = { machete: 0, paddle: 0, coin: 0 };
  const me = state.players[state.turn.player]!;
  for (const card of [...me.drawPile, ...me.hand, ...me.played, ...me.discard]) {
    const face = CARDS[card.type].face;
    if (face.kind === 'action') continue;
    for (const suit of face.kind === 'joker' ? SUITS : [face.suit]) owned[suit] = Math.max(owned[suit], face.power);
  }
  const total = sums.machete + sums.paddle + sums.coin || 1;
  return { share: { machete: sums.machete / total, paddle: sums.paddle / total, coin: sums.coin / total }, peak, soon, owned };
};

const effortLeft = (state: GameState, effort: Effort): number =>
  Math.max(0, ...state.pieces.flatMap((p) => (p.owner === state.turn.player && p.at !== 'eldorado' ? [effort.get(p.at) ?? 0] : [])));

// How much the bot would rather keep coins for buying: high early on, low near the finish.
const appetiteFor = (left: number) => Math.min(0.8, Math.max(0.15, left / 25));

const movePower = (card: Card): number => {
  const face = CARDS[card.type].face;
  return face.kind === 'action' ? 0 : face.power;
};

const spendCost = (card: Card, appetite: number) => coinValue(card.type) * appetite + 0.05 * movePower(card);

const desirability = (type: CardType, demand: Demand): number => {
  const { face, singleUse } = CARDS[type];
  let value: number;
  if (face.kind === 'action') {
    value = ACTION_VALUE[face.effect];
  } else {
    const suits = face.kind === 'joker' ? SUITS : [face.suit];
    const fit = Math.max(...suits.map((suit) => demand.share[suit] + (demand.peak[suit] > 1 && face.power >= demand.peak[suit] ? 0.4 : 0)));
    const unlocks = suits.some((suit) => demand.owned[suit] < demand.peak[suit] && face.power >= demand.peak[suit]);
    value = face.power * (0.35 + fit) + (face.kind === 'joker' ? 0.3 : 0) + (unlocks ? UNLOCK_BONUS : 0);
    if (face.kind === 'expedition' && face.suit === 'coin') value += face.power * 0.25;
  }
  return singleUse ? value * 0.55 : value;
};

const cheapestCards = (hand: Card[], count: number, burning: boolean, appetite: number): Card[] | null => {
  if (hand.length < count) return null;
  const keep = (card: Card) => spendCost(card, appetite) + movePower(card) * 0.1 - (burning && STARTERS.includes(card.type) ? THINNING_BONUS : 0);
  return [...hand].sort((a, b) => keep(a) - keep(b)).slice(0, count);
};

const moveOptions = (state: GameState, effort: Effort, appetite: number, chaining = true): Option[] => {
  const { turn } = state;
  const hand = state.players[turn.player]!.hand;
  if (turn.stage !== 'moving') return [];
  const withoutBlockade = new Map<BlockadeId, Effort>();
  const progress = (at: HexKey, target: Target): number => {
    const from = effort.get(at) ?? Infinity;
    if (target.kind === 'blockade') {
      if (!withoutBlockade.has(target.id)) withoutBlockade.set(target.id, effortToFinish(state, target.id));
      return from - (withoutBlockade.get(target.id)!.get(at) ?? Infinity);
    }
    if (state.board.spaces[target.hex]?.finish) return from + ARRIVAL_BONUS;
    return from - (effort.get(target.hex) ?? Infinity);
  };

  const options: Option[] = [];
  const movers = hand.filter((card) => CARDS[card.type].face.kind !== 'action');
  const singles = movers.filter((card, i) => movers.findIndex((other) => other.type === card.type) === i).map((card) => [card]);
  for (const piece of state.pieces) {
    if (piece.owner !== turn.player || piece.at === 'eldorado' || !Number.isFinite(effort.get(piece.at))) continue;
    const at = piece.at;
    const leftover = turn.movement?.pieceId === piece.id ? { suit: turn.movement.suit, remaining: turn.movement.remaining } : null;
    for (const cards of [...(chaining ? [movers] : []), ...singles, ...(leftover ? [[]] : [])]) {
      for (const plan of routePlans(state, piece.id, cards, leftover).values()) {
        const spent = plan.segments.reduce((sum, segment) => sum + (segment.card ? spendCost(segment.card, appetite) : 0), 0);
        options.push({ score: progress(at, plan.target) - spent, actions: planActions(plan, piece.id) });
      }
    }
    const native = hand.find((card) => card.type === 'native');
    for (const { target, terrain } of adjacentTargets(state, piece.id)) {
      const gain = progress(at, target);
      if (!(gain > 0)) continue;
      if (terrain.kind === 'rubble' || terrain.kind === 'basecamp') {
        const burning = terrain.kind === 'basecamp';
        const payment = cheapestCards(hand, terrain.cards, burning, appetite);
        if (payment) {
          const cost = payment.reduce(
            (sum, card) => sum + spendCost(card, appetite) - (burning && STARTERS.includes(card.type) ? THINNING_BONUS : 0),
            0,
          );
          options.push({ score: gain - cost, actions: [{ type: 'payCards', pieceId: piece.id, target, cardIds: payment.map((c) => c.id) }] });
        }
      }
      if (native && terrain.kind !== 'mountain' && terrain.kind !== 'start') {
        options.push({ score: gain - NATIVE_COST, actions: [{ type: 'playNative', cardId: native.id, pieceId: piece.id, target }] });
      }
    }
  }
  return options;
};

const bestGain = (state: GameState, demand: Demand): CardType | null => {
  const ranked = MARKET_TYPES.filter((type) => (state.market.remaining[type] ?? 0) > 0).sort(
    (a, b) => desirability(b, demand) - desirability(a, demand),
  );
  const best = ranked[0];
  return best && desirability(best, demand) >= TRANSMITTER_MIN_VALUE ? best : null;
};

// Coin cards first, keeping single-use coin items for last so they are only burned when needed.
const paymentFor = (hand: Card[], cost: number): Card[] | null => {
  const isItem = (card: Card) => CARDS[card.type].singleUse && coinPower(card.type) !== null;
  const ordered = [...hand].sort((a, b) => Number(isItem(a)) - Number(isItem(b)) || coinValue(b.type) - coinValue(a.type));
  const payment: Card[] = [];
  let coins = 0;
  for (const card of ordered) {
    if (coins >= cost) break;
    payment.push(card);
    coins += coinValue(card.type);
  }
  return coins >= cost ? payment : null;
};

// Purchases the bot is willing to make, most desirable first, each already checked against the rules.
function* purchases(state: GameState, demand: Demand, left: number): Generator<Action> {
  const hand = state.players[state.turn.player]!.hand;
  if (state.turn.stage !== 'moving' || hand.length === 0) return;
  const blocked = SUITS.some((suit) => demand.owned[suit] < demand.peak[suit]);
  const minimum = left < 6 && !blocked ? 3.5 : 1;
  const ranked = MARKET_TYPES.map((type) => ({ type, value: desirability(type, demand) }))
    .filter(({ value }) => value >= minimum)
    .sort((a, b) => b.value - a.value);
  for (const { type } of ranked) {
    const supply = CARDS[type].supply;
    if (supply.from === 'starterDeck') continue;
    const payment = paymentFor(hand, supply.cost);
    if (!payment) continue;
    const action: Action = { type: 'buy', cardType: type, cardIds: payment.map((card) => card.id) };
    if (applyActions(state, [action]).ok) yield action;
  }
}

const first = <T>(items: Iterable<T>, count: number): T[] => {
  const taken: T[] = [];
  for (const item of items) {
    if (taken.length >= count) break;
    taken.push(item);
  }
  return taken;
};

const cardsToRemove = (state: GameState, max: number): number[] => {
  const me = state.players[state.turn.player]!;
  const owned = [...me.drawPile, ...me.hand, ...me.played, ...me.discard];
  const paddles = owned.filter((card) => {
    const face = CARDS[card.type].face;
    return face.kind === 'joker' || (face.kind === 'expedition' && face.suit === 'paddle');
  }).length;
  const coins = owned.filter((card) => !STARTERS.includes(card.type) && (coinPower(card.type) ?? 0) >= 2).length;
  const removable = (card: Card) =>
    (card.type === 'sailor' && paddles > 1) || card.type === 'explorer' || (card.type === 'traveler' && coins >= 2);
  const room = Math.max(0, owned.length - MIN_DECK_SIZE);
  return me.hand
    .filter(removable)
    .sort((a, b) => STARTERS.indexOf(a.type) - STARTERS.indexOf(b.type))
    .slice(0, Math.min(max, room))
    .map((card) => card.id);
};

// Kept cards take the place of fresh draws, so only keep what the next few steps need.
const worthKeeping = (card: Card, demand: Demand) => {
  const face = CARDS[card.type].face;
  if (face.kind === 'action') return true;
  const suits = face.kind === 'joker' ? SUITS : [face.suit];
  return face.power >= 2 && suits.some((suit) => demand.soon[suit] > 1 && face.power >= demand.soon[suit]);
};

const drawingCard = (state: GameState, me: PlayerState): Card | null => {
  if (me.drawPile.length + me.discard.length === 0 || state.turn.stage !== 'moving') return null;
  return (
    me.hand.find((card) => {
      const face = CARDS[card.type].face;
      return face.kind === 'action' && DRAW_EFFECTS.has(face.effect);
    }) ?? null
  );
};

// The next chunk of the current player's turn: one movement, one card play, a purchase, or ending the turn.
export const botStep = (state: GameState, level: BotLevel = 'normal'): Action[] => {
  switch (level) {
    case 'easy':
      return easyStep(state);
    case 'normal':
      return normalStep(state);
    case 'strong':
      return strongStep(state);
  }
};

const normalStep = (state: GameState): Action[] => {
  const { turn } = state;
  const me = state.players[turn.player]!;
  if (turn.pending) return [{ type: 'removeFromHand', cardIds: cardsToRemove(state, turn.pending.max) }];

  const draw = drawingCard(state, me);
  if (draw) return [{ type: 'playAction', cardId: draw.id }];

  const effort = effortToFinish(state);
  const left = effortLeft(state, effort);
  const appetite = appetiteFor(left);
  const moves = moveOptions(state, effort, appetite)
    .filter((option) => option.score > MIN_MOVE_SCORE)
    .sort((a, b) => b.score - a.score);
  const move = moves.find((option) => applyActions(state, option.actions).ok);
  if (move) return move.actions;

  const demand = demandAhead(state, effort);
  const transmitter = me.hand.find((card) => card.type === 'transmitter');
  const take = transmitter && bestGain(state, demand);
  if (transmitter && take) return [{ type: 'playTransmitter', cardId: transmitter.id, take }];

  const [purchase] = first(purchases(state, demand, left), 1);
  if (purchase) return [purchase];

  return [{ type: 'endTurn', discard: me.hand.filter((card) => !worthKeeping(card, demand)).map((card) => card.id) }];
};

// Easy bots vary their choices without touching the game's random state, so games still replay identically.
const noise = (state: GameState, salt: number): number => {
  const me = state.players[state.turn.player]!;
  const mixed = Math.imul(salt + me.hand.length * 31 + me.played.length * 7 + me.discard.length * 3 + state.box.length, 2654435761);
  return nextRandom((state.rng ^ mixed) >>> 0).value;
};

// Moves one card at a time, sometimes settles for its second-best idea, buys loosely and never thins or keeps cards.
const easyStep = (state: GameState): Action[] => {
  const { turn } = state;
  const me = state.players[turn.player]!;
  if (turn.pending) return [{ type: 'removeFromHand', cardIds: [] }];

  const draw = drawingCard(state, me);
  if (draw) return [{ type: 'playAction', cardId: draw.id }];

  const effort = effortToFinish(state);
  const left = effortLeft(state, effort);
  const moves = moveOptions(state, effort, appetiteFor(left), false)
    .filter((option) => option.score > MIN_MOVE_SCORE)
    .sort((a, b) => b.score - a.score);
  const choices = first(
    moves.filter((option) => applyActions(state, option.actions).ok),
    2,
  );
  if (choices.length > 0) return choices[choices.length > 1 && noise(state, 1) < EASY_SLIP ? 1 : 0]!.actions;

  const demand = demandAhead(state, effort);
  const transmitter = me.hand.find((card) => card.type === 'transmitter');
  const take = transmitter && bestGain(state, demand);
  if (transmitter && take) return [{ type: 'playTransmitter', cardId: transmitter.id, take }];

  const buys = first(purchases(state, demand, left), EASY_CHOICES);
  if (buys.length > 0) return [buys[Math.floor(noise(state, 2) * buys.length)]!];

  return [{ type: 'endTurn', discard: me.hand.map((card) => card.id) }];
};

const pieceEffort = (state: GameState, effort: Effort): number =>
  state.pieces.reduce(
    (sum, piece) => sum + (piece.owner !== state.turn.player ? 0 : piece.at === 'eldorado' ? -ARRIVAL_BONUS : (effort.get(piece.at) ?? 99)),
    0,
  );

// What a whole turn earned: effort covered, starting cards thinned out and blockades taken. Purchases are left to
// the normal bot's end-of-turn buying with whatever is left, which tournaments showed beats weighing them in here.
const turnValue = (before: GameState, after: GameState): number => {
  const player = before.turn.player;
  const progress = pieceEffort(before, effortToFinish(before)) - pieceEffort(after, effortToFinish(after));
  const thinned = after.box.filter((card) => !before.box.some((old) => old.id === card.id) && STARTERS.includes(card.type)).length;
  const blockades = after.players[player]!.blockades.length - before.players[player]!.blockades.length;
  return progress + thinned * THINNING_BONUS + blockades * BLOCKADE_VALUE;
};

// Plays the rest of the turn the normal way, stopping before anything that would reveal unknown cards.
const finishTurn = (state: GameState, opening: Action[]): GameState | null => {
  if (opening.some((action) => action.type === 'endTurn')) return state;
  const opened = applyActions(state, opening);
  if (!opened.ok) return null;
  let current = opened.state;
  for (let step = 0; step < SIMULATED_STEPS; step++) {
    if (current.turn.player !== state.turn.player || current.turn.pending || current.status.kind === 'over') break;
    const next = normalStep(current);
    if (next.some((action) => action.type === 'endTurn' || action.type === 'playAction')) break;
    const result = applyActions(current, next);
    if (!result.ok) break;
    current = result.state;
  }
  return current;
};

// Looks one turn ahead: tries the best few openings, finishes each turn as the normal bot would, and keeps the
// opening whose whole turn is worth the most.
const strongStep = (state: GameState): Action[] => {
  const baseline = normalStep(state);
  const me = state.players[state.turn.player]!;
  if (state.turn.pending || baseline.some((action) => action.type === 'playAction' || action.type === 'removeFromHand')) {
    return baseline;
  }
  const effort = effortToFinish(state);
  const left = effortLeft(state, effort);
  const demand = demandAhead(state, effort);
  const moves = moveOptions(state, effort, appetiteFor(left))
    .filter((option) => option.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, LOOKAHEAD_MOVES)
    .map((option) => option.actions);
  const buys = first(purchases(state, demand, left), LOOKAHEAD_BUYS).map((action) => [action]);
  const stop: Action[] = [{ type: 'endTurn', discard: me.hand.filter((card) => !worthKeeping(card, demand)).map((card) => card.id) }];

  const seen = new Set<string>();
  let best = baseline;
  let bestValue = -Infinity;
  for (const opening of [baseline, ...moves, ...buys, stop]) {
    const key = JSON.stringify(opening);
    if (seen.has(key)) continue;
    seen.add(key);
    const end = finishTurn(state, opening);
    if (!end) continue;
    const value = turnValue(state, end);
    if (value > bestValue + 1e-6) {
      best = opening;
      bestValue = value;
    }
  }
  return best;
};
