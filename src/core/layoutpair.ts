import type { Exit } from "./map";
import { KNOWN_PAIR_GAPS, PAIR_LIMIT, pairGap, type MapRegistry } from "./maps";

/**
 * Pure helpers for the pair view of the layout page
 * (`docs/design/87_layout_page.md`, slice 5): two maps side by side, one exit
 * and the entry it leads to, and the tile gap the pair check measures. Nothing
 * here touches Phaser or the DOM.
 */

export type PairStatus =
  /** Within the limit. */
  | "ok"
  /** Over the limit: the pair check reports it. */
  | "over"
  /** Over the limit but listed in `KNOWN_PAIR_GAPS`, so not reported yet. */
  | "known-gap"
  /** The target map has no exit back, so there is no pair to check. */
  | "one-way"
  /** The target has no such entry (the registry check reports it). */
  | "no-entry"
  /** An exit to its own map is not checked. */
  | "self";

export interface PairView {
  from: string;
  exit: Exit;
  to: string;
  entry?: { name: string; x: number; y: number };
  /** Every exit on the target that leads back to `from`. */
  back: Exit[];
  /** The one nearest the entry, and the gap the check measures to it. */
  nearest?: Exit;
  gap?: number;
  limit: number;
  status: PairStatus;
}

/** The pair an exit forms with its target, read the way `pairProblems` reads it. */
export function pairView(
  reg: MapRegistry,
  from: string,
  exitId: string,
  limit = PAIR_LIMIT,
): PairView | undefined {
  const exit = reg.get(from).exits.find((x) => x.id === exitId);
  if (!exit) return undefined;
  const base = { from, exit, to: exit.map, back: [] as Exit[], limit };
  if (exit.map === from) return { ...base, status: "self" };
  if (!reg.ids.includes(exit.map)) return { ...base, status: "no-entry" };
  const target = reg.get(exit.map);
  const tiers = Array.from({ length: reg.maxTier(exit.map) + 1 }, (_, t) =>
    reg.get(exit.map, t),
  );
  const found = tiers.map((t) => t.entry(exit.entry)).find((e) => e);
  if (!found) return { ...base, status: "no-entry" };
  const entry = { name: exit.entry, x: found.x, y: found.y };
  const back = target.exits.filter((x) => x.map === from);
  if (back.length === 0) return { ...base, entry, status: "one-way" };
  const ranked = back
    .map((b) => ({ b, d: pairGap(entry, b) }))
    .sort((p, q) => p.d - q.d)[0]!;
  const status: PairStatus =
    ranked.d <= limit
      ? "ok"
      : KNOWN_PAIR_GAPS.has(`${from}:${exit.id}`)
        ? "known-gap"
        : "over";
  return {
    ...base,
    entry,
    back,
    nearest: ranked.b,
    gap: ranked.d,
    status,
  };
}

/** Every exit of every map as a pair, worst gap first (unchecked pairs last). */
export function allPairs(reg: MapRegistry, limit = PAIR_LIMIT): PairView[] {
  const out: PairView[] = [];
  for (const id of reg.ids)
    for (const exit of reg.get(id).exits) {
      const v = pairView(reg, id, exit.id, limit);
      if (v) out.push(v);
    }
  return out.sort(
    (a, b) =>
      (b.gap ?? -1) - (a.gap ?? -1) ||
      `${a.from}:${a.exit.id}`.localeCompare(`${b.from}:${b.exit.id}`),
  );
}

/** One line a designer can read: why the pair passes or fails. */
export function pairText(v: PairView): string {
  const head = `${v.from} "${v.exit.id}" -> ${v.to} "${v.exit.entry}"`;
  switch (v.status) {
    case "self":
      return `${head}: leads to its own map, not checked`;
    case "no-entry":
      return `${head}: no such map or entry`;
    case "one-way":
      return `${head}: ${v.to} has no exit back to ${v.from}, not checked`;
    default: {
      const n = v.nearest!;
      const verdict =
        v.status === "ok"
          ? `within the limit of ${v.limit}`
          : v.status === "known-gap"
            ? `over the limit of ${v.limit} (a known gap, waiting for a layout)`
            : `over the limit of ${v.limit}`;
      return `${head}: entry at ${v.entry!.x},${v.entry!.y} is ${v.gap} tiles from exit "${n.id}" back, ${verdict}`;
    }
  }
}

/**
 * The map and exit a pair problem line (`MapRegistry.pairProblems`) is about,
 * so a click on it opens the pair. Undefined for any other line.
 */
export function parsePairProblem(
  line: string,
): { map: string; exit: string } | undefined {
  const m =
    /^([^\s:]+): exit "([^"]+)" leads to entry "[^"]+" on "[^"]+", /.exec(line);
  return m ? { map: m[1]!, exit: m[2]! } : undefined;
}

export interface Size {
  width: number;
  height: number;
}

export interface Placement {
  /** Size of the shared canvas, in tiles. */
  width: number;
  height: number;
  /** Where each map's top left tile sits on it. */
  a: { x: number; y: number };
  b: { x: number; y: number };
}

/** Two maps side by side with a gap of `margin` tiles, tops aligned. */
export function besideBy(a: Size, b: Size, margin = 3): Placement {
  return {
    width: a.width + margin + b.width,
    height: Math.max(a.height, b.height),
    a: { x: 0, y: 0 },
    b: { x: a.width + margin, y: 0 },
  };
}

/** Map `b` laid over map `a` with its top left at `offset` (may hang over an edge). */
export function overlayBy(
  a: Size,
  b: Size,
  offset: { x: number; y: number },
): Placement {
  const left = Math.min(0, offset.x) || 0;
  const top = Math.min(0, offset.y) || 0;
  return {
    width: Math.max(a.width, offset.x + b.width) - left,
    height: Math.max(a.height, offset.y + b.height) - top,
    a: { x: 0 - left, y: 0 - top },
    b: { x: offset.x - left, y: offset.y - top },
  };
}
