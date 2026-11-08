# 41 The player's house: a burrow home that grows inward

Status: decided with the owner on 2026-10-31 (style, growth rule, scope, spouse
room, cellar). Details
marked "proposed" are mine and open to change. Per ADR 0002 this follows the
idea of Stardew's farmhouse, not its art, text or names. Per ADR 0003 the look
is our own and takes nothing from Tolkien's works.

## Why

The house is where the player sleeps, cooks, stores things and, later, decorates
and shares a home. `10_customisation.md` says "larger house in steps, paid in
coin and materials" and `12_marriage.md` needs a spare room for children, but
the upgrade list was still open. The owner also wanted the house to feel like a
cozy hobbit home. This note settles both.

## What Stardew does (checked, saved `Farmhouse` page, 2026-10-31)

- Start: one small room, inner size 10 by 7, with a bed, fireplace and TV.
  Floor, wallpaper and furniture can all be changed.
- Upgrade 1 (10,000g and 450 wood): a kitchen with a fridge and a sink, and a
  bedroom with a double bed. Allows marriage.
- Upgrade 2 (65,000g and 100 hardwood): two more rooms (one empty, one with a
  crib and two child beds), and a larger kitchen and bedroom. Unlocks
  renovations.
- Upgrade 3 (100,000g): a cellar with casks, reached from the kitchen.
- Each upgrade takes the carpenter three days. A spouse or roommate gets an
  extra room in their own style.
- Renovations (open bedroom, attic, cubby, dining room and more, 10,000g to
  150,000g) come after upgrade 2.
- The outer footprint is a 9 by 5 rectangle. The outside art does change by
  tier (owner screenshots and the three outdoor images on the page, SC-08): a
  bigger roof and siding at tier 2, a stone foundation and porch at tier 3, all
  within the same footprint.

## Decisions (2026-10-31)

1. **The player's home is a burrow house**, dug into a hillside on the farm: a
   round door, a mound roof with a chimney, small round windows. This lifts the
   "no hillside burrows" line in `09_story_and_lore.md` for the player's home
   only. The other hobbit specifics stay avoided (hairy feet, pipe-weed, second
   breakfast), and so do all Tolkien names and anything copied from the books
   and films (no "Bag End", no green round door). Our own door
   colour and a hat peg by the door make it ours.
2. **Three paid tiers add rooms.** Like Stardew's three upgrades, each paid in
   coin and materials. More rooms mean more space to decorate
   (`10_customisation.md`).
3. **The building footprint never changes.** An upgrade changes the inside and
   the art, not the tiles the building covers on the farm map. This is the
   owner's rule for every building, not only the house: coop, barn and the rest
   (`23_animals.md`) keep one footprint across their tiers. It keeps map
   placement, collision and save data simple. A burrow suits it, since the
   rooms grow into the hill, not outward.
4. **Every Brimmer home is a burrow**, not only the player's. The lore note
   says so.
5. **The spouse gets a room of their own**, as in Stardew, from tier 2.
6. **The cellar is in, on a separate level** reached by stairs down from the
   kitchen, as in Stardew. It is its own small map.
7. **Tier 1 is in the first playable** (`03_milestones.md`). Tiers 2 and 3 and
   the cellar are M3 (split 2026-10-31, owner's choice: the first upgrade is
   what the Furniture Catalogue waits on, and two seasons cannot reach the
   later prices). The first playable has no marriage, no children and no cask,
   so the spouse room, the nursery and the cellar casks arrive empty or
   unused. Marriage and the cask stay out of the first
   playable.

## Proposed details

- **Tier contents follow Stardew's**:
  - Start: one room with a bed, hearth and a door mat (11 by 10, see
    "Floor plans per tier").
  - Tier 1: a kitchen (cooking, a fridge chest, a sink that refills the
    watering can) and a bedroom with a double bed. Allows marriage
    (`12_marriage.md`).
  - Tier 2: a spare room and a nursery with a crib, which is the "spare room"
    that `12_marriage.md` needs for children, and larger kitchen and bedroom.
  - Tier 3: a cellar for casks, reached from the kitchen, if casks are in
    (`24_processing_and_cooking.md`).
- **Numbers start at Stardew's**: 10,000g and 450 wood, 65,000g and 100
  hardwood, 100,000g, three days each. They are placeholders for
  `07_tuning_numbers.md`, and 65,000g and 100,000g may be too steep for two
  seasons. Check against the playtest income.
