# Design priority list

The single live copy. Read it at the start of each session, and update it in
the handoff pull request (tick off what is done, reorder, add). Do not copy the
list into handoffs; link here instead. Set by the owner on 2026-11-06 (handoff
2026-11-06p) and updated since.

Start each session by asking which item to take.

## Open, in order

1. **Window sized canvas, HUD anchoring and zoom** (#520, ADR 0009). Designed in
   note 64 and settled on 2026-11-07 (world zoom 75 to 200 percent, UI size 75
   to 150, black bars around small maps, three window modes in the desktop ADR).
   Ready to build, not built. The game still draws a fixed 960 by 540 canvas,
   and the build touches every screen.
2. **Completion tracker (#196).** Special Orders and seasonal debris were
   designed in note 65 (2026-11-06), not built. The tracker is next.
3. **Story spine.** The warden head and her staged reveal (#177), the sea elf
   and Homeward pin (#176), the hermit witch (#178) and the third community
   project (#5). Together they decide what the ending and the Last Seat mean. Below Special Orders
   (2026-11-06): nothing in slices 1 to 3 needs it, and it is only needed
   before slice 5 (note 33), alongside the heart events. Owner put it before art.
4. **Art direction and audio plan.** Character art (note 15), ruined and
   restored hall rooms (#335), and the placeholder swap. No audio note exists
   (audio plan: #527).
5. **Ring 2 shape and travel** (#20, M5). Parked until slice 3 is played.

## Build track (slice 1, note 33)

Owner asked for builds on 2026-11-07. Done: builds 1, 2, 3 (weeds, Fiber,
fertilizer, sprinklers with a minimal crafting screen), 6 (mines part 1),
7 (machines and recipes), the six slice 1 bundles (#488), 5 (fruit trees
only, #487), 8 (hats, festival counters, furniture, #490 and #491) and 9
(Standard and Woodland, #489). Bundles 4, 9, 10 and 12 use spring and summer
stand-in pools until build 4.

Build 4 (fall and winter, #495), the fall and winter festivals (#496), the
dehydrator (#497) and the farm cave (#498) were built on 2026-11-07, so the
slice 1 build track is done apart from the leftovers below. Nothing built since
build 4 has been played in the browser yet.

Session e (2026-11-07, handoff 2026-11-07e) built the sim bot's full year,
quartz and the quality sprinkler, pickaxe tiers and the smith's upgrades, crafted
furnaces, chests and the workbench, Old Greencoat's door scene, the camp chest,
geodes, and slice 1's achievements with the hatter.

Smaller leftovers still open (tracked in #522): the furniture catalogue (needs a design answer:
where it is sold and its price, note 41), the hatter's letter, mail gifts and the
achievements that wait for later systems, the axe ladder and the Hearthsilver
grade, the mine hall's ore-only bin, Artisan Goods in the sim bot, festival maps
in place of the festival screens, storms, and the fruit bat and mushroom art.

Session f (2026-11-07, handoff 2026-11-07f) fixed the first browser playtest
feedback: pickaxe repeat, click to open doors, name tags, the carpenter's Buy
button, the pale earth field (note 67), the furnace label and a sorted shop.
New leftovers (#524, and the shop rows in #522): update `scripts/playtest/` for
click doors, retire or repair the stale `gen-farm-map.mjs`, and decide whether
other shop rows buy only from their buttons.

Session g (2026-11-07, handoff 2026-11-07g) built the Android app (Capacitor,
ADR 0008) and installed it on three tablets. New leftovers (#523): play it on the
tablets, repeat the performance spike in the WebView, replace the placeholder
icon, and the tablet hosting plugin for M4.

Session h (2026-11-07, handoff 2026-11-07h) settled note 64 and answered most
of the Stardew checks register. New leftovers (#521), each from a register row: lift a
sprinkler with any tool (SC-48), picking up a working machine returns the input
(SC-50, SC-66), the bee house keeps its timer in winter (SC-50), fruit energy
per fruit (SC-52, SC-66), fruit bats leave any fruit in any season with the
nightly counts on the Cave page (SC-55), push a full chest with the axe or
pickaxe (SC-56), geode price per kind sold at the dwarf (SC-58, SC-67), and
count all gold received for the cave mark and money achievements (SC-54,
SC-61). The growing barn, coop and farmhouse interiors were settled later the
same day in note 68 (one map per building, unbuilt space black void, #525). Build
issues: #421 first (the tier layer loader and the merged house map), then #286
(tiers 2 and 3), #282 (cellar) and #531 (coop and barn). New register rows
SC-68 to SC-70 wait for the owner. Open register rows: #526.

## Remaining bundle work

Issue #181: the Last Seat numbers, the second-year rule and pacing. Issue #201
can close once the owner is happy with note 63.

## Done

- Window canvas design (note 64, 2026-11-06): no cap on the extra view, menus
  keep a centred 960 by 540 box, a separate UI size setting. Not built.
- Special Orders and seasonal debris design (note 65, 2026-11-06): board opens
  Fall 2 of year one, clock starts on acceptance, unique first reward and gold
  repeats, small capped rock and twig return each season but winter. Not built.
- Friendship loose ends (notes 61 and 62, 2026-11-06): six named universal
  loves, the universal hate list, the Midwinter pairing, the first eight
  people's draft lists and the scene commands. The first eight lists had their overlaps spread, and the three new items now
  have homes (Moonwool in note 23, the melon in note 14, the Glimmerstone in
  note 22). Still open there: final names for the three, the Harvest Showing
  scoring and the gem list. The other 22 people's lists and the heart event
  lists wait for their layer.
- Final game name (#138): Elderglen, ADR 0011. The register check is still open
  (USPTO, UK, Steam, app stores, .com).
- Bundle item pools and reward rebalance (note 63, 2026-11-06).

## Housekeeping

Tablet check (#336), note 45 and 60 open items, barn stall wing, note 54 answer
sheet.
