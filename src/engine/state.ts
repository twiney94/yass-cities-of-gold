import type { BlockadeId, Board } from './board';
import type { CardType, Suit } from './cards';
import type { HexKey } from './hex';
import type { RngState } from './rng';

export type CardId = number;
export type Card = { readonly id: CardId; readonly type: CardType };

export type PieceId = number;
export type Piece = { id: PieceId; owner: number; at: HexKey | 'eldorado' };

export type PlayerState = {
  drawPile: Card[];
  hand: Card[];
  played: Card[];
  discard: Card[];
  blockades: BlockadeId[];
  finishedOrder: number | null;
};

export type Market = {
  slots: (CardType | null)[];
  remaining: Partial<Record<CardType, number>>;
};

export type ActiveMovement = { card: Card; pieceId: PieceId; suit: Suit; remaining: number };

export type PendingChoice = { kind: 'removeFromHand'; max: number };

export type Turn = {
  player: number;
  stage: 'moving' | 'bought';
  movement: ActiveMovement | null;
  pending: PendingChoice | null;
};

export type GameStatus = { kind: 'playing' } | { kind: 'finalRound' } | { kind: 'over'; winner: number };

// players[0] holds the starting player hat.
export type GameState = {
  board: Board;
  players: PlayerState[];
  pieces: Piece[];
  market: Market;
  box: Card[];
  blockades: BlockadeId[];
  turn: Turn;
  status: GameStatus;
  rng: RngState;
  nextCardId: CardId;
  finishers: number;
};
