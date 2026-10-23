import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { Action } from '../engine/actions';
import { botStep } from '../bot/bot';
import type { BlockadeId } from '../engine/board';
import type { HexKey } from '../engine/hex';
import { BoardView } from './board/BoardView';
import { Dock } from './dock';
import { type CardSnapshot, animateCards, snapshotCards } from './fx/cardMotion';
import { NO_INTENTS, activePiece, coinsOf, computeIntents, selectedCards } from './intents';
import { Market } from './market';
import { PLAYERS } from './labels';
import { ActionBar, EventLog, GameOver, PassScreen, PlayersBar, Toast } from './panels';
import { useGame } from './store';

const HANDOFF_DELAY = 1500;
const BOT_PAUSE = 650;
const BOT_FIRST_PAUSE = 1200;
const HOP_TIME = 200;

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
  const interactive = onScreen && seats[game.turn.player] === 'human';
  const botTurn = onScreen && seats[game.turn.player] === 'bot';
  const intents = useMemo(() => (interactive ? computeIntents(game, selection) : NO_INTENTS), [interactive, game, selection]);
  const targets = useMemo(() => new Set(intents.board.keys()), [intents]);
  const piece = interactive ? activePiece(game, selection) : null;

  const fxLayer = useRef<HTMLDivElement>(null);
  const snapshot = useRef<CardSnapshot | null>(null);
  const animated = useCallback((change: () => void) => {
    snapshot.current = snapshotCards();
    change();
  }, []);
  const act = useCallback((actions: Action[]) => animated(() => perform(actions)), [animated, perform]);

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
    if (!botTurn) return;
    const hops = animation.events.filter((event) => event.type === 'pieceMoved').length;
    const delay = (animation.events.length === 0 ? BOT_FIRST_PAUSE : BOT_PAUSE) + hops * HOP_TIME;
    const timer = window.setTimeout(() => act(botStep(game)), delay);
    return () => window.clearTimeout(timer);
  }, [botTurn, game, animation, act]);

  const waiting = botTurn ? `${PLAYERS[game.turn.player]!.name} (bot) is playing…` : interactive ? null : 'Turn over…';

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
          targets={targets}
          activePiece={piece}
          cameraPiece={activePiece(game, selection)}
          focusCue={focusCue}
          animation={animation}
          onSpace={onSpace}
          onBlockade={onBlockade}
        />
        <aside className="game__side">
          <Market game={game} intents={intents} coins={coinsOf(selectedCards(game, selection))} onPerform={act} />
          <EventLog log={log} />
        </aside>
      </main>
      <ActionBar game={game} intents={intents} selectedCount={selection.cards.length} waiting={waiting} onPerform={act} />
      {covered ? (
        <section className="dock dock--hidden" />
      ) : (
        <Dock
          player={game.players[viewer]!}
          handHidden={seats[viewer] === 'bot'}
          selected={selection.cards}
          onToggle={interactive ? toggleCard : undefined}
        />
      )}
      <div className="fx-layer" ref={fxLayer} />
      {covered && game.status.kind !== 'over' && <PassScreen player={game.turn.player} onReveal={() => animated(reveal)} />}
      {game.status.kind === 'over' && (
        <GameOver game={game} onNewGame={() => newGame(seats, map)} onQuit={quit} />
      )}
      {error && <Toast message={error} onDone={clearError} />}
    </div>
  );
}
