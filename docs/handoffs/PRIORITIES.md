# Design priority list

The single live copy. Read it at the start of each session, and update it in
the handoff pull request (tick off what is done, reorder, add). Do not copy the
list into handoffs; link here instead. Set by the owner on 2026-11-06 (handoff
2026-11-06p) and updated since.

Start each session by showing the owner this list (the open items in order, and the
layout and tiles track) and asking which item to take (owner, 2026-11-11).

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
   (#586), and `noteCooked` is called now (#593). Summit slices 1 to 5 are built (achievement, hat, mail furniture, lamp, letter, the steward's call, the hall scene `SummitScene` with placeholder lines). Left: the real lines and art with the voice sheets (the valley summit waits for ring 2), a look at the scene in a browser, and a look at the layout
   in a browser. "Items crafted" counts only buildable recipes (owner, 2026-11-08).
2. **Story spine (started 2026-11-08q; ring 1 part nearly done).** The warden head
   and her staged reveal (#177), the sea elf and Homeward pin (#176) and the
   hermit witch Rosmarin (#178) are settled bar small items. The third
   community project (#5) is NOT part of this: it is centre 3 in ring 3 (M6) and
   waits for ring 2 (#20, M5), so how the warden head's old line matters to the
   ending is parked there (owner, 2026-11-09). Below Special Orders
   (2026-11-06): nothing in slices 1 to 3 needs it, and it is only needed
   before slice 5 (note 33), alongside the heart events. Owner put it before art.
2b. **Ancestors' shrine and evaluation (note 83, drafted 2026-11-11).** Settled: the
   shrine, 20 points, Stardew's candle cuts, the statue, the three ancestors, the
   scene lines and Oriel's letter, the Diamond as a gem below the Glimmerstone. Left: the
   Diamond's name, art and drop rates (SC-135), the shrine's tiles under the old tree
   (farm layout, #776), the scene's shots, and the camp chest's exact items by floor
   (note 22). Nothing built.
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
   the paddock animals wait, note 72 "Built status"), Lake cove (#644 built 2026-11-09: the cove map, the ferry on the delta, the Water room gate, 8 cove fish, forage and the treasure chest; the Hearthwell Carp legend is built since (#596, 2026-11-10, with the four other legends, note 21), and the gate opens when the Water room bundles 13 to 18 are done (built 2026-11-10, note 21), note 76 "Built status"), Hearthwell shell (#645 built 2026-11-09: farm, Mountain and delta exits, the 12 buildings as solid exteriors, the hall and sawmill doors moved off the farm, store, smithy and Outpost board stand-ins; note 77 "Shell built") and interiors (#646 built 2026-11-09: eleven interior shells, the ten shut doors open, store and smith counters moved inside, no people; the farm keeps its own counters pending an owner decision, note 77 "Interiors built"), Beach
   elf (#641 built 2026-11-09: the cottage, its room and the Homeward pin stall as a stand-in counter at a placeholder 1,500,000g, not gated by hearts; note 75 "Elf's house built"). Changed order since the draft: the Quarry
   is new at step 4b and the maps moved up from M3c. Owner decisions 2026-11-09 (after the builds): farm counters removed (#707, #710), forge hut ungated, smith screen split with weapons bought at the dwarf (#708, #711), geodes not bought (#712). Open design items left:
   none on Hearthwell's river layout (built as terrain in #661, 2026-11-09: the map file with arms, bridges, streets and 12 reserved lots, no buildings, note 77 "Built status"). The cove treasure spot is settled.
4. **Art direction and audio plan.** Character art (note 15), ruined and
   restored hall rooms (#335), and the placeholder swap. No audio note exists
   (audio plan: #527).
5. **Ring 2 shape and travel** (#20, M5). Parked until slice 3 is played.

## Layout and tiles track (note 81, set 2026-11-11)

The shared rules for the map, festival, mine and interior layouts are in
`docs/design/81_layout_shared_rules.md`. Task order, with what gates each step.
Art waits for M3d (ADR 0012).

Design, can start now:

- Step 1: Farm layout. **Done 2026-11-11, owner checked** (note 55, Tiled draft in
   `docs/design/drafts/farm-draft/`, build issue #776). Unblocks the farm map, the
   farmhouse and the cabin interiors.
- Step 2: Festival spots for the other eight festivals (note 80 item 3, note 82), with 8
   player start spots as well as the villager spots. **Locations settled 2026-11-11**
   (note 82: only the Showing on the green). Attendance, hours and getting there are
   settled. Spots drafted for the Harvest Showing (green), Midwinter Feast (hall and
   square), Cake Day (inn lane) and Seedswap (Forest clearing, with a seed hunt) and
   Lamplight (Beach, lantern floating) and Frostday (Forest lake, ice fishing contest).
   Hollow Eve (hedge, villagers in wall niches) and the Hat Parade (out-and-back march on the
   street) drafted 2026-11-11, so **step 2 is done, owner checked 2026-11-11** (Hollow Eve niches accepted; the Hat Parade march is auto-play, +20 friendship). Festival areas are shut
   until opening (note 82 decision 12).
- Step 3: Heart events and spouse routes. **Done 2026-11-11** (note 84, build issue #600): events need the
   person on the map by route, the spouse keeps their village job, one shared room and
   outside corner, the wedding on the festival green. It adds no interiors. Left for the farm: the corner's
   tiles (note 55).
- Step 4: Interior layout notes, a Tiled draft of one pilot interior first. Not the
   farmhouse or cabin until step 1.
- Step 5: The layout page design note (dev server, objects and block-out regions, saves
   to the map JSON after the contract checks; note 81 decision 11).

In parallel, the owner:

- Step 6: Hands-on play of the built areas, to check the placeholder metrics (paths 2
   wide, doors 1, 60 s on foot and 30 s on the horse to cross) and feed the
   valley layouts.

Build, small:

- Step 7: The layout page, before the valley and festival layouts.
- Step 8: Wait for the M4 spike: how a jam between blocking players is freed, and
   whether a tablet host needs several maps in memory (could change the
   120 by 120 cap).

Layout work, by track:

- Step 9: Valley maps, area by area in the order of note 71, after step 6.
- Step 10: Festival layouts, from step 2.
- Step 11: Farmhouse and cabin interiors. **Drafted 2026-11-11** (note 85, Tiled draft in
    `docs/design/drafts/house-draft/`): the shared spouse room right of the bedroom from
    tier 1, the hall, fixtures and marks, the furnished nursery, wider connectors and three stairs from the Stardew screenshots, all eight renovations, a picture per tier and per renovation, the farm's spouse corner, the cabin as the
    farmhouse map. Waits for the owner's check of the sketch, then a build issue.
- Step 12: Mines, after combat's leftovers (#598: boots, special floors, lamps, rest-camp
    supplies, rare creatures).

Art, in M3d:

- Step 13: The `above` layer and seasonal tilesets in the scene, just before the swap.
- Step 14: The owner's 5 to 10 reference images, then a style sheet in rounds.
- Step 15: The licence ADR for any non-code generated art.
- Step 16: The art swap: the owner draws characters, portraits and some special items;
    Claude generates terrain, props and buildings.

**Done (#639, 2026-11-09):** the carpenter's temporary Hardwood sale was removed
with the Secret Woods (six daily stumps and the log). Mahogany was reopened 2026-11-10: player-planted,
seed from the Secret Woods (note 36 "Mahogany"), built 2026-11-10 (#724) except tapping and the monster drop.

Session 2026-11-11 part seventeen (handoff 2026-11-11r): design only. Step 11 is drafted in note 85 with a Tiled draft: the spouse room right of the bedroom from tier 1, the farm corner at x 70 to 71, y 4 to 11, the cabin is the farmhouse map. Next: the owner checks the sketch, then step 4 (a pilot interior) or step 5.

Session 2026-11-11 part sixteen (handoff 2026-11-11q): design only. Owner checked the festival tiles, then step 3 is settled in note 84 (heart event presence rule, spouse routes, wedding on the green). Next: step 11 (farmhouse and cabin interiors, with the spouse corner and bed route) or step 4 (a pilot interior).

Session 2026-11-11 part fifteen (handoff 2026-11-11p): design only. Festival spots for Hollow Eve (everyone in the maze, in hedge niches so no one blocks) and the Hat Parade (walk the route in the line) are drafted in note 82, which finishes step 2. Next: the owner checks the tiles, then step 3 (heart events) or step 11 (farmhouse and cabin interiors).

Session 2026-11-11 part fourteen (handoff 2026-11-11o): design only. Camp chest items by floor, the Last Seat needs all 23 others, coop and barn heaters, infested floors, the ring 1 ending scene and bundles 20, 24 and 26 are settled (#819 to #821). Next session: festival spots for Hollow Eve and the Hat Parade (step 2).

Session 2026-11-11 part thirteen (handoff 2026-11-11m): questions and fixes. The touch toolbar is a left column (#813); owner answers on special floors, the camp chest, lamps, the heater, year two and the ring 1 ending are in notes 22, 23 and 63 (#814); bundles 3, 6 and 22 built (#815). Open: the camp chest item, the Last Seat gate, bundles 20, 24 and 26, the ending scene text. Next: more design questions, then the builds they unblock, then play the tablet.

Session 2026-11-11 part twelve (handoff 2026-11-11l): a build session, eleven PRs (#801 to #811): villagers with schedules, friendship and gifts, festival data and the shut rule, heart events and their runner, boots, rod trash and the recycler, animal professions, the Last Seat bundles, villagers drawn in the scenes. On the tablet, unplayed. Design is now the blocker for: year two rules, the ring 1 ending, the heater, rest camps, special floors, lamps, rare creatures. Next: play it, then Hollow Eve and the Hat Parade spots.

Session 2026-11-11 part eleven (handoff 2026-11-11k): festival spots drafted in note 82 for Seedswap (seed hunt), Lamplight (lantern floating) and Frostday (ice fishing contest); festival areas shut before opening (decision 12). Left: Hollow Eve and the Hat Parade. Design only.

Session 2026-11-11 part ten (handoff 2026-11-11j): the screen stays on and undimmed on the tablet (#791), and festival locations, attendance and spots are designed in note 82 (#792 to #796) for the Showing, Midwinter Feast and Cake Day. Next: spots for the other five festivals, or the farmhouse and cabin interior (step 11).

Session 2026-11-11 part nine (handoff 2026-11-11i): the Action button is obsolete in tap-to-move (#789, note 27): tap a ripe crop, forage or fruit to pick, tap the farmer to eat or get off the horse, tap the horse to mount. Built and on the tablet; harvest, eating and the horse by tap not yet played. Next: play them, then the tablet frame rate, rerun the playtests, replay a full game.

Session 2026-11-11 part eight (handoff 2026-11-11h): tap uses the held tool (#786) and five save slots (#787) are built, merged and on the tablet. Not built: export and import per slot (Options has none). Next: tablet frame rate on the dense farm, rerun the playtests, replay a full game.

Session 2026-11-11 part seven (handoff 2026-11-11g): first tablet play. Doors, bin, seed drag and the farm-choice preview are fixed and merged (#782 to #784). Designed, not built: tap uses the held tool when it fits (note 27) and five save slots (note 52). Next session builds both, then looks at the tablet frame rate and replays a full game.

Session 2026-11-11 part six (handoff 2026-11-11f): the farm map is merged (#779) and the owner's first look is built (#780): walk-through exits, hoe and can on the own tile and by mouse drag, 250 trees and denser clutter. Next: rerun playtests on the denser farm, then festival spots (step 2) or the farmhouse and cabin interior (step 11).

Session 2026-11-11 part five (handoff 2026-11-11e): the real farm map is built (#776, merged as #779; note 55 "Built status").

Session 2026-11-11 part four (handoff 2026-11-11d): design only. The farm layout is settled and owner checked (note 55, Tiled draft in `docs/design/drafts/farm-draft/`, build issue #776). Step 1 of the layout track is done. Next: festival spots (step 2), or the farmhouse and cabin interior (step 11, now unblocked). Build order unchanged.

Session 2026-11-11 part three (handoff 2026-11-11c): design only. Issues #636, #640, #642, #659 and #526 closed and the overview refreshed. The layout and tiles shared rules are settled in note 81, and the layout track order is recorded above. Cabins are placed freely and players block each other (notes 53, 55). Next: the farm layout (note 55), then festival spots. Build order unchanged.

Session 2026-11-11 part two (handoff 2026-11-11b): design only. Night Market owner check done (Stardew-scale decor 200 to 1,000g, fireplace 15,000g, four fish, spots and layout accepted), note 54 is fully answered, snow is not rain, small leftovers settled (legends once a year, idle keys frozen to the tags in use, trader stock rotates). Next: the Night Market build (three-day span, solstice dates in data and tests), then festival spots for the other festivals, then #599. Build order unchanged.

Session 2026-11-11 (handoff 2026-11-11): design only. The Winter Night Market is designed in note 14 (six attractions, no boats, nine place hats over three years, spots for 18 villagers, a lit pier, four market-only fish). Next: the festival date and three-day span build task, then festival spots for the other festivals, then #599. Build order unchanged.

Session 2026-11-10 part eleven (handoff 2026-11-10o): design only. Reeve edits done, per-season routes for all 30 (note 80), solstice festivals (Lamplight Evening Summer 24, Midwinter Feast Winter 25) and a ninth festival, the three-evening Winter Night Market (Winter 16 to 18, note 14). Next: Night Market stalls and stock, festival spots with the festival maps (note 66), then #599. Build order unchanged. Festival data and tests need the new dates.

Session 2026-11-10 part ten (handoff 2026-11-10n): design only. Shop hours (note 79), default and rain routes for all 30 and weekday overrides (note 80) are settled. Next: season overrides and festival spots, then the reeve edits in notes 14, 50, 57 and 65, then #599. Build order unchanged.

Session 2026-11-10 part nine (handoff 2026-11-10m): design only. Villager schedules (note 79), all 30 names, all 30 birthdays and the reeve are settled. Next: shop hours, first routes, then #599. Build order unchanged.

Session 2026-11-10 part eight (handoff 2026-11-10i): note 54 question batch answered, Mahogany reopened and designed (#724). Build order unchanged.

Session 2026-11-10 part seven (handoff 2026-11-10h): the notes 09 to 62 audit is finished; stale status lines fixed, note 55 differs from the farm map and needs an owner decision. Build order unchanged.

Session 2026-11-10 part six (handoff 2026-11-10g): first pass of the notes 09 to 62 audit, stale built and unbuilt claims fixed in notes 22, 25, 31, 33, 34, 68 and 69; the rest of the audit is listed in the handoff. Build order unchanged.

Session 2026-11-10 part five (handoff 2026-11-10e): note 07 fixed against the code (PR #720) and about two thirds of the audit done; the rest is listed in the handoff. Owner decision still open: wheat, build it or leave it not built. Build order unchanged.

Session 2026-11-10 part four (handoff 2026-11-10d): second audit pass, note 07's numbers against the code, about half done and nothing fixed. Nine stale places in note 07 are listed in the handoff (aim reach, cast energy, rod gates, wheat, the Hardwood stand-in, the fertiliser term, tool upgrades, mines, geodes). Next: fix them in note 07 and finish the pass. Owner decision: wheat, build it or mark it not built. Build order unchanged.

Built shellfish pots (#596, 2026-11-10: place, bait, daily catch with junk, quality, XP, tracker, shop at the fisher; bundles 17 and 18 and the legends wait, note 21 "Built in slice 4, part one").
Built the fishing professions (Fisher, Trapper and the level 10 Angler, Pirate, Mariner, Luremaster, with the level 10 choice screen) and the Pearl Lobster on the rod (#596, note 21 "Built in slice 4, part two"). Left of #596: bundles 13 to 18, the legends, trash and the recycler.

Built the ring slots (#597, 2026-11-10: `core/equipment.ts`, glow and magnet rings, wearing screen from the hat box, magnet wired into pickup; boots, Defense and combat rings wait, note 37 "Built").

Built #660 (dye vat takes any plant from `src/content/dyes.json`, one colour each; Dyer's bundle ask unchanged; the six pot station waits on the clothing design, note 10).

Water room bundles 13 to 18 built 2026-11-10 (#596, note 21): the cove ferry can now open. Next in the owner's order: the five legends, then trash and the recycler.
Built the five legends and the crown (#596, 2026-11-10, note 21 "Built in slice 4, part three"): Hearthwell Rod and Water room gate, once a year, crown in the bar. Left of #596: trash and the recycler, water plants; open: once a year vs free repeat, the Valley King in the farm pond.

Session 2026-11-10 part three (handoff 2026-11-10c): consistency audit (#716, #717). Stale docs and labels fixed; owner decisions: one Special Orders board on the Outpost wall, ore at the Hearthwell smithy, the Dyer's bundle in the Guests' Board. Build order unchanged: pots (#596), Water room bundles, legends.

Session 2026-11-10 part two (handoff 2026-11-10b): verification and housekeeping only (PR #714). Every playtest script was run; four stale scripts fixed, no game fault found. Build order chosen by the owner: shellfish pots (#596), then the Water room bundles 13 to 18, then the five legends. None started.

Session 2026-11-10 (handoff 2026-11-10): the four open map decisions built (#710 to #712): farm counters removed, smith screen split, geodes not bought.

Session 2026-11-09 part four (handoff 2026-11-09d): orchestrated build of the rest of the map areas, one sub-agent and one PR at a time: #643, #649, #638, #644, #661, #645, #646 and #641 merged. Every map package on the list is now built to shell level. Next: the owner plays the new areas, then the note 54 question batch.

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
