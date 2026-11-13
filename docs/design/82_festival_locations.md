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
12. **Festival areas are shut before the festival opens (owner, 2026-11-11, a
    side point).** On a festival day the festival's place cannot be entered
    before its opening time, as in Stardew (saved Egg Festival page: entering
    the town before 9am says the event is still being set up). The exit shows
    that message and the player stays where they were. Opening times are the
    festival's own (12:00 for the day festivals, 17:00 for Lamplight). Applies to
    the Forest clearing, the Beach, the lake, the hedge and the Hearthwell
    festival areas. Open: whether a whole map is shut (the Forest, the delta) or
    only the festival zone, since the Forest and the delta are also roads to other
    places; the owner said "most" areas, so some stay open.

## Decided 2026-11-12 (owner)

- **A festival ends after its main event (Stardew, checked on the saved Festivals page).**
  The Seedswap hunt, the Frostday judging and the other main events end the festival, and
  the player goes back to the farm. This closes the "ends after the hunt or judging" open
  points for the Seedswap Fair and Frostday. The stalls do not stay open after the result.
- **Seedswap rival:** if the player fails the hunt, Linnet wins (Stardew uses Abigail,
  from memory, unchecked).
- **Hat Parade late join:** a player who arrives after the march has started joins at the
  tail. The villagers do one extra lap so nobody misses it. Cut-off 14:30 (owner,
  2026-11-12): a player arriving later does not join and only sees the march. Built:
  `PARADE_JOIN_CUTOFF` in `festivalroutes.ts`; `paradeLaps` gives one lap after it.
- **Hall restored (owner, 2026-11-12, built):** `hallRestored(hall)` in `bundles.ts` is
  derived, never saved: true when every bundle is done and the Last Seat is open and done.
  `FarmScene` passes it to `festivalHolds` and `festivalStepShut`, so the Midwinter Feast
  moves into the hall. `villagerNow` and `festivalWhere` take it as an option, but no
  scene calls them yet.

## Locations

| Festival | Date | Place | Notes |
| --- | --- | --- | --- |
| Hat Parade | Spring 10 | Hearthwell town square and middle street | A parade route along the street through the square |
| Seedswap Fair | Spring 21 | Forest clearing by the farmstead | Stardew's Flower Dance is in its forest (memory, unchecked). Spots drafted below |
| Cake Day | Summer 8 | The inn and its lane | Hosted by the inn keeper's family |
| Lamplight Evening | Summer 24 | The Beach at dusk | Lanterns along the shore. The elf's cottage is there. Spots drafted below |
| Harvest Showing | Fall 9 | The festival green | The only festival on the green. Judge's table and prize counter are built |
| Hollow Eve | Fall 21 | The hedge map and its entrance plaza | Villagers at the plaza booth and at the scares |
| Frostday | Winter 8 | The Forest lake, frozen | Ice fishing. Stardew's ice festival is at a forest lake (memory, unchecked). Spots drafted below |
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

Built status (2026-11-11): `festivals.json` has the new dates, the dusk hours for
Lamplight, the Night Market as a span (Winter 16 to 18, `lastDay`, `evening`), and a
`place` (map and tile zone) per festival, with the hall as a `placeUpgrade` for the
feast. `festivalAreaShut` (decision 12) is a pure helper, not yet wired to the exits;
it shuts only the festival zone (a placeholder for the open point). No maps,
activities or routes yet.

Wired (2026-11-11): `festivalStepShut` and `festivalShutLine` in core; `FarmScene`
blocks area exits whose entry lands in a shut zone and blocks walking onto shut
zone tiles on the same map (Hearthwell street), with a placeholder message. A
player already inside is never blocked. The hall is treated as not restored until
that is tracked. Not wired: the farm sign's direct trip to the green or hedge.

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

## Seedswap Fair in the Forest clearing (drafted 2026-11-11, owner answered the setup)

Date: Spring 21. Opens 12:00, closes 18:00, ends 22:00 (`festivals.json`). Stardew's
egg festival is Spring 13 (saved Egg Festival page), so ours is later on purpose,
after the first bundles (note 14).

Owner answers: the fair uses the **whole of grove G4's ground** on the Forest map
(trees around it are designed later); the mixed-seed counter stays; and there is
a **seed hunt** like Stardew's egg hunt: **50 seconds, find 9 hidden seed packets
to win** (Stardew, saved Egg Festival page: 50 seconds, 9 eggs for one player, 6
for two, 5 for three, 4 for four or more, else a villager rival wins). The prize is
**a rare seed packet each year, plus a hat the first time** (the crop and the hat
are open).

