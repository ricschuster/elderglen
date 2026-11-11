# 86 Interior layouts: templates from Stardew's rooms (draft)

Status: **drafted 2026-11-11, owner answers recorded (round 1), the redrawn pilot waits for the owner's check** (note 81 decision 6).
Nothing here is built. This is step 4 of the layout track
(`docs/handoffs/PRIORITIES.md`, note 81): interior layouts, with a Tiled draft of a
pilot first. The pilot is the general store, plus two more templates (the one-room
hut and the inn). All tile numbers are placeholders, tuned in play. Per ADR 0002 the
rooms follow the idea of Stardew's interiors (a shop and a home in one building, a
counter near the door, rooms off a short passage), not their art, names or exact
plans. Nothing is copied 1:1: every room below differs in shape, size and furniture.

## Why

Fourteen interiors are built as bare shells, 14 by 10 tiles or smaller, with only
`ground`, `collision` and `markers` (note 58, note 77 "Interiors built"). Note 58
settled which buildings are walked into and that three shared shells (shop-and-home,
burrow, one-room hut) carry most of the work. It did not say what is inside a shell.
Step 11 (note 85) drew the farmhouse. This note draws the rest, from the owner's
saved Stardew interior images, so the building art pass later has a plan to follow.

## What was studied (owner's saved images, 2026-11-11)

Thirteen interior images in `docs/reference/stardew/` (gitignored, reference only).
Each is a whole building, rooms and corridors in one picture. Sizes are outer, with
the walls, in 16 px tiles, and are my estimates: the images are at different scales,
and I found each scale from a known object (a bed is 2 tiles wide, a door is 1 by 2,
floor and shelf cells are 1 tile). Treat each size as about right, give or take a
tile. The scale column says how sure the scale is.

| Interior | Image size (px) | Scale | Tiles (w by h) | Scale sure? | Used for |
| --- | --- | --- | --- | --- | --- |
| Pierre's General Store | 658 by 490 | 1x | 41 by 31 | yes (door) | general store |
| Saloon | 722 by 394 | 1x | 45 by 25 | yes (bed) | inn and kitchen |
| Carpenter's Shop | 498 by 394 | 1x | 31 by 25 | yes (bed) | sawmill and carpenter |
| Marnie's Ranch | 530 by 314 | 1x | 33 by 20 | yes (bed) | farmstead keeper |
| JojaMart | 460 by 471 | 1x | 29 by 29 | likely | crowd flow in a big shop |
| Blacksmith | 480 by 640 | 2x | 15 by 20 | yes (bed) | smithy and mender, forge hut |
| Wizard's Tower | 416 by 788 | 2x | 13 by 25 | likely | hermit's tower |
| Adventurer's Guild | 420 by 628 | 2x | 13 by 20 | likely | Outpost post room |
| Harvey's Clinic, ground | 1104 by 939 | 3x | 23 by 20 | yes (floor) | healer |
| Harvey's Clinic, upstairs | 1001 by 546 | about 2.5x | about 25 by 14 | no | the home above a shop |
| Museum (library) | 1146 by 908 | 3x | 24 by 19 | yes (shelf grid) | library |
| Fish Shop | 534 by 462 | 3x | 11 by 10 | yes (door) | delta fisher |
| Sebastian's Room | 582 by 576 | 3x | 12 by 12 | yes (door) | burrows |
| Community Center, restored | 2144 by 914 | about 2x | about 67 by 29 | no | the hall (note 40, done) |

## What Stardew shows

The patterns, found in at least three images each:

1. **A shop and its home are one building.** The public room is the front, with the
   door. The household rooms sit behind or beside it, joined by a short passage.
   Pierre's, the Carpenter's, Marnie's and the Saloon all do this. The Clinic has the
   patient wing and the doctor's flat upstairs.
2. **The public room is the biggest and is nearest the door.** Pierre's shop room is
   17 wide by about 18 deep, the Carpenter's workshop about 14 by 11. The household
   rooms are 9 to 16 wide and 9 to 12 deep.
3. **Every door has a notch about 2 tiles wide.** The notch is a stub in the bottom
   wall, about 2 deep, with the real door at its end. I found it in Pierre's (2 wide),
   the Fish Shop (about 2), the Guild (about 2), the Clinic (about 2), and the
   farmhouse in note 85. The outside door on the exterior art is 1 tile. So the entry
   is always 2 wide, which fits the multiplayer rule (note 81 decision 12).
4. **The counter stands in the room, not on the wall.** Pierre's counter is 6 wide and
   stands a row off the back wall, with the keeper on the wall side and the player on
   the door side. The Fish Shop counter is the room's centre piece. Stock shelves
   stand between the counter and the door, so the player walks past the goods.
