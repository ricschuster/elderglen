# 33 Build order (draft)

Status: draft. Decided with the owner on 2026-10-31. This note turns the
designed systems (notes 16 to 32) into an order of build slices. It replaces
the "M3 is one slice" idea in `13_m3_scope.md` and `26_seasons.md`. Nothing here
is built. Where it differs from those two notes, this one wins.

Update 2026-11-08 (ADR 0012): slices 2, 3 and the rest of 4 are milestone M3b,
slice 5 is part of M3c, and multiplayer (M4) follows M3b. The table is in
`03_milestones.md`.

## Why

Design has run well ahead of the build. M2 is built, and notes 16 to 32 settle
fishing, mines, animals, machines, cooking, four seasons, farm growth and more.
M3 was written on 2026-10-27 as a small slice (bundle hints, one festival, hats
and furniture) and then grew to hold four seasons and every system after it.
The roadmap warns that a slice feels nearly done at about 20 percent of the
work (`03_milestones.md`). So the work needs slicing, with each slice playable
on its own.

## Decisions (2026-10-31)

1. **One hall room per slice.** The village hall is the spine of the game
   (`16_bundles.md`). Each slice builds the systems a room needs and finishes
   that room, so every slice ends with something to hand in and a reward to
   use. This replaces building one system whole and wiring bundles at the end.
2. **The first slice is year one**, as in Stardew: all four seasons, 112 days,
   with farming, foraging and the hall's new format. The finish line of slice 1
   is playing from spring day 1 to the end of winter. This is the owner's
   choice over a two season first slice. It means fall and winter are in slice
   1, not later.
3. **Later slices add systems, not seasons.** Each adds a way to spend the
   year (fishing, mines, animals) and so fills the winter that slice 1 leaves
   thin.
4. **Design before build still holds.** Each slice lists the design notes it
   waits on. A slice does not start until they exist.

## Before slice 1: the M2 house work

