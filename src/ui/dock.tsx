import { type CSSProperties, type RefObject, useLayoutEffect, useRef, useState } from 'react';
import type { Card, CardId, PlayerState } from '../engine/state';
import { CardView } from './CardView';
import { CARD_WIDTH, type CardSize } from './cardSizes';

// The card width comes from CSS (--card-w), so the fan spacing follows the breakpoints.
const useRowMetrics = (ref: RefObject<HTMLElement | null>, fallback: number) => {
  const [metrics, setMetrics] = useState({ width: 0, cardWidth: fallback });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () =>
      setMetrics({
        width: element.clientWidth,
        cardWidth: Number.parseFloat(getComputedStyle(element).getPropertyValue('--card-w')) || fallback,
      });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, fallback]);
  return metrics;
};

type RowProps = {
  cards: Card[];
  size: CardSize;
  maxStep: number;
  fan?: boolean;
  faceDown?: boolean;
  selected?: CardId[];
  onToggle?: (id: CardId) => void;
};

function CardRow({ cards, size, maxStep, fan, faceDown, selected, onToggle }: RowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, cardWidth } = useRowMetrics(ref, CARD_WIDTH[size]);
  const step = cards.length > 1 ? Math.max(4, Math.min(maxStep, (width - cardWidth) / (cards.length - 1))) : 0;
  const offset = fan ? Math.max(0, (width - cardWidth - step * (cards.length - 1)) / 2) : 0;
  const middle = (cards.length - 1) / 2;
  return (
    <div className={`row row--${size}`} ref={ref}>
      {cards.map((card, i) => {
        const style = {
          left: offset + i * step,
          zIndex: i,
          ...(fan && { '--tilt': `${(i - middle) * 2.5}deg`, '--arc': `${Math.abs(i - middle) ** 1.6 * 2.5}px` }),
        } as CSSProperties;
        return (
          <CardView
            key={card.id}
            id={card.id}
            type={faceDown ? undefined : card.type}
            size={size}
            style={style}
            selected={selected?.includes(card.id)}
            onClick={onToggle && (() => onToggle(card.id))}
          />
        );
      })}
    </div>
  );
}

function DrawPile({ cards }: { cards: Card[] }) {
  return (
    <div className="row row--small stack">
      {cards.map((card, i) => (
        <CardView key={card.id} id={card.id} size="small" style={{ left: i * 0.8, top: -i * 0.8, zIndex: i }} />
      ))}
    </div>
  );
}

type DockProps = { player: PlayerState; handHidden: boolean; selected: CardId[]; onToggle?: (id: CardId) => void };

export function Dock({ player, handHidden, selected, onToggle }: DockProps) {
  return (
    <section className="dock">
      <div className="zone zone--draw">
        <span className="zone__label">Draw pile · {player.drawPile.length}</span>
        <DrawPile cards={player.drawPile} />
        <span className="zone__label zone__label--compact">Discard · {player.discard.length}</span>
      </div>
      <div className="zone zone--hand">
        <CardRow cards={player.hand} size="large" maxStep={80} fan faceDown={handHidden} selected={selected} onToggle={onToggle} />
      </div>
      <div className="zone zone--played">
        <span className="zone__label">Played this turn</span>
        <CardRow cards={player.played} size="small" maxStep={34} />
      </div>
      <div className="zone zone--discard">
        <span className="zone__label">Discard · {player.discard.length}</span>
        <CardRow cards={player.discard} size="small" maxStep={28} />
      </div>
    </section>
  );
}
