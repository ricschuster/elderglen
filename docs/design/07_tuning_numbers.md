# 07 Tuning numbers (draft)

Status: draft. Every number the first playable uses, in one place, so playtests
can say "too slow" and point at a number. Nothing here is balanced yet.

"From memory" means the value was recalled from Stardew Valley and not checked
against any source. Our own values are marked as such. Per ADR 0002 we copy no
content, so any value can change freely once playtests say so.

## Day and energy

Source: `src/core/clock.ts`, `src/core/energy.ts`, `src/core/day.ts`,
`src/scenes/FarmScene.ts`.

- The day runs from 6:00 am to 2:00 am (20 hours). From memory.
- One clock tick is 10 game minutes every 7 real seconds, so a full day is
  about 14 real minutes if the player only stands still. Ours, unchecked.
- Maximum energy is 270. From memory.
- Each tool use costs 2 energy and no game time. Ours: time per action is not
  modelled yet, so energy is the real limit and the clock is only pressure.
- Sleeping before the day is over restores all energy for free.
- Passing out costs 10 percent of money, capped at 1000. The next morning has
  50 percent energy after running out of energy and 75 percent after staying up
  too late. From memory.

## Money and shop

Source: `src/core/save.ts`, `src/core/toolbar.ts`, `src/content/crops.json`.

- A new game starts with 500g and 15 parsnip seeds. Money from memory, seeds
  ours.
- Seeds cost the listed seed price and goods sell for the listed sell price.
  Seeds can be sold back for half the price they cost (rounded down). Ours.

Crops (season, days to grow, seed price, sell price):

- Parsnip: spring, 4 days, 20g, 35g. From memory.
- Potato: spring, 6 days, 50g, 80g. From memory.
- Cauliflower: spring, 12 days, 80g, 175g. From memory.
- Melon: summer, 12 days, 80g, 250g. From memory.
- Tomato: summer, 11 days then regrows every 4, 50g, 60g. From memory.
- Radish: summer, 6 days, 40g, 90g. From memory.
- Green bean: spring, 10 days then regrows every 3, 60g, 40g. From memory.
- Kale: spring, 6 days, 70g, 110g. From memory.
- Garlic: spring, 4 days, 40g, 60g. From memory.
- Hot pepper: summer, 5 days then regrows every 3, 40g, 40g. From memory.
- Corn: summer, 14 days then regrows every 4, 150g, 50g. From memory.
- Red cabbage: summer, 9 days, 100g, 260g. Checked against the saved Crops page (2026-11-06). Stardew sells its seed from year two only. We do not.
- Wheat: summer and fall, 4 days, seeds 10g, sells 25g, inedible, grain for the Fodder bundle (`63_bundle_pools_part_two.md`). Checked against the saved Crops page (2026-11-06). **Not built:** it is not in `crops.json` or `src/`, so the Fodder bundle and beer have no grain yet. Whether to add it is the owner's call (audit, 2026-11-10).

Fall crops (decided 2026-10-31, `35_bundle_pools.md`). The owner chose to match
the saved Stardew Fall Crops page for our equivalents, as spring and summer do.
Our names and items. Unchecked in play:

- Pumpkin: fall, 13 days, 100g, 320g. Not food.
- Eggplant: fall, 5 days then regrows every 5, 20g, 60g.
- Sweet potato: fall, 10 days, 60g, 160g.
- Beet: fall, 6 days, 20g, 100g.
- Cranberry: fall, 7 days then regrows every 5, 240g, 75g. Gives 2 berries a
  harvest, so crops need a yield field in `crops.json`.
- Artichoke: fall, 8 days, 30g, 160g. Stardew holds it back to year 2. Ours is
  open in year one, which makes it the best value fall crop. Check in play, and
  hold it back if it does too much.
- Corn already grows in summer and fall (14 days then every 4, 150g, 50g). Its
  season list in `crops.json` adds fall.
- Crops that are alive when fall ends die, as spring and summer crops do. There
  are no winter crops outdoors, and the greenhouse is built (`greenhouse.ts`).

A crop grows one day for each day it was watered. It does not regrow after
harvest, and it withers when its season ends. Rain waters every plot overnight.

## Seasons and weather

Source: `src/core/calendar.ts`, `src/core/weather.ts`.

- A season is 28 days and there are four (spring, summer, fall, winter, see
  `26_seasons.md`; the first playable has two). From memory for the length.
- Chance of rain per day is 20 percent in spring and 15 percent in summer. The
  first day of a season is always sunny. Ours.
- Tomorrow's weather is rolled a day ahead and shown when the player uses the
  bed, like Stardew's TV forecast.

Fall, winter and storms (decided 2026-10-31, from the saved Stardew Weather and
Lightning Rod pages where marked, otherwise ours and unchecked):

- Rain chance per day: fall 20 percent (ours, matching spring). Winter has no
  rain and no storms, as in Stardew. Winter snow replaces it: 30 percent of
  days (ours, the saved pages give no chance). Snow is only a look and a
  forecast, since no crop grows outdoors.
- Storms: a rain day in spring, summer or fall is a thunderstorm 25 percent of
  the time (ours). A storm waters the plots like rain and the forecast names
  it. Storms never happen in winter, and a festival day is always sunny, so a
  festival beats a storm.
- Fixed storms (Stardew): summer day 13 and day 26 are always storms, every
  year, on top of the random ones. The first day of a season stays sunny.