5. **Rooms are joined by passages 2 or more tiles wide, 1 to 3 deep.** The Carpenter's
   corridor and Marnie's passages are 2 wide. The Clinic's are 2 to 3. None is 1 wide.
6. **The wall is 2 to 3 rows at the top, 1 on the other sides.** Windows and wall
   pictures sit in the top wall. The back row of the floor holds shelves, a stove,
   a bed head or a hearth.
7. **Homes are a bed, a table, a kitchen strip and a rug.** Sebastian's room (12 by 12)
   and the Fish Shop (11 by 10) show the smallest useful home: one bed, one table, a
   stove or shelf and one rug.
8. **Crowd rooms are open floor with furniture on the edges.** The Saloon tap room has
   the bar on the back wall, a hearth, and tables with seats spread on open floor.
   JojaMart is the extreme: 2 wide aisles between shelf blocks, nothing narrower.
9. **Shapes are irregular.** Corners are cut, rooms are different widths, and the
   building outline is not a rectangle. That is Stardew's look and not our rule.

## What we change

1. **The home sits behind the shop, as in Stardew (owner, 2026-11-11).** The shop is
   at the front with the door; the household's rooms are behind it, off a living
   area. I first drew shop and home side by side to fit one 30 by 17 screen, and the
   owner chose Stardew's layout instead. The general store is 25 by 26 and scrolls
   vertically. Other buildings have their own layouts (owner), so each building keeps
   its own plan and this is not a rule for all of them. Only the hall and the
   buildings taller than 17 scroll.
2. **Rectangles.** Every room is a rectangle and every building is one rectangle plus
   the door notch. The look of cut corners is an art question (note 15), not a layout
   one. This keeps the contract checks simple and the tile counts readable.
3. **2 wide entry notch everywhere (owner accepted, 2026-11-11, SC-145).** Note 81 decision 5 says a
   door is 1 tile wide and 2 for barns and the hall. Stardew's notch is 2 in every
   interior I measured, and decision 12 asks for crowd doors 2 wide. This note uses
   2 wide for every interior, huts included, so one player in the doorway never shuts
   a hut. The exterior door on the map stays 1 tile. Note 81
   decision 5 now says interior entry 2 wide.
4. **Counters reachable from more than one tile** (decision 12): at least two player
   tiles in front of a counter and the keeper's tile reachable from two sides.
5. **8 players can pass.** Every public aisle is 2 wide, except the produce wall's
   1 wide strip, which is never the only way through.
6. **Our household.** The general store holds three people (the store keeper, her
   partner, their child), so it has a double bed and a child's bed. The inn holds the
   innkeeper's pair and eight guest beds. Stardew's households differ.
7. **Marks match note 80's spots.** `store/counter` (serve and stock) and
   `store/home` (cook, sit, bed) are named marks, so the routes find them.

## The pilot: the general store

Draft: `docs/design/drafts/interiors-draft/general-store.tmj`, with the picture
`general-store-preview.png` and the plan `general-store.txt`. The plan is 25 wide by
26 tall, including the walls and the door notch. The owner asked for a store area, a
living area, a kitchen and two bedrooms (2026-11-11).

```text
#########################
#########################
#SS..BB.#B.....#.KKKKKK.#
#....BB.#B.....#........#
#.......#......#..TTT...#
#.......#......#..TTT...#
#..rrr..#....XX#........#
#.......#....XX#........#
####GG#####GG######..####
#..............HHH......#
#..QQQQ.................#
#........rrrrrrr.TTT....#
#................TTT....#
###########..############
#.............SSSSSSSS..#
#.......................#
#..CCCCCC...............#
#X......................#
#X......................#
#X......SSSSSS..........#
#X......SSSSSS..........#
#X....................XX#
#.........rrrrrr........#
###########..############
          #..#           
          #DD#           
```

Key: `#` wall, `.` floor, `r` rug (walkable), `D` door, `G` gated door (a bedroom
door, open from 2 hearts), `C` counter, `S` shelf, `B` bed, `T` table, `K` kitchen,
`X` crate or bin, `W` workstation, `H` hearth, `Q` seat, `L` display or tank. Fixtures
block movement. Marks are points on `markers`.

- **Three bands, top to bottom.** The bedrooms and kitchen (y 2 to 7), the living area
  (y 9 to 12), and the shop (y 14 to 22). Each band is joined to the next by a gap
  2 wide, so the building reads shop, then living, then the rooms behind.
