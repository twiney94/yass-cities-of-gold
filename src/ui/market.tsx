import { type CSSProperties, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Action } from '../engine/actions';
import { ALL_CARDS, type CardType } from '../engine/cards';
import type { GameState } from '../engine/state';
import { CardView } from './CardView';
import { Dialog } from './Dialog';
import { SuitIcon } from './art/SuitIcon';
import { CARD_WIDTH } from './cardSizes';
import { cx } from './cx';
import { useMessages } from './i18n';
import type { Intents } from './intents';

const RESERVE = ALL_CARDS.filter((card) => card.supply.from === 'reserve').map((card) => card.type);
const PREVIEW_WIDTH = CARD_WIDTH.large * 1.5;
const PREVIEW_HEIGHT = 234;
const PREVIEW_CAPTION = 34;
const PREVIEW_GAP = 18;

const previewLeft = (pile: DOMRect) =>
  pile.right + PREVIEW_GAP + PREVIEW_WIDTH <= window.innerWidth
    ? pile.right + PREVIEW_GAP
    : Math.max(8, pile.left - PREVIEW_GAP - PREVIEW_WIDTH);

const previewTop = (pile: DOMRect) => Math.max(8, Math.min(pile.top, window.innerHeight - PREVIEW_HEIGHT - PREVIEW_CAPTION - 8));

const formatCoins = (coins: number) => {
  const whole = Math.floor(coins);
  return coins === whole ? String(whole) : `${whole || ''}½`;
};

type Props = { game: GameState; intents: Intents; coins: number; onPerform: (actions: Action[]) => void };

// With a mouse a pile previews on hover and buys on click. A touch screen has no hover, so a tap opens the card
// instead and only its button buys it.
export function Market({ game, intents, coins, onPerform }: Props) {
  const m = useMessages();
  const [preview, setPreview] = useState<{ type: CardType; top: number; left: number } | null>(null);
  const [touch] = useState(() => window.matchMedia('(hover: none)').matches);
  const [inspected, setInspected] = useState<CardType | null>(null);
  const inspectedAction = inspected && intents.market.get(inspected);
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
          if (touch) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setPreview({ type, top: previewTop(rect), left: previewLeft(rect) });
        }}
        onMouseLeave={() => setPreview(null)}
      >
        {Array.from({ length: Math.min(left, 3) - 1 }, (_, i) => (
          <span key={i} className="pile__layer" style={{ left: (i + 1) * 3, top: -(i + 1) * 3 }} />
        ))}
        <CardView
          type={type}
          size="mini"
          target={!!action}
          onClick={touch ? () => setInspected(type) : action ? () => onPerform([action]) : undefined}
        />
        <span className="pile__count">×{left}</span>
      </div>
    );
  };

  return (
    <section className={cx('hud__block', 'market', coins > 0 && 'is-buying')}>
      <header className="market__head">
        <h2>{m.game.market}</h2>
        {coins > 0 && (
          <span className="market__coins">
            {formatCoins(coins)} <SuitIcon suit="coin" /> {m.game.coinsSelected}
          </span>
        )}
      </header>
      <div className="market__board">
        {slots.map((type, i) => (type ? pile(type) : <div key={`slot-${i}`} className="pile pile--empty">{m.game.soldOut}</div>))}
      </div>
      <p className="market__note muted">{open ? m.game.reserveOpen : m.game.reserveLocked}</p>
      <div className={cx('market__reserve', !open && 'is-locked')}>
        {RESERVE.map((type) =>
          slots.includes(type) || !remaining[type] ? <div key={type} className="pile pile--gone" /> : pile(type),
        )}
      </div>
      {preview &&
        createPortal(
          <div
            className="preview"
            style={{ top: preview.top, left: preview.left, '--card-w': `${PREVIEW_WIDTH}px`, '--card-h': `${PREVIEW_HEIGHT}px` } as CSSProperties}
          >
            <CardView type={preview.type} size="large" />
          </div>,
          document.body,
        )}
      {inspected && (
        <Dialog
          title={m.cards[inspected]}
          className="market-card"
          onClose={() => setInspected(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setInspected(null)} autoFocus={!inspectedAction}>
                {m.game.close}
              </button>
              {inspectedAction && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    setInspected(null);
                    onPerform([inspectedAction]);
                  }}
                >
                  {inspectedAction.type === 'playTransmitter' ? m.game.takeCard : m.game.buyCard}
                </button>
              )}
            </>
          }
        >
          <div className="market-card__view" style={{ '--card-w': `${PREVIEW_WIDTH}px`, '--card-h': `${PREVIEW_HEIGHT}px` } as CSSProperties}>
            <CardView type={inspected} />
          </div>
        </Dialog>
      )}
    </section>
  );
}
