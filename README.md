# Yass' Cities of Gold

A deck-building race through generated jungles to the lost City of Gold. Build your expedition from the market, cut, paddle and pay your way across rivers, villages and mountain passes, and reach the golden city first.

Play against friends on one device, or against bots (Easy, Normal or Strong). Every map is generated for the difficulty you pick and comes with a short code, so a good map can be replayed.

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

## Layout

- `src/engine`: the rules, pure TypeScript with no browser code.
- `src/bot`: computer opponents.
- `src/gen`: the map generator (runs in a Web Worker).
- `src/ui`: React interface, PixiJS board and card art.
