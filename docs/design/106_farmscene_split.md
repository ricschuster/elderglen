# 106: FarmScene split and scene rules into core (issue #904)

Status: proposal, 2026-11-18. No code moves with this note. Issue #904 came from
a code audit on 2026-11-12; this note re-measures it and settles the order.

## Current state (measured 2026-11-18)

- `src/scenes/FarmScene.ts` is 4,704 lines (the issue said about 3,714), 121
  imports, 132 methods, about 99 Phaser or scene-API references. It also holds
  the one `GameState` instance as `this.state`, so nearly every method reads or
  writes it.
- Largest methods: `create` 481 lines, `action` 220, `use` 174, `initTapInput`
  169, `update` 130, `swing` 88, `syncVillagers` 75, `drawCoopInside` 70,
  `updateCombat` 68, `meetVillager` 63, `updateAttack` 62, `drawGround` 61,
  `initZoomControl` 60, `detonate` 57, `tileBlockedNoHorse` 49.
- Clusters by name count: tap-to-move about 159 mentions, drawing about 93,
  festival 76, combat 25, bombs 33.
- `src/core/` has 166 files, so most rules are already there. `GameState` is
  declared in `src/core/save.ts` (line 92).
- The rest of #904 (duplicated helpers, content in code, save robustness, type
  safety) is separate from the split and is not part of this note except where
  listed below.

## Rules in the scene that touch no Phaser

These can move to `src/core/` with unit tests and no behaviour change:

1. `tileBlocked` and `tileBlockedNoHorse` (blocking, about 80 lines): pure
   reads of map, state and horse. Target `src/core/blocking.ts`.
2. `beaten` (defeat, drops, XP, ladder roll) and the damage and status rolls in
   `updateCombat` and `swing`: target `src/core/combat.ts` (exists) or a new
   `creature-defeat.ts`. Randomness passes in as an `rng` argument.
3. `use` and `action` dispatch (about 390 lines together): split each into
   `resolveUse(state, held, aim) -> Intent` in core and a thin scene function
   that applies the intent (sounds, tweens, toasts). Target `src/core/interact.ts`.
4. `detonate` and `updateBombs` damage and tile effects: core, with the blast
   visuals staying in the scene.
5. Festival activity scoring and timers, and `useSilo` rules.
6. `TICK_MS`, the `PUSH` facing table and the inline facing table: one shared
   `FACING` table in `src/core/aim.ts`, used by `movement.ts`, `aim.ts`,
   `combat.ts` and the scene. (FishingScene rolls: separate small step.)

## Proposed modules

Scene-side files take the scene as an explicit first argument (a "context"
object exposing `state`, `map`, the Phaser scene and a few helpers), not mixins
or a base class.

| File | Holds | Approx lines |
| --- | --- | --- |
| `src/core/blocking.ts` | tile blocking | 80 |
| `src/core/interact.ts` | `resolveUse`, `resolveAction` intents | 400 |
| `src/core/creature-defeat.ts` | defeat, drops, XP, rolls | 150 |
| `src/scenes/farm-tap.ts` | `initTapInput`, tap-to-move path stepping | 450 |
| `src/scenes/farm-draw.ts` | ground, labels, coop inside, hunt graphics | 500 |
| `src/scenes/farm-combat.ts` | `updateCombat`, `updateAttack`, `swing`, `cast` visuals | 350 |
| `src/scenes/farm-festival.ts` | festival activities and parade | 300 |
| `src/scenes/farm-debug.ts` | DEV window hooks, one `declare global` | 100 |

`FarmScene.ts` would keep `init`, `create` (shortened by calling the above),
`update` and the scene lifecycle, landing near 2,500 lines.

## Order of moves

Each step is one commit, touches one concern, and passes `npm run check`
before the next. Pure moves first, behaviour-bearing extractions after.

1. Shared `FACING` table and `itemLabel()` (small, no scene churn).
2. `farm-debug.ts` (DEV hooks, lowest coupling, proves the context pattern).
3. `blocking.ts` plus unit tests.
4. `creature-defeat.ts` plus tests.
5. `farm-draw.ts` (pure move of drawing methods).
6. `farm-tap.ts`.
7. `farm-combat.ts` and `farm-festival.ts`.
8. `resolveUse` and `resolveAction` into `interact.ts`: the riskiest step,
   done last, with the playtest scripts (`npm run playtest`, `npm run sim`)
   run before and after to compare.

## Risks

- M4 step 1 (issue #964) splits `GameState` into a world and per-player
  records keyed by player id. Rules that read `this.state.inventory`,
  `money`, `skills`, `energy` and tool tiers would be rewritten to take a
  player. `resolveUse`, `resolveAction`, `beaten` and the blocking checks all
  read those fields. If the split goes first, the extracted functions are
  written once against `(world, player)`. If M4 step 1 goes first, it must edit
  about 4,700 lines of scene in place, with 667 `GameState` mentions across
  core to chase as well.
- Conflicts: both changes touch the same lines in `FarmScene.ts`. Running them
  in parallel means constant merge conflicts. One PR in flight at a time already
  forbids it.
- Regressions in `use` and `action` have no unit tests today because the logic
  is welded to Phaser. Step 8 therefore needs new tests written first against
  the extracted functions, and a playtest comparison.
- Save format is not touched by this refactor. M4's save bump (note 52) stays
  separate.
- Size: the whole plan is roughly eight commits, in one branch and one PR per
  the owner's one-PR-per-session rule, or two PRs if it spans sessions.

## Recommendation

Do the split partly before M4 step 1, and the rest after it.

- Before M4 step 1: steps 1 to 7. They are mostly moves and extractions that do
  not depend on the player shape, and they shrink the file that M4 step 1 has
  to edit, so #964 is a smaller diff in smaller files.
- After M4 step 1: step 8 (`resolveUse` and `resolveAction`), written directly
  against `(world, player)`, so these functions are not rewritten twice.
  Also defer the core `creature-defeat.ts` signature (step 4) if #964 begins
  first: write it taking a player record from the start.

If the owner prefers to start M4 immediately, then do all of the split after it;
the cost is a larger #964 diff, not a correctness risk.

Related: #904, #964, #948, `docs/design/53_multiplayer.md`,
`docs/design/52_save_and_exit.md`.
