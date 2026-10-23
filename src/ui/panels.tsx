import { type CSSProperties, useEffect } from 'react';
import type { Action } from '../engine/actions';
import { rankFinishers } from '../engine/rules';
import type { Card, GameState } from '../engine/state';
import { CardView } from './CardView';
import { LanguageSwitch } from './LanguageSwitch';
import { Logo } from './Logo';
import { cx } from './cx';
import { useMessages } from './i18n';
import type { Intents } from './intents';
import type { PlayerLook } from './labels';
import type { Seat } from './store';

const cardCount = (game: GameState, player: number) => {
  const p = game.players[player]!;
  return p.drawPile.length + p.hand.length + p.played.length + p.discard.length;
};

const seatStyle = (player: PlayerLook) => ({ '--seat': player.hex }) as CSSProperties;

export function HudHead({ mapTitle, onQuit }: { mapTitle: string; onQuit: () => void }) {
  const m = useMessages();
  return (
    <header className="hud__block hud__head">
      <Logo small />
      <span className="hud__controls">
        <LanguageSwitch />
        <button type="button" className="btn btn--small" onClick={onQuit}>
          {m.game.quit}
        </button>
      </span>
      <span className="hud__map">{mapTitle}</span>
    </header>
  );
}

type TurnPanelProps = { game: GameState; player: PlayerLook; hint: string; choosePiece: boolean; botPlayed: Card[] | null };

export function TurnPanel({ game, player, hint, choosePiece, botPlayed }: TurnPanelProps) {
  const m = useMessages();
  return (
    <section className="hud__block hud__turn" style={seatStyle(player)} aria-live="polite">
      <div className="hud__turn-name">
        <span className="dot" style={{ background: player.hex }} />
        {player.name}
        {game.status.kind === 'finalRound' && <span className="tag tag--gold">{m.game.finalRound}</span>}
      </div>
      <p className="hud__hint">
        {hint}
        {choosePiece && <span className="muted"> {m.hints.choosePiece}</span>}
      </p>
      {botPlayed && botPlayed.length > 0 && (
        <div className="hud__played" aria-label={m.game.botPlayed(player.name)}>
          {botPlayed.map((card) => (
            <CardView key={card.id} id={card.id} type={card.type} size="mini" />
          ))}
        </div>
      )}
    </section>
  );
}

export function PlayersPanel({ game, seats, players }: { game: GameState; seats: Seat[]; players: PlayerLook[] }) {
  const m = useMessages();
  return (
    <section className="hud__block hud__players">
      {game.players.map((player, i) => {
        const seat = seats[i]!;
        return (
          <div key={seat.color} className={cx('seat-tile', i === game.turn.player && 'is-current')} style={seatStyle(players[i]!)}>
            <strong className="seat-tile__name">
              <span className="dot" style={{ background: players[i]!.hex }} />
              {players[i]!.name}
            </strong>
            {seat.kind === 'bot' && <span className="tag">{m.game.botTag(seat.level)}</span>}
            <span className="seat-tile__stat">{m.game.cardCount(cardCount(game, i))}</span>
            {player.blockades.length > 0 && <span className="seat-tile__stat">{m.game.blockades(player.blockades.join(', '))}</span>}
            {player.finishedOrder !== null && <span className="tag tag--gold">{m.game.inCity}</span>}
          </div>
        );
      })}
    </section>
  );
}

type TurnActionsProps = {
  game: GameState;
  intents: Intents;
  selectedCount: number;
  locked: boolean;
  onPerform: (actions: Action[]) => void;
  onMarket: () => void;
};

export function TurnActions({ game, intents, selectedCount, locked, onPerform, onMarket }: TurnActionsProps) {
  const m = useMessages();
  const { turn } = game;
  const { play, endTurn, removal } = intents;
  return (
    <>
      <button type="button" className={cx('btn', 'btn--chunky', 'btn--market', intents.market.size > 0 && 'is-target')} onClick={onMarket}>
        {m.game.market}
      </button>
      {!locked && play && (
        <button type="button" className="btn btn--chunky btn--play" onClick={() => onPerform([play])}>
          {m.game.play(m.cards[game.players[turn.player]!.hand.find((card) => card.id === play.cardId)!.type])}
        </button>
      )}
      {!locked && turn.pending && (
        <button type="button" className="btn btn--chunky btn--primary" disabled={!removal} onClick={() => removal && onPerform([removal])}>
          {selectedCount > 0 ? m.game.remove(selectedCount) : m.game.keepAll}
        </button>
      )}
      {!locked && endTurn && (
        <button type="button" className="btn btn--chunky btn--primary" onClick={() => onPerform([endTurn])}>
          {selectedCount > 0 ? m.game.endTurnDiscard(selectedCount) : m.game.endTurn}
        </button>
      )}
    </>
  );
}

export function EventLog({ lines }: { lines: { id: number; text: string }[] }) {
  const m = useMessages();
  return (
    <details className="hud__block log">
      <summary>
        {m.game.log} · {lines.at(-1)?.text}
      </summary>
      <ol>
        {[...lines].reverse().map((line) => (
          <li key={line.id}>{line.text}</li>
        ))}
      </ol>
    </details>
  );
}

export function PassScreen({ player, onReveal }: { player: PlayerLook; onReveal: () => void }) {
  const m = useMessages();
  return (
    <div className="overlay">
      <div className="overlay__panel">
        <span className="dot dot--big" style={{ background: player.hex }} />
        <h2>{m.game.passTitle(player.name)}</h2>
        <p className="muted">{m.game.passBody(player.name)}</p>
        <button type="button" className="btn btn--primary" onClick={onReveal}>
          {m.game.showHand}
        </button>
      </div>
    </div>
  );
}

type GameOverProps = { game: GameState; players: readonly PlayerLook[]; onNewGame: () => void; onQuit: () => void };

export function GameOver({ game, players, onNewGame, onQuit }: GameOverProps) {
  const m = useMessages();
  const ranking = rankFinishers(game);
  const winner = players[ranking[0]!]!;
  return (
    <div className="overlay">
      <div className="overlay__panel">
        <span className="dot dot--big" style={{ background: winner.hex }} />
        <h2>{m.game.winner(winner.name)}</h2>
        <ol className="ranking">
          {ranking.map((index) => (
            <li key={index}>{m.game.ranking(players[index]!.name, game.players[index]!.blockades.length)}</li>
          ))}
        </ol>
        <div className="overlay__actions">
          <button type="button" className="btn btn--primary" onClick={onNewGame}>
            {m.game.playAgain}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onQuit}>
            {m.game.backToMenu}
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
