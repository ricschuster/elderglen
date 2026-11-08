# 74 Mountain (draft)

Status: draft, written 2026-11-08, owner answers recorded the same day (note 71). Nothing here is
built. M3b. It designs the Mountain map and moves the Mines entrance onto it.
Overview and owner questions: `71_map_areas_overview.md`. Stardew facts are from
the saved Mountain page (read 2026-11-08), as ideas only (ADR 0002).

## Why

Today the Mines are entered by a door on the farm map (`mine`, `requires:
mines-open`) and the smith and tool upgrades are a menu stand-in. Note 19 puts the
Mines off the Mountain, two hops from the farm (decision 3), and the river starts
here. The Mountain holds a lake, the two dwarves and the early stone, and joins the
Forest to Hearthwell on the second loop (decision 2).

## Decisions (draft)

1. **One map, `mountain`, 80 by 70 tiles** (5,600, about Stardew's 5,535). Longest
   crossing 16 seconds.
2. **Three exits:** west to the Forest, south to Hearthwell along the river
   road, and the mine mouth in the north-east, which is a door into the existing
   `mine` entrance hall, not an exit to a separate area map (note 58: the Mines
   are an area, entered through that hall).
3. **The mine mouth is blocked by a rockfall until Spring 5.** That is note 22's
   rule ("a rockfall blocks the entrance until then"), shown as ruined and
   cleared art (contract need 6). Stardew clears debris at the bridge north of
   the lake on Spring 5 (saved page), so this follows it.
4. **The river starts here.** The lake spills into a stream that becomes the river
   and runs south to the Hearthwell exit. The Mountain is the river's source (note
   19, decision 1). Water kinds: `mountain-lake` and `river` (contract need 1).
5. **A stone footbridge crosses the river** in the middle of the map, so the east
   half is reachable. The stonekeeper dwarf keeps it (note 20: bridges and
   stonework).
6. **Pine is the Mountain's tree type** (note 43, SC-30), plus cosmetic cliffs and
   border.
7. **More stone than the Forest.** Rocks are the early stone supply (note 22).
8. **The trainer and the dummy are in the Mines entrance hall,** not here (note
   22), so the Mountain has no Adventurers' Guild-like building (not in scope).
9. **A Quarry lies past the east road** (owner, 2026-11-08, as Stardew's Quarry
   past a mended bridge). It is its own map, `quarry` (note 78). The Mountain
   gets one more exit, `to_quarry`, east of the stonekeeper's yard, behind a
   ravine bridge that is ruined until a bundle room mends it.

## Shape and layout

```text
 x:  0        20        40        60      79
 y0  +---------------------------------------+
     |cliff   LAKE 28x18        .. rockfall   |
     |      (18..46,8..26)      (60..66,14..18)  MINE MOUTH (68,8) + cart stop
 y26 |       stream->(47,18)      |
     |  pines  .  river x 47..53 south       |
 y37 |<-W exit  road ===bridge(50,37)=== east road
     |(0,34..40)                                |
 y46 |  FORGE (18,46)                 STONEKEEPER YARD (66,46)
     |        pines    river           rocks    |
 y69 +------------------[to Hearthwell]--------+
                       x 44..50
```

| Feature | Place (tiles) | Size | Notes |
| --- | --- | --- | --- |
| Forest exit | West edge, x 0, y 34 to 40 | 7 tall | Road runs east to the bridge |
| Hearthwell exit | South edge, y 69, x 44 to 50 | 7 wide | River road beside the water, on the west bank |
| Lake | x 18 to 46, y 8 to 26 | about 28 by 18 | Fishing, shore path on the south and east |
| River | From (47, 18) south, x 47 to 53 | 4 to 6 wide | Joins the south exit road |
| Stone footbridge | (50, 37), east to west | 6 by 3 | Always open. Placed as a ground tile run |
| Forge | Door at (18, 46) | Exterior 10 by 7 | Smith dwarf's trading hut, an interior (note 58). A Mines-side shop, not a forge for tools (see "What lives there") |
| Stonekeeper's yard | x 60 to 72, y 42 to 52 | 13 by 11 | Open air yard, a work bench and a stack of stone. No interior. The Quarry bridge starts at its east side |
| Quarry bridge | x 73 to 78, y 45 to 49 | 6 by 5 | A plank bridge over a ravine. Ruined art until the bundle room that mends it (note 78) |
| Quarry exit | East edge, x 79, y 45 to 49 | 5 tall | `to_quarry`, requires `quarry-open`. Staged until the Quarry exists |
| Rockfall | x 60 to 66, y 14 to 18 | 7 by 5 | Cleared on Spring 5 by the Wanderer's announcement |
| Mine mouth | Door at (68, 10) | 5 by 4 | Door to `mine`, `requires: mines-open` |
| Cart stop | (64, 12) | 1 | Reserved for the Hearth room carts (`16_bundles.md`). Not built until then |

The east road runs from the bridge north to the rockfall and south to the
stonekeeper's yard. The west road runs from the Forest to the bridge, passes the
forge, and goes on south to the river road.

## Exits, entries and doors

