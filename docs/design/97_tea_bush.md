# 97 Tea bush

Status: designed and built 2026-11-12 (owner decision, same day). The tea bush
is a bush, not a crop and not a fruit tree. It is a small, Stardew-shaped
system: a crafted sapling, a long wait, then a leaf a day in the last week of a
season. Placeholder numbers are marked.

## Facts from the saved Tea Bush page (read 2026-11-12)

- Grows from a Tea Sapling. 20 days to maturity: stage 1 and stage 2 are 10
  days each, then it is ready from the 21st of the season.
- A mature bush gives one Tea Leaf a day in the last week (22nd to 28th) of
  spring, summer and fall. In winter only indoors.
- An immature bush grows at any time, even outdoors and in winter, without
  watering, like fruit trees. Tree Fertilizer does not work on it.
- Impassable at every stage.
- A mature bush is chopped in 2 hits with a gold or iridium axe and no other
  tool; it yields its sapling (1.6 change).
- Can sit in garden pots.

## Mapping to Elderglen

| Stardew | Ours |
| --- | --- |
| Tea Sapling, crafted: 2 wild seeds, 5 fiber, 5 wood, recipe by mail the day after Caroline's 2 heart event (saved Crafting page, SC-171) | `tea-sapling`, recipe in `recipes.json`: 2 mixed seeds (our wild seeds), 5 fiber, 5 wood. Taught by Odette's letter `odette-tea-sapling` (`letters.json`, trigger `event`), queued once her 2 heart event `odette-store-2` is seen, so it arrives the next morning. Owner 2026-11-13. Until heart events play (#873) the recipe cannot be learned. |
| 20 days, 10 a stage | `TEA_STAGE_DAYS` 10, `TEA_MATURE_DAYS` 20 (`tea-bush.json`), grows every night, no clear-ground rule and no water. |
| Leaf a day, 22nd to 28th | `bearsOn`: day 22 to 28, spring, summer, fall; winter only in the greenhouse. The greenhouse bears in the last week of every season. |
| Leaves held | A bush holds 1 leaf (`maxLeaves`), picked with the Action button. Placeholder, SC-172. |
| Gold or iridium axe, 2 hits | Axe tier 3 or more (tiers 0 to 4 are base, copper, iron, gold, iridium), 2 swings (`chopAxeTier`, `chopHits`). Below gold: "needs a better axe". A young bush comes up in one swing with any axe (ours, SC-172). The sapling comes back; the hand needs backpack room or the swing is refused. |
| Impassable | The scene blocks the tile at every stage. Hoe, building placement and planting treat it as an object. Unlike a fruit tree it needs no clear 3x3, so a row of bushes works as a fence. |
| Tree Fertilizer no | Nothing applies fertilizer to it. |
| Tea Leaves | `tea-leaf`, sells for 50, energy 20 (placeholders, SC-173). |
| Garden pots | Built 2026-11-13 (owner, Stardew; saved Tea Bush and Crafting pages). `garden-pot`, crafted from clay 1, stone 10 and one refined crystal (`recipes.json`). The refined crystal is a quartz crystal smelted in the furnace with 1 coal in 90 minutes, a `BARS` row with `oreCount` 1 (`ore.ts`; time and 50g price are placeholders). Alder (the gardener) teaches the recipe by the letter `alder-garden-pot`, trigger `room` (the Larder is restored), the next morning. The pot is a `pot` placeable (farm and greenhouse), kept in `g.placed` with its contents in `state`: any season indoors, seasonal crops only outdoors, sprinklers never water it (the can does, and rain outdoors), a tea bush in a pot grows and bears. It cannot be lifted while something grows in it. `src/core/gardenpot.ts`, tests `tests/gardenpot.test.ts`. |

## Build

- `src/core/teabush.ts`: constants, `TeaBushes` store (one per map, like fruit
  trees), `bearsOn`. Numbers in `src/content/tea-bush.json`.
- Store: `g.teaBushes` (farm) and `g.greenhouseTeaBushes`, reached through
  `storeOf(...).teaBushes`. Saved under `mapItems` as `teaBushes` (optional, so
  old saves load). Not planted in areas.
- `actions.ts`: `plantTeaBush`, `chopTeaBush` (through `chop`), `pickTeaLeaves`;
  `tools.ts` routes the sapling, the Action button and the axe; `sleep.ts` grows
  them overnight.
- Scene: blocks the tile, lets the axe swing at it, draws the fruit tree
  sprites tinted green as placeholder art.
- Tests: `tests/teabush.test.ts`.

## Green tea and bundle 24

Owner, 2026-11-13 (Stardew, saved Artisan Goods page, SC-173): tea leaves go in the keg
and come out as **green tea** after 180 minutes, selling for 100g (`GREEN_TEA` in
`artisan.ts`, keg rule in `processing.ts`). Herb tea stays the dandelion dish. Bundle 24's
tea slot is now "Tea", any of herb tea or green tea (`anyOf` in `bundles.json`). Green tea's
buffs are not built. The leaf's own sale price is still ours (SC-173).

## Open

- Garden pots: no scene work yet (drawing the pot and its plant, blocking the tile for walking,
  placing from the hotbar with art). Digging a crop or bush out of a pot (the pot stays full
  until the crop is harvested or withers). Fertilizer in a pot. Whether rain waters an outdoor
  pot is from memory (Stardew check, register row to add).
- Every placeholder number: recipe, leaf price, leaf energy, sapling price,
  cap of 1 leaf. Real art.
