# 92 Tapper, geode crusher, worm bin and pale ale (draft)

Status: **settled with the owner on 2026-11-12 (all Stardew options chosen for the tapper,
pale ale and worm bin); numbers are placeholders.** Design part of #879 for these four.
Stardew facts are from the saved Trees, Artisan Goods, Crops and Worm Bin pages (read
2026-11-12). Names, prices and art are ours (ADR 0002).

## The tapper

- **Each tree type gives its own good on its own cycle (Stardew, saved Trees page).**

  | Tree | Good | Cycle | Price (placeholder) |
  | --- | --- | --- | --- |
  | Oak | Oak resin | 7 days | 150g |
  | Maple | Maple syrup | 9 days | 200g |
  | Pine | Pine tar | 5 days | 100g |
  | Mahogany | Sap | every day | 2g |

  Stardew calls maple the most profitable of the three common trees. Prices are from
  memory and unchecked (SC-156); the cycles are the saved page's. Our good names are
  placeholders.

- **Placing.** A tapper is a placeable (note 89, one per tree). Hold it and face a mature
  tree (stage 5). It cannot go on a stump, a young tree or a fruit tree. Taking it back
  keeps the good inside.
- **Collecting.** Action on a tapped tree takes the good once the cycle is full, a mark
  shows when it is ready, and the timer restarts at once. Goods wait in the tapper (no
  loss). Time is counted in whole game days, so it runs while the player is away, and it
  keeps running in winter (as Stardew, from the page, which lists no winter pause).
- **Recipe.** Wood and copper bars (placeholder 40 wood, 2 copper bars), learned at
  Foraging level 3 (placeholder). The Lumberjack and Tapper professions (note 07) stay
  later, the **Heavy Tapper** (cycles 3, 4, 2 days, mahogany daily, saved page) is a later
  upgrade and not built here.
- **Mahogany** was waiting on the tapper (note 36): daily sap, the tapped tree is still
  fellable for 10 Hardwood.
- **Regional trees (#396)** stay open: which tree types stand in which area. The tapper
  works on whatever type a tree is.

## Geode crusher

- **A craftable machine, free to run (note 69).** Put a geode in and a result comes out
  after a short time, the same pools as the smith (note 69), so it takes the 25g trip out
  of the loop later. The smith still cracks for 25g.
- **Time.** Placeholder 1 game hour per geode (Stardew's is from memory, SC-157).
- **Recipe.** Placeholder: 20 stone, 3 iron bars and 2 gold bars, learned at Mining level 3. The smith keeps working for those
  without it.
- **Placing.** A placeable (note 89 table), with the job saved like a
  machine (placed store).
- **Does not crack artifacts or minerals.** Only the four geode kinds.

## Worm bin

- **Stardew (saved Worm Bin page).** Unlocked at Fishing level 4, 4 to 5 bait every
  morning, self-sufficient, cannot be sold. Stardew's cost: 15 hardwood, 1 gold bar, 1 iron
  bar and 50 fiber.
- **Ours.** The same: recipe at Fishing level 4, placeable, makes 4 to 5 **plain bait**
  every morning into the bin (take it with Action), which holds up to 50 and cannot be
  sold. Cost the same, placeholder prices if our materials differ.
- **Deluxe worm bin** and fine bait: Stardew has a Deluxe Worm Bin (a Worm Bin and 30 moss,
  Fishing level 8, saved page). It is later and not designed here.
- **Fish tackle** (note 21) stays as it is. Plain bait is built (3g).

## Pale ale and hops

- **Hops (Stardew, saved Crops page).** A summer crop, 11 days to grow, regrowing every
  day after, seed 60g, sells 25g. Ours: a plain summer crop with regrowth of 1 day, and no
  trellis (a Stardew trellis blocks walking, ours does not). Hops is not a vegetable.
- **Pale ale (Stardew, saved Artisan Goods page).** A keg takes one hops and makes pale
  ale in 2,250 minutes, about 1.4 game days, selling for 300g. Cask age: silver after 9
  days (375g), gold after 17 (450g), in whole game days (note 24 counts days).
- **Beer in the cask.** Beer (wheat, 200g) ages in the cask too, silver 7 days (250g) and
  gold 14 days (300g) on the saved page. Note 24's cask now takes pale ale and beer.
- **Data.** `hops` in crops, `pale-ale` in the artisan table and the cask table.

## Build list

1. Tapper placeable, recipe, tree tap state, goods per tree type, mahogany sap (note 36).
2. Geode crusher placeable and machine.
3. Worm bin placeable, bait output, recipe at Fishing level 4.
4. Hops crop (summer, regrows), pale ale in the keg and cask, beer in the cask.
5. Tests for each. Save through the placed store (note 89).

## Open

- Prices and recipes marked placeholder, SC-156 and SC-157.
- Art and names.
