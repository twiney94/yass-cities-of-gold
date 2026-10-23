import type { BotLevel } from '../bot/bot';
import type { GameEvent } from '../engine/actions';
import { type ActionEffect, CARDS, type CardType } from '../engine/cards';
import type { GameState } from '../engine/state';

export type PlayerLook = { name: string; hex: string };

export const PLAYER_COLORS = {
  red: { name: 'Red', hex: '#d9483b' },
  blue: { name: 'Blue', hex: '#2f7fd8' },
  white: { name: 'White', hex: '#f2efe6' },
  yellow: { name: 'Yellow', hex: '#f0c419' },
  purple: { name: 'Purple', hex: '#9a63d8' },
  orange: { name: 'Orange', hex: '#ef8a2b' },
  pink: { name: 'Pink', hex: '#ec6fa9' },
  black: { name: 'Black', hex: '#303136' },
} as const satisfies Record<string, PlayerLook>;

export type PlayerColor = keyof typeof PLAYER_COLORS;

export const BOT_LEVEL_LABEL: Record<BotLevel, string> = { easy: 'Easy', normal: 'Normal', strong: 'Strong' };

export const EFFECT_TEXT: Record<ActionEffect, string> = {
  transmitter: 'Take any card for free',
  cartographer: 'Draw 2 cards',
  scientist: 'Draw 1, then may remove 1',
  travelLog: 'Draw 2, then remove up to 2',
  compass: 'Draw 3 cards',
  native: 'Move 1 space, ignoring its cost',
};

export const cardName = (type: CardType) => CARDS[type].name;
const names = (types: CardType[]) => types.map(cardName).join(', ');

type NameOf = (player: number) => string;

export const describeEvents = (events: GameEvent[], game: GameState, players: readonly PlayerLook[]): string[] => {
  const playerName: NameOf = (index) => players[index]!.name;
  const lines: string[] = [];
  let moved = { player: -1, spaces: 0 };
  const flushMoves = () => {
    if (moved.spaces > 0) lines.push(`${playerName(moved.player)} moved ${moved.spaces} space${moved.spaces > 1 ? 's' : ''}`);
    moved = { player: -1, spaces: 0 };
  };
  for (const event of events) {
    if (event.type === 'pieceMoved') {
      moved = { player: game.pieces[event.pieceId]!.owner, spaces: moved.spaces + 1 };
      continue;
    }
    flushMoves();
    const line = describe(event, game, playerName);
    if (line) lines.push(line);
  }
  flushMoves();
  return lines;
};

const describe = (event: Exclude<GameEvent, { type: 'pieceMoved' }>, game: GameState, playerName: NameOf): string | null => {
  switch (event.type) {
    case 'cardPlayed':
      return `${playerName(event.player)} played ${cardName(event.card.type)}`;
    case 'cardsRemoved':
      return `${playerName(event.player)} removed ${names(event.cards.map((c) => c.type))} from the game`;
    case 'cardsDrawn':
      return `${playerName(event.player)} drew ${event.cards.length} card${event.cards.length > 1 ? 's' : ''}`;
    case 'deckShuffled':
      return `${playerName(event.player)} shuffled their discard pile`;
    case 'blockadeBroken':
      return `${playerName(event.player)} broke blockade ${event.blockadeId}`;
    case 'cardGained':
      return event.via === 'purchase'
        ? `${playerName(event.player)} bought ${cardName(event.card.type)}`
        : `${playerName(event.player)} took ${cardName(event.card.type)} with the ${cardName('transmitter')}`;
    case 'marketPileMoved':
      return `${cardName(event.cardType)} joins the market`;
    case 'pieceArrived':
      return `${playerName(game.pieces[event.pieceId]!.owner)} reached the City of Gold!`;
    case 'finalRoundStarted':
      return event.player === game.players.length - 1
        ? 'Last player of the round arrived: the game ends after this turn'
        : `Final round: players after ${playerName(event.player)} get one last turn`;
    case 'turnStarted':
      return `${playerName(event.player)}'s turn`;
    case 'gameOver':
      return `${playerName(event.winner)} wins!`;
  }
};
