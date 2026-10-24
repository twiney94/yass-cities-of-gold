import type { Action, GameEvent, Target } from './actions';
import { type Blockade, type Space, type Terrain, blockadeBetween, touchesBlockade } from './board';
import { type ActionEffect, CARDS, type CardType, type Suit, coinPower, coinValue } from './cards';
import { type HexKey, hexDistance, hexKey } from './hex';
import { shuffle } from './rng';
import type { Card, CardId, GameState, Piece, PieceId, PlayerState } from './state';

export const HAND_SIZE = 4;

export type ActionResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };

type Ctx = { state: GameState; events: GameEvent[]; player: PlayerState; playerIndex: number };
type ActionOf<T extends Action['type']> = Extract<Action, { type: T }>;
type PieceOnBoard = Piece & { at: HexKey };
type Destination = { kind: 'space'; space: Space } | { kind: 'blockade'; blockade: Blockade };

class RuleViolation extends Error {}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RuleViolation(message);
}

const DRAW_EFFECTS: Partial<Record<ActionEffect, { draw: number; remove: number }>> = {
  cartographer: { draw: 2, remove: 0 },
  compass: { draw: 3, remove: 0 },
  scientist: { draw: 1, remove: 1 },
  travelLog: { draw: 2, remove: 2 },
};

export const applyAction = (state: GameState, action: Action): ActionResult => {
  const draft = cloneState(state);
  const playerIndex = draft.turn.player;
  const ctx: Ctx = { state: draft, events: [], playerIndex, player: draft.players[playerIndex]! };
  try {
    check(draft.status.kind !== 'over', 'The game is over');
    check(!draft.turn.pending || action.type === 'removeFromHand', 'Choose which cards to remove first');
    handle(ctx, action);
  } catch (error) {
    if (error instanceof RuleViolation) return { ok: false, error: error.message };
    throw error;
  }
  return { ok: true, state: draft, events: ctx.events };
};

export const applyActions = (state: GameState, actions: readonly Action[]): ActionResult => {
  let current = state;
  const events: GameEvent[] = [];
  for (const action of actions) {
    const result = applyAction(current, action);
    if (!result.ok) return result;
    current = result.state;
    events.push(...result.events);
  }
  return { ok: true, state: current, events };
};

const handle = (ctx: Ctx, action: Action): void => {
  switch (action.type) {
    case 'playForMovement':
      return playForMovement(ctx, action);
    case 'step':
      return step(ctx, action);
    case 'payCards':
      return payCards(ctx, action);
    case 'playNative':
      return playNative(ctx, action);
    case 'playTransmitter':
      return playTransmitter(ctx, action);
    case 'playAction':
      return playAction(ctx, action);
    case 'removeFromHand':
      return removeFromHand(ctx, action);
    case 'buy':
      return buy(ctx, action);
    case 'endTurn':
      return endTurn(ctx, action);
  }
};

const playForMovement = (ctx: Ctx, { cardId, pieceId, suit }: ActionOf<'playForMovement'>) => {
  check(ctx.state.turn.stage === 'moving', 'You cannot move after buying');
  const piece = ownPieceOnBoard(ctx, pieceId);
  const card = takeFromHand(ctx.player, cardId);
  const face = CARDS[card.type].face;
  check(face.kind !== 'action', 'Action cards are not played for movement');
  let chosen: Suit | undefined = suit;
  if (face.kind === 'expedition') {
    check(suit === undefined || suit === face.suit, `This card only gives ${face.suit}`);
    chosen = face.suit;
  }
  check(chosen, 'Choose a symbol for this joker');
  ctx.state.turn.movement = { card, pieceId: piece.id, suit: chosen, remaining: face.power };
  playCard(ctx, card, true);
};

const step = (ctx: Ctx, { target }: ActionOf<'step'>) => {
  const movement = ctx.state.turn.movement;
  check(movement, 'Play a card for movement first');
  const piece = ownPieceOnBoard(ctx, movement.pieceId);
  const destination = resolveTarget(ctx, piece, target);
  const requirement = requirementOf(destination);
  assertEnterable(requirement);
  check(requirement.kind === 'landscape', 'This space is entered by playing cards, not movement power');
  check(requirement.suit === movement.suit, `This space needs ${requirement.suit}`);
  check(requirement.power <= movement.remaining, 'Not enough power left on this card');
  movement.remaining -= requirement.power;
  reach(ctx, piece, destination);
};