- **Shop (y 14 to 22, x 1 to 23).** Counter 6 wide at x 3 to 8, y 16, one row off the
  keeper's aisle (y 15). The player serves from (5, 17) and (6, 17), with four more
  floor tiles along the front, so the counter has six player tiles and the keeper
  tile (5, 15) is open from both sides. A stock shelf on the back wall (x 14 to 21),
  one shelf island 6 wide (x 8 to 13, y 19 to 20) and a produce wall (x 1, y 17 to 21)
  put the goods between the door and the counter. Crates (x 22 to 23, y 21). The aisles
  round the island are 2 wide.
- **The opening to the living area.** A gap 2 wide at x 11 to 12, y 13 (owner:
  a 2 row opening is fine for the general store).
- **Living area (y 9 to 12).** A hearth on the back wall (x 15 to 17), a sofa (x 3 to 6,
  y 10), a rug and a dining table (x 17 to 19, y 11 to 12). It is the hub of the home.
- **Rooms behind (y 2 to 7).** The parents' bedroom (x 1 to 7, a double bed and a
  dresser), the child's bedroom (x 9 to 14, a bed and a toy crate) and the kitchen
  (x 16 to 23, a strip of kitchen along the back wall and a table). Each opens to the
  living area through a gap 2 wide at y 8.
- **What the player may enter.** The shop, the living area and the kitchen are open
  while the door is open (to 21:00, note 79). The two bedrooms have gated doors (`G`),
  shut until 2 hearts with that person (owner, 2026-11-11, and note 61 decision 6:
  "a person's door", as in Stardew). A check on the draft with the gates shut leaves
  only the two bedrooms unreachable.
- **The door notch.** Floor at x 11 to 12 through the bottom wall and one row below,
  doors at y 25, entry marks at y 24, so the entry is 2 wide.
- **Marks.** `entry` and `door` (2 each), `service-shop` (2), `spot-counter-serve`,
  `spot-counter-stock`, `spot-home-cook`, `spot-home-sit`, `bed-parents`, `bed-child`,
  `door-gated-parents`, `door-gated-child` and `door-kitchen`. A check on the draft
  confirms every floor tile and every mark is reachable from the entry. The test that
  does this is a build task (below).
- **What differs from Stardew's Pierre's:** one rectangle; the counter 6 wide with no
  cash-register nook; three bands, not an irregular spread; the home has two
  bedrooms, a living area and a kitchen, with no exercise hall, sun room or shrine;
  the bedroom gate is our hearts rule.

## Template 2: the one-room hut

Draft: `hut-fisher.tmj`, `hut-fisher-preview.png`, `hut-fisher.txt`. Plan, 12 by 12:

```text
############
############
#.SSS..KK.B#
#.........B#
#.CCCC..LL.#
#..........#
#X......TT.#
#X......TT.#
#....rrr...#
#####..#####
    #..#
    #DD#
```