Place: `forest.json`, the clearing x 68 to 83, y 12 to 34 (16 by 23), east of the
lake path (x 65 to 67) and west of the farmstead (x 84 and up). The farmstead road
(y 35 to 37) runs along its south edge, so players arrive from the south. G4's
maples are not shown on the festival map and come back the next day.

**Props:** the seed stall x 74 to 77, y 16 (4 tiles, blocks, the built mixed-seed
counter); two benches at (70,18) and (71,18) (block). Bunting and a banner over the
entry at (75,34) are decoration only.

**Player starts (8):** (72,33) to (79,33), a row inside the south edge.

**The hunt:** talk to Cuthbert at (75,31) to start. Packets lie on free ground in
the clearing and are picked up by walking over them (tap-to-move: tap a packet).
There are 18 packet tiles in odd years and a different 18 in even years (Stardew
changes its egg spots by year parity). Year 1 is odd. Players may start at any
time up to 17:30 so the hunt always ends before the 18:00 closing.

| Year | Packet tiles |
| --- | --- |
| Odd | (71,14), (74,12), (78,13), (83,16), (69,16), (73,18), (78,18), (81,17), (75,21), (71,21), (80,21), (77,24), (74,26), (80,25), (70,29), (76,29), (81,31), (73,32) |
| Even | (70,13), (76,12), (82,14), (72,16), (79,16), (69,19), (75,19), (81,19), (73,22), (79,22), (71,25), (76,25), (81,27), (74,28), (79,29), (69,31), (72,30), (77,32) |

**Villager tiles (draft for the owner to check; every tile is free ground):** 23
people, the 22 town residents with Aldreth and Dilly (decision 5). The rest of the
area residents do not come (Korvi, Marl, Maren: Showing and Midwinter; Thalwen and
Rushie: Lamplight; Rosmarin and Rundahl never).

| Zone | Person | Tile |
| --- | --- | --- |
| Seed stall, behind it | Odette, Dorrie, Alder | (74,15), (75,15), (76,15) |
| Host | Cuthbert | (75,31) |
| West edge, inn family | Hattie, Podge, Linnet, Thistle | (69,20), (69,22), (69,24), (69,26) |
| East edge, trades | Tilda, Rufus, Cordelia, Barnaby, Bramwell | (82,20), (82,22), (82,24), (82,26), (82,28) |
| North edge | Aurelle, Dunmar | (80,13), (81,13) |
| Benches | Hester, Walter | (70,17), (71,17) |
| Visitors | Aldreth, Dilly | (79,32), (83,30) |
| Children | Toby, Fitch, Wren, Pim | (72,23), (72,27), (78,27), (78,23) |

Hester leaves at 20:30 (decision 6).

Open: the rival who wins if the player fails (proposed: Linnet, who runs; Stardew
uses Abigail), the rare packet and the hat, whether the festival ends after the
hunt as Stardew's does (it ends the day at once) or the stall stays open, how
many packets multiplayer needs (Stardew's counts are above), the stall's stock
beyond mixed seeds, and the forest trees around the clearing. Not built:
`festivals.json` still says the fair is on the green, with the day hours.

## Lamplight Evening on the Beach (drafted 2026-11-11, owner answered the setup)

Date: Summer 24. Opens 17:00, closes 22:00, ends 23:00 (decision 9). Owner
answers: the activity is **lantern floating**, and the 8 player starts are at the
footbridge side with the crowd along the south shore. Stardew's Moonlight Jellies
is watch-only (from memory, unchecked, SC-127), so ours adds the player's own
lantern.

Place: the `delta` map's Beach (sand x 66 to 85, y 20 to 52, the sea from y 52).
Players arrive by the footbridge (x 61 to 66, y 35 to 37) from the farm side, which
is also the walk from the farm (decision 11). The elf's house (x 78 to 84, y 23 to
27) and the tide pool footbridge (x 86 to 89, y 44 to 47) are untouched.

**Props (new):** a lantern stall x 72 to 74, y 44 (3 tiles, blocks); two driftwood
benches at (76,46) and (77,46) (block); a bonfire at (67,46) (blocks). String
lanterns on the pier (x 80 to 82, y 48 to 58) and lamp posts along the shore are
decoration only.

**Player starts (8):** (68,38) to (75,38), a row below the footbridge landing, which
stays clear.