const payCards = (ctx: Ctx, { pieceId, target, cardIds }: ActionOf<'payCards'>) => {
  check(ctx.state.turn.stage === 'moving', 'You cannot move after buying');
  ctx.state.turn.movement = null;
  const piece = ownPieceOnBoard(ctx, pieceId);
  const destination = resolveTarget(ctx, piece, target);
  const requirement = requirementOf(destination);
  assertEnterable(requirement);
  check(requirement.kind === 'rubble' || requirement.kind === 'basecamp', 'This space is entered with movement power');
  check(cardIds.length === requirement.cards, `Play exactly ${requirement.cards} card(s) for this space`);
  const cards = takeCardsFromHand(ctx.player, cardIds);
  if (requirement.kind === 'basecamp') {
    for (const card of cards) ctx.events.push({ type: 'cardPlayed', player: ctx.playerIndex, card });
    removeFromGame(ctx, cards);
  } else {
    for (const card of cards) playCard(ctx, card, false);
  }
  reach(ctx, piece, destination);
};

const playNative = (ctx: Ctx, { cardId, pieceId, target }: ActionOf<'playNative'>) => {
  check(ctx.state.turn.stage === 'moving', 'You cannot move after buying');
  const card = takeFromHand(ctx.player, cardId);
  check(effectOf(card) === 'native', 'That card is not a Local Guide');
  ctx.state.turn.movement = null;
  const piece = ownPieceOnBoard(ctx, pieceId);
  const destination = resolveTarget(ctx, piece, target);
  assertEnterable(requirementOf(destination));
  playCard(ctx, card, true);
  reach(ctx, piece, destination);
};

const playTransmitter = (ctx: Ctx, { cardId, take }: ActionOf<'playTransmitter'>) => {
  const card = takeFromHand(ctx.player, cardId);
  check(effectOf(card) === 'transmitter', 'That card is not a Telegraph');
  playCard(ctx, card, true);
  gainFromMarket(ctx, take, 'transmitter');
};

const playAction = (ctx: Ctx, { cardId }: ActionOf<'playAction'>) => {
  const card = takeFromHand(ctx.player, cardId);
  const effect = effectOf(card);
  const draws = effect && DRAW_EFFECTS[effect];
  check(draws, 'That card is not played this way');
  playCard(ctx, card, true);
  drawCards(ctx.state, ctx.events, ctx.playerIndex, draws.draw);
  if (draws.remove > 0) ctx.state.turn.pending = { kind: 'removeFromHand', max: draws.remove };
};

const removeFromHand = (ctx: Ctx, { cardIds }: ActionOf<'removeFromHand'>) => {
  const pending = ctx.state.turn.pending;
  check(pending, 'There is nothing to remove right now');
  check(cardIds.length <= pending.max, `Remove at most ${pending.max} card(s)`);
  const cards = takeCardsFromHand(ctx.player, cardIds);
  if (cards.length > 0) removeFromGame(ctx, cards);
  ctx.state.turn.pending = null;
};

const buy = (ctx: Ctx, { cardType, cardIds }: ActionOf<'buy'>) => {
  check(ctx.state.turn.stage === 'moving', 'You can only buy one card per turn');
  const { supply, name } = CARDS[cardType];
  check(supply.from !== 'starterDeck', 'Starting cards cannot be bought');
  const cards = takeCardsFromHand(ctx.player, cardIds);
  const spentInFull = itemsSpentInFull(cards, supply.cost);
  check(spentInFull, `${name} costs ${supply.cost} coins`);
  ctx.state.turn.movement = null;
  ctx.state.turn.stage = 'bought';
  for (const card of cards) playCard(ctx, card, spentInFull.has(card.id));
  gainFromMarket(ctx, cardType, 'purchase');
};

