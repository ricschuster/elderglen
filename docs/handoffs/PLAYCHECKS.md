# Play checklist (#951)

Source of truth for status. Run an area with `/playcheck <area>`. Each line is "do X,
expect Y". Status: `todo`, `pass`, `fail #n`, or `owner` (needs the owner's eyes or hands).
Record the date and commit with each result. Add lines as we think of them.

## Marriage

Headless run 2026-11-21, build 18e829da plus the stage fix (`marriage.mjs`, `family.mjs`, `spouse-day.mjs`).

- pass: Wake on the wedding morning at house tier 1; the wedding plays and the spouse appears (`marriage.mjs`, after raising the tier in its setup).
- pass: Spouse walks out: house 8:22, farm 8:23 to 8:29, off every map 8:30 to 8:32, Hearthwell edge 8:33 (`spouse-day.mjs`). Tablet look: owner saw it 2026-11-21.
- pass: Spouse in the bed 6:00 (48,24), kitchen 7:30 (25,23) (`spouse-day.mjs married`).
- pass: Evening walk: the walker read the house without the spouse wing, so her room (63,27) was off its map and she snapped; it now reads the house with the spouse hold (2026-11-21, `tests/walkers.test.ts`).
- pass: Rain or festival day puts the wedding off: the morning report says "put off a day: it is raining" or "a festival is on" (owner chose a report line, 2026-11-21; `tests/engagedreport.test.ts`); the toast is gone.
- pass: Divorce by the rules: file, fee 50000 paid, cancel, refile, end next morning, `ex-` flag up (`marriage.mjs`). owner: the hall ledger (30,5) interaction by hand.
- pass: Re-dating: bouquet then token to the ex works, stage back to engaged (`family.mjs`).
- pass: Children: ask due a week after the wedding at tier 2, yes brings one in 3 days, no second ask at once; the child stays after a divorce (note 12, our choice) (`family.mjs`).
- owner: Spouse after 22:00 and 10:30 to 18:00 is on none of house, farm, Hearthwell (indoors elsewhere?). Not checked.
- Found and fixed: the married stages had the wedding day 3 days ahead, so the spouse kept her villager schedule (`src/core/statepatch.ts`, test in `tests/stages.test.ts`). `marriage.mjs` never raised the house tier for the token gate; fixed.

## Festivals

Headless run 2026-11-21, `playtest:sweep` with `KIND=festival` (11 runs, 70 s) plus the festival unit tests (152).

- pass: Walk in and join: green and hedge festivals through the gate, the six in-place festivals, both Hollow Eve years (small and large maze), Frostday, the Feast (in place and at the hall). Counters and panels open and close, the visit is recorded, the farm runs after leaving.
- pass: Night Market: the sweep opens it; stalls, panel and leaving work. The three evenings are stages (`night-market-evening-1` to `3`); the crowd, hats, pier and float are left to the owner's look.
- Found and fixed: five festivals failed first (hat parade, seedswap fair, cake day, Frostday, Hollow Eve). The Use key talked to the stallkeeper standing beside the counter, so the counter never opened. A service on the faced tile now wins (`talkTarget` `exactOnly`, `FarmScene.meetVillager`, test in `tests/villager-tiles.test.ts`). After the fix 11 of 11 pass.
- owner: festival looks and feel with the crowd walking (art is placeholder), and the Stardew festival rows still open.

## Mines and combat

Headless run 2026-11-21 (`combat.mjs`, `mine-floors.mjs`, `quarry.mjs`, mine and combat unit tests, 125).

- pass: Stages `mines-30`, `mines-60`, `mines-100` load their floors with creatures (4 each) and no console error; the player swings for 12 s on each (`mine-floors.mjs`).
- pass: Combat by the rules: the dummy takes a hit, a creature hurts and is beaten, kills on floors 45 and 100 give combat XP, a knock out ends in the report. Fixed `combat.mjs`, which still picked the weapon at `4 + i` (tools sit in the pack now, note 102), so every swing used no weapon.
- pass: Quarry (`quarry.mjs`): bridge, stonekeeper, rocks, stone.
- owner: Swing arc and monster speed by feel. Headless only shows speeds of 0 to 1 tiles/s while creatures wander; none chased in 12 s, so chase speed is unchecked.
- pass: `smoke.mjs` ends with no findings (2026-11-21, issue 996: the findings were stale script assumptions about the pack and the carpenter rows).

## Fishing

Headless run 2026-11-21, build 6358d834 (`rods.mjs` new, `delta.mjs`, `cove.mjs`, `mountain.mjs`, fishing unit tests, 151).

