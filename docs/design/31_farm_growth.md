# 31 Farm growth tools (draft)

Status: draft. Decided with the owner on 2026-10-31. Fruit trees built 2026-11-07
(slice 1 build 5, `src/core/fruittrees.ts`, data in
`src/content/fruit-trees.json`): saplings from the shop, 28 days to mature, the
clear 3x3 rule, fruit in season held up to 3, grade by age, chopping returns the
sapling, fruit feeds the jar and keg. The six trees are data; the three fall
trees wait for fall in the calendar and are not sold yet. The farm cave is not
built (needs a map, an earnings counter and the choice screen). Fertilizer is built
(2026-11-07, slice 1 build 3, `src/core/fertilizer.ts`): five items from the
shop only, no crafting yet, applied from the toolbar, one per tile, gone at the
season change. Sprinklers, the greenhouse, fruit trees and the cave are not
built; the game has hand watering for the rest. Sprinklers built 2026-11-07 (slice 1 build 3, `src/core/sprinklers.ts`): the
basic and quality tiers, placed from the toolbar on clear undug ground, picked
up with the hand or Action, watering their tiles each morning. The 24 tile tier
needs iridium and waits. Sprinklers built 2026-11-07 (slice 1 build 3, `src/core/sprinklers.ts`): the
basic and quality tiers, placed from the toolbar on clear undug ground, picked
up with the hand or Action, watering their tiles each morning. The 24 tile tier
needs iridium and waits. Reference: the Stardew Valley Wiki
Sprinkler, Scarecrow, Fruit Trees, Greenhouse, The Cave and Fertilizer pages,
read only (ADR 0002). Costs and recipes are placeholders until the tuning note.

## Decisions

### Sprinklers

- Three tiers, as in Stardew: a basic one that waters the four tiles next to
  it, a quality one that waters the eight around it, and a late one that waters
  the 24 around it. Unlocked by farming level, around levels 2, 6 and 9, and
  crafted from our smelted bars (`22_mines.md`). Exact recipes go in
  `07_tuning_numbers.md`.
- The two upgrade add-ons (a nozzle that widens reach, and an enricher loaded
  with fertilizer) are a Ring 2 item, as in Stardew, where the Qi-type
  warden head's Walnut Room-type offer gives them (`07_tuning_numbers.md`,
  decided 2026-10-31). They are not in slice 1.
- A sprinkler waters tilled tiles only, every morning. It does not work on
  sand, which only matters if a sandy farm is ever added (`30_farm_types.md`).
- A placed sprinkler blocks walking and is lifted by clicking it with any tool
  or the empty hand (SC-48, built in parity pass 521).
- Rain waters everything already, as now. Sprinklers matter on dry days.

### Scarecrows

- No crows, so no protective scarecrow. We skip the loss mechanic.
- Decorative scarecrows are wanted eventually, as farm decoration. That belongs
  to `10_customisation.md`, not here.

### Fruit trees

- Built as in Stardew, in M3 with fall and winter. Saplings come from the shop.
- A tree takes 28 days to mature, then bears one fruit a day in its season and
  holds a few days of fruit until picked. It needs no watering and does not die
  in winter.
- To grow, a young tree needs a clear 3x3 of ground. Weeds that land in that
  square stop its growth and a message names the tree on waking
  (`29_weeds.md`). Grass does not count. Two trees cannot share their 3x3.
  Once mature, the surrounding ground no longer matters.
- Fruit gains a quality tier for each year of tree age after maturity.
- The player's crop price bonus (Tiller) and artisan price bonus
  (`23_animals.md`) apply to fruit and to what is made from it.
- Chopping a tree gives wood and returns a sapling.

### Fertilizer

- First two tiers only for now, with the three lines of Stardew: quality (a
  better chance of higher grades), speed (faster growth) and retaining (a chance
  the soil stays watered overnight). The third tier waits.
- One fertilizer per tilled tile. It stays until the season ends, then wears
  off, except under a multi-season crop that is still growing, and always in
  the greenhouse.
- Quality fertilizer adds a term to the crop grade formula in
  `07_tuning_numbers.md`, which has left it out so far.
- Recipes unlock by farming level and some are sold in the shop. Where they come
  from is a tuning question. The bundle rewards of fast-grow and quality
  fertilizer (`16_bundles.md`) stand.
- A separate tree fertilizer waits for trees and wood to be a real system.

### Greenhouse

- The Larder room reward is the greenhouse (`16_bundles.md`). Every farm starts
  with a ruined building that the reward repairs. Once repaired it can be moved
  at the carpenter.
- Inside, crops grow in any season. They still need watering, and sprinklers
  can go on the border. Multi-harvest crops never die when the season changes,
  which is the main prize.
