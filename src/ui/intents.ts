import type { Action, Target } from '../engine/actions';
import { ALL_CARDS, CARDS, type CardType, coinValue } from '../engine/cards';
import { type TargetKey, adjacentTargets, routePlans, targetKey } from '../engine/moves';
import { applyAction, applyActions } from '../engine/rules';
import type { Card, CardId, GameState, PieceId } from '../engine/state';

export type Selection = { cards: CardId[]; pieceId: PieceId | null };

export type Intents = {
  board: Map<TargetKey, Action[]>;
  market: Map<CardType, Action>;
  play: Extract<Action, { type: 'playAction' }> | null;
  removal: Action | null;
  endTurn: Action | null;
};

export const NO_INTENTS: Intents = { board: new Map(), market: new Map(), play: null, removal: null, endTurn: null };

const MARKET_TYPES = ALL_CARDS.filter((card) => card.supply.from !== 'starterDeck').map((card) => card.type);
const DRAW_EFFECTS = new Set(['cartographer', 'compass', 'scientist', 'travelLog']);

export const selectedCards = (game: GameState, selection: Selection): Card[] => {
  const hand = game.players[game.turn.player]!.hand;
  return selection.cards.flatMap((id) => hand.find((card) => card.id === id) ?? []);
};

export const activePiece = (game: GameState, selection: Selection): PieceId | null => {
  const mine = game.pieces.filter((p) => p.owner === game.turn.player && p.at !== 'eldorado');
  const moving = mine.find((p) => p.id === game.turn.movement?.pieceId);
  return mine.find((p) => p.id === selection.pieceId)?.id ?? moving?.id ?? mine[0]?.id ?? null;
};

const valid = (game: GameState, action: Action): Action | null => (applyAction(game, action).ok ? action : null);

// Everything the current selection lets the player do, each already checked against the rules.
export const computeIntents = (game: GameState, selection: Selection): Intents => {
  const intents: Intents = { board: new Map(), market: new Map(), play: null, removal: null, endTurn: null };
  if (game.status.kind === 'over') return intents;
  const { turn } = game;
  const cards = selectedCards(game, selection);
  const cardIds = cards.map((card) => card.id);

  if (turn.pending) {
    intents.removal = valid(game, { type: 'removeFromHand', cardIds });
    return intents;
  }
  intents.endTurn = valid(game, { type: 'endTurn', discard: cardIds });

  const offer = (target: Target, actions: Action[]) => {
    const key = targetKey(target);
    if (!intents.board.has(key) && applyActions(game, actions).ok) intents.board.set(key, actions);
  };
  const piece = activePiece(game, selection);

  if (piece !== null && turn.stage === 'moving') {
    const movement = turn.movement?.pieceId === piece ? turn.movement : null;
    const leftover = movement && { suit: movement.suit, remaining: movement.remaining };
    for (const plan of routePlans(game, piece, cards, leftover).values()) {
      offer(
        plan.target,
        plan.segments.flatMap((segment): Action[] => [
          ...(segment.card ? [{ type: 'playForMovement' as const, cardId: segment.card.id, pieceId: piece, suit: segment.suit }] : []),
          ...segment.path.map((target) => ({ type: 'step' as const, target })),
        ]),
      );
    }
  }

  const [only] = cards;
  if (only && cards.length === 1) {
    const face = CARDS[only.type].face;
    if (face.kind === 'action' && face.effect === 'native' && piece !== null) {
      for (const { target } of adjacentTargets(game, piece)) offer(target, [{ type: 'playNative', cardId: only.id, pieceId: piece, target }]);
    }
    const play = { type: 'playAction', cardId: only.id } as const;
    if (face.kind === 'action' && DRAW_EFFECTS.has(face.effect) && valid(game, play)) intents.play = play;
  }

  if (cards.length > 0 && piece !== null) {
    for (const { target, terrain } of adjacentTargets(game, piece)) {
      if ((terrain.kind === 'rubble' || terrain.kind === 'basecamp') && terrain.cards === cards.length) {
        offer(target, [{ type: 'payCards', pieceId: piece, target, cardIds }]);
      }
    }
  }

  if (cards.length > 0) {
    const transmitter = only && cards.length === 1 && only.type === 'transmitter' ? only : null;
    for (const type of MARKET_TYPES) {
      const action: Action = transmitter
        ? { type: 'playTransmitter', cardId: transmitter.id, take: type }
        : { type: 'buy', cardType: type, cardIds };
      if (valid(game, action)) intents.market.set(type, action);
    }
  }

  return intents;
};

export const coinsOf = (cards: Card[]): number => cards.reduce((sum, card) => sum + coinValue(card.type), 0);
