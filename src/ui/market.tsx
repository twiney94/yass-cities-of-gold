import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Action } from '../engine/actions';
import { ALL_CARDS, type CardType } from '../engine/cards';
import type { GameState } from '../engine/state';
import { CardView } from './CardView';
import { CARD_WIDTH } from './cardSizes';
import { cx } from './cx';
import type { Intents } from './intents';

const RESERVE = ALL_CARDS.filter((card) => card.supply.from === 'reserve').map((card) => card.type);
const PREVIEW_HEIGHT = 156;

const formatCoins = (coins: number) => {
  const whole = Math.floor(coins);
  return coins === whole ? String(whole) : `${whole || ''}½`;
};

type Props = { game: GameState; intents: Intents; coins: number; onPerform: (actions: Action[]) => void };

export function Market({ game, intents, coins, onPerform }: Props) {
  const [preview, setPreview] = useState<{ type: CardType; top: number; left: number } | null>(null);
  const { slots, remaining } = game.market;
  const open = slots.includes(null);

  const pile = (type: CardType) => {
    const left = remaining[type] ?? 0;
    const action = intents.market.get(type);
    return (
      <div
        key={type}
        className={cx('pile', action && 'is-target')}
        data-pile={type}
        onMouseEnter={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPreview({ type, top: Math.min(rect.top, window.innerHeight - PREVIEW_HEIGHT - 12), left: rect.left });
        }}
        onMouseLeave={() => setPreview(null)}
      >
        {Array.from({ length: Math.min(left, 3) - 1 }, (_, i) => (
          <span key={i} className="pile__layer" style={{ left: (i + 1) * 3, top: -(i + 1) * 3 }} />
        ))}
        <CardView type={type} size="mini" target={!!action} onClick={action ? () => onPerform([action]) : undefined} />
        <span className="pile__count">×{left}</span>
      </div>
    );
  };

  return (
    <section className="market">
      <header className="market__head">
        <h2>Market</h2>
        {coins > 0 && <span className="market__coins">{formatCoins(coins)} 🪙 selected</span>}
      </header>
      <div className={cx('market__reserve', !open && 'is-locked')}>
        {RESERVE.map((type) =>
          slots.includes(type) || !remaining[type] ? <div key={type} className="pile pile--gone" /> : pile(type),
        )}
      </div>
      <p className="market__note muted">
        {open ? 'Reserve open: a pile bought from it moves onto the board.' : 'The reserve opens once a pile on the board sells out.'}
      </p>
      <div className="market__board">
        {slots.map((type, i) => (type ? pile(type) : <div key={`slot-${i}`} className="pile pile--empty">Sold out</div>))}
      </div>
      {preview &&
        createPortal(
          <div className="preview" style={{ top: preview.top, left: preview.left - CARD_WIDTH.large - 18 }}>
            <CardView type={preview.type} size="large" />
          </div>,
          document.body,
        )}
    </section>
  );
}
