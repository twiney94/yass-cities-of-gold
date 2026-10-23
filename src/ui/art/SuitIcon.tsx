import type { ReactNode } from 'react';
import type { Suit } from '../../engine/cards';

export type Glyph = Suit | 'joker';

const GLYPHS: Record<Glyph, ReactNode> = {
  machete: (
    <>
      <path d="M8.5 15.5 L17.5 3.5 Q21.5 1.8 20.5 6.2 L11 18 Z" fill="currentColor" />
      <path d="M3 20.5 L7.6 14.6 L10.2 16.8 L5.6 22.6 Z" fill="currentColor" opacity="0.7" />
    </>
  ),
  paddle: (
    <>
      <path d="M20.5 2.5 L22 4 L11.5 14.5 L10 13 Z" fill="currentColor" />
      <ellipse cx="7" cy="17.5" rx="3.6" ry="6.4" transform="rotate(45 7 17.5)" fill="currentColor" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9.5" fill="#f2c14e" stroke="#7a4f0e" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="#a87418" strokeWidth="1.6" />
    </>
  ),
  joker: (
    <>
      <path d="M12 1.5 L14.6 9.4 L12 12 L9.4 9.4 Z" fill="#3e8e41" stroke="#fff" strokeWidth="0.8" />
      <path d="M22 16.5 L14.2 18.6 L12 12 L15.6 10.6 Z" fill="#2f7fc1" stroke="#fff" strokeWidth="0.8" />
      <path d="M2 16.5 L8.4 10.6 L12 12 L9.8 18.6 Z" fill="#e0b13a" stroke="#fff" strokeWidth="0.8" />
    </>
  ),
};

export function SuitIcon({ suit }: { suit: Glyph }) {
  return (
    <svg className="suit-icon" viewBox="0 0 24 24" aria-hidden="true">
      {GLYPHS[suit]}
    </svg>
  );
}
