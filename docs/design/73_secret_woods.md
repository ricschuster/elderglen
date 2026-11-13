# 73 Secret Woods (steps 1 to 4 built)

Status: draft, written 2026-11-08, owner answers recorded the same day (note 71).
Steps 1 to 4 are built (2026-11-09, #639, see "Built status" at the end); the pond's fish and
the statue are not. M3b. It designs the Secret Woods map and settles the hardwood supply that note
59 decided. Overview and owner questions: `71_map_areas_overview.md`. Stardew
facts are from the saved Secret Woods, Hardwood and Large Log pages (read
2026-11-08), as ideas only (ADR 0002).

## Why

Hardwood has no real source on the Standard farm. The stable (100 Hardwood) and
house tier 2 (100 Hardwood) are reachable today only through the carpenter's
temporary sale at 200g each (`43_wood_source.md`, owner 2026-11-08). The owner
decided on 2026-11-06 that six large stumps in the Secret Woods respawn daily,
2 Hardwood each (`59_horse.md`). This note makes that a map, so the stand-in can
come out.

## Decisions (draft)

1. **One small map, `secret-woods`, 48 by 40 tiles** (1,920, Stardew's total,
   note 19). Longest crossing 10 seconds. No residents (note 20).
2. **One way in:** from the Forest, behind the massive log. A steel axe or
   better clears the log once, for good (note 44, SC-31).
3. **Six large stumps regrow every morning, 2 Hardwood each** (copper axe or
   better). About 12 a day, so 100 Hardwood is about 9 visits (note 59).
4. **Four stumps in the upper glade, two in the lower hollow** behind a short
   covered passage, so a visit is a small walk and not one square.
5. **The spirit's statue stands here** (note 39, elderfruit source 5): an old
   mossy stone the player gives a rare fruit to, once.
6. **Rare forage, with a high rare share,** as note 19 says.
7. **A small pond,** fishable (owner, 2026-11-08, as Stardew): one unique fish and
   two common ones.
8. **No creatures in the first build** (owner, 2026-11-08: they come later, as
   Stardew has slimes, with the combat notes). **Mahogany seeds come from here
   (owner, 2026-11-10, note 36 "Mahogany"):** a chance from a daily stump now and
   from creatures when they exist. No wild Mahogany tree stands in the woods. The
   hardwood supply is the stumps, kept as designed.
9. **The carpenter's stand-in is removed in this slice.**

## Shape and layout

```text
 x:  0       12       24       36     47
 y0  +--------------------------------+
     |  cliff and dense trees         |
     |  S1(12,9)  S2(19,6)  S3(27,10) |
 y10 |   SPIRIT        S4(35,7)       |  Upper glade
     |  (9,15)                         >  exit to Forest
     |  ......  glade floor ......    |  (47,10..13)
 y22 |        passage (38..39,22..26) |
     |    ............................|
 y28 |   POND (24..33,29..34)         |  Lower hollow
     |  S5(15,33)          S6(37,32)  |
y39  +--------------------------------+
```

| Feature | Place (tiles) | Notes |
| --- | --- | --- |
| Exit to the Forest and entry | East edge, x 47, y 10 to 13; entry `from_forest` at (45, 11) | The only exit |
| Upper glade | x 6 to 44, y 4 to 22 | Open floor, scattered flowers, no paths layer needed (no seeds spread, see below) |
| Stumps S1 to S4 | (12, 9), (19, 6), (27, 10), (35, 7) | Large stumps, one solid tile each, as the farm's |
| Spirit's statue | (9, 15) | A service tile. Plain and mossy until the gift |
| Covered passage | x 38 to 39, y 22 to 26 | Two wide, five long, walls of dense trees |
| Lower hollow | x 12 to 42, y 26 to 38 | Pond and two stumps |
| Pond | x 24 to 33, y 29 to 34 | About 10 by 6 |
| Stumps S5 and S6 | (15, 33), (37, 32) | The lower pair |

The idea (a log-blocked way, four stumps above, two below a passage, a pond and a
statue) is taken from what the saved page says it contains. The shape and tile
positions are our own and not a trace.

## Hardwood, in numbers

- **Source.** `stump` objects with a map property `stumpRegrowDays: 1` (contract
  need 5). The existing farm-type mechanism of note 43 already does regrowth on a
  timer; this gives a map its own value. Yield 2 Hardwood a stump, copper axe or
  better, a basic axe is refused (note 44).
- **Cost to the player.** A large stump takes a stump's swings plus 3 (note 43), so
  about 7 swings at copper, 12 energy by the note 22 formula at level 0. Six
  stumps are about 74 energy and 12 Hardwood a day. Placeholder.
- **Use.** The stable needs 100, house tier 2 needs 100, and the carpenter's
  stable and large buildings follow (`59_horse.md`, `41_house.md`). Two such
  goals are about 17 visits, a sensible mid game chore and not a wall.
- **The log.** 8 Hardwood once, and 25 Foraging XP (saved Large Log page, from
  the `log` object of contract need 2).
- **Removing the stand-in.** In the same slice set `enabled` false in
  `src/content/carpenter-standin.json`, then delete that file,
  `src/core/carpenter.ts` and the scene row, as note 43 says. Update
  `PRIORITIES.md`, which lists the removal.

## Forage

Per-map table (contract need 3). 30 candidate spots in the glade and hollow. Cap 4
a morning, 6 in winter (Stardew's page: 0.9 a night in spring, 1.0 in summer, 0.8 in
fall, 1.4 in winter, placeholder match). The rare share is high because the area
exists for it (note 19).

| Season | Weights |
| --- | --- |
| Spring | wild horseradish 40, morel 35 (rare), wild leek 25 |
| Summer | fiddlehead fern 75, wild ginger 25 (rare) |
| Fall | field mushroom 40, chanterelle 35 (rare), wild garlic 25 |
| Winter | snowcap 35 (rare), holly sprig 40, winter cress 25 |

- Digging spots: none until an artifact note exists. The saved page lists
  clay, stone and a few finds. Not designed here.
- No villager ever walks here, so placed chests and machines are safe.

## Fishing

A pond water kind, `woods-pond` (contract need 1). Fishable all year, no seasons
(owner, 2026-11-08, as Stardew): two common fish already in the roster and one
unique fish of our own, name and bar motion still to be designed with the fish
roster (`21_fishing.md`). The unique fish is the 47th, so Whole Roster
(`38_achievements.md`) and the completion fish count (`39_completion_total.md`)
count 47. The Secret Woods fish is never needed by a bundle (note 71, rule 6
applies to it as it does to the cove). Casting spots: the pond's shore, with the
covered passage kept clear.

## The spirit's statue

Note 39 settled the elderfruit source: a spirit here accepts the fruit of the
rare seed the hermit gives (the ember berry, note 39) once, and the player gets
an elderfruit. This note only places the tile and says the map holds it. The
hand-in is built with the elderfruit slice (note 39, #196).

## Exits, entries and gates

| Object | Name | Target | Notes |
| --- | --- | --- | --- |
| exit | `to_forest` | `forest` entry `from_secret_woods` | East edge |
| entry | `from_forest` | (45, 11) | Beside the exit |
| gate | `secret-log-cleared` | save flag | Set when the player chops the log. The Forest exit needs it |

## Map contract needs

Water kind (1), `log` object and gate (2), per-map forage (3), per-map stump
regrow (5), `rideable` (7). The map has no tree objects, and the choppable
`tree` class is not used, but cosmetic trees fill the border.

## Build order and slices

1. Shell: map, exit, entry, glade, passage, hollow, collision. No gate yet (the
   Forest exit is staged).
2. The six stumps with daily regrowth, the Hardwood yield, the axe grade check, a
   test that a day's passing restores them. Remove the carpenter stand-in.
3. The log in the Forest, its chop rule (steel axe), the gate flag, the 8
   Hardwood and the exit. Tests that an unchopped log leaves the exit gated.
4. Forage table.
5. Pond and its fish (approved).
6. The statue, with the elderfruit slice.

Work package: "Secret Woods map, hardwood stumps and the massive log" (steps 1 to
4), and the pond and statue ride with fishing and elderfruit.

## Open

- The unique pond fish: its name, price and bar motion (design with note 21's
  roster, which says 46 and needs a 47th row).
- Creatures come later, with the combat notes (owner, 2026-11-08). The 10 percent Mahogany seed chance on a daily stump is built (note 36, #724); the creature drop waits for the creatures.
- The stump swing count and the yield of a stump at tier 2 and above are tuning.
- Whether the saved page's "lost items shop" idea has a use: our tools return
  (SC-79) and there are no unique unrecoverable items, so it is not in scope.

## Owner answer 2026-11-08m

The pond's unique fish is the **Fernscale** (renamed from the working name Mossback, owner 2026-11-12, to avoid the river's Old Mossback), a shy mossy fish. Its bar motion, price and conditions are designed with the roster (`21_fishing.md`).

## Built status (2026-11-09, #639)

Build order steps 1 to 4 and the stand-in removal are built.

- **Map:** `src/content/maps/secret-woods.json`, 48 by 40, drafted by
  `scripts/drafts/gen-secret-woods-map.mjs` (the JSON is the source from then on).
  Properties `wild`, `rideable`, `waterKind` woods-pond and `stumpRegrowDays` 1.
  Glade, covered passage (x 38 to 39, y 22 to 26) and hollow as in the sketch,
  six `stump` objects (kind oak) at the note's tiles, 22 cosmetic trees in each
  of glade and hollow, 6 rocks, 8 twigs and 14 weeds at the start, 30 forage
  spots. Entry `from_forest` (45, 11), exit `to_forest` (x 47, y 10 to 13).
- **Pond:** the water tiles are placed and typed `woods-pond`, so the map is
  walkable and the pond is blocked. It has no fish table yet: fishing waits for
  the fish slice (step 5).
- **Stumps:** `stumpRegrowDays` 1 gives a chopped stump a one day timer, and
  `sleep()` ticks it through `areasEndDay`. Copper axe or better, 2 Hardwood,
  3 Foraging XP, a basic axe is refused (the existing large stump rules).
- **Forage:** `forage-areas.json` entry `secret-woods`, the table above, cap 4 a
  morning and 6 in winter.
- **The log:** two `log` objects on the Forest at (7, 15) and (7, 16) share the
  flag `secret-log-cleared`, so the two wide corridor is sealed by either. A
  conditional layer `log` (`unless` the flag) draws it. The scene now builds its
  door conditions from the saved flags (they were left out before) and refreshes
  them, and the log art, after every tool use, so the exit opens as soon as the
  log is chopped.
- **Stand-in removed:** `carpenter-standin.json`, `core/carpenter.ts`, the
  carpenter's Hardwood row and its test are deleted.
- **Not built:** the pond's fish (the Fernscale and the two common ones), the
  spirit's statue, digging spots, creatures and Mahogany.
- **Playtest:** `npm run playtest:secret-woods` (steel axe, log, woods, stump,
  night). It starts by a scene restart at the Forest entry, not a walk from the
  farm.
