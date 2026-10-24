import { type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Action } from '../engine/actions';
import { botStep } from '../bot/bot';
import type { BlockadeId } from '../engine/board';
import type { HexKey } from '../engine/hex';
import type { Insets } from './board/BoardRenderer';
import { BoardView } from './board/BoardView';
import { cx } from './cx';
import { type CardSnapshot, animateCards, snapshotCards } from './fx/cardMotion';
import { useMessages } from './i18n';
import { NO_INTENTS, activePiece, coinsOf, computeIntents, selectedCards } from './intents';
import { PLAYER_COLORS, logText, playerLook, turnHint } from './labels';
import { mapSummary, mapTitle } from './maps';
import { Market } from './market';
import { EventLog, GameOver, HudHead, PassScreen, PlayersPanel, Toast, TurnActions, TurnPanel } from './panels';
import { playMusic } from './music';
import { playSound, soundsFor } from './sound';
import { needsPassScreen, useGame } from './store';
import { Tray } from './tray';

const HANDOFF_DELAY = 1500;
const BOT_PAUSE = 650;
const BOT_FIRST_PAUSE = 1200;
const HOP_TIME = 200;
const OUT_OF_CARDS_PAUSE = 1100;
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

const sameInsets = (a: Insets, b: Insets) => a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;

