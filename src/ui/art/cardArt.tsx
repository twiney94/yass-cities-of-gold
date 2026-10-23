import type { ReactNode } from 'react';
import type { CardType } from '../../engine/cards';

const INK = '#22301f';

const Scene = ({ children }: { children: ReactNode }) => (
  <svg className="card-art" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    {children}
  </svg>
);

const Sky = ({ top, bottom }: { top: string; bottom: string }) => (
  <>
    <rect width="120" height="80" fill={bottom} />
    <rect width="120" height="30" fill={top} />
  </>
);

const Jungle = ({ sun = true }: { sun?: boolean }) => (
  <>
    <Sky top="#e6f2d6" bottom="#d2e8bf" />
    {sun && <circle cx="94" cy="20" r="11" fill="#fff4c9" />}
    <path d="M0 50 Q18 34 36 44 T72 40 T120 44 V80 H0 Z" fill="#8cc47a" />
    <path d="M0 58 Q24 46 50 56 T120 54 V80 H0 Z" fill="#5aa45c" />
    <rect y="66" width="120" height="14" fill="#3e8e41" />
    <path d="M-4 80 Q4 58 16 50 Q10 64 14 80 Z M120 80 Q114 60 104 52 Q110 66 106 80 Z" fill="#2c6a30" />
  </>
);

const River = () => (
  <>
    <Sky top="#e3f0f8" bottom="#cbe5f4" />
    <path d="M0 44 Q30 36 60 42 T120 40 V54 H0 Z" fill="#7fb27a" />
    <rect y="52" width="120" height="28" fill="#3f93d6" />
    <path d="M6 60 h18 M40 66 h22 M78 60 h20 M20 74 h16 M88 72 h22" stroke="#cfe9fb" strokeWidth="2" strokeLinecap="round" />
  </>
);

const Gold = () => (
  <>
    <Sky top="#fdf1cc" bottom="#f8dd92" />
    <circle cx="60" cy="38" r="22" fill="#fff6da" />
    <path d="M14 66 h28 v-6 h-4 v-6 h-6 v-6 h-8 v6 h-6 v6 h-4 Z M84 66 h24 v-5 h-4 v-5 h-5 v-5 h-6 v5 h-5 v5 h-4 Z" fill="#e2ad46" />
    <rect y="64" width="120" height="16" fill="#c98a2c" />
  </>
);

const Dusk = () => (
  <>
    <Sky top="#efe4f8" bottom="#d9c6f1" />
    <circle cx="20" cy="14" r="1.2" fill="#fff" />
    <circle cx="44" cy="9" r="1" fill="#fff" />
    <circle cx="102" cy="12" r="1.3" fill="#fff" />
    <circle cx="80" cy="22" r="0.9" fill="#fff" />
    <path d="M0 56 Q30 44 60 52 T120 48 V80 H0 Z" fill="#a487d1" />
    <rect y="66" width="120" height="14" fill="#6f4fa3" />
  </>
);

const Wild = () => (
  <>
    <path d="M0 0 H50 L30 80 H0 Z" fill="#cfe7bb" />
    <path d="M50 0 H90 L70 80 H30 Z" fill="#cbe5f4" />
    <path d="M90 0 H120 V80 H70 Z" fill="#f8e2a0" />
    <path d="M0 62 Q30 52 60 60 T120 58 V80 H0 Z" fill="#8a7b5b" />
  </>
);

const FIGURES = import.meta.glob<string>('./figures/*.webp', { eager: true, query: '?url', import: 'default' });

// Figures are KayKit characters rendered square by tools/figures, feet 93% of the way down the picture.
const FEET = 0.93;

const Hero = ({ type, x, y, size }: { type: CardType; x: number; y: number; size: number }) => (
  <image href={FIGURES[`./figures/${type}.webp`]} x={x - size / 2} y={y - size * FEET} width={size} height={size} />
);

