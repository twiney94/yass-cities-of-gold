# Yass' Cities of Gold

A deck-building race through generated jungles to the lost City of Gold. Build your expedition from the market, cut, paddle and pay your way across rivers, villages and mountain passes, and reach the golden city first.

Play against friends on one device, or against bots (Easy, Normal or Strong). Every map is generated for the difficulty you pick and comes with a short code, so a good map can be replayed.

The game speaks English and French: it follows the browser's language and remembers the one you pick.

## Development

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the test suite |
| `npm run typecheck` | Type-check the app, the engine and the tooling |
| `npm run build` | Build for production into `dist/` |
| `npm run render:figures` | Re-render the card characters (see below) |
| `npm run notices` | Rewrite `public/THIRD_PARTY_NOTICES.txt` after changing dependencies |

## Layout

- `src/engine`: the rules, pure TypeScript with no browser code.
- `src/bot`: computer opponents.
- `src/gen`: the map generator (runs in a Web Worker).
- `src/ui`: React interface, PixiJS board and card art; `src/ui/i18n` holds the English and French text.

## Publishing

The build in `dist/` is a static site with relative paths, so it runs from any host or sub-folder. It installs as an app and plays offline: `sw.js`, written at build time, caches every file.

- **GitHub Pages:** push to a GitHub repository, set Pages to "GitHub Actions" in the repository settings, and `.github/workflows/pages.yml` tests, builds and deploys every push to `main`.
- **itch.io:** zip the contents of `dist/` (not the folder itself) and upload it as an HTML5 game.
- **Live:** https://twiney94.github.io/yass-cities-of-gold/ (GitHub Pages). Link previews use the absolute `og:image` and `og:url` in `index.html`; update them if the game moves.

Icons and the share image come from `tools/figures/brand.html` (run `npm run render:figures` and open that page).

**Versions and commits:** commit subjects start with a [conventional](https://www.conventionalcommits.org) type, and the build works the version out from them (`tools/version.ts`). Starting from `version` in `package.json`, each `feat:` bumps the minor number, each `fix:` or `perf:` the patch, and a breaking change (`feat!:` or a `BREAKING CHANGE:` note) the major; `chore:`, `docs:`, `refactor:`, `test:`, `ci:` and `style:` leave it as is. The `-alpha` label carries through, and each build is also stamped with its commit: About shows e.g. "Version 0.3.0-alpha · build 4f2a91c". Nothing is written back to the repository, so a local build and the deploy agree; the deploy fetches the full history (`fetch-depth: 0`) to read it. Edit `package.json` only to restart the numbering, e.g. to drop `-alpha` at 1.0.

## Card characters

The characters on the cards are rendered from [KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers) by Kay Lousberg (CC0). Only the rendered pictures in `src/ui/art/figures` ship with the game.

To change a pose or prop, put the pack's `Characters/gltf` and `Assets/gltf` folders in `art-src/kaykit/` (from [the creator's GitHub](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), under `addons/kaykit_character_pack_adventures/`), edit `tools/figures/figures.ts`, run `npm run render:figures` and open the page it serves; it saves every render. `cards.html` on the same server shows all the cards at double size.

## Credits

- Music: "Treasure of the Lost City", menu and in-game themes, by Yass.
- Characters: [KayKit Adventurers](https://kaylousberg.itch.io/kaykit-adventurers) by Kay Lousberg, [kaylousberg.com](https://www.kaylousberg.com) (CC0).
- Fonts: Cinzel and Cinzel Decorative (SIL Open Font License).

## License

© 2026 Yass. All rights reserved. Yass' Cities of Gold™ is not open source: you may read the code and play the game, but you may not copy, modify, redistribute or host it, or reuse its art or music, without written permission. See [LICENSE](LICENSE).

Third-party components keep their own licences, listed in [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt), which ships with the game and is linked from its About screen.
