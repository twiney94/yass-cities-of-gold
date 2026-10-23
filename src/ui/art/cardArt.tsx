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

type Pose = 'down' | 'up' | 'forward';
type Hat = 'brim' | 'top' | 'none';

const ARMS: Record<Pose, string> = {
  down: 'M-5 -23 L-7 -22 L-7.5 -13 L-5.5 -13 Z M5 -23 L7 -22 L7.5 -13 L5.5 -13 Z',
  up: 'M-5 -23 L-7 -22 L-7.5 -13 L-5.5 -13 Z M4.5 -23 L6 -24.5 L10 -33 L8.5 -34 L4 -25 Z',
  forward: 'M-5 -23 L-7 -22 L-7.5 -13 L-5.5 -13 Z M4.5 -23 L13 -21 L13 -19 L4.5 -20.5 Z',
};

const HATS: Record<Hat, string> = {
  brim: 'M-7.5 -30.5 L7.5 -30.5 L6 -32 L3 -32 L2.5 -35.5 L-2.5 -35.5 L-3 -32 L-6 -32 Z',
  top: 'M-6 -31 L6 -31 L6 -32.5 L3.5 -32.5 L3.5 -40 L-3.5 -40 L-3.5 -32.5 L-6 -32.5 Z',
  none: '',
};

// A traveller seen side-on, feet at (x, y), facing right; hands end near (9.5,-34) raised or (13,-20) forward.
const Figure = ({ x, y, scale = 1, pose = 'down', hat = 'brim', color = INK }: { x: number; y: number; scale?: number; pose?: Pose; hat?: Hat; color?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} fill={color}>
    <path d="M-5 0 L-1.5 0 L-0.5 -12 L-4.5 -12 Z M0.5 0 L4 0 L4.5 -12 L0.5 -12 Z" />
    <path d="M-5.5 -12 L5.5 -12 L4.5 -24 L-4.5 -24 Z" />
    <circle cx="0" cy="-28" r="4" />
    <path d={ARMS[pose]} />
    {hat !== 'none' && <path d={HATS[hat]} />}
  </g>
);