This is the template for the delta fisher, the Mountain forge hut, the hermit's
tower base, the Beach elf and the Outpost steward's rooms. One counter 4 wide, a
bed, a stove, a table, and one theme piece (here a fish tank, `L`; for the forge a
workstation `W`; for the elf's stall a display). The counter is reachable from four
tiles and the keeper's tile from both sides. It is bigger than Stardew's Fish Shop
(11 by 10, a counter and a home in one room) by one row so the counter and the
table have clear aisles.

## Template 3: the inn and kitchen

Draft: `inn.tmj`, `inn-preview.png`, `inn.txt`. Plan, 30 by 16:

```text
##############################
##############################
#..SSSSSSSSS..HH..#..KKKKKK..#
#............................#
#..CCCCCCCCC..........TTT....#
#..QQQQQQQ........#...TTT..BB#
#.................#........BB#
#.................############
#.QTTQ..QTTQ..QTTQ#..BB..BB..#
#....................BB..BB..#
#............................#
#.QTTQ..QTTQ......#..BB..BB..#
#.................#..BB..BB..#
########..####################
       #..#                   
       #DD#                   
```

The shape: the tap room (x 1 to 17) with a 9 wide bar along the back, 7 stools, a
hearth, and five tables with seats on open floor. The two service tiles at the bar's
right end and the keeper's aisle behind the bar are reachable from two sides. The
kitchen and the innkeeper's room (y 2 to 6) are east, through a 2 row gap behind the
bar. Below them, the guest room (y 8 to 12) holds the four pairs of guest beds that
note 77 asks for, with a 2 wide corridor down its west side, through a 2 row gap
from the tap room. The inn just fits the 30 by 17 view (30 by 16), so nothing scrolls. Its tap room fits the 8 player rule with every aisle 2 wide, like
the Saloon's open floor.

## The other interiors

Each uses one of the three shapes, with its own furniture. Sizes are outer, with the
door notch, and a proposal.

| Interior | Shape | Size | Counter or station | What is different |
| --- | --- | --- | --- | --- |
| `general-store` | shop at the front, living area, then the rooms behind | 25 by 26 | `shop` | The pilot. |
| `smithy` | shop west, workshop and home east | about 28 by 14 | `counter-smithy` | A forge and anvil in the east room, fixtures `W` and `H`. Blacksmith in Stardew is a 15 by 20 room with a small home above. |
| `sawmill` | shop and home | about 26 by 12 | `counter-sawmill` | A saw bench (`W`) and a timber rack in the shop. |
| `hatter` | shop and home | about 24 by 12 | `counter-hatter` | Hat stands (display `L`), a sewing table, the sibling's bed. |
| `library` | one big room and a reading nook | about 26 by 14 | `counter-library` | Shelves along three walls, a reading table, a 2 wide aisle between shelf blocks. Stardew's museum is 24 by 19 of shelf grid. |
| `healer` | patient room and the healer's flat | about 28 by 14 | `counter-healer` | Four patient beds in the patient room, a screen between each (a 1 tile `S`). Stardew's clinic is 23 by 20 and has three beds. |
| `inn` | tap room, kitchen and guest room | 30 by 16 | `counter-inn` | The pilot's third draft above. |
| `forest-farmstead` | shop and keeper's home | about 26 by 12 | the animal counter | Hay sacks and a young animal pen in the shop. |
| `fisher-hut`, `forge`, `beach-elf-house`, `hermit-tower`, `outpost-rooms` | hut | 12 by 12 (10 by 10 for the elf) | each its own | The hut template (above), with a theme piece each. |
| `burrow-gardener`, `burrow-retired`, `burrow-young` | small home | 12 by 11 | none | One bed (two for the retired couple's room), a table, a stove, a rug. Sebastian's room is 12 by 12. |
| `hall` | main room and rooms | 48 by 20 | the Long Table | Done: note 40, drawn from Stardew's restored hall. This note adds only the crowd rules. |
| `greenhouse`, `coop`, `barn` | animal and growing buildings | per note 58 | none | Not shop-and-home. Not changed here. |

## Tile list for the interior theme (note 81 decision 3)

The interior tileset is one image with a stable tile order. These are the fixture
kinds this note uses, appended to the existing list, never inserted: wall, floor,
rug, door, counter, shelf, bed, table, kitchen strip, crate or bin, workstation,
hearth, seat, display or tank. The draft swatches (`tiles.png`) use this order.
Final art waits for M3d (ADR 0012).

## Status per map (note 81 decision 7)

| Map | Layout done | Art done | Notes |
| --- | --- | --- | --- |
| `general-store` | Drafted, waits for the owner | No | The pilot |
| `fisher-hut` and the other huts | Template drafted, waits for the owner | No | One draft stands for five |
| `inn` | Drafted, waits for the owner | No | |
| `smithy`, `sawmill`, `hatter`, `library`, `healer`, `forest-farmstead` | Sizes and fixtures only; plans after the pilot is checked | No | |
| `burrow-*` | Sizes and fixtures only | No | |
| `hall` | Done, note 40 | No | Crowd rules only |

## Build work (no issues filed yet)

1. **The pilot map.** Rebuild `general-store.json` from the draft: 25 by 26, the
   `ground`, `collision` and `markers` layers, the 2 wide entry, the marks above, and
   the two gated bedroom doors (a `gate` property read from friendship, note 61).
   Change the Hearthwell lot's `from_general-store` entry name only if the notch
   moves. Tests: every floor tile and mark reachable from the entry; the counter
   has at least two player tiles; the contract checks in note 05 pass.
2. **A shared interior reachability test.** One test over every interior map:
   every mark is reachable from the entry, every counter has two player tiles, every
   public aisle is at least 2 wide.
3. **The huts and the inn**, after the owner checks the pilot.
4. **The rest** (smithy, sawmill, hatter, library, healer, farmstead, burrows) once a
   second round of plans is checked.
5. **Interior door 2 wide** across the 14 built shells (owner accepted, SC-145).

## Open

- Whether the gated bedroom needs a heart level other than 2 per person, and how a
  closed bedroom door looks (note 61 decision 6 says 2, as in Stardew).
- Other buildings' homes: the owner expects each to have its own layout, so the
  smithy, sawmill, hatter, healer and the rest need their own rooms (round 2).
- The widths and sizes are my sums from images at different scales, so the shop
  room's size is "about"; the owner can confirm in play.
- The looks (cut corners, walls, windows) wait for the art pass (note 15).
- Hat shop, healer and library plans are not drawn yet. Only sizes and fixtures.