**Lantern floating:** buy a paper lantern at the stall, then stand on the launch
line (the shore row y 51, x 68 to 79, 12 tiles, kept clear) and set it afloat. All
lanterns drift out together as the festival closes at 22:00. Once a year the
launch gives a small friendship gain with every attendee and a keepsake lantern for
the farm the first time. The price, the gain and the keepsake are open. Row y 50
stays open for walking along the shore.

**Villager tiles (draft for the owner to check; every tile is free ground):** 24
people, the 22 town residents with Aldreth plus Thalwen and Rushie (decision 5).
Dilly, Korvi, Marl, Maren, Rosmarin and Rundahl do not come.

| Zone | Person | Tile |
| --- | --- | --- |
| Lantern stall, behind it | Cordelia, Barnaby | (72,43), (73,43) |
| Host | Cuthbert | (74,47) |
| Shore row, inn family | Hattie, Podge, Linnet, Thistle | (68,49) to (71,49) |
| Shore row, store | Odette, Dorrie, Alder | (72,49), (73,49), (74,49) |
| Shore row, trades | Tilda, Rufus, Bramwell, Aurelle, Dunmar | (75,49) to (79,49) |
| Benches | Hester, Walter | (76,45), (77,45) |
| By the bonfire | Aldreth | (69,45) |
| Children | Fitch, Wren, Pim, Toby | (70,47), (72,47), (78,47), (79,46) |
| Beach residents | Thalwen, Rushie | (80,47), (81,50) |

