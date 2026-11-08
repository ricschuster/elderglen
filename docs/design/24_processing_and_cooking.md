# 24 Processing and cooking (draft)

Status: draft. The machine rules, the kitchen and the recipe count were decided
with the owner on 2026-10-31 (answers to the open questions in the 2026-10-30b
handoff). Machine numbers, dish lists and prices are our draft and are
placeholders. Built 2026-11-07 (slice 1 build 7): the machine framework and five machines, the
charcoal kiln, preserves jar, bee house, keg and seed maker, with jam, pickles,
wine, juice, honey and mead (`src/core/machines.ts`, `processing.ts`,
`artisan.ts`). The machine bundles (4, 5, 9, 10, 12) are in the hall data and give their machine and recipe (2026-11-07, note 35). Built 2026-11-08 (animal goods): the cheese press, mayonnaise machine, loom and oil maker, with cheese, goat cheese, mayonnaise, duck mayonnaise, cloth, truffle oil and oil. The cheese press and loom come from bundles 11 and 21 or farming 6 and 7, the mayonnaise machine from farming 2 and the oil maker from farming 8 (sunflower oil waits for the crop). Cloth keeps wool quality (silver 25 percent, gold 50 percent for 2 cloth); moonwool has no machine yet. Numbers are in note 07. Built 2026-11-08 (cooking, first slice): a stove in the tier 1 house kitchen opens the cooking screen (`CookingScene`, `src/core/cooking.ts`, `dishes.ts`, `src/content/dishes.json`). Eight placeholder dishes from the pack, a locked recipe shows as ???, and recipes are learned at the start or a skill level. A dish is an item with energy and a sell price, eaten from the pack, and cooking calls `noteCooked`. Not built: the fridge, the cookout kit, buffs, friendship, mail, inn and cookbook recipe sources, fish dishes (no fish yet), the other 73 recipes and the ring 2 and 3 dishes. Built 2026-11-09 (#602): the cask and the dye vat (see "The cask and the dye vat, built" below). Not built: fish smoker, crystalarium, flower honey, beer (no grain) and
the cask. Unchecked claims are SC-50 and SC-51. Stardew facts were checked against the
saved wiki pages Artisan Goods and Cooking, read only (ADR 0002). No text or
tables are copied, and the dish names below are ours.

## Why

Bundles 11, 12, 23, 25 and 27 already assume machines and cooked dishes
(`16_bundles.md`), and animals, mines and farm types lean on this note for
their goods (`23_animals.md`, `22_mines.md`, `32_farm_types.md`). Processing
turns raw goods into higher value goods over time, and cooking turns them into
food with energy and a buff. This note settles both before any code.

## Decided with the owner (2026-10-31)

- **Machines: the bundle gives the first, then the player can craft more.** The
  hall reward is the first machine and its recipe. More cost materials only, so
  a second keg needs no hall trip. This is how the furnace and the charcoal kiln
  already work (`22_mines.md`).
- **The cask is not in the first version.** It is the first machine to come
  back, for aged wine and cheese, with the farmhouse cellar.
- **The kitchen comes with the first farmhouse upgrade,** as in Stardew. A
  portable cookout kit at foraging level 3 cooks anywhere.
- **Mayonnaise machine and oil maker come from farming level recipes,** as in
  Stardew (level 2 and level 8). No bundle gives them.
- **Machine set: twelve.** The eight plus a seed maker, a dye vat, a fish
  smoker and a crystalarium. The duplicator is dropped, since Stardew has none.
  Bundle 27 gives the crystalarium in its place (`16_bundles.md`).
- **Craft costs use Stardew's lists,** with our own items swapped in for any we
  lack (jellies, earth crystal, oak resin and the like). Tuned in playtests.
- **The first farmhouse upgrade costs 10,000g and 450 wood,** takes 3 days and
  adds the kitchen, fridge and a bedroom, as in Stardew. Later upgrades are for
  the house note.
- **The inn kitchen sells a few recipes and dishes,** like Stardew's saloon (a
  permanent stock of about six dishes and a handful of cheap starter recipes).
