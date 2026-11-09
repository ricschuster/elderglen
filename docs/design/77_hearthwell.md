# 77 Hearthwell (draft)

Status: draft, written 2026-11-08, owner answers recorded the same day (note 71). The river
layout terrain (#661) and the shell (#645: exits, building exteriors, the hall and sawmill doors, see
"Built status" and "Shell built" at the end) are built. Interiors (#646) and people (#599) are not. It designs the Hearthwell town map, the largest social place in the
game. Overview and owner questions: `71_map_areas_overview.md`. Stardew facts are
from the saved Pelican Town page (read 2026-11-08), as ideas only (ADR 0002).
Positions follow the zoomed Hearthwell view of `56_valley_map.md` where the
river allows. The river layout is an open design item (see decision 3).

## Why

Every Brimmer lives here (note 19, decision 4), 22 of the 30 people live or lodge
here (note 20), and the shops, the Outpost, the carpenter, the hall and the
festival green are here. Today none of it exists as a place: the hall, sawmill and
shop counters hang off the farm map as placeholders. It is built last because
people need the cast list (#136) and schedules (#599), but its shell can come
earlier (note 71, build order).

## Decisions (draft)

1. **One map, `hearthwell`, 120 by 110 tiles** (13,200, Stardew's Pelican Town
   total, owner 2026-11-06, note 19). Longest crossing 24 seconds.
2. **Four exits:** west to the Farm, north to the Mountain along the river road,
   south to the River delta, and east to ring 2 across the broken bridge
   (gated, parked, #20).
3. **The river has two arms** (owner, 2026-11-08): a wide eastern arm crossed by
   the broken bridge, and the hall on the island between the arms. **The detailed
   layout was designed later ("River layout decided" and "Built status" at the end)** (where the main arm runs, how
   banks, bridges and streets sit, where the sawmill's wheel is, whether the arms
   rejoin south of the town). The sketch and the coordinates below are the
   earlier working draft and are placeholders until that design is done. The
   town stands on three pieces of land in the draft: the west bank, the island
   between the arms, and a thin far bank that only ring 2 uses.
4. **The Long Table (the hall) stands at the east end of the island,** on the road
   toward the bridge (note 19, decision 5), as an old inn on the road.
5. **All 11 households' homes can be entered** (note 19, decision 14): eight are
   shop-and-home, three are burrows that stand apart, and the Outpost has two maps
   (note 58).
6. **Trees are cosmetic.** Stardew's saved page says most trees in town cannot be
   chopped ("I shouldn't cut down trees in town"), so ours cannot either. Wood
   comes from the Forest and the Mountain.
7. **A town square at the main bridge,** with the Hearth room cart stop beside it
   (note 16, reserved, note 71 contract need 8).
8. **The festival green is the south of the island** at the existing placeholder's
   size, 36 by 22 (`green.json`). **Festivals load a decorated variant of the
   Hearthwell map** (owner, 2026-11-08, as Stardew): the same map with festival
   props, closed shop doors and festival spots for villagers. The separate
   `green` map is folded into that variant later (see slice 5). The hedge map
   stays on its own, entered from the green as note 66 says.
9. **Names and looks are open.** Role labels only (#136).

## Shape and layout

Tile coordinates: x 0 to 119, y 0 to 109. Sizes are placeholders.

```text
 x:  0        30        60        90     119
 y0  +---------------------------------------+
     |        [Mountain exit]   OUTPOST       |
     |         (48..54,0)        (88,7)       |
 y19 | STORE(22,19) HEALER(41,19) |~| GARDENER(68,28)
     |                           |~| burrow   |
 y30 | street ======== footbridge(59,30)       |
 y48 | INN(22,48) LIBRARY(41,48) |~|   HALL(99,49)
     | YOUNG burrow(8,47)        |~| waystation
y59  |>Farm exit  SAWMILL(50,62)=bridge(59,62)==SQUARE==road==> broken bridge (111,62) > ring 2
     |(0,56..62)                 |~|  (64..80,54..70)     (119,58..65)
 y77 | SMITHY(22,77) HATTER(41,77)|~| RETIRED burrow(67,82)
 y82 |                  footbridge(59,92)  GREEN (70..105,80..101)
 y109+----------------------------[Delta exit 70..76]---+
         ~ = main river arm (x 56..62)   east arm x 109..113
```

| Feature | Place (tiles) | Size | Notes |
| --- | --- | --- | --- |
| Farm exit | West edge, x 0, y 56 to 62 | 7 tall | Entry `from_farm` at (3, 59) |
| Mountain exit | North edge, x 48 to 54, y 0 | 7 wide | The river road on the west bank. Entry `from_mountain` at (51, 3) |
| Delta exit | South edge, x 70 to 76, y 109 | 7 wide | On the island. Entry `from_delta` at (73, 106) |
| Ring 2 exit | East edge, x 119, y 58 to 65 | 8 tall | Behind the broken bridge. Staged, `requires: bridge-mended` |
| Main river arm | x 56 to 62, whole height | 5 to 7 wide | Sawmill on its west bank. Fishing |
| East arm | x 109 to 113, y 0 to 100 | 5 wide | Wide and deep, the ring 2 border. Fishing |
| Bridges | (59, 30), (59, 62), (59, 92) over the main arm | 4 by 3, the middle one 6 by 3 | Always open. The middle one is the cart road |
| Broken bridge | x 109 to 113, y 60 to 64 | 5 by 5 | Ruined art, mended by the Last Seat (contract need 6) |
| Town square | x 64 to 80, y 54 to 70 | 17 by 17 | Well, benches, the cart stop at (66, 58) |
| Festival green | x 70 to 105, y 80 to 101 | 36 by 22 | Open grass, a bandstand stage at (88, 84) |

Streets are on the `paths` layer so no seeds spread. The west bank is a grid:
streets at y 30, y 60 and y 90 and an avenue at x 31 (the zoomed view's grid).
The island has an avenue at x 88 from the Outpost to the green, and the road along
y 60 to the broken bridge.

## Buildings and doors

All doors open to an interior map of note 58, placeholder 14 by 10 unless that note
says more. The `sawmill` and `hall` maps already exist.

| Building | Exterior (door tile) | Interior map | People (note 20) |
| --- | --- | --- | --- |
| General store | (22, 24) | `general-store` | Store keeper's household. Help Wanted board by the door (note 50). The gardener works here |
| Healer | (41, 24) | `healer` | The healer |
| Inn and kitchen | (22, 53) | `inn` | Inn keeper's family. The two young adults work here. The courier lodges here |
| Library | (41, 53) | `library` | The librarian |
| Smithy and mender | (22, 82) | `smithy` | The smith. **Tool upgrades, geode cracking and ore** (owner, 2026-11-08, as Stardew). Does not buy geodes |
| Hatter's shop | (41, 82) | `hatter` | The hat-maker and sibling |
| Sawmill and carpenter | (48, 66) | `sawmill` (exists) | The carpenter's household. Building, moving and removing farm buildings (note 60) |
| The Outpost | (88, 12) | `outpost` and `outpost-rooms` | The hall steward (lives here), the courier hangs out. Boards and the trader's stalls (note 57) |
| Gardener's burrow | (68, 32) | `burrow-gardener` | The gardener |
| Retired couple's burrow | (67, 86) | `burrow-retired` | Two retirees and the grandchild |
| Young adults' burrow | (8, 51) | `burrow-young` | The two young adults |
| The Long Table | (99, 55) | `hall` (exists) | Nobody lives there. The steward opens it |

- **Three burrows stand apart** on different edges of town (west, north-centre of the
  island, south of the island), not in one row (note 19, decision 14).
- **Footprints** (placeholder, tiles): shops 10 by 8, the inn 14 by 10, burrows 6 by 5
  with a round door, the sawmill 14 by 10 with a yard of log stacks and a mill wheel in
  the river, the Outpost 12 by 8 with a 17 by 6 stall yard south of it, the hall
  14 by 10.
- **The Outpost's wall** carries the road news board and, later, the Special Orders
  board (notes 57 and 65). The trader's stalls (Wednesday and Saturday) stand in
  the yard below it.
- **No building has a fixed shop-keeping hour in the map.** Hours and schedules are
  data, with villagers (#599).

## Exits, entries and gates

| Object | Name | Target | Notes |
| --- | --- | --- | --- |
| exit | `to_farm` | `farm` entry `from_hearthwell` | West edge |
| exit | `to_mountain` | `mountain` entry `from_hearthwell` | North edge |
| exit | `to_delta` | `delta` entry `from_hearthwell` | South edge. Staged until the delta exists |
| exit | `to_ring2` | none yet | Reserved. Not authored until ring 2 has a map (#20) |
| exit | one per building | The interior map's `door` entry | Gates: none, except festival closures (note 14) |
| entry | `from_farm`, `from_mountain`, `from_delta` | Beside each exit | |
| entry | `from_<building>` | One tile below each door | |

The farm maps lose their `hall` and `sawmill` doors when this lands, and the
`hearthwell` east exit with entry `from_hearthwell` is added to them (note 55).
`hall.json` and `sawmill.json` change their exit target from `farm` to
`hearthwell`.

## Forage and weeds

- **Forage:** per-map table (contract need 3). 24 candidate spots along the river
  banks and green edges. Cap 3 a morning. The saved Pelican Town page gives one or
  two goods per season, so ours is narrow on purpose.

| Season | Weights |
| --- | --- |
| Spring | daffodil 100 |
| Summer | sweet pea 100 |
| Fall | bramble berry 100 |
| Winter | crocus 55, holly sprig 45 |

- **Weeds:** four small starting patches behind buildings (placeholder), cleared with
  the scythe. The saved page says they die in winter and return each new year, so
  ours return on Spring 1 of each year (note 65 rules otherwise, no debris in town).

## Fishing

- **River:** both arms hold the 9 River fish (note 21), and the legend the Valley
  King (autumn, dawn, rain) is in the river. The saved Pelican Town page also puts a
  legend in its river.
- **Pots** on both arms. The sawmill's wheel and the bridges are land.

## The smithy (owner, 2026-11-08, as Stardew)

The Hearthwell blacksmith does tool upgrades, geode cracking (25g, note 69) and
buys and sells ore, and does not buy geodes (saved Blacksmith page, SC-58 and
SC-60). The Mountain smith dwarf is a Mines-side trader (note 74) with no tool
upgrades. The smith menu stand-in moves to this counter when the smithy exists.

## Interiors and the template

Interior shells follow note 58: a shop-and-home shell (about eight maps counting the
Outpost post room), a small burrow shell (three maps) and a one-room hut shell. Each
map then differs in furniture, counter and people. Day state and schedules inside
interiors are open (note 58) and belong to #599.

## Map contract needs

Water kinds (1), per-map forage (3), conditional layers for the broken bridge (6),
`rideable` (7), `cart` service kind (8), `board` service kinds for the Help Wanted
and Outpost boards (9). Everything else exists.

## Build order and slices

1. **Shell and move-out.** The map with the two arms, roads, bridges, exits, the
   existing `hall` and `sawmill` doors, counters for the store and the smith as
   `service` tiles outside until their interiors exist. Remove the farm's `hall`
   and `sawmill` doors, add the farm's east exit. Staged south exit.
2. **The Outpost:** exterior, boards, trader, interiors (note 57 build order).
3. **Interiors:** store, healer, inn, library, smithy, hatter and the three burrows
   as shells with a counter and furniture, no people.
4. **People:** placement, schedules, gifts, with #599 and the cast (#136).
5. **Festival variant** (owner, 2026-11-08): a decorated Hearthwell map per
   festival, with props and villagers' festival spots, replacing the `green` map
   (the green's festival code in `festivals.json` then names the variant).
6. **East arm, broken bridge and ring 2 gate,** with the Last Seat (#603).

Work packages: "Hearthwell part 1, the shell and moving the farm's doors" (step 1 and
2), "Hearthwell part 2, interiors" (step 3), and the people ride with #599.

## Open

- **The river layout (settled, built as terrain in #661, see "Built status").** Owner answer 8 fixed only two arms,
  the broken bridge across the wide east arm and the hall on the island. A
  design pass is needed for the main arm, bridges, banks and streets. The
  valley map zoom shows only what the answer supports (see `56_valley_map.md`).
- Riding is allowed here (note 71, answer 10), including the festival variant,
  unless a festival says otherwise.
- Cart stops: a stop at the town square, one at the hall, one at the farm and one at
  the Mountain's mine mouth are reserved. The cart screen and its fare are not
  designed. They need a note when the Hearth room is built.
- The exact interior sizes, once area sizes are set (note 58).
- Names, ages and schedules (#136, #599).

## Owner answer 2026-11-08m: the river layout

The two arms **rejoin south of the town**, with the hall on the island between them. The layout, bridges, streets and the sawmill's wheel need their own design pass before the shell (#645) is built. Not designed yet.

## River layout decided 2026-11-08n (owner, all the drafter's recommendations)

- **Main arm:** runs north to south down the west of the island and curves once. The
  west bank keeps the street grid and the Mountain road. The east arm is the wide
  one that borders ring 2.
- **Bridges:** three over the main arm, north, middle and south (draft rows at y 30,
  62 and 92). The middle one is the cart road.
- **The sawmill's mill wheel** turns in the main arm beside the carpenter's yard on
  the west bank.
- **The arms rejoin south of the festival green,** near the delta exit, so one
  river leaves the map to the River delta.
- The draft coordinates above stay placeholders. The curve moves the main arm off
  x 56 to 62 in its bend, so the Tiled draft sets the final tiles. Streets, house
  spots and landmarks still need the Tiled pass.

## Built status (2026-11-09, #661)

The river layout Tiled pass is built: `src/content/maps/hearthwell.json`, 120 by 110,
drafted by `scripts/gen-hearthwell-map.mjs` (the JSON is the source from then on).
Properties `rideable: true` and `waterKind: river`. Terrain only. **No building, door,
exit, farm map change, trees, forage or weeds**: those are #645 and later. The map is
not reachable in play yet (no exit leads to it). Tests: `tests/hearthwell.test.ts`.

**Final tiles (these replace the draft coordinates above where they differ):**

| Feature | Tiles |
| --- | --- |
| Main arm | x 56 to 62 (7 wide), straight from y 0 to 94, one bend east (quarter circle, centre (68.5, 94.5), radius 9), then a reach at y 100 to 106 |
| East arm | x 109 to 113, y 0 to 99. Joins the reach at y 100 to 106 |
| Outflow | One river leaves by the south edge at x 104 to 113 |
| Bridges | North x 56 to 62, y 29 to 31 (7 by 3). Middle y 60 to 64 (7 by 5, the cart road). South y 90 to 92 (7 by 3). Paths over the water |
| Streets (3 wide) | North y 29 to 31, x 0 to 89 (over the bridge to the island road). Middle y 60 to 64, x 0 to 108 (to the broken bridge). South y 90 to 92, x 0 to 70 |
| Avenues (3 wide) | West bank x 30 to 32, y 29 to 108. Mountain road x 50 to 52, y 0 to 28. Island avenue x 87 to 89, y 13 to 76 |
| Lanes | Sawmill lane y 76 to 77, x 31 to 55. South road y 107 to 108, x 30 to 76. Farm road y 58 to 59, x 0 to 4. Retired footpath y 85, x 64 to 70 |
| Exits (reserved, regions) | Farm x 0, y 58 to 64. Mountain x 48 to 54, y 0. Delta x 70 to 76, y 109. Ring 2 x 119, y 58 to 65 |
| Entries | `from_farm` (3, 61), `from_mountain` (51, 3), `from_delta` (73, 108), and `from_<building>` one tile below each door |
| Broken bridge | x 109 to 113, y 60 to 64, still water (ruined art waits for #603) |
| Town square | x 64 to 80, y 54 to 70, cart stop (66, 58) |
| Festival green | x 70 to 105, y 77 to 98 (36 by 22), bandstand x 86 to 90, y 81 to 83 |
| Mill wheel | x 56 to 58, y 67 to 69, in the main arm. Sawmill yard x 51 to 55, y 66 to 75 beside it |

**Lots** (`region` rectangles named `lot-<id>`; the door is the bottom row, the entry
`from_<id>` is the tile below it on a street; all face south). Footprint x, y, w, h and door:

| Lot | Footprint | Door |
| --- | --- | --- |
| general-store | 17, 21, 10 by 8 | (22, 28) |
| healer | 36, 21, 10 by 8 | (41, 28) |
| inn | 15, 50, 14 by 10 | (22, 59) |
| library | 36, 52, 10 by 8 | (41, 59) |
| burrow-young | 5, 55, 6 by 5 | (8, 59) |
| sawmill | 37, 66, 14 by 10 | (48, 75), entry on the lane |
| smithy | 17, 82, 10 by 8 | (22, 89) |
| hatter | 36, 82, 10 by 8 | (41, 89) |
| burrow-gardener | 66, 24, 6 by 5 | (68, 28) |
| outpost | 82, 5, 12 by 8 | (88, 12), stall yard x 80 to 96, y 14 to 19 |
| hall | 92, 50, 14 by 10 | (99, 59) |
| burrow-retired | 64, 80, 6 by 5 | (66, 84) |

**Choices made where the notes left gaps (recorded for the owner):**

- The delta exit stays at x 70 to 76 but is on the **south bank**, a strip y 107 to 109
  under the river reach, reached from the west bank by the south road. It is no longer on
  the island, because the arms rejoin south of the green and the island ends at y 99.
- The draft's door rows (y 24, 53, 82, doors one tile off the streets) were inconsistent
  with the streets, so every lot now has its door on its bottom row and its entry on the
  street below. Street rows and bridge rows now agree (29 to 31, 60 to 64, 90 to 92).
- The Farm exit moved from y 56 to 62 to **y 58 to 64**, to meet the middle street.
- The festival green is y 77 to 98, not 80 to 101, so the river reach fits below it.
- The sawmill lot is x 37 to 50 with its door at x 48 and a lane entry, since a
  south-facing door on the middle street's south side had no street to open onto.
- The main arm has a single bend (the south one, east). It stays x 56 to 62 above it,
  so the draft's "moves off 56 to 62" shows only in the bend.
- The middle bridge is 5 rows tall and spans the whole 7 wide arm (the draft's 6 by 3
  and 4 by 3 did not match the arm width).
- The far bank (x 114 to 119) is unreachable land with only the reserved ring 2 gate.
- Lots are open grass for now; #645 adds the buildings, doors and exits (and the farm's
  matching entries).

## Shell built (2026-11-09, #645)

The shell is `hearthwell.json` plus edits to the farm maps, the Mountain, the delta and the
two interiors. The town is reachable in play: farm east exit, Mountain south exit, delta
north exit. Tests: `tests/hearthwell.test.ts` ("the Hearthwell shell"). Playtest:
`npm run playtest:hearthwell`.

- **Exits (Hearthwell side):** `to_farm` (x 0, y 58 to 64, to `farm` entry `from_hearthwell`),
  `to_mountain` (x 48 to 54, y 0, to `mountain`), `to_delta` (x 70 to 76, y 109, to `delta`).
  The `exit-*` regions from #661 stay as the reserved record. `exit-ring2` has no exit object.
- **Farm maps** (`farm`, `farm-woodland`): the hall and sawmill exits, their entries and their
  building tiles are gone (open grass now). New exit `hearthwell` on the east edge (x 39,
  y 16 to 18, three tall) with entry `from_hearthwell` (38, 17).
- **Mountain:** exit `to_hearthwell` (x 44 to 50, y 69) to `hearthwell` entry `from_mountain`.
  **Delta:** exit `to_hearthwell` (x 66 to 72, y 0, walls opened at y 0 to 1) to `hearthwell`
  entry `from_delta`, and entry `from_hearthwell` (69, 3) on the east bank, which the
  footbridge at y 35 to 37 joins to the farm side.
- **Interiors:** `hall.json` and `sawmill.json` exit to `hearthwell` entries `from_hall` (99, 60)
  and `from_sawmill` (48, 76). Hall door (99, 59) and sawmill door (48, 75) are exits on the
  doors of their lots.
- **Exteriors:** all 12 lots are drawn as solid buildings (roof row, wall rows, a door tile on
  the bottom row, placeholder tiles). Only the hall and sawmill doors open. The ten other doors
  are shut tiles until #646 gives them interiors, except the counters below.

**Choices made where the notes left gaps (for the owner):**

- **The farm keeps its shop, Orders and Request counters.** Only the hall and sawmill doors move,
  as the issue says. Hearthwell adds a second set as stand-ins: the store counter (`shop`
  service) and the Help Wanted board (`requests`, two tiles left of the door) on the general
  store's bottom row, and the smithy counter (`smith`) on its door tile. Both sets use the
  same game state, so they are the same shop and board. The farm's counters leave when the
  interiors (#646) land. The bot and the playtests keep shopping at the farm (a Hearthwell
  trip is a long walk).
- **The smith menu stays whole.** The Hearthwell smithy counter opens the existing smith screen
  (ore, coal, tools), as the Mountain forge does. Splitting upgrades and geode cracking to town
  and leaving ore at the forge waits for #646.
- **Outpost boards are stand-ins.** `board-news` and `board-orders` services stand on the
  Outpost's bottom row (x 86 and x 90) and show one line each ("Nothing is posted yet", "empty
  for now"). Road news and Special Orders are not built (note 57 steps 1 and 5). The Outpost's
  door is a shut tile and the stall yard is only a region. The trader (note 57 step 3) is not built.
- **The cart stop** (66, 58) stays a region. No `cart` service, since the cart screen is undesigned.
- **Door tiles for counters are blocked.** A counter on a door tile is used from the street
  below, facing up, like a farm counter. Real doors (hall, sawmill) are walkable exits that open
  on Action like every other door.
- **Farm east exit position** (y 16 to 18) is mine: the east edge between the festival counter
  (36, 14) and the shop building (y 20) had no other gap. Note 55 gave none.
- **Unreachable far bank and ring 2:** no exit, as #661 left it.
- **Sim and playtests walk through town.** The sim's `Walker` finds the hall and the carpenter by
  the fewest doors (farm, Hearthwell, door), so each hall visit now costs the bot the walk
  across town. `play.mjs` and `touch.mjs` walk out of the farm's east exit, along the middle
  street, in by the hall door, and back the same way.
- **Not built:** the other ten interiors, people, forage, weeds, cosmetic trees, pots and
  fishing zones on the river, the Outpost's stalls and trader, the cart, and the festival variant.
