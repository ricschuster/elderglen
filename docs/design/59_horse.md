# 59 The horse (draft)

Status: draft. Decided with the owner on 2026-11-06. The stable, the horse, riding and naming are built (issue #601, see Built below); the extras are not. It
settles whether the valley has a mount, so long maps do not mean long walks all
game (`19_valley_layout.md`, area sizes).

## Built (issue #601)

Numbers are placeholders for note 07.

- **Stable.** A fifth carpenter row, placed with the placement screen of note 60
  (Place, Move, Take down). 4 by 2 tiles, all solid, no interior. 10,000g, 100
  Hardwood and 5 iron bars (real Hardwood since 2026-11-07, note 43), two
  days, horse included. One carpenter job at a time, like the coop and barn.
  Taking it down returns half (5,000g, 50 Hardwood, 2 iron bars) and the horse
  leaves with it, name and all.
- **The horse** waits on the tile in front of the stable (the tile placement
  keeps free). The morning report says when the stable is finished.
- **Riding.** Action facing the horse gets on, Action again gets off, anywhere.
  Tools and fishing are refused while mounted. Speed is 6.6 over our run speed
  of 5, a factor of 1.32 (the saved Speed page). Terrain costs do not exist yet.
- **Outdoors only.** Built today: the farms and the village green. **Decided
  (owner, 2026-11-08): the horse rides on every outdoor valley map** (the farms,
  Forest, Secret Woods, Mountain, Quarry, River delta and Beach, Hearthwell and its
  festival variant), and not in interiors, the Mines or the Lake cove (the ferry
  dismounts the rider and parks the horse at the dock). As each map lands it
  sets the map property `rideable` (`71_map_areas_overview.md`, contract need
  7), which then replaces the horse's list of map names. A door or the Mines
  dismounts the rider and parks the horse near where they stood.
- **Blocking (owner, 2026-11-07, as Stardew).** A parked horse blocks the tile
  it stands on. The rule that keeps it from ever trapping the player:
  - It is not solid while ridden, and not while it waits at the stable.
  - It is parked on the faced tile, else the nearest tile within 8, that is open
    ground, is not the rider's tile, is not an exit, entry, bin or counter or
    next to one (so the way to each stays open), and blocks no walkable tile
    off from the rider (a four way search before and after must agree).
  - If no tile qualifies, the horse goes back to the stable and says so.
  - When a map loads, a horse left on a tile that is no longer safe (a chest,
    a grown tree, the player's own tile) is moved the same way.
  - Tap paths and movement use the same blocked test, so a parked horse is
    walked around.
- **Parking.** A horse left outside stays there for the day and is back at the
  stable each morning (the morning report says so). A mounted player who sleeps
  wakes on foot.
- **Naming.** The first ride opens an in-game dialog (`NameScene`) with an on
  screen keyboard, so touch and mouse work, and a physical keyboard types into it
  too. Done or Esc with nothing typed takes "Clover". Letters, digits, space,
  apostrophe and hyphen, at most 16 characters, capitalised by word. The ride
  starts when the dialog closes.
- **Saves.** `animals.stableBuilt`, `animals.horse` (name and parked spot) and
  `animals.sites.stable`. Old saves have none and load unchanged. Riding itself
  is not saved: a loaded game starts on foot.
- **Not built:** the extras (carrot, horse book, flute, hats), the walk and run
  split, the horse and rider sprites (placeholder blocks), the Mines being
  unrideable only by map name (no Mines ride exists, and `rideable` replaces the
  list when the maps land), and the gate rule for gaps
  under two tiles.

## Why

Hearthwell and the Forest now match Stardew's total tiles (about 13,000 and
14,000). The owner finds our 5 tiles a second walk too fast, and Stardew's
horse is what makes its long maps quick later (SC-41, from memory). Note 25
listed the horse as absent because the valley was thought small. That no longer
holds.

## Decision (owner, 2026-11-06)

**The valley has a stable and a horse, as in Stardew.** Chosen over a speed item
and over carts only. Carts from the hall room reward (`16_bundles.md`) stay.

## What the saved Stable page says (read 2026-11-06)

- The stable is a farm building bought from the carpenter. It costs 10,000g plus
  Hardwood (100) and iron, and takes two days to build. The saved page did not
  show the iron count.
- The horse comes with the stable and waits in it at the start of each day.
- The player names the horse the first time they ride it.
- A farm normally has one stable. In multiplayer each player can build their
  own. Demolishing the stable removes the horse.
- Not on the page: the horse's speed, where it can and cannot be ridden, and
  whether it needs feeding. These stay open.

## Answers (owner, 2026-11-06)

1. **One stable per player (Stardew).** The owner recalled more than one and
   was unsure of a limit. The saved page says one normally, and one each in
   multiplayer, so one per player it is.
2. **Stardew's cost as is (Stardew):** 10,000g plus Hardwood (100) and iron, two
   days to build. Hardwood needs a Copper Axe or better (SC-31), so the axe
   gates it. Whether 10,000g fits our economy is unchecked (note 07).
3. **Stardew's +1.4 speed (Stardew).** The saved Animals page says the horse
   adds +1.4 speed and does not slow in crops or grass. The base walk speed is
   not on the pages read, so the ratio to our walk is unchecked (SC-41).
4. **Outdoors only, dismount at doors.** Ride anywhere outdoors, crops
   included. Whether Stardew lets you ride indoors or in the Mines is unchecked.

## More from the saved Animals page (read 2026-11-06)

- The horse needs no feeding (the page says horses and pets do not need to eat),
  so there is no care system.
- It waits where the player leaves it and returns to the stable the next
  morning if left outside overnight. It cannot pass gaps under two tiles wide
  when moving vertically, except gates.

## Extras (owner, 2026-11-06: add them, as in Stardew)

From the saved Animals page. Amounts are Stardew's and our own numbers are not
set:

- **Carrot:** feed the horse one carrot a day for +0.4 speed for the rest of
  that day.
- **Horse book:** reading it adds +0.5 speed for good. Needs a book in our
  game, and note 25 lists books as absent.
- **Horse flute:** warps the horse to the player, outdoors only.
- **Hats:** a hat can be placed on the horse (customisation, note 10).
- Speed buffs stack with the horse's speed.

**Decided 2026-11-06 (owner): none of these are built now.** They stay as
placeholders because we have no carrot crop, no books and no item shop for them
yet. The horse is the stable and its fixed speed. Stardew has all three. The saved
Books page gives the horse book at 25,000g from the Bookseller; where the carrot
and the flute come from is on no saved page. Revisit after the first playtest,
and when books or a carrot crop get a design.

## Walk speed (owner, 2026-11-06)

**Walk and run both exist, run by default (owner, 2026-11-06).** As in Stardew
(walk 2, run 5 on the saved Speed page, auto-run on from the owner's memory, the
default itself unchecked). The player runs unless they hold a walk key. On touch,
how far the stick is pushed sets walk or run (to design in note 45). Our current
5 tiles a second becomes the run speed and walk is 2/5 of it, 2 tiles a second.
The horse stays 1.3 times run. Not built yet.

**Keep 5 tiles a second for now (owner, 2026-11-06).** The owner first picked 2.5
as a placeholder, half of the current 5 (80 px a second in `FarmScene.ts` and
`scripts/sim/world.ts`). After the saved Speed page showed Stardew running at 5
(see below), the owner chose to keep the original speed as an assumption and
withdrew the 2.5. Nothing in the code changes. Revisit it when the owner can time
Stardew, or at the first playtest on the full size maps. Our 5 tiles a second
matching Stardew's 5 is an inference, because the unit is not known.

**Saved Speed page, read 2026-11-06 (SC-41).** Player speed is a unitless game
number, and the page gives no tiles a second:

- Base speed is **2 walking, 5 running, 6.6 on the horse (7 with a carrot that
  day)**.
- So the horse is about 1.3 times running and 3.3 times walking. Running is 2.5
  times walking.
- Buffs add to the number: coffee and some foods +1, books +0.25 and +0.25 for
  running, and a horse book +0.5 on the horse only. The maximum with every buff
  is 15.5.
- Terrain: grass costs 1 and crops cost 1 (only when running, not on the horse),
  and farm flooring adds 0.1. The speed never drops below 1. A slime hit costs 4.
- The Animals page gave +1.4 for the horse. 5 plus 1.4 is 6.4, not 6.6, so the
  two pages differ a little. We use the Speed page.

Not on any saved page: what the number means in tiles a second, or whether
walking or running is the default. A web search suggested the game starts in
auto run (unverified). If the number is pixels a frame at 60 frames a second on
64 pixel tiles, running is about 4.7 tiles a second and walking about 1.9. That
is our inference, not a source.

## Open

- **Our run speed.** Revisit the kept 5 tiles a second (now the run speed) once
  the owner can time Stardew, or the unit is found (SC-41), or at the first
  playtest on the full size maps. Walk and run both exist (decided above). The
  walk key, the touch stick thresholds and the walk speed ratio go in note 45.
- **Indoors and the Mines (decided 2026-11-06, owner, as Stardew, from memory).**
  Outdoors only. Entering a building or the Mines dismounts the player, and the
  horse waits outside. The saved pages do not say (searched).
- **Unlock (decided 2026-11-06, owner, Stardew, unchecked).** The stable is
  bought at the carpenter from the start. The only gate is the cost, and Hardwood
  needs a Steel Axe (note 32).
- **Naming (decided 2026-11-06, owner, saved Stable page).** The player names the
  horse on the first ride.
- **Extras.** Parked as placeholders (decided above). Later: where the carrot,
  book and flute come from, and their prices. Is the carrot a crop we grow (no
  note has one yet)? Does a hat fit our hat system?
- **Placement (decided 2026-11-06, owner, as Stardew).** The player places the
  stable on any free spot of the farm, 4 by 2 tiles (saved Stable page). The
  spot must be free of rocks, twigs, weeds and placed items, and the building
  can be moved later. The same placement mode serves the coop and barn, so it
  is designed in `60_building_placement.md`.
- **Controls (decided 2026-11-06, owner, as Stardew, from memory).** The action
  on the horse mounts and the same action dismounts: action key or right click on
  desktop, a tap on the horse when close on touch, no extra button. Unchecked on
  the saved pages. Note 45 still needs the key list updated when this is built.
- **Interior (decided 2026-11-06, owner, as Stardew, from memory).** None. The
  stable is seen from outside and the horse stands beside it, so the interior
  count in note 58 stays 29.
- **Price (decided 2026-11-06, owner, Stardew numbers from the saved Stable
  page).** 10,000g, Hardwood 100, Iron Bar 5, two days to build, horse included.
  Hardwood (note 34) and iron bars (notes 22, 34) exist in the design.
- **Price check against income (2026-11-06).** An expert run with no upgrades
  held 7,322g on day 41 after funding every bundle (note 07), so 10,000g is a
  late goal, out of reach in the two season first playable, like house tier 1
  (10,000g and 450 wood) and the 10,000g tool tier. That fits a horse that makes
  long maps quick, since the long maps are later content. The materials are the
  harder part. 100 Hardwood has no renewable source in the design: the Standard
  farm's large stumps give 2 each and a Large Log gives 8 once (notes 43 and 54,
  SC-31), and Hardwood waits for the Woodland farm type (note 32). Iron bars need
  the iron band of the Mines (floors 40 to 80, note 07) and the furnace. So the
  stable is gated by hardwood supply more than by gold. A hardwood source is open
  below.
- **Hardwood supply (decided 2026-11-06, owner, as Stardew).** Six large stumps
  in our Secret Woods respawn daily, 2 Hardwood each (Copper Axe or better), so
  about 12 a day and 100 Hardwood in about 9 visits. From the saved Hardwood
  page. The woods are gated by the massive log (Steel Axe, note 19), so the
  stable arrives mid game. The Standard farm's own stumps do not respawn
  (note 43). Notes 19 and 43 still need the stump count and respawn rule added.
- **Multiplayer** (note 53, milestone M4): one horse each follows from the
  answer above.
- **Art and sound.** A horse sprite, and a mounted player sprite (note 10).

## Next

Check the 10,000g price against income in note 07, design the building placement
mode (note 55 lists the stable as player placed; owner 2026-11-06: on touch a
ghost footprint is dragged and confirmed with a button, and buildings can also be
moved and removed with some resources returned), and update note 45's keys.
The extras are parked.