- **A level 10 profession choice for every skill,** as in Stardew. One screen
  covers farming, foraging and the rest (`23_animals.md`, "Professions").
- **Recipe count: as many as Stardew has in total,** and spread across the
  rings. Each of ring 2 and ring 3 brings its own recipes. See "Dishes".

## Earlier recommendations that stand

These came from the 2026-10-30b handoff and were not contradicted:

- Eleven machines in the first version,
  one input and one batch each.
- Most goods ignore ingredient quality and sell for about 2 to 3 times the raw
  item. Cloth is the exception: better wool gives a better chance of 2 cloth.
- Wine is the best use of fruit and jam suits cheap fruit.
- One timed food buff at a time, and a separate drink slot.
- The Artisan profession adds 40 percent to machine goods, except oil and
  coffee. It needs the level 10 farming choice (`23_animals.md`, "Professions").
- Fertilizer is a farming feature and lives in `31_farm_growth.md`.

## Machines

Twelve machines (the four added are in the second table). Times are in game hours and placeholders. A machine runs
overnight and while the player is away, and the clock follows the game day
(`07_tuning_numbers.md`). The furnace is in `22_mines.md` and is not repeated.

| Machine | Input | Output | Time | Bundle that gives it |
| --- | --- | --- | --- | --- |
| Preserves jar | Fruit, or vegetable | Jam, or pickles | 3 to 4 days | 10, Quality Crops |
| Keg | Fruit, or vegetable, or grain, or honey | Wine, juice, beer, mead | 1 to 7 days | 12, Artisan Goods |
| Cheese press | Milk, or goat milk | Cheese, or goat cheese | 3 hours | 11, Animal Goods |
| Mayonnaise machine | Egg, or duck egg | Mayonnaise | 3 hours | None yet (see Open) |
| Loom | Wool | Cloth | 4 hours | 21, Weaver's |
| Oil maker | Truffle, or corn, or sunflower | Truffle oil, or oil | 1 hour to 2 days | None yet (see Open) |
| Bee house | None (produces) | Honey, or flower honey | 4 days | 9, Autumn Crops |
| Charcoal kiln | Wood | Coal | 1 hour | 5, Woodland, and 19, Smith's (`22_mines.md`) |

The four added machines:

| Machine | Input | Output | Time | First source |
| --- | --- | --- | --- | --- |
| Seed maker | A crop or forage item | Seeds of it | Short | Bundle 4, Winter Foraging |
| Dye vat | A flower or crop | Dye | Placeholder | Bundle 23, Dyer's |
| Fish smoker | A fish and coal | Smoked fish, worth double, quality kept | Placeholder | Riverside starts with it. Others craft it later. |
| Crystalarium | A gem or mineral | Another of the same | Placeholder, long | Bundle 27, Harvest Feast |

- Stardew's seed maker is a farming level 9 recipe (25 wood, 1 gold bar, 10
  coal). Its fish smoker recipe is bought at the fish shop for 10,000g and
  crafted from 10 hardwood and one each of three jellies (checked against the
  saved wiki pages, SC-20). Ours keep the bundle sources above and the costs
  stay placeholders.
- Mayonnaise machine and oil maker: farming level recipes, level 2 and level 8.
  Stardew's other machine unlocks are also farming levels (bee house 3, jar 4,
  cheese press 6, loom 7, keg 8), but ours come from bundles first as decided.
- **One input, one batch.** Put one item in and get one item out, as in Stardew.
  The tablet player never fills a queue.
- **Quality is ignored** for every good except cloth, which uses the wool's
  quality to raise the chance of 2 cloth.
- **Craft recipes** use wood, stone and bars from `22_mines.md`, as Stardew's
  lists do. Bars mean a copper or iron trip,
  so machine crafting follows the mines. The exact lists go in
  `07_tuning_numbers.md`.
- **Bee houses** keep their timer in winter but make no honey until spring (SC-50), and flowers in range change the honey,
  with the reach set at about five tiles. A flower pot also counts.
