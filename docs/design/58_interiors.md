# 58 Interiors (draft)

Status: draft. Decided with the owner on 2026-11-06. Nothing here is built. It
settles which buildings the player can walk into, and so how many interior maps
the game needs. ADR 0005 says buildings are interior maps, not menus.

## Why

The notes fixed 14 interiors and left about a dozen open: the animal buildings,
the greenhouse, the homes of the eight people who live outside Hearthwell, and
the Outpost steward's rooms. A solo developer needs the real number before the
map work is planned.

## Decisions (owner, 2026-11-06)

1. **Coop and barn are walked into, one map per tier (owner, 2026-11-06,
   revised).** The first draft said the big and deluxe tiers add parts to one
   base layout. The owner did not like that and chose a full map per tier, with
   no sealed earth, for the coop, the barn and the farmhouse (`41_house.md`).
   So the coop has three maps and the barn three, sized by the table below. They
   share a template and furniture so the authoring stays light. Whether Stardew
   stores them this way is not checked (SC-36).
   **Update 2026-11-07, not yet settled:** the owner now says to do it as
   Stardew does (one room that grows with each tier, SC-36), and asked how to
   draw it, since a tier that is not built must not show early. This reopens
   the one map per tier choice above. Design this before building the barn,
   coop or farmhouse tiers.
2. **The greenhouse is walked into.** Note 31 already says "as in Stardew". It
   is one map, locked as a ruin until the Larder room reward.
3. **Everyone outside Hearthwell with a shop or home gets an interior, and
   shop and home are one map.** Five maps (see the table). The stonekeeper
   dwarf, the Mines trainer and the Wanderer have none. They work or wander
   outdoors.
4. **The Outpost has two maps**: the post room, and a separate map for the
   steward's rooms. This is the one place note 20 decision 2 (a shop family is
   one map) does not hold. Stardew keeps a shop and its home as one map (owner, from memory, SC-37), so this is our own choice.

5. **The farmstead has visual paddocks (owner, 2026-11-06).** The Forest
   farmstead is the keeper's house and shop (one interior) plus a few paddocks
   outside, with animals drawn in them. They are scenery only: no interaction,
   no feeding, no selling from them. The farmstead stays part of the Forest map,
   not its own area.

## Stardew sizes

From the saved wiki pages for the Barn, Coop and Greenhouse (reference only,
not copied into the repo). The wiki gives outside footprints. The interior
sizes below are not stated there, so they are measured from the saved
screenshots (see the interior table).

| Building | Footprint outside | Interior |
| --- | --- | --- |
| Coop (all 3 tiers) | 6 by 3 tiles | Measured, see below. |
| Barn (all 3 tiers) | 7 by 4 tiles | Measured, see below. |
| Greenhouse | 7 by 6 plus 3 by 2 | Soil plot 12 columns by 10 rows. A one tile wood border round it, then a two tile margin to the walls. That works out at about 18 by 16 floor tiles, my sum from the page and not a stated number. |

Capacity by tier (animals): coop 4, 8, 12 and barn 4, 8, 12 on the wiki. Ours
are in note 23. Footprint is the same at every tier, which fits decision 1: one
outside sprite per type, only the inside grows.

Interior sizes, measured from the full size screenshots the owner saved
(2026-11-06). Method: one feeding bench hay slot is one tile (4 slots on the
base bench, 8 on big, 12 on deluxe), and the window spacing came out as whole
tiles in every picture. Width and depth are outer sizes including the walls, give
or take half a tile, and the depth stops at the bottom wall, so the door notch is
not counted. The back wall is the top 2 to 3 rows.

| Tier | Coop (width by depth) | Barn (width by depth) |
| --- | --- | --- |
| Base | 11 by 8 | 17 by 13 |
| Big | 15 by 8 | 21 by 13 |
| Deluxe | 22 by 8 | 24 by 13 |

Depth stays the same across tiers, so each tier grows sideways only. Shape
notes:

- The feeding bench runs along the back wall, with the hay hopper to its left and
  the water trough to its right.
- Each building has a one tile door notch in the bottom wall. Coop: bottom left
  at every tier. Barn: toward the middle, its position moving by tier (not
  measured in tiles).
- The barn has a stall wing in the bottom left corner, about 5 wide by 4 deep in
  the base barn, cut out of the main rectangle. The coop has no stalls.

The Guidebook supplement has no building sizes. SC-38 is answered from the
screenshots. The owner can still confirm in game.

## The count

| Group | Maps | Detail |
| --- | --- | --- |
| Hearthwell shop-and-home | 7 | General store, smithy and mender, inn and kitchen, healer, library, sawmill and carpenter, hatter's shop |
| The Outpost | 2 | Post room, and the steward's rooms |
| Hearthwell burrows | 3 | Gardener, retired couple with grandchild, two young adults (`19_valley_layout.md`, decision 14) |
| The Long Table (hall) | 1 | Main room and six rooms (`40_hall_layout.md`) |
| Farm buildings | 5 | Farmhouse start, tier 1 and tier 2 (tier 3 reuses the tier 2 map and adds the cellar stairs, `41_house.md`), farm cave (`55_farm_layout.md`), greenhouse |
| Coop and barn | 6 | One map per tier, three each |
| Outside Hearthwell | 5 | Hermit's tower (Forest), farmstead keeper's house with the animal shop (Forest), smith dwarf's forge (Mountain), fisher's shop and home (River delta), the Beach elf's house and Homeward pin stall (Beach) |

By place:

| Place | Maps |
| --- | --- |
| Hearthwell | 12 |
| The Long Table | 1 |
| Farm (house 3, cave, greenhouse, coop 3, barn 3) | 11 |
| Forest | 2 |
| Mountain | 1 |
| River delta (with the Beach) | 2 |
| **Total** | **29** |

The Mines, the Secret Woods and the Lake cove are areas, not interiors.

## No interior

The stable (decided 2026-11-06, as Stardew: seen from outside, the horse stands
beside it, `59_horse.md`).

The stonekeeper dwarf (works on bridges and stonework, Mountain), the Mines
trainer (stands at the practice dummy), the Wanderer (wanders the Forest), the
courier (lodges at the inn, so she uses its map), and the festival green.

## Keeping the build small

- **Templates, not 23 one-offs.** Three shared shells carry most of the work:
  a shop-and-home (about 8 maps, counting the Outpost post room and the farmstead), a small
  burrow (3 maps), and a one-room hut (hermit, elf, fisher, forge). Each map then
  differs in furniture and counter.
- **M2 stays as it is.** Only the farmhouse tier 1 is in the first playable
  (`33_build_order.md`). Other buildings keep their menu stand-in until their
  interior exists (`06_map_style.md`).
- **Each interior brief** is one room about 14 by 10 tiles with one door, the
  Outpost note's placeholder (`57_the_outpost.md`), unless its own note says more.

## Still open

- Whether the barn stall wing is built, and the exact farmhouse tile sizes (settled roughly in `41_house.md`). Use
  the table above for the coop and barn. The greenhouse placeholder is 18 by 16, and
  other interiors keep the 14 by 10 placeholder.
- Day state and NPC routines inside interiors (`06_map_style.md`).
