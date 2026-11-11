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
| Midwinter Feast | Winter 25 | Inside the hall, at the Long Table once all six rooms are restored; the Hearthwell square before that | Owner, 2026-11-11. The hall fits all players with room to pass (note 81 decision 12). Stardew holds it in the town square (memory, unchecked) |

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

## Midwinter Feast in the hall (drafted 2026-11-11, owner answered the setup)

Owner answers: the feast is held in the hall only when **all six rooms are
restored** (Stardew, from memory, unchecked: its festivals stay in town whatever
the community center state). Until then it is on the Hearthwell square, so for
most of a first game the square version is the one players see. The square
layout is still to design. One long table runs east to west down the middle; the
gift exchange is at the villager's seat; households sit together, children at the
west end, residents at the east end.

Place: `hall.json`, 48 by 20 tiles, main room x 16 to 31, y 6 to 16, entrance
(23,18), plaque (20,5), the corridor row y 10 to 11 runs the full width.

**Props:** the long table at x 18 to 29, y 11 (12 tiles, blocks). Bunting and
candles are decoration. The hall scroll and reward objects stay as built.

**Player starts (8):** (20,15) to (27,15), in a row below the table, in view of
the entrance. Row y 13 stays open so players can walk round either side.

**The exchange:** the steward's letter on Winter 18 names the recipient (note
14, note 61). On the day a lit lantern hangs over their seat. Talk to them and
give a gift with the usual gift rules; the host (Cuthbert, head of the table at
(30,11)) then hands the player the return gift. Seats are fixed, so the lantern
is the only hint needed.

**Villager tiles (draft for the owner to check):** 25 people, the 22 town
residents with Aldreth, plus Korvi, Marl and Maren (decision 5).

| Zone | Person | Tile |
| --- | --- | --- |
| Head | Cuthbert | (30,11) |
| West end, children | Fitch, Wren, Pim, Toby | (18,10), (19,10), (18,12), (19,12) |
| North side | Odette, Dorrie, Tilda, Rufus, Cordelia, Barnaby, Linnet, Thistle, Dunmar, Aurelle | (20,10) to (29,10), in that order |
| South side | Hattie, Podge, Hester, Walter, Alder, Bramwell | (20,12) to (25,12), in that order |
| East end, residents | Korvi, Marl, Maren | (27,12), (28,12), (29,12) |
| Standing at the hearth | Aldreth | (22,7) |

One south seat (26,12) is left empty. Households sit side by side (the inn,
store, carpenter and retired couples, the hat-makers) and each child is on the
west end next to their own side. Hester leaves at 20:30 (decision 6).

Open: the long table's art, the candle and lantern props, the return gifts
(a short list per year, note 61), and the square version.

## Midwinter Feast on the square (drafted 2026-11-11, owner answered the setup)

The version most players see, until all six hall rooms are restored. Owner
answers: a long table across the middle with lanterns, the well and benches kept
as they are, the same shape and exchange as the hall version; hours stay the day
hours (open 12:00, close 18:00, end 22:00, shops shut); no food, the gift
exchange only.

Place: the Hearthwell map's festival variant, the square x 64 to 80, y 54 to 70,
north of the middle street (y 60 to 64, kept clear). Door and shop locking as the
other day festivals.

**Props:** a long table at x 66 to 77, y 56 (12 tiles, blocks); lantern posts
at both ends; a bonfire at (72,53) on the north edge; the cart stop (66,58), the
well and benches stay. Bunting and lanterns do not block.

**Player starts (8):** (68,59) to (75,59), in a row south of the table, clear of
the road.

**The exchange:** as the hall version: a lit lantern over the recipient's seat,
give a gift there, Cuthbert at the head hands over the return gift.

**Villager tiles (draft for the owner to check):** the same 25 people as the hall
version, 24 seats, each person seated, so Aldreth sits too.

| Zone | Person | Tile |
| --- | --- | --- |
| Head | Cuthbert | (78,56) |
| West end, children | Fitch, Wren, Pim, Toby | (66,55), (67,55), (66,57), (67,57) |
| North side | Odette, Dorrie, Tilda, Rufus, Cordelia, Barnaby, Linnet, Thistle, Dunmar, Aurelle | (68,55) to (77,55), in that order |
| South side | Hattie, Podge, Hester, Walter, Alder, Bramwell, Aldreth, Korvi, Marl, Maren | (68,57) to (77,57), in that order |

Hester leaves at 20:30 (decision 6). Open: the well and bench tiles (the square
has none placed yet, the shell has only the town-square region and the cart stop),
and whether Cuthbert's head seat on the east edge crowds the square's east wall
(x 80) when the map is drawn.
