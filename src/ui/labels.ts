import type { GameEvent } from '../engine/actions';
import type { BlockadeId } from '../engine/board';
import type { CardType } from '../engine/cards';
import type { GameState } from '../engine/state';
import type { Messages } from './i18n/en';
import type { Intents } from './intents';

export type PlayerLook = { name: string; hex: string };

export const PLAYER_COLORS = {
  red: '#d9483b',
  blue: '#2f7fd8',
  white: '#f2efe6',
  yellow: '#f0c419',
  purple: '#9a63d8',
  orange: '#ef8a2b',
  pink: '#ec6fa9',
  black: '#303136',
} as const;

export type PlayerColor = keyof typeof PLAYER_COLORS;

export const playerLook = (color: PlayerColor, m: Messages): PlayerLook => ({ name: m.colors[color], hex: PLAYER_COLORS[color] });

// Colours stay unique: whoever already had the chosen colour moves on to the next one nobody uses.
export const recolor = <T extends { color: PlayerColor }>(seats: T[], index: number, color: PlayerColor): T[] => {
  const next = seats.map((seat, i) => (i === index ? { ...seat, color } : seat));
  const clash = next.findIndex((seat, i) => i !== index && seat.color === color);
  if (clash === -1) return next;
  const order = Object.keys(PLAYER_COLORS) as PlayerColor[];
  const from = order.indexOf(color);
  const free = [...order.slice(from + 1), ...order.slice(0, from)].find((other) => next.every((seat) => seat.color !== other))!;
  next[clash] = { ...next[clash], color: free };
  return next;
};

export const turnHint = (m: Messages, game: GameState, intents: Intents, selectedCount: number, waiting: string | null) => {
  const { turn } = game;
  if (waiting) return waiting;
  if (turn.pending) return m.hints.pending(turn.pending.max);
  if (turn.movement && turn.movement.remaining > 0 && selectedCount === 0)
    return m.hints.leftover(m.cards[turn.movement.card.type], turn.movement.remaining, m.suits[turn.movement.suit]);
  if (selectedCount === 0 && turn.stage === 'bought') return m.hints.bought;
  if (selectedCount === 0) return m.hints.select;
  if (intents.board.size + intents.market.size > 0 || intents.play) return m.hints.targets;
  return m.hints.nothing;
};

export type LogEntry =
  | { kind: 'newGame' }
  | { kind: 'moved'; player: number; spaces: number }
  | { kind: 'played'; player: number; card: CardType }
  | { kind: 'removed'; player: number; cards: CardType[] }
  | { kind: 'drew'; player: number; count: number }
  | { kind: 'shuffled'; player: number }
  | { kind: 'broke'; player: number; blockade: BlockadeId }
  | { kind: 'gained'; player: number; card: CardType; via: 'purchase' | 'transmitter' }
  | { kind: 'pileMoved'; card: CardType }
  | { kind: 'arrived'; player: number }
  | { kind: 'finalRound'; player: number; last: boolean }
  | { kind: 'turn'; player: number }
  | { kind: 'won'; player: number };

export const describeEvents = (events: GameEvent[], game: GameState): LogEntry[] => {
  const entries: LogEntry[] = [];
  let moved = { player: -1, spaces: 0 };
  const flushMoves = () => {
    if (moved.spaces > 0) entries.push({ kind: 'moved', ...moved });
    moved = { player: -1, spaces: 0 };
  };
  for (const event of events) {
    if (event.type === 'pieceMoved') {
      moved = { player: game.pieces[event.pieceId]!.owner, spaces: moved.spaces + 1 };
      continue;
    }
    flushMoves();
    entries.push(describe(event, game));
  }
  flushMoves();
  return entries;
};

const describe = (event: Exclude<GameEvent, { type: 'pieceMoved' }>, game: GameState): LogEntry => {
  switch (event.type) {
    case 'cardPlayed':
      return { kind: 'played', player: event.player, card: event.card.type };
    case 'cardsRemoved':
      return { kind: 'removed', player: event.player, cards: event.cards.map((card) => card.type) };
    case 'cardsDrawn':
      return { kind: 'drew', player: event.player, count: event.cards.length };
    case 'deckShuffled':
      return { kind: 'shuffled', player: event.player };
    case 'blockadeBroken':
      return { kind: 'broke', player: event.player, blockade: event.blockadeId };
    case 'cardGained':
      return { kind: 'gained', player: event.player, card: event.card.type, via: event.via };
    case 'marketPileMoved':
      return { kind: 'pileMoved', card: event.cardType };
    case 'pieceArrived':
      return { kind: 'arrived', player: game.pieces[event.pieceId]!.owner };
    case 'finalRoundStarted':
      return { kind: 'finalRound', player: event.player, last: event.player === game.players.length - 1 };
    case 'turnStarted':
      return { kind: 'turn', player: event.player };
    case 'gameOver':
      return { kind: 'won', player: event.winner };
  }
};

export const logText = (entry: LogEntry, m: Messages, players: readonly PlayerLook[], mapTitle: string): string => {
  const name = (player: number) => players[player]!.name;
  switch (entry.kind) {
    case 'newGame':
      return m.log.newGame(mapTitle);
    case 'moved':
      return m.log.moved(name(entry.player), entry.spaces);
    case 'played':
      return m.log.played(name(entry.player), m.cards[entry.card]);
    case 'removed':
      return m.log.removed(name(entry.player), entry.cards.map((card) => m.cards[card]).join(', '));
    case 'drew':
      return m.log.drew(name(entry.player), entry.count);
    case 'shuffled':
      return m.log.shuffled(name(entry.player));
    case 'broke':
      return m.log.broke(name(entry.player), entry.blockade);
    case 'gained':
      return entry.via === 'purchase'
        ? m.log.bought(name(entry.player), m.cards[entry.card])
        : m.log.took(name(entry.player), m.cards[entry.card], m.cards.transmitter);
    case 'pileMoved':
      return m.log.pileMoved(m.cards[entry.card]);
    case 'arrived':
      return m.log.arrived(name(entry.player));
    case 'finalRound':
      return entry.last ? m.log.lastArrived : m.log.finalRound(name(entry.player));
    case 'turn':
      return m.log.turn(name(entry.player));
    case 'won':
      return m.log.won(name(entry.player));
  }
};
