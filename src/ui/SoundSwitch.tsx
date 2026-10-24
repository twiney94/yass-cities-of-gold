import { useEffect, useRef, useState } from 'react';
import { cx } from './cx';
import { useMessages } from './i18n';
import { useSound } from './sound';

const SoundIcon = ({ silent }: { silent: boolean }) => (
  <svg className="sound-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
    {silent ? (
      <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    )}
  </svg>
);

// With a mouse the slider drops down on hover and a click mutes; touch screens have no hover, so a tap opens it.
export function SoundSwitch() {
  const m = useMessages();
  const { muted, volume, toggle, setVolume } = useSound();
  const [touch] = useState(() => window.matchMedia('(hover: none)').matches);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const silent = muted || volume === 0;
  const label = silent ? m.sound.off : m.sound.on;
  const flip = () => (volume === 0 ? setVolume(0.5) : toggle());

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div className={cx('sound', open && 'is-open')} ref={ref}>
      <button
        type="button"
        className="btn btn--small btn--round"
        aria-pressed={touch ? undefined : !silent}
        aria-expanded={touch ? open : undefined}
        aria-label={touch ? m.sound.volume : label}
        title={label}
        onClick={touch ? () => setOpen(!open) : flip}
      >
        <SoundIcon silent={silent} />
      </button>
      <div className="sound__drop">
        <input
          type="range"
          className="sound__slider"
          min={0}
          max={100}
          value={muted ? 0 : Math.round(volume * 100)}
          aria-label={m.sound.volume}
          onChange={(event) => setVolume(Number(event.target.value) / 100)}
        />
        {touch && (
          <button type="button" className="btn btn--small btn--round sound__mute" aria-pressed={!silent} aria-label={label} onClick={flip}>
            <SoundIcon silent={silent} />
          </button>
        )}
      </div>
    </div>
  );
}
