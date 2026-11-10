# 72 Forest (draft)

Status: draft, written 2026-11-08, owner answers recorded the same day (note 71). Part 1
(slices 2 to 4) and part 2 (slices 5 and 6) are built, see "Built status" at the end; the rest is not. M3b (ring 1 systems), not M3c. It designs the Forest map to the pattern of `55_farm_layout.md`, from the
areas in `19_valley_layout.md`. The overview and the owner questions are in
`71_map_areas_overview.md`. Stardew facts are from the owner's saved pages
(Cindersap Forest, Large Log, Trees, read 2026-11-08), as ideas only, never
copied (ADR 0002).

## Why

The Forest is the second place the player walks to, and it carries more than any
other unbuilt area: the main wood supply once the farm runs dry
(`43_wood_source.md`), the first lake for fishing (`21_fishing.md`, #596), the
animal farmstead and its keeper (`23_animals.md`), the hermit and the Wanderer
(`20_ring1_cast.md`), and the way on to the Secret Woods and the Mountain. Today
it is a placeholder: the farm carries the trees and there is no Forest map.

## Decisions (draft)

1. **One map, `forest`, 120 by 120 tiles** (14,400, note 19, the largest map and
   the cap for tablet memory). Longest crossing 24 seconds on foot.
2. **Three exits, one gated:** south to the Farm, east to the Mountain, and west
   to the Secret Woods behind the massive log (note 19, decision 10).
3. **A lake, no river.** The river is one line from the Mountain to the delta
   (note 19, decision 1), so the Forest has the lake only. One water kind,
   `forest-lake` (note 71, contract need 1).
4. **Six groves of choppable trees and a cosmetic border** make the steady wood
   supply (below). Tree types follow note 43 and SC-30: oak and maple here, pine
   on the Mountain.
5. **The farmstead is in the north-east, the hermit in the south-west, the
   Wanderer's camp by the farm road,** matching the valley map
   (`56_valley_map.md`). Paddocks are scenery only (note 58, decision 5).
6. **Hand-placed everything** (note 32): groves, rocks, twigs, weeds and forage
   spots are authored, nothing random at the start of a new game.
7. **No hardwood here except the log.** The massive log gives 8 Hardwood once
   (saved Large Log page, SC-31). The regular supply is the Secret Woods
   (`73_secret_woods.md`).

## Shape and layout

Tile coordinates: x runs 0 to 119 left to right, y runs 0 to 119 top to bottom.
Sizes are placeholders to correct against the first Tiled draft (note 19).

```text
 x:  0        30        60        90      119
 y0  +---------------------------------------+
     |cliff wall, cosmetic trees            |
     |  [log]  G1     LAKE 30x22   G4  FARMSTEAD
 y30 |<--SW    .oak.  (34..64,12..34) maple  (84..108,14..38)
     |  exit   ......                 ......      |
 y60 |  G2 oak           road loop        maple G5--> to Mountain
     |  ....      .......road.......     (119,60..66)
 y90 | HERMIT   G3 oak    Wanderer camp   G6 maple |
     | (10..34,   (38..62,   (80..90,    (88..112, |
     |  84..104)   84..104)   78..88)     92..112) |
y119 +----------------------[Farm road]-----------+
                            x 70..76
```

| Feature | Place (tiles) | Size | Notes |
| --- | --- | --- | --- |
| Farm road and exit | South edge, x 70 to 76, y 119 | 7 wide | Road runs north to a junction at (73, 70) |
| Mountain road and exit | East edge, x 119, y 60 to 66 | 7 tall | Road runs west to the junction |
| Massive log | West end, x 6 to 9, y 14 to 17 | 4 by 4, one object | Steel axe or better. The Secret Woods exit sits behind it at x 0 |
| Lake | x 34 to 64, y 12 to 34 | about 30 by 22 | Shore path 3 tiles wide on the south and east |
| Farmstead | x 84 to 108, y 14 to 38 | 25 by 25 | Keeper's house door at (96, 22), three paddocks, scenery only |
| Hermit's tower | x 10 to 34, y 84 to 104 | 25 by 21 | Tower door at (22, 92), garden, a ring of toadstools (scenery) |
| Wanderer's camp | x 80 to 90, y 78 to 88 | 11 by 11 | Fire, tent, bench. No interior (note 58). He wanders the roads |
| Onion bank | x 96 to 103, y 72 to 77 | 8 by 6 | A tillable patch of spring onions each spring morning (saved Cindersap page) |
| Groves G1 to G6 | See the grove table | about 20 by 14 each | Choppable, regrowing |

The roads form one loop (the farm road, the junction, past the lake, back)
on the `paths` layer so no tree seeds spread on them. Every building door, the
lake shore and every grove has a walkable approach on foot, which the map check
proves.

## Exits, entries and doors

| Object | Name | Target | Notes |
| --- | --- | --- | --- |
| exit | `to_farm` | `farm` entry `from_forest` | South edge, rectangle 7 by 1 |
| exit | `to_mountain` | `mountain` entry `from_forest` | East edge. Omitted until the Mountain exists (note 71, staged exits) |
| exit | `to_secret_woods` | `secret-woods` entry `from_forest` | West edge behind the log, `requires: secret-log-cleared` |
| exit | `farmstead` | `forest-farmstead` entry `door` | Door of the keeper's house |
| exit | `hermit` | `hermit-tower` entry `door` | Door of the tower |
| entry | `from_farm` | (73, 116) | Beside the exit, not inside it |
| entry | `from_mountain` | (116, 63) | |
| entry | `from_secret_woods` | (11, 16) | East of the log, on the Forest side |
| entry | `from_farmstead`, `from_hermit` | One tile below each door | |

The farm maps (`farm`, `farm-woodland`) gain an exit `forest` at the north edge
with entry `from_forest`, as note 55 decided. That edit belongs to the Forest
slice 1.

## Trees and the steady wood supply

The owner's rule (note 43, 2026-11-06): the Forest is the main wood source, so
it needs a steady supply and room for it.

| Grove | Place (tiles) | Type | Choppable |
| --- | --- | --- | --- |
| G1 | x 8 to 30, y 40 to 54 | oak | 26 |
| G2 | x 6 to 28, y 58 to 76 | oak | 28 |
| G3 | x 38 to 62, y 84 to 104 | oak | 28 |
| G4 | x 70 to 82, y 12 to 30 | maple | 18 |
| G5 | x 88 to 112, y 44 to 58 | maple | 26 |
| G6 | x 88 to 112, y 92 to 112 | maple | 26 |

That is about 150 choppable trees: about 110 mature, 25 young and 15 seedlings.
A cosmetic border of about 60 more trees and bushes, which cannot be chopped,
frames the map edges and the cliff (as the farm border, note 43).

- **Start stock.** 110 mature trees give about 19 wood each with the stump (12
  to 16, then 4 to 9, note 36), so about 2,100 wood waiting, plus the young
  ones. That is a lot, on purpose: energy is the limit, not trees (note 43).
- **Renewal.** Trees outside the farm regrow by the rule already settled in
  SC-30: 20 percent a night once the stump is removed, then the normal growth
  stages (note 36, median 24 days). A fully cleared grove is back to mature in
  roughly a month. With 150 trees that is up to five mature trees a day in
  steady state, about 95 wood a day, which more than covers what a player's
  energy can chop. Placeholder, tune in note 07.
- **Types.** Oak and maple only here. Their tap products are note 36's and are
  not changed. Pine is the Mountain's type. Mahogany has no standing tree on the
  map (owner, 2026-11-10: it is player-planted only, note 36 "Mahogany").
- **Clutter at the start.** Rocks 40, twigs 50, weeds 60, hand placed, placeholder
  counts. They come back by the rules of `65_special_orders_and_debris.md` (a small
  capped share each spring, summer and fall; none in winter). Stardew's saved page
  says debris returns each spring 1 there, so ours is gentler by choice.

## Forage

Per-map tables with explicit weights (note 71, contract need 3). 56 candidate
spots along grove edges, the lake shore and the onion bank. At most 6 goods lie
out on a morning in any season, placeholder (Stardew's saved page gives an
average of 1.8 a night in spring and fall and 1.6 in summer and winter, and ours
is a rough match: the cap is a maximum and the day's count is random from none
to the cap, so the average is about 3).

| Season | Weights (items are ours, from `forage.json`) |
| --- | --- |
| Spring | wild horseradish 30, dandelion 30, wild leek 20, daffodil 15, morel 5 (rare) |
| Summer | sweet pea 40, spice berry 35, wild grape 20, wild ginger 5 (rare) |
| Fall | field mushroom 35, bramble berry 35, crab apple 15, wild garlic 10, chanterelle 5 (rare) |
| Winter | crocus 35, winter cress 25, snowdrop 20, holly sprig 15, snowcap 5 (rare) |

- **The onion bank.** Spring only. Every point on it fills each spring morning
  with a spring onion, outside the cap, and leftovers are removed overnight
  (idea from the saved Cindersap page). Spring onion is already in `forage.json`.
- **Rare finds** are 5 percent here, the existing rule of note 07. The Secret
  Woods has a much higher share.
- **Foraging XP** is 7 a pickup, as note 07.

## Fishing

- **The Forest lake** is open from the start and holds the 6 fish of note 21
  (Carp, Perch, Fernfin, Mushroom Loach, Moonmirror, Hermit Trout) and the legend
  Grandmother Hush (spring, dusk, rain). All of that is data already drafted.
- **Pots** go on the lake (fresh water pots, note 21).
- **Cast spots.** The south and east shore are open sand and grass; the north and
  west shore is cliff and reed, no casting spot on solid cliff tiles.

## People and buildings

| Building or place | Who | Interior |
| --- | --- | --- |
| Keeper's house and animal shop | Keeper of the animal farmstead (F, halfling, candidate) | `forest-farmstead`, one map, shop and home (note 58). Sells animals, hay and advice (note 23) |
| Hermit's tower | The hermit (witch) | `hermit-tower`, one map, a one-room hut template (note 58). Sells one elderfruit and gives the rare seed (note 39). Her teaching and fairy rings are note 09 and #178 |
| Wanderer's camp | The Wanderer (Old Greencoat) | None. He wanders. He comes to the farm door on Spring 5 to open the mines (note 22) |

Names, looks and schedules are not set (#136, #178, #599). The map uses role
labels and placeholder markers.

## Map contract needs

All listed centrally in `71_map_areas_overview.md`, "Map contract additions".
This map needs: water kinds (1), gated log object (2), per-map forage tables and
cap (3), tree `kind` (4), conditional layers (6, for the log) and the
`rideable` flag (7). Nothing else: doors, entries, exits, forage, tree, rock and
stump already exist.

## Build order and slices

1. **Contract additions** (shared work package, note 71).
2. **Shell:** `forest.json` with terrain, collision, roads, the lake with its
   water kind, entries, the farm exit and the matching farm exit. Rocks, twigs,
   weeds. The Mountain exit stays unauthored, ending in
   scenery. The Secret Woods exit, entry and log were added by #639 (note 73:
   the log is two objects at (7, 15) and (7, 16), a two wide corridor). `placeholder: true`.
3. **Trees:** the six groves, the cosmetic border, regrowth outside the farm.
4. **Forage:** the table and cap, the onion bank.
5. **Farmstead:** exterior, paddocks, the keeper's house interior and the animal
   shop (replacing the stand-in for buying animals). Labels, not names.
6. **Hermit's tower and the Wanderer's camp:** the tower interior and the camp. The
   hermit's stock waits for #178.
7. **Log and the Secret Woods exit** with `73_secret_woods.md`.

Work packages: "Forest map part 1" (steps 2 to 4) and "Forest part 2" (steps 5 and
6).

## Open

- Owner answers that touch this map are in note 71: milestone M3b (answer 1) and
  the horse rides here (answer 10, `rideable` true).
- Tuning of tree counts, regrowth and the forage cap (note 07).
- The size 120 by 120 must be confirmed by loading a placeholder map on the
  SM-T500 first (note 19).
- Names and looks for the keeper, hermit and Wanderer (#136, #178).

## Built status

**Part 1, #637 (2026-11-09): slices 2 to 4 are built.** Map `forest.json` (120 by
120, `placeholder`, `rideable`, `wild`, `waterKind` forest-lake), authored once by
`scripts/gen-forest-map.mjs` and now edited by hand or in Tiled.

Built:

- Shell, roads and loop as designed, with the junction at (73, 70). The trunk road
  runs west to east at y 69 to 71, the lake loop is the west leg (x 31 to 33), the
  south shore path (y 35 to 37) and the east leg (x 65 to 67). The Mountain road
  climbs to (116, 63) and ends in the border trees: the east gap is not cut.
- Exit `to_farm` (south edge, x 70 to 76, 7 wide) and entry `from_farm` (73, 116).
  The farm and the Woodland farm gain exit `forest` at (28, 0), entry
  `from_forest`, in the north border trees between the mine and the cave doors.
- The lake (x 34 to 64, y 12 to 34, 31 by 23) as `forest-lake` water with a
  `water` zone. North and west shore tiles are cliff, the south and east shores
  are open and have the path. The six lake fish are in `fish.json` (carp, perch,
  fernfin, mushroom loach, moonmirror, hermit trout, prices are placeholders).
  Grandmother Hush is not built (no legends exist yet, note 21).
- Six groves (152 choppable trees: 110 mature, 25 young, 17 seedlings; oak in G1
  to G3, maple in G4 to G6) on a lattice with one tile lanes, so every tree can be
  reached. The cosmetic border is tile art (a 2 tile ring, a cliff wall on the north
  edge, and 60 loose trees in the edge bands), not choppable.
- Regrowth: `regrowGroves` in `src/core/areas.ts`. An emptied grove spot sprouts a
  seed of its own kind 20 percent of nights, then grows by the normal stages. Seeds
  do not spread on their own in the Forest.
- Clutter: 40 rocks, 50 twigs and 60 weeds hand placed (object classes `rock`, and
  `twig` and `weed`, which are new in this slice). Weeds, rocks and twigs return
  by notes 29 and 65, with the Forest's own empty tiles.
- Forage: 56 candidate spots plus the 48 point onion bank. `forage-areas.json`
  holds the Forest's weights per season, a cap of 6 and a `patches` entry: every
  point of the region `onion-bank` holds a spring onion each spring morning, outside
  the cap, and nothing in other seasons.

Where it differs from the note, or was decided in the build:

- The Forest keeps its own world, `src/core/areas.ts` (new, note 71 had named only
  forage): trees, rocks, weeds, twigs, goods on the ground and forage are held per
  area map and swapped into the game state while the player is there, so the rules
  that work on `g.trees` work on the Forest unchanged. The farm's soil, sprinklers,
  fruit trees and machines are swapped for empty ones there. A map opts in with the
  map property `wild`. Saves keep the farm's world as before and add `areas`.
- Sleeping, or passing out, in the Forest puts the farm's world back first; the night
  then runs on the farm and on every area (`areasEndDay`), and the player wakes at home.
- The onion bank is pale earth you can walk on, not yet a tillable patch.
- Hand placed rocks stay out of the groves, so lanes cannot be closed.

Not built (later slices): farmstead, keeper's house and animal shop (part 2, #638),
hermit's tower and the Wanderer's camp (part 2), the massive log and the Secret
Woods exit (#639), the Grandmother Hush legend and pots on
the lake (pots are not built for any water yet). The first run of the map on the
SM-T500 is still open. Names and looks stay placeholders.

**Update (2026-11-09, #642):** the Mountain exit is built. The east gap is cut at
x 118 to 119, y 60 to 66, the road runs to the edge, and exit `to_mountain` (x 119,
y 60 to 66) leads to the Mountain's `from_forest`, with entry `from_mountain` (116, 63).

**Part 2, #638 (2026-11-09): slices 5 and 6 are built.** The farmstead, the hermit's
tower and the Wanderer's camp are cut into `forest.json` by the one-off
`scripts/gen-forest-part2.mjs`, which also wrote the two interiors. Placeholder art, role
labels, no names.

Built:

- Roads: a farmstead road runs east from the lake's south shore path (y 35 to 37, x 68 to
  97) and north up x 95 to 97 to the keeper's door; the west leg (x 31 to 33) runs on
  south to y 95, with a spur (x 23 to 30, y 93 to 95) to the tower door; a spur (x 75 to
  89, y 84 to 86) runs from the farm road into the camp. All on the `paths` layer.
- Farmstead: the keeper's house (x 92 to 100, y 18 to 22), door exit `farmstead` at
  (96, 22), entry `from_farmstead` (96, 23). Three fenced paddocks (x 85 to 90, y 26 to
  32; x 101 to 106, y 26 to 32; x 102 to 107, y 16 to 22), scenery only, no animals drawn
  (no art yet), closed rings that cannot be entered. Interior `forest-farmstead` (12 by 8)
  with the keeper's counter, service kind `keeper`.
- Keeper's counter (`KeeperScene`): sells young animals for each coop and barn the player
  has built, and hay by 10 bales, and shows one piece of advice a day. This replaces the
  carpenter's stand-in: the carpenter's counter no longer sells animals or hay, and keeps
  building, upgrades, silo and furniture. The `smoke` playtest buys at the keeper.
- Hermit's tower: x 19 to 25, y 86 to 92, door exit `hermit` at (22, 92), entry
  `from_hermit` (22, 93). Interior `hermit-tower` (9 by 9, one room) with the hermit,
  service kind `hermit`, who only mutters a line.
- Wanderer's camp: a tent, a bench and a fire on solid tiles at x 82 to 89, y 80 to 83;
  the fire (85, 83) is service kind `camp` and gives a line that he is on the road. No
  interior.

Where it differs from the note, or was decided in the build:

- The hermit sells nothing and gives no seed yet. Elderfruit, the emberseed, her
  teaching and the fairy rings wait for #178 and the friendship system (no hearts exist).
- The Wanderer does not wander, and has no sprite: the camp is empty. He still comes to
  the farm door on Spring 5 by `GreencoatScene`.
- The garden and the ring of toadstools at the tower are not drawn (no art).
- Hand placed clutter that stood on the new buildings and roads (2 rocks, 2 twigs, 7
  weeds) was moved to open ground near (40 to 60, 46 to 60), so the counts of 40 rocks,
  50 twigs and 60 weeds hold.
- The note's farmstead box (25 by 25) and tower box (25 by 21) are the cleared zones; the
  buildings sit inside them and the rest is open grass.
- The advice is five placeholder lines, chosen by the day.

Not built: names and looks (#136, #178), the keeper and hermit as characters with
schedules and hearts, the animals in the paddocks, the Wanderer on the roads.
