# 71 Map areas overview and build order (draft)

Status: draft, written 2026-11-08. The owner answered the eleven questions the
same day (see "Owner answers"), and the Quarry was added as note 78. Nothing here is
built. It is the cover note for the design pass on every unbuilt map area of the
home valley, and answers the layout half of issue #67 that note 19 left as sizes
only. Ring 2 stays parked (#20). One note per area:

| Note | Area | Map id | Size (tiles) |
| --- | --- | --- | --- |
| `72_forest.md` | Forest | `forest` | 120 by 120 |
| `73_secret_woods.md` | Secret Woods | `secret-woods` | 48 by 40 |
| `74_mountain.md` | Mountain | `mountain` | 80 by 70 |
| `75_river_delta_and_beach.md` | River delta with the Beach | `delta` | 100 by 70 |
| `76_lake_cove.md` | Lake cove | `cove` | 50 by 40 |
| `77_hearthwell.md` | Hearthwell | `hearthwell` | 120 by 110 |
| `78_quarry.md` | Quarry | `quarry` | 60 by 44 |

Built today: `farm` and `farm-woodland` (placeholder), `hall`, `mine`, `green`,
`hedge`, `sawmill`, and the interiors (`house`, `cellar`, `coop`, `barn`,
`greenhouse`, `farm-cave`). The farm maps carry placeholder doors for the hall, the
sawmill and the mine, which move to Hearthwell and the Mountain as those land.

## Why

The notes had areas, links and sizes (note 19) and a pattern for one area (the farm,
note 55), but no map for any other place. Several built systems already wait on a
map: hardwood (a temporary sale stands in, note 43), fishing waters and the fisher
(#596), the Mines entrance (note 22), the farmstead keeper (note 23) and the town
(notes 20, 57, 58). Each area note says what is where, with tile-level positions,
exits and entries, resources, forage, fishing, people, contract needs and slices,
so a map can be authored later from the note alone.

## Shared rules (draft)

1. **Pattern of note 55.** Each note gives decisions, a tile sketch with sizes from
   note 19, exits and entries (entry beside the exit, never inside it), what lives
   there, resources, forage, fishing, people, contract needs and slices.
2. **Hand-placed, as note 32.** Nothing random at the start of a new game. Counts
   are placeholders for note 07 and are corrected on the first Tiled draft.
3. **Staged exits.** An area may be built before its neighbour. Until then the road
   ends in scenery (a fallen tree or a closed gate) and the exit object is not
   authored, because the map check needs every exit to name a map and entry that
   exist (note 06). The exit and its matching exit on the neighbour are added
   together in the slice that builds the second map.
4. **Placeholder first.** Each map ships with `placeholder: true` (note 05) and no
   art, as the farm did. The 120 by 120 Forest is loaded on the SM-T500 as an empty
   placeholder before any authoring, as note 19 asks.
5. **Replace the doors.** When an area lands, its placeholder door comes off the
   farm map in the same slice: `mine` with the Mountain, `hall` and `sawmill`
   with Hearthwell. The interior's exit target changes with it.
6. **No bundle may need a cove fish** (note 21). A test checks it when the Water
   room bundles are built.

## Build order, with reasons

| Order | Work | Why here | Issue |
| --- | --- | --- | --- |
| 0 | Map contract additions and the tablet load test | Every map below needs one of the ten additions, so build them once | #636 |
| 1 | Forest part 1 | The main wood supply once the farm runs dry (note 43), the first extra lake, the farm's north exit, and the log the next step needs | #637 |
| 2 | Secret Woods | Small, and it ends the carpenter's temporary Hardwood sale with a real supply (note 59). Needs the log from step 1 | #639 |
| 3 | River delta with the Beach | Three fishing waters and the fisher unblock #596 slices 3 and 4. Open from the start, and needs only the farm's south exit | #640 |
| 4 | Mountain | The Mines entrance leaves the farm, the forge replaces a menu, and the third lake and the river source complete the lake set the Water room needs | #642, #643 |
| 4b | Quarry | Off the Mountain's east road. Regrowing stone and ore, the stonekeeper's job. Waits on the bridge's bundle room (note 78, question 1) | #649 |
| 5 | Forest part 2 | Farmstead, hermit and Wanderer. Waits on names (#136, #178) so it follows the fish and mines work | #638 |
| 6 | Lake cove | The Water room reward. Needs the delta and the full roster, and is small and late by design | #644 |
| 7 | Hearthwell part 1 | The shell moves the hall and sawmill off the farm, joins Mountain and delta, and closes both loops of note 19. Interiors can be empty shells | #645 |
| 8 | Hearthwell part 2 | Interiors by template. People, schedules and gifts ride with #599 | #646, #599 |
| 9 | Beach elf's house | Waits on the story spine (#176) | #641 |

**Hearthwell is last in full.** The town needs the cast list (#136) and schedules
(#599) before it has anyone in it, and it is the largest area. Only its empty
shell comes earlier, at step 7, because it unlocks the second loop and removes
placeholder doors.

**Milestones (owner, 2026-11-08).** The Forest, Secret Woods, River delta with
the Beach, Mountain, Quarry and Lake cove maps are in M3b, since fishing, hardwood,
the Mines entrance and the Water room need them. Hearthwell's shell and interiors
stay with #599 (also M3b, as filed), and the Beach elf waits for the story spine.
Note 03 and ADR 0012 are updated to match, and #396 (tree types) moves to M3b.

## Map contract additions

The contract of note 05 and note 06 already has `entry`, `exit` (with `requires`),
`forage`, `tree`, `stump`, `rock`, `service`, `region`, bounds and tier layers. The
areas need these additions (ten, with the Quarry), all data, with rules in `src/core/`:

1. **Water kinds.** One water tile exists today (`WATER_TILE`), and fishing has one
   `Water` type, the river (`fishing.ts`). Add an object class `water` (a
   rectangle) with a `kind` property: `river`, `forest-lake`, `mountain-lake`,
   `marsh-lake`, `sea`, `cove`, `woods-pond`. A map `waterKind` property gives the
   default (the farm pond is `river`). The fish table and the pot kind (fresh or
   salt) read the kind of the tile fished. The map check proves every water zone
   has a walkable casting spot.
2. **The massive log.** An object class `log`, solid until chopped with a steel axe
   or better (note 44), gives 8 Hardwood and 25 Foraging XP once, and sets a flag.
   The reachability check treats a log as passable, as it treats a gated exit.
3. **Per-map forage.** A data file `src/content/forage-areas.json`: for a map id, a
   daily cap (by season if wanted) and an explicit weight table per season that
   replaces today's single shared pool and its rare chance. A `forage` point
   may sit inside a `region` object (3a) that picks one of several tables, so one
   map can hold marsh and beach tables. Daily patches (such as the spring onion
   bank) fill every point and are outside the cap.
4. **Tree kind.** The `tree` object gets `kind`: `oak`, `maple` or `pine`
   (SC-30). Tap products stay as note 36.
5. **Per-map stump regrow.** A map property `stumpRegrowDays`, so the Secret Woods
   can regrow its six large stumps daily without a farm type.
6. **Conditional layers.** A tile layer property `when` (or `unless`) naming a
   condition, so ruined and repaired art swap: the ferry (`cove-open`), the
   rockfall (`mines-open`), the broken bridge (`bridge-mended`). The map check runs
   with every condition true and with every condition false. New named conditions:
   `secret-log-cleared`, `cove-open`, `bridge-mended`, `quarry-open` (note 78)
   and `tide-bridge-mended` (note 75).
7. **Rideable.** A map property `rideable` (default false, true for every
   outdoor valley map (owner, 2026-11-08): the farms, Forest, Secret Woods,
   Mountain, Quarry, delta and Beach, Hearthwell and the green; false for
   interiors, the Mines and the cove), replacing the horse's list of map names
   (note 59).
8. **Cart stop.** A `service` kind `cart`, reserved for the Hearth room carts
   (note 16). Placed, drawn, not used until that reward is built.
9. **Board.** `service` kinds `board-help` (note 50) and `board-news` and
   `board-orders` (notes 57 and 65), so the boards are placed by the map.

10. **Nightly spawns.** A per-map data table of weighted kinds (rock, hard rock,
    ore nodes) and a count of attempts a night, rising by year, used by the
    Quarry (note 78). Existing objects block a spawn.

No change to `collision`, `soil`, `paths`, `entry`, `exit` or the bounds
properties. The first Tiled draft may find more, and this list is updated then.

**Built status (2026-11-09, #636).** All ten are built as rules, data and map
checks, with tests in `tests/mapcontract.test.ts`. Where they live:

- Map parsing and checks: `src/core/map.ts` (`water`, `log`, tree and stump
  `kind`, `region` `forage`, map properties `waterKind`, `stumpRegrowDays` and
  `rideable`, layer properties `when` and `unless`) and `src/core/maps.ts`
  (`getWith`, and the check with every condition true and false).
- Water kinds: `FarmMap.waterKindAt`, `Water` and `potKindOf` in `fishing.ts`.
  The farm passes the kind of the tile fished to the bite. The fish table still
  holds river fish only; each area adds its own.
- Log: `src/core/logs.ts` (one chop with a steel axe, 8 Hardwood, 25 XP, sets the
  flag), reached through `useHeld`, solid in the farm scene until its flag is up.
  World flags are new: `src/core/worldflags.ts`, saved as `flags` (`holdsOf` gives
  the conditions that hold, and the farm scene reads layers with it).
- Forage areas: `src/core/forageareas.ts`, `src/content/forage-areas.json` (empty
  until a map needs one) and `ForageField.respawnArea`. The sleep step still
  scatters the farm's shared pool only; the first area map wires its own field.
- Stump regrow: `chop` reads the map's `stumpRegrowDays` before the farm type.
- Rideable: the horse reads the map property (`rideable` in `horse.ts`), set on
  `farm`, `farm-woodland` and `green`; the list of map names is gone.
- Cart and boards: the service kinds `cart`, `board-help`, `board-news` and
  `board-orders` are named in `map.ts` and place like any service. Nothing opens
  them yet.
- Nightly spawns: `src/core/spawns.ts` and `src/content/spawns.json` (empty until
  the Quarry). The map's scene places what `nightlySpawns` returns.
- Load test: the test builds a 120 by 120 placeholder map and bounds its read and
  check time. The run on the SM-T500 itself is by hand and not done yet (open).

## Interiors by area

From note 58, for the work packages. Existing interior maps are marked.

| Area | Interior maps |
| --- | --- |
| Forest | `forest-farmstead`, `hermit-tower` |
| Mountain | `forge` (the Mines-side trader's hut, question 7), plus the `mine` entrance hall (exists) |
| River delta and Beach | `fisher-hut`, `beach-elf-house` |
| Hearthwell | `general-store`, `healer`, `inn`, `library`, `smithy`, `hatter`, `outpost`, `outpost-rooms`, `burrow-gardener`, `burrow-retired`, `burrow-young`, `sawmill` (exists), `hall` (exists) |
| Secret Woods, Lake cove, Quarry | none |

## Fishing waters

Per note 21, each area gives these waters (all sketched in the roster tables
already, so no fish are designed here):

| Water | Map | Open |
| --- | --- | --- |
| Farm pond (river table) | `farm` | Built |
| Forest lake | `forest` | From the start |
| Mountain lake, upper river | `mountain` | From the start |
| River, both arms | `hearthwell` | From the start |
| Marsh lake, river channels, sea | `delta` | From the start |
| Cove | `cove` | Water room reward |
| Woods pond | `secret-woods` | From the start (owner, 2026-11-08) |

## Changes to earlier notes

- Note 19 gets a short pointer to this set. Its area sizes stay.
- Note 43's "how the supply renews is not designed yet" is answered by note 72
  (SC-30's 20 percent regrow, six groves).
- Note 43 and `PRIORITIES.md` keep the removal of the carpenter's Hardwood sale,
  now tied to the Secret Woods slice (#639).
- Note 59's "notes 19 and 43 still need the stump count and respawn rule" is
  answered by note 73: six stumps, regrow every morning.
- Note 03's M3c list named the Forest and Mountain maps. They moved to M3b
  (answer 1), and ADR 0012 has an amendment line.
- Notes 21, 38 and 39 count 47 fish now (answer 3).
- Notes 59, 66 and 69 carry answers 10, 9 and 7.

## Stardew checks added

Rows SC-83 to SC-90 in `54_stardew_checks.md`: five answered from the saved
Secret Woods, Cindersap Forest, Mountain, Beach and Pelican Town pages (read
2026-11-08), and three claims from memory (horse maps, the boat, festival maps).
SC-91 (the Quarry) is answered from the saved Quarry page. The owner's answers
followed the Stardew options on questions 2, 3, 4, 7, 9 and 11, and SC-88 to
SC-90 stay open as claims from memory.

## Owner answers (2026-11-08)

All eleven questions are answered. Each line says what was chosen, and which notes
changed. Anything the owner did not settle is marked as open, and the one decision
made by the drafter is flagged for owner veto.

1. **Milestone: M3b.** The Forest, Secret Woods, River delta with the Beach,
   Mountain and Lake cove maps (and the Quarry, note 78) move into M3b. Hearthwell
   stays with #599, and the Beach elf waits for the story spine (#176). Note 03
   and ADR 0012 updated.
2. **Secret Woods creatures: later (Stardew has slimes).** None in the first build,
   and they come with the combat notes. Hardwood comes from a number of large
   stumps that respawn every night (note 73, kept). Mahogany stays off the map for
   now.
3. **The pond is fishable (Stardew).** One unique fish plus two common fish. That is
   47 fish, so Whole Roster and the completion fish count move by one (notes 21,
   38, 39 and 73).
4. **The Beach footbridge is broken until repaired (Stardew).** Ours is repaired
   with 300 wood only, since the community upgrade does not exist (note 75, #640).
5. **The ferry has no keeper.** You step on the boat, like a door (notes 75 and 76,
   #644). The fisher stays at her hut.
6. **The cove gets one extra beyond fishing: a hidden treasure spot (drafter's
   pick, flagged for owner veto).** Of the two options in note 76 (a hidden treasure
   spot or a mist-only dawn event), the treasure spot needs no new event system,
   fits a quiet reward place and is easy to test. Written into note 76 as the
   decision. The dawn event stays as the alternative if the owner prefers it.
7. **Smithy split (Stardew).** The Hearthwell blacksmith does tool upgrades, geode
   cracking and ore, and does not buy geodes. The Mountain smith dwarf becomes a
   Mines-side trader: he sells lamps and rest-camp supplies and buys ore for coin,
   with no tool upgrades. Notes 74, 77, 69 and 44's pointer updated, #643 and #646.
8. **Hearthwell river: two arms, the detail is open.** One wide eastern arm with a
   broken bridge across it, and the hall on the island between. The layout of the
   arms, banks and streets is an open design item and is designed later. The valley
   map's zoom is redrawn only as far as this answer supports (the east arm, the
   broken bridge and the hall island). Note 77 marks it open.
9. **Festivals use a decorated Hearthwell variant (Stardew).** The separate `green`
   map is folded into it later. Notes 66 and 77.
10. **The horse rides on every outdoor valley map,** not interiors, the Mines or
    the cove. Note 59 and contract need 7 above.
11. **The stonekeeper dwarf gets a Quarry area (Stardew).** Past a bridge mended by
    a bundle room, with stone and ore that regrow daily. New note 78, #649.

Open questions from the answers: note 78 has its own list (which bundle room mends
the bridge, the dwarf's trade, how fast the Quarry regrows).

## Open

- The six area notes list their own open items.
- Confirm area sizes against the first Tiled draft of each map (note 19).
- The transition look between areas, and a ferry animation (note 06).
- Cart travel (Hearth room) needs a note when that room is built.
