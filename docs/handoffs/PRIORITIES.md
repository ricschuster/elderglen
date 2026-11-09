# Design priority list

The single live copy. Read it at the start of each session, and update it in
the handoff pull request (tick off what is done, reorder, add). Do not copy the
list into handoffs; link here instead. Set by the owner on 2026-11-06 (handoff
2026-11-06p) and updated since.

Start each session by asking which item to take.

## Milestone order (ADR 0012, 2026-11-08)

M3 (close out: the owner's play), M3b ring 1 systems (fishing, combat, villagers,
horse, building placement #611, cask, dye vat and greenhouse built), M4 multiplayer, M3c story
and ending, M3d polish, then M5 and M6. The list below is the design order within
that. The map areas (notes 71 to 78) are M3b too since 2026-11-08 (owner). Filed
work packages: #595 to #604, #611, #636 to #646 and #649 (map areas).

## Open, in order

1. **Completion tracker (#196). Built 2026-11-08 (PR #573).** Counters for
   friends, slayer, gallery and elderfruit are locked at 0 until their
   systems exist (fish went live with fishing slices 1 and 2, #595). The top-level menu entry and the day-end recheck are done
   (#586), and `noteCooked` is called now (#593). Left: the summit achievement, the hall scene and rewards, and a look at the layout
   in a browser. "Items crafted" counts only buildable recipes (owner, 2026-11-08).
2. **Story spine (started 2026-11-08q; ring 1 part nearly done).** The warden head
   and her staged reveal (#177), the sea elf and Homeward pin (#176) and the
   hermit witch Rosmarin (#178) are settled bar small items. The third
   community project (#5) is NOT part of this: it is centre 3 in ring 3 (M6) and
   waits for ring 2 (#20, M5), so how the warden head's old line matters to the
   ending is parked there (owner, 2026-11-09). Below Special Orders
   (2026-11-06): nothing in slices 1 to 3 needs it, and it is only needed
   before slice 5 (note 33), alongside the heart events. Owner put it before art.
3. **Map areas** (notes 71 to 78, M3b, owner answers recorded 2026-11-08). One
   note per unbuilt area. Recommended build order, from note 71: contract
   additions (#636, ten of them, built) first, then Forest part 1 (#637, built
   2026-11-09: map, lake and its six fish, six groves with regrowth, forage and the
   onion bank, and the farm's north exit; area worlds in `core/areas.ts`, see note
   72 "Built status"), Secret Woods (#639, built 2026-11-09 with the massive log,
   six daily stumps and forage; the carpenter's Hardwood sale is gone; the pond's
   fish and the statue wait for the fish and elderfruit slices, note 73 "Built
   status"), River delta with the Beach (#640, built
   2026-11-09: map with marsh lake, channels and sea, the farm's south exit, the
   fisher's hut and counter, delta forage and tide pools, the 300 wood footbridge;
   the ferry, the Hearthwell exit, pots and the legend wait, note 75 "Built status";
   it unblocks #596), Mountain (#642 built 2026-11-09: the map, the lake and
   river, pines, rocks and forage, the Forest exit, and the rockfall and mine mouth
   that moved the Mines door off the farm; #643 built 2026-11-09: the forge hut with
   the smith's counter moved from the mine hall, and the stonekeeper's yard, note 74
   "Built status"; lamps wait; #649 built 2026-11-09: the Quarry map, the mended bridge,
   regrowing stone and ore and the dwarf's camp, note 78 "Built status"), Forest part 2
   (#638 built 2026-11-09: the farmstead and keeper's counter that now sells young animals
   and hay, the hermit's tower and the Wanderer's camp; names, the hermit's stock and
   the paddock animals wait, note 72 "Built status"), Lake cove (#644), Hearthwell shell (#645) and interiors (#646), Beach
   elf (#641, waits on the story spine). Changed order since the draft: the Quarry
   is new at step 4b and the maps moved up from M3c. Open design items left:
   Hearthwell's river layout (two arms chosen, detail not designed). The cove treasure spot is settled.
4. **Art direction and audio plan.** Character art (note 15), ruined and
   restored hall rooms (#335), and the placeholder swap. No audio note exists
   (audio plan: #527).
5. **Ring 2 shape and travel** (#20, M5). Parked until slice 3 is played.

**Done (#639, 2026-11-09):** the carpenter's temporary Hardwood sale was removed
with the Secret Woods (six daily stumps and the log). Mahogany stays off the map
for now.

Session 2026-11-09 part three (handoff 2026-11-09c): orchestrated build of map areas, one sub-agent and one PR at a time: #636, #637, #639, #640 and #642 (first part) merged. Next: #649 (Quarry). (#643, the Mountain forge and yard, built after.)

Session 2026-11-09 part two (handoff 2026-11-09b): hermit witch Rosmarin and her fairy rings settled, #5 and the warden head's line parked for ring 3 after ring 2. Next: note 54 question batch, then ring 2 (#20) if the owner agrees.

Session 2026-11-09 (handoff 2026-11-09): warden head settled bar two items, sea elf Thalwen settled for ring 1, ADR 0013. Next: the hermit witch (#178), then #5.

Sea elf (2026-11-09, note 09, #176): Thalwen (was Ondrel, too close to Oriel), knew Oriel slightly, cannot say why she has not sailed home across the sea, travelling coat and half-packed trunk, cottage on the Beach dunes. Her unfinished business ties to a haven elf in ring 2 (a keepsake quest like Birdie's), voice dreamy and courteous, the pin comes from her trunk. Open: the haven elf's slot, the keepsake, whether she leaves or stays, the pin's price.

Warden head, two items left open (2026-11-09, note 09 open list, #177): (1) how her old line matters to the ending, to settle with the third community project (#5) and ADR 0013; (2) the exact stops, finds and ring 2 milestones for her three stage 5 errands. Tuning items (trail and gift values, shop list, token prices, board order list) wait for note 07.

Session 2026-11-08q (handoff 2026-11-08q): story spine started. The warden head's role is settled (knew Oriel, note trail, own board, carrier's mark, #177). Next: her open items (name, trail, look, board), then #176, #178, #5. #201 and #136 closed.

Session 2026-11-08p (handoff 2026-11-08p): Stardew checks, no build. Cask days match Stardew (#669), winter fish to match Stardew (note 21, fish not chosen), dye pots to follow Stardew and need the clothing and look design first (#660 waits). Owner chose #636 next.

Session 2026-11-08o (handoff 2026-11-08o): built #653 to #658 (PRs #662 to #667), all closed. Unplayed. Left from the 2026-11-08n batch: #659, #660 (waits on the Dye Pot page) and #661.

Session 2026-11-08n (handoff 2026-11-08n): second question round. Hearthwell's river layout is decided (note 77), the cast energy and the Quarry dwarf are settled, the dye list waits on a saved page. Build issues #653 to #661 are filed.

Session 2026-11-08m (handoff 2026-11-08m): owner answers to the open fishing, mines and Quarry questions, recorded in notes 21, 22, 24, 60, 73, 74, 77 and 78. They create build work (see the handoff). The Quarry's four questions are closed.

Session 2026-11-08l (handoff 2026-11-08l): a large building session (placement,
fishing, horse, mines, greenhouse, moss) and then the map area answers. Next
session starts by asking which item to take; recommended is #636, the map
contract additions.

Session 2026-11-08k (handoff 2026-11-08k): housekeeping, no design or build.
Note 70 stays unbuilt until the owner says go. A crop wish list is not designed.

Owner playtest, 2026-11-08 (after handoff 2026-11-08j): coop, barn, silo and
cooking were played by hand and work as far as the owner can tell. The silo
order that failed earlier now orders fine, so that report is closed. Not yet
played: the new axe pick-ups. The playtest scripts edited for four tool slots
are still unrun.
Closed after it: #531 and #521, and the M3-vertical-slice milestone. The coop
and barn leftovers (door tiles, art, heater, professions, incubator tile) are in
issue 618.

Session 2026-11-08h (handoff 2026-11-08h): the M3 split, hint box, debug menu
groups and the coop and barn drawing fix. No design work.

Built on 2026-11-08 (handoff 2026-11-08g, build session, nothing designed): the
collections menu row and day-end recheck (#586), the placeable furniture
catalogue (#587), a longer smoke script (#588), animals in three slices (note
23, #589 to #591: coop and barn tiers, chickens, ducks, rabbits, cow, goat,
sheep, pig, incubator, hay silo), the cheese press, mayonnaise machine, loom and
oil maker (#592) and cooking with a stove and eight dishes (note 24, #593).
None of it was played by hand. Not built: heater, animal professions, the
keeper, animal art, most recipes, cooking achievements. Next: a hands-on play of
coop, barn and cooking, then the Forest keeper design and animal art.

Built on 2026-11-08 (handoff 2026-11-08f, build session, nothing designed):
the completion tracker and collections page (#196, #573), geodes by band with
per-kind pools and dwarf sales (note 69, #574), the furniture catalogue at the
carpenter (200,000g after house tier 1, #575), festival maps for the Harvest
Showing and Hollow Eve (#576), the mail system with the hatter's letter (note
51, #577), mines floors 11 to 120 as digging only (#578), the Hearthsilver bar
and fifth tool tier (#579), flooring and wallpaper at the carpenter's (#580, owner: stays there), iron from
floor 26 (#582), the request board with delivery and gathering requests and the
errand achievements (note 50, #583), and the playtest bot fixes with a smoke
script (#333 done, #584). Many numbers are placeholders. Open questions are in
the handoff.

Designed on 2026-11-08 (handoff 2026-11-08e): geodes (note 69), festival maps
(note 66 addendum), fruit energy (SC-66 closed) and the completion tracker's open
points (note 39). Nothing built.

Built on 2026-11-08 (handoff 2026-11-08d): menu rows at touch size (#542), zoom
keys and pinch zoom (#543), playtest script fixes (#524), geode kinds as items
(#521), and the device pixel ratio settled as not needed (SC-72). Design item
added: a layout addendum to note 66 for the festival maps (Harvest Showing and
Hollow Eve maze) before they are built. Done 2026-11-08: the addendum is in
note 66. Geode drops and contents are drafted in note 69.

Built on 2026-11-08 (handoff 2026-11-08c): Artisan Goods calibration in the sim
bot (owner: accept year two, keep the 4000g sapling) and the tier 2 widening
(#550). Next: pick from the list above, the completion tracker (#196) design
note first. Tap-to-move on a tablet is still unplayed (#523).

Built on 2026-11-08 (handoff 2026-11-08a): tap-to-move as the default tablet
scheme (#546), button-only shops (#545), tool reach 1 (#547). Queued from owner
answers: larger tier 2 kitchen and bedroom (needs a note first), Artisan Goods
calibration in the sim bot, and the placeholder comparison against Stardew.

Built on 2026-11-07 (handoff 2026-11-07j): window canvas (#520), growing house
interiors with tiers 2 and 3 and the cellar (#421, #286, #282), six parity fixes
(#521), Special Orders and debris (note 65), axe ladder, ore bin and storms.
Coop and barn (#531) wait on animals. Larger tier 2 kitchen and bedroom wait on
an owner call. Follow-ups: #542, #543.

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

Smaller leftovers still open (tracked in #522): request board extras (star
counter and prize tickets, story quests, friendship pay, hand-in to the poster,
fishing, slaying and hello types, the journal Quests section), friendship mail, the Long Road and fish seed letters and the journal Mail
section, the placeable 0g furniture catalogue (note 10; the shop version is
built), festival maps beyond the first two (even-year maze and reward, the
gap's tell, other festivals, villagers' spots; need the village map, note 56),
storm strikes (slice 3), and the fruit bat and mushroom art. Done since: the
hatter's letter, the furniture catalogue (shop version), Hearthsilver grade,
and festival maps for the Harvest Showing and Hollow Eve. The axe ladder, the
mine hall's ore-only bin, Artisan Goods in the sim bot and weather-only storms
are built.

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

Session i (2026-11-07, handoff 2026-11-07i) closed M2, filed the leftovers as
issues and settled the growing interiors (note 68). Session j built the next items.

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
