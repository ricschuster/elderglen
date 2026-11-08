# 60 Building placement (draft)

Status: draft. Decided with the owner on 2026-11-06. The coop and barn are built
(issue #611, see Built below); the stable, silo, well and painting are not. It
settles how the player places, moves and removes farm buildings: the stable
(`59_horse.md`) first, and likely the coop and barn (`23_animals.md`).

## Decisions (owner, 2026-11-06)

- **The player places a building on any free spot** of the farm, as Stardew. The
  saved Carpenter's Shop page says every tile of the footprint must be free
  (green), and rocks, twigs, weeds and placed items block it (red). Stable
  footprint is 4 by 2 tiles (saved Stable page).
- **Placement is only through the carpenter's menu,** in the village, as Stardew.
  Build, move and remove all happen there, then the player walks back to the farm.
- **Touch: drag the footprint, then press Confirm.** A ghost footprint follows
  the finger, green when free and red when blocked, with Confirm and Cancel
  buttons. Our choice, because a single tap is easy to misplace with a finger.
  Stardew uses a cursor click, from memory. Desktop can use the same ghost with a
  click to place and the same Confirm.
- **Moving is free and instant,** and the contents move with the building (saved
  Carpenter's Shop page, as Stardew). The building need not be empty, so animals
  and chests travel with it. Starter buildings can be moved too.
- **Removing refunds a share of the cost.** The owner wants some resources back.
  Placeholder: half of the gold and materials, rounded down, to tune in note 07.
  Stardew's refund is on no saved page. Removing the stable also removes the
  horse (saved Stable page).
- **A coop or barn with animals inside cannot be removed.** The remove button is
  greyed with the reason, and the player sells or moves the animals first, so no
  animal is lost (note 23: nothing is removed or lost in our design).

- **Every farm building uses it,** as Stardew: stable, coop, barn, silo and well
  (and the shipping bin can be moved, saved Carpenter's Shop page). Note 32's
  `buildSite` marks are then at most default spots.
- **What blocks a spot:** the saved page's rocks, twigs, weeds and placed items,
  plus water, cliffs, trees, stumps and boulders, and the exit corridors, the
  front of the house door and the bin tiles, so a building can never wall off an
  exit or trap the player. The reserved corridor rule is ours. Whether trees
  block is not on the saved page (checked, trees are not named there).
- **The preview shows green and red tiles, and outlines the objects in the way**
  (rocks, weeds, trees), so a tablet player on the dense day 1 farm sees what to
  clear. The outline is ours, Stardew shows only the tiles.
- **Buildings can be painted,** as Stardew: building, trim and roof colours in any
  combination (saved Carpenter's Shop page). Needs layered, tintable sprites for
  each building. Not built, and when it is built is open.

## Built (coop and barn, issue #611)

The first slice settles the two "Open first" items below. Numbers are
placeholders for note 07.

- **Map data: no new map layers.** A spot is free when the map's collision layer
  is open (water, cliffs, walls and the edge all live there) and the game state
  holds nothing on the tile: rocks, trees and stumps, fruit trees, weeds, twigs,
  tilled soil, sprinklers, machines, chests, goods on the ground, forage, and the
  other building. The corridor rule is derived, not marked. Every exit of the
  map keeps a one tile ring (the front of the house door), entries and counters
  (the bin, the shop) keep their own tile, and the silo's fixed spot stays kept
  until the silo is placeable. Last, a spot is refused if it would cut the player
  off from an exit or counter that can be reached now (a walk from the map's
  entries, with the new building as a wall and its door as the only gap). The
  tile in front of the building's door must be free too.
- **Build time is unchanged.** A new coop or barn still takes 3 days (note 23)
  and shows its scaffolding on the chosen spot meanwhile. Moving is instant, so
  there is no rebuild.
- **Ordering places.** Ordering a coop or barn opens the placement screen, and
  nothing is paid until a free spot is confirmed. Upgrades keep the spot, since
  the outside never changes with the tier.
- **Where it is stored.** `animals.sites` holds a top left tile per building. A
  building with none stands at the fixed site of its map (`COOP_SITES`,
  `BARN_SITES`), so old saves load unchanged. The door exit and the entry in
  front of it move with the building when the farm map loads.
- **Move** is free, only for a built building, and everything in it stays in it.
- **Remove** pays half of the gold, wood and stone of the building and of every
  upgrade paid, rounded down, and takes two presses. It is refused while the
  building has animals (the reason says how many), an egg in the incubator, or
  work under way, and when the pack has no room for the refund, so nothing is
  lost.
- **Screen.** The farm is drawn in the menu box with tiles as coloured squares,
  the ghost green or red, the blocked tiles outlined in red, and the first
  reason in words. Touch drags the ghost and presses Confirm; the mouse clicks
  to put it down and clicks it again, or presses Enter, to confirm. Arrows nudge
  it.
- **Not built:** the stable, silo, well and bin as placeable buildings, painting,
  and the real barn door tiles of #618. Tilled soil blocks a spot, which is ours
  and not from the saved page. Whether it should is for the owner.

## Open

- **Stable build time.** Two days for the stable (saved page). The coop and barn
  keep their three days and show scaffolding meanwhile (see Built).
- **Painting detail.** Colour choices, and whether the house is painted the same
  way (the saved page allows it only once the house is fully upgraded).
- **Multiplayer** (note 53, milestone M4): one stable each follows from `59_horse.md`.
- **Unbuilt UI.** The menu layout and a tablet size check, in a UI note.
