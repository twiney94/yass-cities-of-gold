import { useEffect, useLayoutEffect, useRef } from 'react';
import type { IntroPhase } from './intro';

const SIZE = 320;
const DURATION = 2600;
const GLOW = 0.03;
const EMBER = 0.014;
const CHAR = 0.06;

type Spark = { x: number; y: number; vx: number; vy: number; life: number };

const smooth = (t: number) => t * t * (3 - 2 * t);

const noiseField = (w: number, h: number) => {
  const field = new Float32Array(w * h);
  let amplitude = 0.5;
  for (let cell = 64; cell >= 4; cell /= 2, amplitude /= 2) {
    const gw = Math.ceil(w / cell) + 2;
    const grid = Float32Array.from({ length: gw * (Math.ceil(h / cell) + 2) }, Math.random);
    for (let y = 0; y < h; y++) {
      const y0 = Math.floor(y / cell);
      const sy = smooth(y / cell - y0);
      for (let x = 0; x < w; x++) {
        const x0 = Math.floor(x / cell);
        const sx = smooth(x / cell - x0);
        const i = y0 * gw + x0;
        const top = grid[i] + (grid[i + 1] - grid[i]) * sx;
        const bottom = grid[i + gw] + (grid[i + gw + 1] - grid[i + gw]) * sx;
        field[y * w + x] += amplitude * (top + (bottom - top) * sy);
      }
    }
  }
  return field;
};

// The black screen burns away like paper lit from the bottom edge: a hot rim, charred margin and sparks.
const burn = (canvas: HTMLCanvasElement) => {
  const { width: w, height: h } = canvas;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(w, h);
  const fuel = noiseField(w, h).map((n, i) => (1 - Math.floor(i / w) / h) * 0.7 + n * 0.55);
  const sparks: Spark[] = [];
  const start = performance.now();
  let last = start;
  let frame = 0;

  const draw = (now: number) => {
    const t = Math.min(1, (now - start) / DURATION);
    const dt = (now - last) / 1000;
    last = now;
    const front = -0.08 + 1.42 * smooth(t);
    const data = image.data;
    for (let i = 0; i < fuel.length; i++) {
      const d = fuel[i] - front;
      const p = i * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 255;
      if (d < -GLOW) {
        a = 0;
      } else if (d < 0) {
        r = 255;
        g = 120;
        b = 30;
        a = 150 * (1 + d / GLOW);
      } else if (d < EMBER) {
        const k = d / EMBER;
        r = 255;
        g = 235 - 150 * k;
        b = 140 - 120 * k;
        if (sparks.length < 160 && Math.random() < 0.003) {
          sparks.push({ x: i % w, y: Math.floor(i / w), vx: (Math.random() - 0.5) * 12, vy: -12 - Math.random() * 30, life: 1 });
        }
      } else if (d < CHAR) {
        const k = (d - EMBER) / (CHAR - EMBER);
        r = 190 - 172 * k;
        g = 50 - 42 * k;
        b = 10 - 6 * k;
      }
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = a;
    }
    context.globalCompositeOperation = 'source-over';
    context.putImageData(image, 0, 0);
    context.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i];
      spark.life -= dt * 0.9;
      if (spark.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      context.fillStyle = `rgb(255 ${150 + 80 * spark.life} 60 / ${spark.life})`;
      context.fillRect(spark.x, spark.y, 1.2, 1.2);
    }
    if (t < 1 || sparks.length) frame = requestAnimationFrame(draw);
  };

  frame = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(frame);
};

export function BurnVeil({ phase }: { phase: IntroPhase }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stop = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const canvas = ref.current!;
    const scale = SIZE / Math.max(window.innerWidth, window.innerHeight);
    canvas.width = Math.round(window.innerWidth * scale);
    canvas.height = Math.round(window.innerHeight * scale);
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (phase === 'colour' && !stop.current) stop.current = burn(ref.current!);
  }, [phase]);

  useEffect(() => () => stop.current?.(), []);

  return <canvas ref={ref} className="intro-veil" aria-hidden="true" />;
}