- **Superseded 2026-11-07 by `68_growing_interiors.md`:** one growing map holding
  every tier, not a map per tier. The paragraph below and the floor plans keep
  the room shapes and sizes, which still hold.
- **One interior map per tier, no sealed earth (owner, 2026-11-06).** This
  replaces the sealed earth plan. The start, tier 1 and tier 2 each have their
  own Tiled map. Tier 3 only adds the cellar stairs, so it reuses the tier 2
  map. The player's position is not saved (the scene starts at the map's
  entry), so a tier change needs no migration: the house scene loads the new
  map at its door. The cellar stays a separate small map. Floor plans are in
  "Floor plans per tier".
- **No renovations** in the first version. See "Renovations (reference)".
- **The carpenter builds it**, as in Stardew. The first draft said the door is
  closed with scaffold for three days. The owner changed that on 2026-10-31:
  see "Carpenter and the upgrade flow" below.

## Settled 2026-10-31 (open items)

- **Interior maps.** Superseded 2026-11-06: one map per tier, no sealed
  earth (see "Proposed details"). The cellar stays a separate small map reached
  by stairs. Stardew: the Farmhouse page shows one connected space that grows,
  but does not say how it is stored, so that part is not checked.
- **Prices stay at Stardew's** for the first playable: 10,000g and 450 wood,
  65,000g and 100 hardwood, 100,000g, three days each. Tiers 2 and 3 will
  probably be out of reach in two seasons, so they act as long-term goals.
  Tune after a playtest (`07_tuning_numbers.md`).
- **The furniture catalogue follows Stardew: after tier 1.** The saved
  Furniture and Carpenter's Shop pages say the carpenter sells the Furniture
  Catalogue only after the first house upgrade (200,000g there). This matches
  `10_customisation.md`. The first draft of this answer said the catalogue was
  not tied to a tier, which was wrong. The owner picked the Stardew option, so
  the Stardew behaviour stands. Furniture itself can be added at any time.
  Flooring and wallpaper can come from a shop or a catalogue.
- **Empty rooms read as waiting.** The spouse room and the nursery are open,
  bare and tidy, with a short line from Old Greencoat or the carpenter that
  they are for later. They are not shown as broken or blocked, which matches
  the hall's greyed rooms.

## Floor plans per tier (settled 2026-11-06)

Owner's choice: one full map per tier, and our sizes follow Stardew's measured
sizes. The owner saved Stardew
images of every tier, the cellar and the renovations (reference only, in the
gitignored `docs/reference/stardew/farmhouse/`). Sizes below are rough: each
image has its own scale, so the tile size came from the furniture (the TV and
table are 2 tiles wide, the double bed 3 and a cask 1). Give or take 1 to 2
tiles. Width by depth, outer size including walls.

| Map | Size (width by depth) |
| --- | --- |
| Start | 11 by 10 |
| Tier 1 | about 31 by 12 |
| Tier 2 | about 34 by 22 |
| Tier 3 | same as tier 2, plus cellar stairs |
| Cellar | about 19 by 16 |

Built in #421 (replacing the map per tier of #422): `house.json` is one 31 by
12 map holding the start room (11 by 10, at tile 9, 2) and the tier 1 rooms in
`-t1` layers (note 68). It is a hand-authored placeholder; the generator no
longer writes it. `houseVisibleTier(tier)` picks the layers, tiers 2 and 3 show
tier 1 until their layers exist, and a tier change while the player is inside
(only the debug menu can do it) reloads the scene at the house door. In tier 1
the double bed in the bedroom is the bed that saves the day, and the start
room's bed tile becomes plain floor. The sizes may still move by a tile or two.

Shapes, from the images:

- **Start:** one room. Bed lower right, hearth and TV on the back wall, door
  notch bottom left. The TV gives tomorrow's
  forecast, the same rule as the Outpost board (`57_the_outpost.md`, SC-33).
- **Tier 1:** the start room keeps its place in the middle. A kitchen (checkered
  floor, counter, fridge, sink) is added on its left. A bedroom with the double
  bed is added on its right, joined by a one tile passage with a step. Sizes:
  kitchen about 9 wide, start room 11, passage 1, bedroom about 10, about 12
  deep. The start
  room's door moves with it, so each map has its own door tile.
