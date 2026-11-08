# 43 Wood source: trees on the farm, the axe and the supply (draft)

Status: built in the axe and tree slice (2026-11-01). Decided with the owner on 2026-11-01.
It finishes the open item "where common trees stand on the farm" in
`36_gathering_trees_sap_fiber.md`, and answers why `wood` has no source today
(`src/core/items.ts`), so the house upgrade can only be bought with the debug
menu (`41_house.md`, `42_debug_menu.md`). The tree rules themselves (chop
yields, stumps, growth, spread, regrowth) stay in note 36 and are not repeated.

## Decisions

- **Wood comes from farm trees in the first playable.** The Forest map does not
  exist, so the farm is the only place for trees now. The carpenter sells wood
  (decided 2026-11-03, `41_house.md`), but chopping is far cheaper. The Forest adds more trees when it is built. Owner, 2026-11-06: the Forest is the main wood source once the farm's wood runs out, so it needs a steady supply and room for it (area size in `19_valley_layout.md`). How the supply renews is not designed yet.
- **Many trees, so wood is plentiful and energy is the limit (revised
  2026-11-03).** The day 1 farm is dense like Stardew's (note 55). The working
  target is about 100 trees: about 80 mature, 12 young and 8 seedlings,
  with the exact count set on the first Tiled draft. All chopped and all stumps
  lifted gives about 1,500 wood at foraging level 0, which is over three times
  the 450 for house tier 1. That is fine, because wood is not the gate. Energy
  is: a tier 0 tree and its stump cost about 30 energy together, so the whole
  stand is thousands of energy, many days of work. The player clears what they
  need, in the order they need it. This is ours. Stardew's starting tree count
  is not taken from a saved page; the owner's screenshot only shows it is
  dense.
- **Trees are scattered across the field, as Stardew's clutter is.** They
  stand on the ground the player later wants to farm, so clearing them is part
  of making room. Stardew's exact tree layout is not checked.
- **Growth is Stardew's random rule** (note 36): 20 percent a night per stage,
  median 24 days, no growth in winter. The fixed 24 days fallback in note 36 is
  not taken. Check on a tablet whether the wait feels too uncertain.
- **Chopping is held, as Stardew's tools are.** The player faces a tree and
  holds the action to repeat the swing. A tap swings once. On touch the player
  holds on the tree's tile (`27_touch_controls.md`).

## The axe

The axe is a starter tool, with the hoe, can and pickaxe (`22_mines.md`). It
is in the toolbar from tier 0. The tiers are #194.

| Thing | Rule |
| --- | --- |
| Swings per tree | Stardew's Axe page: 10, 8, 6, 4, 2 at tiers 0 to 4. Our fifth tier takes the iridium number. |
| Swings per stump | Stardew: 5, 4, 3, 2, 1. |
| Swing energy | The formula in note 22: `2 - 0.25 * tier - 0.1 * level`, never under 0.5 (ours). The level is foraging. A tier 0 tree costs about 20 energy and its stump about 10. |
| Hold repeat | One swing every 0.4 seconds (ours) while Use is held and a tree or stump is faced. Stardew's mobile controls repeat tool use while the button is held. |
| Young tree, loose seed | 1 swing. |
| Seedling or planted seed | 1 swing from any tool except the can on a seed. The hoe and axe lift a seed back to an item (foraging level 1), as note 36. |
| Foraging XP | When the tree falls and when the stump is removed, as note 36. |

- **Drops and the full bag.** Goods go to the backpack. Any that do not fit land
  on the nearest open tile within 3 tiles and are saved, so nothing is lost.
  The player pulls them in by walking within the pickup radius, as far as there
  is room. Stardew's tree products scatter and are collected by magnetism,
  and rings widen that radius by 1 or 2 tiles. The saved pages do not say what
  Stardew does with a full pack. The base radius is 1 tile (ours), in
  `pickupRadius()` so a ring or buff can add to it later.
- **Holding carries on.** One hold fells the tree and then uproots its stump, as
  a held tool repeats. It stops when the tile is clear or the player lets go.
  A player who wants to keep a stump must release in time. This is inferred
  from Stardew's repeat and not stated on its pages.
