import { type CSSProperties, useEffect, useState } from 'react';
import type { Action } from '../engine/actions';
import { rankFinishers } from '../engine/rules';
import type { Card, GameState } from '../engine/state';
import { CardView } from './CardView';
import { LanguageSwitch } from './LanguageSwitch';
import { SoundSwitch } from './SoundSwitch';
import { Logo } from './Logo';
import { cx } from './cx';
import { useMessages } from './i18n';
import { RulesDialog } from './info';
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
  const [rules, setRules] = useState(false);
  return (
    <header className="hud__block hud__head">
      <Logo small />
      <span className="hud__controls">
        <button type="button" className="btn btn--small btn--round" aria-label={m.menu.howToPlay} title={m.menu.howToPlay} onClick={() => setRules(true)}>
          ?
        </button>
        <SoundSwitch />
        <LanguageSwitch />
        <button type="button" className="btn btn--small" onClick={onQuit}>
          {m.game.quit}
        </button>
      </span>
      <span className="hud__map">{mapTitle}</span>
      {rules && <RulesDialog onClose={() => setRules(false)} />}
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
        <div className="hud__played" aria-label={m.game.banner.played(player.name)}>
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
  waitingFor: string | null;
  passTo: string | null;
  onPass: () => void;
  onPerform: (actions: Action[]) => void;
  onMarket: () => void;
};

export function TurnActions(props: TurnActionsProps) {
  const { game, intents, selectedCount, locked, waitingFor, passTo, onPass, onPerform, onMarket } = props;
  const m = useMessages();
  const { turn } = game;
  const { play, removal } = intents;
  const endTurn = locked ? null : intents.endTurn;
  const tip = waitingFor ? m.game.notYourTurn(waitingFor) : undefined;
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
      {passTo ? (
        <span className="turn-actions__end">
          <button type="button" className="btn btn--chunky btn--primary" onClick={onPass}>
            {m.game.passTo(passTo)}
          </button>
        </span>
      ) : (
        <span className={cx('turn-actions__end', tip && 'has-tip')} data-tip={tip}>
          <button type="button" className="btn btn--chunky btn--primary" disabled={!endTurn} onClick={() => endTurn && onPerform([endTurn])}>
            {endTurn && selectedCount > 0 ? m.game.endTurnDiscard(selectedCount) : m.game.endTurn}
          </button>
        </span>
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

const COINS = Array.from({ length: 26 }, (_, i) => ({
  '--x': `${(i * 37) % 100}%`,
  '--delay': `${((i * 0.23) % 2.4).toFixed(2)}s`,
  '--fall': `${2.6 + ((i * 7) % 10) / 10}s`,
  '--size': `${10 + ((i * 5) % 9)}px`,
})) as CSSProperties[];

export function GameOver({ game, players, onNewGame, onQuit }: GameOverProps) {
  const m = useMessages();
  const ranking = rankFinishers(game);
  const winner = players[ranking[0]!]!;
  return (
    <div className="overlay">
      <div className="confetti" aria-hidden="true">
        {COINS.map((style, i) => (
          <span key={i} style={style} />
        ))}
      </div>
      <div className="overlay__panel game-over">
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