const Coin = ({ x, y, r = 5 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="#f2c14e" stroke="#8a5a12" strokeWidth="1.2" />
    <circle cx={x} cy={y} r={r * 0.55} fill="none" stroke="#b9821e" strokeWidth="1" />
  </g>
);

const Blade = ({ transform }: { transform: string }) => (
  <g transform={transform}>
    <path d="M0 0 L4 0 L5 -26 Q2 -30 -1 -26 Z" fill="#dfe6ea" stroke={INK} strokeWidth="1" />
    <rect x="-1" y="0" width="6" height="9" rx="1.5" fill="#7a4a22" stroke={INK} strokeWidth="1" />
  </g>
);

const ART: Record<CardType, () => ReactNode> = {
  explorer: () => (
    <>
      <Jungle />
      <Figure x={56} y={68} pose="up" />
      <Blade transform="translate(63 37) rotate(30)" />
      <path d="M70 70 Q76 56 86 52 Q80 62 82 70 Z M30 70 Q34 58 42 54 Q38 64 40 70 Z" fill="#2c6a30" />
    </>
  ),
  scout: () => (
    <>
      <Jungle />
      <path d="M30 70 L44 50 L66 52 L76 70 Z" fill="#6c7d6a" />
      <Figure x={54} y={52} pose="forward" />
      <rect x="66" y="31" width="12" height="3.4" rx="1.2" fill="#b98a3a" stroke={INK} strokeWidth="0.8" transform="rotate(-12 66 31)" />
    </>
  ),
  trailblazer: () => (
    <>
      <Jungle sun={false} />
      <path d="M60 18 Q86 30 82 62 Q60 56 46 40 Q42 28 60 18 Z" fill="#2c6a30" />
      <path d="M60 18 Q64 40 82 62" stroke="#8cc47a" strokeWidth="1.5" fill="none" />
      <Blade transform="translate(46 62) rotate(-35)" />
      <Blade transform="translate(70 66) rotate(35)" />
    </>
  ),
  pioneer: () => (
    <>
      <Jungle />
      <path d="M20 70 Q48 34 80 70 Z" fill="#4d8f4f" />
      <Figure x={44} y={50} pose="up" />
      <path d="M53 50 L53 18" stroke={INK} strokeWidth="1.6" />
      <path d="M53 18 L72 23 L53 29 Z" fill="#c4573a" />
    </>
  ),
  giantMachete: () => (
    <>
      <Jungle sun={false} />
      <path d="M60 10 L60 0 M44 16 L38 8 M76 16 L82 8 M36 30 L26 28 M84 30 L94 28" stroke="#fff4c9" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M40 72 Q60 62 80 72 L76 78 H44 Z" fill="#7a4a22" />
      <g transform="translate(55 64)">
        <path d="M0 0 L10 0 L13 -50 Q6 -58 -2 -50 Z" fill="#e8eef1" stroke={INK} strokeWidth="1.4" />
      </g>
    </>
  ),
  sailor: () => (
    <>
      <River />
      <path d="M32 58 Q60 68 90 58 L84 64 Q60 70 38 64 Z" fill="#9c5b2e" stroke={INK} strokeWidth="1" />
      <Figure x={58} y={60} scale={0.8} pose="forward" hat="none" />
      <path d="M70 42 L80 70" stroke={INK} strokeWidth="1.8" />
      <ellipse cx="80" cy="70" rx="2.5" ry="5" fill={INK} transform="rotate(-20 80 70)" />
    </>
  ),
  captain: () => (
    <>
      <River />
      <path d="M28 60 H88 L82 68 H34 Z" fill="#f4efe3" stroke={INK} strokeWidth="1" />
      <rect x="40" y="50" width="30" height="10" fill="#c4573a" stroke={INK} strokeWidth="1" />
      <rect x="58" y="34" width="5" height="16" fill={INK} />
      <circle cx="64" cy="28" r="4" fill="#e6eef4" />
      <circle cx="70" cy="22" r="5" fill="#eef4f8" />
      <circle cx="84" cy="60" r="8" fill="none" stroke={INK} strokeWidth="1.6" />
      <path d="M84 52 V68 M76 60 H92" stroke={INK} strokeWidth="1.2" />
    </>
  ),
  traveler: () => (
    <>
      <Gold />
      <rect x="44" y="34" width="30" height="30" rx="6" fill="#8b5a2b" stroke={INK} strokeWidth="1.2" />
      <rect x="48" y="46" width="22" height="12" rx="3" fill="#a46a35" stroke={INK} strokeWidth="1" />
      <rect x="42" y="28" width="34" height="8" rx="4" fill="#c4573a" stroke={INK} strokeWidth="1" />
      <Coin x={82} y={60} />
    </>
  ),
  photographer: () => (
    <>
      <Gold />
      <rect x="30" y="44" width="60" height="22" fill="#a46a35" stroke={INK} strokeWidth="1" />
      <path d="M26 44 L34 30 H86 L94 44 Z" fill="#f4efe3" stroke={INK} strokeWidth="1" />
      <path d="M38 30 L34 44 M50 30 L48 44 M62 30 L62 44 M74 30 L76 44" stroke="#c4573a" strokeWidth="5" />
      <ellipse cx="44" cy="44" rx="6" ry="4" fill="#3e8e41" />
      <ellipse cx="60" cy="44" rx="6" ry="4" fill="#c4573a" />
      <Coin x={76} y={42} r={4} />
    </>
  ),
  journalist: () => (
    <>
      <Gold />
      <rect x="64" y="38" width="26" height="26" rx="2" fill="#f4efe3" stroke={INK} strokeWidth="1" />
      <path d="M68 46 h18 M68 52 h18 M68 58 h12" stroke="#8a7b5b" strokeWidth="1.5" />
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx="44" cy={62 - i * 5} rx="11" ry="4" fill="#f2c14e" stroke="#8a5a12" strokeWidth="1" />
      ))}
    </>
  ),
  treasureChest: () => (
    <>
      <Gold />
      <path d="M36 44 Q60 22 84 44" fill="#fff1b8" opacity="0.8" />
      <path d="M38 40 L82 40 L78 26 L42 26 Z" fill="#8b5a2b" stroke={INK} strokeWidth="1.2" />
      <rect x="38" y="44" width="44" height="22" rx="2" fill="#8b5a2b" stroke={INK} strokeWidth="1.2" />
      <rect x="56" y="44" width="8" height="10" fill="#f2c14e" stroke={INK} strokeWidth="1" />
      <Coin x={50} y={42} r={4} />
      <Coin x={62} y={40} r={4} />
      <Coin x={72} y={42} r={4} />
    </>
  ),
  millionaire: () => (
    <>
      <Gold />
      <Figure x={50} y={66} hat="top" pose="forward" />
      <path d="M63 46 L66 66" stroke={INK} strokeWidth="1.8" />
      <Coin x={80} y={62} />
      <Coin x={88} y={56} r={4} />
      <Coin x={76} y={54} r={4} />
    </>
  ),
  jackOfAllTrades: () => (
    <>
      <Wild />
      <Figure x={56} y={66} pose="forward" />
      <path d="M69 46 L72 68" stroke="#7a4a22" strokeWidth="1.8" />
      <circle cx="44" cy="40" r="5" fill="#f4efe3" stroke={INK} strokeWidth="1" />
      <path d="M44 45 L50 52" stroke={INK} strokeWidth="1.2" />
    </>
  ),
  adventurer: () => (
    <>
      <Wild />
      <path d="M0 80 V56 H34 V80 Z M86 80 V54 H120 V80 Z" fill="#6c5a3e" />
      <path d="M60 0 Q58 22 68 34" stroke="#4d8f4f" strokeWidth="2" fill="none" />
      <Figure x={66} y={60} pose="up" scale={0.9} />
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
      <rect x="56" y="18" width="5" height="52" fill="#5a3f2a" />
      <path d="M44 24 H74 M46 32 H72" stroke="#5a3f2a" strokeWidth="2.5" />
      <path d="M0 30 Q22 36 44 24 M74 24 Q98 36 120 28" stroke={INK} strokeWidth="1" fill="none" />
      <path d="M80 8 L74 18 L80 18 L72 30" stroke="#f2c14e" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
    </>
  ),
  cartographer: () => (
    <>
      <Dusk />
      <path d="M24 26 L48 20 L72 26 L96 20 V60 L72 66 L48 60 L24 66 Z" fill="#f6ecd2" stroke={INK} strokeWidth="1.2" />
      <path d="M48 20 V60 M72 26 V66" stroke="#d9c9a3" strokeWidth="1" />
      <path d="M32 54 Q44 40 56 48 T84 32" stroke="#c4573a" strokeWidth="1.6" strokeDasharray="3 2.5" fill="none" />
      <path d="M81 29 L87 35 M87 29 L81 35" stroke="#c4573a" strokeWidth="2" />
      <path d="M98 10 Q88 26 84 40" stroke={INK} strokeWidth="1.6" />
    </>
  ),
  scientist: () => (
    <>
      <Dusk />
      <path d="M38 64 Q46 40 64 34 Q58 52 62 64 Z" fill="#3e8e41" />
      <circle cx="72" cy="38" r="12" fill="#e6f1f6" fillOpacity="0.6" stroke={INK} strokeWidth="2" />
      <path d="M80 47 L92 60" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M50 26 Q42 16 46 30 Q38 34 50 32 Q58 40 54 28 Q62 22 50 26 Z" fill="#f2c14e" stroke={INK} strokeWidth="0.8" />
    </>
  ),
  travelLog: () => (
    <>
      <Dusk />
      <path d="M22 30 Q40 24 60 30 Q80 24 98 30 V66 Q80 60 60 66 Q40 60 22 66 Z" fill="#f6ecd2" stroke={INK} strokeWidth="1.2" />
      <path d="M60 30 V66" stroke="#d9c9a3" strokeWidth="1.2" />
      <path d="M28 38 h24 M28 44 h20 M28 50 h24" stroke="#8a7b5b" strokeWidth="1.3" />
      <path d="M68 52 L74 42 L80 48 L86 38 L92 52 Z" fill="#8cc47a" stroke={INK} strokeWidth="0.8" />
      <path d="M86 18 L96 34" stroke="#c4573a" strokeWidth="3" strokeLinecap="round" />
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
      <Figure x={44} y={68} pose="forward" />
      <path d="M38 40 L36 70" stroke="#7a4a22" strokeWidth="1.8" />
      <circle cx="58" cy="48" r="3.5" fill="#f2c14e" stroke={INK} strokeWidth="1" />
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={68 + i * 10} cy={i % 2 === 0 ? 70 : 74} rx="2.4" ry="1.4" fill="#2c6a30" />
      ))}
    </>
  ),
};

export function CardArt({ type }: { type: CardType }) {
  return <Scene>{ART[type]()}</Scene>;
}
