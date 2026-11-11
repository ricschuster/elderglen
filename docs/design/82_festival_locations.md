# 82. Festival locations and spots

Settled with the owner on 2026-11-11. This is step 2 of the layout track
(`docs/handoffs/PRIORITIES.md`, note 80 item 3, note 81). It supersedes the
note 66 addendum rule that every festival loads a decorated variant of the
Hearthwell south green: only the Harvest Showing is on the green now.

## Decisions (owner, 2026-11-11)

1. **Attendance: nearly everyone in town attends, with a few skipping
   (Stardew, from memory, unchecked).** Not the Night Market's fixed 18. Who
   skips each festival is still to design (see "To design").
2. **Only one festival is on the green.** The rest are spread over places that
   exist or are planned. Chosen: the "spread slate" below.
3. **Spots are exact tile positions** (the owner asked for this), written once
   each location's festival layout is drawn, not before. Locations first.
4. **Off-green positions for Frostday and Hollow Eve** are fixed positions,
   to be designed with their layouts.

5. **Residents (owner, 2026-11-11).** Each area resident attends the festival in
   or nearest their own area, plus the Harvest Showing: Dilly at the Seedswap
   Fair and Frostday (Forest), Thalwen and Rushie at Lamplight Evening (Beach),
   Rushie at Frostday too, and Korvi, Marl and Maren at the Showing and the
   Midwinter Feast. Rosmarin and Rundahl never come. Which exact festivals each
   resident gets is proposed here and still to be checked per festival.
6. **Nobody skips on purpose (Stardew, from memory, unchecked).** All town
   residents attend every festival. One exception: Hester goes home at 20:30 on
   every festival (bedtime, note 80).
7. **Spots run from opening to the end (Stardew, from memory).** A person
   stands at their spot for the festival's whole window, not a shorter one. The
   children leave early only at the Night Market (note 14).
8. **Fixed tiles, except the Hat Parade (owner).** Villagers stand on one tile
   per festival. At the Hat Parade they walk the parade route.
9. **Lamplight Evening is a dusk festival (owner).** Opens 17:00, closes 22:00,
   ends 23:00 (`festivals.json` still has the day hours: a build task).
10. **Frostday freezes the Forest lake (owner).** A frozen variant of the lake
    with marked ice holes; the player fishes only at the holes, from the existing
    fish list plus a festival catch. Villagers stand on the shore, a few at holes.
11. **The player walks there (owner).** No teleport from the farm. The invitation
    on the farm still says where and when, and the clock stands still on the
    festival map as built (note 66); the walk before it costs normal time. The
    way home still asks first. The note 66 built behaviour (the farm sign sends
    the player to the green or hedge) changes to a plain exit walk when the
    Hearthwell variants are built.

## Locations

| Festival | Date | Place | Notes |
| --- | --- | --- | --- |
| Hat Parade | Spring 10 | Hearthwell town square and middle street | A parade route along the street through the square |
| Seedswap Fair | Spring 21 | Forest clearing by the farmstead | Stardew's Flower Dance is in its forest (memory, unchecked) |
| Cake Day | Summer 8 | The inn and its lane | Hosted by the inn keeper's family |
| Lamplight Evening | Summer 24 | The Beach at dusk | Lanterns along the shore. The elf's cottage is there |
| Harvest Showing | Fall 9 | The festival green | The only festival on the green. Judge's table and prize counter are built |
| Hollow Eve | Fall 21 | The hedge map and its entrance plaza | Villagers at the plaza booth and at the scares |
| Frostday | Winter 8 | The Forest lake, frozen | Ice fishing. Stardew's ice festival is at a forest lake (memory, unchecked) |
| Midwinter Feast | Winter 25 | Inside the hall, at the Long Table once its main room is restored; the Hearthwell square before that | Owner, 2026-11-11. The hall fits all players with room to pass (note 81 decision 12). Stardew holds it in the town square (memory, unchecked) |

Midwinter Feast therefore needs two layouts (square and hall main room). Which
hall stage counts as restored is read from `40_hall_layout.md` when the layout
is drawn.

The Winter Night Market stays on the Hearthwell square (note 14), with its 18
spots already designed.

## What this changes

- The Hearthwell decorated variant (note 66 addendum, item 6) is now for the
  Showing, the Hat Parade and the Night Market. The others need festival
  layouts on their own maps (Forest, Beach, hall interior, inn lane).
- Players arrive from the farm to a place that may be a long walk. How the
  festival invitation sends them there, and where the eight player start spots
  stand on each, is part of each layout.
- Shop and home locking applies in Hearthwell; on the Forest and Beach there is
  nothing to lock.

## To design next (in this order)

1. Exact tiles: who stands where at each festival, once its layout is drawn.
2. The festival layout for each place, with a Tiled draft: props, the 8 player
   start spots, the prize counter or stalls, and the exact villager tiles.
3. The Frostday ice holes and the Hollow Eve positions.
4. Route data: a `festival` spot per person per festival (note 79 data shape),
   and `festivals.json` naming each festival's map.

