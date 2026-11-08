# 71 Map areas overview and build order (draft)

Status: draft, written 2026-11-08 for the owner to review. Nothing here is
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
| 0 | Map contract additions and the tablet load test | Every map below needs one of the nine additions, so build them once | #636 |
| 1 | Forest part 1 | The main wood supply once the farm runs dry (note 43), the first extra lake, the farm's north exit, and the log the next step needs | #637 |
| 2 | Secret Woods | Small, and it ends the carpenter's temporary Hardwood sale with a real supply (note 59). Needs the log from step 1 | #639 |
| 3 | River delta with the Beach | Three fishing waters and the fisher unblock #596 slices 3 and 4. Open from the start, and needs only the farm's south exit | #640 |
| 4 | Mountain | The Mines entrance leaves the farm, the forge replaces a menu, and the third lake and the river source complete the lake set the Water room needs | #642, #643 |
| 5 | Forest part 2 | Farmstead, hermit and Wanderer. Waits on names (#136, #178) so it follows the fish and mines work | #638 |
| 6 | Lake cove | The Water room reward. Needs the delta and the full roster, and is small and late by design | #644 |
| 7 | Hearthwell part 1 | The shell moves the hall and sawmill off the farm, joins Mountain and delta, and closes both loops of note 19. Interiors can be empty shells | #645 |
| 8 | Hearthwell part 2 | Interiors by template. People, schedules and gifts ride with #599 | #646, #599 |
| 9 | Beach elf's house | Waits on the story spine (#176) | #641 |

**Hearthwell is last in full.** The town needs the cast list (#136) and schedules
(#599) before it has anyone in it, and it is the largest area. Only its empty
shell comes earlier, at step 7, because it unlocks the second loop and removes
placeholder doors.

**Milestones.** Note 03 puts the Forest and Mountain maps in M3c, after
multiplayer. These maps unblock M3b systems, so question 1 asks the owner whether
to move them. The work packages are filed in M3b as the task asked, and move if the
owner chooses otherwise.

## Map contract additions

The contract of note 05 and note 06 already has `entry`, `exit` (with `requires`),
`forage`, `tree`, `stump`, `rock`, `service`, `region`, bounds and tier layers. The
areas need these additions, all data, with rules in `src/core/`:

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
   `secret-log-cleared`, `cove-open`, `bridge-mended`.
7. **Rideable.** A map property `rideable` (default false, true for the outdoor
   valley maps if question 10 agrees), replacing the horse's list of map names
   (note 59).
8. **Cart stop.** A `service` kind `cart`, reserved for the Hearth room carts
   (note 16). Placed, drawn, not used until that reward is built.
9. **Board.** `service` kinds `board-help` (note 50) and `board-news` and
   `board-orders` (notes 57 and 65), so the boards are placed by the map.

No change to `collision`, `soil`, `paths`, `entry`, `exit` or the bounds
properties. The first Tiled draft may find more, and this list is updated then.

## Interiors by area

From note 58, for the work packages. Existing interior maps are marked.

| Area | Interior maps |
| --- | --- |
| Forest | `forest-farmstead`, `hermit-tower` |
| Mountain | `forge`, plus the `mine` entrance hall (exists) |
| River delta and Beach | `fisher-hut`, `beach-elf-house` |
| Hearthwell | `general-store`, `healer`, `inn`, `library`, `smithy`, `hatter`, `outpost`, `outpost-rooms`, `burrow-gardener`, `burrow-retired`, `burrow-young`, `sawmill` (exists), `hall` (exists) |
| Secret Woods, Lake cove | none |

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
| Woods pond | `secret-woods` | Only if question 3 agrees |

## Changes to earlier notes

- Note 19 gets a short pointer to this set. Its area sizes stay.
- Note 43's "how the supply renews is not designed yet" is answered by note 72
  (SC-30's 20 percent regrow, six groves).
- Note 43 and `PRIORITIES.md` keep the removal of the carpenter's Hardwood sale,
  now tied to the Secret Woods slice (#639).
- Note 59's "notes 19 and 43 still need the stump count and respawn rule" is
  answered by note 73: six stumps, regrow every morning.
- Note 03's M3c list names the Forest and Mountain maps. That row is for question 1.

## Stardew checks added

Rows SC-83 to SC-90 in `54_stardew_checks.md`: five answered from the saved
Secret Woods, Cindersap Forest, Mountain, Beach and Pelican Town pages (read
2026-11-08), and three claims from memory (horse maps, the boat, festival maps).

## Owner questions

The one list to relay. Each has a recommendation first. Where a question has no
Stardew counterpart it says so. Questions are about decisions that belong to the
owner. Everything else in the notes is a draft the owner may edit.

1. **Which milestone owns the map areas?** Note 03 puts the Forest and Mountain maps in
   M3c, after multiplayer.
   - A (Recommended): move the Forest, Secret Woods, River delta with the Beach,
     Mountain and Lake cove maps into M3b, since fishing, hardwood, the Mines
     entrance and the Water room need them. Hearthwell's shell and interiors stay
     with #599, and the Beach elf waits for the story spine.
   - B: keep note 03: all area maps in M3c.
   - C (Stardew): Stardew's areas all exist from the start of its game, so this
     question has no Stardew answer. It would mean building every map before the
     systems, the opposite of the recommendation.
2. **Do the Secret Woods have creatures, and where does Mahogany come from?**
   - A (Recommended): no creatures in the first build. Mahogany trees are not on
     the map yet. Add a gentle creature later with the combat notes, if the owner
     wants one, with a rare Mahogany seed drop.
   - B (Stardew): slimes attack the player there and drop Mahogany seeds when
     slain (saved Secret Woods page).
   - C: no creatures ever, and Mahogany comes only from a shop or the Mines.
3. **Is the Secret Woods pond fishable?**
   - A (Stardew, Recommended): fishable all year with a unique fish plus two
     common fish already in the roster, as the saved page says of its pond. The
     fish name is ours. It makes 47 fish, so Whole Roster and the completion count
     move by one.
   - B: scenery only, no fish.
4. **Is the Beach's footbridge to the tide pools broken at the start?**
   - A (Recommended): open from the start. The Beach has one resident and a dead end,
     and gating it hides the elf (#176) for no gain.
   - B (Stardew): broken until repaired for 300 wood or a later community
     upgrade (saved Beach page). Ours would use wood only, as the community upgrade
     does not exist.
5. **Who keeps the ferry to the cove?**
   - A (Recommended): the fisher, who stands at the dock during the day. The ferry
     itself always runs, with or without her, so nobody is stranded.
   - B: nobody. The ferry is a boat you step on, like a door.
   - C (Stardew): Stardew's boat is piloted by the fish shop owner, from memory,
     and its fare and rules are not checked (SC-89).
6. **What is the cove for beyond fishing?**
   - A (Recommended): fishing only, plus lanterns and a bench. No shop, no resident.
   - B: add a small extra: a hidden treasure spot or a mist-only dawn event.
   - C (Stardew): Stardew has no area like it, so there is no Stardew option. The
     closest is its fishing-only Secret Woods pond (SC-89).
7. **What does the Hearthwell smithy do, and who cracks geodes?** Notes 20 and 58
   give a smithy and mender in town and a smith dwarf on the Mountain, and today one
   menu does ore, upgrades and geode cracking.
   - A (Recommended): the Mountain dwarf keeps the ore shop, the furnace gift, tool
     upgrades and lamps. The Hearthwell smith cracks geodes for 25g and mends and
     sells small iron goods. This follows note 69's "the smith cracks, the dwarf
     buys".
   - B (Stardew): one blacksmith does tool upgrades, geode cracking and ore, and
     does not buy geodes (saved Blacksmith page, SC-58 and SC-60). The Hearthwell
     smith would take all of it and the dwarf only sells lamps.
8. **How does the river sit in Hearthwell, and where is the broken bridge?** Note 19
   has one river line, the sawmill on it, the hall on the road to the bridge and
   ring 2 across the river, and the zoomed valley map draws one arm through the
   middle.
   - A (Recommended): the river splits into two arms through town. The main arm
     runs through the middle with the sawmill on it. A wide eastern arm is crossed by
     the broken bridge. The hall stands on the island between. The valley map's
     zoomed view then needs its river and bridge redrawn after the owner agrees.
   - B: one river on the east edge. The town and sawmill sit on its west bank, and
     the broken bridge crosses it just past the hall. The zoomed view moves the
     sawmill to the east side.
   - C (Stardew): the river runs through the middle of town with houses on both
     banks (the saved Pelican Town page names "east of the river" and "west of the
     river"). Ring 2 would be reached by an ordinary east exit, not a bridge, which
     departs from note 19, decision 6.
9. **Does a festival use the town map or its own map?** Today the green is a
   separate placeholder map.
   - A (Stardew, Recommended): the green is the south of the Hearthwell map and a
     festival loads a decorated variant of that map. The saved Beach page says
     Stardew's festivals use custom versions of the Beach map, and the owner's
     memory is the same for the town (SC-90).
   - B: keep the separate `green` map as the festival place, entered by a door or
     exit from the town.
10. **Which maps can the horse ride on?** Note 59 lists only the farms and the green.
    - A (Recommended): every outdoor valley map (Forest, Mountain, delta and Beach,
      Hearthwell), and not interiors, the Mines or the cove (the ferry dismounts). It
      is why the horse exists on the long maps (note 19).
    - B: keep the farms and the green only.
    - C (Stardew): the horse can be ridden in outdoor areas. That is from memory and
      unchecked (SC-88).
11. **What does the stonekeeper dwarf do in play?** Note 20 says bridges and
    stonework.
    - A (Recommended): a person with a yard and a footbridge for now, no shop. His
      job (stone for the Last Seat bridge) waits for the Last Seat design (#603, #181).
    - B: a stone shop selling stone in bulk, from the start.
    - C (Stardew): Stardew has a Quarry past a bridge, mended by finishing the Crafts
      Room, where stone and ore regrow daily (saved Mountain page). We have no
      quarry area, so this would be a new area, which needs its own note.

## Open

- The six area notes list their own open items.
- Confirm area sizes against the first Tiled draft of each map (note 19).
- The transition look between areas, and a ferry animation (note 06).
- Cart travel (Hearth room) needs a note when that room is built.
