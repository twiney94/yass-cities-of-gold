import { useEffect } from 'react';
import type { Action } from '../engine/actions';
import { rankFinishers } from '../engine/rules';
import type { GameState } from '../engine/state';
import { cx } from './cx';
import type { Intents } from './intents';
import { PLAYERS, SUIT_ICON, cardName } from './labels';
import type { LogLine, Seat } from './store';

const cardCount = (game: GameState, player: number) => {
  const p = game.players[player]!;
  return p.drawPile.length + p.hand.length + p.played.length + p.discard.length;
};

export function PlayersBar({ game, seats, onQuit }: { game: GameState; seats: Seat[]; onQuit: () => void }) {
  return (
    <header className="players">
      <span className="players__title">El Dorado</span>
      {game.players.map((player, i) => (
        <div key={PLAYERS[i]!.name} className={cx('player', i === game.turn.player && 'is-current')}>
          <span className="dot" style={{ background: PLAYERS[i]!.color }} />
          <strong>{PLAYERS[i]!.name}</strong>
          {seats[i] === 'bot' && <span className="tag">bot</span>}
          <span className="player__stat">{cardCount(game, i)} cards</span>
          {player.blockades.length > 0 && <span className="player__stat">blockades {player.blockades.join(', ')}</span>}
          {player.finishedOrder !== null && <span className="tag tag--gold">in El Dorado</span>}
        </div>
      ))}
      {game.status.kind === 'finalRound' && <span className="tag tag--gold">Final round</span>}
      <button type="button" className="btn btn--ghost" onClick={onQuit}>
        Quit
      </button>
    </header>
  );
}

type ActionBarProps = {
  game: GameState;
  intents: Intents;
  selectedCount: number;
  waiting: string | null;
  onPerform: (actions: Action[]) => void;
};

export function ActionBar({ game, intents, selectedCount, waiting, onPerform }: ActionBarProps) {
  const locked = waiting !== null;
  const { turn } = game;
  const { play } = intents;
  const player = PLAYERS[turn.player]!;
  const ownPieces = game.pieces.filter((p) => p.owner === turn.player && p.at !== 'eldorado').length;
  const hint = (() => {
    if (waiting) return waiting;
    if (turn.pending) return `Choose up to ${turn.pending.max} card(s) in your hand to remove from the game.`;
    if (turn.movement && turn.movement.remaining > 0 && selectedCount === 0)
      return `${cardName(turn.movement.card.type)}: ${turn.movement.remaining} ${SUIT_ICON[turn.movement.suit]} left. Click a highlighted space to keep going.`;
    if (selectedCount === 0 && turn.stage === 'bought') return 'Card bought. You can still play action cards, or end your turn.';
    if (selectedCount === 0) return 'Select cards: one or more to move, several to pay for rubble or a base camp, or coins to buy.';
    if (intents.board.size + intents.market.size > 0 || intents.play) return 'Click a highlighted space, blockade or market card.';
    return 'Nothing to do with this selection.';
  })();
  return (
    <div className="actionbar">
      <span className="actionbar__turn">
        <span className="dot" style={{ background: player.color }} />
        {player.name}
      </span>
      <p className="actionbar__hint">
        {hint}
        {!locked && ownPieces > 1 && selectedCount === 0 && !turn.movement && !turn.pending && turn.stage === 'moving' && (
          <span className="muted"> Click a piece to choose which one moves.</span>
        )}
      </p>
      {!locked && play && (
        <button type="button" className="btn" onClick={() => onPerform([play])}>
          Play {cardName(game.players[turn.player]!.hand.find((card) => card.id === play.cardId)!.type)}
        </button>
      )}
      {!locked && turn.pending && (
        <button type="button" className="btn btn--primary" disabled={!intents.removal} onClick={() => intents.removal && onPerform([intents.removal])}>
          {selectedCount > 0 ? `Remove ${selectedCount} card(s)` : 'Keep them all'}
        </button>
      )}
      {!locked && intents.endTurn && (
        <button type="button" className="btn btn--primary" onClick={() => onPerform([intents.endTurn!])}>
          {selectedCount > 0 ? `End turn · discard ${selectedCount}` : 'End turn'}
        </button>
      )}
    </div>
  );
}

export function EventLog({ log }: { log: LogLine[] }) {
  return (
    <details className="log">
      <summary>Log · {log.at(-1)?.text}</summary>
      <ol>
        {[...log].reverse().map((line) => (
          <li key={line.id}>{line.text}</li>
        ))}
      </ol>
    </details>
  );
}

export function PassScreen({ player, onReveal }: { player: number; onReveal: () => void }) {
  const { name, color } = PLAYERS[player]!;
  return (
    <div className="overlay">
      <div className="overlay__panel">
        <span className="dot dot--big" style={{ background: color }} />
        <h2>{name}'s turn</h2>
        <p className="muted">Pass the device to {name}. Everyone else, look away from the hand.</p>
        <button type="button" className="btn btn--primary" onClick={onReveal}>
          Show my hand
        </button>
      </div>
    </div>
  );
}

export function GameOver({ game, onNewGame, onQuit }: { game: GameState; onNewGame: () => void; onQuit: () => void }) {
  const ranking = rankFinishers(game);
  const winner = PLAYERS[ranking[0]!]!;
  return (
    <div className="overlay">
      <div className="overlay__panel">
        <span className="dot dot--big" style={{ background: winner.color }} />
        <h2>{winner.name} reaches El Dorado first!</h2>
        <ol className="ranking">
          {ranking.map((index) => (
            <li key={index}>
              {PLAYERS[index]!.name} · {game.players[index]!.blockades.length} blockade(s)
            </li>
          ))}
        </ol>
        <div className="overlay__actions">
          <button type="button" className="btn btn--primary" onClick={onNewGame}>
            Play again
          </button>
          <button type="button" className="btn btn--ghost" onClick={onQuit}>
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2600);
    return () => window.clearTimeout(timer);
  }, [message, onDone]);
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
