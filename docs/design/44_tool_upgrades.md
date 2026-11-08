# 44 Tool upgrades: the axe and pickaxe ladders (draft)

Status: draft. Decided with the owner on 2026-11-01. Built 2026-11-07 (session e) for the hoe, can and pickaxe at grades 0 to 3, and for the axe at grades 0 to 3 (slice 1 leftovers, #522: the axe reads its grade for swings per tree and stump and for energy, and goes to the smith like the others): gold plus 5 bars, the smith keeps the tool 2 days (a notice on waking, tool shown "(smith)" on the toolbar and refused meanwhile), one tool at a time (placeholder), tools handed over at the smith dwarf's screen, not the shop. Pickaxe swings per rock by grade are placeholders in `src/core/rocks.ts`. Built 2026-11-08: the Hearthsilver grade (tier 4) for all four tools: 5 Hearthsilver bars and no gold, smelted from the ore at the furnace (5 ore, 2 coal, 8 hours, placeholders in note 07), pickaxe swings extended to a fifth column (placeholders in `rocks.ts`), the axe at 2 swings per tree and 1 per stump already in `trees.ts`. Hoe and can get the energy saving only. Not built: large stumps and logs, and the smith closing on festival days. It
answers the axe and pickaxe part of #194 and replaces the gold-only upgrade rule
in `07_tuning_numbers.md` for all four tools. Reference: the saved Stardew
Valley Wiki pages Axe, Pickaxe, Tools, Blacksmith, Hardwood and Secret Woods,
read only (ADR 0002). The owner chose Stardew's behaviour on every question
below. Item and metal names are ours.

## Decisions

- **Five grades, tiers 0 to 4,** for the axe, pickaxe, hoe and can (the hoe and
  can have four today). Names: Basic, Copper, Steel, Gold, Hearthsilver. The first four are
  already in `TIER_NAMES`. Hearthsilver is the metal in `22_mines.md`.
- **Cost is gold plus 5 bars (Stardew), for all four tools.** The hoe and can
  move off gold only, so the mines gate every ladder, as note 22 already says
  ("all tool upgrades need gold and bars").

| To grade | Gold | Bars (5) | Stardew |
| --- | --- | --- | --- |
| 1 Copper | 2,000g | Copper | 2,000g, copper |
| 2 Steel | 5,000g | Iron | 5,000g, iron |
| 3 Gold | 10,000g | Gold | 10,000g, gold |
| 4 Hearthsilver | none | Hearthsilver | 25,000g and iridium. Ours skips the gold (note 22) |

- **Grades go in order.** A copper tool cannot jump to gold (Stardew).
- **The smith dwarf keeps the tool for 2 days (Stardew).** Hand it over before
  she closes on day D, wake on D+1 without it, and collect it at her on D+2. A
  notice shows on waking on D+2. She still sells ore and coal and cracks geodes
  meanwhile (her shop is in `22_mines.md`).
- **Only one tool at a time?** The Stardew pages say nothing about a limit.
  Open.
- **The can comes back refilled** after its upgrade (Stardew). Built as true by
  default: the can has no water level in our rules (it never runs dry), so there
  is nothing to refill. Revisit if a water capacity is ever added.
- **Order of gates:** the bars come from the mines or from bought ore smelted at
  the furnace. A player who never fights can still finish copper, steel and gold.
  Only Hearthsilver needs the deep mine (floors 100 to 120).

## The axe ladder

| Grade | Swings, mature tree | Swings, stump | Larger wood |
| --- | --- | --- | --- |
| 0 Basic | 10 | 5 | none |
| 1 Copper | 8 | 4 | Large stumps |
| 2 Steel | 6 | 3 | Large logs |
| 3 Gold | 4 | 2 | |
| 4 Hearthsilver | 2 | 1 | |

- Numbers are Stardew's Axe page, with our fifth grade on its iridium row.
- **Large stumps** (copper or better) and **large logs** (steel or better) give
  hardwood. A steel axe clears the log that blocks the Secret Woods, which
  settles the tier note 19 left to tuning. Stardew's Hardwood page says six
  stumps regrow a day in its Secret Woods and gives 2 hardwood each. The
  stump swing count and the log's yield are not on a saved page and are open.
- **The Standard farm starts with hardwood stumps and hollow logs** (owner,
  2026-11-06, SC-31, from play): large stumps need a copper axe and large logs a
  steel one. Both tiers are Stardew's rule from memory and not checked on a saved
  page (note 54). The Woodland farm and the Secret Woods have more of them. The
  rule is recorded here so the grade is not changed twice.
- **Energy per swing** stays `2 - 0.25 * tier - 0.1 * level`, never under 0.5
  (note 22, ours), with foraging as the level. Stardew's page says "See
  Proficiency Notes", which is not on a saved page, so the formula is not
  checked.

Energy to fell a tree and remove its stump at foraging level 0:

| Grade | Tree | Stump | Both | Swing |
| --- | --- | --- | --- | --- |
| 0 | 20 | 10 | 30 | 2.00 |
| 1 | 14 | 7 | 21 | 1.75 |
| 2 | 9 | 4.5 | 13.5 | 1.50 |
| 3 | 5 | 2.5 | 7.5 | 1.25 |
| 4 | 2 | 1 | 3 | 1.00 |

So a Steel axe more than doubles the trees a day, which also eases the 450
wood for house tier 1 (`43_wood_source.md`, `41_house.md`). The wood playtest
persona should be rerun with a Steel axe once the ladder is built.

## The pickaxe ladder

The cost, wait and order rules above apply as they are. Swings per rock follow
the same shape: each grade breaks the same rock in fewer swings and for less
energy. The numbers belong to the rock hardness table in `22_mines.md`, which is
a placeholder by floor band.

- **Not taken from Stardew: ore gating.** Stardew's steel pickaxe is needed
  for harder nodes, and a steel or better pickaxe for farm boulders. Note 22
  decided that any pickaxe digs any node, and that stays. Whether the farm has
  boulders, and which grade clears them, is open (`22_mines.md`).
- Stardew's Pickaxe page also lists hits for each node by grade, floor band and
  quarry. Those are a source for the hardness table, not a rule here.

## Conflicts this reopens

- **Young trees and seedlings.** `43_wood_source.md` says a young tree (stage 4)
  falls in 1 swing and a seedling in 1, with any tool. The Axe page says a Steel
  axe needs 3 swings on a stage 4 tree and 2 on stage 3 and below, a Gold axe 2
  and 1, and an iridium one 1 and 1. The page does not give the Basic and
  Copper numbers. Our 1 swing is wrong for Steel and Gold if we follow the
  page. Open: take the page for Steel and up and derive Basic and Copper (they
  must be at least Steel's), or keep 1 swing for the farm's few young trees.
- **Hoe and can are already built at gold only.** Moving them to bars needs
  bars to exist in the build, so it lands with the furnace and ore (the mines
  slice in `33_build_order.md`). Until then the live shop keeps its gold only
  rule, and the axe and pickaxe are not upgradable.

## Build notes (not built)

- `src/core/upgrades.ts`: `UPGRADABLE` gains `axe` and `pickaxe`. `TIER_NAMES`
  gains Hearthsilver, so `MAX_TIER` becomes 4. `UPGRADE_COST` becomes gold and
  a bar list per step. An upgrade in progress is saved as the tool, its new
  grade and the day it returns.
- Swing counts move from a constant table to a per-grade lookup, which the axe
  already reads (`43_wood_source.md`, "the swing table is the contract").
- The shop's tool rows move to the smith dwarf's screen, with a "ready on day"
  line. Touch needs no hold or drag (`27_touch_controls.md`).
- The toolbar shows the missing tool's slot as empty with a small "at the smith"
  marker, so the player knows where it is.
- Tests: grades in order, the bars taken, the 2 day return across a day end
  and a save, the upgraded grade kept, and the energy table above.

## Open

- Whether the smith closes on festival days, and so adds a day to a tool left
  two days before one (Stardew's rule). Festivals are in `14_festival_calendar.md`.
- One tool at a time, or several (not on a saved page).
- The large stump swing count (built as a stump's plus 3, ours), the large log
  yield, and hardwood per stump (built as 2, the saved page; note 43). The saved Hardwood page lists no daily respawn of
  stumps or logs on the Standard farm.
- The young tree and seedling swing counts per grade (above).
- Whether farm boulders exist, and which pickaxe grade clears them.
- The Powerful enchantment (a Stardew forge result that lets any axe clear large
  wood) is not taken. Enchanting is not designed (`37_equipment.md` has the
  forge only for ring combining).
- Some Stardew farm maps let a copper axe or better destroy certain bushes. Not
  taken. A farm type note may want it (`30_farm_types.md`).

## Not taken from Stardew

- The 25,000g price on the top grade (ours is bars only).
- The trash can ladder. A trash can upgrade is not designed.
- Item names, art and text.
