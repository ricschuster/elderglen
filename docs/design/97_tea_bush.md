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
| Tea Sapling, crafted (owner: Stardew shape) | `tea-sapling`, recipe `tea-sapling` in `recipes.json`: 4 mixed seeds (our wild seeds) and 5 fiber, Foraging level 3. Placeholder, SC-171. |
| 20 days, 10 a stage | `TEA_STAGE_DAYS` 10, `TEA_MATURE_DAYS` 20 (`tea-bush.json`), grows every night, no clear-ground rule and no water. |
| Leaf a day, 22nd to 28th | `bearsOn`: day 22 to 28, spring, summer, fall; winter only in the greenhouse. The greenhouse bears in the last week of every season. |
| Leaves held | A bush holds 1 leaf (`maxLeaves`), picked with the Action button. Placeholder, SC-172. |
| Gold or iridium axe, 2 hits | Axe tier 3 or more (tiers 0 to 4 are base, copper, iron, gold, iridium), 2 swings (`chopAxeTier`, `chopHits`). Below gold: "needs a better axe". A young bush comes up in one swing with any axe (ours, SC-172). The sapling comes back; the hand needs backpack room or the swing is refused. |
| Impassable | The scene blocks the tile at every stage. Hoe, building placement and planting treat it as an object. Unlike a fruit tree it needs no clear 3x3, so a row of bushes works as a fence. |
| Tree Fertilizer no | Nothing applies fertilizer to it. |
| Tea Leaves | `tea-leaf`, sells for 50, energy 20 (placeholders, SC-173). |
| Garden pots | Not built: we have no garden pot item yet. Open. |

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

## Herb tea and bundle 24

Herb tea already exists (`dishes.json`: 2 dandelions, Foraging level 2, note 63)
and notes 16 and 63 settle it as a dandelion dish. The notes do not say tea
leaves feed it, so it is unchanged. Open question: should herb tea also take
tea leaves (for example a second recipe, 2 tea leaves), or should tea leaves
feed a new dish or a keg product (Stardew's green tea is a keg good, from
memory, unchecked)? Until the owner decides, the tea bush has no consumer other
than selling and eating the leaf.

## Open

- Garden pots as a planting place (needs the pot item).
- Whether herb tea or a green tea uses leaves (above).
- Every placeholder number: recipe, leaf price, leaf energy, sapling price,
  cap of 1 leaf. Real art.
