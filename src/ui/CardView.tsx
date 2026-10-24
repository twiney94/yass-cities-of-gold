import type { CSSProperties, KeyboardEvent } from 'react';
import { CARDS, type CardType } from '../engine/cards';
import type { CardSize } from './cardSizes';
import { cx } from './cx';
import { SuitIcon } from './art/SuitIcon';
import { CardArt } from './art/cardArt';
import { useMessages } from './i18n';

type Props = {
  type?: CardType;
  id?: number;
  size?: CardSize;
  selected?: boolean;
  target?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
};

// Without a type the card is drawn face down, so hidden cards never reach the DOM.
export function CardView({ type, id, size = 'large', selected, target, onClick, style }: Props) {
  const m = useMessages();
  const onKeyDown = (event: KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };
  return (
    <div
      className={cx('card', `card--${size}`, selected && 'is-selected', target && 'is-target', onClick && 'is-clickable')}
      data-card={id}
      data-face={type ? 'up' : 'down'}
      style={style}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? !!selected : undefined}
      aria-label={type ? m.cards[type] : m.game.faceDown}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <div className="card__lift">
        <div className="card__inner">
          {type && <CardFront type={type} />}
          <div className="card__back" />
        </div>
        {type && (
          <span className="card__caption" aria-hidden="true">
            {m.cards[type]}
          </span>
        )}
      </div>
    </div>
  );
}

const NAME_FIT = 11;

function CardFront({ type }: { type: CardType }) {
  const m = useMessages();
  const { face, supply, singleUse } = CARDS[type];
  const tone = face.kind === 'expedition' ? face.suit : face.kind;
  const value = face.kind === 'action' ? '✦' : String(face.power);
  const icon = face.kind === 'expedition' ? <SuitIcon suit={face.suit} /> : face.kind === 'joker' ? <SuitIcon suit="joker" /> : null;
  const name = m.cards[type];
  return (
    <div className={cx('card__front', `tone-${tone}`)}>
      <div className="card__art">
        <CardArt type={type} />
      </div>
      <div className="card__medal">
        <span className="card__value">{value}</span>
        {icon && <span className="card__suit">{icon}</span>}
      </div>
      <div className="card__ribbon">
        <div className="card__banner">
          <span className="card__name" style={{ '--fit': Math.min(1, NAME_FIT / name.length) } as CSSProperties}>
            {name}
          </span>
        </div>
      </div>
      {supply.from !== 'starterDeck' && <div className="card__cost">{supply.cost}</div>}
      {singleUse && (
        <span className="card__once" title={m.game.singleUse}>
          ✕
        </span>
      )}
      {face.kind === 'action' && <div className="card__text">{m.effects[face.effect]}</div>}
    </div>
  );
}
