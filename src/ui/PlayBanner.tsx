import { type CSSProperties, useEffect, useId, useState } from 'react';
import { CardView } from './CardView';
import { useMessages } from './i18n';
import type { Banner, PlayerLook } from './labels';

const HOLD = 2200;
const LEAVE = 700;

type Shown = Banner & { id: number };
type Slots = { current: Shown | null; previous: Shown | null };

type Props = { id: number; banner: Banner | null; players: PlayerLook[]; style?: CSSProperties };

// `id` changes once per action; a new banner pushes the one on screen out to the right.
export function PlayBanners({ id, banner, players, style }: Props) {
  const [seen, setSeen] = useState(id);
  const [slots, setSlots] = useState<Slots>({ current: null, previous: null });
  if (id !== seen) {
    setSeen(id);
    if (banner) setSlots(({ current }) => ({ current: { ...banner, id }, previous: current }));
  }

  const currentId = slots.current?.id;
  useEffect(() => {
    if (currentId === undefined) return;
    const timer = window.setTimeout(() => setSlots(({ current }) => ({ current: null, previous: current })), HOLD);
    return () => window.clearTimeout(timer);
  }, [currentId]);

  const previousId = slots.previous?.id;
  useEffect(() => {
    if (previousId === undefined) return;
    const timer = window.setTimeout(() => setSlots(({ current }) => ({ current, previous: null })), LEAVE);
    return () => window.clearTimeout(timer);
  }, [previousId]);

  const shown = [slots.previous, slots.current].filter((slot) => slot !== null);
  return (
    <div className="play-banners" style={style} aria-live="polite">
      {shown.map((slot) => (
        <PlayBanner key={slot.id} banner={slot} player={players[slot.player]!} leaving={slot === slots.previous} />
      ))}
    </div>
  );
}

function PlayBanner({ banner, player, leaving }: { banner: Banner; player: PlayerLook; leaving: boolean }) {
  const m = useMessages();
  const arc = useId();
  const title = m.game.banner[banner.verb](player.name);
  return (
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
  );
}
