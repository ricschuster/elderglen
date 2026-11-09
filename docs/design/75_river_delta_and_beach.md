# 75 River delta and Beach (steps 1 to 4 built)

Status: draft, written 2026-11-08, owner answers recorded the same day (note 71).
Steps 1 to 4 are built (2026-11-09, #640, see "Built status" at the end); the elf's house was built later (#641, "Built status"); pots and the legend are not. M3b. It designs the River delta map with the Beach at its east end (note 19,
decision 13). Overview and owner questions: `71_map_areas_overview.md`. Stardew
facts are from the saved Beach page (read 2026-11-08), as ideas only (ADR 0002).

## Why

The delta is open from the start and it is where fishing lives: the marsh lake
(7 fish), the sea (10 fish) and the end of the river, plus the fisher who sells
rods, bait and lures (`21_fishing.md`, `20_ring1_cast.md`). Fishing slices 3 and 4
(#596) cannot finish without it. It is also the ferry landing for the Lake cove
and the home of the odd elf who sells the Homeward pin (`09_story_and_lore.md`,
issue 176).

## Decisions (draft)

1. **One map, `delta`, 100 by 70 tiles** (7,000, our own guess, note 19). Longest
   crossing 20 seconds. The Beach is its east end, walked to, not entered through
   an exit (note 19, decision 13).
2. **Three exits:** north-west to the Farm, north to Hearthwell (where the river
   comes in), and the ferry to the Lake cove at the dock.
3. **The river ends here in a fan of two channels.** The main channel runs to the
   sea, the side channel feeds the marsh lake. One river line (note 19, decision
   1).
4. **Four water kinds on one map:** `marsh-lake`, `river` (the channels), `sea`
   (the Beach and the south), and the cove is another map. All water on the Beach
   is the sea table (saved Beach page: every tile there is salt water, even the
   river just upstream of the bridge).
5. **The fisher's hut is the fishing shop** (note 58: one interior, shop and
   home). The fishing gear moves from the general store to her counter when this
   lands (note 21, built slices 1 to 3).
6. **The elf's house is on the Beach,** with the Homeward pin stall inside
   (note 58). Her backstory, her ship and her harbour are #176 and stay open.
7. **Shells and tide pools are new forage,** because the Beach holds items the
   valley's forage list has none of.

## Shape and layout

```text
 x:  0        25        50        75      99
 y0  +---------------------------------------+
     |[Farm exit]        [Hearthwell exit]   |
     | (10..16,0)        (66..72,0)          |
 y20 |    side channel(50..53)  main channel (62..66)
     |  MARSH LAKE     FISHER   |  \   BEACH   ELF
     |  (8..38,28..52) (38,28)  |  bridge(64,36) (78,30)
 y46 |   .......reeds      sand strip (56..99,44..52)
     |   DOCK(26,55)  TIDE POOLS (90..99,40..48)
 y52 |  ferry to cove   S E A  (56..99,52..69), pier (88,48..58)
 y69 +---------------------------------------+
```

