import type { CSSProperties } from 'react';
import backdrop from './art/menu-backdrop.webp';

const MOTES = Array.from({ length: 18 }, (_, i) => {
  const duration = 9 + ((i * 2.3) % 7);
  return {
    '--x': `${32 + ((i * 0.618) % 1) * 64}%`,
    '--y': `${62 + ((i * 0.414) % 1) * 30}%`,
    '--size': `${2 + (i % 3)}px`,
    '--drift': `${(i % 2 ? 1 : -1) * (8 + (i % 5) * 4)}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${-((i * 1.7) % duration)}s`,
  } as CSSProperties;
});

export function MenuScene() {
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene__frame">
        <img className="scene__art" src={backdrop} alt="" />
        <div className="scene__sun" />
        <div className="scene__sky">
          <div className="scene__clouds scene__clouds--far" />
          <div className="scene__clouds scene__clouds--near" />
        </div>
        <div className="scene__mist">
          <div className="scene__clouds scene__clouds--mist" />
        </div>
        {MOTES.map((style, i) => (
          <i key={i} className="scene__mote" style={style} />
        ))}
      </div>
      <div className="scene__shade" />
    </div>
  );
}
