import { HORSE_SPEED, RUN_SPEED } from "./horse";
import type { FarmMap } from "./map";
import type { Spot } from "./forage";
import type { MapRegistry } from "./maps";
import { mapKind } from "./layoutview";
import type { TiledMapJson } from "./map";

/**
 * Layout warnings and walk time for the layout page
 * (`docs/design/87_layout_page.md`, slice 4; metrics from note 81 decision 5).
 * Warnings are listed beside the hard Problems and never refuse a save: the
 * numbers are placeholders to tune in play. Pure, free of Phaser and the DOM.
 * Each line starts with the map id, then a colon, so the page can group it and
 * find its place the way it does for a problem.
 */

/** Exit width, in tiles (note 81 decision 5). Interior exits are doors and are exempt. */
export const EXIT_WIDTH = { min: 3, max: 7 } as const;
/** Crossing limits of a settled area, in seconds. */
export const CROSS_LIMIT = { foot: 60, horse: 30 } as const;
/** A service or door wants at least this many open tiles to be used from. */
export const MIN_APPROACH = 2;
/** A dead end this close to a forage spot, service, exit or entry has a point. */
export const DEAD_END_REACH = 3;

/** Tiles walked per second on foot and on the horse: the game's own speeds. */
export const FOOT_SPEED = RUN_SPEED;
export { HORSE_SPEED };

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

const near = (a: Spot, b: Spot, d: number) =>
  Math.abs(a.x - b.x) <= d && Math.abs(a.y - b.y) <= d;

/** Whether a tile can be walked on: a chopped-down log counts as open, as in `reachable`. */
function open(map: FarmMap, x: number, y: number): boolean {
  if (map.trees.some((t) => t.stage > 1 && t.x === x && t.y === y))
    return false;
  return !map.isBlocked(x, y) || map.logAt(x, y) !== undefined;
}

/** Shortest walk in tiles from a tile to every tile it can reach, four ways. */
export function walkDistances(map: FarmMap, from: Spot): Map<string, number> {
  const dist = new Map<string, number>();
  if (!open(map, from.x, from.y)) return dist;
  dist.set(`${from.x},${from.y}`, 0);
  const queue: Spot[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const c = queue[i]!;
    const d = dist.get(`${c.x},${c.y}`)!;
    for (const [dx, dy] of DIRS) {
      const n = { x: c.x + dx, y: c.y + dy };
      const k = `${n.x},${n.y}`;
      if (dist.has(k) || !open(map, n.x, n.y)) continue;
      dist.set(k, d + 1);
      queue.push(n);
    }
  }
  return dist;
}

export interface WalkTime {
  /** Tiles of the shortest walk. */
  tiles: number;
  /** Seconds on foot and on the horse. */
  foot: number;
  horse: number;
}

/** Seconds for a number of tiles, at the game's walking and riding speeds. */
export function timeOf(tiles: number): WalkTime {
  return { tiles, foot: tiles / FOOT_SPEED, horse: tiles / HORSE_SPEED };
}

/** The click-to-click timer: the shortest walk between two tiles, or undefined when there is none. */
export function walkTime(map: FarmMap, a: Spot, b: Spot): WalkTime | undefined {
  const d = walkDistances(map, a).get(`${b.x},${b.y}`);
  return d === undefined ? undefined : timeOf(d);
}

/** Open tiles one step from a tile or from the edge of a rectangle. */
function approachTiles(
  map: FarmMap,
  r: { x: number; y: number; w: number; h: number },
): number {
  let n = 0;
  const seen = new Set<string>();
  for (let y = r.y - 1; y <= r.y + r.h; y++)
    for (let x = r.x - 1; x <= r.x + r.w; x++) {
      const inX = x >= r.x && x < r.x + r.w;
      const inY = y >= r.y && y < r.y + r.h;
      // Edge tiles only: one step along an axis, not diagonal and not inside.
      if (inX === inY) continue;
      const k = `${x},${y}`;
      if (seen.has(k) || !open(map, x, y)) continue;
      seen.add(k);
      n++;
    }
  return n;
}

/** Path tiles with one path neighbour and nothing of use near them. */
function deadEnds(map: FarmMap): Spot[] {
  const uses: Spot[] = [
    ...map.forageSpots,
    ...map.services,
    ...map.entries,
    ...map.exits,
  ];
  const out: Spot[] = [];
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      if (!map.isPath(x, y)) continue;
      const links = DIRS.filter(([dx, dy]) => map.isPath(x + dx, y + dy));
      if (links.length !== 1) continue;
      const p = { x, y };
      if (uses.some((u) => near(p, u, DEAD_END_REACH))) continue;
      out.push(p);
    }
  return out;
}

