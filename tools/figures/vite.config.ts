import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const TARGETS = [
  { route: '/save', dir: resolve(here, '../../src/ui/art/figures'), name: /^[a-zA-Z]+\.webp$/ },
  { route: '/save-public', dir: resolve(here, '../../public'), name: /^(icons\/)?[a-z0-9-]+\.(png|jpg)$/ },
];

const saveRenders = (): Plugin => ({
  name: 'save-renders',
  configureServer(server) {
    for (const target of TARGETS) {
      server.middlewares.use(target.route, async (req, res) => {
        const name = decodeURIComponent((req.url ?? '').replace(/^\//, ''));
        if (req.method !== 'POST' || !target.name.test(name)) {
          res.statusCode = 400;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const file = resolve(target.dir, name);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, Buffer.concat(chunks));
        res.end('saved');
      });
    }
  },
});

export default defineConfig({
  root: here,
  publicDir: resolve(here, '../../art-src/kaykit'),
  plugins: [react(), saveRenders()],
  server: { port: 5175, strictPort: true, fs: { allow: [resolve(here, '../..')] } },
});
