import type { GameEvent } from '../engine/actions';
import { type ActionEffect, CARDS, type CardType, type Suit } from '../engine/cards';
import type { GameState } from '../engine/state';

export const PLAYERS = [
  { name: 'Red', color: '#d9483b' },
  { name: 'Blue', color: '#2f7fd8' },
  { name: 'White', color: '#f2efe6' },
  { name: 'Yellow', color: '#f0c419' },
] as const;

export const SUIT_ICON: Record<Suit, string> = { machete: '🗡️', paddle: '🛶', coin: '🪙' };

export const EFFECT_TEXT: Record<ActionEffect, string> = {
  transmitter: 'Take any card for free',
  cartographer: 'Draw 2 cards',
  scientist: 'Draw 1, then may remove 1',
  travelLog: 'Draw 2, then remove up to 2',
  compass: 'Draw 3 cards',
  native: 'Move 1 space, ignoring its cost',
};

export const CARD_ART: Record<CardType, string> = {
  explorer: '🥾',
  traveler: '🎒',
  sailor: '⛵',
  scout: '🔭',
  trailblazer: '🪓',
  pioneer: '🏕️',
  giantMachete: '🗡️',
  captain: '⚓',
  photographer: '📷',
  journalist: '📰',
  treasureChest: '💰',
  millionaire: '💎',
  jackOfAllTrades: '🃏',
  adventurer: '🧗',
  propPlane: '🛩️',
  transmitter: '📻',
  cartographer: '🗺️',
  scientist: '🔬',
  travelLog: '📔',
  compass: '🧭',
  native: '👣',
};

export const cardName = (type: CardType) => CARDS[type].name;
const playerName = (index: number) => PLAYERS[index]!.name;
const names = (types: CardType[]) => types.map(cardName).join(', ');

export const describeEvents = (events: GameEvent[], game: GameState): string[] => {
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
    const line = describe(event, game);
    if (line) lines.push(line);
  }
  flushMoves();
  return lines;
};

const describe = (event: Exclude<GameEvent, { type: 'pieceMoved' }>, game: GameState): string | null => {
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
        : `${playerName(event.player)} took ${cardName(event.card.type)} with the Transmitter`;
    case 'marketPileMoved':
      return `${cardName(event.cardType)} joins the market`;
    case 'pieceArrived':
      return `${playerName(game.pieces[event.pieceId]!.owner)} reached El Dorado!`;
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
