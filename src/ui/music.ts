import gameTheme from './audio/treasure-of-the-lost-city-in-game.mp3';
import menuTheme from './audio/treasure-of-the-lost-city.mp3';
import { useSound } from './sound';

export type MusicScene = 'menu' | 'game';

const SOURCES: Record<MusicScene, string> = { menu: menuTheme, game: gameTheme };
const VOLUME = 0.4;
const FADE_STEPS = 24;
const FADE_TIME = 1600;

const tracks = new Map<MusicScene, HTMLAudioElement>();
const fades = new Map<HTMLAudioElement, number>();
let scene: MusicScene | null = null;

const track = (name: MusicScene) => {
  let audio = tracks.get(name);
  if (!audio) {
    audio = new Audio(SOURCES[name]);
    audio.loop = true;
    audio.volume = 0;
    tracks.set(name, audio);
  }
  return audio;
};

const fadeTo = (audio: HTMLAudioElement, target: number, done?: () => void) => {
  window.clearInterval(fades.get(audio));
  const start = audio.volume;
  let step = 0;
  const fade = window.setInterval(() => {
    step++;
    audio.volume = start + ((target - start) * step) / FADE_STEPS;
    if (step < FADE_STEPS) return;
    window.clearInterval(fade);
    fades.delete(audio);
    done?.();
  }, FADE_TIME / FADE_STEPS);
  fades.set(audio, fade);
};

// Browsers refuse to start audio before the visitor has interacted; try again on the first click or key.
const retryOnGesture = () => {
  const retry = () => {
    window.removeEventListener('pointerdown', retry);
    window.removeEventListener('keydown', retry);
    sync();
  };
  window.addEventListener('pointerdown', retry);
  window.addEventListener('keydown', retry);
};

// The wanted scene fades in, every other track fades out and stops; muting fades everything out.
const sync = () => {
  const muted = useSound.getState().muted;
  for (const [name, audio] of tracks) {
    if (name === scene && !muted) {
      audio.play().catch(retryOnGesture);
      fadeTo(audio, VOLUME);
    } else if (!audio.paused) {
      fadeTo(audio, 0, () => audio.pause());
    }
  }
};

useSound.subscribe(sync);

export const canAutoplay = () =>
  (navigator as Navigator & { getAutoplayPolicy?: (type: 'mediaelement') => string }).getAutoplayPolicy?.('mediaelement') === 'allowed';

// Called from a click so the browser lets both tracks play later, when the intro or a game needs them.
export const unlockMusic = () => {
  for (const name of Object.keys(SOURCES) as MusicScene[]) {
    const audio = track(name);
    audio.muted = true;
    void audio
      .play()
      .then(() => audio.pause())
      .catch(() => undefined)
      .finally(() => {
        audio.muted = false;
      });
  }
};

export const playMusic = (next: MusicScene) => {
  if (scene === next) return;
  scene = next;
  track(next);
  sync();
};
