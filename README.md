# Elderglen

Elderglen is the game's name (ADR 0011,
`docs/decisions/0011-game-name-elderglen.md`). Beaver Valley was the working title.

A cozy farming-life game with its own setting, played in the browser and on
tablets. The player farms, forages and hands goods in to the village hall to
finish a chain of community projects. It is a free hobby project by a solo
developer, inspired by Stardew Valley but not copied from it (see
`docs/decisions/0002-stardew-valley-inspired.md`).

## Status

The first playable (milestone M2) is done, and most of the home valley's
systems and map areas (M3 and M3b) are built with placeholder art. The roadmap is `docs/design/03_milestones.md`, and GitHub issues are the live
tracker.

## Running it

Needs Node 22 and npm.

```sh
npm install
npm run dev
```

Then open the address Vite prints. Move with arrows or WASD, or drag on a touch
screen. `npm run check` runs every CI gate (format, lint, typecheck, tests, build
and the overview and valley map checks). `CLAUDE.md` lists all the commands.

## Where things are

- `src/core/`: game rules, free of Phaser and the DOM, unit tested.
- `src/content/`: data files (crops, forage, bundles, maps).
- `src/scenes/`: Phaser scenes and the on-screen interface.
- `docs/`: design notes, decision records and session handoffs.
- `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`.

## License

The code is under the PolyForm Noncommercial License 1.0.0 (`LICENSE`). The
content and art are under CC BY-NC 4.0 (`LICENSE-CONTENT.md`). This is
source-available, not open source in the OSI sense: you may read, change and
share the project for non-commercial use, but not sell it. See
`docs/decisions/0006-project-licence.md`.
