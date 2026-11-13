# 98 Headless playtest (draft)

Renumbered from 46 on 2026-11-13: two notes had the number 46. Older notes and
handoffs that say "note 46" about the headless sim mean this note.

Status: decided 2026-11-01 for issue #319. Built the same day (`npm run sim`).

## Problem

The browser playtests (`scripts/playtest/`) take 10 to 30 minutes a run. The
game clock ticks in real time (7 s per 10 game minutes, `TICK_MS` in
`FarmScene`), and the scripts add fixed sleeps after key presses. Weather,
forage and trees are random, so comparing two builds needs several runs.
`SEED` helps, but timing still varies, so runs are close, not identical.

What we want to know most (economy balance, the numbers in note 07, whether
a change slowed the bundle chain) does not need a browser. It needs the rules,
a plan, and many runs.

## What the code already gives us

`src/core/` is free of Phaser and the DOM (ADR 0004), and it already holds
almost everything a bot needs:

- `newGame()`, and `till`, `water`, `plant`, `harvest`, `forage`, `chop`,
  `eat`, `plantTree` in `actions.ts`, each returning an `Outcome`.
- `sleep()` in `sleep.ts`: pass-out cost, bin payout, crop growth, weather,
  trees, forage respawn, house build. It takes `random`, so a seeded generator
  makes a run exactly repeatable. No browser seed trick is needed.
- `shop.ts`, `bundles.ts` (`Hall`), `shipping.ts`, `upgrades.ts`, `skills.ts`.

So the bot can call the same functions the scene calls, and the headless run
is the real rules, not a copy.

## What lives only in `FarmScene`

These are the gaps. A headless bot would miss them unless it models them.

| Gap | Where | Effect on a bot |
| --- | --- | --- |
| Game time passes only by the real-time tick. Actions cost energy but no minutes. | `FarmScene` tick, `actions.ts` comment | A bot has no time pressure. It must add minutes itself. |
| Walking: speed, collision, distance to a target | `update`, `movement.ts` | Real days are limited by walking and the 26:00 limit. A bot that teleports overstates output. |
| Day end wiring: `sleep()` args (forage spots, map, `Math.random`) | `endDay` | Small. Copy the call, or move it into core as `endDay(g, random)`. |
| Profession choice after a level up | `afterAction` | The bot must pick one, as the scripts do with `PROFESSION`. |
| Ground piles picked up by walking | `pickUp` | Bot must collect them (they are in `g.ground`). |
| Festival hours, exits that are shut | `openFestival`, `exitOpen` | Out of scope for a first bot. |

The conclusion: little needs moving into core. The one real gap is time. The
fix is a small cost model in the bot (minutes per action, plus walking minutes
from tile distance divided by `SPEED`), not a change to the game. Moving
walking into core is not worth it for this.

## Options considered

1. **Headless bot on `src/core/`** (recommended). A Node script under
   `scripts/sim/` driven by a seeded generator. Runs a year in about a second,
   so it can run hundreds of seeds and give a spread, not one lucky run. It
   checks economy and progress, not input or scenes.
2. **Speed up the browser runs.** Playwright's `page.clock` can fast forward
   timers. It cannot be trusted for movement: `update` caps the step at 50 ms
   per frame, so walking does not speed up with the clock. Shorter waits and a
   dev-only faster `TICK_MS` help a little. This stays a cheap follow-up, not
   the answer, because the runs would still be minutes long.
3. **Fuzz or property tests of the rules** in Vitest (random action
   sequences, check invariants such as money never negative, inventory never
   over capacity). Cheap, and it fits the existing gate. It finds bugs, not
   balance, so it complements option 1 rather than replacing it.
4. **Record and replay inputs.** Gives exact repeats of a browser run, but
   needs recording code and breaks with every control change. Not now.

How other projects do it, in brief: simulation-heavy games commonly run the
rules with a fixed time step and a seeded random source and drive them with
scripted "personas", which is option 1. Replay and fuzzing are used for
regressions. This matches the split the issue suggests.

