import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import react from '@vitejs/plugin-react'
import { type Plugin, defineConfig } from 'vite'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

const filesIn = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesIn(path) : [path]
  })

// Link previews only need the share image online, and browsers that run the game all read woff2.
const OFFLINE_SKIP = /(^\.\/social\.png$|\.woff$)/

// Writes sw.js next to the build: it precaches every emitted file so the game installs and plays offline.
const offlineShell = (): Plugin => ({
  name: 'offline-shell',
  apply: 'build',
  generateBundle(_, bundle) {
    const publicDir = new URL('./public', import.meta.url).pathname
    const files = [
      './',
      ...Object.keys(bundle).map((name) => `./${name}`),
      ...filesIn(publicDir).map((path) => `./${relative(publicDir, path)}`),
    ]
      .filter((file) => !OFFLINE_SKIP.test(file))
      .sort()
    const cache = `cities-of-gold-${createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12)}`
    this.emitFile({
      type: 'asset',
      fileName: 'sw.js',
      source: `const CACHE = ${JSON.stringify(cache)};
const FILES = ${JSON.stringify(files)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./')));
    return;
  }
  event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
});
`,
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), offlineShell()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'gsap', test: /node_modules[\\/]gsap[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
          ],
        },
      },
    },
  },
})
