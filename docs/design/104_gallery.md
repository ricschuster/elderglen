# 104 The library gallery

Status: draft, design only, 2026-11-16. Nothing is built. Extends note 39 (the
completion total and elderfruit source 7), note 38 (achievements), note 69
(geodes, minerals, artifacts), note 86 (the library interior) and note 20
(the librarian). Stardew claims are from the saved Museum page (read
2026-11-16) unless a row in note 54 says otherwise (ADR 0002, black box only).

## What exists today

- Decided: a gallery in the library, run by the librarian, taking minerals,
  artifacts and found things, one copy of each (notes 38, 39, 69).
- Counted but unbuilt: the completion category "Gallery donations" has weight 5
  and `counter: null` (`src/content/completion.json`). Elderfruit source 7 is
  "not built" (note 39). Two achievements wait: "Donate 40 different items"
  (Linen Bonnet) and "Complete the museum collection" (Wide Leather Hat,
  10,000g) (note 38).
- Data that already exists: `src/content/artifacts.json` (42 artifacts),
  `src/content/geodes.json` (18 geode minerals, 3 foraged crystals),
  `src/content/gems.json` (6 gems and the Glimmerstone). The library map
  (`src/content/maps/library.json`) has a reading hall with a display case.
- Special orders (note 65) postpone "the museum order" until the gallery exists.

## Where it is and who runs it

- **The library hall, Hearthwell.** The display case in the reading hall (note
  86, batch 2) is the donation point, and the hall's shelf blocks hold the
  exhibits. The hall is about 24 by 19 tiles, the size of Stardew's museum
  (note 86). No new interior is needed for the first build.
- **Dunmar the librarian** takes donations at the counter and runs the hours of
  the library. Stardew's museum is open 8:00 to 18:00 and closed on festival days
  (saved Museum page).
- The librarian says one short line when each piece is first donated (70 lines,
  written with the voice sheets, M3d). Until a piece is donated its item
  description says Dunmar can tell more if it is donated (Stardew's shape, saved
  page).

## The donation list (derived from data, 70 items)

| Group | Count | Source in data |
| --- | --- | --- |
| Geode minerals | 18 | `pools[].minerals` in `geodes.json`: 6 each for the Geode, Frozen and Magma pools |
| Foraged crystals | 3 | `pools[].foraged`: loam, rime and cinder crystal |
| Gems | 6 | `gems.json` `gems` |
| Glimmerstone | 1 | `gems.json` `glimmerstone` |
| Artifacts | 42 | `artifacts.json` (includes the geode artifacts dwarf cup, ice bell, ember lantern, and bundle 26's four old things) |
| **Total** | **70** | |

- **Minerals 28, artifacts 42.** Stardew has 53 minerals, 42 artifacts and 95
  in all (saved Museum page). Ours is smaller on the mineral side. Note 39 says
  the weight stays 5. The count is derived, never typed: the list is built from
  the data above, so adding a mineral later grows the gallery and the elderfruit
  condition with it.
- **Lore found things are the artifacts.** Note 22's found things (old dwarf
  cups, bent key, Old Diggers' tools) are already in the 42 (`dwarf-cup`,
  `bent-key`), so there is no third group. Letters and books are not on the list.
- **The Omni geode** adds no item: it yields minerals from the other pools.
- **One copy each.** Spares stay as gifts and sellables, and a donated item found
  again still works as a find (note 69).
- **Not on the list:** ore, coal, clay, plain stone, geodes, bars.

## Rewards by donation count

Stardew gives a reward at 5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80 and 90
donations, a final Stardrop at 95, mineral rewards at 11, 21, 31, 41 and 50, and
artifact rewards at 3, 5, 11, 15 and 20 (saved Museum page). Ours keeps the shape
over the 70 list. Every reward is a placeholder and uses items and decor the game
has or will have, with no new systems.

| Donated | Reward (placeholder) |
| --- | --- |
| 5 | A packet of seeds |
| 10 | A bundle of mixed seeds |
| 15 | A rare seed |
| 20 | A framed print for the farmhouse (decor) |
| 25 | A second framed print (decor) |
| 30 | A big plush (decor) |
| 35 | A stack of late crop seeds |
| 40 | A scarecrow variant, and the "Donate 40" achievement (Linen Bonnet, note 38) |
| 50 | A statue (decor) |
| 60 | A key to a shortcut door (named with that design) |
| 70 (all) | The seventh elderfruit, and the "Complete the collection" achievement (Wide Leather Hat, note 38) |

