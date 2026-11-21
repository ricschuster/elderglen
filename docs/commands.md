# Commands

Moved out of `CLAUDE.md` to keep session start small. Read when you need a command.

Node 22 and npm. Gates run in CI and a non-zero exit blocks a merge.

- `npm run dev`: run locally with hot reload.
- Gates: `format:check`, `lint`, `typecheck`, `test` (Vitest, `tests/`), `build`
  (typecheck and production build to `dist/`). `npm run format` fixes Prettier.
- `npm run overview` / `valley-map` (gates `overview:check`, `valley-map:check`): rebuild
  `docs/overview.html` and `docs/valley-map.html` from the hand-kept `docs/overview.json`
  and `docs/valley-map.json`. Update the JSON when the design changes; open the HTML from
  disk. `npm run overview:refresh` re-fetches issue states with `gh`.
- `npm run check`: all of the gates in order. Run before pushing.
- `npm run size` / `size:bundle`: largest files, files over 1,500 lines (a warning), and what the bundle is made of.
  Not a gate.
- `npm run knip`: unused files and exports (config `knip.json`). Not a gate yet; keep it at zero findings,
  and remove `export` or the code when it reports something.
- `npm run wiki` / `wiki:check`: rebuild `docs/wiki/` (the public wiki, note 100) from the data in
  `src/content/` and prose in `docs/wiki-text/`. `npm run wiki:internal` writes `docs/wiki-internal/`
  (git-ignored, adds build status and draft text; open `index.html` from disk). `npm run items:export`
  refreshes `src/content/item-table.json` after an item changes. `npm run wiki:images` re-renders item
  pictures (needs `npm run dev`).
- Interior drafts: `python3 docs/design/drafts/interiors-draft/gen.py` (from that folder;
  Python 3 and Pillow). Design material, not a gate.
- `npm run playtest -- <expert|intermediate|casual>`, other `playtest:*` scripts: manual
  browser playthroughs, need `npm run dev`. See `scripts/playtest/README.md`.
- `npm run sim`: headless sim bot. `android:sync`, `android:apk`, `android:install`: the
  Capacitor app (ADR 0008).