/** Warnings about one map, read at its tallest tier with every condition false. */
export function mapWarnings(
  id: string,
  map: FarmMap,
  kind: ReturnType<typeof mapKind>,
  registry?: MapRegistry,
  files?: Record<string, TiledMapJson>,
): string[] {
  const out: string[] = [];
  const say = (at: Spot, text: string) =>
    out.push(`${id}: ${text} at ${at.x},${at.y}`);

  if (kind !== "interior") {
    for (const e of map.exits) {
      const width = Math.max(e.w, e.h);
      const target = files?.[e.map];
      const toDoor =
        target !== undefined && mapKind(e.map, target) === "interior";
      if (!toDoor && (width < EXIT_WIDTH.min || width > EXIT_WIDTH.max))
        say(
          e,
          `exit "${e.id}" is ${width} tiles wide, wanted ${EXIT_WIDTH.min} to ${EXIT_WIDTH.max}`,
        );
    }
    for (const p of deadEnds(map))
      say(p, "path dead end with no forage spot, service or exit near it");
  }

  if (kind === "interior")
    for (const e of map.exits)
      if (e.w !== 1 || e.h !== 1)
        say(e, `door "${e.id}" is ${e.w} by ${e.h} tiles, wanted 1`);

  if (registry && kind !== "interior") {
    // The entry a door leads out to lies directly below the door.
    for (const e of map.exits) {
      const inner = files?.[e.map];
      if (!inner || mapKind(e.map, inner) !== "interior") continue;
      const back = registry.get(e.map).exits.find((x) => x.map === id);
      const entry = back ? map.entry(back.entry) : undefined;
      if (
        entry &&
        !(entry.y === e.y + e.h && entry.x >= e.x && entry.x < e.x + e.w)
      )
        say(
          entry,
          `entry "${entry.name}" is not directly below door "${e.id}"`,
        );
    }
    // A door reached from one tile only.
    for (const e of map.exits) {
      const inner = files?.[e.map];
      if (!inner || mapKind(e.map, inner) !== "interior") continue;
      if (approachTiles(map, e) < MIN_APPROACH)
        say(
          e,
          `door "${e.id}" has fewer than ${MIN_APPROACH} tiles to use it from`,
        );
    }
  }

  for (const s of map.services)
    if (approachTiles(map, { x: s.x, y: s.y, w: 1, h: 1 }) < MIN_APPROACH)
      say(
        s,
        `service "${s.id}" has fewer than ${MIN_APPROACH} tiles to use it from`,
      );

  if (kind !== "interior") {
    const worst = longestCrossing(map);
    if (worst) {
      const t = timeOf(worst.tiles);
      if (t.foot > CROSS_LIMIT.foot || t.horse > CROSS_LIMIT.horse)
        say(
          worst.from,
          `crossing from "${worst.fromName}" to "${worst.toName}" takes ${t.foot.toFixed(0)} s on foot and ${t.horse.toFixed(0)} s on the horse, over ${CROSS_LIMIT.foot} and ${CROSS_LIMIT.horse}`,
        );
    }
  }
  return out;
}

/** The two entries that are farthest apart on foot, and the tiles between them. */
export function longestCrossing(map: FarmMap):
  | {
      tiles: number;
      from: Spot;
      fromName: string;
      toName: string;
    }
  | undefined {
  let best:
    { tiles: number; from: Spot; fromName: string; toName: string } | undefined;
  for (const a of map.entries) {
    const dist = walkDistances(map, a);
    for (const b of map.entries) {
      const d = dist.get(`${b.x},${b.y}`);
      if (d !== undefined && (!best || d > best.tiles))
        best = { tiles: d, from: a, fromName: a.name, toName: b.name };
    }
  }
  return best;
}

/**
 * Every layout warning over the files, in map order. A map that cannot be read
 * has no warnings here: the hard Problems already name it.
 */
export function layoutWarnings(
  registry: MapRegistry,
  files: Record<string, TiledMapJson>,
): string[] {
  const out: string[] = [];
  for (const id of Object.keys(files).sort()) {
    const json = files[id]!;
    try {
      const map = registry.get(id, registry.maxTier(id));
      out.push(...mapWarnings(id, map, mapKind(id, json), registry, files));
    } catch {
      // reported as a Problem
    }
  }
  return out;
}