Hester leaves at 20:30 (decision 6). Open: the lantern's price, art and keepsake,
the friendship numbers, the drifting animation, how the lanterns look at dusk on
the dark Beach (the dusk tint is the festival's, not built), and whether the
lantern stall keepers should be the hat-makers (they are the Cake Day costume
stall's too).

## Frostday on the frozen Forest lake (drafted 2026-11-11, owner answered the setup)

Date: Winter 8. Opens 12:00, closes 18:00, ends 22:00. Owner answers: the contest
is **Stardew's: catch 5 fish at the ice holes, else a villager wins** (saved Festival
of Ice page: 5 fish to win, Willy wins otherwise, judged by the mayor), and the
prize is **the Frostfin and a hat the first time**. The Frostfin is a festival fish
that bites only at the holes and counts towards the 5. Per decision 12 the lake is
shut before 12:00.

Place: `forest.json`, the lake x 34 to 64, y 12 to 34, frozen: the ice is
walkable. The farmstead road (y 35 to 37) is the south shore and the east shore
path is x 65 to 67. Players arrive from the south.

**Props (new):** twelve ice holes on the ice at x 42, 46, 50, 54 by y 22, 26, 30
(one tile each, cast into from an adjacent ice tile, no stand-on); a festival
counter at (58,36) and (59,36) (blocks, the built hat and furniture counter);
two benches at (40,37) and (41,37) (block); four snowmen on the east shore at
(66,18), (66,22), (66,26), (66,30) (block). Ice sculptures and bunting are
decoration only.

**Player starts (8):** (46,36) to (53,36), a row on the south shore.

**The contest:** the player fishes at any hole with the usual rod rules and the
Forest lake's fish plus the Frostfin. Talk to Cuthbert at (55,36) to be judged;
5 fish wins. Winning gives one Frostfin each year and a hat the first time. The
rival is Rushie, who stands at a hole and wins if the player has fewer than 5.
How many fish multiplayer needs, the Frostfin's price and bundle use, and the hat
are open.

**Villager tiles (draft for the owner to check; every tile is free ground):** 24
people, the 22 town residents with Aldreth, Rushie and Dilly (decision 5).

| Zone | Person | Tile |
| --- | --- | --- |
| Host | Cuthbert | (55,36) |
| Festival counter | Cordelia, Barnaby | (58,35), (59,35) |
| South shore, inn family | Hattie, Podge, Linnet, Thistle | (36,37) to (39,37) |
| Benches | Hester, Aldreth | (40,36), (41,36) |
| South shore, store and trades | Odette, Dorrie, Alder, Tilda, Rufus, Bramwell, Aurelle, Dunmar | (42,37) to (49,37), in that order |
| Children, on the ice | Fitch, Wren, Pim, Toby | (44,32), (47,32), (50,32), (53,32) |
| At the holes | Dilly, Walter, Rushie | (42,23), (54,23), (54,27) |

Hester leaves at 20:30 (decision 6). Open: the Frostfin (price, art, bundle use),
the hat, whether the festival ends after judging as Stardew's does, and whether
holes need a cast distance rule on a tablet (Stardew's holes are small and hard
to cast into).

## Hollow Eve in the hedge maze (drafted 2026-11-11, owner answered the setup)

Date: Fall 21. Opens 20:00, closes 23:30, ends 24:00 (`festivals.json`). Owner
answers: **everyone is in the maze, as in Stardew** (saved Spirit's Eve page: most
townspeople are in the haunted maze, frightened or confused; Pierre's booth stands
at the entrance; which tile each person stands on is not on the page, SC-137), and
**the children are kept out in odd years and go in with a talker in even years**
(saved page: Vincent is kept out in year 1 and goes in with Sam in year 2).

Place: `hedge.json`, 23 by 17 tiles, the odd-year maze at map x 4 to 22, y 1 to 15
(maze tile (mx,my) is map tile (mx+4,my+1)). The plaza is the strip x 1 to 3, y 1
to 15, joined to the maze by the opening at (4,2). The booth is at (3,4), the start
at (5,2), the chest at (21,14), the cart at (20,13) and the leave marker at (2,14),
all as built. No new areas are needed.

**The blocking problem.** The maze is one tile wide and has only 2 cycles, so a
villager standing in a corridor can wall off the way on. The tablet rule (no one
stuck) forbids it. Of its 127 tiles only 61 can be blocked without cutting off the
rest, and only 5 are dead ends. The owner chose everyone in the maze, so the draft
cuts **niches** into the outer hedge: one tile, opening onto a corridor tile that
is already on the outer ring. A niche is a dead end of length one, so it never
blocks and never joins two corridors. The long way round to the chest (45 tiles)
runs along the top row and the right column, so most niches are met in order on the
way. No two niches touch. The map grows by one hedge column on the east (23 to 24
tiles wide) so the east niches have a back wall. Owner accepted the niches on
2026-11-11.

**Props:** the plaza bonfire at (2,8) (blocks); a bench at (1,7) (blocks); the booth
and the lanterns as built. Hedge niches are cut at the 15 tiles below.

**Player starts (8):** (1,11), (2,11), (3,11), (1,12), (2,12), (3,12), (1,13), (3,13),
a block on the plaza below the bonfire. The path to the opening at (4,2) stays
clear (x 2 and the rows above y 9), and the leave marker (2,14) stays free.

**Villager tiles, odd years (draft for the owner to check):** the 22 town residents
with Aldreth. No area resident attends (Rosmarin and Rundahl never come, the rest
are at their own festivals).

| Zone | Person | Tile |
| --- | --- | --- |
| Gate, at the maze mouth | Cuthbert | (3,2) |
| Booth keeper | Odette | (2,4) |
| Bench by the fire | Hester | (1,7) |
| Children, round the fire | Fitch, Wren, Toby, Pim | (1,8), (3,8), (2,7), (2,9) |
| Top niches, inn family first | Hattie, Podge, Linnet, Thistle | (6,1), (10,1), (12,1), (16,1) |
| Top niches, store | Dorrie, Alder | (18,1), (20,1) |
| East niches | Tilda, Rufus, Cordelia, Barnaby | (22,3), (22,5), (22,9), (22,11) |
| Bottom niches | Bramwell, Walter, Aurelle | (20,15), (16,15), (8,15) |
| Dead ends | Dunmar, Aldreth | (11,14), (15,12) |

That is 7 on the plaza and 15 in the maze. The built sights stay: the three scares
at (11,4), (13,8) and (15,10), and the talker at (17,12). The villager in a niche
speaks one line when talked to from the corridor tile it faces. Hester leaves at
20:30 (decision 6), which is half an hour after opening, so the bench is empty for
most of the night.

**Even years.** The larger even-year maze is still not designed, so its niches and
the reward are open. The rule is the same: a niche per villager, never a corridor
tile. In even years one child goes in with a talker, as Stardew's Vincent with Sam
(proposal: Toby with Walter); the other three stay at the fire.

Open: the villager lines (one each, a draft per person with the voice sheets), the
booth's stock beyond the built three items, the even-year maze and its niches, the
reward chest items, whether Hester should be placed at all after 20:30, and whether
the gate needs Cuthbert (he only greets).

## Hat Parade on the Hearthwell street (drafted 2026-11-11, owner answered the setup)

Date: Spring 10. Opens 12:00, closes 18:00, ends 22:00 (`festivals.json`, the day
hours). Owner answers: the player **marches in the line** (a slow march, a hat worn,
nothing to win or fail); **all the villagers march from 14:00 to 15:00 and stand by
the square otherwise**. **The march is auto-play, like Stardew's Flower Dance
(owner, 2026-11-11):** a scripted scene that moves every marcher and the player along
fixed waypoints, so nothing can block or jam. Unlike the dance, the festival does
not end after it (saved Flower Dance page, SC-127).

Place: the Hearthwell map's festival variant. The square x 64 to 80, y 54 to 70
holds the crowd, and the middle street y 60 to 64 carries the march west to the
turn and back. The `hat-parade` entry in `festivals.json` already has the zone
x 14 to 80, y 54 to 70.

**The march.** Out and back, along the same street, because the owner wants the
crowd at the square before and after. At 14:00 the line forms at the square's west
mouth (64,61) and walks west along the **out lane y 61** to the turn at (48,61),
just west of the main bridge, crosses to the **back lane y 63** and walks east to
the square mouth (64,63) by 15:00. Rows y 60, 62 and 64 stay free for onlookers and
players, so a player is never on a lane. At 14:00 a player at the square joins the line
and the script walks them with the rest, with input off, so there is no pass-through
or wait rule and no jam on a tablet or between players. A player elsewhere when it
starts just sees the march go by. The line, from the head: Cuthbert, the four
children, then the other 17 in the same order as the table below. Placeholder
numbers: 48 tiles of walking in 60 game minutes is a slow march, to tune in play.

**The player's part.** Wear any hat (the Parade Ribbon is free the first time,
built). Be at the square's west mouth at 14:00; the script walks the player out to
the turn marker (48,62) and back, then returns control at the square, and Cuthbert at
(66,65) says his closing line. Once a year this gives **+20 friendship with each
villager who marched** (owner, 2026-11-11, a placeholder to tune in play; no hat-count
scaling). A player who skips it loses nothing, and the
counter works either way (the three hats at 300, 500 and 400g, as built).