// The HUD is a sidebar on wide screens and a strip along the top on narrow ones; the tray sits at the bottom.
const useCoveredInsets = (
  area: RefObject<HTMLElement | null>,
  hud: RefObject<HTMLElement | null>,
  tray: RefObject<HTMLElement | null>,
  trayShown: boolean,
) => {
  const [insets, setInsets] = useState(NO_INSETS);
  useLayoutEffect(() => {
    const measure = () => {
      const box = area.current?.getBoundingClientRect();
      if (!box) return;
      const side = hud.current?.getBoundingClientRect();
      const bottom = tray.current?.getBoundingClientRect();
      const sidebar = !!side && side.height > box.height / 2;
      const next = {
        top: side && !sidebar ? side.bottom - box.top : 0,
        right: 0,
        bottom: bottom ? box.bottom - bottom.top : 0,
        left: side && sidebar ? side.right - box.left : 0,
      };
      setInsets((current) => (sameInsets(current, next) ? current : next));
    };
    const observer = new ResizeObserver(measure);
    for (const element of [area.current, hud.current, tray.current]) if (element) observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [area, hud, tray, trayShown]);
  return insets;
};

export function GameScreen() {
  const m = useMessages();
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
  const { prepare, quit, toggleCard, choosePiece, perform, finishHandoff, reveal, clearError } = useGame.getState();

  const settled = !handoff && !covered && game.status.kind !== 'over';
  const passing = handoff && seats[viewer]?.kind === 'human' && viewer !== game.turn.player && needsPassScreen(seats, game.turn.player);
  const seat = seats[game.turn.player]!;
  const interactive = settled && seat.kind === 'human' && viewer === game.turn.player;
  const botLevel = settled && seat.kind === 'bot' ? seat.level : null;
  const intents = useMemo(() => (interactive ? computeIntents(game, selection) : NO_INTENTS), [interactive, game, selection]);
  const targets = useMemo(() => new Set(intents.board.keys()), [intents]);
  const piece = interactive ? activePiece(game, selection) : null;
  const ownPiece = game.pieces.find((p) => p.owner === viewer && p.at !== 'eldorado')?.id ?? null;
  const players = useMemo(() => seats.map((s) => playerLook(s.color, m)), [seats, m]);
  const playerColors = useMemo(() => seats.map((s) => PLAYER_COLORS[s.color]), [seats]);
  const outOfCards =
    interactive && game.players[game.turn.player]!.hand.length === 0 && !game.turn.pending && intents.board.size === 0
      ? intents.endTurn
      : null;

  const areaRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLElement>(null);
  const trayRef = useRef<HTMLElement>(null);
  const insets = useCoveredInsets(areaRef, hudRef, trayRef, !covered);

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

  useEffect(() => {
    playMusic('game');
    return () => playMusic('menu');
  }, []);

  useLayoutEffect(() => {
    const before = snapshot.current;
    snapshot.current = null;
    if (before && fxLayer.current) animateCards(before, animation.events, fxLayer.current);
    for (const { sound, at } of soundsFor(animation.events, HOP_TIME)) playSound(sound, at);
  }, [animation]);

  useEffect(() => {
    if (!handoff || passing) return;
    const timer = window.setTimeout(() => animated(finishHandoff), HANDOFF_DELAY);
    return () => window.clearTimeout(timer);
  }, [handoff, passing, finishHandoff, animated]);

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

  const turnPlayer = players[game.turn.player]!;
  const waiting = passing
    ? m.hints.reviewHand(turnPlayer.name)
    : botLevel
    ? m.hints.botPlaying(turnPlayer.name)
    : outOfCards
      ? m.hints.outOfCards
      : interactive
        ? null
        : m.hints.turnOver;
  const locked = waiting !== null;
  const selectedCount = selection.cards.length;
  const ownPieces = game.pieces.filter((p) => p.owner === game.turn.player && p.at !== 'eldorado').length;
  const choosingPiece =
    !locked && ownPieces > 1 && selectedCount === 0 && !game.turn.movement && !game.turn.pending && game.turn.stage === 'moving';
  const botPlayed = game.turn.player !== viewer ? game.players[game.turn.player]!.played : null;

  const title = mapTitle(map, m);
  const summary = mapSummary(map, m);
  const logLines = useMemo(() => {
    const titled = summary ? `${title} (${summary})` : title;
    return log.map((line) => ({ id: line.id, text: logText(line.entry, m, players, titled) }));
  }, [log, m, players, title, summary]);

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
    <div className="game" ref={areaRef}>
      <BoardView
        game={game}
        playerColors={playerColors}
        targets={targets}
        activePiece={piece}
        cameraPiece={activePiece(game, selection)}
        ownPiece={ownPiece}
        focusCue={focusCue}
        insets={insets}
        animation={animation}
        onSpace={onSpace}
        onBlockade={onBlockade}
      />
      <aside className="hud" ref={hudRef}>
        <HudHead mapTitle={title} onQuit={quit} />
        <TurnPanel
          game={game}
          player={passing ? players[viewer]! : turnPlayer}
          hint={turnHint(m, game, intents, selectedCount, waiting)}
          choosePiece={choosingPiece}
          botPlayed={botPlayed}
        />
        <PlayersPanel game={game} seats={seats} players={players} />
        {marketOpen && <div className="sheet-backdrop" onClick={() => setMarketOpen(false)} />}
        <div className={cx('hud__sheet', marketOpen && 'is-open')}>
          <button type="button" className="btn btn--small sheet-close" onClick={() => setMarketOpen(false)}>
            {m.game.close}
          </button>
          <Market game={game} intents={intents} coins={coinsOf(selectedCards(game, selection))} onPerform={buyFromMarket} />
          <EventLog lines={logLines} />
        </div>
        <div className="turn-actions">
          <TurnActions
            game={game}
            intents={intents}
            selectedCount={selectedCount}
            locked={locked}
            waitingFor={interactive || outOfCards || passing ? null : turnPlayer.name}
            passTo={passing ? turnPlayer.name : null}
            onPass={() => animated(finishHandoff)}
            onPerform={act}
            onMarket={() => setMarketOpen(true)}
          />
        </div>
      </aside>
      {!covered && (
        <Tray
          ref={trayRef}
          player={game.players[viewer]!}
          handHidden={seats[viewer]?.kind === 'bot'}
          selected={selection.cards}
          onToggle={interactive ? toggleCard : undefined}
        />
      )}
      <div className="fx-layer" ref={fxLayer} />
      {covered && game.status.kind !== 'over' && <PassScreen player={turnPlayer} onReveal={() => animated(reveal)} />}
      {game.status.kind === 'over' && <GameOver game={game} players={players} onNewGame={() => prepare(seats, map)} onQuit={quit} />}
      {error && <Toast message={m.game.rejected} onDone={clearError} />}
    </div>
  );
}
