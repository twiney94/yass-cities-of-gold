import { type ReactNode, useState } from 'react';
import type { CardType } from '../engine/cards';
import { CardView } from './CardView';
import { Dialog } from './Dialog';
import { Logo } from './Logo';
import { PAWN_PATH, PAWN_VIEWBOX } from './art/pawn';
import { cx } from './cx';
import { useMessages } from './i18n';

export function AboutDialog({ onClose }: { onClose: () => void }) {
  const m = useMessages();
  return (
    <Dialog
      title={m.about.title}
      className="about"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn--primary" onClick={onClose} autoFocus>
          {m.game.close}
        </button>
      }
    >
      <Logo small />
      <p className="muted">
        {m.about.version(__APP_VERSION__)} · {m.about.madeBy}
      </p>
      <p className="muted about__copyright">{m.about.copyright}</p>
      <dl className="credits">
        <dt>{m.about.characters}</dt>
        <dd>
          <a href="https://www.kaylousberg.com" target="_blank" rel="noreferrer">
            {m.about.charactersCredit}
          </a>
        </dd>
        <dt>{m.about.music}</dt>
        <dd>{m.about.musicCredit}</dd>
        <dt>{m.about.fonts}</dt>
        <dd>
          <a href="https://fonts.google.com/specimen/Cinzel" target="_blank" rel="noreferrer">
            {m.about.fontsCredit}
          </a>
        </dd>
        <dt>{m.about.builtWith}</dt>
        <dd>React, PixiJS, GSAP, Zustand</dd>
      </dl>
    </Dialog>
  );
}

const Hex = ({ fill, children }: { fill: string; children?: ReactNode }) => (
  <svg className="rules__hex" viewBox="-24 -24 48 48" aria-hidden="true">
    <polygon points="0,-22 19,-11 19,11 0,22 -19,11 -19,-11" fill={fill} stroke="#0f1a12" strokeWidth="2" />
    {children}
  </svg>
);

const MiniCard = ({ x, crossed }: { x: number; crossed?: boolean }) => (
  <g transform={`translate(${x} 0)`}>
    <rect x="-5" y="-7" width="10" height="14" rx="1.5" fill="#fbf4e3" stroke="#0f1a12" strokeWidth="1" />
    {crossed && <path d="M-3 -3 L3 3 M3 -3 L-3 3" stroke="#b3261e" strokeWidth="1.8" strokeLinecap="round" />}
  </g>
);

const RacePicture = () => (
  <div className="rules__picture">
    <svg className="rules__pawn" viewBox={PAWN_VIEWBOX} aria-hidden="true">
      <path d={PAWN_PATH} />
    </svg>
    <span className="rules__trail" aria-hidden="true" />
    <img className="rules__city" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
  </div>
);

const SpacesPicture = () => (
  <div className="rules__picture">
    <Hex fill="#8d9096">
      <MiniCard x={-3} />
      <MiniCard x={3} />
    </Hex>
    <Hex fill="#b8432f">
      <MiniCard x={0} crossed />
    </Hex>
    <Hex fill="#34353c">
      <path d="M-11 9 L0 -10 L11 9 Z" fill="#9aa0a8" stroke="#0f1a12" strokeWidth="1.5" />
      <path d="M-4 -3 L0 -10 L4 -3 Z" fill="#f4f6f8" />
    </Hex>
    <svg className="rules__hex" viewBox="-24 -24 48 48" aria-hidden="true">
      <rect x="-22" y="-5" width="44" height="10" rx="5" fill="#9a6232" stroke="#3d2310" strokeWidth="2" />
      {[-14, -7, 0, 7, 14].map((x) => (
        <path key={x} d={`M${x} -4 V4`} stroke="#3d2310" strokeWidth="1.2" />
      ))}
    </svg>
  </div>
);

const CardsPicture = ({ types }: { types: CardType[] }) => (
  <div className="rules__picture rules__cards">
    {types.map((type) => (
      <CardView key={type} type={type} size="small" />
    ))}
  </div>
);

const PICTURES = [
  <RacePicture key="race" />,
  <CardsPicture key="move" types={['explorer', 'sailor', 'traveler', 'jackOfAllTrades']} />,
  <SpacesPicture key="spaces" />,
  <CardsPicture key="market" types={['scout', 'photographer', 'trailblazer']} />,
  <CardsPicture key="actions" types={['cartographer', 'native', 'giantMachete']} />,
];

export function RulesDialog({ onClose }: { onClose: () => void }) {
  const m = useMessages();
  const [page, setPage] = useState(0);
  const { pages } = m.rules;
  const current = pages[page]!;
  const last = page === pages.length - 1;
  return (
    <Dialog
      title={m.menu.howToPlay}
      className="rules"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
            {m.rules.back}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => (last ? onClose() : setPage(page + 1))} autoFocus>
            {last ? m.rules.done : m.rules.next}
          </button>
        </>
      }
    >
      {PICTURES[page]}
      <h3 className="rules__title">{current.title}</h3>
      <p className="rules__body">{current.body}</p>
      <div className="rules__dots">
        {pages.map((p, i) => (
          <button
            key={p.title}
            type="button"
            className={cx('rules__dot', i === page && 'is-on')}
            aria-label={p.title}
            aria-current={i === page}
            onClick={() => setPage(i)}
          />
        ))}
      </div>
    </Dialog>
  );
}