- **Tier 2:** the tier 1 floor stays. An upper band is added, reached by stairs
  above the kitchen end: an empty spare room on the left and the nursery (crib
  and two child beds) on the right, joined to each other. Two bands: the
  lower one as tier 1 (about 12 deep) and an upper one about 9 deep.
- **Tier 3:** a stairs notch on the bottom wall under the kitchen leads down to
  the cellar. The upstairs and the rest do not change. This matches the images:
  the cellar stairs appear only after tier 2.
- **Cellar:** its own map, stone floor, stairs up in a corner, rows of cask
  spaces (Stardew has 33, in 3 rows of 11). Our cask count waits on note 24, since the cask is not in
  the first version.

The first playable keeps only the start map and tier 1 (decision 7). The old
sealed earth plan, 18 by 8 with a kitchen 4 wide, is dropped.

## Renovations (reference)

Stardew's renovations unlock after upgrade 2 and the saved Farmhouse page lists
10,000g to 150,000g. The owner saved images of eight, all taken on a tier 3
house: open bedroom, southern room, corner room, expanded corner room, attic,
cubby, dining room and open dining room. Individual prices and requirements are
not checked. They are out of the first version, and they stack, so with one map
per tier they would multiply the maps. If they come, they should be layers
added to a tier map, not a map each. That needs its own design note.

## Carpenter and the upgrade flow (decided 2026-10-31)

Owner's choices: the carpenter has a **shop map** the player walks into, as in
Stardew, and **the house stays open** during the build, with the carpenter
shown hammering outside. Stardew facts come from the saved Carpenter's Shop and
Farmhouse pages. Those pages do not say whether the farmhouse can be entered
or slept in during an upgrade, so that part of Stardew is not checked. The
rest is mine and open to change.

- **The shop is a small sawmill interior map.** Decided: a map the player
  walks into. Hearthwell does not exist yet, and the layout note puts the
  sawmill there (`19_valley_layout.md`). Proposed: until Hearthwell is built,
  a placeholder sawmill building stands on the farm map with a door to the
  shop map, and it moves to the Hearthwell river when that map exists. The
  shop map is its own file, so the move changes only the exit.
- **Buying (as Stardew).** The carpenter at the counter lists the next upgrade
  with its coin and wood price (10,000g and 450 wood, placeholders). It needs
  both: coin from the wallet and wood from the pack, and shows which is
  missing. Stardew also sells the wood itself, for 4,500g in year 1 and 22,500g
  in year 2 or later. Decided 2026-11-03: yes, ours sells wood at those prices
  (placeholders), since the farm starts dense with trees (note 43). Chopping
  stays cheaper, and the sale gives coin a second use.
- **Timing (as Stardew, by analogy).** The Carpenter's Shop page says work
  begins the day after the order and most builds are ready at the start of the
  second day after the order. The house takes three days (Farmhouse page), so
  pay on day D, work on days D+1 and D+2, and the new rooms open on the
  morning of day D+3. This replaces #281's "two mornings later", which did not
  match three days. Stardew's carpenter does not work on festival days, so a
  festival day does not count. One upgrade can be ordered at a time.
- **While it builds.** The house is open as usual: the player can enter and
  sleep in the start room. The new rooms do not exist until the
  work is done. The carpenter stands outside the house hammering, with scaffold against the
  outside wall. The scaffold fits inside the house's footprint on the farm map
  (decision 3). The shop counter is closed with a short "out at your farm"
  line until the work is done, as Stardew's Robin cannot be reached for
  dialogue while she works.
- **Done.** On the morning of day D+3 the tier goes up by one, the scaffold and
  the carpenter leave, and a short message says the work is finished.
- **Saved as** an optional pending order (target tier and days left), so a save
  mid-build resumes. Old saves have none.
- Placeholder art: the carpenter is a plain sprite and the scaffold is
  rectangles, until #58 and the art pass.

## Open

- Exact tile sizes: the Stardew sizes are rough, from screenshots, so the map
  work may adjust them. The cask count in the cellar.
- The sawmill interior map layout, and the carpenter's hours (Stardew's
  shop closes some days; not decided).
- Where the catalogue is sold and what it costs (`10_customisation.md`).
- The house build is in the tracker as #280 (interior map and tiers), #281
  (carpenter and upgrade flow), both M2 and limited to tier 1, with tiers 2 and
  3 in #286 and #282 (cellar map), both M3. The M2 part is not yet
  placed in `33_build_order.md`.
