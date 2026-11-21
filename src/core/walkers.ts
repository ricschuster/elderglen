import data from "../content/walkers.json";
import villagerData from "../content/villagers.json";
import { maps } from "../content/maps";
import { findPath } from "./pathing";
import {
  isRainy,
  planDay,
  resolvePlace,
  type DayContext,
  type DayPlan,
  type Place,
  type Stop,
  type Villager,
} from "./villagers";

/**
 * The villager walker (note 79 decisions 1, 9, 10, 11; note 80). Pure: a day is
 * a list of stops, and between two stops a person WALKS a leg of timed tiles.
 * A leg runs from the first stop's tile to the interior's door, across the door
 * onto the outer map, over the outer map to the next place or its door, through
 * that door and on to the stop. The leg ends at the next stop's time and starts
 * early enough to cover its tiles at `tilesPerMinute`, never before the stop it
 * leaves. A short gap is rushed up to `maxRush` times the speed, else the person
 * just stands at the earlier stop until the later one (no leg, a snap). A stop
 * `road:<area>` is off every map: a person leaving walks to the map's edge
 * entry and vanishes there, and one arriving appears from the edge entry.
 * Legs that cross from one area map to another without a road stop are not
 * built (the person snaps), as are legs with no route.
 */

export const TILES_PER_MINUTE: number = data.tilesPerMinute;
const MAX_RUSH: number = data.maxRush;

export interface Node {
  map: string;
  x: number;
  y: number;
}

export interface Leg {
  start: number;
  end: number;
  /** Minutes per step. Step k is reached at `start + k * dt`. */
  dt: number;
  /** One node per tile, starting on the tile the person leaves. A change of map is one step. */
  steps: Node[];
}

/**
 * The map a leg is walked on. A growing house starts as one room, and the
 * spouse's kitchen and bed are in the rooms tier 1 adds (note 68), so a leg
 * reads each map at tier 1 (a map that does not grow ignores it). The tier 1
 * rooms stay open at every later tier, so the route is valid in all of them.
 */
const WALK_TIER = 1;
const walkMap = (id: string) => maps.get(id, WALK_TIER);

const AREAS = villagerData.areas as Record<string, { map: string | null }>;
const AREA_MAPS = new Set(
  Object.values(AREAS)
    .map((a) => a.map)
    .filter((m): m is string => m !== null),
);
const EDGES = data.edges as Record<string, Record<string, string>>;

const areaOf = (place: string): string => place.split(":")[0]!;
const roadArea = (id: string): string => id.slice("road:".length);

/** The two ends of a building door: the open tile inside and the tile outside. */
function doorInfo(interior: string): { inner: Node; outer: Node } | undefined {
  const m = walkMap(interior);
  const exit = m.exits.find((e) => e.id === "door") ?? m.exits[0];
  const inner = m.entry("door") ?? m.entries[0];
  if (!exit || !inner || !AREA_MAPS.has(exit.map)) return undefined;
  const out = maps.get(exit.map).entry(exit.entry);
  if (!out) return undefined;
  return {
    inner: { map: interior, x: inner.x, y: inner.y },
    outer: { map: exit.map, x: out.x, y: out.y },
  };
}

/** Where the road between two areas meets a map: the edge entry on `area`'s map. */
function edgeNode(area: string, other: string): Node | undefined {
  const name = EDGES[area]?.[other];
  const map = AREAS[area]?.map;
  const e = name && map ? maps.get(map).entry(name) : undefined;
  return e && map ? { map, x: e.x, y: e.y } : undefined;
}

/** The edge of the map a person at area `here` uses to take the road `road:<x>`. */
function roadEdge(here: string, roadId: string): Node | undefined {
  const road = roadArea(roadId);
  // The farm's two roads: the forest path, and Hearthwell (which the rest of the roads run through).
  if (here === "farm") return edgeNode("farm", road === "forest" ? road : "hw");
  // `road:hw` is the road between the farm and the village (a spouse's walk to work, note 84).
  if (here === "hw") return edgeNode("hw", road === "hw" ? "farm" : road);
  return here === road ? edgeNode(road, "hw") : undefined;
}

const pathCache = new Map<string, readonly Node[] | null>();

/** The tiles after `a` up to `b` on one map, or null when there is no route. Cached (the maps are static). */
function walk(a: Node, b: Node): readonly Node[] | null {
  const key = `${a.map}|${a.x},${a.y}|${b.x},${b.y}`;
  const hit = pathCache.get(key);
  if (hit !== undefined) return hit;
  const m = walkMap(a.map);
  const p = findPath(
    {
      width: m.width,
      height: m.height,
      blocked: (x, y) => m.isBlocked(x, y),
    },
    a,
    b,
  );
  const out = p ? p.map((t) => ({ map: a.map, x: t.x, y: t.y })) : null;
  pathCache.set(key, out);
  return out;
}

const isInterior = (p: Place): boolean => !!p.map && !AREA_MAPS.has(p.map);