- **Per-group rewards** (placeholder): minerals at 7, 14, 21 and 28; artifacts at
  10, 20, 30 and 42. Small gifts such as a decor piece or a recipe.
- **Set rewards** (Stardew gives a recipe and tool-like items for particular
  artifacts) are left out of the first build.
- Rewards are collected from the librarian, and are held for pickup if the pack
  is full (Stardew delivers the rusty key the next day, saved page).

## Interaction with other systems

- **Completion total (note 39).** The "gallery" category gets `counter: gallery`.
  Progress is donated over the list length, weight 5, partial progress counts,
  rounded down. The page reads "N of 70".
- **Elderfruit source 7 (note 39).** Paid when donated equals the list length.
  It reuses `absorbElderfruit` and the flag pattern of the other six sources.
- **Achievements (note 38).** Both gallery achievements fire from the same
  counter, at 40 and at the full list.
- **Special orders (note 65).** The museum order can be switched on once the
  list exists.
- **Multiplayer (note 53).** The gallery is shared by the farm. See question 5.
- **Wiki (note 100).** A generated Gallery page from the same list, with each
  item's group and where it is found, and a "Gallery" line on item pages. Counts
  come from data, not typed prose. Remove any planned entry in
  `docs/wiki-text/planned.json` when it ships.
- **Guide (note 101).** One guide place for the library hall.

## Interface (reuse the pack and chest screens)

- **Donate:** at the display case or the counter, a two-grid screen like the
  chest screen (`ChestScene`, note 34): the pack on one side, the gallery shelf
  on the other. Items the librarian takes show a donate cue, others are dimmed.
  A click or tap donates one copy and plays the librarian's line.
- **Shelf grid:** all 70 slots in a fixed order (minerals by band, then
  artifacts). Undonated slots show a dark silhouette and "?" on hover. Tooltips
  use the shared tooltip code (`src/core/tipanchor.ts`).
- **Arrangement:** fixed slots first. Free arrangement (Stardew allows it) is a
  later step.
- **Collections page:** the gallery row opens the same grid read only, so missing
  pieces can be checked away from the library.
- No new input handling: reuse the pack and chest drag and click paths.

## Save data

- `gallery: string[]` of donated item ids on the game state (saved, with a
  version bump and migration, note 52). Counts derive from it.
- `galleryClaimed: number[]` of reward thresholds already paid, so none is paid
  twice, and a migrated save pays any threshold already passed.
- Elderfruit source 7 uses its flag in the existing elderfruit flags.
- In multiplayer it belongs to the shared farm state, not a player.

## Build plan (small steps, each green on `npm run check`)

1. **List and counter.** `src/core/gallery.ts` builds the list from the three
   data files, plus save fields. Tests: length is 70, ids unique and real,
   partial progress and rounding.
2. **Donate rule.** `donate(state, id)`: one copy only, takes one from the pack.
   Tests for duplicate and missing cases.
3. **Wiring.** The completion counter, the two achievements, elderfruit source 7
   with a test in `tests/elderfruit.test.ts`.
4. **Rewards.** The milestone table as data (`src/content/gallery.json`), claim
   and pickup rules, tests.
5. **Library screen.** The counter or display case interaction, the two-grid
   donate screen, the shelf grid, the collections row.
6. **Text and wiki.** Librarian lines, the Gallery wiki page, overview JSON.
7. **Later:** arrangement, set rewards, the museum special order.

## Open owner questions

The Stardew option is first in each.

1. **List size.**
   a. (Stardew) A big list near 95, which needs about 25 more named minerals
   and waits on note 69's open mineral work.
   b. (Recommended) The 70 derived from data now, growing if minerals are added.
   c. Artifacts only (42).
2. **Do gems and the Glimmerstone count as minerals?**
   a. (Stardew, from memory, SC-199) Yes, they are among its 53 minerals.
   b. Keep them out, giving 63.
3. **Reward kind.**
   a. (Stardew) Useful items, seeds and decor, a final Stardrop (our elderfruit),
   and recipes or items for particular artifact sets.
   b. (Recommended) Items and decor only for the first build, set rewards later.
4. **Rearranging the collection.**
   a. (Stardew) Yes, free arrangement.
   b. (Recommended) Fixed slots first, free arrangement later.
5. **Multiplayer rewards.**
   a. (Stardew, from memory, SC-200) One shared collection, rewards claimed by
   each player.
   b. (Recommended) One shared collection and one reward per farm.
6. **Hours.**
   a. (Stardew) Open 8:00 to 18:00, closed on festival days.
   b. (Recommended) The library's own hours.
