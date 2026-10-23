import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { type Plugin, defineConfig } from 'vite';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../../src/ui/art/figures');

const saveRenders = (): Plugin => ({
  name: 'save-renders',
  configureServer(server) {
    server.middlewares.use('/save', async (req, res) => {
      const name = decodeURIComponent((req.url ?? '').replace(/^\//, ''));
      if (req.method !== 'POST' || !/^[a-zA-Z]+\.webp$/.test(name)) {
        res.statusCode = 400;
        res.end();
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      await mkdir(OUT, { recursive: true });
      await writeFile(resolve(OUT, name), Buffer.concat(chunks));
      res.end('saved');
    });
  },
});

export default defineConfig({
  root: here,
  publicDir: resolve(here, '../../art-src/kaykit'),
  plugins: [react(), saveRenders()],
  server: { port: 5175, strictPort: true, fs: { allow: [resolve(here, '../..')] } },
});
