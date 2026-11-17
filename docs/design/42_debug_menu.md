# 42 The debug menu (dev builds only)

Status: decided with the owner on 2026-11-01. Built: `src/core/debug.ts`, `DebugScene` (dev builds only, backtick key and the DBG button).
Requested in the 2026-10-31q handoff.

## Why

Testing the house upgrade needs 10,000g and 450 wood, and nothing in the game
gives wood yet. The only dev tool is `window.farmGive(id, n)` in the browser
console, which gives items but not money, and a tablet has no console. Every
playtest of a late system (the hall, tool upgrades, the house) needs the same
setup by hand. A menu inside the game fixes both: it works on a tablet and it
replaces the ad hoc console hooks.

## What Stardew does

Not checked. As far as I know the base game has no player-facing debug menu;
its debug commands run from the SMAPI console, which is a modding tool. The
saved wiki pages do not cover it, so treat that as unverified. This menu is a
developer tool, not a game feature, so there is no Stardew behaviour to match.

## Rules

- **Dev builds only.** Gated on `import.meta.env.DEV`, like `farmGive` and
  `farmDebug` today. Vite removes the branch in `npm run build`, so the menu
  and its key cannot reach a shipped build. A test or a grep in the build check
  confirms the scene is absent from `dist/`.
- **Never saves a flag.** Using it does not mark the save as cheated. It is not
  a game feature, so there is nothing to track.
- **Rules stay in `src/core/`.** The edits are small pure functions on
  `GameState` (`src/core/debug.ts`), unit tested. The scene only draws rows
  and calls them. Nothing in the menu bypasses a rule the game enforces: it
  sets state, and the game's own checks (stack size, slot count) still apply.

## Where it opens

