import { Application } from 'pixi.js';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BlockadeId } from '../../engine/board';
import type { HexKey } from '../../engine/hex';
import type { TargetKey } from '../../engine/moves';
import type { GameState, PieceId } from '../../engine/state';
import { useMessages } from '../i18n';
import type { Animation } from '../store';
import { BoardRenderer, type Insets } from './BoardRenderer';

type Props = {
  game: GameState;
  playerColors: readonly string[];
  targets: ReadonlySet<TargetKey>;
  activePiece: PieceId | null;
  cameraPiece: PieceId | null;
  ownPiece: PieceId | null;
  focusCue: number;
  insets: Insets;
  animation: Animation;
  onSpace: (key: HexKey) => void;
  onBlockade: (id: BlockadeId) => void;
};

export function BoardView(props: Props) {
  const { game, playerColors, targets, activePiece, cameraPiece, ownPiece, focusCue, insets, animation, onSpace, onBlockade } = props;
  const m = useMessages();
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const handlersRef = useRef({ onSpace, onBlockade });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    handlersRef.current = { onSpace, onBlockade };
  });

  useEffect(() => {
    const host = hostRef.current!;
    const app = new Application();
    let disposed = false;
    let observer: ResizeObserver | null = null;
    app
      .init({
        background: '#16261b',
        antialias: true,
        resolution: window.devicePixelRatio,
        autoDensity: true,
        width: host.clientWidth,
        height: host.clientHeight,
      })
      .then(() => {
        if (disposed) {
          app.destroy(true, { children: true });
          return;
        }
        host.appendChild(app.canvas);
        const renderer = new BoardRenderer(app, {
          onSpace: (key) => handlersRef.current.onSpace(key),
          onBlockade: (id) => handlersRef.current.onBlockade(id),
        });
        rendererRef.current = renderer;
        observer = new ResizeObserver(() => {
          app.renderer.resize(host.clientWidth, host.clientHeight);
          renderer.resize();
        });
        observer.observe(host);
        setReady(true);
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
        app.destroy(true, { children: true });
      }
    };
  }, []);

  useEffect(() => {
    if (ready) rendererRef.current?.setInsets(insets);
  }, [ready, insets]);

  useEffect(() => {
    if (ready) rendererRef.current?.setBoard(game.board);
  }, [ready, game.board]);

  useEffect(() => {
    if (ready) rendererRef.current?.setPlayerColors(playerColors);
  }, [ready, playerColors]);

  useEffect(() => {
    if (ready) rendererRef.current?.update(game, targets, activePiece, animation);
  }, [ready, game, targets, activePiece, animation]);

  const cameraPieceRef = useRef(cameraPiece);
  useLayoutEffect(() => {
    cameraPieceRef.current = cameraPiece;
  });
  useEffect(() => {
    if (ready && focusCue > 0) rendererRef.current?.focusPiece(cameraPieceRef.current);
  }, [ready, focusCue]);

  return (
    <div className="board" ref={hostRef}>
      <div className="board__controls">
        <button type="button" className="btn btn--icon" aria-label={m.game.zoomIn} onClick={() => rendererRef.current?.zoomBy(1.3)}>
          +
        </button>
        <button type="button" className="btn btn--icon" aria-label={m.game.zoomOut} onClick={() => rendererRef.current?.zoomBy(1 / 1.3)}>
          −
        </button>
        <button type="button" className="btn" onClick={() => rendererRef.current?.showOverview()}>
          {m.game.wholeMap}
        </button>
        <button type="button" className="btn" onClick={() => rendererRef.current?.focusPiece(ownPiece ?? cameraPiece)}>
          {m.game.myPawn}
        </button>
      </div>
    </div>
  );
}