- **Stumps are real.** Stardew leaves a stump after a mature tree, and removing
  it gives 4 to 9 wood and 1 foraging XP.
- **Three kinds of woody obstacle, not one (owner, 2026-11-06, SC-31).** The
  stump left by a chopped tree (above) is a different thing from the stumps
  and hollow logs in Stardew's starting field. Those are hardwood obstacles
  that need a better axe, and a hollow log is a bigger, tougher one. They
  belong with hardwood and the axe tiers, not with the common tree rules. Which
  axe tier is set in note 44 (copper for stumps, steel for logs; owner, SC-31, the
  Standard farm starts with both). The saved Hardwood page says a Large Stump
  gives 2 Hardwood and no daily respawn is listed for the Standard farm, so
  cleared ones stay cleared by that rule; the log yield is open (SC-31).
- Stages in code are 1 (seed), 2 and 3 (seedlings), 4 (young) and 5 (mature).
- The axe tier ladder is #194 (note 22). Slice 1 builds tier 0 only. The swing
  table above is the contract the ladder fills in.

## Trees on the farm map

- **Hand-placed, as note 32 says of all clutter.** Nothing random at the start
  of a new game. The map has a `tree` object class, one point per tree, with
  an integer `stage` property (1 to 5, 5 if absent), and an optional `paths`
  tile layer that keeps seeds off paths. Both are in the map contract in
  `05_farm_map_placeholder.md`. The border trees stay as scenery tiles and
  cannot be chopped.
- **Count on the placeholder farm:** 30 trees. 8 stand on `soil` tiles (rows 14
  to 17 of the patch, so the playtest rows stay clear), and the rest on open
  grass. The placeholder keeps this until the real farm replaces it. The real
  farm has about 100 (decision above), spread over the field and thinner near
  the house (note 55).
- **Blocking:** seedlings, young and mature trees and stumps block movement. A
  seed in the ground does not. The `collision` layer is not edited. Core reads
  trees from its own state (`GameState.trees`, saved with the game), so a felled
  tree frees its tile with no map change. The map check treats the starting
  trees as solid, so a layout cannot wall off an exit or forage spot.
- **Seasons:** trees do not change with the season in slice 1. Winter growth
  stops, as note 36.
- **Valley trees later.** Forest and Mountain are the first valley places, and
  they can carry denser stands. The regrowth rule in note 36 is already for
  them. Decided 2026-11-06 for M3, not M2: three tree types by region as Stardew (SC-30), in
  fixed places, regrowing when chopped, and some cosmetic trees that cannot be
  chopped, like the farm border.

## Hardwood (built 2026-11-07, owner asked for the real item)

Settled briefly where the notes left gaps. Numbers are placeholders (note 07).

- **The item.** `hardwood`, sells 15g (the saved Hardwood page). It replaces
  every wood stand-in in the build: the stable (100), house tier 2 (100) and
  the large stump's yield. The cask (40 wood) and other crafting costs in notes
  24 and 34 still use wood, because hardwood is scarce (below); they move when
  there is more of it.
- **Source today: large stumps.** 2 hardwood each, copper axe or better (note
  44; a basic axe is refused with a message and costs no energy), swings are a
  stump's plus 3 (ours), 3 foraging XP. The Woodland farm has 6 that regrow after
  4 days (about 3 a day). The Standard farm has 3, hand placed on the soil, that
  do not come back (`stumpRegrowDays` 0 now means the stump is removed, as note
  44 says of the Standard farm). No sap from a large stump.
- **Not built.** Large logs (steel axe), the Secret Woods with its six daily
  stumps, Mahogany trees, the Mines floors 41 to 69 and the other Stardew
  sources. Until the Secret Woods exists, 100 hardwood is out of reach on the
  Standard farm (3 stumps give 6) and takes about 33 days of Woodland stumps.
- **Temporary carpenter sale (owner, 2026-11-08).** The carpenter sells Hardwood
  at 200g each (Stardew's price from memory, unchecked: the saved Carpenter page
  lists none) so the stable and house tier 2 are reachable on the Standard farm.
  REMOVE it when a real supply exists (logs, Secret Woods, Mahogany, Mines
  hardwood): set `enabled` false in `src/content/carpenter-standin.json`, or
  delete that file, `src/core/carpenter.ts` and the scene row.