- **Keyboard:** the backtick key (`` ` ``), on the farm only. Nothing else in
  the game uses it. Esc closes it.
- **Touch:** a small "DBG" button in the top right corner of the HUD, dev
  builds only, sized like the other HUD buttons (`27_touch_controls.md`).
- It opens as a scene over the farm, the same way the skills screen does
  (`open("debug")` in `FarmScene`): the farm is paused while it is up.
  Reusing `frame` and `Menu` from `src/scenes/panel.ts` gives keyboard and
  touch rows for free.

## What it does

A top level list, one row per tool. Each row's buttons step the value, as the
shop and carpenter rows already do.

| Row | Buttons | Notes |
| --- | --- | --- |
| Money | +100, +1,000, +10,000, set 0 | Plain add to `state.money`. |
| Item | opens the item picker | See below. |
| Skills | +100 XP farming, +100 XP foraging | Through `Skills`, so level-ups and profession prompts still fire. |
| Day | skip to next morning | Runs the normal `sleep()` path, so house builds, crops and weather advance for real. Festival and report screens still show. |
| Weather | set today to sunny or rainy | Dev checks for watering and the forecast. |
| House | tier up, tier down, finish the build now | For checking each tier's rooms without the carpenter wait. |
| Energy | refill | Sets energy to the day's maximum. |

**Item picker.** Lists every item from `itemById`, scrolled with the same
`Menu` the shop uses. Each row has +1, +10, +100 buttons and shows the count
held. Quality: a second row of toggles (normal, silver, gold) that builds the
suffixed id the inventory already understands (`splitQuality`). Seeds, crops,
forage and wood all show up because they are in the item table. A new item
needs no change to the menu. The picker needs a way to list all items, so
`items.ts` gets an `allItems()` export (the map is private today).

**Hand back what you add.** Adding to a full backpack fails with the normal
"no room" message. It does not drop the extra.

## Not in the first version

- Teleport to a map or tile. The farm map and its exits are quick enough to
  walk, and `farmDebug` still reports the position.
- Unlock-everything buttons (all bundles, all tool tiers). Add one per system
  when a playtest needs it, not before.
- Time of day. The clock is part of the day length tuning, so a wrong value
  could hide a bug rather than expose one. Skip to next morning is enough.

## Console hooks

`window.farmGive` and `window.farmDebug` stay, because the playtest scripts in
`scripts/playtest/` call them and a script cannot press menu buttons easily.
They move into `src/core/debug.ts`'s functions so the menu and the console
share one code path: `farmGive` calls `giveItem`, and a new `farmMoney` calls
`giveMoney`. All stay behind `import.meta.env.DEV`.

`window.farmState(patch)` jumps to a chosen state in one call, for playtests
(`applyStatePatch` in `src/core/statepatch.ts`, unit tested). Keys, all optional:
`day` (or `season`, `dayOfSeason`, `year`), `money` (set), `items` (add), `skills`
(raise to a level), `hallRooms` and `hallBundles` (filled through the Hall's own
hand-in, with no reward paid, so a locked room stays a reported problem), `flags`,
`hearts`. It then restarts the scene. The day is set, not simulated: crops, weather
and the forecast are not advanced. It returns `{ problems }` for unknown ids.

## Build order

1. `src/core/debug.ts` and `allItems()`, with unit tests (money, items with a
   full backpack, XP, house tier, build finish).
2. `DebugScene` with the top level list and item picker, the backtick key and
   the HUD button.
3. Switch `farmGive` to the shared function, add `farmMoney`, note both in
   `scripts/playtest/README.md`.
4. Use it to play through the house upgrade (handoff next action 2).

## Settled on 2026-11-01

- Touch opens it with a visible DBG button in dev builds.
- The first version has every row in the table above.

## Stages (named save points, #951)

Status: designed 2026-11-16, core built (`src/core/stages.ts`, `src/content/stages.json`,
`tests/stages.test.ts`). Why: the M3b play checklist (#951) needs a known state for each check, and
playing many game days to reach it is slow. One pick, for the owner and the playtest bots alike.

What Stardew does: not checked. Its console commands are not a source (ADR 0002), and this is a
developer tool, not a game feature.

### What a stage is

A stage is a `StatePatch` (`statepatch.ts`) with an id, a menu group, a label and an optional `base`
stage that is applied first. Data only, in `src/content/stages.json`; no code per stage. The "declared
extras" a patch cannot do are new patch keys, added to `applyStatePatch` so they run through the game's
rules and are unit tested: `houseTier` (raise only), `minesDeepest` (through `Mines.visit`), `marriage`
(`{spouse, stage, children}` through `Marriage.court/engage/marry/addChild` and the friendship bouquet,
so hearts, flags and caps come out as in play) and `fillPack` (one of every item until the pack is full,
through `Inventory`). There is no "run actions" extra: a state that needs actions is a missing patch key.

### Rules

- **Always a NEW game.** A stage starts from `startGame()` (tools and seeds as a new farm), applies the
  `base` chain then the stage's patch, then respawns forage as the title screen does. It never edits a
  live game, so it is reproducible, and the stage test is the same call.
- **Own save slot.** The hooks switch to the last slot (5) before restarting, so autosave never
  overwrites a real save in slots 1 to 4. A real save in slot 5 would be overwritten: the menu row says
  "plays in slot 5".
- **Never writes derived fields** (anything other code computes: crop stage from the day, friendship
  hearts, bundle counts by hand, the forecast). A stage sets stored inputs through patch keys only.
  The day is set, not simulated, as for `farmState`.
- **Dev builds only.** `window.farmStage`, `window.farmStages` and the menu row sit behind
  `import.meta.env.DEV` like `farmState`. The stage data is read through functions (`stageList()`), never a module level constant, so
  the bundler drops it from `npm run build` (checked: no `stages` chunk or stage id in `dist/`). Keep
  it that way: a top level `const X = data.stages` kept the JSON in the build once.
- **Tested.** `tests/stages.test.ts` loads EVERY stage on a fresh game, expects no problems, and runs
  one `sleep()`. It also checks every festival has a "day before" stage and spot checks key states.
  A new stage needs no test code.

### The list

| Group | Stages |
| --- | --- |
| Start | `new-game`; `day-28-first-bundle` (spring 28, Spring Foraging filled); `season-summer`, `season-fall`, `season-winter` (day 1 of each); `year-2-spring` |
| Hall | `hall-1` to `hall-6`: rooms done in order (shelf, larder, water room, hearth, guests' board, Last Seat). `hall-5` is "Last Seat open"; `hall-6` is the hall complete. Filled by hand-in with no rewards paid; room rewards from other sources are not given |
| Mines | `mines-30`, `mines-60`, `mines-100`: that floor reached, summer 10, mining and combat levels 4, 7 and 9, money 3,000, 10,000 and 30,000 |
| Marriage | `courting` (bouquet, 8 hearts), `engaged` (wedding in 3 days), `married` (60,000g for a divorce), `married-child`, `married-two-children`. The spouse is Linnet in all; the nursery tier is raised for children |
| Festivals | `<festival>-eve`, the day before, sunny, 2,000g: `hat-parade`, `seedswap-fair`, `cake-day`, `lamplight-evening`, `harvest-showing`, `frostday`, `midwinter-feast`; `hollow-eve-eve-odd` (year 1, small maze) and `hollow-eve-eve-even` (year 2, large maze); `night-market-eve` and `night-market-evening-1`, `-2`, `-3` (5 pm on each of the three evenings). That is all nine festivals |
| Fishing | `fishing-reed-pole` (level 1), `fishing-hazel-rod` (3), `fishing-heron-rod` (6), `fishing-hearthwell-rod` (9): the rod in the pack, on a sunny day of a season that suits it |
| Late game | `late-game-100`: day 100, `hall-6` done, house tier 3, all five skills 8, mine floor 60, 100,000g, a full pack |

Small points decided: day 100 is winter 16, the first Night Market day, so the market stage shares
the date. Festival stages leave the farmer on the farm (no `map`): the walk to the festival is part of
the check. A stage may set `map` and `entry` (read by the hook, as `farmState`) when a check starts on
another map.

### How it is picked

- **Debug menu:** a "Stages" row opens the groups, then the stages of a group (`Go` starts it), with
  Esc stepping back, like the item picker.
- **Console and scripts:** `window.farmStage(name)` returns `{ problems }` (an unknown name is a
  problem) and restarts the scene; `window.farmStages()` lists the ids. `launch()` in
  `scripts/playtest/lib.mjs` takes `--stage <name>` or `STAGE=<name>`, so every playtest script
  starts from any stage. The README lists the names.

### Not built: needs patch keys that do not exist

Tool tiers, a chosen hat or outfit, the tailoring and tea bush setups, ponds and Secret Woods progress
(a pond with fish, the statue), the heart-event stories as a unit (`eventsSeen` marks single events),
the cart, herb stall and tapper being built, inside a festival (map, zone and time in the festival
run), divorce and re-dating as states (`married` plus the ledger covers the check), the Special Items
and journal. Each is one patch key when a check needs it, not before.

### Save this as a stage

Not now. A live save holds derived and random state (crops, weather, the mine floors), so replaying
it as a patch would write derived fields. The way to reproduce a failing state is the save export
(note 52) and the nearest stage. Revisit if exports prove too heavy.

### Open

1. **Slot 5 for stages.** (Stardew has no equivalent.) Recommended: yes, as built, so a stage never
   touches saves 1 to 4. The alternative is a separate storage key that is not a slot, which costs a
   resume path in the title screen. Is losing slot 5 to stages fine?
2. **Spouse for the stages.** Linnet in every marriage stage. Add one stage per candidate (14) so each
   spouse's lines can be reached, or keep one?