const Coin = ({ x, y, r = 5 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#f2c14e" stroke="#8a5a12" strokeWidth="1.2" />
    <circle cx={x} cy={y} r={r * 0.55} fill="none" stroke="#b9821e" strokeWidth="1" />
  </g>
);

const ART: Record<CardType, () => ReactNode> = {
  explorer: () => (
    <>
      <Jungle />
      <path d="M70 70 Q76 56 86 52 Q80 62 82 70 Z M30 70 Q34 58 42 54 Q38 64 40 70 Z" fill="#2c6a30" />
      <Hero type="explorer" x={62} y={75} size={58} />
    </>
  ),
  scout: () => (
    <>
      <Jungle />
      <path d="M30 72 L44 54 L68 56 L80 72 Z" fill="#6c7d6a" />
      <Hero type="scout" x={60} y={58} size={54} />
    </>
  ),
  trailblazer: () => (
    <>
      <Jungle sun={false} />
      <path d="M60 18 Q86 30 82 62 Q60 56 46 40 Q42 28 60 18 Z" fill="#2c6a30" />
      <path d="M60 18 Q64 40 82 62" stroke="#8cc47a" strokeWidth="1.5" fill="none" />
      <Hero type="trailblazer" x={60} y={75} size={58} />
    </>
  ),
  pioneer: () => (
    <>
      <Jungle />
      <path d="M20 72 Q50 36 84 72 Z" fill="#4d8f4f" />
      <path d="M74 64 L74 24" stroke={INK} strokeWidth="1.6" />
      <path d="M74 24 L90 29 L74 34 Z" fill="#c4573a" />
      <Hero type="pioneer" x={60} y={58} size={54} />
    </>
  ),
  giantMachete: () => (
    <>
      <Jungle sun={false} />
      <path d="M60 10 L60 0 M44 16 L38 8 M76 16 L82 8 M36 30 L26 28 M84 30 L94 28" stroke="#fff4c9" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M38 74 Q60 62 82 74 L78 80 H42 Z" fill="#7a4a22" />
      <Hero type="giantMachete" x={60} y={72} size={60} />
    </>
  ),
  sailor: () => (
    <>
      <River />
      <Hero type="sailor" x={58} y={66} size={48} />
      <path d="M32 60 Q60 70 90 60 L84 67 Q60 73 38 67 Z" fill="#9c5b2e" stroke={INK} strokeWidth="1" />
      <path d="M68 38 L78 72" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="78" cy="72" rx="2.5" ry="5" fill={INK} transform="rotate(-18 78 72)" />
    </>
  ),
  captain: () => (
    <>
      <River />
      <rect x="40" y="34" width="5" height="16" fill={INK} />
      <circle cx="46" cy="28" r="4" fill="#e6eef4" />
      <circle cx="52" cy="22" r="5" fill="#eef4f8" />
      <path d="M28 62 H90 L84 70 H34 Z" fill="#f4efe3" stroke={INK} strokeWidth="1" />
      <rect x="34" y="50" width="22" height="12" fill="#c4573a" stroke={INK} strokeWidth="1" />
      <Hero type="captain" x={66} y={62} size={44} />
      <circle cx="78" cy="50" r="6" fill="none" stroke={INK} strokeWidth="1.6" />
      <path d="M78 44 V56 M72 50 H84" stroke={INK} strokeWidth="1.2" />
    </>
  ),
  traveler: () => (
    <>
      <Gold />
      <rect x="70" y="50" width="18" height="18" rx="4" fill="#8b5a2b" stroke={INK} strokeWidth="1.2" />
      <rect x="69" y="46" width="20" height="6" rx="3" fill="#c4573a" stroke={INK} strokeWidth="1" />
      <Coin x={80} y={40} r={4} />
      <Hero type="traveler" x={62} y={75} size={58} />
    </>
  ),
  photographer: () => (
    <>
      <Gold />
      <path d="M32 50 V26 M88 50 V26" stroke="#7a4a22" strokeWidth="2" />
      <path d="M28 26 L34 16 H86 L92 26 Z" fill="#f4efe3" stroke={INK} strokeWidth="1" />
      <path d="M40 16 L36 26 M52 16 L50 26 M64 16 L64 26 M76 16 L78 26" stroke="#c4573a" strokeWidth="4" />
      <Hero type="photographer" x={60} y={62} size={52} />
      <rect x="30" y="50" width="60" height="20" fill="#a46a35" stroke={INK} strokeWidth="1" />
      <ellipse cx="46" cy="50" rx="6" ry="4" fill="#3e8e41" />
      <ellipse cx="62" cy="50" rx="6" ry="4" fill="#c4573a" />
      <Coin x={78} y={48} r={4} />
    </>
  ),
  journalist: () => (
    <>
      <Gold />
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx="80" cy={68 - i * 5} rx="9" ry="3.5" fill="#f2c14e" stroke="#8a5a12" strokeWidth="1" />
      ))}
      <Hero type="journalist" x={58} y={75} size={56} />
    </>
  ),
  treasureChest: () => (
    <>
      <Gold />
      <path d="M62 52 Q75 36 88 52" fill="#fff1b8" opacity="0.8" />
      <path d="M62 50 L88 50 L85 42 L65 42 Z" fill="#8b5a2b" stroke={INK} strokeWidth="1.2" />
      <rect x="62" y="52" width="26" height="18" rx="2" fill="#8b5a2b" stroke={INK} strokeWidth="1.2" />
      <rect x="72" y="52" width="6" height="8" fill="#f2c14e" stroke={INK} strokeWidth="1" />
      <Coin x={70} y={48} r={3.5} />
      <Coin x={80} y={47} r={3.5} />
      <Hero type="treasureChest" x={54} y={74} size={52} />
    </>
  ),
  millionaire: () => (
    <>
      <Gold />
      <Coin x={80} y={64} />
      <Coin x={86} y={57} r={4} />
      <Coin x={76} y={55} r={4} />
      <Hero type="millionaire" x={56} y={75} size={58} />
    </>
  ),
  jackOfAllTrades: () => (
    <>
      <Wild />
      <Hero type="jackOfAllTrades" x={60} y={74} size={58} />
    </>
  ),
  adventurer: () => (
    <>
      <Wild />
      <path d="M0 80 V56 H40 V80 Z M82 80 V54 H120 V80 Z" fill="#6c5a3e" />
      <path d="M62 0 Q60 22 70 34" stroke="#4d8f4f" strokeWidth="2" fill="none" />
      <Hero type="adventurer" x={60} y={58} size={52} />
    </>
  ),
  propPlane: () => (
    <>
      <Wild />
      <ellipse cx="22" cy="58" rx="16" ry="6" fill="#fff" opacity="0.9" />
      <ellipse cx="98" cy="62" rx="18" ry="6" fill="#fff" opacity="0.9" />
      <ellipse cx="60" cy="28" rx="34" ry="13" fill="#e9dfc6" stroke={INK} strokeWidth="1.2" />
      <path d="M30 28 H90" stroke="#c4573a" strokeWidth="2" />
      <path d="M92 22 L102 16 L100 28 L102 40 L92 34 Z" fill="#c4573a" stroke={INK} strokeWidth="1" />
      <rect x="50" y="44" width="20" height="8" rx="2" fill="#8b5a2b" stroke={INK} strokeWidth="1" />
      <path d="M52 40 L54 44 M68 40 L66 44" stroke={INK} strokeWidth="1" />
    </>
  ),
  transmitter: () => (
    <>
      <Dusk />
      <rect x="46" y="10" width="4" height="44" fill="#5a3f2a" />
      <path d="M38 16 H58 M40 23 H56" stroke="#5a3f2a" strokeWidth="2.5" />
      <path d="M0 22 Q20 28 38 16 M58 16 Q90 28 120 20" stroke={INK} strokeWidth="1" fill="none" />
      <path d="M60 2 L55 10 L60 10 L53 20" stroke="#f2c14e" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <Hero type="transmitter" x={64} y={46} size={44} />
    </>
  ),
  cartographer: () => (
    <>
      <Dusk />
      <path d="M30 12 L48 8 L66 12 L84 8 V40 L66 44 L48 40 L30 44 Z" fill="#f6ecd2" stroke={INK} strokeWidth="1.2" />
      <path d="M48 8 V40 M66 12 V44" stroke="#d9c9a3" strokeWidth="1" />
      <path d="M36 36 Q46 24 56 30 T78 18" stroke="#c4573a" strokeWidth="1.6" strokeDasharray="3 2.5" fill="none" />
      <path d="M75 15 L81 21 M81 15 L75 21" stroke="#c4573a" strokeWidth="2" />
      <Hero type="cartographer" x={64} y={46} size={44} />
    </>
  ),
  scientist: () => (
    <>
      <Dusk />
      <path d="M42 46 Q48 26 62 20 Q58 34 60 46 Z" fill="#3e8e41" />
      <path d="M52 14 Q46 6 49 17 Q43 20 52 19 Q58 25 55 16 Q61 11 52 14 Z" fill="#f2c14e" stroke={INK} strokeWidth="0.8" />
      <Hero type="scientist" x={66} y={46} size={44} />
    </>
  ),
  travelLog: () => (
    <>
      <Dusk />
      <path d="M36 44 L48 22 L60 44 Z" fill="#c4573a" stroke={INK} strokeWidth="1" />
      <path d="M48 22 L48 44" stroke={INK} strokeWidth="1" />
      <Hero type="travelLog" x={64} y={46} size={46} />
    </>
  ),
  compass: () => (
    <>
      <Dusk />
      <path d="M36 62 A30 30 0 0 1 84 62 Z" fill="#e2ad46" stroke={INK} strokeWidth="1.4" />
      <path d="M60 62 L60 24 M60 62 L44 36" stroke={INK} strokeWidth="1.8" />
      <circle cx="60" cy="24" r="4" fill="#c4573a" stroke={INK} strokeWidth="1" />
      <path d="M42 56 A20 20 0 0 1 78 56" stroke="#8a5a12" strokeWidth="1" fill="none" strokeDasharray="1.5 2" />
      <path d="M92 16 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#fff" />
    </>
  ),
  native: () => (
    <>
      <Jungle />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={44 + i * 7} cy={i % 2 === 0 ? 42 : 45} rx="2.2" ry="1.3" fill="#2c6a30" />
      ))}
      <Hero type="native" x={64} y={46} size={46} />
    </>
  ),
};

export function CardArt({ type }: { type: CardType }) {
  return <Scene>{ART[type]()}</Scene>;
}
