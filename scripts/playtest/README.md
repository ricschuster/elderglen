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

`node scripts/playtest/smoke.mjs` (about 75 seconds) opens the newer scenes once each, including the
hat box Collections row, buying and placing the Furniture Catalogue, taking a copy, and the
morning report, and fails on any console error.

Dev hooks the scripts can call: `window.farmGive(id, n)` adds items (returns
`"ok"`, `"unknown"` or `"full"`), `window.farmMoney(n)` adds money,
`window.farmWalk(x, y)` starts the tap route to a tile (false when there is no
route; `farmDebug().walking` is true until it ends), `window.farmBlocked()` lists
the tiles the farmer cannot stand on now. By hand, the
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
  see `FarmScene`). It scales walking, the clock tick and the axe repeat. The
  bot walks with the game's own tap route (`window.farmWalk`, see "Walking"
  below), so it no longer times key holds and speeds up to 4 are reliable for
  the persona runs (checked at 2 and 4, see "Walking"). Above 4 is untested.
  Not checked with `playtest:touch`. For rules and balance use `npm run sim`.
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

## Walking

`Bot.walkTo` asks the game to walk (`farmWalk`) and waits until `farmDebug().walking`
is false. If that fails it falls back to timed key holds (`holdAxis`), which is
the old, unreliable path. Before it plans, the bot reads the game's blocked tiles
(`farmBlocked`, in `refreshMap`), so rocks, machines, sprinklers and felled
trees count as the game counts them.

Why walking failed before (#333): the bot's own map knew only the walls and the
trees in the map file. It did not know about rocks or other things placed on the
farm, so it picked a stand tile (or a path) that the game had blocked, and no
key hold could get there. The same tiles failed again and again for that reason.
It was not frame timing. The key-hold timing was also fragile at speed, and the
tap route replaces it. `tapVector` in `FarmScene` now allows for the larger step
at `?speed=N`, so it does not step over a waypoint.

Two more causes of stalls were in the bot, not the game:

- The game opens the Greencoat (the morning the mines open, day 5), the cave
  choice and the orders intro by itself. They pause the farm, so every walk
  timed out. `Bot.dismissModals` closes them with Escape before each walk.
- The shop rows were found by guessing the order (crop list order for seeds,
  backpack order for sales). The game sorts them (seeds by price, goods by
  name), so the bot bought and sold the wrong things. `rowOf` in `play.mjs` now
  finds a row by its label (`window.farmItemName` gives the display name).

Measured on 2026-11-08, to day 17, three or four runs at once on 48 cores:
expert at 4x, 0 walk failures and 0 retries (9.4 minutes, was 163 minutes to
day 84 with 67 failures); expert at 2x, 0 and 0; intermediate at 1x, 0 and 0
(8.7 minutes); no findings in either full run. Real time per day at 4x is not a
quarter of 1x, because the bot's polling and the game's own pauses do not
scale. Casual at 4x still reports "energy never ran out during overdo" and
"morning energy after pass-out": at 4x the clock reaches 2 am before the energy
runs out, so that persona's pass-out checks are valid at 1x only.

If a walk fails now, look at `farmBlocked()` and the plan first.

## Smoke test

`node scripts/playtest/smoke.mjs` (about 60 seconds) opens the newer scenes in a
fresh game and fails on any console or page error: collections and achievements,
the smith (cracks a geode), the carpenter list, the mailbox (one letter), the
request board and the open requests list, the village green and hedge maps
(walks a few tiles), and mine floors 11, 26, 45, 85, 100 and 120. Screenshots go
to `playtest-out/shots/smoke-*.png`. It does not test festival play (the
festival scene only opens on a festival day), buying furniture or decor, or
walking in the mine.

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
- `smoke.mjs`: the smoke test of the newer scenes.
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

`node scripts/playtest/combat.mjs` (about 30 seconds) takes the trainer's starter, swings at the
dummy, fights a creature on mine floor 1 and is knocked out, checking health, the report and waking at home.

`node scripts/playtest/forest.mjs` (about 50 seconds, `npm run dev` running; set
`BASE_URL` if the dev server took another port) walks from the farm's north exit
into the Forest, checks its own trees, rocks and forage are swapped in, fells a
grove tree, picks forage, passes the night away from the farm and leaves by the
south road.

`node scripts/playtest/secret-woods.mjs` (about 25 seconds, `npm run dev` running)
grants a steel axe, starts at the Forest's `from_secret_woods` entry (a scene
restart, not a walk), checks the log is solid, chops it for 8 Hardwood, leaves by
the west exit into the Secret Woods, chops a large stump for 2 Hardwood, sleeps
and checks the stump and forage are back.

