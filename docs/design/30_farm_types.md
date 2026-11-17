# 30 Farm types: reference check (draft)

Status: draft. Companion to `32_farm_types.md`, which holds the design and build status. This note holds the check of our farm type decisions against the
Stardew Valley Wiki Farm Maps page and the Guidebook supplement (printed pages
12 and 13), done 2026-10-31. Both are reference only (ADR 0002); no text or
tables are copied. The decisions themselves are in
`25_stardew_system_review.md` ("Owner decisions, 2026-10-30"). The full farm
types note (map data, rule changes, choice screen, fish tables) is
`32_farm_types.md`.

## Where the two sources agree and differ

- The Guidebook spread is a short blurb per farm and matches the wiki on every
  point it covers: Standard is the all-rounder, Riverland starts with a Fish
  Smoker, Forest weeds can give seeds, Meadowlands starts with a coop and two
  chickens. It gives no numbers, so there is no conflict to flag.
- The Guidebook adds two things the wiki page does not say: the Meadowlands
  blue grass makes animals happier and more productive, and Riverland suits ore
  panning as well as fishing. We have no panning.
- The wiki lists eight farms. Four Corners (multiplayer) and Wilderness
  (monsters on the farm) are out of our scope already. That leaves six.

## What the check confirms in our decisions

- **Trade-off holds.** Every non-Standard farm has less farmland in exchange
  for a perk. By the wiki's tillable tile counts, against Standard as 100
  percent: Riverland about 46, Forest about 41, Hill-top about 48, Meadowlands
  about 60. Use these as the rough shape when sizing our farms, not as targets.
- **Hilltop quarry.** The wiki quarry tries several nodes a day, the first
  sure and each later one less likely (about 2.4 a day once cleared), with the
  ore tier set by mining level. Our mines note can borrow the shape. The numbers
  go in the farm note.
- **Woodland.** The Forest farm has renewable large stumps (hardwood), seasonal
  forage in clearings and special weeds that always drop seeds. This is the
  model for our Woodland farm's perk, and ties to `29_weeds.md` (a special weed
  that always drops a mixed seed).
- **Riverside.** Starts with a smoker, and fish come from a mix of the village
  river and forest tables. This settles the "which fish table each farm's water
  uses" item for the farm types note: a farm names a split of existing tables.
- **Meadow.** Starts with a coop and two chickens, and gives hay in place of the
  usual starter seeds. The conflict with `23_animals.md` is settled in
  `32_farm_types.md`: Meadow gets the coop and chickens as an exception.
- **Greenhouse.** Every wiki farm has a ruined building that becomes the
  greenhouse once repaired, and the house and greenhouse can be moved in 1.6.
  This is useful for the winter question in `26_seasons.md` and for our rule
  that the house position is not fixed.

## Where the earlier decisions need a fix

- `25_stardew_system_review.md` says farm type layouts are "from memory, the
  Farm Maps page is not yet saved". The page is saved and read. Nothing in it
  contradicts the decisions.
- Clutter: the Farm Maps page says nothing about starting clutter. The Weeds
  page covers weeds only (`29_weeds.md`). Rocks and twigs stay with the farm
  note.

## Open

- Whether our sandy-soil style farm (a Stardew Beach analogue) is wanted. It is
  not on our list and needs a no-sprinkler rule if ever added.
- Which farm sizes to target in tiles, once the tile size is settled.