**Props (new):** the hat counter at x 74 to 75, y 56 (2 tiles, blocks, the built
parade counter); a well at (72,57) (blocks); two benches at (77,58) and (78,58)
(block). Bunting along both sides of the street, a banner at the turn and ribbons on
the lamp posts are decoration only. The cart stop (66,58) stays.

**Player starts (8):** (2,62) to (5,62) and (2,63) to (5,63), a block just inside
the farm exit. The `from_farm` entry (3,61) stays clear. The player walks the 60
tiles from here to the square (decision 11), so the farm invitation says to leave
early.

**Standing tiles, 12:00 to 14:00 and 15:00 to 18:00 (draft for the owner to
check; every tile is free ground off the street):** the 22 town residents with
Aldreth. No area resident attends.

| Zone | Person | Tile |
| --- | --- | --- |
| Host, leads the march | Cuthbert | (66,65) |
| Hat counter | Cordelia, Barnaby | (74,55), (75,55) |
| North row, inn family | Hattie, Podge, Linnet, Thistle | (68,58) to (71,58) |
| North row, store | Odette, Dorrie, Alder | (73,58), (74,58), (75,58) |
| North edge, trades | Tilda, Rufus, Bramwell, Aurelle, Dunmar | (66,56) to (70,56) |
| Benches | Hester, Walter | (77,57), (78,57) |
| By the north wall | Aldreth | (79,56) |
| Children, south half | Fitch, Wren, Pim, Toby | (70,66), (72,66), (74,66), (76,66) |

The 17 marchers after the children are, in order: Hattie, Podge, Linnet, Thistle,
Odette, Dorrie, Alder, Tilda, Rufus, Bramwell, Aurelle, Dunmar, Cordelia, Barnaby,
Walter, Aldreth, Hester. Hester goes home at 20:30 (decision 6), long after the
march. The route data is a waypoint list per person (the note 79 data shape): stand
tile, then the out lane tiles, the turn, the back lane tiles, the stand tile.

