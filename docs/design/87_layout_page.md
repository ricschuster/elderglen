# 87 The layout page (draft)

Status: drafted 2026-11-11, small points decided by the owner the same day, ready for slice 1. Design only, nothing built. This is step 5 of
the layout and tiles track (`docs/handoffs/PRIORITIES.md`) and the design note that note 81
decision 11 asked for before any build. It settles what the page is, what it edits, what it
refuses, and the order of the build. The map format and contract stay in note 05, note 71 and
ADR 0005.

## Why

Thirty-seven maps will be laid out (valley, festival, mine halls, interiors) by one owner
reviewing with one assistant. Tiled is good at tile detail, but three jobs are slow in it and
easy to get wrong:

1. **Seeing a map the way the game reads it.** The 30 by 17 view box, the entries and exits by
   name, services, forage spots and trees, and where the contract checks say it is broken, all
   in one view. Tiled shows tiles and objects, not the rules.
2. **Moving and adding the placed things.** Entries, exits, services, forage points, trees,
   rocks, stumps, water zones and regions are objects. Dragging one and seeing the checks
   answer at once beats edit, save, run `npm test`, read the failure.
3. **Blocking out a layout fast.** Water, a path, a building footprint and a clear pad, drawn
   coarsely, before any tile detail exists.

The page does these three jobs and nothing else. Tile detail stays in Tiled (decision 11).

## Decided by earlier notes (not reopened)

- A dev-server page, never shipped (note 81 decision 11).
- The committed JSON in `src/content/maps/` is the only source. Tiled can still open and edit
  the same file (note 81, "Already settled").
- Save runs the contract and reachability checks and refuses a map that fails them.
- Tile detail stays in Tiled.

## What the page does

One page, `/layout.html` on `npm run dev`, desktop mouse and keyboard only. The tablets are
for playing, not for editing (desktop is the final form for the game, and a layout session
needs a keyboard).

Screen, left to right:

| Panel | Holds |
| --- | --- |
| Map list | Every map id with two flags (decision 7 of note 81: layout done, art done), and a count of problems. Filter by area, interior, festival. |
| Canvas | The map drawn from the real tile layers, with the code-drawn placeholder tiles, zoom 1 to 8, pan, grid on or off. |
| Inspector | The selected object's properties (name, class, `map`, `entry`, `kind`, `stage`, `requires`), with only the values the contract allows in a list. |
| Problems | The live list of contract problems and layout warnings, each one click to select the place. |

Canvas overlays, each on a toggle:

- **View box.** A 30 by 17 tile frame the mouse carries, so any spot can be checked against
  the "one screen" rule (note 81 decision 5).
- **Layers.** `ground`, `objects`, `above` (note 81 decision 4), `collision`, `soil`, `paths`
  each on or off. The tier selector (`-tN`) and a condition panel: every condition true,
  every condition false, or one at a time (`cove-open`, `mines-open`, `bridge-mended`,
  festival variants). This is the same pair of readings the contract check uses.
- **Objects.** Entries, exits (with an arrow to the target map), services (with the standing
  tile), forage points, trees, stumps, rocks, logs, weeds, twigs, water zones and regions,
  each in its own colour with its name.
- **Reach.** A flood fill from a chosen entry in the walk the game uses, shading what cannot
  be reached. This is the reachability check made visible.
- **Walk time.** Click two points and read the seconds on foot and on the horse (the
  placeholder speeds, note 59). It answers the "no more than about 60 s on foot, 30 s on the
  horse" rule by time, not tiles (note 81 decision 5).

## What it edits

Objects (full edit): move, add, delete, rename, change properties. Every class in note 05
and note 71. Drag, arrow keys for one tile, delete key, copy and paste.

Block-out brushes (coarse, rectangles): they write ordinary tile layers using the existing
tile indices, so the file stays one Tiled can open.

| Brush | Writes |
| --- | --- |
| Water | `ground` water tile (`WATER_TILE`, 4), `collision`, and a `water` object of the chosen kind covering the rectangle |
| Path | `paths` and the path tile on `objects`, no `collision` |
| Building footprint | `collision` over the rectangle, a door tile left open at the chosen face, and an entry notch when the building has an interior |
| Clear pad | a `region` with `pad: true` (note 78) |
| Soil | `soil` over the rectangle |
| Erase | clears the rectangle on the chosen layer |

What it does not do: free tile painting, tile choice, tileset import, animation, anything for
the art swap. A brush uses the one placeholder tile of its kind. The real tile detail comes
from Tiled or from the generators, then the art pass (note 15).

Not editable here: mine floors that are generated from a seed (note 81 decision 8). The
authored mine pieces (hall, rest camps, special floors, the lever room) are ordinary maps and
are editable.

## What it checks

Two sets, both run on every change, both in the Problems panel.

**Hard checks (refuse to save).** These are `FarmMap.problems()` and `MapRegistry.problems()`
as they are today, run in the browser on the edited JSON with the real code. They are in
`src/core/`, free of Phaser and the DOM, so the page imports them directly and nothing is
copied. They already cover: required layers and size, unique names, entries free and outside
exits, every exit leads to a real map and entry, every exit and forage spot reachable from
every entry, services with a walkable neighbour, water zones with a casting spot, trees not on
blocked tiles, tier and condition readings. A new hard check is added for what the page makes
easy to break (below).

