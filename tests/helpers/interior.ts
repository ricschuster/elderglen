import { mapFiles, maps } from "../../src/content/maps";
import type { FarmMap } from "../../src/core/map";

// Shared interior reachability checks (note 86, build work item 2, #854).
// Each check returns a list of problems in words, empty when the map is fine,
// so a test can assert on the list and a later batch can reuse one check alone.

/** The house is one map with conditional layers and has its own test (`house-reach.test.ts`). */
const NOT_VILLAGE_INTERIORS: Record<string, string> = {
  house: "own test, tests/house-reach.test.ts (note 85)",
  barn: "farm building, laid out by the animals notes, not note 86",
  coop: "farm building, laid out by the animals notes, not note 86",
  greenhouse: "farm building, a growing room, not note 86",
  "farm-cave": "farm building, the cave, not note 86",
  mine: "a mines entrance with its own layout, not note 86",
};

/**
 * Every interior: a map with a `door` entry and a `door` exit out to another
 * map (the shops, homes, huts and the hall). Outdoor maps have no `door` entry;
 * the farm buildings and the house are named in NOT_VILLAGE_INTERIORS.
 */
export const interiorIds = (): string[] =>
  Object.keys(mapFiles).filter((id) => {
    if (id in NOT_VILLAGE_INTERIORS) return false;
    const m = maps.get(id);
    return (
      m.entry("door") !== undefined && m.exits.some((e) => e.id === "door")
    );
  });

export const key = (x: number, y: number) => `${x},${y}`;

const tilesOf = (r: { x: number; y: number; w: number; h: number }) => {
  const out: string[] = [];
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) out.push(key(x, y));
  return out;
};

const SIDES = [
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 0],
] as const;

/** The tiles the player can reach from the `door` entry, as the game walks (`isBlocked`). */
export const walkable = (m: FarmMap): ReadonlySet<string> =>
  m.reachable(m.entry("door")!);

/**
 * Whether a tile is reachable, or sits on a solid tile the player faces from a
 * reachable one. Fixtures and counters are solid, so they are used from beside.
 */
const touched = (
  m: FarmMap,
  reach: ReadonlySet<string>,
  x: number,
  y: number,
) =>
  reach.has(key(x, y)) ||
  SIDES.some(([dx, dy]) => reach.has(key(x + dx, y + dy)));

/** Every marker (service, exit, mark, fixture) is reachable, or faced from a reachable tile. */
export function unreachableMarkers(id: string): string[] {
  const m = maps.get(id);
  const reach = walkable(m);
  const out: string[] = [];
  for (const e of m.exits)
    if (!tilesOf(e).some((t) => reach.has(t))) out.push(`exit ${e.id}`);
  for (const s of m.services)
    if (!touched(m, reach, s.x, s.y)) out.push(`service ${s.id}`);
  const { marks, fixtures } = maps.marksWith(id, new Set(), 0);
  for (const k of marks)
    if (!touched(m, reach, k.x, k.y)) out.push(`mark ${k.name}`);
  for (const f of fixtures)
    if (
      !tilesOf(f).some((t) => {
        const [x, y] = t.split(",").map(Number) as [number, number];
        return touched(m, reach, x, y);
      })
    )
      out.push(`fixture ${f.id}`);
  return out;
}

/** Every counter or service marker has at least two reachable player tiles beside it. */
export function thinCounters(id: string): string[] {
  const m = maps.get(id);
  const reach = walkable(m);
  const out: string[] = [];
  for (const s of m.services) {
    const n = SIDES.filter(([dx, dy]) =>
      reach.has(key(s.x + dx, s.y + dy)),
    ).length;
    if (n < 2) out.push(`service ${s.id} has ${n} player tile(s)`);
  }
  return out;
}

/**
 * Public aisles that are narrower than two tiles. A reachable tile is wide
 * enough when it lies in some 2 by 2 block of tiles that are all reachable, so
 * two people can pass or stand side by side (the doors are 2 wide for the same
 * reason, note 86 decision 12). A one tile corridor, doorway or gap between a
 * counter and a wall fails. By-design exceptions are named in AISLE_EXCEPTIONS
 * and are skipped, tile by tile.
 */
export function narrowAisles(id: string): string[] {
  const m = maps.get(id);
  const reach = walkable(m);
  const skip = new Set(AISLE_EXCEPTIONS[id]?.tiles ?? []);
  const wide = (x: number, y: number) =>
    reach.has(key(x, y)) &&
    [
      [0, 0],
      [-1, 0],
      [0, -1],
      [-1, -1],
    ].some(([ox, oy]) =>
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].every(([dx, dy]) => reach.has(key(x + ox! + dx!, y + oy! + dy!))),
    );
  const out: string[] = [];
  for (const t of reach) {
    if (skip.has(t)) continue;
    const [x, y] = t.split(",").map(Number) as [number, number];
    if (!wide(x, y)) out.push(`narrow at ${t}`);
  }
  return out;
}

/**
 * Narrow tiles allowed by design, by map id. Each entry names the tiles and
 * says why. A gated bedroom door or a ladder is one tile wide on purpose, for
 * example. Add a map's tiles only for spots the owner checked draft draws 1 wide.
 */
export const AISLE_EXCEPTIONS: Record<
  string,
  { tiles: string[]; reason: string }
> = {
  "general-store": {
    tiles: [
      // the keeper's aisle behind the counter, its west gap and the stock gap
      ...[3, 4, 5, 6, 7, 8, 9].map((x) => key(x, 17)),
      key(3, 16),
      key(3, 18),
      key(3, 19),
      key(10, 16),
      // the display bay's corner beside the display
      key(22, 21),
      // the parents' bedroom, beside the double bed
      key(5, 6),
      key(8, 6),
      key(8, 7),
      // the living area's corner behind the dining table, and the kitchen: the
      // row before the strip and the ring round the table
      key(22, 12),
      key(24, 7),
      ...[26, 27, 28, 29].map((x) => key(x, 12)),
      key(29, 10),
      key(29, 11),
    ],
    reason:
      "owner-checked draft (note 86, 2026-11-11): staff aisle, bedside nooks and the kitchen table ring are one tile wide; the public aisles are 2 wide",
  },
};