- Fruit trees can be planted inside and bear fruit every day after maturity.
- It answers the winter question in `26_seasons.md`: winter has no outdoor crops
  but the greenhouse carries a small year-round income.
- Crows and giant crops do not exist for us, so they are not an issue. Lightning
  exists as a harmless weather type that gives battery packs (`34_crafting.md`).

### Farm cave

- A small cave on the farm, empty at first. When total earnings pass a mark
  (Stardew uses 25,000g, ours is a tuning number), a villager asks to use it
  and the player chooses fruit bats or mushrooms. The choice is permanent.
- Fruit bats leave fruit in the cave overnight, on a chance, including foraged
  berries out of season. Mushrooms grow there and are picked by hand.
- Items stay until picked up. The botanist profession makes fruit top grade, and
  the gatherer profession gives a chance of a double (`07_tuning_numbers.md`).
  Picking gives foraging experience.
- The cave is a gentle, foraging-flavoured payoff and needs no creatures, which
  keeps it inside the no-monsters farm rule (`25_stardew_system_review.md`).

## Why these choices

Farming is the core loop and these tools are its progression: sprinklers cut
the watering chore, fertilizer deepens each plot, trees give a slow investment,
and the greenhouse gives winter something to do. Dropping crows removes the one
part that is pure loss. Everything else is a reward the player chooses.

## Build order

1. Sprinklers and fertilizer. They build on the crops that exist.
2. The greenhouse, with the Larder room.
3. Fruit trees and the farm cave, with fall and winter in M3.

## Open items settled (2026-10-31)

- **Applying fertilizer and add-ons:** both sit in the toolbar like seeds. Select
  one and tap a tilled tile or a placed sprinkler. This is the same flow as
  planting and fits tap-to-act (`27_touch_controls.md`).
- **Greenhouse layout:** as in Stardew. A large plot with a border where
  sprinklers can go. No sprinkler reaches the middle from the border, so the
  player gives up a few soil tiles or uses the late sprinkler tier. That is the
  layout puzzle, and the 24 tile sprinkler is its reward.
- **Sap:** changed 2026-10-31 to Stardew's source. It comes from chopping
  common trees and removing stumps, not from weeds, grass or forage
  (`36_gathering_trees_sap_fiber.md`). Fiber comes from weeds (`29_weeds.md`).
  Both are items that must be added before the recipes that use them.
- **Farm cave timing:** a total earnings mark, as in Stardew, counted over the
  whole game. The number is set in the tuning note.

## Open

- Settled 2026-10-31 in `07_tuning_numbers.md`: sprinkler and fertilizer prices,
  the shop rule for fertilizer, sapling prices, the fruit table, the cave mark
  and fruit bat chances. Add-ons wait for Ring 2. The mushroom cave gives a free
  dehydrator as in Stardew, and the dehydrator is a new machine
  (`66_fall_winter_festivals_and_farm_cave.md`, 2026-11-07).
- Sap and fiber drops are settled in `36_gathering_trees_sap_fiber.md`.

## Built: the greenhouse (#602, 2026-11-08)

- **Where.** A ruin on the farm at tiles 13 to 18 by 2 to 5, left of centre in the
  north (note 55), the same on every farm type. The door is the bottom row's third
  tile (15, 5), entry below. It is drawn with a green wash and scaffold poles
  until repaired. Using the door while it is a ruin says so.
- **The reward.** Finishing the Larder room repairs it. There is no saved flag:
  the `greenhouse-open` gate is read from `Hall.roomComplete("larder")`, and the
  door checks it when used, so finishing at the hall opens it the same day.
- **Interior.** `greenhouse.json`, 20 by 18 including walls (about 18 by 16 floor,
  note 58). A 12 by 10 soil plot with a pale earth border ring and a margin to the
  walls, door bottom centre. The map property `indoors` marks it. No night wash.
- **Soil.** A second `Farm` in the game state (`greenhouse`, saved as an optional
  `greenhouse` field, so old saves load with an empty one). The farm's trees, weeds,
  rocks, sprinklers and machines are stored by tile for the farm map and never
  show or block indoors. The hoe, can, seeds and fertilizer work it; the axe,
  pickaxe and everything else do nothing there.
- **Rules.** Any crop plants in any season, winter included, and never withers when
  the season changes. Fertilizer stays through season changes. It still needs
  watering (rain does not reach it) and multi-harvest crops regrow as outside.
  Quality, retaining and speed fertilizer work as on the farm.
- **Not built.** Sprinklers on the border and fruit trees indoors: both are
  stored by farm tile, so they need a per-map store first. Moving the greenhouse
  at the carpenter. Tracked as follow-ups on #602.