## Proposal

- Build option 1 as `npm run sim` (manual, not a gate, like the playtests).
  Option 3 can follow as ordinary unit tests.
- Personas are the same three as note 08 (expert, intermediate, casual),
  written as plans over the core actions, so the numbers stay comparable.
- Time model: each action costs a fixed number of game minutes (table in the
  bot, tuned once against a browser run), walking costs tiles divided by
  `SPEED`, using a breadth-first search over `map.isBlocked`. The day ends at
  26:00 or when energy runs out, through the same `sleep()`.
- Output: days to each bundle, money by season, days passed out, crops
  withered. Print a median and range over N seeds. Compare two builds by
  running the same seeds on both.
- The browser scripts stay for input, scenes, HUD and touch.

## Calibration

The first check is that the headless expert lands near the browser expert in
note 08 (all bundles around day 41 to 45, with the Pantry dropped). If it is
far off, the time model is wrong and gets fixed before any result is trusted.

## Out of scope

Pathfinding quality beyond shortest tile distance (#317 is the browser bot
getting stuck, a separate problem), festivals, the carpenter, combat, and any
change to game rules.

## Decisions

Decided by the owner on 2026-11-01:

1. Build option 1, the headless bot on `src/core/`. The browser speed-ups
   (option 2) wait.
2. The time model (fixed minutes per action, walking from tile distance,
   calibrated against a browser run) is close enough.
3. The first result to report is bundle-chain pace (days to each bundle and
   to all bundles). Money by season comes second.

## As built

`scripts/sim/`: `world.ts` (position, walking and the `TIME` model), `bot.ts`
(one persona playing a game on the real core), `personas.ts`, `main.ts` (many
seeds, a report) and `run.mjs` (loads the TypeScript through Vite, so the JSON
content and `import.meta.glob` work as in the game). `tests/sim.test.ts` checks
that a seed repeats and that the expert finishes in a sane window.

Time model as built: a tile costs `16 px / 80 px/s` of real time, times 10/7
game minutes per second, times a 0.85 diagonal factor; a farm key press costs
0.5 minutes; shop, hall and bin screens cost nothing, because the farm is
paused while they are open. The player wakes beside the bed and every other
trip starts from where the last action ended.

Not modelled: festivals, the carpenter, trees (never chopped), tool upgrades,
eating beyond a low-energy snack, and the stuck walking of #317.

First results (100 seeds each, days to finish all four bundles): expert median
41 (range 41 to 49), intermediate median 42, casual median 54 with 88 of 100
finished by day 84. Note 08's browser runs gave 41 and 45 for the first two.

The calibration is weak. The expert's pace is set by crop growth and the
calendar (cauliflower 12 days, melon 12 days from day 29), not by walking, so
landing on day 41 does not show the time model is right. The walking constants
matter once a persona is limited by time, as the casual one is. Check them
against a browser run before using a result for a balance decision.

## Calibration (#328)

Checked on 2026-11-01, 40 to 100 seeds a persona.

- **The time model does not change the bundle pace.** The key press cost
  (0.25, 0.5, 1 and 2 minutes) and the diagonal factor (0.7, 0.85 and 1) gave
  the same days to every bundle, for all three personas. The reason is that no
  persona is limited by time: a played day ends by about 7:30 am at the
  latest on the clock the sim keeps (`day ends before bed` in the report), far
  from the 2 am limit. Pace is set by crop growth, the season dates and forage
  luck. So the weak calibration noted above does not weaken the bundle-pace
  result. It will matter once something makes a day long (more crops, the
  carpenter, tree work); rerun the check then.
- **Diagonal factor 0.85 became 0.9.** Eight-way routes against four-way ones
  on the real maps: farm start to shop 0.82, hall door to shop 0.96, hall door
  to the shelf 0.84, and 1.0 for short hops. About 0.9 over the long trips,
  higher over the short hops that most field work is.
