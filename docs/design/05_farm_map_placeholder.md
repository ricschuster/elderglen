# 05 Farm map (placeholder)

Status: **placeholder, not a design.** Written for issue #52 (WP1). The map
design for the real game is important and is still open.

## What this is

`src/content/maps/farm.json` and `house.json` are small, generated maps that exists only
so the scene work can proceed: a player that walks, a camera that follows, and
spots where the farming, shop and hall work packages can attach. Its layout,
size, proportions, names and look are throwaway. Nothing about it is a
decision, and no later design should be bent to fit it.

## What is deliberately not decided

These stay open until a map design note or ADR settles them (see "Map style:
discrete screens joined by warps, or one continuous world" in
`docs/design/01_system_map.md`):

- One continuous world or discrete screens joined by warps.
- The size and shape of the home valley, and where the farm sits in it.
- Where the house, shop and village hall are, and how far apart.
- How rings and regions connect to the home valley.
- The final tile size. The placeholder uses 16 pixels. Code reads the tile
  size from the map and never assumes a number.
- Final art. The placeholder tiles are drawn at runtime, with no art files.

## Rules for working with the placeholder

- Treat the layout as disposable. Do not hard-code coordinates, map size or
  building positions anywhere. Read everything through `FarmMap`
  (`src/core/map.ts`).
- Tests may assert the map contract below. They must not assert the placeholder
  layout, so replacing the map does not break them.
- A feature that only works because of where something happens to sit on the
  placeholder is a bug in the feature.
- The maps were first written by a generator script, retired in #524 because
  the committed JSON was hand-edited well past it. The committed JSON in
  `src/content/maps/` is now the only source: edit it by hand or in Tiled.
- The map JSON carries a top-level boolean property `placeholder: true`. The
  real map should not have it.

## The map contract

The code needs a few things from any map, placeholder or real. This is a
technical interface, not a design (see `docs/design/06_map_style.md` and ADR
0005). It can change through a design note or ADR when the real map design
lands.

Format: Tiled JSON, orthogonal, finite. One file per map in
`src/content/maps/`. The map id is the file name without extension.

Tile layers (all the same size as the map):

| Layer       | Required | Meaning                                              |
| ----------- | -------- | ---------------------------------------------------- |
| `collision` | yes      | Any non-empty tile blocks the player. Not drawn.     |
| `soil`      | no       | Any non-empty tile can be tilled. Not drawn.         |
| `paths`     | no       | Path tiles: no tree seed is planted or spread here.  |
| others      | no       | Every other visible tile layer is drawn, in order.   |

Objects (any object layer, matched by `class`):

| Class     | Required | Meaning                                                                                               |
| --------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `entry`   | one+     | A tile where the player can arrive. Its `name` is unique on the map.                                  |
| `exit`    | any      | A rectangle. Properties `map` and `entry` say where it leads. Optional `requires` names a gate.       |
| `forage`  | any      | A point. A tile where wild goods may appear (`ForageField` spot).                                     |
| `tree`    | any      | A point. A choppable tree at a new game's start. Property `stage` is 1 to 5 (default 5, mature).      |
| `service` | any      | A point. The player faces it and uses it to open a screen. Property `kind`: `shop`, `hall`, `bin`.    |

A new game starts at entry `start` on map `farm` (`START` in `src/core/maps.ts`).
Place an entry beside an exit, not inside it, so arriving does not trigger the
exit again.

Checks (`problems` in `src/core/map.ts` per map, and `MapRegistry.problems` in
`src/core/maps.ts` across maps, run by the tests and at scene load): the layers
exist and are the right size, entries and exits are named and unique, entries
are free and outside exits, every exit leads to a map and entry that exist, and
every exit and forage spot can be reached on foot from every entry, and every
service has a walkable tile beside it. Make a service tile blocked so the
player stands next to it.

## How to replace it

1. Author the real maps in Tiled to the contract above.
2. Put them in `src/content/maps/`, replacing the placeholder files.
3. Run `npm test`. The contract tests run against the real files.
4. Delete the placeholder JSON and this note's
   "placeholder" status, and record the map design in a design note or ADR.

## Related

- `docs/design/01_system_map.md`: the open map style question.
- Issue #52 (WP1) and #58 (WP7, placeholder art pass).