Decided 2026-10-31. M2 still holds house tier 1 (`41_house.md`): the interior
map for tier 1 (#280, one map per tier, no sealed earth), then the carpenter and the 10,000g
upgrade (#281). It is M2 work, so it comes before slice 1 and does not wait on
any slice 1 system. The new kitchen has nothing to cook with until slice 4, so
it reads as waiting until then. The furniture catalogue waits on this tier
(`10_customisation.md`), so the furniture in slice 1 build 8 can start with
random carpenter stock and add the catalogue once tier 1 exists.

## The slices

### Slice 1: year one on the farm

Rooms finished: the Foragers' Shelf. The Larder's bundles 7 to 10 and 12 can be
filled. Its room reward, the greenhouse, is built (#602, 2026-11-08) and opens when the Larder room is complete.
Bundle 19 of the Hearth can also be filled, but the room's reward waits for
slice 4.

Builds:

1. Bundle data model and the hall rooms screen: rooms, N-of-M rules, hints and
   the soft gate (#179, #180). First, since it is the `next-payoff` item and
   everything else hands goods in through it.
2. The shipping bin (`28_shipping_bin.md`).
3. Weeds, then sprinklers and fertilizer (built 2026-11-07, with the minimal crafting screen from note 34), with Fiber and Sap as items
   (`29_weeds.md`, `31_farm_growth.md`).
4. Fall and winter: crops, forage, nightfall, weather, snow and thunderstorms
   (`26_seasons.md`, #61).
5. Fruit trees and the farm cave (`31_farm_growth.md`). Fruit trees built 2026-11-07; the cave was built 2026-11-07 (#498). The greenhouse
   is the Larder reward and was built 2026-11-08 (#602).
6. The mines, first part (built 2026-11-07, with the Smith's bundle added the same day, except crafted furnaces, see `22_mines.md`; decided 2026-10-31, as in Stardew): floors 1 to 10 with
   no creatures, the lift, copper, the opening day on spring day 5, the smith
   dwarf's ore shop and the furnace gift (mines build slices 1 and 2 in
   `22_mines.md`). This is the bar supply that sprinklers, the keg and the bee
   house need. Iron and gold ore come from her shop until slice 3 adds deeper
   floors.
7. (Built 2026-11-07. The bundle data and the machine bundle sources followed
   the same day, see note 35.) The crafting list and the machines the farm alone can feed: seed maker,
   charcoal kiln, preserves jar, keg, bee house (`24_processing_and_cooking.md`,
   `34_crafting.md`).
8. The hat parade, hats and a first set of furniture, with a festival per
   season as content once the first works (`13_m3_scope.md`, `14`). Hats, the
   wardrobe and the four spring and summer festivals are built (2026-11-07);
   furniture is built (ten pieces, the carpenter's daily stock, placed in the
   house); the catalogue, wallpaper and floors are not.
9. Farm types: Standard and Woodland (`32_farm_types.md`). Built 2026-11-07.

Bundles that can be filled: 1 to 10, 12 and 19 (Smith's, from smelted bars).
Bundle 12's pool avoids keg goods, since its reward is the keg
(`35_bundle_pools.md`). Bundle 11 waits for animals. Bundle 20 moves to slice 4,
since oil needs the oil maker (decided 2026-10-31).

Design still needed first: the numbers for the fall and winter crop and forage
lists (#61, names in `35_bundle_pools.md`), and the Fiber and Sap items
(`36_gathering_trees_sap_fiber.md`; common trees still need a place on the
maps).

Winter is thin in this slice: forage, machines and a festival carry it. The
greenhouse is not there until slice 4. That is accepted, since slices 2 to 4 fill it.

Cuts, in this order, if the slice runs long: farm types beyond Standard, the
farm cave, fruit trees, furniture count, extra festivals, and last the mine
scene (fall back to the ore shop and furnace alone, with the rockfall staying
until slice 3).

### Slice 2: fishing and the Water room

Rooms finished: the Water room (bundles 13 to 18), and its reward, the lake
cove.

Builds the four fishing slices in `21_fishing.md`: the bar and one water, the
roster and the skill, bait, lures and conditions, then pots, the cove and the
legend.

Bundle 16 (Night Fishing) gives a glow ring, which needs the equipment slot (see
slice 3). It gives a placeholder reward until then.

Design still needed first: nothing blocks. The water plants, trash items and the
recycler's odds (`21_fishing.md`) are numbers and can be settled in the slice.

### Slice 3: the mines proper

Rooms finished: none. Bundle 19 is already fillable from slice 1. Bundle 20
needs oil, so it waits for the oil maker in slice 4. Bundle 21, Weaver's, needs cloth, which needs wool and so animals. The Hearth
room reward, the carts, therefore arrives in slice 4.

Builds the rest of the mines from `22_mines.md`, from build slice 3: health,
starter weapons, the trainer, the first creatures, then the deeper bands, the
other creatures, the combat skill and the rest camps. Dangerous mode and the
special floors are unscheduled until this slice is played.

Also here: the lightning rod, battery packs and lamp-posts. The rod needs bat
wing from the Cave Bat (`34_crafting.md`). Storms themselves stay in slice 1.

Design: **the equipment slot** for rings and boots is settled in
`37_equipment.md`. Its combat stats (Defense, Immunity, crit and the rest) widen
the first combat build, so check that note's open list before slice 3 starts.

### Slice 4: animals, cooking and friendship

Rooms finished: the rest of the Larder (bundle 11, and with it the greenhouse),
the Hearth (bundles 20 and 21) and the Guests' Board (bundles 22 to 26).

Builds: the coop and barn and the care loop (`23_animals.md`), the machines
that animals feed (cheese press, loom, mayonnaise machine), cooking and the
kitchen, the dye vat, and friendship with gifts and the recipe mail
(`24_processing_and_cooking.md`).

Also here: house tiers 2 and 3 (#286), since the spouse room and nursery have
nothing to hold until friendship exists. The cellar (#282) waits for casks,
which are unscheduled (`24_processing_and_cooking.md`).

Friendship and gift mechanics are settled in `61_friendship_and_gifts.md`
(2026-11-06). Still needed first: each person's own tastes and the universal
love list, the birthdays and the heart events. The bundle pools for 22 to 26 are drafted in `63_bundle_pools_part_two.md`. Still open: the inn kitchen's stock.

### Slice 5: the Last Seat

Rooms finished: the Last Seat (bundles 27 to 30). It asks for goods from every
other room, so it can only be played after slices 1 to 4.

Builds: the four bundles, the bridge, the letter and the end of the first ring.
It also settles the quantities (#181) against real production rates.

Design still needed first: the Last Seat numbers. Year one's last day does not
end the game (see Open).

Ring 2 is M5 (`03_milestones.md`) and not part of these slices.

## What each slice leaves unbuilt

| Slice | Left for later |
| --- | --- |
| 1 | Animals, fishing, creatures and combat, cooking, a kitchen |
| 2 | Combat, animals, cooking |
| 3 | Animals, cooking, the deepest mines |
| 4 | The deepest mines, the cask, a second year of content |
| 5 | Ring 2 and the regions |

## Changes this makes to other notes

- `03_milestones.md`: M3 becomes "Vertical slice, slices 1 to 5", with slice 1
  the first target.
- `13_m3_scope.md`: its list becomes part of slice 1. Its cuts stay.
- `26_seasons.md`: "Fall and winter are built in M3" now reads "in slice 1".
- Handoffs and issues refer to slices by number from now on.

## Time box

Set a time box when slice 1 starts, as the roadmap asks. Its first item, the
bundle data model, is the check: if it takes much longer than a session or two,
slice 1 is too big and the cuts above apply. Keep a short log of real time per
item.

## Open

- **Does year one end the game?** Settled 2026-10-31: no, and there is no
  year-end screen. Winter 28 rolls into spring of year 2, as in Stardew (from
  memory, not checked on a saved page). The end screen still comes only from
  finishing the Last Seat, so a player who has not finished plays on. Slice 1
  therefore needs no year-end report or ending, only the calendar rolling over
  into year 2.
- Whether slice 1 is too large with four seasons. The first item is the check.
- Where the completion tracker (#196) and the mines' later bands sit. Both are
  unscheduled until slice 3 is played.
- The order of the four design notes still needed (the crafting list, the
  equipment slot, friendship and gift tastes, bundle pools), set by which slice
  starts next.
