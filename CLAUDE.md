# CLAUDE.md

Working rules and durable context for this project. This file is loaded into
context automatically, so keep it to direction and rules, not a task list.

## Project

Elderglen (ADR 0011; the working title was Beaver Valley). A cozy farming-life game with its own setting,
played in the browser and on tablets: farm, forage and hand goods in to the
village hall to finish a chain of community projects. A free hobby project by a
solo developer. Brief: `docs/design/00_project_brief.md`.

## Project status

Engine chosen (ADR 0004). M2, the first playable, is closed (2026-11-07). M3
waits on the owner's hands-on play, and much of M3b (ring 1 systems and the map
areas, ADR 0012) is built to shell level with placeholder art. Design is still
ahead of the build in places: some settled notes in `docs/design/` are not yet
built. Roadmap:
`docs/design/03_milestones.md`; placeholder numbers:
`docs/design/07_tuning_numbers.md`. GitHub issues are the live tracker. Start each session by reading only the latest handoff in `docs/handoffs/`, the short priority
list `docs/handoffs/PRIORITIES.md` (keep it under about 8 KB; finished items go to
`PRIORITIES_ARCHIVE.md`, which is not read at start) and the issues labelled
`next-payoff`. Show the owner the priority list, then ask what to design.

## Scope

The first playable (M2) was one farm, two seasons, selling, farming and foraging
skills, and a few village hall bundles. The work now is ring 1, the home valley
(M3 and M3b, `docs/design/03_milestones.md`): four seasons, fishing, the mines
with combat, animals, the map areas and Hearthwell. It is deliberately NOT yet:
regions beyond the home valley (M5), multiplayer (milestone M4, after M3b,
ADRs 0007 and 0012), marriage, generated content, or final art. Do not expand scope without a design note in
`docs/design/` or an ADR in `docs/decisions/`.

This project is Stardew Valley inspired. Do not copy its name, art, audio,
characters, text or code. See
`docs/decisions/0002-stardew-valley-inspired.md`.

## Stack

TypeScript, Phaser 4, Vite, and Tiled maps (JSON). Installed apps wrap the web
build; the wrapper is a later ADR. Game rules stay free of Phaser and the DOM
under `src/core/` so they are unit-testable. Content (items, crops, bundles)
is data files, not code. See `docs/decisions/0004-engine-and-language.md`.

## Commands

Node 22 and npm. Gates run in CI and a non-zero exit blocks a merge.

- `npm run dev`: run locally with hot reload.
- Gates: `format:check`, `lint`, `typecheck`, `test` (Vitest, `tests/`), `build`
  (typecheck and production build to `dist/`). `npm run format` fixes Prettier.
- `npm run overview` / `valley-map` (gates `overview:check`, `valley-map:check`): rebuild
  `docs/overview.html` and `docs/valley-map.html` from the hand-kept `docs/overview.json`
  and `docs/valley-map.json`. Update the JSON when the design changes; open the HTML from
  disk. `npm run overview:refresh` re-fetches issue states with `gh`.
- `npm run check`: all of the gates in order. Run before pushing.
- Interior drafts: `python3 docs/design/drafts/interiors-draft/gen.py` (from that folder;
  Python 3 and Pillow). Design material, not a gate.
- `npm run playtest -- <expert|intermediate|casual>`, other `playtest:*` scripts: manual
  browser playthroughs, need `npm run dev`. See `scripts/playtest/README.md`.

## Repo structure

- `src/core/`: game rules, free of Phaser and the DOM (unit tested).
- `src/content/`: data files (crops, forage, bundles, maps).
- `src/scenes/`: Phaser scenes and the on-screen interface.
- `tests/`: Vitest unit tests. `scripts/playtest/`: manual browser playtests.
- `docs/`: `design/` notes, `decisions/` ADRs, `handoffs/` session notes.

## Working rules

- Branch from `main`; one short-lived branch per change. Open a pull request
  into `main`; CI must pass before merge.
- One pull request in flight at a time. Branch protection requires a branch
  to be up to date with `main`, so every merge makes other open pull requests
  stale. Before opening a pull request, run `git fetch` and `gh pr list --state
  open`. If one is still open, wait for it to merge, or tell the owner. Then
  branch from the fresh `origin/main`. Open the session handoff pull request
  last. If a branch is already behind, merge `main` into it (no force-push).
- After opening a pull request, enable auto-merge with squash
  (`gh pr merge --auto --squash <number>`) without being asked.
- Conventional Commits (for example `feat: ...`, `fix: ...`, `chore: ...`,
  `docs: ...`).
- No em dashes in code, comments, docs, commit messages, or user-facing text.
- Significant technical or design decisions get an ADR in `docs/decisions/`.
- Design notes live in `docs/design/`; session handoffs in `docs/handoffs/`.
- Keep changes small and focused; update docs when behaviour or design changes.
- Design before build. Settle a system's design in a note before building it,
  and do not propose small pilots to avoid the design work. The owner wants the
  big picture first, so features do not feel bolted on
  (`docs/design/17_call_feedback_2026-10-28.md`). Start new sessions by asking
  what to design, not by offering to build.
- Questions to the owner: when asking the owner to choose between options, one
  option must always be what Stardew does, labelled "(Stardew)" in its label.
  If the Stardew behaviour is not known or not checked, say so in that option
  instead of guessing. Put the recommendation first, and mark it
  "(Recommended)" as well when the Stardew option is not the recommended one.
- Stardew checks register: `docs/design/54_stardew_checks.md` lists every
  Stardew claim that is from memory or unchecked, with how to check it (owner
  plays, saved wiki page, Guidebook). Add a row when a note makes such a claim,
  and offer the owner a question batch at session start when five or more are
  open. Black box only: never reverse engineer Stardew (ADR 0002).
- Stardew wiki pages: the wiki blocks Claude's crawler, so never fetch it (no WebFetch,
  curl, Playwright). Write page URLs, one per line, to
  `docs/reference/stardew/urls_<topic>.txt`; the owner saves each page there by hand.
  Read the saved files, then delete the list. Reference only, never copied into the repo
  (ADR 0002).
- Stardew Valley Guidebook: the owner's PDF in `docs/reference/stardew/` is the free
  supplement only; the wiki stays the main source. Read on demand with
  `pdftotext -layout -f <page> -l <page>`, check table numbers against the page image,
  flag conflicts with the wiki, cite by printed page, never quote. Do not build an
  extraction pipeline.