- pass: Each rod: the four `fishing-*` stages put the rod in the pack at its level, and a charged cast on the delta river opens the screen with that rod and lands (`rods.mjs`). A full charge with a rod of range above 4 lands on dry ground on a 4-tile river ("The line falls on dry ground"): by design, the player charges less.
- pass: Waters by kind: marsh lake, river, sea (`delta.mjs`), cove (`cove.mjs`), mountain river (`mountain.mjs`); each bite matches its water. The fisher's counter sells rods and bait and a rod buys (open 9:00 to 17:00, shut Sat, `shops.json`).
- pass: Pond, ice, pier and market fish rules by unit tests (`pond*`, `farmpond`, `icefishing`, `marketpier`, `woodspondfish`, `nightmarket`, 13 files).
- todo: Farm ponds by hand: place a pond, stock it, wait for fish. No stage has a pond with fish yet (note 42 lists it as not built).
- owner: Bar fight feel with each rod's bar width, and the Night Market pier cast by hand.
- Found and fixed: `delta.mjs`, `cove.mjs` and `mountain.mjs` were stale scripts, not game bugs: toolbar slot is the pack slot (note 102); the fisher's counter is at (3,5) and (4,5) facing up and the shop is shut before 9:00 (the script now sets 10:00); the hut door is at (5,10).

## Places and other systems

Headless run 2026-11-21, build 145d83a6 plus script fixes (`forest.mjs`, `secret-woods.mjs`, `forge.mjs`, `farmstead.mjs`, `beach-elf.mjs`, `hearthwell.mjs`, `greenhouse-smoke.mjs`, `boxed.mjs`, `wood.mjs`, new `systems.mjs`; 152 unit tests).

- pass: Places by walking in and out: Forest (oak felled, forage, the night), Secret Woods (log gives 8 hardwood, large stump 2, back after the night), forge counter and stonekeeper, farmstead keeper counter (animal bought), hermit tower, Wanderer's camp, beach elf cottage and pin stall, Hearthwell (hall, sawmill and carpenter, store, smithy, healer, inn, library gallery, hatter, Outpost and rooms, three burrows, Orders and news boards, Mountain and delta exits), greenhouse (dig, plant, water, sprinkler, tree, fruit, move).
- pass: Cart (three stops, a ride lands in Hearthwell), herb stall (five rows), hat picker and tailor screens open and close (`systems.mjs`, stage `hall-6`).
- pass: Unit rules for tapper, tea bush, bombs, tailoring, woods creatures, Secret Woods, lights, lanterns and room rewards (152 tests). The even-year maze ran in the Festivals sweep (both Hollow Eve years).
- owner: Lamps and lamp posts by sight, cart and herb stall looks, tea bush and tapper by hand, bombs by feel, Secret Woods creatures chasing.
- Found and fixed: seven scripts were stale, not game bugs. Interiors grew, so counters and exits moved (now read from the map files); doors and counters keep hours and a new game starts at 6:00 on a Monday (farmstead shut Mon, library shut Mon, inn opens 12:00, sawmill shut Tue); felled wood and hardwood drop on the ground; the hermit opens a shop when he has stock; the library counter opens the gallery; the road news board speaks real news; toolbar slot is the pack slot in `greenhouse-smoke.mjs`.

## Heart events

Headless run 2026-11-21, build 89e72819 plus script fixes (`playtest:sweep` with `KIND=event`, 6 workers, 17 min; the same with `BRANCHES=1`, 16 min; new `heart-extras.mjs`, 1 page, 60 s; unit tests 90).

- pass: Every event opens by walking to its place inside its window, shows the warning, plays to its end, gives its reward, raises its flag, is recorded as seen and does not repeat the next day: 150 of 150 (`sweep.mjs`).
- pass: Every answer of every choice: 147 branch runs, 147 pass.
- pass: Warning and "not now": the scene opens with Go on and Not now; Not now closes it, records nothing, does not offer it again the same day, and offers it again the next day (`heart-extras.mjs`).
- pass: One event a day: a second event the same day does not start. Festival days and weather and season conditions are covered by unit tests (`heartevents.test.ts`), not run in a browser.
- pass: A replay (opened by code) gives no reward and is not recorded (`heart-extras.mjs`).
- fail #1002: No sprite moves in any of the 150 scenes. Events only `place` people and `pan`; `walk`, `face` and `pose` are never used. Needs design (stage marks and paths per map, note 62).
- fail #1003: The journal has no replay list (`seenIds()` is never called), and the warning is a Go on / Not now panel, not the mark over the person with a chime that the owner chose on 2026-11-12.
- owner: How the scenes look and read (placeholder room, placeholder text, #950), and the reward feel.
- Found and fixed: `sweep.mjs` set the clock to the window start plus 2 minutes, which the game refuses (multiples of 10 only), so every event failed to start; it now rounds up to the next 10.

## Saves, controls, device

- todo: Save split on a real tablet (`persist()`), `late-game-100` on the SM-T500.
- owner: Finger feel for control schemes 1 and 4.

## Bundles

Headless run 2026-11-21, build 5a72ea16 (`playtest:bundles`, 76 s; bundle, hall and last-seat unit tests, 48).

- pass: Every hall bundle fills through the real hall screen (30 of 30, rooms in order, the Last Seat last): each hands in, completes, pays its reward, completes its room, and the end screen opens after the last room.
- owner: Hall look and feel with the real art; the scroll text and reward moments by hand.
