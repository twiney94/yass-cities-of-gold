import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Action } from '../engine/actions';
import { botStep } from '../bot/bot';
import type { BlockadeId } from '../engine/board';
import type { HexKey } from '../engine/hex';
import { BoardView } from './board/BoardView';
import { cx } from './cx';
import { Dock } from './dock';
import { type CardSnapshot, animateCards, snapshotCards } from './fx/cardMotion';
import { NO_INTENTS, activePiece, coinsOf, computeIntents, selectedCards } from './intents';
import { Market } from './market';
import { PLAYER_COLORS } from './labels';
import { ActionBar, EventLog, GameOver, PassScreen, PlayersBar, Toast } from './panels';
import { useGame } from './store';

const HANDOFF_DELAY = 1500;
const BOT_PAUSE = 650;
const BOT_FIRST_PAUSE = 1200;
const HOP_TIME = 200;
const OUT_OF_CARDS_PAUSE = 1100;

export function GameScreen() {
  const game = useGame((s) => s.game)!;
  const seats = useGame((s) => s.seats);
  const map = useGame((s) => s.map)!;
  const viewer = useGame((s) => s.viewer);
  const selection = useGame((s) => s.selection);
  const handoff = useGame((s) => s.handoff);
  const covered = useGame((s) => s.covered);
  const animation = useGame((s) => s.animation);
  const focusCue = useGame((s) => s.focusCue);
  const log = useGame((s) => s.log);
  const error = useGame((s) => s.error);
  const { newGame, quit, toggleCard, choosePiece, perform, finishHandoff, reveal, clearError } = useGame.getState();

  const onScreen = !handoff && !covered && viewer === game.turn.player && game.status.kind !== 'over';
  const seat = seats[game.turn.player]!;
  const interactive = onScreen && seat.kind === 'human';
  const botLevel = onScreen && seat.kind === 'bot' ? seat.level : null;
  const intents = useMemo(() => (interactive ? computeIntents(game, selection) : NO_INTENTS), [interactive, game, selection]);
  const targets = useMemo(() => new Set(intents.board.keys()), [intents]);
  const piece = interactive ? activePiece(game, selection) : null;
  const players = useMemo(() => seats.map((seat) => PLAYER_COLORS[seat.color]), [seats]);
  const playerColors = useMemo(() => players.map((player) => player.hex), [players]);
  const outOfCards =
    interactive && game.players[game.turn.player]!.hand.length === 0 && !game.turn.pending && intents.board.size === 0
      ? intents.endTurn
      : null;

  const [marketOpen, setMarketOpen] = useState(false);
  const fxLayer = useRef<HTMLDivElement>(null);
  const snapshot = useRef<CardSnapshot | null>(null);
  const animated = useCallback((change: () => void) => {
    snapshot.current = snapshotCards();
    change();
  }, []);
  const act = useCallback((actions: Action[]) => animated(() => perform(actions)), [animated, perform]);
  const buyFromMarket = useCallback(
    (actions: Action[]) => {
      setMarketOpen(false);
      act(actions);
    },
    [act],
  );

  useLayoutEffect(() => {
    const before = snapshot.current;
    snapshot.current = null;
    if (before && fxLayer.current) animateCards(before, animation.events, fxLayer.current);
  }, [animation]);

  useEffect(() => {
    if (!handoff) return;
    const timer = window.setTimeout(() => animated(finishHandoff), HANDOFF_DELAY);
    return () => window.clearTimeout(timer);
  }, [handoff, finishHandoff, animated]);

  useEffect(() => {
    if (!botLevel) return;
    const hops = animation.events.filter((event) => event.type === 'pieceMoved').length;
    const delay = (animation.events.length === 0 ? BOT_FIRST_PAUSE : BOT_PAUSE) + hops * HOP_TIME;
    const timer = window.setTimeout(() => act(botStep(game, botLevel)), delay);
    return () => window.clearTimeout(timer);
  }, [botLevel, game, animation, act]);

  useEffect(() => {
    if (!outOfCards) return;
    const hops = animation.events.filter((event) => event.type === 'pieceMoved').length;
    const timer = window.setTimeout(() => act([outOfCards]), OUT_OF_CARDS_PAUSE + hops * HOP_TIME);
    return () => window.clearTimeout(timer);
  }, [outOfCards, animation, act]);

  const waiting = botLevel
    ? `${players[game.turn.player]!.name} (bot) is playing…`
    : outOfCards
      ? 'No cards left. Ending your turn…'
      : interactive
        ? null
        : 'Turn over…';

  const onSpace = useCallback(
    (key: HexKey) => {
      if (!interactive) return;
      const own = game.pieces.find((p) => p.at === key && p.owner === game.turn.player);
      if (own) return choosePiece(own.id);
      const actions = intents.board.get(`space:${key}`);
      if (actions) act(actions);
    },
    [interactive, game, intents, choosePiece, act],
  );

  const onBlockade = useCallback(
    (id: BlockadeId) => {
      const actions = intents.board.get(`blockade:${id}`);
      if (actions) act(actions);
    },
    [intents, act],
  );

  return (
    <div className="game">
      <PlayersBar game={game} seats={seats} mapName={map.name} onQuit={quit} />
      <main className="game__main">
        <BoardView
          game={game}
          playerColors={playerColors}
          targets={targets}
          activePiece={piece}
          cameraPiece={activePiece(game, selection)}
          focusCue={focusCue}
          animation={animation}
          onSpace={onSpace}
          onBlockade={onBlockade}
        />
        <aside className={cx('game__side', marketOpen && 'is-open')}>
          <button type="button" className="btn btn--small sheet-close" onClick={() => setMarketOpen(false)}>
            Close
          </button>
          <Market game={game} intents={intents} coins={coinsOf(selectedCards(game, selection))} onPerform={buyFromMarket} />
          <EventLog log={log} />
        </aside>
      </main>
      {marketOpen && <div className="sheet-backdrop" onClick={() => setMarketOpen(false)} />}
      <ActionBar
        game={game}
        player={players[game.turn.player]!}
        intents={intents}
        selectedCount={selection.cards.length}
        waiting={waiting}
        onPerform={act}
        onMarket={() => setMarketOpen(true)}
      />
      {covered ? (
        <section className="dock dock--hidden" />
      ) : (
        <Dock
          player={game.players[viewer]!}
          handHidden={seats[viewer]?.kind === 'bot'}
          selected={selection.cards}
          onToggle={interactive ? toggleCard : undefined}
        />
      )}
      <div className="fx-layer" ref={fxLayer} />
      {covered && game.status.kind !== 'over' && <PassScreen player={players[game.turn.player]!} onReveal={() => animated(reveal)} />}
      {game.status.kind === 'over' && (
        <GameOver game={game} players={players} onNewGame={() => newGame(seats, map)} onQuit={quit} />
      )}
      {error && <Toast message={error} onDone={clearError} />}
    </div>
  );
}