Register: SC-127 added to note 54 (which place Stardew uses for each festival,
and who skips). Check by the saved Calendar page.

## Harvest Showing spots (drafted 2026-11-11, owner answered the setup)

Place: the built `green` map (36 by 22 tiles, `green.json`). Owner answers: zones
around the table row; Cuthbert hosts and the judge stays a separate unnamed figure;
the 8 player starts are a row inside the entrance; keep the three sights and add
props plus a second attraction, a cider and pie stall run by the inn family; each
area resident stands in a zone matching their trade (Stardew, from memory,
unchecked, SC-127). Everyone stands from 12:00 to the end at 22:00, except Hester
(home 20:30).

**Built (kept):** display table (16,8), judge (19,8), prize counter (23,8), sights
(9,9), (26,10), (12,16), entry (17,19), leave (17,20).

**New props:** bandstand x 16 to 20, y 4 to 6 (blocks); cider and pie stall at
(10,12) (blocks); two benches at (6,14) and (7,14); bunting is decoration only
and does not block.

**Player starts:** (13,18) to (20,18), eight tiles in a row above the entrance.

**Villager tiles (a draft for the owner to check; every tile is free ground):**

| Zone | Person | Tile |
| --- | --- | --- |
| Host | Cuthbert | (21,9) |
| Table | Odette, Dorrie, Alder, Tilda, Rufus, Cordelia | (14,10), (15,10), (16,10), (17,10), (18,10), (13,10) |
| Prize counter | Barnaby, Aldreth | (22,9), (24,9) |
| Cider stall | Hattie, Podge, Linnet, Pim | (10,11), (11,11), (9,11), (10,13) |
| Bandstand | Dunmar, Aurelle, Bramwell, Thistle | (15,7), (17,7), (19,7), (21,7) |
| Benches | Hester, Walter | (6,13), (7,13) |
| Children | Fitch, Wren, Toby | (20,15), (22,15), (21,17) |
| Visitors, by trade | Korvi, Marl, Maren, Dilly, Rushie, Thalwen | (26,7), (27,7), (30,12), (4,11), (4,17), (31,5) |

That is 28 people: the 22 town residents (with Aldreth) and the six area
residents who attend (decision 5). Open: the stall's stock and prices, the
unnamed judge's tile (the built one stays), and whether the owner wants any
person moved.

## Cake Day on the inn lane (drafted 2026-11-11, owner answered the setup)

Owner answers: the activity is a **cake table**. The player hands in one cooked
dish, everyone tastes it, and the dish's quality sets a small friendship gain
with all attendees, once a year (Stardew's Luau is the closest, from memory,
unchecked, SC-127; the numbers are open). Set up on the Hearthwell middle street
in front of the inn. Every halfling attendee wears a food costume, and the player
can wear one too, brought from home or bought at the festival. The inn is shut,
like every shop on festival days (note 79), with its family at the table. Day
hours (12:00 to 22:00).

Place: the Hearthwell map's festival variant, the middle street x 14 to 34,
y 60 to 64 (5 tall), the inn above at x 15 to 28, y 50 to 59 with its door at
(22,59) and the entry tile (22,60) kept clear.

**Props (new):** a cake table at x 16 to 29, y 62 (14 tiles, blocks); a costume
stall at (33,61) (blocks); two benches at (31,61) and (32,61). Bunting along
the inn's front and lantern strings, decoration only. Row y 64 stays open for
walking through.

**Player starts (8):** (20,64) to (27,64), in a row south of the table. The
hand-in spot is the south side of the table at (21,63) to (24,63), kept free.

**Costume stall:** sells one or two food costumes (name, price and art are open,
and the costume is a hat or outfit slot, note 10). Keeper Cordelia (hat-maker).
A costume brought from home is one the player already owns; the rule that a
costume must be worn at Cake Day to count for anything is not needed, it is
only for show and for the villagers' lines.

**Villager tiles (draft for the owner to check):** the 22 town residents with
Aldreth. No area resident attends (decision 5). Every halfling wears a food
costume, the elf Aurelle, the dwarf Dunmar and the courier Aldreth do not.

| Zone | Person | Tile |
| --- | --- | --- |
| Hosts behind the table | Hattie, Podge, Linnet, Thistle | (19,61), (21,61), (23,61), (25,61) |
| Head of the table | Cuthbert | (30,62) |
| Tasters at the table | Bramwell, Odette, Dorrie, Alder, Tilda, Rufus, Barnaby | (16,63), (17,63), (18,63), (19,63), (26,63), (27,63), (28,63) |
| Benches | Hester, Walter | (31,60), (32,60) |
| Costume stall | Cordelia | (33,60) |
| By the east end | Dunmar, Aurelle | (33,63), (34,63) |
| Visitor | Aldreth | (14,63) |
| Children, running | Fitch, Wren, Pim, Toby | (16,64), (18,64), (30,64), (32,64) |

Hester leaves at 20:30 (decision 6). Open: the friendship numbers for the cake
table, the costume items (names, prices, art, slot), whether Pim stands behind
the table with her parents (she is in the children's zone here), and the lines.
