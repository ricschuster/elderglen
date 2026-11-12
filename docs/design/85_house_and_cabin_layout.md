# 85 Farmhouse and cabin layout

Status: **drafted 2026-11-11, owner answers recorded, two rounds, the sketch
waits for the owner's check** (note 81 decision 6). Nothing here is built. This is
step 11 of the layout track (`docs/handoffs/PRIORITIES.md`, note 81). It turns the
settled farmhouse design (`41_house.md`, `68_growing_interiors.md`) and the spouse
rules (`84_heart_event_and_spouse_routes.md`) into one tile plan, redraws the
connectors and stairs from the owner's Stardew screenshots, adds the spouse room,
and designs every renovation room Stardew has. All tile numbers are placeholders,
tuned in play. **Coordinates are in the current built frame** of
`src/content/maps/house.json` (35 by 22 tiles); the build adds one frame shift
(see "Frame and saves"). The Tiled draft is `docs/design/drafts/house-draft/`.

## Why

The farmhouse has grown in pieces: the start room (#421), the tier 2 band
(#286), the cellar stairs (#282), the widening (#550) and the stove. Each piece
kept the rule that no old tile moves, and each cut a 1 tile gap through a thick
wall. Stardew's house is open and wide. Note 84 then added a spouse who sleeps in
the double bed, cooks at the kitchen, stands in a shared room and goes out to a
corner on the farm. The renovations (note 41, "Renovations (reference)") were left
out with "own design note if they come". The cabin (note 53) waited on this note.

## What Stardew shows (owner's screenshots, 2026-11-11, and the saved pages)

Measured from the saved images in `docs/reference/stardew/farmhouse/` (the start
room is 64 px a tile, the tier 1 and tier 2 images about 39 and 35 px a tile).

- **The kitchen is not a separate room.** At tier 1 the checkered floor runs
  straight into the start room with no wall. The TV cabinet stands on the line.
- **The bedroom passage is about 4 tiles tall and 2 thick,** with a step, not
  1 tile. A void notch sits above and below it.
- **The stairs up are about 2 tiles wide,** at the junction of the kitchen and the
  start room, and lead to a 2 wide corridor into the spare room. The nursery is
  reached from the spare room through an opening about 2 to 3 rows tall, so
  Stardew has **one way upstairs.**
- **The interior door notch is about 2 tiles wide** (126 px at 64 px a tile). The
  outside door on the exterior art is about 1 tile.
- **The cellar stairs** are a notch in the bottom wall under the kitchen, about
  2 wide.
- **The cellar** is a stone room with 33 casks in 3 rows of 11, three pillars and
  a stairs notch in the top left corner. The saved Farmhouse page says it can hold up to
  189 casks; the saved Cask page (2026-11-11) says 125 fit with paths left to every one,
  and a full cellar is possible (SC-144). There is no count cap in Stardew, only space.
- **Renovations (saved Farmhouse page):** all unlock after the second upgrade, are
  completed instantly, and can be refunded in full at any time if the added area is
  not occupied. Prices: remove crib free, open bedroom 10,000g, southern room
  30,000g, corner room 20,000g, expand corner room 100,000g, attic 60,000g, cubby
  10,000g, dining room 150,000g, open dining room 10,000g. Each new room can have
  its own flooring and wallpaper. The page does not say what an expansion needs
  first (SC-143).
- **Where the rooms sit (the eight screenshots, all on a tier 3 house):** the open
  bedroom removes the wall between the start room and the bedroom. The southern
  room is a bedroom-wide room below the bedroom, down a 3 wide stair. The corner
  room is in the north-east, joined to the nursery by a short stair and to the
  bedroom by a stair. The expanded corner room grows north and east into an L. The
  attic is a big dark room above the spare room, up a 2 wide stair. The cubby is a
  small alcove on the south wall of the start room. The dining room is a wood-floor
  room west of the kitchen with a small alcove at its far end, and the open dining
  room removes the wall between it and the kitchen.

## Decided (owner, 2026-11-11)

1. **The spouse room is right of the bedroom and appears on marriage (Stardew,
   checked).** The saved Marriage page: once married, the spouse sets up a room in
   the farmhouse, to the right of the bedroom. Marriage needs tier 1, so the room
   can exist from tier 1. This corrects note 41 decision 5 ("from tier 2"). The
   room is shut and invisible until the wedding (note 68 rule 2). It is one shared
   room shell (note 84 decision 4).
2. **After a divorce the room and the corner vanish (Stardew, checked).** The saved
   Marriage page: the spouse, the room and the outside area are gone the next
   morning, and items left in the room go to a chest. Ours: the `spouse` condition
   stops holding, the room layers stop drawing, and anything the player placed
   there goes to one chest in the bedroom (see "Divorce"). This replaces the note 84
   line that left the room and the corner props "to a chest in the room".
3. **The nursery comes with a crib and two child beds from tier 2 (Stardew,
   checked).** The spare room stays bare. Children stay by the player's choice
   (note 12). Ours has no "remove crib" choice (Stardew has a free one), because
   our offer is never pressed, so the fixtures can simply stay.
4. **Connectors are bigger, the kitchen is open, there are more ways upstairs, and
   every Stardew renovation room is designed (owner, 2026-11-11, round 2).** The
   connector sizes, the three stairs and the eight renovations below follow.
5. **Door and connector widths (owner, 2026-11-11, round 3).** The interior door is
   2 wide and the farm door stays 1 wide (Stardew, from the screenshot: the owner's
   round 1 "1 wide" was from memory). The owner said stairs up and down are 2 wide
   and openings on one floor can be wider, then circled three openings on the
   picture to widen: the spare room to the nursery, the nursery to the corner room,
   and the bedroom to the spouse room. Those three are now 5 rows tall. Every other
   connector, stair and the door stay as drawn. SC-140 is answered from the
   screenshot.

## Checked on the saved Cabin page (2026-11-11)

- **A cabin's interior is identical to the farmhouse.** Farmhands may sleep in
  other cabins, but only the owner can move their own bed.
- **Each farmhand upgrades their own cabin three times,** with the same costs and
  the same three days as the farmhouse. Nobody can upgrade another player's cabin
  or the main house for them. The page does not mention renovations (SC-143).
- **A cabin is 5 by 3 outside, costs 100g built on an existing farm and is built at
  once.** Cabins chosen at the start of a new co-op game are free. This is
  already in notes 53 and 55.
- **Only the host's spouse has the outside area.** The saved Marriage page: in
  multiplayer, only the host player's spouse has the outside area. A farmhand's
  spouse uses the room.

## Changes to the built map

All of these only turn walls into floor or add tiles, except where marked. No
furniture sits on any of them.

1. The wall between the kitchen and the start room opens completely (x 10 to 11,
   y 13 to 20), from tier 1.
2. The passage from the start room to the bedroom grows from 1 row to 4 (x 21 to 23,
   y 14 to 17), from tier 1.
3. The door notch grows from 1 tile to 2 at every tier: tiles (13, 21) and (14, 21).
   The exit and entry objects grow with it.
4. The tier 2 stairs at (6, 10), 1 wide, **close again** (the one change that turns
   a built opening back into wall). Three 3 wide stairs replace it (see "Stairs").
5. The opening between the spare room and the nursery grows from 1 row to 5
   (x 16, y 3 to 7).
6. The kitchen fixtures, TV and hearth are not built yet and take the places below.

## The farmhouse plan

One growing map. Tier 2 with the spouse room, 47 by 22 tiles; the renovations add
the rest (see "Renovations"). One character per tile. `#` wall, `.` floor, `^`
stairs. The spouse room's floor is a different swatch in the draft.

```text
    01234567890123456789012345678901234567890123456
 0  ###################################
 1  #...............#..RR.....bb..bb..#
 2  #...............#..RR.....bb..bb..#
 3  #...............#.................#
 4  #.................................#
 5  #.................................#
 6  #.................................#
 7  #...............#.................#
 8  #...............#.................#
 9  #...............#.................#
10  ############^^^###^^^#########^^^##############
11  #..CSO.CF.##^^^###^^^###..........##......PPPP#
12  #....k....##^^^###^^^###..DDD.....##......PPPP#
13  #..............THH...###..p.s.....##......PPPP#
14  #.................................##......PPPP#
15  #.................................##..........#
16  #.................................##.......i..#
17  #.............................................#
18  #..vvv...............###......................#
19  #..vvv...............###......................#
20  #..vvv.......e.......###.......X..##..........#
21  #############..################################
```

| Mark | Meaning |
| --- | --- |
| `C` `S` `O` `F` | Kitchen counter, sink, stove, fridge (north wall of the kitchen, row 11) |
| `T` `H` | TV and hearth on the start room's back wall |
| `D` | The double bed, 3 wide, in the bedroom |
| `R` `b` | The nursery's crib and two child beds, 2 by 2 each, on its back wall |
| `^` | Stairs: A (x 12 to 14), B (x 18 to 20), C (x 30 to 32), each 3 wide |
| `v` | Cellar stairs, 3 by 3, in the kitchen's lower left corner (tier 3) |
| `e` | The door entry tile, the door is 2 wide (x 13 to 14, y 21) |
| `X` | The chest for divorce items |
| `P` | The spouse's prop block, 4 by 4, back right corner of the spouse room |
| `k` `p` `s` `i` | Marks, see "Marks for the routes" |

### Rooms

| Room | Interior (x by y) | Size | Tier | Notes |
| --- | --- | --- | --- | --- |
| Start room | 12 to 20 by 13 to 20 | 9 by 8 | 0 | Door (13 to 14, 21), hearth and TV on the back wall, single bed lower right at tier 0 |
| Kitchen | 3 to 9 by 11 to 20 at tier 1, 1 to 9 at tier 2 | 7 then 9 by 10 | 1 | Checkered floor, open to the start room, fixtures on row 11 |
| Bedroom | 24 to 31 by 11 to 20 at tier 1, 24 to 33 at tier 2 | 8 then 10 by 10 | 1 | Double bed on the back wall |
| Spare room | 1 to 15 by 1 to 9 | 15 by 9 | 2 | Bare and tidy, waiting. Stairs A come up at x 12 to 14 |
| Nursery | 17 to 33 by 1 to 9 | 17 by 9 | 2 | Crib at (19, 1), child beds at (26, 1) and (30, 1), all 2 by 2. Stairs B and C come up here |
| Spouse room | 36 to 45 by 11 to 20 | 10 by 10 | 1, on marriage | Shared by all 14 candidates |
| Cellar | its own map, `cellar.json` | 19 by 16 | 3 | Not changed here |

The outside of the farmhouse stays 9 by 5 at every tier, and the rooms are inside
the hill, so the outside footprint does not change (note 41 decision 3, SC-08).

### Connectors

Every connector is at least 3 wide, as the screenshots and the crowd rule suggest. The three circled by the owner (round 3) are 5.
"Built" is today's map. "Stardew" is read from the screenshots, to within a tile.

| Connector | Tiles | Size | Built | Stardew |
| --- | --- | --- | --- | --- |
| Kitchen and start room | x 10 to 11, y 13 to 20 | open, 8 rows | 1 row | no wall |
| Start room and bedroom | x 21 to 23, y 14 to 17 | 4 rows, 3 thick | 1 row | about 4 rows, 2 thick |
| Spare room and nursery | x 16, y 3 to 7 | 5 rows | 1 row | about 2 to 3 rows |
| Bedroom and spouse room (hall) | y 16 to 20 | 5 rows | not built | not read |
| Stairs A, B, C | 3 wide each | 3 wide | one, 1 wide | one, about 2 wide |
| Interior door | x 13 to 14, y 21 | 2 wide | 1 | about 2 |
| Cellar stairs | x 3 to 5, y 18 to 20 | 3 wide | 3 | about 2 |

### Stairs

Three ways upstairs, each 3 wide and 3 deep through the shared wall, so two players
can pass:

- **A (x 12 to 14, y 10 to 12)** from the start room's back wall up to the spare
  room. This is Stardew's stair, moved to the junction above the start room and
  made wider.
- **B (x 18 to 20, y 10 to 12)** from the start room straight up to the nursery.
  New.
- **C (x 30 to 32, y 10)** from the bedroom's back wall up to the east end of the
  nursery. New.

Stairs A and B stand over the start room's top wall, which is two rows lower than
the kitchen's and the bedroom's. The TV (15, 13) and the hearth (16 to 17, 13) sit
between them under a wall. The renovations add more: the attic stair, the southern
stair and the corner stairs (see "Renovations").

### Fixtures (proposed)

| Fixture | Tile | From tier | Notes |
| --- | --- | --- | --- |
| Counter | (3, 11), (7, 11) | 1 | Decor, blocks |
| Sink | (4, 11) | 1 | Refills the watering can (note 41) |
| Stove | (5, 11) | 1 | Built. A `cooking` service on `markers-t1` |
| Fridge | (8, 11) | 1 | A chest that the cooking screen reads, as the stove reads the pack (note 24) |
| TV | (15, 13) | 0 | Shows tomorrow's forecast (note 41, SC-33) |
| Hearth | (16 to 17, 13) | 0 | Decor, lit in cold weather |
| Double bed | (26 to 28, 12) | 1 | A `bed` service, built at (27, 12). Replaces the single bed at (20, 19), which becomes plain floor at tier 1 |
| Crib | (19 to 20, 1 to 2) | 2 | Nursery back wall, decor, blocks. No child yet means no child sprite |
| Child beds | (26 to 27) and (30 to 31), y 1 to 2 | 2 | Where the children sleep when there are any (note 12) |
| Divorce chest | (31, 20) | 1 | Bedroom south-east corner at tier 1, never moved. Hidden until a divorce |

The player's furniture is free placement on any floor tile (note 10), so only the
fixtures are fixed. Their art is placeholder.

## What each tier adds

| Tier or condition | Adds | Layers (each with its own `-tN` or `when`) |
| --- | --- | --- |
| 0 | The start room, the 2 wide door | `ground`, `collision` |
| 1 | Kitchen and bedroom, the open kitchen, the 4 row passage, the double bed, the stove, the fridge and sink | `-t1` |
| 2 | The upper band, three stairs, the 5 row door between the upper rooms, both rooms widened by 2, the nursery fixtures | `-t2` |
| 3 | The cellar stairs and the cellar | `markers-t2` (flag `cellar-open`) |
| `spouse` (marriage, any tier from 1) | The spouse room and its hall | `when: spouse` |
| `reno-...` (tier 2 and up) | One renovation each, see below | `when: reno-...` |

The `spouse` and `reno-...` conditions are names in `houseHolds` beside
`cellar-open`, set from the save. They are not tiers.

### The hall, tier 1 and tier 2

The bedroom's east wall is column 32 at tier 1 and column 34 at tier 2, so the
spouse room cannot sit on a wall that moves. It stands at a fixed place, interior
columns 36 to 45, and the hall between them changes. At tier 2 the hall is the
wall tiles (34 to 35, 16 to 20). At tier 1 it is a corridor (32 to 34, 16 to 20)
with a wall above and below. The tier 2 widening turns the corridor's walls into
bedroom floor, as it does for the rest of the east wall, so no tile moves and the
spouse room never shifts.

## Renovations

Stardew's renovations, designed for ours. Placeholders at Stardew's prices.

**Rules (Stardew, checked on the saved page, except where marked).**

- Unlock after the second upgrade (tier 2), from the carpenter's counter, which
  lists them under a "Renovations" tab (ours, as the house tiers are).
- Done at once, no building days, no scaffold.
- Refundable in full, at any time, if the added area is empty of the player's
  furniture and chests. Otherwise the carpenter says to clear it first. Refunding
  an open-bedroom, open-dining or an expansion puts the wall back.
- Each added room is its own wallpaper and flooring zone (note 10).
- Stored as a list of ids in the save (`houseRenos`), each is a condition
  `reno-<id>`. A cabin has its own list (unchecked, SC-143).
- An expansion needs its base room first, and an open room needs its room (ours,
  the page does not say, SC-143).

| Renovation | Stardew price | Needs | Where (x by y, interior) | Size | Connector | Floor in the draft |
| --- | --- | --- | --- | --- | --- | --- |
| Open bedroom | 10,000g | tier 2 | x 21 to 23, y 13 to 20 (the wall) | 3 by 8 added | the wall is gone, the bedroom and start room are one room | the same |
| Southern room | 30,000g | tier 2 | x 24 to 33, y 22 to 31 | 10 by 10 | stair, 3 wide and 2 deep, x 27 to 29, y 21 to 22 | the same |
| Corner room | 20,000g | tier 2 | x 36 to 46, y 1 to 9 | 11 by 9 | to the nursery, x 34 to 35, y 3 to 7 (5 rows); to the spouse room, stair x 40 to 42, y 10 (only while married) | violet |
| Expanded corner room | 100,000g | the corner room | north wing x 36 to 46, y -10 to 0; east wing x 48 to 52, y 2 to 7 | 11 by 11 and 5 by 6 added | the old top wall (row 0) and the east wall (x 47, y 2 to 7) open | violet |
| Attic | 60,000g | tier 2 | x 2 to 14, y -10 to -2 | 13 by 9 | stair, 3 wide and 2 deep, x 7 to 9, y -1 to 0, up from the spare room | dark brown |
| Cubby | 10,000g | tier 2 | x 16 to 20, y 22 to 24 | 5 by 3 | the start room's south wall opens, x 16 to 20, y 21 | the same |
| Dining room | 150,000g | tier 2 | x -15 to -2, y 11 to 20, and an alcove x -19 to -17, y 13 to 18 | 14 by 10 and 3 by 6 | opening in the kitchen's west wall, x -1 to 0, y 14 to 17 (4 rows); alcove opening x -16, y 13 to 18 | wood brown |
| Open dining room | 10,000g | the dining room | x -1 to 0, y 11 to 20 (the wall) | 2 by 10 added | the wall is gone, kitchen and dining room are one room | wood brown |

Notes on each:

- **Open bedroom.** The bedroom and the start room become one wide room. The two top
  nubs (x 22 to 23, y 11 to 12) stay as a pillar. Nothing placed moves.
- **Southern room.** As wide as the bedroom, below it. It is the quiet second
  bedroom or workshop. Its floor is shared with nothing, so its own zone.
- **Corner room.** In the north-east, past the nursery, above the spouse room. It is
  reached through the nursery (always) and by a stair from the spouse room (only
  while married, a `reno-corner` and `spouse` condition named `corner-stairs`). So
  it is a fourth way up for a married player.
- **Expanded corner room.** The room grows north into an L and east into an alcove,
  as in Stardew. It uses the rows north of the current frame, which is why the frame
  shifts.
- **Attic.** A big dark room above the spare room, up the stair on the spare room's
  top wall. North of the current frame too.
- **Cubby.** A small alcove below the start room, right of the door. In Stardew it
  is a cubby for storage and decoration, so it has no fixture.
- **Dining room.** West of the kitchen, in the frame's new west columns. The
  alcove at the far end follows the screenshot.
- **Open dining room.** Removes the double wall between the kitchen and the dining
  room, so the checkered floor meets the wood.

### Decoration zones

Each room is a wallpaper and flooring zone: start room, kitchen, bedroom, spare
room, nursery, spouse room, southern room, corner room (with its wings), attic,
cubby and dining room (with the alcove). The open rooms join their zones: open
bedroom joins start room and bedroom, open dining room joins kitchen and dining
room. The hall and stairs follow the room they open on (Stardew, 1.1 history:
hallways take wallpaper).

## Frame and saves

The attic and the expanded corner room need rows north of row 0, and the dining
room needs columns west of column 0. So the map frame shifts **once more, by
(20, 11),** and is then final: **74 by 44 tiles,** every room and renovation inside
it. Unbuilt space is black void and the camera is clamped to the built cells (note
68 rules 2 and 3), so the big frame is free for the player.

- **The shift** is a one-off script over `house.json`, as the #550 shift was:
  every tile and object moves by (20, 11). It is the last one, because the frame now
  holds every Stardew room. This replaces the "one allowed break, and the last one"
  of #550 by one more break, to be done once and never again.
- **Saves.** `HOUSE_LAYOUT` becomes 5. A layout 4 save moves every house piece
  (furniture and chests, map `house`) by (20, 11). Older layouts go through the
  existing steps first, so one chain covers all of them.
- **Camera bounds.** The loader already falls back to the box around the built
  cells when no `bounds` property exists. The new layers need no bounds properties,
  and the old ones (`bounds`, `bounds-t1`, `bounds-t2`) are removed or moved.
- **The spouse and renovation rooms** need no further shift. Their conditions come
  from the save, so a conditional layer is the whole mechanism.
- **A cabin** uses this map, so it is 74 by 44 too, with its own conditions.

## The pictures, tier by tier

All in `docs/design/drafts/house-draft/`. One block-out each, with a 10 tile grid
in the current frame. `house-draft.tmj` is the Tiled file, in the shifted frame, with
one tile layer per feature (`ground-t1`, `ground-spouse-t1`, `ground-open-bedroom`
and so on, each with a `tier` or `when` property) so the owner can switch them on and
off in Tiled.

| Picture | Shows |
| --- | --- |
| `house-draft-tier0-preview.png` | The start room alone, 11 by 10, the 2 wide door |
| `house-draft-tier1-preview.png` | Tier 1: the open kitchen, the start room, the 4 row passage, the bedroom |
| `house-draft-tier2-preview.png` | Tier 2 (and tier 3, which only adds the cellar stairs): three stairs, the nursery |
| `house-draft-tier1-spouse-preview.png` | Tier 1 with the spouse room and its 5 row hall |
| `house-draft-tier2-spouse-preview.png` | Tier 2 with the spouse room, 47 by 22 |
| `house-draft-all-renovations-preview.png` | Everything on: tier 2, the spouse room and all eight renovations, 74 by 44 |
| `house-draft-reno-<name>-preview.png` | One per renovation (open bedroom, southern room, corner room, corner room expanded, attic, cubby, dining room, open dining room), the added tiles tinted yellow |
| `house-draft-cellar-preview.png` | The cellar, built and not changed |

### The cellar

No change. `cellar.json` is 19 by 16: a stone room, interior 17 by 14, the stairs
up 3 by 3 in the top left corner (1 to 3, 1 to 3) and the entry at (4, 2). The player
stands casks on any free floor tile (#602, SC-39), so the room has no cask slots to
draw. The count has no cap, only space, as in Stardew (SC-144): ours has 229 free
tiles against Stardew's 125 with paths, so the room is big enough as it is. The cellar has no soil, no furniture and no chests.

## Marks for the routes

The marks are named points the route code reads (note 84, spouse route). The
tiles are placeholders.

| Mark | Tile | Used for |
| --- | --- | --- |
| `door-entry` | (13, 20) and (14, 20) | The spouse's way out and in, and the player's entry from the farm |
| `player-wake` | (26, 13) | Below the left half of the double bed, where the player stands up |
| `spouse-bed` | (28, 13) | Below the right half, where the spouse stands up and lies down |
| `spouse-kitchen` | (5, 12) | Breakfast, below the stove |
| `spouse-room-idle` | (43, 16) | The idle key stands here in the room (rain, snow, winter, evening) |
| `spouse-corner-idle` | (70, 9) on the farm | The idle key stands here in fair weather |

Walk times at 5 tiles a second (not checked as the walking speed, SC-41). The
open kitchen and the wide passage keep these short:

| From | To | Tiles | About |
| --- | --- | --- | --- |
| Door entry | Spouse bed | 22 | 4.5 s |
| Spouse bed | Kitchen mark | 28 | 5.5 s |
| Kitchen mark | Door entry | 16 | 3 s |
| Spouse bed | Spouse room idle | 24 | 5 s |
| Door (62, 12) outside | Corner idle (70, 9) | 11 | 2 s |

All are inside the 60 s of note 81 decision 5. No new interior is needed for
the spouse events (note 84).

## The outside corner (farm, note 55)

Stardew: a 2 by 8 tile area north-east of the house, only for the host's
spouse (checked on the saved Marriage page). Ours:

- **Tiles: x 70 to 71, y 4 to 11 (2 by 8), on the farm.** The cliff fills rows 0
  to 3, the Hearthwell road runs along rows 13 and 14 from the mailbox, so the
  corner sits north of the road with a free row (12) between. The house is at
  x 58 to 66, y 7 to 11.
- **Props in rows 4 to 8, the way in is rows 10 and 11.** The spouse stands at
  (70, 9), the `spouse-corner-idle` mark. The corner has no fence. The props are
  its edge.
- **It starts as clear grass.** The starting clutter keeps it empty, as it does
  around the house door (note 55 principles). A zone object `spouse-corner`
  (2 by 8 at (70, 4)) on the `markers` layer marks it for the route code and for
  the clutter check. The props are a `when: spouse` layer.
- **Only the host's spouse has it** (Stardew, checked). A farmhand's spouse uses
  the room all day in fair weather too. The corner is the host's farm, not a
  cabin's.

## The cabin

- **The cabin interior is the farmhouse map, not a copy.** One template, one
  `house.json`, per-player state: each player's tier, renovations, furniture,
  chests, spouse and bed (Stardew, checked: identical to the farmhouse). There is no
  `cabin.json`. This closes the open line in note 55.
- **Which instance.** The cabin's door on the farm is an exit to the `house`
  map for its owner. The scene holds one instance per owner (note 53, M4 spike).
  Furniture and chests are saved per owner on map `house`, as they are now for the
  one farmhouse.
- **Upgrades and renovations are the owner's alone** (Stardew, checked for
  upgrades, SC-143 for renovations), by the carpenter flow of note 41, with the
  cabin owner's wallet.
- **The spouse room and the divorce chest are the owner's too.** A farmhand who
  marries gets the room, and no outside corner.
- **A visitor** may enter any cabin and sleep there. Only the owner can move
  their bed (Stardew, checked). That is a rule for the M4 build.
- **The 8 player rule (note 81 decision 12) is met inside a house** by the 3 wide
  connectors and the 2 wide door. A jam is still possible and the M4 jam rule
  covers it.

## Divorce

Settled above (decision 2). In detail:

- The next morning `spouse` stops holding. The spouse layers, the corner props,
  the hall, the corner stairs and the marks stop applying, and the passage walls
  over again.
- Furniture and chests the player placed in the spouse room go into the divorce
  chest at (31, 20). The chest then shows in the bedroom. If it is too full for
  everything, the rest are mailed back by the postman (note 51, proposed).
- A player who is in the room when the day turns is moved to the bed, as at any
  day end.
- Remarrying brings the room back bare. The old furniture stays in the chest.

## Status per map (note 81 decision 7)

| Map | Layout done | Art done | Notes |
| --- | --- | --- | --- |
| `house` (start, tiers 1 and 2, cellar stairs) | Built, placeholder; the connectors change | No | This note changes six things in it |
| `house` spouse room and hall | Drafted, owner checked 2026-11-11 | No | New |
| `house` renovations (eight) | Drafted, owner checked 2026-11-11, build in M3b with the house | No | New |
| `farm` spouse corner | Drafted, owner checked 2026-11-11 | No | Farm map from #776 |
| `cellar` | Built, placeholder | No | Not changed here |

## Build work (no issues filed yet)

1. **The frame shift and the connector changes** in `house.json`: shift every tile
   and object by (20, 11), open the kitchen wall, widen the bedroom passage to 4
   rows, the spare and nursery door to 5 rows, the door to 2 wide, close the old
   stairs at (6, 10) and cut stairs A, B and C. `HOUSE_LAYOUT` 5 and the migration.
   Tests: nothing walkable at tier 0 or 1 is lost, every tile walkable before is
   still walkable, and a layout 4 save moves by (20, 11).
2. **Spouse layers** with `when: spouse`: the room, the hall and the wall
   openings. `houseHolds(tier, spouse)` adds `spouse`. **Built (#833).**
3. **Renovation layers** with `when: reno-<id>`, one per renovation, plus
   `corner-stairs`. `houseHolds` adds the ids from `houseRenos`. The carpenter's
   Renovations tab, pricing, the empty-area refund rule, and the needs
   (expansion needs its room). **Built (#834).** Layers are `ground-reno-<id>-t2` and
   `collision-reno-<id>-t2` with `when: reno-<id>` (ids `open-bedroom`, `south`,
   `corner`, `corner-big`, `attic`, `cubby`, `dining`, `dining-open`), and
   `ground-corner-stairs-t2` with the hold `corner-stairs`, which `houseHolds` gives
   for the corner room with a spouse. A renovation's area for the refund rule is its
   ground layer. Prices are in `src/content/house-renos.json`.
4. **Fixtures (built, #835).** The sink, fridge, counters, TV and hearth, and the nursery's crib
   and two child beds (tier 2), as `markers` objects and blocking tiles, the double
   bed's two sleep marks, the divorce chest and the named marks.
5. **The farm corner.** The `spouse-corner` zone and `spouse-corner-idle` mark on
   `farm.json`, a `when: spouse` props layer and a clutter check. **Built (#836).**
   The zone is a `zone` object on `markers`, the mark is on `marks-spouse`, and the
   props are three placeholder tiles at x 71, rows 4, 6 and 8 on `objects-spouse` and
   `collision-spouse` (`when: spouse`). Test: `tests/farm-spouse-corner.test.ts`.
6. **Text.** The carpenter's waiting line and the morning report say the spare room
   and the nursery will be "bare and tidy, for later" (note 68, #286). Change them to
   the spare room only.
   **Built (#837).**
7. **Tests.** For every combination of tier, spouse and the eight renovations: every
   mark and every stair is reachable from the door entry, each stair joins two
   floors, a renovation adds no tile outside its own rectangle and openings, and
   removing one restores the tiles. **Built (#838).** `tests/house-reach.test.ts` reads every
   valid renovation set (an expansion only with its room, 144 sets) at tiers 0 to 3,
   with and without a spouse.
8. **Cabin** (M4, with note 53): the owner's instance of `house`, per-owner tier,
   renovations and spouse.

## Open

Decided 2026-11-11 (round 3): the one more frame shift to 74 by 44 is accepted, and
the renovations come in M3b with the house.

- SC-143: what an expansion or the open rooms need first in Stardew, and whether a
  cabin can be renovated. Ours is a proposal.
- The looks of the added rooms, the fixtures, the nursery and the 14 prop sets
  (the art pass, #58, and the voice sheets).
- The look and the number of children, and what they do day to day (note 12 still
  has it open). The crib and beds stand empty until then.
- Whether `spouse-room-idle` and `spouse-corner-idle` need more than one tile
  when two players are in the room.
- The divorce chest's capacity against a furnished room (above, the postman is a
  proposal).
- How a farmhand's wedding is scheduled (note 53).
- How a blocked passage is freed with 8 players in a house (the M4 jam rule).
- The farm door's width on the farm side (1 tile, from the exterior art, SC-140).
