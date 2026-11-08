# Manual playtest scripts

Scripted playthroughs of the game in headless Chromium. They are run by hand
only. They are not part of `npm run check` or CI, and nothing here is a test
that gates a merge.

A script plays with key presses (plus one mouse click on the end screen) and
reads the live game state after each action to check the result. It reports
findings (a wrong price, a failed hand-in, bad crop growth) and any console
errors. The game's weather and forage are random, so reruns differ.

## Run

1. Once per Playwright version: `npx playwright install chromium`.
2. Start the dev server: `npm run dev`. The scripts need the dev build, because
   they use `window.farmDebug`.
3. In another terminal: `npm run playtest -- expert` (or `intermediate`, or
   `casual`). A full run takes 10 to 20 minutes.
4. `npm run playtest:late` leaves a new game standing until 2 am and checks the
   pass-out. It takes about 14 minutes.

5. `npm run playtest:tap` taps a tile, a tree and an unreachable spot in the
   tap-to-move scheme (about 15 seconds).
6. `npm run playtest:touch` plays one short loop with touch events only, in a
   tablet-sized touch browser (1200x700 CSS pixels, like the SM-T500): the
   stick, the toolbar, till, plant, water and harvest (with Action), a second finger on Use
   while the stick is held, hold Use to chop a tree and its stump, ground goods picked up by walking, the
   shop, the hall, the bed in the house, the report and Continue on the title
   screen. It also checks touch target sizes. About 85 seconds.

7. `npm run playtest:controls` checks the input profiles (note 45): a mouse drag
   does not move the player on desktop, the keyboard does not on touch, and a
   rebound key works. About 20 seconds.

   `npm run playtest:mouse` checks the desktop mouse (note 46): a near click uses
   the cursor tile, a far click turns and uses the adjacent tile, a toolbar click
   selects and uses nothing, right-click shows no browser menu, the wheel changes
   the slot and the page does not scroll, and holding the left button with the
   axe keeps chopping. About 15 seconds.

8. `node scripts/playtest/bin.mjs` ships, takes back, ships part through the
   prompt, sleeps, and checks the payout, summary and report. About 10 seconds.

9. `node scripts/playtest/wood.mjs` plays a chopper: it fells the starting trees
   with a held key, sleeps when the energy is low, and reports the days, energy
   and wood to reach 450 wood (`WOOD_TARGET` changes it). About 3 minutes.

