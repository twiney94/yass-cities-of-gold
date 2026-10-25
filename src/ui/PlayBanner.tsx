import { type CSSProperties, useId } from 'react';
import { CardView } from './CardView';
import { useMessages } from './i18n';
import type { Banner, PlayerLook } from './labels';

export const BANNER_HOLD = 1800;
export const BANNER_LEAVE = 750;

type Props = { banner: Banner; player: PlayerLook; leaving: boolean; style?: CSSProperties };

export function PlayBanner({ banner, player, leaving, style }: Props) {
  const m = useMessages();
  const arc = useId();
  const title = m.game.banner[banner.verb](player.name);
  return (
    <div className="play-banners" style={style} aria-live="polite">
      <div
        className={leaving ? 'play-banner is-leaving' : 'play-banner'}
        style={{ '--n': banner.cards.length, '--seat': player.hex } as CSSProperties}
      >
        <svg className="play-banner__title" viewBox="0 0 440 96" role="img" aria-label={title}>
          <path id={arc} d="M 24 88 Q 220 -8 416 88" fill="none" />
          <text>
            <textPath href={`#${arc}`} startOffset="50%" textAnchor="middle">
              {title}
            </textPath>
          </text>
        </svg>
        <div className="play-banner__cards">
          {banner.cards.map((card, i) => (
            <CardView key={card.id} type={card.type} style={{ '--i': i } as CSSProperties} />
          ))}
        </div>
      </div>
    </div>
  );
}