/** Every tile from place `a` to place `b`, or undefined (no route, or a crossing the walker does not cover). */
export function routeBetween(
  a: Place,
  aId: string,
  b: Place,
  bId: string,
): Node[] | undefined {
  if (a.transit && b.transit) return undefined;
  let from: Node;
  let target: Node;
  let fromInner = false;
  let toInner = false;
  if (a.transit) {
    const e = roadEdge(areaOf(bId), aId);
    if (!e) return undefined;
    from = e;
  } else {
    if (a.map === null) return undefined;
    from = { map: a.map, x: a.x, y: a.y };
    fromInner = isInterior(a);
  }
  if (b.transit) {
    const e = roadEdge(areaOf(aId), bId);
    if (!e) return undefined;
    target = e;
  } else {
    if (b.map === null) return undefined;
    target = { map: b.map, x: b.x, y: b.y };
    toInner = isInterior(b);
  }
  const out: Node[] = [from];
  const go = (to: Node): boolean => {
    const p = walk(out[out.length - 1]!, to);
    if (!p) return false;
    out.push(...p);
    return true;
  };
  // Inside one building: no door.
  if (fromInner && toInner && from.map === target.map)
    return go(target) ? out : undefined;
  if (fromInner) {
    const d = doorInfo(from.map);
    if (!d || !go(d.inner)) return undefined;
    out.push(d.outer);
  }
  let outerTarget = target;
  let enter: ReturnType<typeof doorInfo>;
  if (toInner) {
    enter = doorInfo(target.map);
    if (!enter) return undefined;
    outerTarget = enter.outer;
  }
  if (out[out.length - 1]!.map !== outerTarget.map) return undefined;
  if (!go(outerTarget)) return undefined;
  if (enter) {
    out.push(enter.inner);
    if (!go(target)) return undefined;
  }
  return out;
}

export interface DayWalk {
  plan: DayPlan;
  /** The stops, with the home place at minute 0 in front, so the first walk out is a leg too. */
  stops: Stop[];
  places: (Place | undefined)[];
  legs: (Leg | null | undefined)[];
}

const dayCache = new WeakMap<Villager, Map<string, DayWalk>>();

/** A person's day with its legs, built on demand and kept by day kind. */
export function dayWalk(v: Villager, ctx: DayContext): DayWalk {
  const key = `${ctx.season}|${ctx.weekday}|${isRainy(ctx.weather)}|${ctx.weather === "snowy"}`;
  let per = dayCache.get(v);
  if (!per) dayCache.set(v, (per = new Map()));
  let dw = per.get(key);
  if (!dw) {
    const plan = planDay(v, ctx);
    const stops: Stop[] = [{ time: 0, place: v.home }, ...plan.stops];
    dw = {
      plan,
      stops,
      places: stops.map((s) => resolvePlace(s.place)),
      legs: stops.map(() => undefined),
    };
    per.set(key, dw);
  }
  return dw;
}

/** The leg that ends at stop `i` (from stop `i - 1`), or null when the person just stands then snaps. */
export function legTo(dw: DayWalk, i: number): Leg | null {
  const hit = dw.legs[i];
  if (hit !== undefined) return hit;
  let leg: Leg | null = null;
  const a = dw.places[i - 1];
  const b = dw.places[i];
  if (i > 0 && a && b) {
    const steps = routeBetween(
      a,
      dw.stops[i - 1]!.place,
      b,
      dw.stops[i]!.place,
    );
    const n = steps ? steps.length - 1 : 0;
    if (steps && n > 0) {
      const end = dw.stops[i]!.time;
      const prev = dw.stops[i - 1]!.time;
      const start = Math.max(prev, end - n / TILES_PER_MINUTE);
      if (n <= (end - start) * TILES_PER_MINUTE * MAX_RUSH)
        leg = { start, end, dt: (end - start) / n, steps };
    }
  }
  dw.legs[i] = leg;
  return leg;
}

export interface WalkPose {
  map: string;
  /** The tile now (rounded). */
  x: number;
  y: number;
  /** The place between tiles, in tile units. */
  fx: number;
  fy: number;
  /** -1 left, 1 right, 0 unknown. */
  facing: number;
  /** The next tile on the way, on the same map, if any. */
  ahead?: { x: number; y: number };
}

/** Where a person is while walking a leg at minute `t`, or undefined when they stand at a stop, are in transit or asleep. */
export function walkingAt(
  v: Villager,
  ctx: DayContext,
  t: number,
): WalkPose | undefined {
  const dw = dayWalk(v, ctx);
  if (t >= dw.plan.bed) return undefined;
  const i = dw.stops.findIndex((s) => s.time > t);
  if (i < 1) return undefined;
  const leg = legTo(dw, i);
  if (!leg || t < leg.start) return undefined;
  const n = leg.steps.length - 1;
  const pos = Math.min((t - leg.start) / leg.dt, n);
  const k = Math.min(Math.floor(pos), n - 1);
  const a = leg.steps[k]!;
  const b = leg.steps[k + 1]!;
  const same = a.map === b.map;
  const f = same ? pos - k : 0;
  const fx = a.x + (b.x - a.x) * f;
  const fy = a.y + (b.y - a.y) * f;
  return {
    map: a.map,
    x: Math.round(fx),
    y: Math.round(fy),
    fx,
    fy,
    facing: same ? Math.sign(b.x - a.x) : 0,
    ...(same ? { ahead: { x: b.x, y: b.y } } : {}),
  };
}
