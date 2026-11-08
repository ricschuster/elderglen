# 55 Farm layout (draft)

Status: draft, started 2026-11-03. Nothing here is built. The placeholder farm
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
| House | North-east corner, door facing south | `41_house.md`. Footprint 9 by 5 and never changes |
| Bin | Right of the house door, a few tiles from it | `28_shipping_bin.md`, owner SC-03 |
| Mailbox | Beside the house, on the road path east of the door (decided 2026-11-03) | `51_mail_and_letters.md` |
| Greenhouse ruin | North, left of centre, on a grass patch | `31_farm_growth.md`. Repaired in place by the Larder reward |
| Farm cave | North cliff, west of the greenhouse | `31_farm_growth.md`. A small interior map you walk into (decided 2026-11-03), empty until the earnings mark |
| Big pond | South centre | Watering can. River fish table (`32_farm_types.md`) |
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
south pond holds fish, on the river table (`32_farm_types.md`). The small east
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

## Open

- **The exact tillable count and the field shape.**
- **Starting clutter counts** and the knock-on to note 43's wood economy.
- **Stardew unchecked:** how large the Standard field is (SC-25). The house,
  bin, greenhouse and cave are fixed there (SC-24, owner).
- **Other farm types** (Woodland, Riverside, Hilltop, Meadow) each need their
  own layout note later. This one covers Standard only.

## Build order

1. Settle the open items with the owner and update this note.
2. Author `farm.json` in Tiled to the contract in note 05, replacing the
   placeholder (the generator `gen-farm-map.mjs` was retired in #524).
3. Hand-place clutter and trees from a data list, not code.
4. Add the greenhouse ruin and cave as placed, locked objects once their
   systems exist.
