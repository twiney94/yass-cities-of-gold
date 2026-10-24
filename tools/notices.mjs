// Writes public/THIRD_PARTY_NOTICES.txt from the packages the game ships, so their licence texts
// travel with the site. Run `npm run notices` after changing dependencies.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = new URL('../public/THIRD_PARTY_NOTICES.txt', import.meta.url);
const TYPES_ONLY = /^(@types\/|@webgpu\/types$|csstype$)/;

const listing = () => {
  try {
    return execFileSync('npm', ['ls', '--omit=dev', '--all', '--parseable'], { encoding: 'utf8' });
  } catch (error) {
    return error.stdout;
  }
};

const packages = new Map();
for (const dir of listing().trim().split('\n').slice(1)) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  if (TYPES_ONLY.test(pkg.name) || packages.has(pkg.name)) continue;
  const file = readdirSync(dir).find((name) => /^(licen[cs]e|copying)/i.test(name));
  const licence = typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license);
  const text = file
    ? readFileSync(join(dir, file), 'utf8').trim()
    : `Licence: ${licence}\nHomepage: ${pkg.homepage ?? pkg.repository?.url}`;
  packages.set(pkg.name, { version: pkg.version, licence, text });
}

const sections = [...packages.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, { version, licence, text }]) => `--- ${name} ${version} (${licence}) ---\n\n${text}`);

writeFileSync(
  OUT,
  `Yass' Cities of Gold - third-party notices

The game, its code, artwork, music and text are (c) 2026 Yass, all rights reserved (see LICENSE).
It includes the following third-party components, each under its own licence.

=== Artwork ===

The card characters are rendered from "KayKit: Adventurers Character Pack" by Kay Lousberg
(https://www.kaylousberg.com), released under CC0 1.0 Universal (public domain dedication):
https://creativecommons.org/publicdomain/zero/1.0/

=== Software and fonts ===

${sections.join('\n\n')}
`,
);
console.log(`Wrote ${packages.size} notices to public/THIRD_PARTY_NOTICES.txt`);
