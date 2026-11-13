# 36 Gathering: weeds, fiber, sap and common trees (draft)

Status: draft. Decided with the owner on 2026-10-31. Fiber and weeds are built
(2026-11-07, `29_weeds.md`). Trees and sap were built earlier (#306, #307). Fruit trees are built
(`31_farm_growth.md`).
Reference: the saved Stardew Valley Wiki pages Weeds, Grass, Scythe and Trees,
read only (ADR 0002). Every choice below is what Stardew does, picked by the
owner from a labelled option each time. Numbers marked "ours" are placeholders
for `07_tuning_numbers.md`.

## Decisions

- **Fiber comes from weeds only.** A cut weed has a 50 percent chance of 1
  fiber, as set in `29_weeds.md`. Grass drops no fiber. Grass gives hay when the
  player has a silo (`23_animals.md`), as in Stardew. This keeps grass and
  weeds as two different jobs.
- **Sap comes from common trees, not from weeds or grass.** Chopping a mature
  tree gives 5 sap. Removing its stump gives 1 sap. This replaces the sap
  source in `31_farm_growth.md` (a small chance from weeds, grass and woods
  forage), which is dropped. No forage item gives sap.
- **Common trees are adopted as in Stardew,** with one kind in slice 1. Species
  and seed names are content and can come later. Tappers are not in slice 1, so
  sap comes from chopping only.
- **Weed rate:** Stardew's saved pages give no day 1 count and no spread chance,
  and the formula is unchecked. Slice 1 uses a placeholder (below) and the rate
  is open until the owner saves a source or a playtest sets it.

## Common trees

Facts from the saved Trees page. Amounts are Stardew's unless marked ours.

| Thing | Rule |
| --- | --- |
| Chop a mature tree | 12 to 16 wood, 5 sap, 0 to 2 seeds, 12 foraging XP. Seeds need foraging level 1. |
| Stump | Left behind after a chop. An axe removes it for 4 to 9 wood, 1 sap and 1 XP. |
| Wood bonus | The 4 extra wood come from foraging level and luck. Ours: 1 extra per foraging level 1 to 4, no luck term. |
| Young tree (stage 4) | An axe fells it for 4 wood. |
| Seedling (stages 2 and 3) | Any tool removes it. An axe may drop 1 wood, at 10 percent per foraging level. |
| Seed in the ground (stage 1) | An axe, hoe or pickaxe lifts it back to a seed (foraging level 1). |
| Loose seed | A mature tree has 5 percent a day of holding one. Shaking the tree drops it. |
| Spread on the farm | A mature tree has 15 percent a night to plant one seed on a random tile within 3 tiles, if that tile is empty. Trees never destroy paths or crops. |
| Growth | Four stages to maturity, no watering, no clear ground needed. Each night a seedling has a 20 percent chance to reach the next stage, and stage 4 takes twice as long. Median 24 days, 90 percent mature by day 38. No growth in winter. A seedling stops at stage 4 with a mature tree on any of its 8 neighbours. |
| Regrowth off the farm | A tree chopped in the valley, with its stump removed, has 20 percent a night to return as a stage 3 seedling, even in winter. A kept stump never regrows. |
| Tree fertilizer | Ours: 5 fiber, 5 stone, foraging level 7 (`34_crafting.md`). One stage a night, 5 days in total, and it works in winter. |

- Trees fall left or right away from the player and drop items in that
  direction. On a tablet, tap-to-act chops from the tile the player stands on
  and drops land on the player's tile, so there is no off-centre standing
  (`27_touch_controls.md`). This is ours.
- Items lost in water are not copied. Dropped goods go to the bag, and the rest
  to the ground nearby, picked up by walking over them (`43_wood_source.md`).
- Moss is a separate small tree good (1 to 2 a tree, any tool, not in winter,
  as set in `34_crafting.md`).
- Lightning does not touch trees in slice 1 (storms are weather only). When
  storms matter in slice 3, Stardew's rule is that a common tree hit is
  destroyed and leaves a stump with some wood or sap.
- Farm trees and fruit trees are separate. A fruit tree needs a clear 3x3
  (`31_farm_growth.md`). A common tree seed that spreads onto that ground is a
  weed-like nuisance, and the player lifts it with any of the tools above.

## Weed numbers (placeholders, ours)

- **Day 1 count:** a fixed 20 weeds on day 1 of spring, summer and fall, capped
  by the free tillable tiles. Winter day 1 clears them (`29_weeds.md`). It is
  a count, not a rate per tile, so a small tablet farm still gives enough fiber.
  The placeholder farm has only 96 tillable tiles, and a per-tile rate would
  give 2 weeds there. A bigger farm type can scale the count later.
- **Source:** none found. The saved Weeds, Grass, Gold Clock and Modding Maps
  pages and an online search give no Stardew count or spread chance (the game
  code holds them). Both numbers are ours until a playtest sets them.
- **Spread:** each weed has a 10 percent chance a night to spread to one free
  adjacent tillable tile. The chance is 20 percent on a rainy night and 15
  percent in summer. These are the three triggers Stardew names (day 1, rain
  and summer), with our own numbers.
- **Weeds never destroy placed items** (`29_weeds.md`). That stays softer than
  Stardew.

## Supply and demand

Slice 1 asks for these amounts.

| Use | Fiber | Sap |
| --- | --- | --- |
| Bundle 5 (Woodland) | 30 | 0 |
| Campfire | 10 | 0 |
| Wooden and stone braziers, tree fertilizer | 5 each | 0 |
| Basic fertilizer, per craft | 0 | 2 |
| Torch, per craft | 0 | 2 |
| Speed fertilizer, bee house, keg | 0 | 1 each |

- At 50 percent, 30 fiber is about 60 weeds. Day 1 gives 20 a season, so three
  growing seasons give 60 before spread, about 30 fiber. Bundle 5 is then a
  year's work without spread, and spread should shorten it. Check in play.
- One chopped tree gives 5 sap, plus 1 from its stump, so 6 sap. That is 3
  basic fertilizers. A forest of regrowing trees makes sap steady, but only
  where the player walks, so basic fertilizer is no longer a farm-only chore.
- Sap sells for 2g and fiber for 1g, both Stardew's (`07_tuning_numbers.md`).
  Fiber is always normal quality. Sap is not food: the player cannot eat it
  (ours, 2026-10-31).

## Mahogany (decided 2026-11-10, reopened by the owner)

The earlier "Mahogany stays off the map for now" (2026-11-08) is replaced. Facts
are from the saved Trees, Hardwood and Secret Woods pages. Numbers marked
placeholder are ours to tune (note 07).

- **A fourth common tree, player-planted only.** No wild Mahogany stands in the
  valley (owner, 2026-11-10). Stardew's main map has none either; wild ones are
  on Ginger Island, which is ring 2 or later.
- **Yield (Stardew).** A mature tree gives 10 Hardwood and no wood (12 or 13 with
  the Forester profession), and 0 to 1 Mahogany Seed.
  Tapped, it gives sap every day, with a tapper of either kind. Any axe fells it.
  Its stump gives wood by the common rule in this note.
- **Growth (Stardew).** 15 percent a night per stage (20 for other trees), stage 4
  takes twice as long, tree fertilizer works as for other trees. Median time is
  longer than 24 days. Not placed on a fruit tree's 3x3.
- **Seed sources (owner, 2026-11-10).** Monsters in the Secret Woods drop a seed,
  10 percent each (Stardew, Secret Woods page; placeholder for ours), plus a
  placeholder 10 percent chance that a Secret Woods daily stump gives one too
  (ours, not Stardew). A mature Mahogany tree gives a seed back, so a grove is
  self-seeding.
- **Build order.** The stump chance and the planting rules can be built now. The
  monster drop waits for Secret Woods creatures, which note 73 left for the
  combat notes. Until then the stump chance is the only seed source.
- **Effect on Hardwood.** The six daily stumps stay the early supply. A planted
  grove is the later one: ten trees give 100 Hardwood, about one stable or house
  tier, once grown.

**Built (2026-11-10, #724).** The `mahogany-seed` item, Mahogany as a tree kind
(player-planted only: maps cannot place it), planting by the held seed (refused
on a fruit tree's 3x3), 15 percent a night per stage with stage 4 at half that
(no growth in winter), 10 Hardwood and 5 sap and 0 to 1 seed on felling, no
spreading, a stump by the common rule, and a 10 percent seed chance per chop of
a Secret Woods daily stump. Numbers are data in `src/content/mahogany.json`,
rules in `src/core/mahogany.ts`. **Built later (2026-11-12, note 92):** tapping
for daily sap with either tapper (Tapper 40 Wood and 2 Copper Bars at Foraging level 4, crafted
only; Heavy Tapper from the Rare Finds bundle). **Not built:** tree fertilizer on common trees (none
exists yet), the Forester bonus (12 or 13 Hardwood, no profession yet), the
monster seed drop (waits for Secret Woods creatures), and Mahogany art (it
borrows the oak sprites).

## Open

- Weed day 1 count and spread chance, from a playtest or a saved source page.
- Where common trees stand in the valley, and how many. The farm is settled in
  `43_wood_source.md` (about 100 trees on the dense real farm, 30 on the placeholder). The valley layout needs a
  pass (`19_valley_layout.md`).
- The sawmill and the Lumberjack and Tapper professions wait for a later note.
- Whether random tree growth (median 24 days) suits a tablet player. Chosen as
  Stardew's rule on 2026-11-01 (`43_wood_source.md`). A fixed 24 days stays the fallback.

## Not taken from Stardew

- Species by region (maple, oak, pine, mahogany) and the mushroom, mystic and
  green rain trees. Slice 1 has one common kind. Decided 2026-11-06 for M3,
  not M2: tree types by region as Stardew (owner, SC-30), with fixed places
  outside the farm, regrowth after chopping, and some cosmetic trees that
  cannot be chopped. Settled 2026-11-10: four types (maple, oak, pine and
  mahogany, the last player-planted and Secret Woods only, see "Mahogany").
  Seeds are Maple Seed, Acorn, Pine Cone and Mahogany Seed.
- Palm trees, fiddlehead ferns and Qi's Walnut Room seeds.

## Built status: tree kinds and seeds (2026-11-12, #396)

Built, with `tests/treeseeds.test.ts`: each tree kind drops and plants its own seed, as note 36
and SC-30 settled: Acorn (the oak's, the old `tree-seed` id renamed in the display only, so saves
stay valid), Maple seed, Pine cone and Mahogany seed. A felled mature maple or pine gives its own
seed (0 to 2 from Foraging 1), a shaken or cleared one too, a held seed plants as its kind
(`kindOfSeed`, `TREE_SEED_IDS` in `mahogany.ts`), and a spreading tree's seedling takes its
parent's kind. The Forest (maple, oak) and Mountain (pine) already placed their kinds (notes 71
and 74). Placeholder: Maple seed and Pine cone sell for 5g like the Acorn, icons are blocks.

Not built, and left open for the owner: the three cosmetic (unchoppable) tree spots outside the
farm, and the regrow rule for felled trees outside the farm (SC-30 and SC-09 quote Stardew's 20
percent a night once the stump is gone, but the owner has not picked it for ours, and which
trees are cosmetic is a layout call, note 87). Per-type yields are the common tree's (12 wood
and Foraging bonus, 5 sap).