- **Walking speed is not measured in a browser.** It follows from the scene
  (`SPEED` of 80 px/s, 7 s a 10 minute tick), and the browser bot walks in
  straight four-way runs, so it would measure the bot, not a player.
- **The casual gap was behaviour, not time.** The sim casual finished 88 of 100
  games, where the browser casual did not finish by day 85. The browser casual
  sold goods the hall wanted before handing them in. With that behaviour
  (`keepsForHall: false`) the sim casual finishes 0 of 100 by day 84: 27 get
  Spring Foraging, 4 get Spring Crops, as in note 08's "year 2" and "stuck".
  The sim casual is a little harsher than the browser one, which sold most of
  its forage, not all of it.

Update 2026-11-07: the hall has ten bundles. The bot plays seven of them (the
forage and crop bundles, including Quality Crops with its silver rule) and
skips Woodland, Artisan Goods and the Smith's (`UNPLAYED_BUNDLES` in
`scripts/sim/bot.ts`), since it cannot yet chop, mine or run machines. The sim
ends when the played seven are done, and `tests/bundles.test.ts` covers the whole
hall. The expert's median finish is day 54, set by five silver melons and corn.
The bot now plants round weeds, which it never clears.

Update 2026-11-07 (builder session e): the bot now plays the 112 day year. It
farms through fall and winter (clearing weeds to find soil), so Winter Foraging,
Autumn Crops and Quality Crops are played. It chops trees, cuts weeds and breaks
rocks on the farm and mine floor 1 for Woodland, and buys ore and coal from the
smith and runs the furnace for the Smith's (it keeps 1,500g back for seeds, and
cuts a few young trees a day so the doors stay open). Artisan Goods was
skipped at first (it needs jar and bee house runs and an orchard); see the
Artisan Goods calibration update below. Expert medians over 10
runs: Woodland day 73, Smith's day 57, Autumn Crops day 65, Winter Foraging day
87, all played bundles day 88, with 9 of 10 runs finishing (one misses the fifth
silver melon). Woodland is gated by fiber: 30 fiber is about 60 weeds, and only
20 weeds appear on each of three season starts, so a player must let weeds spread
and cut them in bulk. That is a tuning flag for note 63. The casual does not play
Woodland or the Smith's (it sells what it finds). The report now prints four
seasons of money.

Update 2026-11-08 (Artisan Goods calibration): the bot plays Artisan Goods
opt-in with `SIM_ARTISAN=parallel|after` (default off, the baseline is
unchanged). `SIM_ORCHARD_RESERVE` sets the gold kept back after the tree
(default 300; high means buy the tree only when flush). Two findings.

- A bot bug is fixed: coal was bought only inside the furnace trip, which stops
  once the Smith's is done, so the second machine (8 coal each) was never
  crafted. With the bot buying coal for machines, jam, pickles and honey all
  finish in every run that reaches them. Expert finishes went from 24 of 40 to
  32 of 40 (reserve 300).
- The remaining gate is the fruit slot. The bundle takes 4 of 5, and jam,
  pickles and honey are only three, so a fruit is always needed. A sapling costs 4000g
  (apple) and a tree bears 28 days after planting, in its season. Expert, 40
  runs to day 140, "after" mode: buying the tree early (reserve 300) finishes
  Artisan Goods at median day 77 (37 of 40), all bundles at day 88 (32 of 40),
  with season 2 money 5003. Buying only when flush (reserve 6000) pushes
  Artisan Goods to median day 113 (33 of 40), but keeps season 2 money at 8904.
  Intermediate: reserve 300 gives Artisan median day 123 (18 of 40), reserve
  6000 gives day 120 (31 of 40). So for the expert Artisan Goods fits year one
  only by spending 4000g on a tree at the end of spring, and for the
  intermediate it is a year two bundle either way.
- Not resolved: a few seeds finish Woodland late (day 120 or later) when the
  bot runs Artisan Goods, which looks like the fiber timing (weeds stop in
  winter) and not the tree.
