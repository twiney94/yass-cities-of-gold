import type { Action, GameEvent } from '../actions';
import type { Board } from '../board';
import type { CardType } from '../cards';
import type { HexKey } from '../hex';
import { applyAction, applyActions } from '../rules';
import { createGame } from '../setup';
import type { Card, GameState, PieceId } from '../state';

export const newGame = (board: Board, playerCount: 2 | 3 | 4 = 2, seed = 1): GameState =>
  createGame({ board, playerCount, seed });

const mint = (state: GameState, types: CardType[]): Card[] => types.map((type) => ({ id: state.nextCardId++, type }));

export const setHand = (state: GameState, player: number, ...types: CardType[]): Card[] => {
  state.players[player]!.hand = mint(state, types);
  return state.players[player]!.hand;
};

export const setDrawPile = (state: GameState, player: number, ...typesInDrawOrder: CardType[]): Card[] => {
  const cards = mint(state, typesInDrawOrder);
  state.players[player]!.drawPile = [...cards].reverse();
  return cards;
};

export const setDiscard = (state: GameState, player: number, ...types: CardType[]): Card[] => {
  state.players[player]!.discard = mint(state, types);
  return state.players[player]!.discard;
};

export const placePiece = (state: GameState, pieceId: PieceId, at: HexKey): void => {
  state.pieces[pieceId]!.at = at;
};

export const addPiece = (state: GameState, owner: number, at: HexKey): PieceId => {
  const id = state.pieces.length;
  state.pieces.push({ id, owner, at });
  return id;
};

export const run = (state: GameState, ...actions: Action[]): { state: GameState; events: GameEvent[] } => {
  const result = applyActions(state, actions);
  if (!result.ok) throw new Error(`Rejected: ${result.error}`);
  return result;
};

export const rejection = (state: GameState, action: Action): string => {
  const result = applyAction(state, action);
  if (result.ok) throw new Error(`${action.type} was accepted`);
  return result.error;
};

export const ids = (cards: Card[]): number[] => cards.map((card) => card.id);
export const types = (cards: Card[]): CardType[] => cards.map((card) => card.type);
