# 32 Farm types (draft)

Status: draft. Built 2026-11-07 (slice 1 build 9): Standard and Woodland, the
choice screen, the saved type and the data fields `map`, `startSeeds`,
`mixedSeedChance` and `stumpRegrowDays`. Not built: the other three types, the
water tile check in `problems`, per-farm fish tables, `startBuildings`,
`startAnimals`, `grassBonus` and `quarry`. The Meadow start, fish tables and choice screen were decided
with the owner on 2026-10-31. The layouts, perks and numbers are our draft and
are placeholders. Only Standard and Woodland are built. The earlier decisions are in
`25_stardew_system_review.md` ("Owner decisions, 2026-10-30"), and the check
against the Farm Maps page and Guidebook is in `30_farm_types.md`. Both sources
are reference only (ADR 0002); nothing is copied.

## Decisions

- **Six types in the long run, two in the first version:** Standard and
  Woodland. Later, one at a time: Riverside, Hilltop, Meadow. The sixth slot is
  open (see "Open").
- **A farm is data:** one Tiled map plus a short list of rule changes. Adding a
  type adds files, not code paths, wherever a rule can be a data field.
- **Every type has less farmland than Standard,** in exchange for a perk tied to
  one activity. The hall bundles stay completable on every type.
- **Fixed on every farm:** the three exits to the valley (Forest, Hearthwell,
  River delta, see `19_valley_layout.md`) and the valley and village beyond
  them. **Not fixed:** the house position, the pond and everything on the farm
  itself.
- **Meadow starts with a built coop and two chickens,** as in Stardew. This is
  a deliberate exception to `23_animals.md`, where the carpenter builds the
  first coop and the keeper sells the animals. The Meadow skips both for the
  first coop only. Every later building and animal goes through the carpenter
  and keeper as usual. `23_animals.md` carries a note pointing here.
- **Choice screen:** on the new game screen, locked for that save. Cards for
  each type show a map preview, the name and the perk in one line. No swapping
  after the first day starts.
- **Fish tables:** a farm names a split of the existing tables. See "Fish".
- **Clutter:** each map hand-places its starting rocks, twigs and grass. Weeds
  follow `29_weeds.md` on every type. Nothing in clutter is random at the
  start of a new game.

## The types

Sizes are tillable tiles against Standard as 100 percent. The rough shape comes
from the wiki's counts (`30_farm_types.md`). They are not targets until the
tile size is settled.

| Type | Theme | Size | Perk | Starts with | Version |
| --- | --- | --- | --- | --- | --- |
| Standard | All-rounder | 100 | Most farmland, nothing special | Normal kit | 1 |
| Woodland | Foraging | about 40 | Renewable stumps, forage clearings, special weeds | Normal kit | 1 |
| Riverside | Fishing | about 45 | Wider water, better fish mix, a smoker | Normal kit plus a smoker | Later |
| Hilltop | Mining | about 50 | A small daily quarry | Normal kit | Later |
| Meadow | Animals | about 60 | Blue grass, free hay | Coop, two chickens, hay for seeds | Later |

### Standard

The reference farm and the current placeholder (`05_farm_map_placeholder.md`).
One pond for the watering can, as `19_valley_layout.md` says. The house sits
near the Hearthwell exit. No rule changes.

### Woodland

The first non-Standard farm, because foraging is already built.

- Large stumps regrow on a timer and drop hardwood (built 2026-11-07, note 43:
  2 each, a copper axe or better).
- Forage clearings are fixed spots on the map with seasonal forage, using the
  same tables as the valley (`forage.json`).
- Special weeds always drop a mixed seed, in place of the 5 percent chance on
  other farms (`29_weeds.md`). They can still be cut by any tool.
- A pond, small, with the river table (see "Fish").

### Riverside

- A wide stretch of water along one edge of the map, more tiles of fishable
  water than any other farm.
- Starts with a smoker for fish, added to the starting kit. It is one of the
  eleven machines (`24_processing_and_cooking.md`).
- Fish mix: river and woods, see "Fish".
- We have no ore panning. The Guidebook says this farm suits it, so a panning
  rule is left open.

### Hilltop

