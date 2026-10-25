import { type CSSProperties, type RefObject, useEffect, useLayoutEffect, useState } from 'react';
import { canAutoplay, playMusic, unlockMusic } from './music';
import { useSound } from './sound';

export type IntroPhase = 'gate' | 'black' | 'presents' | 'yass' | 'title' | 'colour' | 'menu';

const NEXT: Partial<Record<IntroPhase, [IntroPhase, number]>> = {
  black: ['presents', 1100],
  presents: ['yass', 2200],
  yass: ['title', 1100],
  title: ['colour', 1400],
  colour: ['menu', 4300],
};
const SCALE = 1.8;
const LOGO_FONTS = ['900 72px "Cinzel Decorative"', '700 18px Cinzel'];

type Frame = { presents: number; alone: number; y: number; logoX: number; logoY: number; scale: number };

let played = false;

// Phones skip the tap-to-start screen: the intro plays silently and the music starts with the first tap.
const firstPhase = (): IntroPhase => {
  if (played || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'menu';
  const skipGate = useSound.getState().muted || canAutoplay() || window.matchMedia('(pointer: coarse)').matches;
  return skipGate ? 'black' : 'gate';
};

// The logo is held at the middle of the screen until the menu comes in. "Yass presents…" is centred on
// top of it, then "Yass'" glides back to its place above the title. Positions come from the untransformed
// logo, measured once its fonts have loaded; "Yass'" rides on the logo's offset, so it is taken back out.
const measure = (yass: HTMLElement): Frame => {
  const box = yass.getBoundingClientRect();
  const logo = yass.closest('h1')!.getBoundingClientRect();
  const name = yass.querySelector('.logo__name')!.getBoundingClientRect();
  const apostrophe = yass.querySelector<HTMLElement>('.logo__apostrophe')!.scrollWidth;
  const presents = yass.querySelector('.logo__presents')?.getBoundingClientRect().right ?? box.right;
  const scale = Math.min(SCALE, (window.innerWidth * 0.86) / (presents - box.left));
  const center = window.innerWidth / 2;
  const logoX = center - (logo.left + logo.width / 2);
  return {
    presents: center - ((presents - box.left) * scale) / 2 - box.left - logoX,
    alone: center - ((name.right - box.left + apostrophe) * scale) / 2 - box.left - logoX,
    y: logo.top + logo.height / 2 - (box.top + box.height / 2),
    logoX,
    logoY: window.innerHeight / 2 - (logo.top + logo.height / 2),
    scale,
  };
};

export const useIntro = (yass: RefObject<HTMLElement | null>) => {
  const [phase, setPhase] = useState(firstPhase);
  const [withIntro] = useState(() => phase !== 'menu');
  const [frame, setFrame] = useState<Frame | null>(null);

  useLayoutEffect(() => {
    if (!withIntro) return;
    let live = true;
    // Safari can report the fonts ready before it has even started on the logo's, so ask for them by name.
    void Promise.allSettled(LOGO_FONTS.map((font) => document.fonts.load(font)))
      .then(() => document.fonts.ready)
      .then(() => live && yass.current && setFrame(measure(yass.current)));
    return () => {
      live = false;
    };
  }, [withIntro, yass]);

  useEffect(() => {
    const step = NEXT[phase];
    if (!step || (phase === 'black' && !frame)) return;
    const timer = window.setTimeout(() => setPhase(step[0]), step[1]);
    return () => window.clearTimeout(timer);
  }, [phase, frame]);

  useEffect(() => {
    if (phase === 'title' || phase === 'menu') playMusic('menu');
    if (phase === 'menu') played = true;
  }, [phase]);

  useEffect(() => {
    if (!withIntro || phase === 'menu' || phase === 'gate') return;
    const onKey = (event: KeyboardEvent) => (event.key === 'Escape' || event.key === 'Enter') && setPhase('menu');
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [withIntro, phase]);

  const centred = phase === 'gate' || phase === 'black' || phase === 'presents';
  const style = frame
    ? ({
        '--intro-x': `${centred ? frame.presents : frame.alone}px`,
        '--intro-y': `${frame.y}px`,
        '--intro-logo-x': `${frame.logoX}px`,
        '--intro-logo-y': `${frame.logoY}px`,
        '--intro-scale': frame.scale,
      } as CSSProperties)
    : undefined;

  return {
    phase,
    withIntro,
    style,
    begin: () => {
      unlockMusic();
      setPhase('black');
    },
    skip: () => setPhase('menu'),
  };
};
