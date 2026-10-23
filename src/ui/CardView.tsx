import type { CSSProperties, KeyboardEvent } from 'react';
import { CARDS, type CardType } from '../engine/cards';
import type { CardSize } from './cardSizes';
import { cx } from './cx';
import { SuitIcon } from './art/SuitIcon';
import { CardArt } from './art/cardArt';
import { EFFECT_TEXT } from './labels';

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
      aria-label={type ? CARDS[type].name : 'Face-down card'}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <div className="card__lift">
        <div className="card__inner">
          {type && <CardFront type={type} />}
          <div className="card__back" />
        </div>
      </div>
    </div>
  );
}

function CardFront({ type }: { type: CardType }) {
  const { name, face, supply, singleUse } = CARDS[type];
  const tone = face.kind === 'expedition' ? face.suit : face.kind;
  const index = face.kind === 'action' ? '✦' : String(face.power);
  const icon = face.kind === 'expedition' ? <SuitIcon suit={face.suit} /> : face.kind === 'joker' ? <SuitIcon suit="joker" /> : null;
  return (
    <div className={cx('card__front', `tone-${tone}`)}>
      <div className="card__band">
        <span className="card__index">
          {index}
          <span className="card__suit">{icon}</span>
        </span>
        {singleUse && (
          <span className="card__once" title="Removed from the game once used">
            ✕
          </span>
        )}
        <span className="card__index card__index--right">{index}</span>
      </div>
      <div className="card__name">{name}</div>
      <div className="card__art">
        <CardArt type={type} />
      </div>
      {face.kind === 'action' && <div className="card__text">{EFFECT_TEXT[face.effect]}</div>}
      {supply.from !== 'starterDeck' && <div className="card__cost">{supply.cost}</div>}
    </div>
  );
}