| Object | Name | Target | Notes |
| --- | --- | --- | --- |
| exit | `to_forest` | `forest` entry `from_mountain` | West edge |
| exit | `to_hearthwell` | `hearthwell` entry `from_mountain` | South edge. Omitted until Hearthwell exists (staged) |
| exit | `mine` | `mine` entry `door` | `requires: mines-open`. Replaces the farm's `mine` door |
| exit | `forge` | `forge` entry `door` | Smith dwarf's trading hut |
| exit | `to_quarry` | `quarry` entry `from_mountain` | East edge, `requires: quarry-open`. Staged |
| entry | `from_forest` | (3, 37) | |
| entry | `from_hearthwell` | (47, 66) | |
| entry | `from_mine` | (68, 13) | The mine hall's exit returns here |
| entry | `from_forge` | (18, 49) | |
| entry | `from_quarry` | (76, 47) | Beside the Quarry exit, on the near side of the bridge |

When this slice lands, `mine.json`'s exit target changes from `farm` entry
`from_mine` to `mountain` entry `from_mine`, and the farm maps lose their `mine`
door. The hand-in and the mines-open flag are unchanged.

## What lives there

| Place | Who | Interior |
| --- | --- | --- |
| Forge (the hut) | The smith dwarf (F, dwarf, candidate) | `forge`, one-room hut template (note 58). **A Mines-side trader** (owner, 2026-11-08): sells lamps and rest-camp supplies, buys ore for coin. **No tool upgrades and no geode cracking** (the Hearthwell blacksmith does those, note 77). Where the furnace gift sits is open (see Open). Today a menu stand-in |
| Stonekeeper's yard | The stonekeeper dwarf (M, dwarf, candidate) | None (note 58). He works outdoors. **Moves to a camp in the Quarry (owner, 2026-11-08, note 78)**, so the yard keeps the bridge only |
| Mine mouth | none | The mine entrance hall `mine`, trainer and dummy inside |

Owner answer 7 (2026-11-08, as Stardew): the Hearthwell blacksmith does tool
upgrades, geode cracking and ore, and does not buy geodes (note 77). The dwarf
here is a trader for people going down the Mines. Note 69's "the smith cracks,
the dwarf buys geodes" is changed: nobody buys geodes uncracked, and the dwarf buys ore
only. The `forge` interior keeps its name (the hut is still at a forge by the
mountain), and its id does not change.

## Trees, stone and clutter

- **Pines:** about 80 choppable pines on the slopes, hand placed, regrowing as in
  note 36, plus a cosmetic cliff and border. Choppable count is placeholder.
- **Rocks:** about 60 breakable rocks at the start, thicker near the forge and the
  east road, to supply stone before the mines (note 22). Return rules as note 65.
- **Twigs and weeds:** 30 and 30.

## Forage

Per-map table (contract need 3). 24 candidate spots on the slopes. Cap 4 a morning
(Stardew's saved page: about 0.5 a night, placeholder, so ours is a little richer).

| Season | Weights |
| --- | --- |
| Spring | wild leek 55, wild horseradish 45 |
| Summer | wild grape 60, spice berry 40 |
| Fall | hazelnut 50, field mushroom 25, wild plum 25 |
| Winter | crocus 40, pine nut 35, holly sprig 25 |

The tables use goods already in `forage.json`.

## Fishing

- **Mountain lake:** the 6 fish of note 21 (Cold Quill, Arctic Char, Granite
  Gudgeon, Echo Pike, Ember Trout, Glacier Ghost) and the legend Moonlit Mother
  (winter, night, clear). Open from the start.
- **River, upper reach:** the river table of the 9 River fish. The first river water
  other than the farm pond.
- **Pots** on the lake and river.

## Map contract needs

Water kinds (1), per-map forage (3), tree `kind` (4), conditional layers for the
rockfall (6), `rideable` (7), and a `cart` service kind (8, reserved). The mine door
uses the existing gated exit.

## Build order and slices

1. Shell: map, lake and river water kinds, footbridge, roads, rocks, Forest exit
   (staged), entries.
2. Pines, rocks, forage, fishing tables for the lake and the upper river.
3. The mine mouth: move the farm's `mine` door here, retarget `mine.json`, the
   rockfall art and its Spring 5 clearing. Remove the farm door.
4. The trading hut: interior, the dwarf's counter (lamps, rest-camp supplies, ore
   buying). The smith menu's upgrades and cracking move to the Hearthwell
   blacksmith (note 77) when that exists, and stay in the menu until then.
5. The stonekeeper's yard and footbridge as scenery, and the dwarf placeholder.
   The Quarry bridge and exit ride with note 78 (#649).
6. The Hearthwell exit when that map exists.

Work package: "Mountain map and the Mines entrance" (steps 1 to 3, 6) and the forge
with the dwarves' counters (steps 4 and 5).

## Open

- Where the furnace gift (note 44) is handed over, now the dwarf has no upgrades:
  the Hearthwell blacksmith is the proposal. The furnace itself is placed on the
  farm as today.
- The `forge` interior's name (the Mines-side hut), and the hut's lamp and
  rest-camp stock, which wait on the Mines notes (`22_mines.md`, #598).
- Whether the lake and river sizes give the 15 river and lake casting spots needed
  for a comfortable cast; check on the first Tiled draft.