- Strikes (Stardew's model, with our numbers): on a storm day, every 10 game
  minutes while the farmer is awake there is a 3 percent chance of a strike
  (ours). About 2 to 3 strikes if the farmer is up from 6 am to 8 pm, and more
  the longer they stay up, as the saved page says.
- A strike lands on a lightning rod with chance `1 - (charged rods / all rods)²`
  (Stardew's formula). With no rod, or when it misses, it does nothing: our
  storms never harm the farm (`34_crafting.md`). A rod that is hit makes one
  battery pack the next morning and ignores more strikes that day. A rod can be
  anywhere on the farm map, and the player need not be on the farm when the
  strike lands (both Stardew).
- Expected packs: a single rod always catches the first strike, and a storm
  day has at least one strike about 9 times in 10 (3 percent over 84 ten
  minute ticks), so one rod makes about 0.9 packs a storm. A second rod only
  pays if a second strike falls. At 20, 15 and 20 percent rain with a quarter
  of rain days stormy there are about 1.4, 1 and 1.4 random storms a season,
  plus the 2 fixed ones in summer, so roughly 6 storms in the three seasons.
  Packs are only wanted from slice 3, when the rod arrives (bat wing, decided
  2026-10-31), so storms are weather only in slice 1. Six storms may be too few
  if lamp-posts, the crystalarium and more are each wanted.
  Raise the storm share or the strike chance if play finds packs scarce.

  Built (#522, weather only): `stormy` is a weather, 25 percent of rain days outside
  winter (`STORM_SHARE`), summer days 13 and 26 always (`FIXED_STORM_DAYS`),
  festival days and day 1 still sunny. It waters like rain, the bed forecast and
  morning report name it. Strikes, rods and packs were built in placement step 3 (note 89).

## Foraging

Source: `src/core/forage.ts`, `src/content/forage.json`.

- Up to a quarter of the farm's forage spots hold a good each morning, and the
  count is random from none to that cap. Ours.
- Spring goods: daffodil 30g, wild leek 60g, dandelion 40g, wild horseradish
  50g. Summer goods: wild grape 80g, spice berry 80g, sweet pea 50g. Later additions: spring onion 8g, salmonberry 5g (spring) and
  fiddlehead fern 90g (summer). The prices
  are ours and unchecked.
- Fall goods (decided 2026-10-31, from the saved Stardew Fall page where our
  good has an equivalent, otherwise ours): bramble berry 20g (energy 25),
  hazelnut 90g (30), wild plum 80g (25), field mushroom 40g (38), crab apple
  30g (20), rose hip 45g (15), chestnut 50g (30), wild garlic 35g (15).
  Bramble berry, crab apple, rose hip, chestnut and wild garlic are ours. The
  bramble berry price is from memory.
- Winter goods (from the saved Stardew Winter page where matched): crocus 60g
  (not food), snowdrop 80g (not food), winter cress 40g (20), pine nut 70g (25),
  holly sprig 80g (not food), frost root 70g (10) and snow tuber 100g (30). The
  last two come from the soil, not forage spots (below). Snowdrop, winter
  cress and pine nut are ours.
- Winter soil digging (decided 2026-10-31, as in Stardew's Winter page):
  tilling farm soil in winter has a small chance to turn up a frost root or a
  snow tuber. Placeholder: 3 percent a tile, two thirds frost root. Stardew's
  chance is not in the saved page. Tilling any soil has a 3 percent chance of clay (placeholder, decided 2026-11-08, Stardew's Hoe page says tilling may yield clay but gives no chance). The hoe gives no ore on the farm.
- Rare finds (bundle 6): morel 150g (spring), chanterelle 160g (fall, energy
  75), snowcap mushroom 140g (winter), wild ginger 120g (any season, energy 20)
  and cave mushroom 200g (mine floors 1 to 10). Ours, with morel and chanterelle
  near Stardew's. A rare spawn is 5 percent of forage spawns in the season, and
  3 percent of the mine floor's forage spots. Placeholders.
- Forage spawn cap is unchanged in fall and winter (a quarter of spots).

## Skills

Source: `src/core/skills.ts`.

- Ten levels. Total XP needed: 100, 380, 770, 1300, 2150, 3300, 4800, 6900,
  10000, 15000. From memory.
- A forage pickup gives 7 XP. A harvest gives `floor(16 * ln(0.018 * price + 1))`.
  From memory.
- Levels raise the chance of better quality goods, and farming levels trim
  swing energy (see below). At level 5 each skill asks for a profession (see
  Professions). The farming and fishing level 10 choices are built.

## Professions

Source: `src/core/professions.ts`. One choice per skill at level 5, permanent.
After Stardew's level 5 choices, but with the animal and wood options replaced
by ones that fit our game. Ours, unchecked.

- Farming: Tiller (crops sell for 10 percent more) or Agriculturist (crops grow
  10 percent faster, which saves a day on a 12 day crop and nothing on a 4 day
  one).
- Foraging: Gatherer (20 percent chance of a second good) or Botanist (forage is
  never plain, at least silver).

Built 2026-11-11 (`23_animals.md`, decided 2026-10-30): Stardew's tree for
farming. Level 5 is Rancher (animal goods sell for 20 percent more) or Tiller.
Level 10 is Coopmaster or Shepherd under Rancher, Artisan (artisan goods 40
percent more) or Agriculturist under Tiller. Agriculturist moves to level 10.

Foraging professions, decided 2026-10-31 (planned, not built). After Stardew's
foraging tree, with our names. Level 5 is Forester or Gatherer. Level 10 is
Lumberjack or Tapper under Forester, Botanist or Tracker under Gatherer.
Gatherer stays as built. Botanist moves from level 5 to level 10, as
Agriculturist did. Botanist makes forage always the top grade (see Quality).
Tracker points arrows at off-screen forage, which also helps on a tablet.
Lumberjack and Tapper wait until trees and wood are a real system.

## Tool upgrades and energy

Source: `src/core/upgrades.ts`. Four tools (hoe, can, pickaxe, axe) have five tiers
(basic, copper, steel, gold, Hearthsilver). The smith takes 2000g, 5000g and
10000g for tiers 1 to 3 and nothing in gold for the Hearthsilver step, plus 5
bars of that grade (copper, iron, gold, Hearthsilver) each step, and keeps the
tool 2 days (`UPGRADE_COST`, `UPGRADE_BARS`, `UPGRADE_DAYS`; `44_tool_upgrades.md`).
From memory for prices.

- A swing costs `2 - 0.25 * tier - 0.1 * farmingLevel`, never under 0.5. The
  level term is from memory, the tier term is ours. Energy can now be
  fractional and the HUD rounds up.
- With 500g to start, an upgrade is a mid game goal.
- Playtest check (expert run, no upgrades bought): 7322g in hand when the last
  bundle was handed in on day 41 and 8297g after the end screen. So the 2000g
  and 5000g tiers are reachable well inside two seasons. The 10000g tier
  is not reached by day 41 by an expert who also funds every bundle; it is a
  late goal, which fits. A casual player will not reach it.

## Eating

Source: `src/core/actions.ts` (`eat`), `energy` fields in the content files.

- The player eats the held item with F or the Eat button. It takes no game time
  and is refused at full energy, so food is not wasted.
- Crops and most forage restore energy, with values from memory of Stardew:
  parsnip 25, potato 25, cauliflower 75, melon 113, tomato 20, radish 45,
  green bean 25, kale 50, garlic 20, hot pepper 13, corn 25, red cabbage 75,
  leek 40, dandelion 25, horseradish 13, wild grape 38, spice berry 25,
  salmonberry 25, fiddlehead fern 25, spring onion 5. Daffodil and sweet pea are
  not food. Fall crops: eggplant 20, sweet potato 45, beet 30, cranberry 38,
  artichoke 30. Pumpkin is not food. The fall and winter forage values are
  with their prices above.
- Silver restores x1.4, gold x1.8.

Stable (decided 2026-11-06, `59_horse.md`): 10,000g, Hardwood 100, Iron Bar 5, two
days, from the saved Stable page. Against the expert run above (7,322g on day 41)
it is a late goal, like the 10,000g tool tier. Hardwood supply is the open part
(built 2026-11-07: 2 per large stump, note 43; the Woodland farm has 6 that regrow
every 4 days, the Standard farm 3 that do not, so 100 is out of reach on Standard
until the Secret Woods exists).
The carpenter's temporary Hardwood sale (200g, owner 2026-11-08) is gone: the
Secret Woods supply replaced it (#639) and no shop code sells Hardwood now.

## Backpack

Source: `src/core/inventory.ts`, `src/core/upgrades.ts`. The backpack starts at
12 slots and can grow to 24 (2000g) and then 36 (10000g), bought in the shop.
Sizes and prices from memory. The toolbar shows 12 slots at a time; Tab or the
Row button moves to the next row, as in Stardew.

## Quality

Source: `src/core/quality.ts`. Quality is part of the item id (`parsnip@gold`),
so each tier stacks and sells separately. Bundles take any tier.

- Tiers: normal, silver (x1.25 price), gold (x1.5 price). Iridium is left out
  until there is a source for it. From memory.
- Crops: gold chance is `0.2 * farmingLevel / 10 + 0.01`; silver chance is twice
  that, so a level 10 farmer gets about 21 percent gold and 21 percent silver.
  The soil term is in: `0.2 * soil * (level + 2) / 12` is added to the gold chance (`src/core/quality.ts`). From memory.
- Forage: gold chance is `foragingLevel / 30`, silver up to `foragingLevel / 15`.
  From memory.
  Checked against the wiki on 2026-10-31: both formulas match.
- Top grade (decided 2026-10-31, not built): a fourth tier above gold, named
  after the rare metal, Hearthsilver (`22_mines.md`). Using the metal's name
  for the grade is an assumption, since the mines note only names the metal.
  Crops and forage get it, with Botanist guaranteeing it for forage. Its price
  and energy multipliers are open.
- Wild seeds (decided 2026-10-31): forage is crafted into seasonal seeds that
  grow into forage goods and give foraging XP. Built in M3 with crafting.

## Fishing (slices 1 and 2 and the bait and lures of slice 3 built, the rest not)

Source: `21_fishing.md`. All of these are ours and are placeholders.

Built numbers (`src/core/fishing.ts`, `src/content/fish.json`, `rods.json`):

- Cast: 1.2 s to full charge, 20 game minutes per cast, 8 energy at level 0 and 0.1 less per fishing level (`CAST_ENERGY`, `CAST_ENERGY_PER_LEVEL`). Bite wait 1.5
  to 4.5 s, hook window 1.4 s (3 s with assist).
- Odds weights by rarity: common 6, uncommon 3, rare 1. Dawn ends at 8 am, dusk
  is the 2 hours before nightfall.
- Bar: lift 3.2 and gravity 2.2 (track per second squared), meter starts 0.3,
  gain 0.22 a second, loss 0.1 a second, fish pace `0.15 + 0.55 * difficulty / 100`
  (smooth x0.7, dart x1.8, the sinker down and floater up x1.3). Assist: bar x1.3,
  pace x0.6, loss x0.5.
- River fish prices: Reedling 40, Brookslip 45, Millrun 55, Ferrywhisker 120,
  Salmon 150, Hearthside Dace 110, Tallow Eel 170, Silverthread 320, Old Mossback
  280.

- Rods: Reed Pole 50g, Hazel Rod 400g, Heron Rod 1500g, Hearthwell Rod 4000g.
  Every rod can hook any fish the season, time and weather allow, and no level
  gates rare fish (`bite` in `fishing.ts`, note 21). Rods differ in bar width
  and cast range.
- Bar width as a share of the track: 0.30, 0.36, 0.42, 0.50 by rod. Assist adds
  30 percent. Cast range in tiles: 4, 6, 8, 10.
- Bait: Plain 3g (wait x0.7), Fine 12g (x0.5), Salted 8g (sea only, x0.5).
  Lures last 20 casts: Glint 250g, Moth 150g, Storm 150g, Whirligig 200g (wait
  x0.7), Wide Float 200g (bar +15 percent), Sounding Float 200g (shows the hooked fish), Magpie Hook 300g (1 cast in 5 gives
  a small treasure: a coin purse of `40 + 15 * level` gold 6 times in 10, else a
  trinket worth 30 to 120g). The Heron Rod has one lure slot, the Hearthwell Rod two.
- Built with bait and lures: a bite wait of 1.5 to 4.5 s is multiplied by bait and
  the Whirligig, rare, night and rain weights multiply the draw, a Magpie Hook
  chest appears in the bar 1 in 5 fights, 1 to 3 s in, height 0.1 of the track, fetch
  fill 0.7 per s and drain 0.2 per s (purse share 0.6), trinkets Tin Spoon 30g,
  Glass Bead 45g, Brass Button 60g, Cracked Locket 90g, Ring Box 120g. Plain Bait,
  Fine Bait, Salted Bait and the seven lures are sold at the fisher's counter on the delta (2026-11-09, #640).
- Delta fish prices (2026-11-09): marsh lake Marshlight 45, Bogwhisker 50, Sunk Boot
  Loach 40, Reed Cat 150, Catfish 130, Bullhead 120, Glassy Elver 300. Sea: Sardine 40,
  Skiff Sprat 40, Mackerel 60, Mullet 55, Cod 70, Kelp Ribbon 110, Harbour Ray 160,
  Herring 100, Lantern Squid 170, Crowned Tunny 350. Shore goods: Periwinkle 20, Razor
  clam 40, Whelk 55, Cockleshell 60, Pearly shell 180, Spiral shell 200, Sea fan 90,
  Pin urchin 160, Seaweed 20. Tide pool footbridge: 300 wood. Forage caps: marsh 3,
  Beach 5, tide pools 1.2 a night.
- Fish sell prices by rarity: common 40 to 90g, uncommon 100 to 200g, rare 250
  to 500g, cove fish 400 to 700g. Legends (built, `fish.json`): Hearthwell Carp 4000g, Valley King
  3500g, Moonlit Mother 3500g, Grandmother Hush 3000g, Great Hearthfin 3000g.
  Pearl Lobster 800g.
- Pots: 150g in the shop, one bait a day (any bait), junk 38 in 100 or 30 with
  Fine Bait, else one catch. The odds below are for a catch day. Fresh: Crayfish 35 in 100 (40g),
  River Mussel 35 (45g), Ladle Snail 20 (70g), Marsh Clam 10 (90g). Salt: Crab
  30 (60g), Periwinkle 30 (50g), Spiny Shrimp 20 (100g), Pearl Lobster 20
  (800g).
- Pearl Lobster odds: about 3 in 100 sea bites on a rod, about 1 in 5 a day in
  a salt water pot on a catch day, so about 12 in 100 a day after junk.
- XP: the harvest formula on the fish price, times 1.5 for a perfect catch. The
  level curve is the shared one in Skills.
- Quality: size roll `random(0,1) * (0.5 + 0.05 * level) + 0.1 * castDistance`.
  Silver at 0.33, gold at 0.67. A perfect catch lifts silver or gold one grade.
  A skipped fight (assist level two) gives no perfect lift.

## Village hall

Source: `src/content/bundles.json`.

- Nineteen bundles are built (thirteen at first, then the Water room's six; the Pantry was dropped 2026-10-31, see
  `16_bundles.md`): the ten below, plus Animal Goods and the Weaver's
  ("Animal-goods machines" section) and the Dyer's ("Cask and dye vat" section). First
  slice: Spring Foraging (any 4 of 6, 15 parsnip seeds), Summer Foraging (any 3
  of 4, 15 radish seeds), Spring Crops (3 of 3, 300g) and Summer Crops (3 of 3,
  400g). Added 2026-11-07 (`35_bundle_pools.md`): Winter Foraging (3 of 5,
  seed maker), Woodland (50 wood, 50 stone, 30 fiber, charcoal kiln), Autumn
  Crops (4 of 6, bee house), Quality Crops (3 of 4, 5 each silver or better,
  preserves jar), Artisan Goods (4 of 5, keg) and the Smith's (5 copper, 5 iron
  and 3 gold bars, 20 coal). Contents and rewards are ours.
- **Water room (2026-11-10).** Bundles 13 to 18 are built, nineteen in all (pools and rewards in note 21, "Built in slice 4, part two"). Placeholders: Fisher's stew (1 carp, 1 potato, 150 energy, 220g), the Beach warp totem and the glow ring (kept, no use yet).
- **Pools after build 4 (2026-11-07).** The stand-in pools are gone. Winter
  Foraging takes crocus, snowdrop, winter cress, pine nut and frost root; Autumn
  Crops the six fall crops; Quality Crops has pumpkin back; Artisan Goods takes
  apple in place of peach. Wine stays out of Artisan Goods (its reward is the
  keg), so it is 4 of 5 where note 35 has 4 of 6.
  The foraging bundles took the new goods; the first four crop and forage bundles are unchanged, as decided in
  `08_playtest_personas.md`.
- Headless sim (`npm run sim`): the bot plays every bundle but Winter
  Foraging, Autumn Crops, Quality Crops (it models two seasons), Woodland,
  Artisan Goods and the Smith's, which need bulk gathering, machines and
  mining. The expert finished those seven in a median of day 54 (44 of 50 runs
  by day 168, the rest wait on silver melons and corn). Quality Crops ends the
  run. "All played bundles" in its output is not the whole hall.
- Foraging bundles are easy (the simulation below ran before the extra goods
  made them easier). A simulation of a player who sweeps all 14 farm
  spots every morning finished Spring Foraging in a median of 5 days (90th
  percentile 9) and Summer Foraging in 3 (90th percentile 6), with no failures
  in 2000 runs. A real player walks and spends time, so expect longer.

## Full hall (proposed, 13 of 30 built)

Source: `16_bundles.md`. All placeholders, ours unless marked.

- 30 bundles in six rooms (6, 6, 6, 3, 5, 4). The counts follow Stardew.
  Built so far (audit, 2026-11-10): 13 bundles across Foragers' Shelf (4),
  Larder (6), Hearth (2) and Guests' Board (1), and all six rooms in
  `rooms.json` with the thresholds below. The Water room and The Last Seat have
  no bundles yet (the Water room waits on bundles 13 to 18).
- Rooms appear by bundles finished: Foragers' Shelf at the start, Larder and
  Water room after 1, Hearth after 2, Guests' Board after 3, The Last Seat after
  20 of the other 26. Stardew's pattern comes from a forum reply and is
  unchecked.
- The Last Seat asks for 3 of each of four dishes, four gold fish, 10 bars, 5
  lamps, 5 bolts of cloth, 3 dyes, and for the last bundle 100 wood, 100
  stone, 20 bars, 10 bolts of cloth and 5,000g.
- The mines open on a fixed day announced by Old Greencoat. The day is not
  chosen.

## Mines and combat (floors and combat built in part, see `22_mines.md`)

Source: `22_mines.md`. All of these are ours and are placeholders. Stardew facts
are from memory and unchecked.

- 120 floors in three bands of 40 (copper, iron, gold). Iron nodes from floor 26 (owner, 2026-11-08): 6 percent of rocks on floors 26 to 40, 22 percent on 41 to 80, 6 percent from 81 (`mine-bands.json`, `fromFloor`). Hearthsilver on floors 100
  to 120. The lift stops at every floor once reached. A rest camp with a loot chest
  every 10 floors, no healing.
- Opening day: Spring day 5. Dry-streak ladder odds: 1 percent plus 0.5 percent per
  miss, capped at 25 percent. A killed creature rolls the same chance.
- Smelting: 5 ore and 1 coal a bar (2 coal for Hearthsilver), 30 minutes for copper, 2 hours for iron and about 5 hours for gold, as Stardew (decided 2026-11-03).
  The smith dwarf sells copper, iron and gold ore and coal, never bars. She gifts
  the furnace the morning after the first copper ore is handed over. Crafting it
  at mining level 4 makes more furnaces.
- Smith ore prices: copper ore 25g, iron ore 50g, gold ore 100g, coal 50g (about
  2.5 times the bar's sale value). Bars sell for about 60g, 120g and 250g, from
  memory.
- Charcoal kiln (Woodland bundle reward): 10 wood for 1 coal. Craft cost 2 copper
  bars and wood.
- Health 100, plus 5 per combat level. A touch costs 4 to 12. Grace after a hit is
  1.5 seconds (2.5 with the Nimble profession).
- Defeat: 10 percent of money lost, capped at 1000g (the pass-out rule), up to 3
  random stacks lost (1 in 3 each), one stack posted back. No loss of tools,
  weapons, seeds or bundle items. Assist mode loses no items.
- Professions at level 5: Prospector or Rockhound (mining), Steady or Nimble
  (combat).
- Fifth tool tier: 5 Hearthsilver bars per tool, no gold. Any pickaxe digs it.
  Built 2026-11-08 with placeholders: smelt time 8 hours (480 minutes, unsettled in note 22), bar sells 1000g, top pickaxe swings 1 (stone to iron), 1 (gold), 2 (Hearthsilver rock), top axe 2 per tree and 1 per stump (note 44).
- Weapons: three families, four tiers each. The first build has the starter and
  copper tier of each.
- Weapon shop at the smith dwarf (#708, 2026-11-09, placeholders, no gate): the forged tiers
  are sold for coin, each priced as the old gold fee plus the bars at their sell value
  (copper 60, iron 120, gold 250, Hearthsilver 1,000). Copper tier 440g (was 4 bars and 200g),
  iron 880g (4 bars and 400g), gold 1,800g (4 bars and 800g), Hearthsilver 6,500g (5 bars and
  1,500g). All three families of a tier cost the same. Forging is off the screen, code kept.
- Built 2026-11-08 (part one of combat, note 22, all placeholders): food heals half
  its energy value. Pebbleback 3 health, touch 4, 24 px/s, sight 5 tiles, wind up
  0.6 s, pause 1 s; Dustmoth 2 health, touch 4, 20 px/s, sight 4, wind up 0.6 s,
  pause 1.2 s. A weapon hit dazes a creature 0.4 s. Assist: damage times 0.5 (up),
  wind up times 1.5. Weapons: Hazel Switch 2 damage, 0.35 s, 120 degrees; Rolling
  Pin 3, 0.8 s, 220 degrees, 4 targets; Pocket Sling 1, 0.7 s, 4.5 tiles; copper
  tier 3, 5 and 2 damage, forged for 4 copper bars and 200g. Creatures per floor
  2 to 5 (band 1). Drops: Pebbleback stone (always, 1 to 2) and copper ore (30
  percent); Dustmoth moth dust (60 percent, sells 30g) and fibre (50 percent).

- Built 2026-11-08 (part two of combat, note 22, all placeholders): creatures
  by band. Band 1: Rock Crab 6 health, touch 5, sight 2, armoured front; Mossbeetle
  5, touch 5, dash 120 px/s for 0.6 s; Gloop 3, touch 4, hops at 50 px/s, splits
  into a 1 health small one. Band 2: Frostnibbler 5, touch 6; Icicle Hopper 6,
  touch 7; Cave Bat 4, touch 8, dash 0.9 s; Nabbler 5, touch 6; Blue Gloop 5,
  touch 7. Band 3: Cinder Pup 8, touch 10; Lanternmoth 6, touch 9, pulse reach 3.5
  tiles; Old Digger 10, touch 12; Ember Gloop 8, touch 10. Wind ups 0.6 to 0.9 s.
  XP per kill 2 to 5, 8 to 10, 14 to 18 by band. Ring sources (note 94, placeholders): Defense ring +1 1000g after meeting the trainer, iron defense ring +5 5000g from mine floor 40, slime proof ring rebuy 25000g, Sturdy band craft 2 copper bars, 25 moth dust, 25 gloop jelly at Combat 1. Slayer goals: Pebbleback 30,
  Dustmoth 500, Rock Crab 60, Mossbeetle 80, Gloop 1000 (all colours), Frostnibbler
  100, Icicle Hopper 100, Cave Bat 200, Nabbler 60, Cinder Pup 150, Lanternmoth
  150, Old Digger 50. Steady +25 health, Nimble 2.5 s grace. Weapon damage by
  tier (starter, copper, iron, gold, Hearthsilver): blade 2, 3, 5, 7, 10; club 3,
  5, 8, 11, 15; sling 1, 2, 3, 5, 7. Forging: iron 4 bars and 400g, gold 4 bars
  and 800g, Hearthsilver 5 bars and 1500g. Drop sell prices 5 to 50g.

## Animals (draft; slice 1 built 2026-11-08)

Slice 1 built (`animals.ts`), all placeholders: base coop 4000g, 300 wood, 100
stone, 3 days, holds 4. Chicken 800g, grows in 4 fed days, one egg a night (50g,
energy 50, from memory). Silo 240 hay (100g, 100 stone, 10 clay, 5 copper bars, 2 days), hay 50g each at the carpenter, a cut weed
gives 2. Pet +15 friendship and +32 mood, grass +8 and 255 mood, unfed -20 and
-100, unpetted -10 and -30, slept outside halves mood. Start friendship 0, mood
128. Slice 2 (coop tiers) built, placeholders: big coop 10000g, 400 wood, 150 stone,
deluxe 20000g, 500 wood, 200 stone, 3 days each, holds 8 and 12. Duck 1200g,
egg (95g) every 2 fed nights, feather (250g) in place of the egg 25 percent of
the time at friendship 800 or more. Rabbit 8000g, wool (340g) every 4 fed
nights. Duck egg energy 75. Auto-feeder at the deluxe tier. Sell prices are
ours. Slice 3 (barn) built, placeholders: barn 4000g, 300 wood, 100 stone, big
10000g, 400 wood, 150 stone, deluxe 20000g, 500 wood, 200 stone, 3 days each,
holds 4, 8 and 12. Cow 1500g (base barn), milk 125g daily. Goat 4000g (big
barn), goat milk 225g every 2 fed nights. Sheep 8000g (deluxe barn), wool
(340g) every 3 fed nights, Moonwool 1200g with a 5 percent chance at friendship
800 or more, mood 70 or more. Pig 16000g (deluxe barn), truffle 625g on a fed
night it was let out. Incubator: big coop, one egg, hatches in 6 nights.
Auto-feeder at the deluxe barn. Sell prices are ours.

Source: `23_animals.md`. All of these are placeholders. Stardew facts were
checked against the Stardew Valley Wiki on 2026-10-30.

- Coop and barn, three tiers each, holding 4, 8 and 12. Building costs start near
  Stardew's: 4000g, 10000g and 20000g, plus wood and stone.
- Animals: chicken 800g, cow 1500g, duck 1200g, goat 4000g, rabbit and sheep
  8000g, pig 16000g. Each tier opens its species.
- Timers: chicken and cow daily, duck and goat every 2 days, sheep every 3 days,
  rabbit every 4 days, pig daily when let out (none in winter or rain).
- Friendship 0 to 1000 and mood 0 to 255, as in Stardew. Sleeping outside costs
  mood and that day's product, never friendship.
- A young animal grows up in about 4 to 5 days. The incubator hatches in about 6.

## Day, energy and season check against the wiki (2026-10-31)

Checked against the Stardew Valley Wiki pages Day Cycle, Energy, Spring, Summer,
Fall and Winter. Reference only, nothing copied (ADR 0002).

Confirmed, so "from memory" can become "checked": the 6 am to 2 am day, 14 real
minutes for a full day (10 game minutes per 7 seconds), 270 maximum energy, the
10 percent pass-out loss capped at 1000g, a 50 percent morning after exhaustion,
28 day seasons, spring crops dying on day 1 of summer, and the spring and
summer crop rows for parsnip, potato, cauliflower, garlic, kale, melon, radish
and red cabbage (days, seed price, sell price).

Decided with the owner on 2026-10-31 (not built yet):

- Late sleep gets a graded penalty: full energy up to midnight, then a growing
  loss per 10 minutes after it, and half at 2 am. A pass-out at 2 am is the
  half case, so the flat 75 percent goes.
- Exhaustion works like Stardew. Warnings near 20 and 15 energy. At 0 the player
  is exhausted: slow, tools still work and drain below zero. The day ends at
  -15. The next morning has half energy, even if the player ate in between.
- Pass-out loses money only outside the farmhouse.
- The morning after a skill level gives full energy, whatever the night was.

- Nightfall moves by season, as in Stardew: 8 pm in spring and summer, 7 pm in
  fall, 6 pm in winter, with a gradual darkening outdoors. Built (`NIGHTFALL`
  and `darkness` in `clock.ts`): the light fades from an hour before nightfall
  over 90 minutes.
- The clock stops while any menu or dialog is open (shop, hall, inventory,
  prompts), so slow touch menus never cost game time. Built: a screen pauses the
  farm scene (`FarmScene.ts`).
- Seasons three and four have their own design note and are built.

Differences found (the four above are now decided):

- Late sleep: Stardew restores less the later you go to bed after midnight
  (nothing lost until 12:10 am, a small step per 10 minutes, a bigger drop at
  1 am, half at 2 am). We restore fully for any sleep before the day is over and
  75 percent after a time pass-out. Passing out at 2 am is the 50 percent case
  there, so our 75 percent is too kind.
- Exhaustion: in Stardew, 0 energy is a state (slow, tools still work) and the
  day only ends at -15. We end the day at 0.
- Pass-out location: Stardew charges nothing for falling asleep inside the
  farmhouse. We charge always. Matters once the farm has more than one place.
- Level-up morning: Stardew gives full energy the morning after a skill level,
  whatever the night was. We do not.
- Nightfall: 8 pm in spring and summer, 7 pm in fall, 6 pm in winter, with a
  gradual darkening. Built since this was written (audit, 2026-11-10).
- Pauses: the clock stops in menus and dialogs there. Ours does too (built).
- Seasons: new forage, logs, rocks and grass appear on the farm at the start of
  each spring. Winter clears crops and weeds and stops outdoor growth. Fall and
  winter are built, see their notes.
- The late sleep, exhaustion, pass-out location and level-up morning rows are
  still not built (audit, 2026-11-10): `day.ts` keeps the flat 50 and 75
  percent wake energy and ends the day at 0 energy.
- Not on these pages: the rain chance per season. Our 20 and 15 percent stay
  ours, and fall and snow chances are ours too (above).

## Weeds, fiber, sap and common trees (2026-10-31)

Full rules in `36_gathering_trees_sap_fiber.md`.

- Fiber: 50 percent from a cut weed. Grass gives hay only (as Stardew).
- Sap: 5 from chopping a mature tree, 1 from its stump (as Stardew).
- Tree chop: 12 to 16 wood, 0 to 2 seeds. Stump: 4 to 9 wood. Young tree: 4.
- Loose seed 5 percent a day, spread 15 percent a night within 3 tiles, off-farm
  regrowth 20 percent a night (all as Stardew).
- Ours, placeholder: 20 weeds on day 1 of spring, summer and fall, capped by
  free tillable tiles; weed spread 10 percent a night (rain 20, summer 15).
- Tree growth is Stardew's: 20 percent a night per stage, stage 4 twice as
  long, none in winter, fertilizer 5 days.
- Sell prices (2026-10-31, Stardew's, from the saved Foraging and Fiber pages):
  sap 2g, fiber 1g. Fiber is always normal quality. Sap cannot be eaten, which
  is ours: Stardew lets it be eaten for -5 energy.

## Start options (decided 2026-10-31, not built)

Audited 2026-11-10: no margin setting exists in `src/` (profit margin is not
built). Farm types are built (build 9, below).

- Profit margin: one setting for single player and multiplayer, chosen when
  starting a game. See "Profit margin" below. Bundle remix and a year-one
  guarantee are not offered for now.

## Profit margin (decided 2026-11-02, not built)

Checked against the saved Stardew Multiplayer page (Profit margins). Numbers
are ours where stated.

- **Steps:** 25, 50, 75 or 100 percent, default 100 (Stardew). The page warns
  that 25 makes early gold much harder to come by.
- **Where:** both modes, one setting at game creation. Stardew's page covers
  multiplayer only; single player is not checked. It is for balance against more
  players farming in multiplayer, and a difficulty dial for casual play in
  single player.
- **What scales (Stardew):** the sale price of goods, and the seed price at the
  shop. Seeds sold back still pay half the scaled price, rounded down (ours).
- **What does not scale (Stardew):** buildings and cabins, tool upgrades, other
  shop items, request rewards and village hall bundle items.
- **Rounding (ours):** price times margin, rounded down, never below 1g. The
  Stardew example is Wheat at 25 percent selling for 6g instead of 25g, which
  fits rounding down.
- **Fixed on purpose:** costs that do not scale make a low margin harder, which
  is the point. Playtest 25 before keeping it.
- **Fixed at creation (decided 2026-11-06, as Stardew).** This replaces the
  2026-11-03 decision that the host can change it later. The saved Multiplayer
  page says Stardew fixes the margin when the farm is made and only save editing
  changes it (SC-26). Ours is chosen at farm creation (25, 50, 75 or 100
  percent) and has no in-game setting, so there is no Options entry to design.
  In single player the player is the host and picks it at the same screen.

## Farm tools, trees and machines (2026-10-31)

Decided with the owner. Prices and formulas are Stardew's, from the saved
Sprinkler, Fertilizer, Fruit Trees, The Cave and Artisan Goods pages, unless
marked ours. Recipes are in `34_crafting.md`.

- Sprinkler sell prices (built 2026-11-07, as items): sprinkler 100g, quality sprinkler 450g (the
  iridium sprinkler, 1,000g, is not built: it needs iridium). Sprinklers are crafted and never sold in the shop.
- Fertilizer shop: basic fertilizer, basic retaining soil and speed-gro cost
  100g from Spring 15 of year 1. Quality fertilizer, quality retaining soil and
  deluxe speed-gro cost 150g from year 2. Sell prices: basic fertilizer 2g,
  quality fertilizer 10g, basic retaining soil 4g, quality retaining soil 5g,
  speed-gro 20g, deluxe speed-gro 40g.
- Fertilizer yield per craft: basic fertilizer 1, quality fertilizer 2, basic
  retaining soil 1, quality retaining soil 2, speed-gro 5, deluxe speed-gro 5.
  Our speed fertilizer takes the speed-gro slot (`34_crafting.md`). Built
  (`fertilizer.ts`, audit 2026-11-10): five items only, with one speed fertilizer
  (+10 percent growth, 20g sell, 100g buy) and no deluxe speed-gro. Shop prices
  are 100g and 150g from year 2 as above, and the sell prices match. Craft
  recipes exist for basic fertilizer and basic retaining soil only.
- Sprinkler add-ons are a Ring 2 item (owner, 2026-10-31), not in slice 1.
  Stardew sells 4 for 20 Qi Gems in the Walnut Room and rarely drops them from
  monsters in special quests (saved Pressure Nozzle and Enricher pages). Ours
  come from the warden head, our Qi-type figure (`09_story_and_lore.md`), in a
  Walnut Room-type offer. Her token, price and the rest of the offer are open
  until Ring 2 is designed. Their Stardew rules: both sell for 200g, a sprinkler takes one
  add-on, a nozzle widens reach to 3x3, 5x5 or 7x7 by tier, an enricher holds
  one fertilizer type, and a picked-up sprinkler gives its add-on back as an
  item.
- Fruit sapling prices, from Pierre's: apricot 2,000g, cherry 3,400g, peach
  6,000g, orange 4,000g, apple 4,000g, pomegranate 6,000g, 25,400g for all six.
  Banana and mango are Ginger Island trees and are left out.
- Fruit trees: 7 days a stage, 28 in all. Apricot and cherry bear in spring,
  peach and orange in summer, apple and pomegranate in fall.
- Fruit sell prices (normal quality, silver and gold use our x1.25 and x1.5):
  apricot 50g, cherry 80g, orange 100g, apple 100g, peach 140g, pomegranate
  140g. A tree's fruit gains one grade per year of age after maturity, to gold
  after two years. A third year waits for the top grade (see Quality).
- Fruit trees built 2026-11-07 (placeholders, ours unless the line above says
  otherwise): fruit eats for 38 energy at normal quality (Stardew's figure from
  memory, SC-52); a tree holds up to 3 fruit; a year for grading is the calendar
  year (`DAYS_PER_YEAR` is 112 now that there are four seasons, so one grade per 112
  days after maturity); a mature tree falls in as many axe swings as a common tree,
  gives 12 wood plus foraging level up to 4, 12 foraging experience, and its
  sapling back; a young tree falls in one swing for 4 wood; a sapling sells for
  half its price. What blocks a young tree's growth: a weed, rock, tree, another
  fruit tree, sprinkler, machine, crop or forage item in its 3x3. Planting needs
  no other tree in the 3x3. Fall trees are not sold until fall exists.
- Farm cave mark: 25,000g of total earnings over the whole game.
- Fruit bats: each night an empty cave gets no fruit 48 percent, 1 fruit 25,
  2 fruit 13, 3 fruit 7, 4 or more 7 (about 1.06 a night). Fruit stays until
  picked and takes space, so a full cave spawns less. The cave has 50 floor
  tiles. Each fruit gives 7 foraging experience.
- Mushroom cave: six boxes, each makes a mushroom every second day, always
  normal quality, 5 foraging experience each. Stardew's chances are common
  70 percent, chanterelle 7, red 12, morel and purple 2.5 or less. Which of
  these we have is open until the forage list is checked. Stardew gives a free
  dehydrator, which we do not have, so the reward is open.
- Machine times are Stardew's minutes. A machine counts 1,600 minutes a day, the
  1,200 awake plus 400 overnight (this is what makes Stardew's 10,000 minute
  wine 6.25 days). This is derived, so check it against play.
  - Preserves jar: jelly and pickles 4,000 min (2.5 days).
  - Keg: wine 10,000 min (6.25 days), juice 6,000 min (3.75 days), beer 1,750
    min (about 1.1 days), mead 600 min.
  - Bee house: honey every 4 nights, none in winter (the timer runs, the honey waits for spring), flowers within 5 tiles
    change it.
- Artisan sell prices: jelly and pickles 2 x base price + 50, wine 3 x base,
  juice 2.25 x base, beer 200g, mead 300g. Wild honey 100g. Flower honey by
  flower: tulip 160g, blue jazz 200g, sunflower 260g (spring and fall),
  summer spangle 280g, poppy 380g, fairy rose 680g. Our flower set is open,
  so each of ours takes the nearest Stardew value. The Artisan profession adds
  40 percent later (`23_animals.md`).
- Charcoal kiln: 10 wood for 1 coal in 30 minutes. Seed maker: 20 minutes, and
  it gives 1 to 3 seeds of the input crop, 2 on average. It takes crops and
  four forage items, not fruit tree fruit. Stardew's rare mixed and ancient
  seed results are left out. Both from the saved Charcoal Kiln and Seed Maker
  pages.

## Machines, build 7 (2026-11-07, ours, placeholders)

Source: `24_processing_and_cooking.md`, `34_crafting.md`. Code: `processing.ts`,
`artisan.ts`, `machines.ts`. Times and artisan prices are the Stardew numbers in
the farm growth section above; these are the rest.

- Machine time is 1,600 minutes a day (the clock's 1,200 awake plus 400
  overnight), so a batch finishes overnight. Bee house: honey every 4 days
  (6,400 machine minutes), 100g, none in winter (the timer keeps running; a batch done in winter is ready on the first day of spring).
  Flower honey waits for a flower set.
- Kiln: 10 wood for 1 coal, 30 minutes. Seed maker: crops only for now (no wild
  seeds item yet), 1 to 3 seeds rolled when the batch starts, 20 minutes.
- Jar and keg take fruit or vegetable. Fruit is melon, tomato, hot pepper, and
  the wild grape, spice berry and salmonberry. Every other crop is a vegetable.
  Jam and wine from fruit, pickles and juice from vegetables. Honey goes to the
  keg for mead (600 minutes, 300g). Beer waits for a grain crop.
- Each input makes its own good (`melon-jam`, `parsnip-pickles`), priced from its
  own base: jam and pickles 2 x base + 50, wine 3 x base, juice 2.25 x base
  rounded down. A bundle slot such as "Any jam" takes every one.
- Machine sell prices: kiln 100g, jar 150g, bee house 200g, seed maker 200g, keg
  250g.
- Craft costs are note 34's. Sources: kiln Foraging 2, bee house Farming 3, jar
  Farming 4, keg Farming 8, seed maker Farming 9 (Stardew's; the bundle 4 source
  is in the data for when that bundle exists), basic fertilizer Farming 1, basic
  retaining soil Farming 4.

## Animal-goods machines (2026-11-08, ours, placeholders)

Source: `24_processing_and_cooking.md`. Code: `processing.ts`, `artisan.ts`.

- Times (Stardew's minutes): cheese press 200, mayonnaise machine 180, loom 240,
  oil maker 360 for a truffle and 1,000 for corn. One input, one output.
- Goods: cheese 300g (milk 125), goat cheese 540g (goat milk 225), mayonnaise
  150g (egg 50), duck mayonnaise 285g (duck egg 95), cloth 470g, truffle oil
  1,250g (truffle 625), oil 100g. Quality is ignored, except wool.
- Cloth: one wool makes 1 cloth, or 2 with a chance by wool quality: normal 0,
  silver 25 percent, gold 50 percent. Moonwool is not loomed yet.
- Machine sell prices: cheese press 200g, mayonnaise machine 200g, loom 250g,
  oil maker 300g.
- Craft costs: cheese press 45 wood, 45 stone, 1 copper bar; mayonnaise machine
  15 wood, 15 stone, 1 quartz crystal, 1 copper bar; loom 60 wood, 30 fiber, 1
  sap; oil maker 50 wood, 10 coal, 1 gold bar (Stardew's lists with our items
  swapped in). Sources: farming 2 (mayonnaise), 6 (press), 7 (loom), 8 (oil
  maker), and bundles 11 and 21 for the press and loom.
- Bundle 11 (Animal Goods, larder): 4 of egg, duck egg, milk, goat milk, wool.
  Bundle 21 (Weaver's, hearth): 8 wool and 20 fiber.

## Cooking (2026-11-08, ours, placeholders)

Source: `24_processing_and_cooking.md`. Code: `cooking.ts`, `src/content/dishes.json`.

- One cook turns the ingredients in the pack into one dish, with no time. Quality is ignored. Energy only, no health.
- Fried egg (egg) 75 energy, 35g, known at the start. Baked potato 90, 70g, farming 1. Garden salad (leek, dandelion) 110, 110g, foraging 1. Hearty omelette (2 egg, milk) 125, 100g, farming 2. Mushroom stew (2 field mushroom, potato) 150, 190g, foraging 2. Cheese melt (cheese, potato) 160, 240g, farming 3. Mayonnaise slaw (mayonnaise, kale) 140, 260g, farming 4. Pumpkin soup (pumpkin, milk) 200, 400g, farming 5.

## Desktop mouse (2026-11-02)

Placeholders, not checked against Stardew (`46_desktop_mouse.md`).

- Aim reach: 1 tile, Chebyshev (`AIM_REACH` in `src/core/aim.ts`, tool reach 1, #547). A cursor
  within it aims at the cursor tile, else at the neighbour toward it.
- Wheel step: 100 wheel units make one slot step (`WHEEL_STEP` in
  `FarmScene.ts`), one notch of a mouse wheel.

## The road trader (decided 2026-11-06, ours, placeholder)

Source: `57_the_outpost.md`.

- Visits on Wednesday and Saturday, 4 to 6 items a visit, priced at 1.5 times
  sell value.

## The mines, first part (built 2026-11-07, ours, placeholders)

Source: `22_mines.md`. Code: `mines.ts`, `mining.ts`, `rocks.ts`, `ore.ts`.

- Floor: 20 by 14 tiles, 6 to 9 single pillars, 12 to 16 rocks, made fresh each
  day from a seed of the day and the floor. 1 floor in 4 shows its ladder.
- Rock mix on floors 1 to 40 (band 1): 22 percent copper nodes, 6 percent iron
  from floor 26, 8 percent coal, the rest stone. Bands 2 and 3 are in
  `mine-bands.json` (floors 41 to 80 and 81 to 120, 120 floors in all). Swings to break at the basic pickaxe: stone 2, copper 3, coal 3.
- Drops: stone 1 or 2; copper 1, with a 25 percent (+3 per mining level) chance
  of 2 or 3; coal 1, 30 percent chance of 2. Prospector adds 1 at 25 percent.
- Ladder odds: 1 percent, +0.5 percent per miss, cap 25 percent. The last rock
  on a floor always hides it. Floor 120 has none.
- Pickaxe swing: 2 energy, less 0.1 per mining level, never under 0.5. XP per
  rock: stone 2, copper 5, coal 4.
- The farm has 16 stone rocks and none respawn yet.
- Prices: stone sells 2g, coal 15g (smith 50g), copper ore 5g (25g), iron ore 10g
  (50g), gold ore 25g (100g), bars 60g, 120g and 250g. Smelt: 5 ore and 1 coal,
  30 minutes, 2 hours and 5 hours of game time, one batch at a time.
- The furnace gift needs 1 copper ore handed over once, and comes the next
  morning.

## Placeholder check against the saved wiki pages (2026-11-08)

Compared the "from memory" rows above with the saved Spring, Summer and Fall
Crops pages, Skills, Inventory, Gold, Tools, Minerals and Artisan Goods pages.
Reference only, nothing copied (ADR 0002).

Checked, so "from memory" can become "checked":

- Crop days, seed price, sell price and regrowth for parsnip, potato,
  cauliflower, melon, tomato (regrows every 4, the line above was missing it,
  the data already had it), radish, green bean, kale, garlic, hot pepper, corn,
  red cabbage, wheat, pumpkin, eggplant, cranberry, artichoke and beet.
- Crop energy for all of those, including melon 113, hot pepper 13 and
  cranberry 38.
- Total XP per level: 100, 380, 770, 1300, 2150, 3300, 4800, 6900, 10000,
  15000. Forage pickup is 7 XP.
- A new game starts with 500g. Backpack 12, 24 (2000g) and 36 (10000g) slots.
- Hoe tiers cost 2000g, 5000g and 10000g (copper, steel, gold). Stardew adds
  bars and a fourth grade at 25000g, ours is decided in note 44.
- Quartz sells for 25g. Quality multipliers: silver x1.25, gold x1.5, iridium
  x2 (ours stops at gold, plus Hearthsilver, note 22).

Differences, none of them a bug:

- Stardew holds garlic, red cabbage and artichoke back to year two. Ours are
  open in year one. Already decided for red cabbage and artichoke above, and
  garlic follows the same rule. Garlic is the cheapest of the three and
  changes little.
- Stardew's second seed shop (JojaMart) charges more for the seeds seen on the
  pages (eggplant 25g against 20g). We have one shop.

Still unchecked, saved pages do not hold them:

- Energy per swing (the Proficiency page is not saved), and the harvest XP
  formula. Ours: `2 - 0.25 * tier - 0.1 * level` and `16 * ln(0.018 * price + 1)`.
- Sweet potato (fall, 10 days, 60g seed, 160g), forage energy values and
  the late-sleep penalty steps. Ask the owner to save the Sweet Potato, Proficiency
  and Experience pages if they matter.
- Fruit energy per fruit (SC-66) and the Grange bands (SC-53), already in the
  register.

## Open questions for playtests

First answers are in `08_playtest_personas.md`: 500g is far more than enough
(a parsnip returns 35g on a 20g seed in 4 days) and an expert finishes all five
bundles on day 41 of 56.

- Is 14 real minutes a day too long on a tablet?
- Does energy set the pace, now that forage is plentiful?
- Is 500g enough to start, and do the later crops pay back their seed?
- Can all five bundles be finished in the two seasons?

## Farm types (build 9, placeholders, ours)

Source: `src/content/farm-types.json` and the farm map JSON.

- Woodland farmland: 40 soil tiles (8 by 5) against Standard's 96, about 42
  percent. Trees: 52 hand-free points on grass, none on the soil, none in the
  clearings. Rocks: 10 (Standard 16). Pond radius 2.4 (Standard 3.2).
- Forage clearings: 3 circles, radius 3.2, with 24 forage spots in all
  (Standard has 14, across the whole map). Forage uses the valley tables.
- Large stumps: 6 fixed spots, 3 tiles apart. A chop takes a stump's swings plus 3
  (7 with a copper axe, which it needs), gives 2 hardwood (2026-11-07, was 8 to
  13 wood as a stand-in) and 3 foraging XP. A chopped stump stands aside and regrows after 4 days. It
  blocks movement only while whole and never spreads seeds.
- Mixed seeds: sell 5g. A weed with no fiber (50 percent chance of fiber, as
  before) drops one at 5 percent on Standard (note 29) and always on Woodland. A mixed seed plants a random crop that
  suits the season.
- Starting kit: the same on both types (15 parsnip seeds, 500g).
- Woodland Bundle (50 wood, 50 stone, 30 fiber): wood is plentiful. Fiber is
  unchanged (half of cut weeds), but Woodland has 40 soil tiles to grow weeds
  on, so the 30 fiber may be slow. Needs a playtest.

## Hats and festival counters (build 8, placeholders, ours)

Source: `src/content/hats.json`, `src/content/festivals.json`.

- Hats: 28 now in `hats.json` (this paragraph describes the first four), drawn as
  a coloured block on the player. The Parade
  Ribbon is free, given the first time the player goes to the Hat Parade. The
  Straw Boater (300g), Feathered Cap (500g) and Wool Beret (400g) sell at the
  parade's counter, once each. The counter only opens after the player has gone
  in. Stardew's hat prices run from 1,000g up (note 10), so these are low on
  purpose, since the hatter's shop and achievement hats are not built.
- Built since (audit 2026-11-10): Harvest Showing (fall 9, showing and token
  counter), Hollow Eve (fall 21, maze), Frostday (winter 8) and Midwinter Feast
  (winter 20), each with a counter of hats and furniture. Only Cake Day and
  Lamplight Evening still have an empty counter.
- Seedswap Fair (spring 21): the counter sells mixed seeds at 20g each, no
  limit. Mixed seeds sell for 5g, so this is a cheap way to try a random crop.
- Cake Day (summer 8) and Lamplight Evening (summer 20): in the calendar with
  a blurb and an empty counter. Their content waits for a note.

## Furniture (build 8, placeholders, ours)

Source: `src/content/furniture.json`, `src/core/furniture.ts`.

- 26 entries now in `furniture.json` (the first ten are described here; the
  rest are festival pieces, winter pieces up to the 520g pine wardrobe, the
  2,000g workbench and the 200,000g Furniture Catalogue).
- The first ten were one tile pieces (stool 60g, chair 90g, mat 80g up to armchair 400g).
  Prices are placeholders, well under Stardew's. Two are rugs, which can be
  walked on. No stacking, no multi tile pieces.
- The carpenter shows 4 of the 10 each day, a hash of the day number, the same
  all day. The pool is only 2.5 times the stock, so it repeats soon.
- Furniture is a backpack item with no sell price and cannot be sold or shipped.
  It is placed with Use in the house and taken up with Action or the hand.
- A house upgrade moves pieces to the new map at the same tile if it is open,
  else into the pack, else a stash that empties into the pack when room opens.
- The Furniture Catalogue is built: 200,000g at the carpenter once the house is
  tier 1, placed in the house, and Action on it gives copies of catalogue pieces
  at 0g (`furniture.ts`).
- Not built: wallpaper and floors, bundle furniture
  rewards (no bundle names one yet), the per-people catalogues.

## Dehydrator (build 5, 2026-11-07, note 66, placeholders)

- Recipe: 30 wood, 5 stone, 1 iron bar, learned at Farming level 4. Machine
  sell price 300g.
- Takes 5 of one fruit or edible mushroom (wild fruit, crop fruit and tree
  fruit count; vegetables and plain forage do not). Done the next morning
  (1,600 machine minutes). Input quality is ignored, output is normal.
- Dried good: price 7.5 times the base plus 25g, energy 3 times the base
  (Stardew's rule, from the saved Artisan Goods page).
- Edible mushrooms: field mushroom, morel, chanterelle, snowcap and cave
  mushroom (`mushroom` flag in `forage.json`).

- Quartz (built 2026-11-07, placeholders): a crystal node is 6 percent of rocks
  on every mine floor (`QUARTZ_SHARE`; it was floors 1 to 10 in the first build), breaks in 1 swing, drops 1 quartz crystal, gives 3
  mining XP and sells for 25g (Stardew's quartz price, from memory).

- Mine camp chest (built 2026-11-07, placeholders): on every 10th floor, it gives 2 coal, a band ore (copper 3, iron 3, gold 2,
  `campGiftOre` in `mine-bands.json`) and one of a quartz crystal,
  5 stone or a cave mushroom (by the day) once a day, and nothing can be put in.

- Geodes (built 2026-11-07, placeholders): a geode node is 5 percent of rocks on
  every floor (`GEODE_SHARE`; floors 1 to 10 in the first build), takes 3 swings at the basic pickaxe, gives 4 mining XP and sells
  for 50g. The smith cracks one for 25g. This is the first-build table and is superseded: `src/content/geodes.json` now
  has four geode kinds (geode 50g, frozen 100g, magma 150g, omni 300g from floor
  21) with a pool per floor band of ores, minerals, artifacts and foraged
  finds (note 69). The gem and found thing names and prices are placeholders. A Rockhound gets an extra geode from
  5 percent of plain rocks.

## House upgrades (build 2026-11-07, note 41 and 68, placeholders)

Source: `src/core/house.ts`. All three are Stardew's prices, untuned.

- Tier 1: 10,000g and 450 wood.
- Tier 2: 65,000g and 100 hardwood, as Stardew (changed from a wood stand-in on
  2026-11-07, note 43). A tier 2 order already paid in wood is unaffected.
- Tier 3: 100,000g, no wood. Adds the cellar stairs flag only (`houseHasCellar`,
  the cellar is #282).
- Each tier needs the one before it, one order at a time, three working days
  (a festival morning does not count).
- Tiers 2 and 3 are probably out of reach in two seasons. Tune after a playtest.

## Special Orders and seasonal debris (built 2026-11-07, note 65, placeholders)

Source: `src/core/orders.ts`, `src/core/debris.ts`, `src/content/orders.json`.

- Board opens Fall 2, year one (day 58). Two orders on the board, one new pick a
  week, one new order accepted a week.
- Bumper Harvest: ship 100 of one crop in its season, 28 days, 1,500g, repeats.
  First reward a big chest (stands in for a second shipping bin).
- Fine Vegetables: ship 25 gold quality vegetables, 28 days, 1,000g, repeats.
  First reward the dehydrator recipe.
- Too Many Fish: 10 of one in-season fish, 7 days, 800g, repeats. Still Waters: 20 fish of one water, 7 days, 1,200g, repeats. Cave Patrol: 50 of one creature kind, 7 days, 1,500g, repeats. Placeholders; first rewards are recipes (charcoal kiln, recycler, seed maker).
- Debris on day 1 of spring, summer and fall: up to 8 rocks, up to 8 twigs, a
  10 percent chance of one stump, standing cap 25 rocks and 25 twigs, none in
  winter. A twig gives 1 wood. The grass spread rate is not set (no grass).
- Check in play: the steady wood and stone supply against note 43's wood economy.

## Request board (built 2026-11-08, note 50, placeholders)

Source: `src/core/quests.ts`, `src/content/requests.json`.

- A day posts a request with an 80 percent chance (SC-27, unchecked). None on
  day 1. Half of them are deliveries. 2 days to finish: the day posted and the next.
- Delivery pays 3 times the normal quality sell price times the count (Stardew).
- Gathering pays 2 times the normal sell value of the count (ours, untuned).
- Counts: delivery crops 2 to 6, forage 2 to 5, wood or stone 10 to 30. Gathering
  forage 3 to 8, wood, stone or fiber 10 to 40.
- Errand achievements: 10 requests (Spotted Bow hat 1,000g, 500g letter) and 40
  (Hen Mask 2,000g, 2,500g letter), as note 38.

## Cask and dye vat (#602, 2026-11-09, note 24, placeholders)

- Cask: 40 wood, known at the cellar stairs (tier 3), sells for 200g, holds one
  good, at most 33 in the cellar. Wine reaches silver at 14 days and gold at 28,
  mead at 7 and 14, cheese and goat cheese at 3 and 7 (Stardew's, checked on
  the saved Cask page 2026-11-08, SC-82).
- Dye vat: 40 wood, 10 stone, 10 fiber, from the Dyer's bundle only. Sells for
  250g. One input, one dye, 1 day (1,600 machine minutes). Every dye sells for
  120g. Dyer's bundle: 4 of daffodil, sweet pea, red cabbage, cranberry, bramble
  berry, crocus, in the Guests' Board room (moved from the Hearth 2026-11-10, as
  notes 16 and 63 have it).
- Homeward pin (2026-11-09, #641, placeholder): 1,500,000g at Thalwen's stall, one only,
  cannot be sold back. A little under Stardew's Return Scepter at 2,000,000g (saved Krobus
  page), so year 1 is unlikely (note 09). Not gated at 3 hearts until friendship exists.

## Placement, bombs and Forge stock (decided 2026-11-12, notes 88 and 89, placeholders, not built)

- Bombs (Stardew, from memory, SC-149): cherry bomb radius 1, bomb 2, mega bomb 3. Fuse 1.5
  seconds. Damage to monsters 15, 30, 50; to the player 10, 20, 30 percent of maximum health,
  never lethal. No mining experience. Forge prices 450g, 1,000g, 1,600g (saved Dwarf page).
- Light radii in tiles: torch 3, campfire 4, brazier 4, lamp-post 6, worn light ring (bundle
  20) 5. Fixed glow, no fuel (SC-128).
- Light recipes (placeholders, built 2026-11-12): torch (makes 3) wood 1 and sap 2, known
  from the start; campfire wood 10 and stone 5, from the start; wood brazier wood 20 and
  sap 5 at Foraging 2; stone brazier stone 20 and coal 3 at Mining 2. Lights are not sold.
- Lamp-post recipes (note 34, built 2026-11-12): wood lamp-post 50 wood and 1 battery pack at
  Farming 7; iron lamp-post 1 iron bar and 1 battery pack at Farming 9. Radius 6, farm only.
- Bombs built 2026-11-12 (`src/content/bombs.json`): fuse 1.5 s, ore gates reuse the spawn
  `minLevel`s (iron 2, gold 5, Hearthsilver 8), a lit bomb goes off at once on leaving the map.
- Forge goods built 2026-11-12: Miner's Treat gives 100 energy; Oil of Garlic calms monsters that
  live only in bands 1 and 2 (`OIL_TIER` 3) until the next morning.
- Heater: 1,000g at the ranch shop, covers the whole building on winter nights (SC-131 open).
- Forge: Life Elixir 2,000g (health to full), Miner's Treat 1,000g (100 energy), Oil of
  Garlic 3,000g (monsters below a tier ignore you for the day).
- Lightning rod: a strike yields a battery pack, 500g.
- Lightning rod recipe (note 34, built 2026-11-12): 1 iron bar, 1 quartz crystal, 5 bat wing at
  Foraging 6. The pack waits on the rod until Action takes it; no new numbers.
- Pond fish, the Fernscale: base price 750g, a hard bar (note 21).
- Elderfruit: +34 maximum energy, seven sources, eaten on receipt (note 39).
- Elderfruit placeholder prices: Harvest Showing counter 2,000g (once), hermit 20,000g (once); emberseed 14 days to grow (note 39).
