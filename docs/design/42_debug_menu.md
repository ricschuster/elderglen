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