// A single-use coin card may be spent as ½ coin and kept; it only counts (and leaves the game) at full
// value when the purchase needs it. Returns null when even full value is not enough.
const itemsSpentInFull = (cards: Card[], cost: number): Set<CardId> | null => {
  const items = cards
    .filter((card) => CARDS[card.type].singleUse && coinPower(card.type) !== null)
    .sort((a, b) => coinPower(b.type)! - coinPower(a.type)!);
  let halfCoins = cards.reduce((sum, card) => sum + (items.includes(card) ? 1 : coinValue(card.type) * 2), 0);
  const spent = new Set<CardId>();
  for (const item of items) {
    if (halfCoins >= cost * 2) break;
    halfCoins += coinPower(item.type)! * 2 - 1;
    spent.add(item.id);
  }
  return halfCoins >= cost * 2 ? spent : null;
};

const endTurn = (ctx: Ctx, { discard }: ActionOf<'endTurn'>) => {
  const { state, player, playerIndex } = ctx;
  const dropped = takeCardsFromHand(player, discard);
  player.discard.push(...player.played, ...dropped);
  player.played = [];
  drawCards(state, ctx.events, playerIndex, HAND_SIZE - player.hand.length);
  if (state.status.kind === 'finalRound' && playerIndex === state.players.length - 1) {
    const winner = rankFinishers(state)[0]!;
    state.status = { kind: 'over', winner };
    ctx.events.push({ type: 'gameOver', winner });
    return;
  }
  const next = (playerIndex + 1) % state.players.length;
  state.turn = { player: next, stage: 'moving', movement: null, pending: null };
  ctx.events.push({ type: 'turnStarted', player: next });
};

export const drawCards = (state: GameState, events: GameEvent[], playerIndex: number, count: number): void => {
  const player = state.players[playerIndex]!;
  let batch: Card[] = [];
  const flush = () => {
    if (batch.length > 0) events.push({ type: 'cardsDrawn', player: playerIndex, cards: batch });
    batch = [];
  };
  for (let i = 0; i < count; i++) {
    if (player.drawPile.length === 0) {
      if (player.discard.length === 0) break;
      flush();
      const shuffled = shuffle(player.discard, state.rng);
      state.rng = shuffled.state;
      player.drawPile = shuffled.items;
      player.discard = [];
      events.push({ type: 'deckShuffled', player: playerIndex });
    }
    const card = player.drawPile.pop()!;
    player.hand.push(card);
    batch.push(card);
  }
  flush();
};

export const rankFinishers = (state: GameState): number[] => {
  const highest = (player: PlayerState) => Math.max(0, ...player.blockades);
  return state.players
    .flatMap((player, index) => (player.finishedOrder === null ? [] : [{ index, player, order: player.finishedOrder }]))
    .sort(
      (a, b) =>
        b.player.blockades.length - a.player.blockades.length ||
        highest(b.player) - highest(a.player) ||
        a.order - b.order,
    )
    .map(({ index }) => index);
};

const resolveTarget = (ctx: Ctx, piece: PieceOnBoard, target: Target): Destination => {
  const { board, blockades, pieces } = ctx.state;
  if (target.kind === 'blockade') {
    const blockade = board.blockades.find((b) => b.id === target.id);
    check(blockade && blockades.includes(blockade.id), 'That blockade is not on the board');
    check(touchesBlockade(board, piece.at, blockade), 'Your piece is not next to that blockade');
    return { kind: 'blockade', blockade };
  }
  const from = board.spaces[piece.at];
  const space = board.spaces[target.hex];
  check(from && space && hexDistance(from.hex, space.hex) === 1, 'You can only move to an adjacent space');
  check(!blockadeBetween(board, blockades, from.tile, space.tile), 'A blockade is in the way');
  check(!pieces.some((p) => p.at === target.hex), 'That space is occupied');
  return { kind: 'space', space };
};

const requirementOf = (destination: Destination): Terrain =>
  destination.kind === 'space' ? destination.space.terrain : destination.blockade.requirement;

const assertEnterable = (terrain: Terrain) => {
  check(terrain.kind !== 'mountain', 'Mountains can never be entered');
  check(terrain.kind !== 'start', 'Starting spaces cannot be entered');
};

const reach = (ctx: Ctx, piece: PieceOnBoard, destination: Destination) => {
  if (destination.kind === 'blockade') {
    const { id } = destination.blockade;
    ctx.state.blockades = ctx.state.blockades.filter((remaining) => remaining !== id);
    ctx.player.blockades.push(id);
    ctx.events.push({ type: 'blockadeBroken', player: ctx.playerIndex, blockadeId: id });
    return;
  }
  const from = piece.at;
  const to = hexKey(destination.space.hex);
  piece.at = to;
  ctx.events.push({ type: 'pieceMoved', pieceId: piece.id, from, to });
  if (destination.space.finish) reachEldorado(ctx, piece);
};