- **A machine sits where the player puts it,** on the farm, as with any placed
  object. A cask later goes in the cellar (see "Left for later"). A machine can
  be picked up at any time, working or not: a working batch is cancelled and
  the input comes back (SC-50, owner 2026-11-07, built in parity pass 521). A
  bee house loses its batch.
- **Selling.** Machine goods sell through the shipping bin and the shop at the
  same price (`28_shipping_bin.md`). The Artisan profession adds its 40 percent
  when the good is made, so the price is fixed then.

### Placeholder prices

Our own rule of thumb, tuned in playtests:

- Jam and pickles sell for about twice the raw item plus a flat sum.
- Wine sells for about three times the fruit. It is the best fruit use.
- Cheese and mayonnaise sell for about two to three times the raw egg or milk.
- Truffle oil sells for far more than a truffle, to make the pig worth its
  price. Oil from corn or sunflower is cheap and mostly an ingredient.
- Honey sells by flower type, with rare flowers worth the most.

## The kitchen

- The first farmhouse upgrade adds a kitchen with a stove and a fridge. The
  stove is the cooking screen. The fridge has 36 slots and counts as part of
  the inventory for any recipe.
- The cookout kit at foraging level 3 lets the player cook in the field, using
  only the pack.
- The player starts with one recipe, a simple fried egg.
- All other recipes must be learned before they can be cooked. A locked recipe
  shows as a silhouette.
- Later upgrades (Stardew: 65,000g and 100 hardwood for the children's rooms,
  then 100,000g for the cellar) are not designed here. See
  `25_stardew_system_review.md`, "Farmhouse and upgrades". The cellar upgrade is
  where the cask arrives.

## Buffs and eating

- One food buff is active at a time. A new food with a buff replaces the old
  buff. A food with no buff leaves the active buff in place.
- A drink buff is a separate slot and stacks with one food buff.
- Buffs are only for stats we have: farming, foraging, fishing, mining,
  maximum energy and walking speed. No luck, defence, attack or magnetism until
  those exist.
- Eating already exists (M3 early build). Dishes restore energy only. We have no
  health, so there is no health value.
- A cooking-quality item (the equivalent of Qi Seasoning) is not planned.

## Dishes

The owner wants the full Stardew count and a share for every ring, so the
total target is **81 recipes**, the number the saved Cooking page lists. Our
own names, flavour and ingredients apply to every one.

| Ring | Share (placeholder) | Source of ingredients | How they are learned |
| --- | --- | --- | --- |
| 1, the home valley | about 40 | Farm crops, forage, fish, animals, machines | Friendship mail, inn kitchen, skill levels, cookbooks |
| 2, the regions | about 25 | Regional ingredients, new crops and fish | Regional friendship, a regional cookbook per region |
| 3, the dark edge | about 16 | Rare late ingredients | A few cookbooks and late rewards |

- **The 81 includes more than ring 1 can supply.** Some Stardew recipes come
  from a TV chef show or from Ginger Island, and we have neither. Those slots
  go to ring 2 and ring 3 as dishes of our own, not to copies. Counted from the
  saved Cooking page (SC-21): 32 of the 81 are taught by the TV chef show, 3 are
  bought or traded on Ginger Island, and 2 more come from the island villager's
  friendship mail. That is about 37 slots to fill with our own dishes, if we
  copy none of them.
- **Ring 2 and ring 3 recipes wait for those rings.** Their regions are not
  designed yet. This note reserves the count, and each region note lists its
  dishes. The first build and M3 need ring 1 only.
