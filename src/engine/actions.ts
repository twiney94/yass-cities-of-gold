import type { BlockadeId } from './board';
import type { CardType, Suit } from './cards';
import type { HexKey } from './hex';
import type { Card, CardId, PieceId } from './state';

export type Target = { kind: 'space'; hex: HexKey } | { kind: 'blockade'; id: BlockadeId };

export type Action =
  | { type: 'playForMovement'; cardId: CardId; pieceId: PieceId; suit?: Suit }
  | { type: 'step'; target: Target }
  | { type: 'payCards'; pieceId: PieceId; target: Target; cardIds: CardId[] }
  | { type: 'playNative'; cardId: CardId; pieceId: PieceId; target: Target }
  | { type: 'playTransmitter'; cardId: CardId; take: CardType }
  | { type: 'playAction'; cardId: CardId }
  | { type: 'removeFromHand'; cardIds: CardId[] }
  | { type: 'buy'; cardType: CardType; cardIds: CardId[] }
  | { type: 'endTurn'; discard: CardId[] };

export type GameEvent =
  | { type: 'cardsDrawn'; player: number; cards: Card[] }
  | { type: 'deckShuffled'; player: number }
  | { type: 'cardPlayed'; player: number; card: Card }
  | { type: 'cardsRemoved'; player: number; cards: Card[] }
  | { type: 'pieceMoved'; pieceId: PieceId; from: HexKey; to: HexKey }
  | { type: 'pieceArrived'; pieceId: PieceId }
  | { type: 'blockadeBroken'; player: number; blockadeId: BlockadeId }
  | { type: 'cardGained'; player: number; card: Card; via: 'purchase' | 'transmitter' }
  | { type: 'marketPileMoved'; cardType: CardType; slot: number }
  | { type: 'finalRoundStarted'; player: number }
  | { type: 'turnStarted'; player: number }
  | { type: 'gameOver'; winner: number };