| Feature | Place (tiles) | Size | Notes |
| --- | --- | --- | --- |
| Farm exit | North edge, x 10 to 16, y 0 | 7 wide | Entry `from_farm` at (13, 3) |
| Hearthwell exit | North edge, x 66 to 72, y 0 | 7 wide | Entry `from_hearthwell` at (69, 3). Built with Hearthwell part 1 (#645, note 77 "Shell built") |
| Marsh lake | x 8 to 38, y 28 to 52 | about 30 by 24 | Reeds, boardwalk on the north shore |
| Main channel | x 62 to 66, y 0 to 50 | 4 to 5 wide | Runs into the sea at y 50 |
| Side channel | x 50 to 53, y 18 to 30 | 3 wide | Feeds the marsh lake |
| Fisher's hut | Door at (38, 28) | Exterior 10 by 7 | East shore of the marsh lake. Rods, bait, lures |
| Dock and ferry landing | x 24 to 28, y 54 to 58 | 5 by 5 | South shore of the marsh lake. Exit `ferry` |
| Footbridge | (64, 36), east to west | 6 by 3 | To the Beach. Always open, a ground run, no new object |
| Tide pool footbridge | x 86 to 89, y 44 to 47 | 4 by 4 | Between the sand and the tide pools. **Broken until repaired** with 300 wood (owner, 2026-11-08). Conditional layer `tide-bridge-mended` |
| Beach sand | x 60 to 99, y 20 to 52 | about 40 by 32 | The east end of the map |
| Elf's house | Door at (78, 30) | Exterior 9 by 7 | Beach elf's house, a dune above the sand |
| Tide pools | x 90 to 99, y 40 to 48 | 10 by 9 | Far east end, behind the broken footbridge. Forage zone |
| Sea | x 56 to 99, y 52 to 69 | about 44 by 18 | Casting spots on the shore and the pier |
| Pier | x 88, y 48 to 58 | 3 by 11 | Land for casting, as in the saved page (piers are land) |

The north-west quarter between the Farm exit and the marsh lake is reeds and marsh
meadow: scenery and forage, no buildings.

## Exits, entries and doors

| Object | Name | Target | Notes |
| --- | --- | --- | --- |
| exit | `to_farm` | `farm` entry `from_delta` | North edge, west |
| exit | `to_hearthwell` | `hearthwell` entry `from_delta` | North edge, centre. Staged |
| exit | `ferry` | `cove` entry `from_ferry` | `requires: cove-open`. Ruined boat art until the Water room is done (contract need 6) |
| exit | `fisher` | `fisher-hut` entry `door` | Fisher's hut |
| exit | `elf` | `beach-elf-house` entry `door` | Elf's house |
| entry | `from_farm`, `from_hearthwell`, `from_ferry`, `from_fisher`, `from_elf` | Beside each exit | `from_ferry` is the dock tile beside the boat |

The farm maps gain an exit `delta` at the south edge with entry `from_delta`
(note 55). The farm already routes players there in the notes, but no exit exists
yet.

## What lives there

| Place | Who | Interior |
| --- | --- | --- |
| Fisher's hut | The fisher (F, halfling, candidate). She does not keep the ferry (owner, 2026-11-08) | `fisher-hut`, shop and home. Sells the four rods, bait and the seven lures (note 21) |
| Elf's house | The odd elf (F, elf, candidate) | `beach-elf-house`, shop and home. The Homeward pin at 3 hearts (note 09, #176, #181) |
| Dock | Nobody | The ferry to the cove. You step on the boat, like a door (owner, 2026-11-08) |

A ship or a quay on the sand is scenery only and left undecided on purpose (#176).

## Forage

Two tables, because the Beach is its own place. Per-map tables (contract need 3), with
a table per region of the map (a `region` object, class already exists, contract
need 3a).

**Marsh and reeds** (the west half): 24 candidate spots. Cap 3 a morning.

| Season | Weights |
| --- | --- |
| Spring | dandelion 40, daffodil 30, salmonberry 30 |
| Summer | sweet pea 60, spice berry 40 |
| Fall | bramble berry 60, crab apple 40 |
| Winter | winter cress 60, snowdrop 40 |

**Beach and sand** (the east half): 40 candidate spots. Cap 5 a morning, in every
season, since the saved page calls the Beach a rich place with fast spawns. The
shells are new goods, names plain English, prices placeholders for note 07.

| Season | Weights |
| --- | --- |
| Spring and fall | periwinkle 55, razor clam 25, whelk 15, cockleshell 5 |
| Summer | periwinkle 40, razor clam 20, whelk 10, cockleshell 6, pearly shell 24 (rare) |
| Winter | periwinkle 25, razor clam 15, whelk 12, spiral shell 48 (rare) |

**Tide pools** (behind the broken footbridge, so the player cannot reach them
until it is mended): 20 candidate spots at the east end, outside the caps. About 1.2 goods
a night, 80 percent sea fan and 20 percent pin urchin (saved page: Coral and Sea
Urchin at those rates; ours are renamed). No limit on a morning, and a small chance
of seaweed on the water's edge, 3 percent a night.

All shore goods give 7 Foraging XP, as the saved page does for the Beach.

## Fishing

- **Marsh lake:** the 7 fish of note 21. No legend (the notes say it has none).
- **River channels:** the 9 River fish.
- **Sea:** the 10 sea fish, the Pearl Lobster at low odds and the legend Great
  Hearthfin (summer, day, any weather). Salted Bait works here only (note 21).
- **Pots:** fresh water pots on the lake and channels, salt water pots on the sea.
  The Water room reward gives three pots (note 16).
- **Casting spots:** the pier counts as land. Beach shore and the marsh boardwalk
  are open; reed edges are not.

## The tide pool footbridge (owner, 2026-11-08, as Stardew)

The footbridge to the tide pools is broken at the start, as the saved Beach page
describes (SC-86). The player repairs it by handing in **300 wood** at the bridge
(the Action button on the ruined tiles asks first, as a purchase does), once, for
good. Wood only: Stardew also allows the second community upgrade (a hall reward
that Elderglen has no matching version of), so ours has one way, the wood. The
repaired flag is saved as `tide-bridge-mended` and the conditional layer swaps the
ruined art for the mended art (contract need 6). While it is broken the exit
tiles past the bridge are solid, not an exit object, so the check treats the pools
as reachable with the condition true and unreachable with it false, and both runs
must still pass. The 300 wood is a placeholder for note 07 (it comes from the
Forest and Mountain, note 43).

## Debris and trees

No choppable trees: willows and reeds are cosmetic. Driftwood twigs, 20, and a few
rocks, 12, hand placed. No weeds beyond a handful in the marsh meadow.

## Map contract needs

Water kinds (1), forage tables and regions (3, 3a), conditional layers for the
ferry and the tide pool footbridge (6), `rideable` (7). The Beach footbridge at
(64, 36) is a ground run, no new object.

## Build order and slices

1. Shell: terrain, river channels, marsh lake, sea, collision, the farm exit, the
   fan of water kinds, the Hearthwell exit staged. Fishing on the marsh lake and the
   channels with their tables (this unblocks #596 slices 3 and 4 partly).
2. The sea and the pier, the sea fish and salt water pots.
3. The fisher's hut: interior, counter, gear moves out of the general store.
4. Forage: marsh and beach tables, tide pools, the new shell goods in data. The
   tide pool footbridge with its 300 wood repair and the `tide-bridge-mended` flag.
5. The ferry dock as scenery, ruined, then live with the cove (`76_lake_cove.md`).
6. The elf's house, with #176.

Work packages: "River delta and Beach map, waters and the fisher" (steps 1 to 4) and
"Beach elf's house" (step 6, waits on #176).

## Open

- Riding is allowed here (note 71, answer 10). The ferry works like a door and
  dismounts the rider (note 76).
- Festivals on the Beach (Stardew has several, saved Beach page): ours do not use
  the Beach in note 14, so no variant map is planned.
- Prices and names of the new shore goods, in note 07.

## Built status (2026-11-09, #640)

Build order steps 1 to 4 are built, except the pots and the Great Hearthfin legend
(see "Not built").

- **Map:** `src/content/maps/delta.json`, 100 by 70, drafted by
  `scripts/gen-delta-map.mjs` (the JSON is the source from then on). Properties
  `wild`, `rideable` and `waterKind` marsh-lake. Water kinds are zones: the marsh lake
  (default), `river` (the main channel and the three side channel rects, an L that
  runs from the channel to the lake) and `sea` (the sea and the lagoon by the
  tide pool bridge). Willows are cosmetic tile art (no choppable trees); 20 twigs,
  12 rocks and 8 weeds are hand placed.
- **Exits:** `to_farm` (north edge, x 10 to 16) with entry `from_farm` (13, 3), and
  `fisher` to the hut. The farm and the Woodland farm gain exit `delta` (bottom
  row, x 21 to 23) and entry `from_delta` (22, 28). **Not cut:** the Hearthwell exit,
  the ferry and the elf's exit, so no entries for them either (the targets do not
  exist yet).
- **Where it differs from the sketch:** the hut is 9 by 7 at x 40 to 48, y 34 to 40,
  with its door on the south wall at (44, 40) and entry (44, 41), because the note's
  door (38, 28) sits at the lake's north-east corner and not on the east shore.
  The pier is at x 80 to 82, y 48 to 58 (the note's x 88 collides with the tide
  pool footbridge). The marsh lake is split from the east bank by the main channel
  (x 62 to 65, to y 51); the Beach footbridge is at x 61 to 66, y 35 to 37. A reed
  footbridge crosses the side channel at y 23 to 24, so the hut is a short walk from
  the farm road and not around the lake. The Beach sand is x 66 to 85 and not 60 to
  99, since a cliff wall shuts the east end (the pocket and the lagoon).
- **Fisher's hut:** `fisher-hut.json`, a 10 by 7 interior with one counter
  (service `fisher-shop`). It sells the four rods, Plain, Fine and Salted Bait and
  the lures. The general store stopped selling them (the stand-in is removed).
  The fisher herself is not drawn or named (no villager sprites yet); the counter
  buys back goods as the general store does.
- **Fish:** the 7 marsh lake fish and the 10 sea fish of note 21 are in
  `fish.json`, prices placeholders. A cast reads the water kind of the first water
  tile ahead. Salted Bait now works and can be fitted at the sea (and only there).
- **Forage:** `forage-areas.json` entry `delta`. The marsh region (x 0 to 55) is
  capped at 3 and the Beach (the default table) at 5, apart, through a new optional
  `tableCaps` map (a table with an entry fills to its own cap; a fractional cap such
  as 1.2 is a whole part and a chance of one more). The tide pools (region
  `tide-pools`, 20 spots) give about 1.2 a night, 78 percent sea fan, 19 percent pin
  urchin and 3 percent seaweed, so the note's 80 and 20 are approximated and the
  seaweed chance is part of the table and not a separate roll. Nine new shore goods
  are in `forage.json` with no seasons, so the farm's shared pool never holds them.
  Foraging XP is the usual 7. Spots: 24 marsh, 40 beach, 20 pools.
- **Tide pool footbridge:** `core/tidebridge.ts`. Broken at the start: the four
  bridge tiles are shut by a conditional `collision` layer (unless the flag) and
  covered by a conditional art layer, and four `tide-bridge` services on a
  conditional object layer stand on them. Action on one asks ("Press Action again
  to mend it for 300 wood"), the second press takes 300 wood, sets
  `tide-bridge-mended` and reloads the map at entry `at_bridge` (85, 45), since the
  way through is read when the map loads. The map check reads both ways: it does
  not flag forage spots behind a shut gate in the "all conditions false" reading,
  and still requires them reachable with all conditions true.
- **Also fixed:** a map `region` that names a forage table was drawn as a grey hall
  room wash (it hit the Forest's onion bank); the wash is now for hall rooms only.
- **Ferry:** built later (#644, 2026-11-09): the dock, the gated exit and the ruined and repaired art, see note 76 "Built status".
- **Elf's house:** built later (#641, 2026-11-09), see "Elf's house built" below.
- **Not built:** shellfish and crab pots (nothing in the game makes a pot yet), the Pearl
  Lobster, the legend Great Hearthfin, and the fisher as a named person.
- **Playtest:** `npm run playtest:delta` (leaves by the farm's south exit, casts a
  rod on the marsh lake, the river and the sea, buys a rod, mends the footbridge
  and crosses it, sleeps).

## Elf's house built (2026-11-09, #641)

Drafted by `scripts/gen-beach-elf-house.mjs`; the JSON is the source from then on.

- **Cottage:** on the Beach dunes in `delta.json`, a 7 by 5 solid building at x 77 to 83,
  y 23 to 27 (the sand's north-east, under the cliff wall), door on the south wall at
  (80, 27), exit `elf`, entry `from_elf` (80, 28). Placeholder art as the fisher's hut.
- **Interior:** `beach-elf-house.json`, 12 by 9. Her counter, service `pin-stall`
  ("Thalwen's Pin Stall"), stands on the north wall. A crate beside the door is the
  half-packed trunk (note 09), a bed, a shelf and a table are solid furniture.
- **The stall:** a stand-in counter that opens the shop screen titled "Thalwen" with one
  row, the Homeward pin, and buys back goods as the other counters do. She is not drawn
  or named in speech (no villager sprites yet).
- **The pin:** item `homeward-pin`, kept (cannot be sold), sold once only ("available
  until purchased", as the saved Krobus page gives for Stardew's Return Scepter).
  Placeholder price 1,500,000g (note 07), a little under Stardew's 2,000,000g.
- **Gaps closed by the smallest choice:** hearts and villagers do not exist (#599), so
  the stall is not gated at 3 hearts yet; the gate is added with friendship. The pin does
  nothing when held, since the warp rings it returns from are not built. Her ship is not
  drawn (the pier at x 80 to 82 is where it would be moored). Still open as in note 09:
  the haven elf's slot, the keepsake and token, whether she leaves, the pin's final price.
- **Playtest:** `npm run playtest:beach-elf` (walks to the cottage, enters, opens the stall,
  is refused with 100g, buys the pin with a full purse, is refused a second).