- **Recipe sources.** The Stardew set is a mix, and ours follows it:
  - Friendship mail from the cast at 3 and 7 hearts (our 5 and 10 steps are
    tuned in the cast notes).
  - A skill level reward, one dish at certain levels of each skill.
  - The inn kitchen, which sells a few dishes and cheap starter recipes
    (`20_ring1_cast.md`, the inn keeper's family).
  - A cookbook, bought or found. No TV show.
  - A bundle reward (bundles 17 and 22 already give dishes).
- **Bundle dishes stay satisfiable in ring 1.** Bundles 22, 24 and 27 ask for
  dishes. Each must be cookable from ring 1 ingredients, or the hall chain
  would be gated on ring 2.
- **A dish list is data,** in a new file under `src/content/`, one record per
  dish: id, ingredients, energy, buff and duration, source, sell price. The
  design lists them in a note once the first 40 are drafted, not in this one.

### Achievement tie

The completion tracker (#196) has three cooking goals in Stardew: cook 10,
cook 25 and cook all. The same three fit our tracker, scaled to the list.

## Why this shape

Machines turn farm output into a second loop of waiting and collecting, which
is gentle on a tablet because there is no queue and no fail state. Cooking turns
the same goods into a buff with a reason to plan the day. Tying the kitchen to
the house upgrade gives the upgrade a payoff, and tying recipes to friendship,
skills and rings gives each of them a second use.

## The cask and the dye vat, built (2026-11-09, #602)

Settled where the notes left gaps. All numbers are placeholders (note 07).

- **The cask stands only in the cellar.** It is a backpack item
  (`cask`, crafted from 40 wood, wood standing in for Stardew's hardwood as in
  the house upgrade). The recipe is known once the cellar stairs are built
  (tier 3). A held cask is stood on a clear floor tile of the cellar, up to 33
  (Stardew's cellar, SC-39). The farm refuses it. Casks are not in the machine
  save list: the save holds `casks` (tile, and the good with its starting
  quality and the day it went in). An older save has none.
- **Aging.** One good per cask, no queue. It takes wine, mead and cheese
  (goat cheese too). The good keeps its starting quality as a floor and gains
  silver and gold by days in the cask: wine and mead 14 and 28 days, cheese 6
  and 10 (Stardew's figures from memory, SC-82). We have no iridium grade.
  Taking it out early is allowed and gives the grade reached. Time is counted
  in whole game days, so a cask works while the player is away.
- **Use.** Hold a good and face the cask to load it. Action reads the cask
  and takes a gold good out. The axe or pickaxe takes the good out at any time,
  or an empty cask up, so a stray press never resets the ageing. A gold good
  shows the ready mark. Not built: ale and pale ale (no grain), cask count
  upgrades, a cask in the farm cave.
- **The dye vat** is the Dyer's bundle (23) reward, a machine on the farm like
  the keg, and its recipe comes with the bundle only (40 wood, 10 stone, 10
  fiber). One flower, berry or crop in, one dye out after 1 day:
  daffodil to yellow, sweet pea to pink, red cabbage to purple, cranberry to
  red, bramble berry to indigo, crocus to violet. Each dye sells for 120g. Dyes
  have no other use yet: tailoring (note 10) and bundle 29 will ask for them.
  The Dyer's bundle is built in the Hearth room (4 of 6, any quality).
- **The greenhouse is built** (`31_farm_growth.md`, "Built (#602)").

## Left for later

- **Ale and pale ale** for the cask, once grain exists (the cask is built, see above).
- **A dehydrator,** which Stardew sells for a high price.
- **Recycling and a worm bin,** deep Stardew machines. Recycling for trash is in `21_fishing.md`.
- **Artisan goods from trees and tapping** (maple syrup and similar). They need
  trees and the Tapper profession (`26_seasons.md` and the foraging
  professions).

## Open

- **Crystalarium numbers.** It copies gems and minerals only. Its timer must be
  long enough that a diamond-style copy loop does not break the economy, since
  gems sell and feed the lamp trade (`22_mines.md`). Craft cost, and whether
  more can be crafted, are placeholders. Stardew's crystalarium recipe source
  is unchecked here. The rest of the reward pass is in `16_bundles.md`.
- Our own items to stand in for Stardew's special craft ingredients.
- Machine times and sell prices are set for the jar, keg and bee house in
  `07_tuning_numbers.md` (2026-10-31, Stardew's). The charcoal kiln (30 min) and
  seed maker (20 min) are set too.
- The inn kitchen's exact stock and prices.
- The split of the 81 recipes between rings once the regions are designed.
- The house upgrade price is Stardew's and may need tuning, since our economy
  is untested at that scale.
