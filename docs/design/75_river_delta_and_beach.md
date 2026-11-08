# 75 River delta and Beach (draft)

Status: draft, written 2026-11-08 for the owner to review. Nothing here is
built. It designs the River delta map with the Beach at its east end (note 19,
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
| Hearthwell exit | North edge, x 66 to 72, y 0 | 7 wide | Entry `from_hearthwell` at (69, 3). Staged until Hearthwell exists |
| Marsh lake | x 8 to 38, y 28 to 52 | about 30 by 24 | Reeds, boardwalk on the north shore |
| Main channel | x 62 to 66, y 0 to 50 | 4 to 5 wide | Runs into the sea at y 50 |
| Side channel | x 50 to 53, y 18 to 30 | 3 wide | Feeds the marsh lake |
| Fisher's hut | Door at (38, 28) | Exterior 10 by 7 | East shore of the marsh lake. Rods, bait, lures |
| Dock and ferry landing | x 24 to 28, y 54 to 58 | 5 by 5 | South shore of the marsh lake. Exit `ferry` |
| Footbridge | (64, 36), east to west | 6 by 3 | To the Beach. See open question 4 |
| Beach sand | x 60 to 99, y 20 to 52 | about 40 by 32 | The east end of the map |
| Elf's house | Door at (78, 30) | Exterior 9 by 7 | Beach elf's house, a dune above the sand |
| Tide pools | x 90 to 99, y 40 to 48 | 10 by 9 | Far east end. Forage zone |
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
| Fisher's hut | The fisher (F, halfling, candidate). May keep the ferry (open question 5) | `fisher-hut`, shop and home. Sells the four rods, bait and the seven lures (note 21) |
| Elf's house | The odd elf (F, elf, candidate) | `beach-elf-house`, shop and home. The Homeward pin at 3 hearts (note 09, #176, #181) |
| Dock | Maybe the fisher | The ferry to the cove |

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

**Tide pools:** 20 candidate spots at the east end, outside the caps. About 1.2 goods
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

## Debris and trees

No choppable trees: willows and reeds are cosmetic. Driftwood twigs, 20, and a few
rocks, 12, hand placed. No weeds beyond a handful in the marsh meadow.

## Map contract needs

Water kinds (1), forage tables and regions (3, 3a), conditional layers for the
ferry (6), `rideable` (7). The footbridge is a ground run, no new object.

## Build order and slices

1. Shell: terrain, river channels, marsh lake, sea, collision, the farm exit, the
   fan of water kinds, the Hearthwell exit staged. Fishing on the marsh lake and the
   channels with their tables (this unblocks #596 slices 3 and 4 partly).
2. The sea and the pier, the sea fish and salt water pots.
3. The fisher's hut: interior, counter, gear moves out of the general store.
4. Forage: marsh and beach tables, tide pools, the new shell goods in data.
5. The ferry dock as scenery, ruined, then live with the cove (`76_lake_cove.md`).
6. The elf's house, with #176.

Work packages: "River delta and Beach map, waters and the fisher" (steps 1 to 4) and
"Beach elf's house" (step 6, waits on #176).

## Open

- Question 4 (the footbridge), question 5 (the ferry's keeper) and question 10
  (riding) in note 71.
- Festivals on the Beach (Stardew has several, saved Beach page): ours do not use
  the Beach in note 14, so no variant map is planned.
- Prices and names of the new shore goods, in note 07.
