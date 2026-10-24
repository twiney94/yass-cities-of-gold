import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel-decorative/900.css';
import favicon from '../../public/favicon.svg?url';

const FIGURES = import.meta.glob<string>('../../src/ui/art/figures/*.webp', { eager: true, query: '?url', import: 'default' });
const BACKGROUND = '#14271c';

const image = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const canvas = (width: number, height: number) => {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  return { element, context: element.getContext('2d')! };
};

// The icon is drawn inside the inner 80% so launchers that crop to a circle keep the whole temple.
const icon = async (size: number, inset: number) => {
  const { element, context } = canvas(size, size);
  context.fillStyle = BACKGROUND;
  context.fillRect(0, 0, size, size);
  const art = await image(favicon);
  context.drawImage(art, size * inset, size * inset, size * (1 - 2 * inset), size * (1 - 2 * inset));
  return element;
};

const social = async () => {
  const { element, context } = canvas(1200, 630);
  const glow = context.createRadialGradient(600, 250, 40, 600, 300, 700);
  glow.addColorStop(0, '#2b4d38');
  glow.addColorStop(1, '#0f1d15');
  context.fillStyle = glow;
  context.fillRect(0, 0, 1200, 630);

  await document.fonts.load('900 110px "Cinzel Decorative"');
  await document.fonts.load('700 34px "Cinzel"');
  const title = 'CITIES OF GOLD';
  context.font = '900 110px "Cinzel Decorative"';
  const width = context.measureText(title).width;
  const left = (1200 - width) / 2;
  const gold = context.createLinearGradient(0, 130, 0, 250);
  gold.addColorStop(0, '#fff4c8');
  gold.addColorStop(0.4, '#f6cf5f');
  gold.addColorStop(0.65, '#c3841a');
  gold.addColorStop(1, '#f0c255');
  context.fillStyle = '#5b3a0b';
  context.fillText(title, left, 236);
  context.fillStyle = gold;
  context.fillText(title, left, 232);
  context.font = '700 34px "Cinzel"';
  context.fillStyle = '#f2c14e';
  context.fillText("Y A S S'", left + 8, 128);
  context.font = '500 30px system-ui, sans-serif';
  context.fillStyle = '#d8e0d2';
  context.textAlign = 'center';
  context.fillText('A deck-building race through the jungle', 600, 300);

  const heroes = ['explorer', 'sailor', 'scientist', 'pioneer', 'jackOfAllTrades'];
  for (const [i, name] of heroes.entries()) {
    const url = FIGURES[`../../src/ui/art/figures/${name}.webp`];
    if (!url) continue;
    context.drawImage(await image(url), 90 + i * 210, 330, 290, 290);
  }
  return element;
};

const save = async (name: string, element: HTMLCanvasElement) => {
  const blob = await new Promise<Blob>((resolve) => element.toBlob((b) => resolve(b!), 'image/png'));
  await fetch(`/save-public/${name}`, { method: 'POST', body: blob });
  const preview = new Image();
  preview.src = URL.createObjectURL(blob);
  preview.title = name;
  document.getElementById('out')!.append(preview);
};

await save('icons/icon-192.png', await icon(192, 0));
await save('icons/icon-512.png', await icon(512, 0));
await save('icons/maskable-512.png', await icon(512, 0.1));
await save('icons/apple-touch-icon.png', await icon(180, 0.06));
await save('social.png', await social());
document.getElementById('status')!.textContent = 'Done';