`node scripts/playtest/delta.mjs` (about 80 seconds, `npm run dev` running) leaves the
farm by its south exit into the River delta, casts a rod on the marsh lake, the river
channel and the sea (checking the fishing screen opens on that water kind and a bite
from that table is rolled), buys a rod at the fisher's counter, finds the tide pool
footbridge shut, mends it with 300 wood and crosses, then sleeps.

`node scripts/playtest/mountain.mjs` (about 80 seconds, `npm run dev` running)
leaves the Forest by its east exit onto the Mountain, finds the rockfall shut before
Spring 5, casts a rod on the lake and the river, sets day 5, walks through the cleared
rockfall to the mine mouth, goes into the mine hall and back out, then sleeps. It
does not play the farm's walk to the Mountain (a scene restart stands in for it).

`node scripts/playtest/forge.mjs` (about 40 seconds, `npm run dev` running) walks to the
Mountain's forge door, goes in, uses the smith's counter (the dwarf sells and buys ore),
comes out, then speaks to the stonekeeper in his yard over the footbridge. A scene
restart stands in for the walk from the Forest.

`node scripts/playtest/quarry.mjs` (about 60 seconds, `npm run dev` running) finds the
Mountain's east bridge out, finishes the Foragers' Shelf by state, crosses into the
Quarry, speaks to the stonekeeper at his camp, breaks a rock with the pickaxe, then
sleeps and checks that nodes came back and the morning report told of the bridge. A
scene restart stands in for the walk from the Forest.

`node scripts/playtest/cove.mjs` (about 60 seconds, `npm run dev` running) finds the
delta's ferry a wreck, repairs it by the `cove-open` world flag (the Water room bundles
are not written yet), steps on the boat to the Lake cove, casts a rod on its water,
opens the hidden treasure chest on the ledge (and finds it bare the second time), sleeps,
then steps back on the boat. A scene restart stands in for the walk to the dock.

`node scripts/playtest/hearthwell.mjs` (`npm run playtest:hearthwell`, about 2 minutes,
`npm run dev` running) leaves the farm by its east exit, walks to the hall and sawmill doors
and back, uses the carpenter, the Help Wanted board, goes into the store and smithy and uses
their counters, visits the healer, inn, library, hatter, the Outpost and its rooms and the
three burrows, reads the two Outpost boards, then goes out by the Mountain and delta exits
and back, and home.
A scene restart stands in for the first step onto the farm only.

`node scripts/playtest/beach-elf.mjs` (`npm run playtest:beach-elf`, about 2 minutes,
`npm run dev` running) walks the Beach dunes to Thalwen's cottage door, goes in, opens the
pin stall, is refused the Homeward pin with 100g, buys it with a full purse, is refused a
second, and walks out. A scene restart stands in for the walk from the farm.

`node scripts/playtest/farmstead.mjs` (about 60 seconds, `npm run dev` running) walks
the Forest's roads to the keeper's door, goes in, buys a young chicken at the counter
(a coop is set by state), comes out, goes into the hermit's tower and speaks to her,
then reads the Wanderer's camp fire. A scene restart stands in for the walk from the farm.
