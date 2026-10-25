import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel-decorative/900.css';
import favicon from '../../public/favicon.svg?url';
import backdrop from '../../src/ui/art/menu-backdrop.webp?url';

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

// The title screen in a link preview: the painting, and the logo stacked and centred so a square crop keeps it whole.
const social = async () => {
  const [width, height] = [1200, 630];
  const { element, context } = canvas(width, height);
  const art = await image(backdrop);
  const scale = width / art.width;
  context.drawImage(art, 0, (height - art.height * scale) * 0.4, width, art.height * scale);
  const shade = context.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, 560);
  shade.addColorStop(0, 'rgb(8 12 10 / 82%)');
  shade.addColorStop(1, 'rgb(8 12 10 / 0%)');
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);

  await document.fonts.load('900 120px "Cinzel Decorative"');
  await document.fonts.load('700 36px "Cinzel"');
  const lines = ['CITIES OF', 'GOLD'];
  const size = 124;
  context.font = `900 ${size}px "Cinzel Decorative"`;
  const left = (width - Math.max(...lines.map((line) => context.measureText(line).width))) / 2;
  const top = height / 2 - size * 0.62;
  const gold = context.createLinearGradient(0, top - size * 0.8, 0, top + size * 1.1);
  gold.addColorStop(0, '#fff4c8');
  gold.addColorStop(0.4, '#f6cf5f');
  gold.addColorStop(0.65, '#c3841a');
  gold.addColorStop(1, '#f0c255');
  for (const [i, line] of lines.entries()) {
    const x = (width - context.measureText(line).width) / 2;
    const y = top + i * size * 1.02;
    context.shadowColor = 'rgb(0 0 0 / 55%)';
    context.shadowBlur = 24;
    context.shadowOffsetY = 10;
    context.fillStyle = '#5b3a0b';
    context.fillText(line, x, y + 4);
    context.shadowColor = 'transparent';
    context.fillStyle = gold;
    context.fillText(line, x, y);
  }
  const goldWidth = context.measureText(lines[1]!).width;
  context.font = '700 34px "Cinzel"';
  context.fillText('™', (width + goldWidth) / 2 + 6, top + size * 1.02 - size * 0.45);
  context.font = '700 38px "Cinzel"';
  context.fillStyle = '#f2c14e';
  context.letterSpacing = '12px';
  context.shadowColor = 'rgb(0 0 0 / 70%)';
  context.shadowBlur = 10;
  context.fillText("YASS'", left + 6, top - size * 0.88);
  return element;
};

const save = async (name: string, element: HTMLCanvasElement, type = 'image/png') => {
  const blob = await new Promise<Blob>((resolve) => element.toBlob((b) => resolve(b!), type, 0.86));
  const response = await fetch(`/save-public/${name}`, { method: 'POST', body: blob });
  if (!response.ok) throw new Error(`${name} was not saved (${response.status})`);
  const preview = new Image();
  preview.src = URL.createObjectURL(blob);
  preview.title = name;
  document.getElementById('out')!.append(preview);
};

await save('icons/icon-192.png', await icon(192, 0));
await save('icons/icon-512.png', await icon(512, 0));
await save('icons/maskable-512.png', await icon(512, 0.1));
await save('icons/apple-touch-icon.png', await icon(180, 0.06));
// A photo-like JPEG keeps the link preview small enough for chat apps that drop images over about 300 KB.
await save('social.jpg', await social(), 'image/jpeg');
document.getElementById('status')!.textContent = 'Done';
