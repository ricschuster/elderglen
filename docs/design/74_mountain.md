# 74 Mountain (draft)

Status: draft, written 2026-11-08, owner answers recorded the same day (note 71).
Build order steps 1 to 6 are built (2026-11-09, #642 and #643, see "Built status" at
the end); the Quarry bridge and exit were built later (#649, see "Built status (2026-11-09, #649)").
M3b. It designs the Mountain map and moves the Mines entrance onto it.
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
| exit | `to_hearthwell` | `hearthwell` entry `from_mountain` | South edge. Built with Hearthwell part 1 (#645, note 77 "Shell built") |
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

## Built status (2026-11-09, #642)

Build order steps 1 to 3 are built, with step 2's lake fish, and step 6 as far as the
map allows.

- **Map:** `src/content/maps/mountain.json`, 80 by 70, drafted by
  `scripts/drafts/gen-mountain-map.mjs` (the JSON is the source from then on). Properties
  `wild`, `rideable` and `waterKind` mountain-lake. Water zones: the lake
  (x 18 to 45, y 8 to 25) as the default kind, and three `river` rects that step east
  (x 46 to 52 from the stream mouth at (46, 18) to y 37, x 50 to 55 to y 45, x 53 to
  58 to the south edge) so the Hearthwell road keeps the west bank to the south edge.
- **Roads:** west road (y 35 to 37) from the Forest exit, the stone footbridge at
  x 47 to 52 (path tiles over the water), the east road, a spur north to the rockfall
  and the mine mouth, a spur south to where the stonekeeper's yard goes, the river road
  and a lake shore path. The forge spur and the road past it (y 47 to 48) are laid and
  the forge footprint (x 10 to 24, y 38 to 50) is kept clear of trees and clutter.
- **Exits and entries:** `to_forest` (west, x 0, y 34 to 40) with entry `from_forest`
  (3, 37); the Forest gains `to_mountain` (east edge, x 119, y 60 to 66) and entry
  `from_mountain` (116, 63), and its road now runs to the edge; `mine` at (68, 10)
  with `requires: mines-open`, entry `from_mine` (68, 13); entry `from_hearthwell`
  (47, 66) with **no exit yet** (Hearthwell does not exist). `mine.json`'s door now
  returns to `mountain` entry `from_mine`. The farm and the Woodland farm lose their
  `mine` exit and `from_mine` entry (the door tile at (20, 0) is a tree again). Not
  cut: `forge`, `to_quarry`, and their entries.
- **The rockfall:** x 60 to 66, y 14 to 18, in a permanent cliff band across the pass
  (x 54 to 77) and a ridge east of the lake, so the mine mouth is reached only through
  it. A conditional `collision` layer and a `rockfall` art layer are shown `unless`
  `mines-open`; `holdsOf` now adds `mines-open` from day 5, so the gap is open on any
  load after Spring 5 begins (collision is read at load, so a map already open when the
  day turns would show it on the next entry; the player wakes at home, so this does not
  come up). The mine mouth is a 5 by 4 block with its door at (68, 10).
- **Contract change:** an entry may carry `requires`. `from_mine` does, because with the
  rockfall shut nothing reaches it, so the "all conditions false" reading skips an
  unreachable entry that needs a condition, and skips an unreachable exit that needs one.
- **Pines, clutter, forage:** 80 choppable pines (56 mature, 17 young, 7 seedlings), at
  least a tile apart and all reachable; 60 rocks (36 weighted to the forge side and the
  east road), 30 twigs, 30 weeds; 24 forage spots; ten cosmetic cliff outcrops.
  `forage-areas.json` gains `mountain` (cap 4, the four seasonal tables of this note).
- **Fish:** the six lake fish of note 21 in `fish.json` (Cold Quill, Arctic Char,
  Granite Gudgeon, Echo Pike, Ember Trout, Glacier Ghost; prices and lengths are
  placeholders). The river is the shared river table. Not built: Moonlit Mother and
  pots.
- **Sim:** the headless bot's `enter` now finds a route over the map graph (farm,
  Forest, Mountain, mine hall), reads maps with their conditions, and keeps flood
  distances for maps with no soil. Expert seed 1 still plays every bundle it plays.
- **Not built:** the forge hut and its counter (#643), the stonekeeper's yard and the
  dwarf placeholders (#643), the Quarry bridge and exit (#649), the Hearthwell exit, the
  cart stop, the Moonlit Mother legend, pots, ruined and cleared art (placeholder tiles
  stand in), and the smith menu is still the stand-in at the mine hall.
- **Playtest:** `npm run playtest:mountain`.

## Built status (2026-11-09, #643)

Build order steps 4 and 5: the forge and the stonekeeper's yard. Hand edits to
`mountain.json`, no generator.

- **Forge hut:** exterior x 15 to 24, y 40 to 46 (10 by 7, roof then wall tiles), door
  at (18, 46), entry `from_forge` at (18, 47) on the road past the forge. The note's
  entry (18, 49) and a hut from x 14 would sit on the forge spur road, so the hut is
  shifted one tile east and the entry moved up onto the road. Exit `forge` (map `forge`,
  entry `door`).
- **Interior:** `src/content/maps/forge.json`, 10 by 7, the fisher's hut template: one
  `smith` service at (5, 1), two crate tiles as stock, the door at (5, 6) back to
  `from_forge`.
- **The smith's counter moves here.** The `smith` service is removed from the mine hall
  (`mine.json`) and is the forge's counter, so ore, coal, the furnace gift (first copper
  ore shown), geode cracking, weapon forging and the tool upgrades all sit at the forge.
  The note says upgrades and cracking go to the Hearthwell blacksmith when that exists
  (note 77), so they stay in this one menu until then. The sim bot walks to the forge.
- **The dwarf buys ore:** the counter gains "Sell copper / iron / gold ore" rows
  (Stardew sell prices already in `ore.ts`), shown when ore is held. Bars, stone and
  coal are still not bought.
- **Open from day 1.** The forge door has no `requires`, so the furnace gift and ore are
  reachable before Spring 5 (the mine hall's old counter opened with the mines). The
  furnace still needs a copper ore, coal and gold.
- **Stonekeeper's yard:** a paved yard x 60 to 72, y 44 to 51 joined to the south spur,
  a stone stack (x 68 to 71, y 44 to 45, solid), a two-crate work bench (65 to 66, 45) and
  the stonekeeper's post at (66, 46), a sign tile standing in for the dwarf (no sprite).
  Facing it says the bridge east is out (`STONEKEEPER_LINE`, `src/core/smith.ts`). No
  interior. The east side (x 73 to 79) is left clear.
- **Not built:** lamps and rest-camp supplies at the counter (no lamp item or camp
  supply design exists; they wait on the Mines notes, #598), the Quarry bridge, exit
  and `to_quarry` (#649), a dwarf sprite for either dwarf, and the furnace gift moving to
  the Hearthwell blacksmith (open, above).
- **Playtest:** `npm run playtest:forge`. Tests: `tests/mountain.test.ts`.

## Built status (2026-11-09, #649)

The Quarry bridge and exit, hand edits to `mountain.json` (the Quarry itself is note 78).

- **Bridge:** ground run x 73 to 79, y 45 to 49 is path (the plank bridge and the way
  to the exit). A ravine of cliff tiles (solid) fills x 73 to 78 above (y 40 to 44) and
  below (y 50 to 54) it, so nothing walks round. The east trees at x 78 and 79 on those
  rows are cleared.
- **Ruined and mended art:** a collision layer and a `bridge-ruined` art layer
  (checkered cliff tiles) with `unless: quarry-open` cover x 73 to 78, y 45 to 49. When
  the condition holds both go and the plain path shows. An object group
  `bridge-markers` (`unless: quarry-open`) puts five `quarry-bridge` services on x 73,
  y 45 to 49, so facing the ruin from the yard says "The bridge is out" and names the
  Foragers' Shelf (`QUARRY_BRIDGE_LINE`, `src/core/quarry.ts`).
- **Exit and entry:** `to_quarry` (x 79, y 45 to 49, `requires: quarry-open`) leads to
  `quarry` entry `from_mountain`. Entry `from_quarry` at (76, 47), on the bridge, also
  `requires: quarry-open`. The map check passes with the condition true and false.
- **The yard post** now says the stonekeeper has taken his camp across the Quarry bridge
  once `quarry-open` holds (`YARD_EMPTY_LINE`); before it, the old bridge line.
- **Tests:** `tests/quarry.test.ts`. Playtest: `npm run playtest:quarry`.

## Owner decisions 2026-11-09 (after the map builds)

- **The forge hut stays open from day 1, no gate (as Stardew's Mines).** Ore and the
  furnace gift are reachable before Spring 5. Stamina and the furnace cost (copper ore,
  coal, gold) are the pacing, not a door. Furnace recipe timing in Stardew is unchecked
  (SC-102).
- **The smith screen is split (built, #708).** The forge hut keeps ore buying, lamps and
  rest-camp supplies (lamps and camp supplies are not on the screen yet). Tool upgrades and
  geode cracking go to the Hearthwell smithy counter (note 77, kind `smithy`), as the owner
  decided in answer 7. Since 2026-11-10 the smithy sells and buys ore and sells coal too, at
  the dwarf's prices (note 77, "Owner decisions 2026-11-10"). **Weapons are bought at the dwarf, not forged** (owner, 2026-11-09):
  there is no weapon forging until a later forge (Stardew has no forge until Ginger Island).
  The dwarf sells the copper, iron, gold and Hearthsilver tiers for coin, with no gate. In
  Stardew, Mines weapons are sold at the Adventurer's Guild (owner, 2026-11-09, SC-103), and
  the dwarf, the Mines-side trader, is the Elderglen equivalent. Prices are placeholders
  (note 07). `forgeWeapon` and its tests stay in `src/core/combat.ts`.

## Built status (2026-11-12)

The forge hut and its counter (#643) were built on 2026-11-09 (above). The forge counter now keeps its
shop hours (note 79: 9:00 to 19:00, open daily; see note 77 "Built status (2026-11-12)"). Lamps and
rest-camp supplies are still not built: no lamp item or camp supply design exists, and placing a lamp
needs the placement system.
