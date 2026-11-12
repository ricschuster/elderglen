# 91 Flowers (draft)

Status: **settled with the owner on 2026-11-12 (notes 88 rounds 3 to 5, and the set below);
numbers are placeholders.** Design part of the flower item in the M3b finish list. Stardew
claims are checked on the saved Crops page (SC-155, done). Names are ours (ADR 0002).

## What the owner decided

- **Six flower crops, none in winter.** Two a season. Sunflower grows in summer and fall,
  so it covers both (the set mirrors Stardew's spread, owner's choice).
- **Seeds** at the general store, plus wild finds in the forage areas.
- **Four uses:** gifts to villagers (Stardew), bundle items, bees and honey, dyes and
  decoration.
- **Not in this note:** the bouquet (marriage, note 12), a flower dance link (the festival
  stays as note 82), the dye station and sliders (note 88 round 5, waits for the art step).

## The set (placeholders)

| Flower | Season | Days | Seed | Sells | Flower honey | Dye |
| --- | --- | --- | --- | --- | --- | --- |
| Tulip | Spring | 6 | 20g | 30g | 160g | pink |
| Cornflower | Spring | 7 | 30g | 50g | 200g | blue |
| Poppy | Summer | 7 | 100g | 140g | 380g | red |
| Zinnia | Summer | 8 | 50g | 90g | 280g | orange |
| Sunflower | Summer, fall | 8 | 200g | 80g | 260g | yellow |
| Dahlia | Fall | 12 | 200g | 290g | 680g | violet |

Honey prices are the nearest Stardew values in note 07 (tulip 160, blue jazz 200, poppy
380, summer spangle 280, sunflower 260, fairy rose 680). Growth days, seed prices and
sell prices are Stardew's own on the saved Crops page (read 2026-11-12), tulip to fairy
rose in order; sunflower grows in summer and fall there too. Nothing is copied but the
numbers.

- **They are crops.** One harvest, no regrowth, and they use the crop data
  (`src/content/crops.json`, `produce: "flower"`). They take fertiliser and sprinklers like
  any crop. A flower is not a vegetable, a fruit or a forage item, so it is the `flower`
  tag, which is already a universal like (note 61).
- **Wild flowers stay.** Daffodil, sweet pea, crocus and snowdrop are forage and keep
  their dye colours. They count as flowers for bees and gifts.

## Where seeds come from

- **General store.** All six, in their season, at the seed prices above.
- **Wild finds.** Each forage area has a small chance (placeholder 2 percent) of a flower
  seed packet from a forage tile, a seed of any flower in season. Weeds already drop mixed
  flower seed at 5 percent (note 29, built).

## The four uses

1. **Gifts.** The `flower` tag is a universal like. A person's own list can love or hate a
   flower by id, or all flowers by tag. Note 90 uses `#flower` and four wild flower ids.
2. **Bundles.** Bundle 23 (Dyer's) wants raw colour goods, flowers among them
   (`16_bundles.md`). The cut of a flower per bundle is a placeholder of 1 per item.
3. **Bees.** A bee house with a flower within 5 tiles (a growing crop or a flower pot, note
   24) makes that flower's honey, else plain honey. The honey carries the flower id and sells
   by it (the table). Winter: no honey and no flowers (SC-50, built rule).
4. **Dyes.** The dye vat takes one flower, one dye (note 24, `src/content/dyes.json`). The
   six join the four wild flowers as new rows with the colours above.

## Build list

- `crops.json`: six rows, `produce: "flower"`, seed and sell prices above, a flower art
  placeholder each. Seeds in `shops.json`.
- `forage` tiles: the wild seed packet chance.
- Artisan: flower honey per flower id (the id on the item), price table above.
- `dyes.json`: six input rows. `friendship.json` tags: list the six under `flower`.
- Bundle 23's pool lists the six where it names flowers.
- Tests: crop growth, honey flower choice by range, dye rows, seed shop stock by season.

## Built (2026-11-12)

- Six flower crops in `crops.json` (`produce: "flower"`, not food, no jam or pickles), seeds in
  the general store by season (the store lists every crop by season), placeholder art colours.
- Wild seed packet: a forage pickup rolls `WILD_FLOWER_SEED_CHANCE` (2 percent) for one seed of
  an in-season flower (`actions.ts`).
- Flower honey: `<flower>-honey` items at the table prices. A bee house resolves its honey when
  collected: the nearest flower crop within `BEE_RANGE` (5 tiles, either axis) on the open
  farm, else plain honey (`machines.ts`).
- Dyes, the `flower` tag and Dyer's bundle pool list the six.
- Tests: `tests/flowers.test.ts`.

## Left to build

- Flower pots (note 24) do not exist, so only growing crops count for bees.
- Wild flowers (daffodil and the rest) do not attract bees yet (no honey price for them).
- Not in this note: the bouquet, the dye station, real names and art.

## Design gaps found while building

- Range metric for "within 5 tiles" (built as a square) and which flower wins when several
  are in reach (built: nearest, then by id).
- When the flower is checked (built: when collected, not when the batch starts).
- Bees on maps other than the open farm (greenhouse, areas): built for the farm only.
- Whether flower honey makes mead in the keg, and at what price (built: only plain honey).
- Villager lists name `flower-honey`, but the items are `<flower>-honey`, so those entries
  match nothing yet. Needs a `flower-honey` tag or per-id entries.
- Bundle 23's cut of "1 per item" is the data's existing count of 1 each, `required` 4.
- Quests, completion and the ship-every-crop achievements now count flowers as crops.

## Open

- Real flower names and art (the placeholders are plain real names).
