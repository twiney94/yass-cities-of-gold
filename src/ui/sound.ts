import { create } from 'zustand';
import type { GameEvent } from '../engine/actions';

export type Sound = 'card' | 'draw' | 'hop' | 'coins' | 'break' | 'burn' | 'shuffle' | 'turn' | 'arrive' | 'victory' | 'dice';

const KEY = 'yass-cities-of-gold.muted';

const readMuted = () => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const useSound = create<{ muted: boolean; toggle: () => void }>((set, get) => ({
  muted: typeof localStorage === 'undefined' ? false : readMuted(),
  toggle: () => {
    const muted = !get().muted;
    try {
      localStorage.setItem(KEY, muted ? '1' : '0');
    } catch (error) {
      console.warn('The sound setting could not be saved', error);
    }
    set({ muted });
  },
}));

type Tone = { type?: OscillatorType; from: number; to?: number; at?: number; length: number; volume?: number };
type Noise = { at?: number; length: number; volume?: number; filter?: BiquadFilterType; frequency?: number; q?: number };

let context: AudioContext | null = null;

const tone = (ctx: AudioContext, { type = 'sine', from, to = from, at = 0, length, volume = 0.2 }: Tone) => {
  const start = ctx.currentTime + at;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(to, start + length);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + length + 0.02);
};

const noise = (ctx: AudioContext, { at = 0, length, volume = 0.2, filter = 'bandpass', frequency = 2000, q = 1 }: Noise) => {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = ctx.createBufferSource();
  const shape = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  shape.type = filter;
  shape.frequency.value = frequency;
  shape.Q.value = q;
  gain.gain.value = volume;
  source.connect(shape).connect(gain).connect(ctx.destination);
  source.start(ctx.currentTime + at);
};

const chord = (ctx: AudioContext, notes: number[], gap: number, length: number) =>
  notes.forEach((from, i) => tone(ctx, { type: 'triangle', from, at: i * gap, length: i === notes.length - 1 ? length * 2 : length, volume: 0.12 }));

const VOICES: Record<Sound, (ctx: AudioContext) => void> = {
  card: (ctx) => noise(ctx, { length: 0.09, frequency: 3200, q: 0.8, volume: 0.35 }),
  draw: (ctx) => {
    noise(ctx, { length: 0.07, frequency: 2600, volume: 0.22 });
    noise(ctx, { at: 0.09, length: 0.07, frequency: 2600, volume: 0.18 });
  },
  hop: (ctx) => {
    tone(ctx, { type: 'triangle', from: 320, to: 170, length: 0.08, volume: 0.22 });
    noise(ctx, { length: 0.03, filter: 'highpass', frequency: 1500, volume: 0.1 });
  },
  coins: (ctx) => {
    tone(ctx, { from: 1320, length: 0.25, volume: 0.1 });
    tone(ctx, { from: 1760, at: 0.06, length: 0.3, volume: 0.09 });
  },
  break: (ctx) => {
    noise(ctx, { length: 0.35, filter: 'lowpass', frequency: 700, volume: 0.5 });
    tone(ctx, { from: 110, to: 50, length: 0.3, volume: 0.3 });
  },
  burn: (ctx) => noise(ctx, { length: 0.5, frequency: 900, q: 0.6, volume: 0.22 }),
  shuffle: (ctx) => {
    for (let i = 0; i < 6; i++) noise(ctx, { at: i * 0.045, length: 0.04, frequency: 3000, volume: 0.16 });
  },
  turn: (ctx) => {
    tone(ctx, { type: 'triangle', from: 660, length: 0.25, volume: 0.07 });
    tone(ctx, { type: 'triangle', from: 880, at: 0.1, length: 0.35, volume: 0.07 });
  },
  arrive: (ctx) => chord(ctx, [523, 659, 784], 0.09, 0.4),
  victory: (ctx) => chord(ctx, [523, 659, 784, 1047], 0.12, 0.35),
  dice: (ctx) => {
    for (let i = 0; i < 7; i++) noise(ctx, { at: i * 0.07, length: 0.025, filter: 'highpass', frequency: 2500, volume: 0.22 });
  },
};

export const playSound = (sound: Sound, delay = 0) => {
  if (useSound.getState().muted) return;
  if (delay > 0) {
    window.setTimeout(() => playSound(sound), delay);
    return;
  }
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    VOICES[sound](context);
  } catch (error) {
    console.warn('A sound could not be played', error);
  }
};

const ONCE: Partial<Record<GameEvent['type'], Sound>> = {
  cardPlayed: 'card',
  cardGained: 'coins',
  blockadeBroken: 'break',
  cardsRemoved: 'burn',
  deckShuffled: 'shuffle',
  pieceArrived: 'arrive',
  turnStarted: 'turn',
  gameOver: 'victory',
};

// Hops follow the pawn across the board; drawn cards land just after they start to fly.
export const soundsFor = (events: GameEvent[], hopTime: number): { sound: Sound; at: number }[] => {
  const sounds: { sound: Sound; at: number }[] = [];
  let hops = 0;
  for (const event of events) {
    if (event.type === 'pieceMoved') sounds.push({ sound: 'hop', at: hops++ * hopTime });
    else if (event.type === 'cardsDrawn') sounds.push({ sound: 'draw', at: 120 });
    else {
      const sound = ONCE[event.type];
      if (sound) sounds.push({ sound, at: 0 });
    }
  }
  return sounds.filter((s, i) => s.sound === 'hop' || sounds.findIndex((other) => other.sound === s.sound) === i);
};
