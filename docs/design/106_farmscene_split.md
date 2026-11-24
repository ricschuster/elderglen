# 106: FarmScene split and scene rules into core (issue #904)

Status: steps 2 to 7 built 2026-11-19 (see "Built status" at the end); step 8 built 2026-11-24; the rest of #904 decided 2026-11-24 (last section). Issue #904 came from
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

## Built status (2026-11-19)

`FarmScene.ts` went from 4,704 to 2,852 lines. Built: `src/scenes/farm-debug.ts`
(step 2), `src/core/blocking.ts` with tests (3), `src/core/creature-defeat.ts`
with tests (4), `src/scenes/farm-draw.ts` (5), `farm-tap.ts` (6), and
`farm-combat.ts` (combat, bombs, creature sprites) and `farm-festival.ts` (7).
Scene-side modules take the scene as their first argument; members they read
lost `private`. Shared constants live in `farm-consts.ts`. Later the same day:
`src/core/interact.ts` began with `useSiloIntent` (the silo rule, returning a
message; tests in `tests/interact.test.ts`), the first piece of step 8 (#904).
`FACING` and `itemLabel()` no longer exist in the scene (nothing to move), and
the damage rolls already live in core (`swingDamage`, `creature-defeat.ts`).
Not built: the rest of step 8 (`resolveUse` and `resolveAction` are the long
`use()` and `action()` chains in the scene, entangled with `open`, `report` and
`render`; they wait for M4 step 1 and `(world, player)`), and the `art.ts` and
`animals.ts` splits (not covered by this note).

## Decided 2026-11-24 (owner): step 8 and the rest of #904

M4 step 1 (#964) is closed, so step 8 is unblocked.

1. **Step 8 goes right after the guest screens trade group** (#1014 group 1), before #1014 groups 2 to 5
   and #1015. `resolveUse(world, player, held, aim)` and `resolveAction(world, player, aim)` in
   `src/core/interact.ts` return an intent; the scene applies it (sounds, tweens, toasts). The guest path
   (`guestUse()` in the scene, `applyFarmIntent` in `src/core/roomintents.ts`) goes through the same
   resolvers on the host, so host and guest rules are one copy. Later guest groups add their actions here
   rather than a second chain. Tests first against the extracted functions; `play.mjs casual` and the guest
   playtests run before and after to compare.
2. **Save and crash safety** (one build item): farm plots checked on load like greenhouse plots, `cave.load`
   checks its arrays, no crash when an old save names a renamed map (`mapFiles[id]!`, `entry()!`) or on a
   missing floor in `beaten()`, one test that validates every content JSON file against its type, one test
   that every map service kind opens a registered scene. Re-measure each against the code first; drop what
   is already fixed. The save version chain stays with note 52.
3. **Duplicated helpers and names** (one build item): one tile key helper, one set of `isObject` and `isNum`
   guards, one `cleanName`, one building and silo rect helper (the pond check gains the silo), the
   axe-or-pickaxe test and `itemLabel()` if still repeated, and the colliding export names renamed. No
   behaviour change except the pond and silo fix.
4. **Not now:** content tables to JSON (M3d), bundle splitting and linting `scripts/` (later; desktop is
   the final form, so size matters less), the 16 unused exports (knip will show what is still unused).

When items 1 to 3 are built, #904 closes; item 4 moves to `PRIORITIES_LATER.md`.

Item 3 built 2026-11-24: `src/core/guards.ts` (`isObject`, `isNum`, `cleanName`, `NAME_MAX`; save, bindings,
players, animals, horse use it), `tileKey` replaces the inline `${x},${y}` keys in core, `buildingRects` and
`siloSiteRect` in `placement.ts` shared with `pond.ts`, `isLiftTool` (toolbar.ts) for the axe-or-pickaxe test,
`itemLabel` (items.ts) for the lower-cased item name, one `FACING_STEP` table (movement.ts) for aim, combat
and the scene's old `PUSH`. Renamed: `HALL_ROOMS`/`HallRoomDef` (bundles) and `DECOR_ROOMS`/`DecorRoomDef`
(decor), `COMPLETION_RINGS`/`CompletionRingDef`, `houseOrderProblem`/`houseOrderUpgrade`,
`fertilizersOnSale` (fertilizer.ts). Already fixed: `tileKey` existed and most stores used it, and the pond check
already respected the silo (a test now pins it), so there was no behaviour change.

Item 2 built 2026-11-24: farm plots are now checked on load by the same filter as greenhouse plots (one
`validPlots` in `save.ts`; bad keys, flags, crops and fertilizer are dropped, not thrown). `FarmCave.load` checks
every array and field with `isObject` and `isNum` (fruit rows, boxes, the dehydrator job). `safeSpawn`
(`core/maps.ts`) replaces a map that no longer exists with the farm's start entry, and `FarmScene.init` logs a
warning when it does; a map with no entries falls back to tile 1,1 instead of `entries[0]!`. `beaten()` no longer
needs a floor state (`removeCreature` in `creature-defeat.ts`). Two new tests: `tests/contentshape.test.ts`
(every content JSON parses; every list file is checked against a required-field table, and no id repeats) and the
service check in the same file (every service kind in the map files has a label and a handler named in
`src/scenes` or `src/core`; `market-pier` and `market-float` come through constants). Fixture tests for the save
fixes are in `tests/crashsafety.test.ts`. Already fixed: greenhouse plot filtering, and `fightState` already
returned undefined for a missing floor (only the `!` in `beaten()` was left). No bad content data was found.
Object-shaped content files are checked only for parsing and being non-empty. The save version chain is
untouched (note 52).

Step 8 built 2026-11-24: `FarmScene.ts` went from 3,224 to 2,874 lines. `src/core/interact.ts` now holds
`resolveUse(g, by, ctx, held, aim)` and `resolveAction(g, by, ctx, held, aim)`. They run the rule as player `by`
(`asPlayer`, now in `src/core/asplayer.ts` so `interact.ts` and `roomintents.ts` can both use it) and return a tagged
intent: `UseIntent` (none, message, swing, cast, report with an optional lit bomb, tool with its sound) and
`ActionIntent` (none, message, open a screen with its data, report, act with its sound, eat, and the scene-owned tags
below). `UseContext` and `ActionContext` carry what the scene alone knows: the map, floor and facing, and callbacks for
rocks, lit bombs, villagers and the mine ladder. `use()` and `action()` in the scene keep the guards (leaving, doors,
guest, mounted, horse, villager talk, lantern line) and then `switch` on the intent; `applyAction` is the scene's side.
Tests are in `tests/interact.test.ts` (one per tool and target, plus acting as a guest).
`applyFarmIntent` now sends a guest's till, water, plant, axe and pickaxe through `resolveUse` as the sender, so the
host's Use and a guest's intents share one copy of each tool rule. One visible change: a guest's hoe now respects
tillable ground like the host's (before, it dug any tile). Not changed: the `harvest` intent still calls
`actions.harvest` (it has its own "nothing ripe" refusal; a guest Action through `resolveAction` comes with the later
guest groups), and `guestUse()` and the guest half of `action()` stay in the scene because they only choose which intent
to send. Left in the scene as intent tags, because they move the player, run a minigame or read scene state: swing and
cast (the attack and the fishing bar), `ride-cart`, `pier-keeper`, `pier-float`, `shrine`, `mend-bridge`, `treasure`,
`stonekeeper` (reads the world holds), `festival`, `festival-action`, `camp-chest`, `cave`, `descend` and `stairs`,
plus talk to a villager, mount and dismount, and the lantern launch, which run before the resolver. Pond rod take-out and
pond menu are in the resolvers but have no unit test yet (a placed pond needs a longer setup).
