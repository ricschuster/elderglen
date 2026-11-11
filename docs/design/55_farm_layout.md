# 55 Farm layout (draft)

Status: layout done and owner checked 2026-11-11 (the first draft below, build issue #776). Draft otherwise, started 2026-11-03. The placeholder farm map (`farm.json`) is built and does not follow this note:
the house is north-west, the cave and festival ground east, the greenhouse north
of centre. Settle which moves before real art. The placeholder farm
(`05_farm_map_placeholder.md`) stays until a real map is authored in Tiled. This
note decides where things stand on the home farm, so the farm map, the house
(`41_house.md`), the bin (`28_shipping_bin.md`), the greenhouse and cave
(`31_farm_growth.md`), trees (`43_wood_source.md`), weeds (`29_weeds.md`) and
the exits (`19_valley_layout.md`) fit one picture and not seven.

Reference: the owner's screenshot of Stardew's Standard farm on day 1
(`docs/reference/stardew/screenshot_standard_farm_day1.png`, gitignored). Black
box only (ADR 0002). We copy ideas of placement, never the map itself, so our
farm is drawn fresh and is not a trace.

## What the screenshot shows

Read from the image, not from memory. Positions are as seen on screen.

- **The house, top right.** The farmhouse stands in the north-east corner on a
  strip of grass, with a fence along its north side. The bin stands just to the
  right of the house. A mailbox stands by the house on the fence line.
- **The field is one big open block of bare ground,** filling the middle and
  the west. Grass is only a border around it.
- **The field starts full.** Trees of several kinds (broadleaf, pine) stand over
  most of it, with stumps, boulders, branches, bushes and weeds between them.
  It reads as a cleared-by-hand job, not an empty lawn.
- **The ruined greenhouse is top left of centre,** a scaffold on a patch of
  grass inside the field, near the north edge.
- **The farm cave is a small opening in the north cliff,** top left, a short
  walk west of the greenhouse. The north edge is a raised cliff line there.
- **A big pond in the south centre** and a **small pond on the east side.**
- **Exits:** a path leaves at the top centre, and an opening at the bottom
  centre. The edges left and right are grass strips and trees; a dark opening
  sits in the bottom right corner. Which of those are real exits is not clear
  from the image.
- **Flowering trees** line the outer corners and edges as a decorative border.

## Layout principles (draft, ours)

1. **The house is the anchor.** The player wakes there, the bin and mailbox are
   beside it, and the road out leaves from near it. Short trips on day 1.
2. **Work flows away from the house.** The first fields sit nearest the house
   and the pond, and the harder ground (trees, rocks) is farthest.
3. **One big open field, not rooms.** Fits tap-to-move (`48_tap_to_move.md`)
   and gives sprinkler and scarecrow layouts room.
4. **Landmarks in the corners and edges,** so the player can name a place
   ("by the cave", "south pond") and so the map reads at a glance on a tablet.
5. **Hand-placed clutter** (`32_farm_types.md`). Nothing is random on day 1.
6. **Grass borders hold no crops.** The `soil` layer marks the field only, per
   the map contract. Kept 2026-11-07: pale diggable earth for the field, green
   grass not tillable (`67_any_grass_tilling.md`, draft).

## Where each thing goes (draft)

| Thing | Place | Note |
| --- | --- | --- |
| House | North-east, west of the corner and south of the cliff, door facing south | `41_house.md`. Footprint 9 by 5 and never changes |
| Bin | Right of the house door, a few tiles from it | `28_shipping_bin.md`, owner SC-03 |
| Mailbox | Beside the house, on the road path east of the door (decided 2026-11-03) | `51_mail_and_letters.md` |
| Greenhouse ruin | Left of centre, near the north edge, on a grass patch | `31_farm_growth.md`. Repaired in place by the Larder reward |
| Farm cave | North cliff, next to the Forest exit (owner, 2026-11-11) | `31_farm_growth.md`. A small interior map you walk into (decided 2026-11-03), empty until the earnings mark |
| Big pond | South centre | Watering can. Lake fish table (`farm-pond`, owner 2026-11-10; `32_farm_types.md`) |
| Small pond | East side | Decided 2026-11-03: two ponds. A second refill point, no fish |
| Exits | See below | `19_valley_layout.md` |
| Stable | Player placed on any free 4 by 2 spot (decided 2026-11-06, as Stardew) | `59_horse.md`. No fixed site on the map. Placement is designed in `60_building_placement.md`: drag a footprint and confirm on touch, plus move and remove with some resources back (owner, 2026-11-06) |
| Trees, stumps, rocks, weeds | Scattered over the field, thinner near the house | See "Starting clutter" |

## Waking up

The new game and every morning begin at the bed inside the house, and the player
walks out the door (decided 2026-11-03, as Stardew). The first `start` entry
sits just outside the door for the very first scene, after any intro.

## Ponds and fish

Two ponds (decided 2026-11-03). Both refill the watering can. Only the big
south pond holds fish, on the lake table (`32_farm_types.md`, owner 2026-11-10). The small east
pond is for water and looks. Note 19 says the farm has one pond; this adds a
second, and fishing stays as that note and #181 settle it.

## Exits

`19_valley_layout.md` gives the farm three exits: Forest, Hearthwell and River
delta. Decided 2026-11-03, to match where the house sits and where the sea is:

- **North:** Forest. The path leaves the top of the field.
- **East, beside the house:** Hearthwell. The road starts by the mailbox.
- **South:** River delta. The opening at the bottom, past the big pond.

There is no hidden fourth exit (decided 2026-11-03). The screenshot's dark
opening in the bottom right corner is not copied.

Entries sit beside each exit, not inside it (the map contract). The new game
starts at a `start` entry by the house door.

## Starting clutter

**Decided 2026-11-03: dense like Stardew.** The whole field starts full of
trees, stumps, boulders, branches, bushes and weeds, as the screenshot shows.
Clearing the farm is the early game.

This supersedes note 43's "about 30 mature trees". Many more trees means far
more wood than the 450 for house tier 1, so the wood economy in note 43 needs a
second look (tree count, wood per tree, whether the carpenter still gates on
wood). Flagged there. The exact starting counts are not taken from the
screenshot; set them when the first Tiled draft exists and tune in
`07_tuning_numbers.md`.

## Clutter after the clear

Once the player clears the dense start, whether rocks, branches and stumps
return each spring is as Stardew does it (decided 2026-11-03). The owner says
rocks and debris return to some extent the next season, and trees and grass
spread but not in winter (SC-29). How much is still open, so the exact rule needs
a note. Weeds follow `29_weeds.md` either way. Decided 2026-11-06 in
`65_special_orders_and_debris.md`: a small share of rocks and twigs returns on
day 1 of spring, summer and fall, with a cap, and nothing in winter.

## The first crops

**Decided 2026-11-03: no cleared plot (as Stardew).** The player clears their
own first patch. The tool and tap-to-act flow must make that quick and
satisfying on day 1, so the opening is not a wall. Watch this in the first
tablet playtest.

## Size

**Decided 2026-11-03: about 80 by 65 tiles, as Stardew's Standard farm.** That
size is the owner's memory and unchecked (SC-25), so treat it as a target to
confirm. The placeholder is 40 by 30. The big field holds the dense clutter and
about 100 trees (note 43) with room to farm. The camera scrolls, and whole
number zoom shows only part of the farm on a tablet (`06_map_style.md`). The
tillable share per farm type follows `32_farm_types.md`.

## Settled 2026-11-11 (owner)

- **Tillable count and field shape (Stardew from the saved Farm Maps page,
  SC-25).** About 3,400 tillable tiles of the 80 by 65 farm (Stardew's Standard
  farm has 3,427), with one big open block as the main field, up to about 63 by
  31 tiles (Stardew's biggest block). The block fills the middle and the west.
  The house strip is north-east, the greenhouse patch sits inside the north
  edge, and the ponds cut into the south and east edges. Grass border, cliffs
  and ponds hold the rest.
- **Starting clutter counts (ours, Stardew's counts unchecked, SC-122).** Trees
  100 (80 mature, 12 young, 8 seedlings, note 43), stumps 20, boulders 12,
  stones 80, branches 60, bushes 15, weeds 150. All hand-placed from a data
  list, thinner near the house. Set when the first Tiled draft exists and tuned
  in `07_tuning_numbers.md`. Note 43's wood economy already counts about 100
  trees, so it needs no change.
- **Cabin area: no reserved pad (Stardew from memory, SC-120).** Clutter is
  thin near the house, as the principles say. The host clears room for cabins
  as for any building. Seven cabins are placed freely through the carpenter, so
  the map needs no cabin lots and no pad object.

## First draft, revised 2026-11-11 (owner checked in the picture)

A rough block-out. The Tiled file is `docs/design/drafts/farm-draft/farm-draft.tmj`
with a picture beside it (see the README there); it is regenerated from one
coordinate list, so these numbers match it. Each character below is 2 by 2
tiles, the map is 80 by 65 tiles (40 by 33 characters). Tile positions are x
then y from the top-left, and a size is width by height.

Owner changes, same day: the house and the greenhouse move south, the house
moves west, the small pond moves close to the house, the Forest exit moves east,
no exit is gated, and the cave moves next to the Forest exit.

```text
######################NNN###############
###################C##===###############
^.....................===..............^
^............................HHHHH.....^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,.HHHHH.....^
^,,,,,,,,,,,GGG,,,,,,,,,,,,,.HHHHH.....^
^,,,,,,,,,,,GGG,,,,,,,,,,,,,...@=BM====E
^,,,,,,,,,,,,,,,,,,,,,,,,,,,...========E
^,,,,,,,,,,,,,,,,,,,,,,,,,,,...........E
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~~,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~~,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,~~~,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,.~~~~~~~.,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,.~~~~~~~.,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,.~~~~~~~.,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,.~~~~~~~.,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,.~~~~~~~.,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,.~~~~~~~.,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,........===,,,,,,,,,,,,,,^
^^^^^^^^^^^^^^^^^^^^^^===^^^^^^^^^^^^^^^
^^^^^^^^^^^^^^^^^^^^^^DDD^^^^^^^^^^^^^^^
```

Legend: `#` cliff, `^` border trees, `.` grass (not tillable), `,` field
(tillable), `~` pond, `=` path, `H` house, `G` greenhouse ruin, `C` farm cave,
`@` start, `B` bin, `M` mailbox, `N` `E` `D` exits north, east and south.

| Thing | Tiles | Note |
| --- | --- | --- |
| House | x 58 to 66, y 7 to 11 (9 by 5) | Door bottom middle at 62,11. Grass strip around it, x 56 to 77, y 6 to 17 |
| Start entry and path | 62,12, steps 62,12 to 62,14 | The first `start` entry just outside the door |
| Bin | 66,13 | Right of the door, on the road side |
| Mailbox | 68,13 | On the east road, as decided 2026-11-03 |
| East road | x 62 to 79, y 13 to 14 (2 wide) | Leads to the Hearthwell exit |
| Hearthwell exit | x 79, y 12 to 16 (5 tall) | `to_hearthwell`, entry `from_hearthwell` at 78,14 |
| Forest exit | x 44 to 48, y 0 (5 wide) | `to_forest`, entry `from_forest` at 46,4. A 5 wide path runs through the cliff gap only. Below it the way is grass, then field: no path across the field (owner, 2026-11-11) |
| Farm cave | 38,3 to 39,3 in the north cliff (2 wide) | `to_cave`, entry below it at 38,4. 8 tiles west of the Forest exit, east of the greenhouse |
| Greenhouse ruin | x 24 to 29, y 10 to 13 (6 by 4) | Stands on tillable field, no grass patch. Its tiles are on the `objects` layer over field ground and the `soil` layer is marked underneath, so it can move (owner, 2026-11-11). Door third tile of the bottom row, at 26,13 |
| Big pond | x 30 to 43, y 49 to 58 (14 by 10) | Lake fish table. South centre |
| Small pond | x 70 to 75, y 19 to 23 (6 by 5) | Water only, east side, 6 tiles from the road |
| River delta exit | x 44 to 48, y 64 (5 wide) | `to_delta`, entry `from_delta` at 46,63. A 5 wide path runs through the border trees only (x 44 to 48, y 61 to 63). The way up from it is tillable field, no path (owner, 2026-11-11) |
| Main field | x 6 to 68, y 12 to 42 (63 by 31) | Stardew's biggest block size, with the house strip cut out of its north-east corner. Bands and lobes: north y 8 to 11, west x 3 to 5, south y 43 to 47, south-west x 4 to 27, y 48 to 60, south-east x 46 to 76, y 45 to 60, east strip x 69 to 76, y 18 to 44 |

No exit has a `requires` gate (owner, 2026-11-11). Tillable total in this
sketch: 3424 tiles, plus the 24 under the greenhouse, against the target of about 3,400.

How the sketch handles the rules:

- **House anchor.** Bed, bin, mailbox and the Hearthwell road are all within 20
  tiles of the door.
- **Work flows away from the house.** The first fields (south and west of the
  house, with the small pond beside them) are nearest the house. The big pond and
  the far south-west lobe are the farthest, and the hardest ground sits there.
- **Thin clutter near the house.** The area x 50 to 76, y 18 to 36 starts thin
  (about a third of the field's density), which is the room for the seven
  cabins, coop, barn, silo and stable. No reserved pad (owner).
- **Water.** The small pond is near the house, the big pond is on the way to the
  south exit.
- **Walk times at 5 tiles a second (`SPEED` 80, 16 px tiles, not checked as the
  walking speed).** Door to the Hearthwell exit about 6 s, to the Forest exit
  about 10 s, to the River delta exit about 17 s. All well inside the 60 s of
  note 81 decision 5.
- **Exits and entries** sit beside each exit, not inside it (the map contract).
  The bin and the door need more than one approach tile (note 81 decision 12).
- **Seasons, tiers, festivals.** The field and borders swap with the season
  tileset (note 81 decision 3). The farmhouse is one footprint at every tier.
  The greenhouse ruin changes to the repaired greenhouse by tier. The festival
  ground is no longer a farm object (festival layouts are another track).

The owner accepted the layout as drawn on 2026-11-11, including the thin 2 tile
border. Build issue: #776.

## Open

- **Stardew unchecked:** the Standard farm's overall size (SC-25, owner keeps
  80 by 65 as our target). The house, bin, greenhouse and cave are fixed there
  (SC-24, owner).
- **Border width:** left as drawn, 2 tiles (owner, 2026-11-11: layout good as is).
- **The placeholder farm still differs** (house north-west, cave and festival
  ground east). The authored map replaces it, with no interim move.
- **Other farm types** (Woodland, Riverside, Hilltop, Meadow) each need their
  own layout note later. This one covers Standard only.

## Cabins for multiplayer (owner, 2026-11-11)

Note 53 (M4) gives each joining player a cabin on the farm, up to seven beside
the host's house. Decided 2026-11-11 (Stardew from memory, SC-120): cabins are
placed freely through the carpenter like any other building, with the building
placement system (#611), and not on reserved lots. So the farm layout needs
one open area, not a plot row. Consequences for this note:

- Keep clutter thin near the house, so seven cabins fit as well as the coop,
  barn, silo and greenhouse without crowding the field. Check the room when the
  farm is authored. No reserved pad (owner, 2026-11-11).
- A game started as multiplayer places each free cabin in a default spot for
  each joiner. The default spot is a rule in the M4 build, not a map object.
- The cabin interior is one template with per-player state (note 68, growing
  interior). Its layout waits for the farmhouse interior, which it follows.

## Build order

1. Settle the open items with the owner and update this note.
2. Author `farm.json` in Tiled to the contract in note 05, replacing the
   placeholder (the generator `gen-farm-map.mjs` was retired in #524).
3. Hand-place clutter and trees from a data list, not code.
4. Add the greenhouse ruin and cave as placed, locked objects once their
   systems exist.
