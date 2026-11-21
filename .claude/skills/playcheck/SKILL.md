---
name: playcheck
description: Run one area of the #951 M3b play checklist (marriage, festivals, mines, fishing, and so on) text first, record results in docs/handoffs/PLAYCHECKS.md, and file or fix failures. Use when the owner types /playcheck <area>.
---

# playcheck

Runs one area of the M3b play checklist (issue #951). The argument is an area
heading from `docs/handoffs/PLAYCHECKS.md`. With no argument, list the areas
with their counts of unchecked, passed and failed lines, recommend one, and stop.

## Steps

1. Read `docs/handoffs/PLAYCHECKS.md`, only the named area. The file is the source
   of truth for status. Do not copy status into this skill.
2. Get a known state. Use an existing stage (`window.farmState`, `statepatch`,
   the debug menu stages, `wedding-morning.mjs`). If the area needs a stage that
   does not exist, say so and stop: stages are designed in note 42 before they are built.
3. Run each line "do X, expect Y" text first:
   - Headless or desktop: `scripts/playtest/*.mjs` and `probe.mjs` (needs `npm run dev`).
     Run independent scripts in parallel as background jobs (48 cores). Never wait in the foreground.
   - Tablet: `scripts/playtest/tablet-lib.mjs`, `probe.mjs`, `shot.mjs`. Probe state as text;
     crop and tile pictures; no full-size screenshots. Memory notes: `reference-driving-tablets-adb`,
     `feedback-tablet-checks-text-first`.
   - Clock: set minutes only to multiples of 10.
   - Events and reveals must show sprite movement, not text only.
   - Vitest: `--maxWorkers=4`.
4. Lines that need the owner's eyes or hands (looks, feel, `persist()` on a real
   tablet): do not guess. Mark them `owner` and list them at the end.
5. Record each line in `PLAYCHECKS.md`: `pass`, `fail` (with the issue number or a
   one-line symptom), or `owner`, plus the date and build (commit hash).
6. On a failure:
   - Small and clearly a bug: ask the owner whether a sub-agent may fix it.
     Do not spawn one unasked (agents eat the session limit; prefer inline).
     If the owner says no, or says nothing, fix inline or file it.
   - Anything else: file an issue (`gh issue create`) with the line, the stage, the
     observed result and the expected one. Needs design: say so and link the note.
   - Stardew questions: search `docs/reference/stardew` first. Ask only if a decision
     hinges on it, with a "(Stardew)" option. Otherwise close the row as "ours, on purpose".
7. End with a short report: lines passed, failed, owner-only, issues filed. Update
   `docs/handoffs/PRIORITIES.md` only in the session's handoff PR.

## Rules

- One branch and one PR per session. Do not open small PRs. Commit per batch.
- Conventional Commits, no em dashes anywhere.
- Do not expand scope. New systems need a design note or ADR first.
- Dev hooks (`farmDebug`, `farmWhere`, `farmState`) are dev builds only; never rely on them in `npm run build`.
