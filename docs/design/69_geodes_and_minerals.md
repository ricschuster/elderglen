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
| Geode | Floors 1 to 40 | Built (all four kinds are items, the node kind follows the floor band). |
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

## Artifact spots and gem nodes (owner, 2026-11-12)

Closes the design part of #879 for these two systems. Stardew claims are from the saved
Artifacts, Hoe and Mining pages (read 2026-11-12). Every number below is a placeholder
unless it says Stardew's.

### Decisions

1. **Artifact spots follow Stardew.** A marked spot on the ground, dug with the hoe in the
   valley areas, each area giving its own finds, **much more common in winter**. The hoe
   on dirt in the mines can also give an artifact. Stardew's averages (search snippet of the wiki,
   SC-154) run 0.1 to 1 a day by area and 0.4 to 1.4 in winter, so ours is 0 to 2 a day in
   an area and 1 to 3 in winter (owner chose it, 2026-11-12).
2. **42 artifacts to match Stardew's list.** One of each is donated to the library gallery
   (note 39), with rewards at donation milestones. Names, art and prices are ours (ADR
   0002). Bundle 26's four old things (old seed packet, carved bead, faded ribbon, pressed
   flower) are four of the 42.
3. **Six gems in three bands (Stardew's shape).** Two gems from any floor, two from the
   Cold Deeps (floor 41), two from the Ember Deeps (floor 81 or after the bottom is
   reached). The Glimmerstone stays the rarest, deep only, and also comes from geodes.
   Diamond-like rare node chance is a fixed chance by band. Mining level gates the ore
   tier, not the gem odds (decided earlier today).

### Artifact spots (build)

- **Placement.** Each morning the area rolls its spots on bare diggable tiles. Winter
  rolls more and lets more tiles count as diggable (as Stardew does).
- **Dig.** The hoe on a spot removes it and rolls the area's table. A spot is never empty:
  if no artifact rolls it gives a small common find (clay, seed packet, stone, as Stardew
  gives a seed or resource, unchecked).
- **Tables.** Per area, 3 to 5 artifacts each, shares from 0.5 to 3 percent (Stardew's
  page lists per-spot chances in that range). Areas: Forest, Secret Woods, Delta, Mountain,
  Cove. Mine finds come from the dirt rule below, creatures and geodes.
- **Mine dirt.** Tilling a diggable mine tile has a small chance of an artifact, by band
  (placeholder 0.15 percent, Stardew's lowest rate is 0.1 percent). Bundle 26's old things
  also drop from Old Diggers.
- **Duplicates.** Donating one keeps the rest as gifts and sellable. A found artifact
  already donated still works as a find and is not blocked.
- **Data.** `src/content/artifacts.json`: id, name, sell price, areas with shares, other
  sources. Core in `src/core/artifacts.ts`, free of Phaser.

### Gem nodes (build)

- **Gems.** Placeholder ids until the mineral names are final: low gems
  `gem-low-a`, `gem-low-b` from any floor; mid gems `gem-mid-a`, `gem-mid-b` from floor
  41; high gems `gem-high-a`, `gem-high-b` from floor 81. Sell prices 50 to 750g.
- **Node.** A rock node that takes the same swings as a geode node and drops its gem.
  Share of rocks: 1.5 percent in the Upper Galleries, 2.5 in the Cold Deeps, 3.5 in the
  Ember Deeps (placeholders). One gem a node.
- **Glimmerstone.** Floors 100 to 120, 0.5 percent a node (note 22 placeholder).
- **Rockhound** (note 22) applies to gem nodes as it does to geodes.
- **Quarry.** A small gem share in the Quarry (note 78): 0.5 percent a rock.
- **Experience.** A gem node gives more Mining experience than a plain rock, rising with
  the gem tier (Stardew's pattern from the saved Mining page).

### Still open

The 42 names and prices, the six gem names, the gallery donation rewards, the real daily
spot count (SC-154) and the dirt chance. Build uses placeholders.

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
