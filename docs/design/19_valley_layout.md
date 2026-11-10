# 19 Valley layout

Status: **decided with the owner on 2026-10-28** (areas, links, river, what
lives where). The open items at the end are not decided. It answers the layout
half of issue #67. The map style is already settled in `06_map_style.md` and
ADR 0005. The farm, Forest, Secret Woods, delta, Mountain, Quarry, cove and
Hearthwell maps are built as placeholder shells (notes 71 to 78 "Built
status"); the rest is not, and the placeholder maps stay until real maps are
authored in Tiled.

## Why

The valley layout shapes the cast list (#136), the animals, fishing and mines
notes, and every map the scenes load. The farm needed a clear place in the
world, the river needed to be one line that runs through it, and the town
needed a sensible home for about 30 villagers.

## The areas

Nine areas in the home valley, joined by exits (ADR 0005). Eight are each one Tiled
map. The Beach shares the River delta map (decision 13). Buildings are interior
maps. Ring 2 lies beyond them.

| Area | What lives there |
| --- | --- |
| Farm | The home base: house, fields and two ponds that refill the watering can (`55_farm_layout.md`). |
| Forest | A lake. The hermit (the witch), the Wanderer (Old Greencoat), and a farmstead with the animals. Rare forage. |
| Secret Woods | Off the Forest, behind a massive log that an upgraded axe clears. Rare forage. Six large stumps that respawn daily, 2 Hardwood each (owner, 2026-11-06, `59_horse.md`). |
| Mountain | A mountain lake. The smith dwarf and the stonekeeper dwarf. The source of the river. |
| Mines | Off the Mountain. Ring 1, gentle combat, open early on a fixed day (`16_bundles.md`). |
| Hearthwell | The crossroads town. Every Brimmer lives here. The shops and services listed below. The river runs through it. |
| River delta | Where the river ends. A marsh lake, open from the start. Fishing. The ferry landing for the Lake cove. |
| Beach | The sea, at the east end of the River delta map. The odd elf who sells the Homeward pin. |
| Lake cove | Off the River delta, by ferry. Opened by the Water room reward (`16_bundles.md`). |
| Ring 2 | Across the river, reached by the bridge in Hearthwell (see below). |

## The map

```text
 [Secret Woods]--[FOREST]--------[MOUNTAIN]----[Mines]
                    |                 ~
                    |                 ~  river
                 [FARM]-----------[HEARTHWELL]--> bridge to ring 2
                    \                 ~
                     \                ~
                      +--------[River delta + Beach]
                                      |
                                 [Lake cove] (ferry)
```

## Exits

| From | To |
| --- | --- |
| Farm | Forest, Hearthwell, River delta |
| Forest | Farm, Secret Woods, Mountain |
| Mountain | Forest, Mines, Hearthwell (the river road) |
| Hearthwell | Mountain, Farm, River delta, the ring 2 bridge |
| River delta (with the Beach) | Hearthwell, Farm, Lake cove (ferry) |

The farm has three exits, so it is a home between places and not a dead end.

## Decisions

1. **The river is one line.** It flows from the Mountain through Hearthwell to
   the River delta, and the areas along it are linked by exits in that order.
2. **Two loops.** Farm, Hearthwell, delta, farm. And farm, Forest, Mountain,
   Hearthwell, farm. A player is never forced to walk back the way they came.
3. **The Mines are two hops from the farm** (Forest, then Mountain). The Hearth
   room carts (`16_bundles.md`) ease that walk later.
4. **All Brimmers live in Hearthwell.** There is no separate hamlet. The Forest
   farmstead holds the animals and its keeper.
5. **The waystation, the village hall called The Long Table, stands a short
   way outside Hearthwell**, on the road toward the bridge. It was an old inn
   on the road, not a part of the town. It is the east end of the Hearthwell
   map, not its own area.
6. **Ring 2 lies across the river.** The road out of Hearthwell crosses a
   broken bridge. Finishing the Last Seat mends it (`16_bundles.md`, decision
   3). That is the single gate.
7. **The carpenter works at a sawmill on the river in Hearthwell.** The carpenter
   handles house upgrades and farm buildings.
8. **Water on the farm is a pond**, not a river link. There are two ponds
   (decided 2026-11-03, `55_farm_layout.md`); both supply the watering can.
9. **The Wanderer lives in the Forest.** This is the natural place for the
   announcement that opens the mines.
10. **The Secret Woods are gated by a massive log**, as in the original idea of
    a blocked path. A steel axe or better clears it (`44_tool_upgrades.md`).
11. **The cove is a bundle reward.** The Water room opens it (`16_bundles.md`).
    That note calls it a lake cove and also repairs a ferry, so the cove is
    named the Lake cove here. It hangs off the River delta and is reached by the
    ferry. There is no second cove on the Beach.
12. **Water bodies for fishing:** the river, the Forest lake, the Mountain lake,
    the delta marsh lake (added 2026-10-29), the Lake cove and the sea at the
    Beach. Three lakes are open from the start. The cove is the Water room
    reward, so no Water room bundle may need cove fish. Which fish live where, and what
    makes the cove special, belong to the fishing note (#181).
13. **The Beach shares the River delta map (decided with the owner,
    2026-11-06).** The Beach is a dead end with one exit and one
    character, so it is the east end of the delta map, walked to and not entered
    through an exit. Every other area stays its own map. Merging more (such as
    Hearthwell and the Mountain) was offered and not chosen, to keep maps small
    for tablets (`06_map_style.md`). The owner confirms Stardew keeps
    them as separate maps joined by exits (SC-34, from memory). The delta map must stay inside the size budget once area sizes are
    set (still open below).
14. **Every Hearthwell home can be entered (decided with the owner,
    2026-11-06).** The cast list fixes 11 households, so there are 11 home
    interiors. Eight are one map with the shop (`20_ring1_cast.md`, decision 2).
    The other three households each get a small burrow interior of their own: the
    gardener, the retired couple with the grandchild, and the two young adults.
    The three burrows stand apart in different parts of town, between the shops,
    and not in one row. Both follow Stardew (every household has a home you can
    enter, and the houses stand apart), as the owner confirms from memory (SC-35). Hearthwell
    is then 9 shop-and-home maps (the Outpost has two, `58_interiors.md`) and 3 burrow
    maps, plus the town map. All interiors are counted in note 58. Their size
    still waits on area sizes (below).

## Hearthwell buildings

From `09_story_and_lore.md`, with the sawmill added:

- General store
- The Outpost (added 2026-11-06): the carrier post, moved out of the store. The
  hall steward is postmaster, works and lives there (nobody lives at the hall), and the courier hangs
  about outside and in. It also has a notice board and road news, and travelling
  traders stop there. See `20_ring1_cast.md`.
- Smithy and mender
- Inn and kitchen
- Healer
- Library
- Sawmill and carpenter, on the river
- Hatter's shop (added 2026-10-31): sells the hats that achievements unlock
  (`10_customisation.md`)
- Festival green
- Homes for the Brimmers: 11 households (`20_ring1_cast.md`). Eight live in
  their shop. Three have their own burrows: the gardener, the retired couple
  with the grandchild, and the two young adults (see decision 14).

## Area sizes (draft, revised 2026-11-06)

First sizes, corrected by the owner the same day. The built maps follow notes
71 to 78, not these first sizes. Stardew
totals are the saved forage footnotes (SC-40): whole map rectangles, so they
include water and unwalkable tiles, and no widths or heights are given.

**Owner answers.** The first draft made Hearthwell and the Forest about half of
Stardew's. The owner said no: they hold a lot and must not feel cramped, and the
first draft's crossing times felt too quick. So the two big towns match
Stardew's totals. The Forest is also the main wood supply once the farm's trees
run out, so it needs room for a steady supply (see note 43).

**Unit.** A screen is the minimum view, 30 by 17 tiles, about 510 tiles
(`docs/decisions/0009-view-size-and-aspect.md`, decided 2026-11-06). Wider or
squarer windows and zoom out show more, so screen counts are an upper bound. An earlier draft
used 40 by 25, which the game never showed. Player walk speed is 80 px a second, 5 tiles a second
(`FarmScene.ts`), so 100 tiles take 20 seconds.

| Area | Stardew total | Draft size (tiles) | Tiles | Screens | Longest crossing | Why |
| --- | --- | --- | --- | --- | --- | --- |
| Farm | about 5200 (80 by 65, unchecked, SC-25) | 80 by 65 | 5200 | 10 | 16 s | Note 55 decision. The home base. |
| Hearthwell | 13200 (Pelican Town) | 120 by 110 | 13200 | 26 | 24 s | Stardew's total (owner). 9 shop maps, 3 burrows, river, bridge, hall, green. |
| Forest | 14400 (Cindersap) | 120 by 120 | 14400 | 28 | 24 s | Stardew's total (owner). Lake, hermit, farmstead, rare forage, three exits, and the steady wood supply. |
| Mountain | 5535 | 80 by 70 | 5600 | 11 | 16 s | About Stardew's. Lake, two dwarves, the Mines entrance, three exits. |
| Secret Woods | 1920 | 48 by 40 | 1920 | 4 | 10 s | Stardew's total. Stumps and a pond. |
| River delta and Beach | none (Beach not saved) | 100 by 70 | 7000 | 14 | 20 s | Marsh lake, ferry landing and the beach in one map (decision 13). Our own guess. |
| Lake cove | none | 50 by 40 | 2000 | 4 | 10 s | Our own guess. A reward fishing spot, not a trip. |
| Mines floor | none (levels are generated) | 60 by 40 | 2400 | 5 | 12 s | Our own guess. Floor count is for the mines note. |

**Cap.** The two big maps (14400 and 13200 tiles) are as large as Stardew's, so
the cap is the Forest at 14400 until the tablet says otherwise. Load a
placeholder map of that size on the SM-T500 early, before authoring it, to check
memory and frame rate.

**Crossing time.** The owner finds the first draft's crossings too quick. The
table now crosses in 10 to 24 seconds at 5 tiles a second. If that still feels
quick, the sizes may be fine and the walk speed too high. Time it in a
playtest, and change speed before changing sizes. Owner, 2026-11-06: 5 tiles a
second seems too fast, and Stardew's horse later speeds travel up (SC-41, from
memory). We have a stable and a horse as in Stardew (`59_horse.md`), and carts
stay.

**Still guesses.** Delta, cove and Mines floor have no Stardew figure, and the
Mountain and Farm sizes follow Stardew. Correct them against the first Tiled
draft of each map.

## Still open

- What lies beyond the bridge. Ring 2 is a separate design.
- Confirm the area sizes in the draft table above against the first Tiled
  drafts (view size is settled, ADR 0009).
- The transition look between areas.
- Whether fishing also happens beyond the farm's big south pond, or stays at
  the delta, beach and cove (#181). Only the big farm pond holds fish
  (`55_farm_layout.md`).

## Farmstead

The Forest farmstead is part of the Forest map: the keeper's house and shop (one
interior) and a few paddocks outside that are visual only, with no interaction
(decided 2026-11-06, `58_interiors.md`).

## Area designs

Each unbuilt area now has its own note, and the cover note holds the build order,
the map contract additions and the owner questions: `71_map_areas_overview.md`.
Forest `72_forest.md`, Secret Woods `73_secret_woods.md`, Mountain
`74_mountain.md`, River delta and Beach `75_river_delta_and_beach.md`, Lake cove
`76_lake_cove.md`, Hearthwell `77_hearthwell.md`. Their sizes follow the table above.
Question 8 in note 71 asks how the river sits in Hearthwell.

## Next steps

1. Update `09_story_and_lore.md` for the waystation, and the overview map.
2. Write the cast list (#136) using Hearthwell as the home of the village.
3. Write the mines, animals and fishing notes against these areas.
4. Author the real maps in Tiled and replace the placeholder.