- **Saves.** Nothing new is saved. Large stumps and their regrow timers load as
  before, and a stable or house order already paid in wood stays paid.

## Supply and demand (slice 1)

| Source | Wood |
| --- | --- |
| One mature tree | 12, plus 1 per foraging level up to 4, so 12 to 16 (note 36, ours) |
| Its stump | 4 to 9 |
| The 80 mature starting trees, all chopped and all stumps lifted | about 1,500 at level 0, 1,800 at level 4 |
| Young tree | 4 |

| Sink | Wood |
| --- | --- |
| House tier 1 | 450 |
| Chest | 50 |
| Wood fence | 2 each |
| Campfire, brazier, torch, machines | 1 to 60 each (`34_crafting.md`) |

- Fences and machines no longer compete with the house for long: 450 for tier 1
  plus fencing 40 tiles (80) and a few machines (40 each) is well under the
  stand. The real limit is the energy to chop. A tree and its stump give about
  18.5 wood for 30 energy, so 450 wood costs about 730 energy, roughly 3 full
  days of chopping at 270 maximum energy. Wood is therefore not the gate for
  house tier 1, the 10,000g is. Rechecked 2026-11-06. Check in a playtest.
- **The carpenter also sells wood** (4,500g in year 1, as Stardew), so a player
  short on time can buy the last of the 450.
- **Surplus wood** has sinks later: chests, fences, the charcoal kiln (10 wood
  for 1 coal, note 22) and bundles that ask for wood. If wood piles up with no
  use, raise a sink and do not cut the trees, since the clutter is the look.
- Sap and moss come with the same chop, so trees also feed fertilizer and
  crafting (note 36). Sap needs no extra work here.
- The debug menu's wood row stays for testing.

## What was built (a slice, in order)

1. The axe tool at tier 0, with the hold repeat and the swing table.
2. Core: `trees.ts` for the state (position, stage, stump), the nightly tick and
   the chop and stump rules, unit tested. Saved with the farm.
3. The `tree` object layer and the placement on the farm map, drawn with
   placeholder art.
4. Wood, sap and tree seed items. Planting: the player plants a tree seed on any
   free tile that is not tilled, a path, an exit, an entry or a service tile.
   A hand on a mature tree shakes down a loose seed.
5. Still to do: a playtest persona run that reaches house tier 1 from the
   starting trees. Check the 450 target and the hold repeat on the real tablet.

## Open

- **Planting rules.** Stardew's allowed ground for a tree seed is not checked.
  Built as: any free tile that is not tilled, a path, an exit, an entry or a
  service tile. Seeds also spread onto untilled soil, and the player lifts them
  with any tool (only the axe does so far).
- **The pickaxe** also lifts seedlings and seeds (note 36) once it exists.
  The hoe and can already do so. The hand does not.
- **Old saves** get the map's starting trees, wherever they fall, so a tree can
  appear on land the player already uses. Trees are never placed on a plot, and
  the player can fell them.
- **Hold repeat on touch.** Whether holding on the tree's tile conflicts with
  hold to ship one on the shipping bin (`28_shipping_bin.md`). Settle in the
  tablet check.
- **Stump swing count and its energy.** Placeholders until the ladder.
- **The tree count** is ours: about 100 now (above). Playtest sets it, with the
  450 target and the first season's clearing pace.
- **Where the first crops go on day 1.** A dense field has no free soil. Whether
  a small patch near the house starts cleared is open in note 55.
- **Hardwood** and large stumps: the Secret Woods hold six that respawn daily
  (decided 2026-11-06, `59_horse.md`), and the Woodland farm type
  (`32_farm_types.md`) adds its own. Axe tiers are in note 44.
- **Tapper and Lumberjack professions and the sawmill** still wait for a later
  note (note 36).

## Not taken from Stardew

- Species by region and the mushroom, mystic and green rain trees (note 36).
- Lightning on trees (note 36).
