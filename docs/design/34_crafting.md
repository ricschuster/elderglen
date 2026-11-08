# 34 Crafting (draft)

Status: draft. Decided with the owner on 2026-10-31. Built 2026-11-07 (slice 1
build 3, the smallest piece sprinklers need): recipes as data in
`src/content/recipes.json`, `src/core/crafting.ts`, and a Craft screen (key R,
touch button) that crafts from the pack. Level sources only, two recipes (the
basic sprinkler, and the quality sprinkler hidden until quartz crystals exist).
Build 7 (2026-11-07) added the bundle source (a finished bundle teaches its
machine recipe), several sources per recipe, and recipes for basic fertilizer,
basic retaining soil and the five farm machines (kiln, jar, bee house, keg, seed
maker). The five machine bundles are in `bundles.json` now (note 35). Quartz crystals and the quality sprinkler were built 2026-11-07 (session e): quartz is a one swing crystal node on mine floors 1 to 10 (6 percent of rocks, a placeholder for "lying on the floor"), selling for 25g. Crafted furnaces were built the same day (a placeable machine, recipe at mining level 4). Chests and the workbench were built the same day (session e): four chests (36 and 70 slots) stood on clear farm ground or open house floor and taken up only when empty; the workbench is furniture bought at the carpenter for 2,000g, and crafting at it draws on the chests on the 8 tiles beside it, pack first. The stone chest recipe is known from the start as a placeholder (the carpenter's recipe shop source is unbuilt). Not built: the shop and gift sources, fences,
paths, floors, signs, torches and campfires (no placeable objects yet), tree
fertilizer, wild seeds, speed fertilizer (needs moss), quality retaining soil
(needs clay) and quality fertilizer (needs fish). The rest of this note is not built.
Reference: the Stardew Valley Wiki Crafting, Carpenter's Shop and Sprinkler
pages, read only (ADR 0002). Costs are Stardew's, with our own items swapped in
where we lack one, and every number is a placeholder until playtests
(`07_tuning_numbers.md`). The machines themselves are in
`24_processing_and_cooking.md`. This note is the general list and the rules.
It is slice 1 work (`33_build_order.md`).

## Decisions

- **How crafting works follows Stardew.** A crafting tab in the pause menu lists
  the recipes the player knows. A recipe crafts when the pack holds every
  ingredient. The result goes to the pack and is placed from the toolbar.
- **A workbench is bought from the carpenter** for 2,000g (Stardew's price) and
  placed in the house. Crafting at it also draws on any chest next to it, so a
  player can keep wood and stone in chests. The pause menu tab still works
  anywhere, from the pack only. The pause menu is Stardew's own way too.
- **Recipes come from four sources, as in Stardew:** skill levels, the shop,
  gifts and mail from villagers, and bundles. A bundle gives its machine and
  the recipe together (`24_processing_and_cooking.md`).
- **Fences do not decay.** This differs from Stardew, where fences wear out. A
  fence is wood, stone or iron for looks and cost, and a gate lets the player
  through. Fences matter from slice 4, when animals arrive. No Gold Clock is
  needed.
- **Lamp-posts need a battery pack, as in Stardew.** The pack comes from
  storms (decided 2026-10-31): a thunderstorm weather type is added, and a
  placed lightning rod turns a strike into one battery pack, as in Stardew.
  Lightning never harms the farm. With no rod in range the strike only
  flashes. This reverses the line in `31_farm_growth.md` that lightning does not
  exist for us.
- **Chests as in Stardew:** wood, stone, and big versions of each. A chest with
  items in it cannot be picked up, but the axe or pickaxe pushes it one tile
  forward (SC-56, built in parity pass 521).
- **Every craftable is data**, in `src/content/`, with its ingredients, its
  source and its slice. New recipes are data files, not code.

## The list

Cost is Stardew's list with our stand-ins marked "(ours)". Source is how the
recipe is learned. "Slice" is when it is built (`33_build_order.md`).

### Storage and signs

| Item | Cost | Source | Slice |
| --- | --- | --- | --- |
| Chest | 50 wood | Start | 1 |
| Stone chest | 50 stone | The carpenter's shop (ours) | 1 |
| Big chest | 120 wood, 2 copper bars | Farming level 4 (ours) | 1 |
| Big stone chest | 250 stone | Farming level 6 (ours) | 1 |
| Wood sign | 25 wood | Start | 1 |
| Stone sign | 25 stone | Start | 1 |

### Fences and paths

| Item | Cost | Source | Slice |
| --- | --- | --- | --- |
| Wood fence | 2 wood | Start | 1 |
| Gate | 10 wood | Start | 1 |
| Stone fence | 2 stone | Farming level 2 | 1 |
| Iron fence | 1 iron bar | Farming level 4 | 1 |
| Hardwood fence | 1 hardwood | Farming level 6 | 1 |
| Wood path, gravel path, cobblestone path | 1 wood or 1 stone | Start | 1 |
| Stepping stone path | 1 stone | A farm shop (ours) | 1 |
| Wood, stone and straw floors | 1 wood, 1 stone, 1 wood and 1 fiber | The carpenter's shop (ours) | 1 |
| Brick floor | 2 clay, 5 stone (makes 5) | The carpenter's shop | 1 |

- Flooring and paths on the farm cut weeds and grass spread where the player
  walks (`29_weeds.md`). Stardew also gives a small speed bonus on flooring.
  We copy neither the bonus nor the full floor set. The list is the plain
  ones, and the rest waits for `10_customisation.md`.
- Crystal floors and paths need refined quartz, which we do not have, so they
  are out for now.

### Light

| Item | Cost | Source | Slice |
| --- | --- | --- | --- |
| Torch | 1 wood, 2 sap | Start | 1 |
| Campfire | 10 stone, 10 wood, 10 fiber | Start | 1 |
| Wooden brazier | 10 wood, 1 coal, 5 fiber | The carpenter's shop (ours) | 1 |
| Stone brazier | 10 stone, 1 coal, 5 fiber | The carpenter's shop (ours) | 1 |
| Lightning rod | 1 iron bar, 1 refined quartz (ours: 1 quartz crystal), 5 bat wing (the Cave Bat's drop, as in Stardew) | Foraging level 6 | 3 |
| Wood lamp-post | 50 wood, 1 battery pack | Farming level 7 (ours) | 3, after the rod |
| Iron lamp-post | 1 iron bar, 1 battery pack | Farming level 9 (ours) | 3, after the rod |

Stardew's other braziers (gold, carved, stump, barrel, skull, marble) are
decoration and wait. Torches are what the mines need (`22_mines.md`, bundle
20).

### Farm tools and growth

| Item | Cost | Source | Slice |
| --- | --- | --- | --- |
| Sprinkler | 1 copper bar, 1 iron bar | Farming level 2 | 1 |
| Quality sprinkler | 1 iron bar, 1 gold bar, 1 refined quartz (ours: 1 quartz crystal) | Farming level 6 | 1 |
| Iridium sprinkler | 1 gold bar, 1 iridium bar, 1 battery pack | Farming level 9 | Later, needs iridium |
| Basic fertilizer | 2 sap | Farming level 1 | 1 |
| Quality fertilizer | 4 sap, 1 fish | Farming level 9 | 1 |
| Speed fertilizer | 1 pine tar, 5 moss (ours: 1 sap, 5 moss) | Farming level 3 | 1 |
| Basic retaining soil | 2 stone | Farming level 4 | 1 |
| Quality retaining soil | 3 stone, 1 clay | Farming level 7 | 1 |
| Tree fertilizer | 5 fiber, 5 stone | Foraging level 7 | 1 |
| Seasonal wild seeds (stand-in for mixed seeds) | Forage items (`29_weeds.md`) | Foraging level 1 | 1 |
| Fiber seeds | 1 wild seeds, 5 sap, 1 clay | A farm shop (ours) | Later |

The sprinkler add-ons (nozzle and enricher) are a Ring 2 item from the warden head
(`31_farm_growth.md`). The scarecrow is not here: we have no crows.

### Machines

The machine rules and times are in `24_processing_and_cooking.md`. Their craft
costs, after the first from a bundle:

| Machine | Cost | Source | Slice |
| --- | --- | --- | --- |
| Charcoal kiln | 20 wood, 2 copper bars | Foraging level 2 | 1 |
| Furnace | 20 copper ore, 25 stone | The smith dwarf's gift | 3 |
| Preserves jar | 50 wood, 40 stone, 8 coal | Farming level 4 | 1 |
| Bee house | 40 wood, 8 coal, 1 iron bar, 1 maple syrup (ours: 1 sap) | Farming level 3 | 1 |
| Keg | 30 wood, 1 copper bar, 1 iron bar, 1 oak resin (ours: 1 sap) | Farming level 8 | 1 |
| Seed maker | 25 wood, 10 coal, 1 gold bar | Bundle 4 (see 24) | 1 |
| Mayonnaise machine | 15 wood, 15 stone, 1 earth crystal (ours: 1 quartz crystal), 1 copper bar | Farming level 2 | 4 |
| Cheese press | 45 wood, 45 stone, 10 hardwood, 1 copper bar | Farming level 6 | 4 |
| Loom | 60 wood, 30 fiber, 1 pine tar (ours: 1 sap) | Farming level 7 | 4 |
| Oil maker | 50 slime, 20 hardwood, 1 gold bar | Farming level 8 | 4 |
| Dye vat | To be set with the dye list | Bundle 23 | 4 |
| Fish smoker | 10 hardwood, 3 jellies | Riverside, or a shop (24) | 2 |
| Recycling machine | 25 wood, 25 stone, 1 iron bar | Fishing level 4 | 2 |
| Crystalarium | 99 stone, 5 gold bars, 2 iridium bars, 1 battery pack | Bundle 27 | 5 |

- Bundles give the first of each machine, so a recipe level below is the second
  route, not the only one. The player who levels farming first can craft the
  machine before the hall offers it, and that is fine.
- Stardew's keg at level 8 and loom at level 7 are late. Our bundles give them
  earlier, as decided. That is a reason the bundle rewards are good.
- Our Mayonnaise machine and oil maker are level recipes with no bundle.
- The crystalarium is Stardew's mining recipe. It needs iridium and a battery
  pack that we lack, so its cost is open (`24_processing_and_cooking.md`).

### Others, later

Bombs, rings, bait, tackle, warp totems, the staircase and the other Stardew
crafts belong to their own systems (mines, fishing, travel) and are listed in
those notes. They use this same format and the same crafting tab.

## Items this list needs

These must exist before the recipes above can be built.

- **Fiber and sap**, settled in `36_gathering_trees_sap_fiber.md` (fiber from
  weeds, sap from chopping common trees).
- **Wood, stone, coal, copper and iron bars:** wood and stone exist. Coal and
  bars come from `22_mines.md` (the first part of the mines is in slice 1).
- **Hardwood**, from large stumps (`32_farm_types.md`).
- **Clay**, from hoeing dirt patches on mine floors 1 to 10, and rarely from
  the smith dwarf's geodes (settled 2026-10-31, below).
- **Moss**, from mature trees with any tool, 1 to 2 a tree, not in winter, as
  in Stardew's Trees page (saved). Mossbeetles also drop it from slice 3.
  Owner, 2026-11-08: moss from mature trees is accepted as built.
  Built 2026-11-08. Gaps settled (ours): one tree kind, so moss is on any
  mature tree. A mature tree with no moss has 7 percent a night to grow it, not
  in winter, and moss is gone from every tree when winter comes. One use of any
  tool (axe, hoe, can, pickaxe) or the Action hand gathers it, with no chop,
  no energy cost and no XP; the tree stays and can grow moss again. Stardew
  grows moss over stages 5 to 12 and drops back a stage on harvest; ours is a
  plain nightly chance. Stardew's Green Rain boost and Mossy Seed trees wait
  for that weather. Moss recipes (speed fertilizer) wait for that recipe.
- **Gold bars**, from the smith dwarf's ore shop in slice 1.
- **Quartz crystals**, found on the floor of mine floors 1 to 10, and rarely in
  the smith dwarf's geodes (settled 2026-10-31, below). They stand in for
  refined quartz and earth crystals in the recipes above.
- **A battery pack**, from a lightning rod in a storm. Storms are a new weather
  type, built with fall and winter in slice 1 (`26_seasons.md`). The rod needs
  bat wing from the Cave Bat (decided 2026-10-31, as in Stardew), so rods and
  packs, and the lamp-posts that use them, arrive in slice 3. In slice 1 a storm
  is weather only: it waters the plots and the forecast names it.

## Open

- **Storm numbers (settled 2026-10-31).** In `07_tuning_numbers.md`, following
  the saved Weather and Lightning Rod pages. The rod has no reach: any rod on
  the farm map can catch a strike, so the earlier guess of about eight tiles
  was wrong. A hit rod makes one pack the next morning. Stardew also gives packs
  through a solar panel, which we leave out.
- **Bars in slice 1 (settled 2026-10-31).** The first part of the mines moves into
  slice 1, as in Stardew (`33_build_order.md`), so copper bars come from floors
  1 to 10 and the furnace. Iron and gold ore come from the smith dwarf's shop
  until the deeper floors in slice 3.
- **Clay and quartz in slice 1 (settled 2026-10-31).** Both follow Stardew's
  mines (saved Mines, Blacksmith and Minerals pages). Clay comes from hoeing
  dirt patches on the mine floors, with a low chance per patch (Stardew's is
  about 5 percent, so a placeholder of 5), and rarely from geodes. Quartz lies
  on the floor as mine forage and also comes rarely from geodes. Farm soil
  gives no clay. Stardew's Clay page is not saved, so whether farm digging
  gives any is unchecked, and the owner chose the mine route as it needs no
  new system. Clay and quartz both open on spring day 5 with the mine, so the
  quality sprinkler, brick floors and mayonnaise machine need a mine visit.
  The carpenter buys clay, as in Stardew. Counts per floor go in
  `07_tuning_numbers.md` with the other mine numbers.
- Where the carpenter's shop sells the stone chest, stepping stone path and
  floors, and whether the shop rotates stock as Stardew's does.
- Whether the workbench price (2,000g) fits our early economy.
- Stardew's recipe list for flooring, furniture and decor is larger than
  this. How far the first version goes belongs to `10_customisation.md`.
- Full item stats and the numbers go in `07_tuning_numbers.md`, not here.