- A small quarry area with ore nodes that return a few at a time. The wiki shape
  is: the first node is certain each day and each later one is less likely, with
  the ore tier set by mining level. Ours borrows that shape. Numbers go in
  `07_tuning_numbers.md`, placeholder start: about two nodes a day once the
  quarry is cleared.
- No monsters on any farm. The quarry is rock only, so the no-creatures setting
  in `22_mines.md` needs no special case.
- A pond with the river table.

### Meadow

- Starts with a coop and two chickens in place, and hay in the seed pack.
- Blue grass: the Guidebook says it makes animals happier and more productive.
  We copy the idea, not the numbers (not checked beyond that one line). Ours:
  animals let out on Meadow grass gain a little extra mood, scaled in
  `07_tuning_numbers.md`. This tunes into `23_animals.md`'s mood rules and needs
  no new system.
- A pond with the river table, so no farm lacks a fishable pond.

## Rule changes as data

Each farm has a record. Fields the code reads:

| Field | Meaning |
| --- | --- |
| `map` | Tiled map id |
| `startKit` | Items and seeds the player starts with |
| `startBuildings` | Buildings already standing (the Meadow coop) |
| `startAnimals` | Animals already owned, with default names |
| `fishTables` | A list of table ids with weights, for the farm's water |
| `weedRule` | Which weed variants appear (for example the special weed) |
| `grassBonus` | The mood bonus for animals outdoors, if any |
| `quarry` | Node count and tier rule, if any |

Anything not in a farm's record uses the default rule. This keeps types
addable one at a time and leaves the format clean for later modding, which we
keep in mind but do not build.

## Fish

A farm names a split of the existing tables from `21_fishing.md`. It does not
get tables of its own.

| Type | Water | Tables |
| --- | --- | --- |
| Standard | Small pond | River |
| Woodland | Small pond | River |
| Riverside | Wide water | River and woods, mixed |
| Hilltop | Small pond | River |
| Meadow | Small pond | River |

The split ratios and the pond size are placeholders. The valley fishing spots
are unchanged, so a farm's pond is a bonus and never the only source. Bundles
that need fish stay completable on every type.

## What every system must handle

A farm without a fixed pond or house position needs a rule wherever one is
assumed:

- **Watering:** the pond is the refill source. Each map must have at least one
  water tile reachable on foot, a new check for `problems` in `src/core/map.ts`.
- **House:** the map's `entry` and house position come from the farm record, not
  from a constant. The house is movable later in the same way as Stardew
  (`30_farm_types.md`).
- **Greenhouse:** the ruined building sits in a fixed spot on each map, so the
  Larder reward in `31_farm_growth.md` has a place on every type.
- **Animals:** buildings need a free area. A map marks where the coop and barn
  can stand, using a `buildSite` object class, a small addition to the map
  contract. Changed 2026-11-06: the owner chose player placed buildings on any
  free spot for the stable (`59_horse.md`), as Stardew. Coop and barn are likely
  to follow, so `buildSite` is at most a default spot. Note 60 settles it: every farm
  building is player placed, decided 2026-11-06.
- **Weeds and clutter:** use the tillable layer, so each map's size already sets
  the weed budget.
- **Saves:** the save records the farm type id and the map id. The type cannot
  change.

## Choice screen

1. New game, then a card list of the farm types in the build.
2. Each card has the map preview, the name and a one-line perk.
3. A tablet player taps a card, then a confirm button, with a back option.
4. The choice is locked when the first day starts. The summary on the title
   screen's load list shows the farm type.

In the first version only two cards appear. The rest are hidden, not greyed out,
so the screen does not show features that do not exist.

## Open

- A sixth type. Candidate: a sandy-soil farm like Stardew's Beach, which needs a
  no-sprinkler rule. Not on the list.
- Tile sizes per farm, once the tile size is settled.
- Whether Riverside gets a panning rule.
- Meadow numbers: the grass bonus, and whether the free coop affects the
  carpenter's first-coop cost.
- Hilltop numbers: node count, tiers and the clearing cost.
- Ratios of the Riverside fish mix, once `21_fishing.md` has the Fish findings.
