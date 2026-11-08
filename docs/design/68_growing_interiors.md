# 68 Growing interiors: farmhouse, coop and barn (draft)

Status: draft, 2026-11-07. Decided with the owner today, except where marked
as the assistant's proposal. The loader and the merged farmhouse map are built
(#421, see "Built" below); the coop, barn, tier 2 and the cellar are not. This
settles how a building
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
- **Core stays free of Phaser.** `houseMapId(tier)` is gone. `core` exposes
  `visibleTier(tier, maxTier)` and `houseVisibleTier(tier)` and the scenes read the layers.

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
- **Tiled authoring.** The generator `scripts/gen-farm-map.mjs` was
  stale and was retired in #524, so the maps are authored by hand.

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

## Tier 2 widens the kitchen and the bedroom (settled 2026-11-08)

The owner chose the Stardew plan: at tier 2 both rooms grow wider, as the
owner's tier 1 and tier 2 screenshots show (about 34 tiles wide against 31).
The tier 1 kitchen has its wall on column 0, so growing it left cannot keep
the tile rule above. This is the one allowed break, and the last one.

- **The shift.** Every tile of the house map moves right by `TIER_2_WIDEN` (2)
  columns, in all layers of every tier. The map goes from 31 to 35 wide, the
  depth stays 22. The start room's corner moves from (9, 12) to (11, 12), the
  door from (11, 21) to (13, 21). Tier 0 and tier 1 look the same as before,
  with two more columns of void on the left, and the camera bounds move with
  them (`bounds` 11,12,11,10 and `bounds-t1` 2,10,31,12).
- **What tier 2 adds.** Kitchen interior 7 to 9 wide: the old west wall
  (now column 2) becomes floor and a new wall stands at column 0. Bedroom
  interior 8 to 10 wide: the old east wall (now column 32) becomes floor and
  the wall moves to column 34. Depth is unchanged. The upper band widens to
  match, so the spare room gains 2 columns on the left and the nursery 2 on
  the right, and the divider between them stays where the shift puts it
  (column 16).
- **Furniture.** Nothing placed moves relative to the room. Pieces keep their
  tile after the shift (`legacyHouseTile` adds 2 to x). Pieces against the old
  west or east wall now stand one step in from the new wall, which is fine.
  Kitchen fixtures (counter, fridge, sink) are on the north wall and do not
  move. The cellar stairs of tier 3 shift with everything and stay in their
  3 by 3 patch, now two tiles in from the corner (the rule: never move old
  tiles).
- **Saves.** `HOUSE_LAYOUT` becomes 4. A layout 3 save moves every house piece
  (furniture and chests, map `house`) right by 2. Older layouts first go to
  layout 3 by the existing steps, then add 2, so one chain covers all of them.
  The tier number is the only other house state, and it needs no change.
- **Authoring.** The shift is done by a one-off script over `house.json`
  (move every tile and object right, grow the map width, edit the bounds
  properties), not by hand in Tiled. Then `ground-t2` and `collision-t2` are
  extended with the two wider rooms, with a test that the tier 1 view is
  unchanged apart from the offset.
- **No wake line change.** The report already says the new rooms are ready.
  The waiting line about the spare room and nursery stays.
- **Build issue to file:** `feat: tier 2 widens the kitchen and bedroom (note
  68)`. Not built.

## Still open

## Built (#421, 2026-11-07)

- **Layers.** `core/map.ts` reads a layer name's `-tN` suffix as its tier
  (`layerTier`). `FarmMap.fromTiled(json, tier)` merges the layers at or below
  the tier, and `MapRegistry.get(id, tier)` holds every tier of every map.
  Layers are `ground`, `collision` and `markers` (objects), each with a `-t1`
  version. This differs from the `floor`, `walls` and `objects` names above
  because the existing maps already use `ground`.
- **Merging.** A higher tier paints over a lower one, so it may change a tile
  (the start room's bed tile becomes floor). In a `collision-tN` layer the tile
  id `2` (`OPEN_TILE`) opens a cell that a lower tier blocked, which is how
  the doorways are cut through the start room's walls. Any other tile blocks.
- **Void.** On a map with tier layers, a cell with no ground at the current
  tier is blocked, so it cannot be walked into or aimed at, and it is never
  drawn.
- **Bounds.** The map properties `bounds` (tier 0) and `bounds-t1` are strings
  "x,y,w,h" in tiles. Without one, the box around the built cells is used.
  `cameraBounds` takes the built rectangle, so a window bigger than the rooms
  shows black bars centred on them. The night wash covers only the built part.
- **Objects.** An object's tier is its layer's, or its own `tier` property. A
  named entry, exit or service on a higher tier replaces the one of the same
  name, so the tier 1 bed replaces the start room's, and a barn can move its
  door by tier.
- **The farmhouse frame.** The start room's corner sits at tile (9, 2), so the
  kitchen can sit to its left. The tier 1 rooms keep the tiles of the old
  `house-1` map (kitchen interior x 1 to 7, bedroom x 22 to 29, door at 11, 11).
  A save from before this (no `houseLayout`) has furniture and chests by the old
  frame: pieces on `house` move by (9, 2), pieces on `house-1` keep their tile
  and go to `house` (`legacyHouseTile`). New saves write `houseLayout: 2`.
- **Wake line.** The morning report already says "The carpenter has finished.
  Your new rooms are ready." (`core/report.ts`), which covers SC-70.
- **If the layers prove awkward in Tiled.** The fallback is still a map per tier
  with only the loader changed. Nothing so far needs it.

## Built (#286, 2026-11-07)

- **Tier 2 layers.** `ground-t2` and `collision-t2` add the upper band (a spare
  room and a nursery, 10 rows with the shared wall) above the tier 1 rooms.
  Stairs at (4, 10) open the kitchen's top wall with the open tile. No objects
  layer was needed, and no furniture is placed, so the rooms read as waiting.
- **Bounds.** `bounds-t2` is the whole 31 by 22 map. Tier 3 has no property, so
  the nearest lower one is used. `houseVisibleTier(3)` is 2 and
  `houseHasCellar(tier)` flags the cellar stairs for #282.
- **The frame moved.** Tier 2 needed 10 more rows above, so the map is 22 rows
  and the start room's corner is (9, 12). `HOUSE_LAYOUT` is 3. A save with no
  `houseLayout` (layout 1) moves pieces on `house` by (9, 12) and pieces on
  `house-1` down 10. A save at layout 2 moves its house pieces down 10.
  `legacyHouseTile(map, x, y, layout)` does all three.
- **Carpenter.** `HOUSE_UPGRADES` has tiers 1 to 3. Tier 2 wood stands in for
  hardwood. Order checks and the three day build are the existing ones. The
  waiting line ("The carpenter says the spare room and the nursery will be bare
  and tidy, for later.") shows when tier 2 is ordered and in the morning report
  when it lands.
- **Not built.** The larger kitchen and bedroom at tier 2: the map stays 31
  wide, and widening it would move the tier 1 tiles again. Settled in "Tier 2
  widens the kitchen and the bedroom" above.

## Built (#282, 2026-11-07)

- **Cellar stairs.** `markers-t2` in `house.json` holds the stairs: an exit
  `cellar` (3 by 3 tiles in the kitchen's lower left corner, drawn with the door
  tile in `ground-t2`) and the entry `from_cellar`. The exit has
  `requires: cellar-open`, so it is a tier 3 flag and not a new layer set:
  `houseHolds(tier)` gives `cellar-open` from tier 3, and before that the stairs
  say "It is shut."
- **Registry check.** `MapRegistry.problems()` now accepts an exit target entry
  that sits on any tier of the target map, since `from_cellar` lives on tier 2.
- **Not a house map.** The cellar id is `cellar`, so `isHouseMap` is false: no
  furniture or chests there, and a house tier change does not reload it.
