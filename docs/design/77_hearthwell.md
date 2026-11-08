# 77 Hearthwell (draft)

Status: draft, written 2026-11-08, owner answers recorded the same day (note 71). Nothing here is
built. Shell and interiors stay with #599 in M3b. It designs the Hearthwell town map, the largest social place in the
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
   layout is an open design item, designed later** (where the main arm runs, how
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

- **The river layout (open design item).** Owner answer 8 fixes only two arms,
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
