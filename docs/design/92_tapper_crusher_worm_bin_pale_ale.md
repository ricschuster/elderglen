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
- **Recipe.** 40 wood and 2 copper bars, learned at Foraging level 4 (Stardew, saved
  Tapper page, SC-156; owner chose it 2026-11-12). The Lumberjack and Tapper professions (note 07) stay
  later. The **Heavy Tapper** (cycles 3, 4, 2 days, mahogany daily, saved page) is a bundle
  reward, see Built below.
- **Mahogany** was waiting on the tapper (note 36): daily sap, the tapped tree is still
  fellable for 10 Hardwood.
- **Regional trees (#396)** stay open: which tree types stand in which area. The tapper
  works on whatever type a tree is.

## Geode crusher

- **A craftable machine, free to run (note 69).** Put a geode in and a result comes out
  after a short time, the same pools as the smith (note 69), so it takes the 25g trip out
  of the loop later. The smith still cracks for 25g.
- **Time.** 1 game hour per geode, no fuel (Stardew, saved Geode Crusher page, SC-157).
- **Recipe.** 2 gold bars, 50 stone and 1 diamond (Stardew, SC-157; owner chose it
  2026-11-12). The recipe comes from the Cave Patrol special order (note 65, built), as in
  Stardew. It cannot open troves or mystery boxes. The smith keeps working for those
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

## Built status

Built (2026-11-12): items 1 to 3 of the list below, as core rules and data with tests
(`src/core/tapper.ts`, `src/content/tapper.json`, the `geode-crusher` and `worm-bin`
machines in `processing.ts` and `machines.ts`, three recipes, three placeables rows).
Details: the tapper state is `tap` on the tree (saves with the trees); Action takes a ready
good, the pickaxe lifts the tapper (a ready good comes too), felling the tree returns it.
The worm bin keeps a job with a count, fills 4 to 5 each morning from sleep, cap 50. The
crusher uses `crackResult` with the deepest floor reached. Corrected 2026-11-12: the crusher
recipe's diamond is the Diamond of note 83 decision 21 (a 750g gem, id `gem-high-b` as the
placeholder, named Diamond in `gems.json`), not the Heartfire diamond.

Built (2026-11-12, second pass): item 4. `hops` is in `crops.json` (summer, 11 days, regrow
1, seed 60g, sells 25g); crops now take `produce: "none"` (wheat and hops), so neither makes
jam, pickles, wine or juice. The keg turns hops into pale ale (2,250 minutes, 300g) and
wheat into beer (200g). The cask takes both, beer at 7 and 14 days and pale ale at 9 and 17.
The tapper is wired into the scene: the tap-use fit rule (`tapuse.ts`) walks beside a mature
untapped tree and places the tapper; Action on a tapped tree with nothing ready says the
days left (`tapStatus`); the failure reasons have words; a tree whose tap is ready shows the
green ready mark.

Not built: tapper art on the tree (the ready mark is the machine one), the tapper in a shop,
Heavy Tapper, and seeds for hops in the shop lists.

## Build list

1. Tapper placeable, recipe, tree tap state, goods per tree type, mahogany sap (note 36).
2. Geode crusher placeable and machine.
3. Worm bin placeable, bait output, recipe at Fishing level 4.
4. Hops crop (summer, regrows), pale ale in the keg and cask, beer in the cask.
5. Tests for each. Save through the placed store (note 89).

## Open

- Prices (SC-156) and the crusher recipe (SC-157) are now Stardew's. Remaining placeholders: the worm bin and pale ale.
- Art and names.

Built (2026-11-12, follow-ups): the cart stop at the mine mouth sits beside the mine door on the
Mountain and is listed only once the mines open (`requires: "mines-open"` in `carts.json`, the
`from_cart-mine` entry carries the same condition; see note 16).

Built (2026-11-12, art pass): placeholder tapper art. Item icons `icon-tapper` and
`icon-heavy-tapper`, and a spout and bucket drawn on a tapped tree (`tapper-on-tree`, a gold
band for the heavy one), under the green ready mark. The Heavy Tapper is built: item, placeable,
recipe (see the 2026-11-12 line below), a `heavy` flag on the tree's
`tap`, cycles 3, 4, 2 days and mahogany daily from `tapper.json`. Tests in `tests/tapper.test.ts`.
Decided and built (2026-11-12, owner): both tappers are crafted only, no shop sells one. The
Tapper is 40 Wood and 2 Copper Bars at Foraging level 4. The Heavy Tapper is 30 Hardwood and 1
Hearthsilver bar (our stand-in for Stardew's Radioactive Bar, the top rare bar we have), and its
recipe is the reward of the Rare Finds bundle (bundle 6, the rare forage one, whose reward was 5
mushroom stews; the stew reward is gone). There is no level source for it. Stardew gives the recipe
from the Forager's Bundle (owner, 2026-11-12), so this is our nearest bundle. Open: the Heavy
Tapper's cycles (3, 4, 2 days, mahogany daily) are from the saved Trees page, but whether Stardew's
Heavy Tapper also yields more per cycle is not checked here, so no extra yield is built.
Nothing here was verified by play.