Open: the exact march speed, whether a late player joins at the head or misses it,
the unnamed hats the villagers wear (the 28 in `hats.json` are the player's), the
lines, and whether the turn marker needs a sign. The well and bench tiles (72,57),
(77,58) and (78,58) need checking against the Hearthwell square when it is drawn.

## Built status (2026-11-12, #876)

Built, with tests (`tests/festivalroutes.test.ts`): the route layer and the layouts for
all festivals but the Night Market. All tiles, numbers and the layout tiles below are
placeholders to check in play.

- **Data:** `src/content/festival-spots.json` has, per festival (and `midwinter-feast@hall`),
  the 8 start tiles, one standing tile per person, `keepClear` tiles, and the extras: the
  Seedswap hunt (50 s, 9 to win, `lastStart` 17:30, the odd and even packet tiles), the 12
  Frostday holes, the Hollow Eve niches.
- **Core:** `src/core/festivalroutes.ts`: `festivalWhere` is the festival layer of the note 79
  route (nothing before opening or after the end, standing from opening to the end, Hester
  `home` at 20:30), `villagerNow` picks it before the normal route, `festivalHolds` names
  the map condition of today's layout. `RIVALS` (Seedswap: Linnet; Frostday: Rushie) and
  `ENDS_AFTER_MAIN_EVENT` (Seedswap, Frostday) hold the 2026-11-12 decisions as data and
  helpers. The activities themselves (hunt, judging, ice fishing, lantern floating, cake
  table) are not built, so nothing yet ends the festival after its event.
- **Hat Parade march:** a timed waypoint path per marcher (stand tile, mouth (64,61), out
  lane y 61, turn (48,61), back lane y 63, mouth (64,63), stand tile). Placeholder pace:
  1 game minute per tile while marching, 0.5 while walking to and from the line, 1 minute
  between marchers; the whole march runs from 14:00 to about 14:55. `paradeLaps(joinedAt)`:
  one lap, or a second lap when the player joins after 14:00, starting at the join minute
  or when the first lap ends, whichever is later. The player is slot 22, the tail. The
  scene does not walk the line yet.
- **Maps:** a festival layout is a set of conditional layers (`when` the hold, note 81 and 71)
  on the existing map, not a new map id: `festival-hat-parade`, `festival-cake-day` and
  `festival-midwinter-feast` on Hearthwell, `festival-seedswap-fair` and `festival-frostday`
  on the Forest, `festival-lamplight-evening` on the Beach (delta), and
  `festival-midwinter-feast-hall` on the hall. Each adds blocking props, services (hat
  counter, seed stall, costume stall, lantern stall, cake table, festival counter), the
  8 `<id>_start_N` entries, and moves any tree, forage, rock or weed on a festival tile
  into a `quiet-` layer shown `unless` the hold (the whole clearing for the Seedswap). The
  Frostday ice is a `ground-` layer that makes the lake walkable, the lake's block moving
  to a `collision-lake-` layer shown `unless` the hold; the holes stay water and blocked,
  and are `ice-hole-N` regions. The green gets the Showing props and starts directly, and
  the hedge map grows to 24 wide, with 13 niches cut and the starts added
  (`festivals.json` zone width 24). `FarmScene` adds today's hold to the map holds.
  `FarmScene` still sends the player by the farm sign for the green and hedge; the plain
  walk (decision 11) is not wired.
- **Changes to the drafts above:** the Hollow Eve note names 15 niche tiles but lists 13
  (6 top, 4 east, 3 bottom), so 13 are cut, the other two people stand at dead ends.
  Aldreth moved from (15,12), a pocket cut off behind the scare at (15,10), to the dead
  end (17,13). Hester sits on the bench tile (1,7) (a `seated` entry in the data). The
  Beach and Forest festival maps hide decorations only on the tiles they use; the sim
  test seed moved from 2 to 3 because moving objects reorders forage spots.
- **Activities built as rules (2026-11-12, tests `tests/festivalactivities.test.ts`):**
  `src/core/seedhunt.ts` (packet set by year parity, start window from opening to
  `lastStart` 17:30, 50 s clock, pick up by tile, 9 wins, timeout loses and the rival
  Linnet wins, `finishHunt` ends the festival at its end time through `leaveFestival`
  for festivals in `ENDS_AFTER_MAIN_EVENT`). `src/core/cakeday.ts` and
  `src/content/cake-day.json` (hand in one cooked dish, once a year, every attendee gains
  points by the dish quality; the points 20, 30, 40 are placeholders, the numbers are
  still open). `Friendship.award` is the new way to give points outside gifting. No scene
  hook yet: the hunt needs a timer and a Cuthbert dialogue, the table needs a dish picker.
- **Not built (open or blocked):** the scene UI for the hunt and the cake table; the hunt
  prize (rare packet and hat, both open); multiplayer packet counts; the even-year maze and its niches; Hollow Eve niche
  lines; who walks the villagers between standing tiles (scene); the hall-restored state
  (the feast always uses the square until it is tracked); Frostday
  activities; the cake table scene, lantern floating and costume stall behaviour; the shut zone
  for the Frostday south shore (the zone stays the lake, since the shore is the Forest road).
