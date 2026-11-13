# 35 Bundle item pools for slice 1 (draft)

Status: draft. Decided with the owner on 2026-10-31, except the item lists,
which are the assistant's proposal for the owner to reshape. Built as bundle data on 2026-11-07 (slice 1 hall): bundles 4, 5, 9, 10, 12
and 19 are in `bundles.json` with the five machine rewards and 20 coal, next to
the four first-slice bundles, so the hall has ten. The calendar has only spring
and summer, so some pools use stand-ins, listed under "Placeholders in the built
data" below. Bundle 4 and bundle 9 are fillable only through those stand-ins.
It answers the slice 1 half of #181 and the pools that `33_build_order.md`
lists as design still needed: bundles 1 to 10, 12 and 19, and the fall and
winter lists they draw on (#61). Every count and item is a placeholder. Prices
and growth days for new items go in `07_tuning_numbers.md` when the lists are
final.

Item names are plain plant and food names of our own choosing. Stardew's
Community Center page was read as reference only (ADR 0002); no text is copied.

## Decisions (2026-10-31)

1. **The greenhouse arrives in slice 4, as in Stardew.** Stardew's Pantry needs
   every one of its bundles, the animal bundle included, before the greenhouse
   is restored. Ours is the same: the Larder needs bundle 11, which needs
   animals. Slice 1 therefore does not build the greenhouse, and year one's
   winter is thinner than `33_build_order.md` first said.
2. **Bundle 20 leaves slice 1.** Oil needs the oil maker, a slice 4 machine
   that needs slime from the creatures of slice 3. Lamps need a battery pack
   and Farming level 7. Slice 1 fills only bundle 19 of the Hearth. Bundle 20
   waits for slice 4 (or slice 3 if the oil maker's cost changes).
3. **The Foragers' Shelf and four Larder bundles finish in slice 1.** Bundles
   1 to 10 and 12 can be filled. Bundle 11 waits for animals.

## New lists

A player's first year runs spring, summer, fall, winter, so a seasonal bundle
can be missed once and filled in year two. Goods keep, so a player who is
hinted early can stock up. The bundle hints say which season a good comes from.

### Fall crops (slice 1, #61)

A mix of single harvest and regrowing, with the highest value crops of the
year (`26_seasons.md`). Corn already grows in summer and fall.

| Crop | Kind | Note |
| --- | --- | --- |
| Pumpkin | Single, slow | The top value fall crop |
| Eggplant | Regrows | Steady income |
| Sweet potato | Single | A steady mid value crop |
| Beet | Single, fast | A quick catch-up crop |
| Cranberry | Regrows | Berry, so a fruit for jam and wine |
| Artichoke | Single | Mid value |
| Corn | Regrows | Summer and fall, already in `crops.json` |

### Fall forage

Eight goods, so a player who misses a few can still fill bundle 3: bramble
berry, hazelnut, wild plum, field mushroom, crab apple, rose hip, chestnut and
wild garlic. The berries and plums are fruit for jam and wine.

### Winter forage

Seven goods, since winter forage is thinner. Crocus, snowdrop, winter cress, pine
nut and holly sprig spawn on forage spots. Frost root and snow tuber come from
tilling soil in winter (decided 2026-10-31, as in Stardew). Winter has no crops,
so these are also the winter goods for eating, the seed maker and gifts. The
numbers for every list here are in `07_tuning_numbers.md`.

### Rare finds

Found at a low chance on a forage spawn, or on the mine floors, not on a fixed
spot. They are the goods of bundle 6: morel (spring), chanterelle (fall),
snowcap mushroom (winter), wild ginger (any season) and cave mushroom (mine
floors 1 to 10). Moss is not a rare find: it grows on mature trees (see
`34_crafting.md`). A player hunts across the year for three of them.

## The pools

"N of M" as in `16_bundles.md`. Any quality counts unless stated.

| # | Bundle | Rule | Pool | Reward |
| --- | --- | --- | --- | --- |
| 1 | Spring Foraging | 4 of 6 | Daffodil, wild leek, dandelion, wild horseradish, spring onion, salmonberry (as built) | 15 parsnip seeds |
| 2 | Summer Foraging | 3 of 4 | Wild grape, spice berry, sweet pea, fiddlehead fern (as built) | 15 radish seeds |
| 3 | Autumn Foraging | 4 of 6 | Bramble berry, hazelnut, wild plum, field mushroom, crab apple, rose hip | 15 beet seeds |
| 4 | Winter Foraging | 3 of 5 | Crocus, snowdrop, winter cress, pine nut, frost root | Seed maker |
| 5 | Woodland | All | 50 wood, 50 stone, 30 fiber | Charcoal kiln |
| 6 | Rare Finds | 3 of 5 | Morel, chanterelle, snowcap mushroom, wild ginger, cave mushroom | Heavy Tapper recipe (changed 2026-11-12, was 5 forage dishes; note 92) |
| 7 | Spring Crops | 4 of 6 | Parsnip, potato, cauliflower, green bean, kale, garlic | 20 fast-grow fertilizer |
| 8 | Summer Crops | 4 of 6 | Melon, tomato, radish, hot pepper, corn, red cabbage | 20 quality fertilizer |
| 9 | Autumn Crops | 4 of 6 | Pumpkin, eggplant, sweet potato, beet, cranberry, artichoke | Bee house |
| 10 | Quality Crops | 3 of 4, 5 each, silver or better | Parsnip, melon, pumpkin, corn | Preserves jar |
| 12 | Artisan Goods | 4 of 6 | Jam, pickles, honey, apple, cherry, wine | Keg |
| 19 | Smith's | All | 5 copper bars, 5 iron bars, 3 gold bars | 20 coal |

Bundles 11 and 20 to 26 are not slice 1 (their pools are in `63_bundle_pools_part_two.md`) and keep their rules in
`16_bundles.md`, except bundle 20 (see Decisions).

### Notes on the pools

- **Bundles 1 and 2 are the built pools**, unchanged. `bundles.json` already
  matches. Bundle 3's 15 autumn seeds need a name that the fall crop list
  settles: they are 15 beet seeds, a fast crop that is still useful in fall.
  The pick of beet is the assistant's proposal (see Open).
- **Bundle 4 is the only forage bundle with a winter-only pool.** Three of five
  is lenient on purpose. Missing winter in year one means waiting a year, so
  the room reward (herb and seed stall) is the one most likely to slip.
- **Bundle 5 asks for bulk gathering.** 30 fiber is 30 pulls of grass or weeds,
  which the weeds note (`29_weeds.md`) makes easy. The quantities are small
  beside Stardew's and stay placeholders until gathering rates are known.
- **Bundle 6 sets rare finds to a low spawn chance** per forage spawn and per
  mine floor. The numbers go in `07_tuning_numbers.md`. The Rare Finds bundle
  is slow by design and the rule is only three of five.
- **Bundle 10 is the one quality rule.** Silver or better, 5 each. By the crop
  grade formula in `07_tuning_numbers.md` a level 5 farmer gets about 11 percent
  gold and 22 percent silver, so about a third of a harvest qualifies and 15
  qualifying crops means growing about 45. Quality fertilizer (the reward of
  bundle 8) helps. Stardew asks for gold here, and ours stays at silver per
  `16_bundles.md`.
- **Bundle 12 cannot ask for keg goods.** Its reward is the keg, so wine,
  juice and mead would need the keg to fill the bundle that gives it.
  `33_build_order.md` listed jam, pickles, wine, juice, honey and seeds. The
  pool here replaces juice and seeds with raw orchard fruit (apple, cherry),
  which Stardew's artisan bundle also takes. Jam, pickles and honey come from
  slice 1 machines; wine stays as an option for a player who crafted a keg at
  level 8. Four of six can be filled with no keg: jam, pickles, honey plus an
  apple or a cherry. Apple and cherry come from fruit trees (28 days to grow).
- **Bundle 19 needs ore bought from the smith dwarf** until slice 3. Her
  prices set how hard it is. With the furnace gift, five copper bars is one
  trip to the mine.

## Placeholders in the built data

Added 2026-11-07. Each is a stand-in for a good the calendar cannot yet supply
(no fall or winter). When build 4 adds the seasons, swap the pool back to the
table above. Every stand-in item exists in the game today.

- **Bundle 4 (Winter Foraging), 3 of 5:** spring onion, salmonberry, wild
  grape, spice berry and fiddlehead fern, in place of crocus, snowdrop, winter
  cress, pine nut and frost root. The hint no longer names a season.
- **Bundle 9 (Autumn Crops), 4 of 6:** hot pepper, corn, red cabbage, green
  bean, kale and garlic, in place of pumpkin, eggplant, sweet potato, beet,
  cranberry and artichoke. These are the six spring and summer crops that the
  built Spring Crops and Summer Crops bundles do not use.
- **Bundle 10 (Quality Crops), 3 of 4, 5 each at silver or better:** parsnip,
  melon, corn and tomato, with tomato in place of pumpkin.
- **Bundle 12 (Artisan Goods), 4 of 5:** jam, pickles, honey, cherry and peach.
  Wine is dropped (the reward is the keg) and peach, which bears in summer,
  stands in for apple, which bears in fall. Four of five is filled by cherry,
  peach and two of the three machine goods, so a keg is never needed.
- **Bundles 7 and 8** stay as built (3 of 3, 300g and 400g), not the 4 of 6
  pools above, so bundle 9 can use the other six crops.
- **Bundle 19 (Smith's)** is as designed. Ore comes from the mines or the smith
  dwarf's shop; the furnace is her gift.

## Dependencies this creates

- Bundle 12 needs bundle 9's bee house for honey and fruit trees for apple or
  cherry, so a fast player cannot fill it before about the middle of summer.
- Bundle 10 needs a fall crop (pumpkin) or the corn, so it cannot finish
  before fall.
- Bundles 3, 4 and 9 follow the calendar. A player who ships everything in year
  one still has a gap between summer and winter. That is intended.

## Open

- **The reward seeds on bundle 3** are 15 seeds of a fall crop. The assistant
  proposes beet, the fastest, but the owner has not chosen.
- Check the fall numbers in play, above all artichoke (see `07_tuning_numbers.md`).
- Whether apple and cherry trees fit slice 1, or the cut order drops fruit trees
  (`33_build_order.md`). If trees are cut, bundle 12's pool needs two other
  goods that slice 1 can make, such as a second jam and a second pickle.
- The hint text for each bundle (#180).
- The Last Seat quantities and the second-year rule stay in #181.
