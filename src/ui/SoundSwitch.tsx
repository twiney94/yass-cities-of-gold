import { useMessages } from './i18n';
import { useSound } from './sound';

export function SoundSwitch() {
  const m = useMessages();
  const { muted, volume, toggle, setVolume } = useSound();
  const silent = muted || volume === 0;
  const label = silent ? m.sound.off : m.sound.on;
  return (
    <div className="sound">
      <button
        type="button"
        className="btn btn--small btn--round"
        aria-pressed={!silent}
        aria-label={label}
        title={label}
        onClick={() => (volume === 0 ? setVolume(0.5) : toggle())}
      >
        <svg className="sound-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
          {silent ? (
            <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
        </svg>
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
      </div>
    </div>
  );
}
