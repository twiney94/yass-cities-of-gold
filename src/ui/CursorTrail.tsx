import { useEffect, useRef } from 'react';

type Glint = { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; phase: number };

const SPACING = 7;
const MAX_GLINTS = 140;

const makeSprite = () => {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const context = sprite.getContext('2d')!;
  const glow = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgb(255 248 220)');
  glow.addColorStop(0.15, 'rgb(255 214 120 / 80%)');
  glow.addColorStop(0.45, 'rgb(242 170 60 / 22%)');
  glow.addColorStop(1, 'rgb(242 170 60 / 0%)');
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  context.fillStyle = 'rgb(255 245 210 / 90%)';
  context.beginPath();
  for (const [x, y] of [[32, 2], [34, 30], [62, 32], [34, 34], [32, 62], [30, 34], [2, 32], [30, 30]]) context.lineTo(x, y);
  context.fill();
  return sprite;
};

// Gold glints follow the mouse. Nothing runs while the mouse is still, and touch input is ignored.
export function CursorTrail() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = ref.current!;
    const context = canvas.getContext('2d')!;
    const sprite = makeSprite();
    const glints: Glint[] = [];
    let previous: { x: number; y: number } | null = null;
    let frame = 0;
    let last = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.globalCompositeOperation = 'lighter';
    };

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = glints.length - 1; i >= 0; i--) {
        const glint = glints[i];
        glint.age += dt;
        if (glint.age >= glint.life) {
          glints.splice(i, 1);
          continue;
        }
        const t = glint.age / glint.life;
        glint.vy += 40 * dt;
        glint.x += glint.vx * dt;
        glint.y += glint.vy * dt;
        const size = glint.size * (1 - 0.6 * t);
        context.globalAlpha = (1 - t) ** 1.5 * (0.65 + 0.35 * Math.sin(glint.age * 22 + glint.phase));
        context.drawImage(sprite, glint.x - size / 2, glint.y - size / 2, size, size);
      }
      frame = glints.length ? requestAnimationFrame(tick) : 0;
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const from = previous ?? { x: event.clientX, y: event.clientY };
      previous = { x: event.clientX, y: event.clientY };
      const steps = Math.min(6, Math.floor(Math.hypot(event.clientX - from.x, event.clientY - from.y) / SPACING));
      for (let i = 1; i <= steps && glints.length < MAX_GLINTS; i++) {
        glints.push({
          x: from.x + ((event.clientX - from.x) * i) / steps,
          y: from.y + ((event.clientY - from.y) * i) / steps,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.6) * 30,
          age: 0,
          life: 0.5 + Math.random() * 0.4,
          size: 6 + Math.random() * 10,
          phase: Math.random() * Math.PI * 2,
        });
      }
      if (glints.length && !frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const leave = () => {
      previous = null;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', move);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
    };
  }, []);

  return <canvas ref={ref} className="cursor-trail" aria-hidden="true" />;
}
