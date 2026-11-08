# 69 Geodes and minerals (draft)

Status: draft, built in part 2026-11-08. Settles where the four geode kinds drop and what
each cracks into, so the deeper mine floors can be built against it. Nothing
here is built. Closes the design part of SC-73 in note 54. Mineral names are
ours and are placeholders; Stardew's names are not used (ADR 0002).

## What the owner decided

- **Drop by depth band, as Stardew does (SC-73, 2026-11-08).**
- **Contents are per-geode pools, as Stardew does, with Omni drawing from all
  of them (2026-11-08).**
- **Write this note before building** (2026-11-08).

## What Stardew does (saved pages read 2026-11-08, black box)

- **Drops.** Geode: mine floors 1 to 39 and rocks above ground. Frozen: floors
  41 to 79. Magma: floors 81 to 119, and boxes in the Skull Cavern. Omni: rocks
  from floor 21 on, and panning. Frozen and Magma also come from treasure
  chests, farm quarry nodes and gifts. Daily luck does not change contents.
- **Contents.** Each kind rolls one of: an artifact (about 1 in 30), a foraged
  mineral (1 in 16), one of a pool of geode minerals (each about 1 in 30), or a
  resource. Resources are stone (1 in 8), clay (1 in 16) and ores. Ore amounts
  are 1, 3, 5, 10 or 20 at 30, 30, 30, 9 and 1 percent. Stone gives 1 half the
  time. Plain gives copper, coal and iron ore (iron only after floor 26).
  Frozen adds gold ore (only after floor 76). Magma adds gold and iridium ore.
  Omni draws from every pool and holds the rarest gem.
- **Cracking.** The smith charges 25g, a crusher machine is free later.

## Our design

### Drop bands

Our mine is 120 floors, so Stardew's bands map one to one.

| Kind | Where | Notes |
| --- | --- | --- |
| Geode | Floors 1 to 40 | The only kind built so far (floors 1 to 10). |
| Frozen Geode | Floors 41 to 80 | Iron band. |
| Magma Geode | Floors 81 to 120 | Gold band. |
| Omni Geode | Rocks from floor 21 on, rare in every band | Never the common find. |

Treasure chests, farm quarry nodes and winter gifts wait for those systems.
Rockhound (note 22) adds an extra geode of the band's kind.

### What each cracks into

Chances are Stardew's, scaled to our smaller lists. The ore matches our band
table in note 22 (copper 1 to 40, iron 41 to 80, gold 81 to 120).

| Pool | Stone | Clay | Ores | Foraged mineral | Artifact |
| --- | --- | --- | --- | --- | --- |
| Geode | 1/8 | 1/16 | coal, copper, iron after floor 26 | Earth-type, 1/16 | 1/32 |
| Frozen | 1/8 | 1/16 | coal, copper, iron, gold after floor 76 | Frost-type, 1/16 | 1/30 |
| Magma | 1/8 | 1/16 | coal, copper, iron, gold, Hearthsilver (rare) | Fire-type, 1/16 | 1/26 |
| Omni | all pools | all pools | all pools | all | all |

Ore amounts: 1, 3, 5, 10 or 20 at 30, 30, 30, 9 and 1 percent. Hearthsilver
takes the place Stardew gives iridium: amounts 1, 2, 3, 6 or 11. Clay needs an
item and a use (open, see below).

### Minerals

Three small pools of geode minerals, six each to begin with (Stardew has 15, 14
and 12). Names are drafts, with the sell price in the 40 to 250g range:
pools sell low in the plain pool and high in Magma. Placeholder ids go in
`src/content/geodes.json`. Each pool also has its foraged mineral (Earth,
Frost, Fire types), found on the ground in its band as well.

The gem list in note 22 and the Glimmerstone (floors 100 to 120 only, 0.2
percent per geode) sit on top: the Glimmerstone stays out of the Omni pool
until floor 100 is reached, as Stardew keeps its rarest gem back until 15 Omni
geodes are cracked.

Built: drop bands, the four contents pools (`src/content/geodes.json`,
`src/core/geodes.ts`), the smith cracking every kind for 25g and the dwarf
buying each kind at its sell price. Floors 41 and deeper are not built yet, so
only plain geodes drop for now. The Glimmerstone, the crusher, a use for clay
and the gallery are not built. Iron and gold gates use the deepest floor reached.
Omni is 8 percent of geode nodes from floor 21 (placeholder). Hearthsilver ore is
a placeholder item.

## Open

- Minerals go in the library gallery (note 39, decided 2026-11-08, Stardew's
  shape). Its donation list count and rewards wait for the final mineral lists.
- Where clay comes from and what uses it.
- Our artifacts: one per geode kind, from note 22's found things list.
- Final mineral names and prices, and the count per pool.
- The crusher machine: a craft later, free to run.

## Build order

1. Floors 11 to 40 and a plain geode that cracks per this note.
2. Frozen with floors 41 to 80, Magma with floors 81 to 120.
3. Omni once the first three are in.

## Who cracks and who buys, once the maps exist (owner, 2026-11-08)

The Hearthwell blacksmith cracks geodes (25g) and handles ore, and does not buy
geodes, as Stardew's blacksmith does (saved Blacksmith page, SC-58 and SC-60;
`71_map_areas_overview.md` answer 7). The Mountain smith dwarf is a Mines-side
trader who sells lamps and rest-camp supplies and buys ore for coin, with no tool
upgrades (`74_mountain.md`). This replaces the earlier line "the smith cracks, the
dwarf buys": nobody buys geodes uncracked. The built stand-in (the dwarf buying each
kind at its sell price) stays until Hearthwell's smithy exists, and then the
purchase is removed in the same slice. Open: whether a geode can be sold at a
general counter at all (Stardew's blacksmith does not buy them, and whether the
shipping bin takes them is unchecked).