10. `npm run sim -- <expert|intermediate|casual> [runs] [maxDay]` is not a browser
   run. It plays the rules in `src/core/` headless (`docs/design/46_headless_playtest.md`),
   charges game minutes for walking and key presses, and prints the days to each
   hall bundle over many seeds (the bot does not play Woodland, Artisan Goods or
   the Smith's, and "all played bundles" leaves them out) (default 100 runs to day 84). Runs are exactly
   repeatable: the seed is the run number. It needs no dev server and takes
   about 1 s a run. The time model is in `scripts/sim/world.ts` (`TIME`). Compare
   two builds by running the same personas on both.

Dev hooks the scripts can call: `window.farmGive(id, n)` adds items (returns
`"ok"`, `"unknown"` or `"full"`), `window.farmMoney(n)` adds money. By hand, the
debug menu (`docs/design/42_debug_menu.md`) opens with the backtick key or the
DBG button. Both exist in dev builds only.

Screenshots and saves go to `playtest-out/` (git-ignored).

Settings, as environment variables:

- `BASE_URL`: the dev server, default `http://localhost:5173/`.
- `CHROMIUM_PATH`: use this browser instead of the one Playwright installed.
- `DEVICE_CDP`: drive Chrome on a real Android tablet instead of a headless
  browser. Connect it with USB debugging, then run
  `adb reverse tcp:5173 tcp:5173`, open `http://localhost:5173/` in Chrome on
  it, and `adb forward tcp:9222 localabstract:chrome_devtools_remote`. Set
  `DEVICE_CDP=http://localhost:9222`. Close other game tabs on the device
  first. Works for `npm run playtest:touch`.
- `PROFESSION`: `1` (default) or `2`, the key pressed when a skill reaches level 5
  and the profession scene opens.
- `MAX_DAY`: stop after this day, default 84 (the calendar wraps into year 2).
- `SPEED`: run the world this many times faster (the dev build reads `?speed=N`,
  see `FarmScene`). It scales walking, the clock tick and the axe repeat, and
  the bot's stop tolerance and face tap scale with it. It is safe for scripts
  that barely walk (`wood.mjs`: 3.6 times faster at 4, same results). It is
  NOT usable for the persona runs at 4: the game moves whole frames, so the bot
  cannot stop on a tile, and an 84 day expert run took 163 minutes with 67
  failed walks (1x: 3 in 16 days). 2 is untested. Not checked with
  `playtest:touch`. For rules and balance use `npm run sim`.
- `SEED`: a number that makes `Math.random` repeatable in the browser, so two
  builds see the same weather, forage and trees. Timing still varies, so runs
  are close, not identical. Compare final counts only: findings pile up on the
  last day, so a count read mid run says little. To compare a branch with
  `main`, check `main` out in a second worktree, run its dev server on another
  port, and point `BASE_URL` at it.

The three runs can go at the same time against one dev server. Each persona
writes its own `save-<persona>.json` and `<persona>-*.png` files, so they do not
collide. This was checked on 2026-10-31 on the owner's machine (48 cores): all
three ran together and the in-game results were unaffected, only real time was
longer. Not checked: running `playtest:touch` or `playtest:late` alongside them.

To run them in parallel from a shell, send each to a log and a done marker, then
read the logs when the markers exist:

```bash
for p in expert intermediate casual; do
  nohup bash -c "npm run playtest -- $p > /tmp/pt-$p.log 2>&1; touch /tmp/pt-$p.done" &
done
```

Read `FINDINGS:` at the end of each log. Expect about 10 to 30 minutes each.

A run of "no stand tile for x,y" script errors means the bot used the wrong map,
not that the game is broken. `useAt` and `walkTo` plan on the map the bot is on,
so read it from the game first (`here = d.map` in `lib.mjs`). This bit after the
hall became a walkable map.

## Personas

- `expert`: knows every bundle, plants each bundle crop on day 1, forages every
  day. The fastest path.
- `intermediate`: knows the bundles, farms a small patch, forages on most days,
  batches shop and hall trips, sometimes forgets to water.
- `casual`: plays about 3 days in 4, sells everything it picks, forgets to
  water, and once works until the energy runs out. Deliberately harsh: a check
  on the floor.

Results from the first runs are in `docs/design/08_playtest_personas.md`. Rerun
all three after a change to prices, bundles, growth or energy.

## Files

- `lib.mjs`: browser launch, pathfinding walk, facing and tool use. It also
  answers the profession scene (key 1, or `PROFESSION=2`) after a use (C) or action (X) key press.
- `play.mjs`: the daily routine and the personas.
- `late.mjs`: the stay-up-late test.
- `wood.mjs`: the wood persona.
- `touch.mjs`: the touch persona. It uses the Chrome DevTools protocol to send
  real multi-touch events. It is an emulator: it cannot judge how the targets
  feel under a finger, the frame rate, or Android Chrome's own behaviour.

The farm layout in `play.mjs` (soil rows at y 11 and 13, aisle at y 12) matches
`src/content/maps/farm.json`. Update it if the map changes. The scripts read
every map's walls, doors and trees from the JSON, so only fixed tiles need a
check: the door stand tiles (farm house door 6,6, hall door 6,21, house exit
13,20, hall exit 23,18) and the bed (20,19 in the house).

Doors open on a click or Action, not on a walk through: the scripts stand on the
tile before a door, face it and press Action (`walkThrough` in `play.mjs`,
`actTool` in `touch.mjs`).

The game canvas is the window (note 64), not a fixed 960 by 540. `touch.mjs`
reads each target through its scene camera (`targets`), so it works at any
window size. `mouse.mjs` converts tiles through the farm camera.