const reachEldorado = (ctx: Ctx, piece: Piece) => {
  const { state } = ctx;
  piece.at = 'eldorado';
  ctx.events.push({ type: 'pieceArrived', pieceId: piece.id });
  if (state.turn.movement?.pieceId === piece.id) state.turn.movement = null;
  if (state.pieces.some((p) => p.owner === piece.owner && p.at !== 'eldorado')) return;
  ctx.player.finishedOrder = state.finishers++;
  if (state.status.kind === 'playing') {
    state.status = { kind: 'finalRound' };
    ctx.events.push({ type: 'finalRoundStarted', player: piece.owner });
  }
};

const gainFromMarket = (ctx: Ctx, type: CardType, via: 'purchase' | 'transmitter') => {
  const { market } = ctx.state;
  const left = market.remaining[type] ?? 0;
  check(left > 0, `No ${CARDS[type].name} cards are left`);
  const slot = market.slots.indexOf(type);
  const vacancy = market.slots.indexOf(null);
  check(slot >= 0 || vacancy >= 0 || via === 'transmitter', 'Reserve cards unlock once a market pile sells out');
  market.remaining[type] = left - 1;
  if (slot >= 0 && left === 1) market.slots[slot] = null;
  if (slot < 0 && vacancy >= 0 && left > 1) {
    market.slots[vacancy] = type;
    ctx.events.push({ type: 'marketPileMoved', cardType: type, slot: vacancy });
  }
  const card: Card = { id: ctx.state.nextCardId++, type };
  ctx.player.discard.push(card);
  ctx.events.push({ type: 'cardGained', player: ctx.playerIndex, card, via });
};

const ownPieceOnBoard = (ctx: Ctx, pieceId: PieceId): PieceOnBoard => {
  const piece = ctx.state.pieces.find((p) => p.id === pieceId);
  check(piece && piece.owner === ctx.playerIndex, 'That is not your piece');
  check(piece.at !== 'eldorado', 'That piece has already reached the City of Gold');
  return piece as PieceOnBoard;
};

const takeFromHand = (player: PlayerState, cardId: CardId): Card => {
  const index = player.hand.findIndex((card) => card.id === cardId);
  check(index >= 0, 'That card is not in your hand');
  return player.hand.splice(index, 1)[0]!;
};

const takeCardsFromHand = (player: PlayerState, cardIds: CardId[]): Card[] => {
  check(new Set(cardIds).size === cardIds.length, 'The same card was chosen twice');
  return cardIds.map((id) => takeFromHand(player, id));
};

const playCard = (ctx: Ctx, card: Card, usedItsFunction: boolean) => {
  ctx.events.push({ type: 'cardPlayed', player: ctx.playerIndex, card });
  if (usedItsFunction && CARDS[card.type].singleUse) removeFromGame(ctx, [card]);
  else ctx.player.played.push(card);
};

const removeFromGame = (ctx: Ctx, cards: Card[]) => {
  ctx.state.box.push(...cards);
  ctx.player.removed.push(...cards);
  ctx.events.push({ type: 'cardsRemoved', player: ctx.playerIndex, cards });
};

const effectOf = (card: Card): ActionEffect | null => {
  const face = CARDS[card.type].face;
  return face.kind === 'action' ? face.effect : null;
};

const cloneState = (state: GameState): GameState => ({
  ...state,
  players: state.players.map((p) => ({
    ...p,
    drawPile: [...p.drawPile],
    hand: [...p.hand],
    played: [...p.played],
    discard: [...p.discard],
    removed: [...p.removed],
    blockades: [...p.blockades],
  })),
  pieces: state.pieces.map((p) => ({ ...p })),
  market: { slots: [...state.market.slots], remaining: { ...state.market.remaining } },
  box: [...state.box],
  blockades: [...state.blockades],
  turn: {
    ...state.turn,
    movement: state.turn.movement && { ...state.turn.movement },
    pending: state.turn.pending && { ...state.turn.pending },
  },
  status: { ...state.status },
});
