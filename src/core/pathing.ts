import type { Vec } from "./movement";

/** What the route finder needs to know about a map (tile grid, note 27). */
export interface Grid {
  width: number;
  height: number;
  /** True if a walker cannot stand on the tile. */
  blocked: (x: number, y: number) => boolean;
}

const DIRS: readonly Vec[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

const key = (g: Grid, v: Vec): number => v.y * g.width + v.x;
const inside = (g: Grid, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < g.width && y < g.height;

/**
 * The shortest route from `from` to `to` over open tiles, four ways (A*,
 * Manhattan distance). The path lists the tiles after `from`, ending on `to`;
 * it is empty when `from` is `to`, and undefined when no route exists. The
 * start tile may itself be blocked (a farmer can stand half in one). Search
 * is capped by `limit` expanded tiles so a huge map cannot stall a frame.
 */
export function findPath(
  g: Grid,
  from: Vec,
  to: Vec,
  limit = 20000,
): Vec[] | undefined {
  if (!inside(g, to.x, to.y) || g.blocked(to.x, to.y)) return undefined;
  if (from.x === to.x && from.y === to.y) return [];
  const h = (x: number, y: number): number =>
    Math.abs(x - to.x) + Math.abs(y - to.y);
  const cost = new Map<number, number>([[key(g, from), 0]]);
  const prev = new Map<number, number>();
  const open: { x: number; y: number; f: number }[] = [
    { ...from, f: h(from.x, from.y) },
  ];
  const closed = new Set<number>();
  let expanded = 0;
  while (open.length > 0 && expanded < limit) {
    let best = 0;
    for (let i = 1; i < open.length; i++)
      if (open[i]!.f < open[best]!.f) best = i;
    const cur = open.splice(best, 1)[0]!;
    const ck = key(g, cur);
    if (closed.has(ck)) continue;
    closed.add(ck);
    expanded++;
    if (cur.x === to.x && cur.y === to.y) {
      const out: Vec[] = [];
      let k = ck;
      while (prev.has(k)) {
        out.push({ x: k % g.width, y: Math.floor(k / g.width) });
        k = prev.get(k)!;
      }
      return out.reverse();
    }
    const base = cost.get(ck)!;
    for (const d of DIRS) {
      const x = cur.x + d.x;
      const y = cur.y + d.y;
      if (!inside(g, x, y) || g.blocked(x, y)) continue;
      const nk = y * g.width + x;
      const c = base + 1;
      if (c >= (cost.get(nk) ?? Infinity)) continue;
      cost.set(nk, c);
      prev.set(nk, ck);
      open.push({ x, y, f: c + h(x, y) });
    }
  }
  return undefined;
}

/** What a tap on a tile asks for. */
export interface TapPlan {
  /** Tiles to walk, in order, after the farmer's own tile. */
  path: Vec[];
  /** The tile to act on once there, if the tap was on an object. */
  act?: Vec;
}

/**
 * Plan a tap. A tap on an open tile walks there. A tap on an object (a tile
 * the farmer cannot stand on but can act on) walks to the nearest open tile
 * beside it, then acts on it. Undefined when no route exists, which the scene
 * shows as a red target.
 */
export function planTap(
  g: Grid,
  from: Vec,
  tap: Vec,
  isObject: (x: number, y: number) => boolean,
): TapPlan | undefined {
  if (!inside(g, tap.x, tap.y)) return undefined;
  if (!g.blocked(tap.x, tap.y)) {
    const path = findPath(g, from, tap);
    return path && { path };
  }
  if (!isObject(tap.x, tap.y)) return undefined;
  let best: Vec[] | undefined;
  for (const d of DIRS) {
    const side = { x: tap.x + d.x, y: tap.y + d.y };
    const path = findPath(g, from, side);
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best && { path: best, act: tap };
}