**Layout warnings (shown, do not refuse).** The metrics of note 81 decision 5 and the
multiplayer rules of decision 12. They are warnings because they are placeholders to tune in
play, not contract:

- Exit width outside 3 to 7 tiles (interior exits and doors excepted).
- A main path narrower than 2 or a branch that dead-ends without a forage point, prop or view.
- Door entry tile not directly below the door; interior entry notch not 2 wide.
- A service, door or the shipping bin reachable from only one tile (decision 12).
- A counter with fewer than two player tiles; a crowd door (hall, inn, Night Market) not 2 wide.
- A named landmark not inside any 30 by 17 box that also holds a path to it.
- Crossing time over the limit (60 s on foot, 30 s on the horse), between the two farthest
  entries of a settled area.
- A festival variant with fewer than 8 player start spots (note 82).
- A public aisle in an interior narrower than 2 (note 86).

**One new hard check, entry and exit pairs.** For every exit, the target entry lies within a
few tiles of the target map's matching exit back, so leaving and returning do not teleport the
player across the map. The reachability check proves the entry exists; this proves it is the
sensible one. Proposed limit: 4 tiles, shown on the pair view (below).

## Save

1. The page posts the edited JSON to a dev-only route in the Vite dev server.
2. The server runs the hard checks over the whole registry with the new file in place (a
   change to one map can break another's exit). On any problem it writes nothing and returns
   the list.
3. On success it writes `src/content/maps/<id>.json` and nothing else. Git is the undo; the
   page never commits.

The route exists only under `vite serve` (a plugin with `apply: "serve"`). `layout.html` is
not in the build inputs, so `vite build` does not contain it, and a test builds and fails if
`dist/` holds the page or the route.

**File fidelity.** The writer keeps what it does not edit: tile data, tileset references,
unknown map, layer and object properties, object ids, and key order, and uses Tiled's own
formatting, so a save changes only what was edited and the diff is small. A test loads and
saves every committed map unchanged and expects an identical file.

**Tiled and the page together.** The page records the file's hash when it opens a map. If the
hash on disk differs at save, it refuses and offers a reload, so an edit in Tiled is never
overwritten. Window focus re-reads the file when it has no unsaved edits.

**Undo.** Undo and redo for the session. Unsaved edits are kept in `.layout-drafts/` (git
ignored) so a closed tab loses nothing.

## Interiors and drafts

Notes 85 and 86 keep their drafts as `.tmj` files next to generators (`gen.py` and
`plans.py`). The page opens committed maps only, plus a read-only "view a draft" for a
`.tmj` file in `docs/design/drafts/`, so the owner can look at a draft with the overlays and
checks before it is built. Turning a draft into a map stays the build step of the note. The
generator is not folded into the page (note 86 build item 5 resolves to: no, until a
generator's output is changed often enough to hurt).

## Pair view

A later slice: two maps side by side with one exit highlighted and the entry it leads to
highlighted on the other. It is how the owner checks that the Forest's south exit meets the
farm's north exit, and how the new hard check above is shown.

## Out of scope

- Free tile painting, tileset import, animation, art (Tiled, then the art swap).
- Editing generated mine floors.
- Dialogue, schedules, bundles and every other data file; those are text.
- Placing things at runtime (the game's own placement mode, #611).
- Multiplayer or two people editing; one editor at a time, Git decides.
- A playtest button. Playing a map stays `npm run dev` and the playtest scripts.
- Phones and tablets.

## Build order, small slices

Each slice is one pull request with tests, and the next waits for the owner's look at the last.

1. **Viewer.** The page, map list, canvas with layers, tiers and conditions, object overlays,
   view box, reach overlay and the Problems panel from the real checks. Read-only. Proves the
   core code runs in the browser and the page stays out of the build.
2. **Object edit and save.** Inspector, move, add and delete, the dev route, the hard checks
   at save, file fidelity, the hash guard, undo and drafts. Includes the entry and exit pair
   check.
3. **Block-out brushes.** The six brushes and their layer writes, with tests that a brush
   result passes the contract.
4. **Layout warnings and walk time.** The metrics from the warnings list and the click-to-click
   timer.
5. **Pair view and draft viewer.**

The valley and festival layouts (steps 9 and 10) start after slice 2 at the earliest, slice 4
at the best. Slices 1 and 2 are the minimum worth building, since the first layout notes can
still use Tiled screenshots (note 81 decision 11).

## Decided (owner, 2026-11-11)

The owner took the recommendations on the three small points:

- Brush writes touch `collision` directly, with the same tile index Tiled would write.
- The page does not set the layout-done flag. The owner or the handoff sets it in the status
  table, and the page only shows it.
- The entry and exit pair limit is 4 tiles, to tune when the pair view is first used.

## Open

- Nothing blocks the build. The 4 tile limit and the brush tile indices are placeholders to
  check in use.
- Stardew has no equivalent to check against; its own tooling is not public and this is a
  developer tool, so no Stardew checks row is added.
