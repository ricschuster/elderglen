# 68 Growing interiors: farmhouse, coop and barn (draft)

Status: draft, 2026-11-07. Decided with the owner today, except where marked
as the assistant's proposal. Nothing here is built. This settles how a building
that gains tiers is stored and drawn, so a tier that is not built never shows.
It replaces note 58 decision 1 (one map per tier) and the "one interior map per
tier" part of note 41.

## What the owner asked for

Do it as Stardew does: one room that grows with each tier, and unbuilt tiers
are never shown (SC-36, 2026-11-07).

## What is known about Stardew, and what is not

- **Seen (owner's screenshots, 2026-11-06, `docs/reference/stardew/farmhouse/`).**
  The start room is a small lit room with black outside its walls. At tier 2
  the same room sits in the lower middle of a larger plan, with the kitchen to
  its left, the bedroom to its right and two more rooms above, and black void
  between and around them. Nothing unbuilt is drawn.
- **Not known: how Stardew stores it.** One map that grows, or a separate map
  per tier, cannot be told from the player's side, and ADR 0002 says black box
  only, so we do not look. SC-36 stays "storage unchecked". The owner raised
  this doubt on 2026-11-07, and it is right.
- **So the design is stated as what the player sees.** Storage is our choice
  and is easy to change later, because a save holds only the tier number
  (`house.ts`, `GameState.houseTier`), not a map or a position.

## The player-visible rules (decided)

1. **One place that grows.** The start room never moves. Upgrading adds rooms
   around it. Furniture, the player and the door stay exactly where they were.
2. **Unbuilt space is black void (owner).** It cannot be seen, walked into or
   clicked. No scaffold, no sealed earth, no "coming soon" door.
3. **The camera is clamped to the built rooms (owner).** It stops at the
   bounding box of what exists, so nothing unbuilt peeks in. With the window
   canvas (note 64), a window bigger than the rooms shows black bars, the same
   as any small map.
4. **An upgrade lands overnight.** The new tier starts on the morning of day
   D+3 (`41_house.md`, carpenter flow). The player wakes in the bed with the
   new rooms open. No change while the player is inside.
5. **Barn door moves by tier (owner).** The coop door stays bottom left at
   every tier. The barn door moves toward the middle as the barn widens
   (SC-38, from the screenshots, not measured in tiles).
6. **Footprint outside never changes** (note 41 decision 3). Only the outside
   art changes with the tier.

## Storage (the assistant's proposal, open to change)

One Tiled map per growing building, holding every tier, with the tier rooms in
separate layers.

- **Layers per tier.** Each tier adds ground, wall and object layers named with
  a tier suffix (`floor-t1`, `walls-t1`, `objects-t1`). The loader draws and
  collides only layers whose tier is at or below `houseTier`.
- **Bounds per tier.** A map property per tier gives the camera clamp
  rectangle. The loader picks the one for the current tier.
- **Doors per tier.** Each door object carries a `tier` property. A barn has
  one door object per tier, the loader keeps the highest one at or below the
  current tier, and the farm map's door always leads to that one.
- **Furniture needs no move.** Furniture is saved by tile, and the start room
  keeps its tiles in every tier, so nothing is remapped. The rule for the
  farmhouse and barn: new tiers only add tiles, they never move the old ones.
- **Why not a map per tier.** It means three files kept in step, a tile offset
  for every tier change, and the risk of drift, for no change the player can
  see. It stays a fallback: the rules above hold either way, and the loader is
  the only code that would change.
- **Core stays free of Phaser.** `houseMapId(tier)` goes away. `core` exposes
  `visibleTier(building)` and the scenes read the layers.

## Per building

| Building | Tiers | Grows | Notes |
| --- | --- | --- | --- |
| Farmhouse | start, 1, 2 (3 adds the cellar stairs) | Start room fixed in the middle. Tier 1 adds the kitchen left and the bedroom right. Tier 2 adds the upper band (spare room, nursery). | Sizes from note 41. Cellar stays its own small map. |
| Coop | 3 | To the right, depth fixed at 8. | Sizes 11, 15 and 22 wide (SC-38). Door bottom left. |
| Barn | 3 | To the right, depth fixed at 13. Stall wing is bottom left, if built. | Sizes 17, 21 and 24 wide. Door per tier. |
| Greenhouse | 1 | Does not grow. | Locked ruin until the Larder reward (note 58). |

Growing right keeps the left edge, the feeding bench anchor and the animals'
tiles fixed. The barn's door moving is then a door in a new place, not the
whole barn shifting.

## What this changes

- **Map count.** The farm group goes from 11 maps (house 3, cave, greenhouse,
  coop 3, barn 3) to 5 (house, cave, greenhouse, coop, barn), so note 58's total
  goes from 29 to 23. The cellar was not in that count and still is not.
- **Built work.** `house.json` and `house-1.json` (#422) become one map. Tier 2
  and the cellar arrive as layers in M3. #421, #282 and #286 are rewritten.
- **Tiled authoring.** The generator `scripts/gen-farm-map.mjs` is already
  stale (see #524), so the new maps are authored by hand.

## Settled 2026-11-07 (the open items)

- **The barn stall wing is built (owner).** The cut-out in the bottom left of
  the base barn, about 5 wide by 4 deep, as measured from the screenshots. What
  Stardew uses it for is not checked (SC-69), so ours gets its own purpose in
  note 23, such as a feed store or a healer's corner. Like every part of a
  growing barn it stays in place at the bigger tiers.
- **Barn door tiles are a placeholder (owner).** The middle tile of the bottom
  wall at each tier, x 8, 10 and 12 on the 17, 21 and 24 wide barns. The owner
  reads the real tiles in the desktop game (SC-68). The coop door stays bottom
  left. A change of tile touches only the door object's position.
- **One line on waking (owner).** When an upgrade lands, the player gets a
  single dismissable line from the carpenter, such as "The new rooms are
  ready", so the change is not missed. Whether Stardew shows anything is not
  checked (SC-70).

## Still open

- The cellar stairs: a stairs object in the tier 2 layers, enabled at tier 3.
  Nothing blocks this until M3.
