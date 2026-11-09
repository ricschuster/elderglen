import type { Season } from "./calendar";
import areaData from "../content/forage-areas.json";

/**
 * Per-map forage (`docs/design/71_map_areas_overview.md`, Map contract
 * additions). A map with an entry here replaces the single shared pool and its
 * rare chance with an explicit weight table per season, and a daily cap. A
 * forage point inside a `region` object that names a `forage` table uses that
 * table, so one map can hold marsh and beach tables. Daily patches (such as the
 * spring onion bank) fill every point and are outside the cap. Free of Phaser.
 */
export interface WeightedForage {
  id: string;
  weight: number;
}

/** One table: the weighted goods of each season. A season it omits gives nothing. */
export type ForageTable = Partial<Record<Season, WeightedForage[]>>;

export interface ForageArea {
  /** Most points holding a good on one day: one number, or one per season. */
  cap: number | Partial<Record<Season, number>>;
  /** Tables by name. `default` serves every point outside a region that names one. */
  tables: Record<string, ForageTable>;
  /**
   * Daily patches by region table name: in a listed season every point of a
   * region with that `forage` name holds the named good each morning, outside
   * the cap (the Forest's spring onion bank). In other seasons it holds nothing.
   */
  patches?: Record<string, Partial<Record<Season, string>>>;
}

export type ForageAreas = Record<string, ForageArea>;

export const FORAGE_AREAS = areaData as ForageAreas;

/** The area entry for a map, if it has one. Maps without one use the shared pool. */
export function forageAreaOf(
  mapId: string,
  areas: ForageAreas = FORAGE_AREAS,
): ForageArea | undefined {
  return areas[mapId];
}

/** The daily cap of an area in a season. A season the cap omits gives zero. */
export function forageCap(area: ForageArea, season: Season): number {
  return typeof area.cap === "number" ? area.cap : (area.cap[season] ?? 0);
}

/** The weighted goods of a table in a season. Empty for an unknown table. */
export function forageWeights(
  area: ForageArea,
  table: string,
  season: Season,
): WeightedForage[] {
  return area.tables[table]?.[season] ?? [];
}

/** One weighted pick from a table, or undefined when it is empty. */
export function pickForage(
  list: readonly WeightedForage[],
  random: () => number,
): string | undefined {
  const total = list.reduce((n, w) => n + w.weight, 0);
  if (list.length === 0 || total <= 0) return undefined;
  let pick = random() * total;
  for (const w of list) {
    pick -= w.weight;
    if (pick < 0) return w.id;
  }
  return list[list.length - 1]!.id;
}

/** What is wrong with the area data, in words: unknown goods, bad weights, no default table. */
export function forageAreaProblems(
  areas: ForageAreas,
  known: (id: string) => boolean,
): string[] {
  const out: string[] = [];
  for (const [mapId, area] of Object.entries(areas)) {
    if (area.tables["default"] === undefined)
      out.push(`${mapId}: needs a "default" table`);
    const caps =
      typeof area.cap === "number" ? [area.cap] : Object.values(area.cap);
    if (caps.some((c) => !Number.isInteger(c) || c < 0))
      out.push(`${mapId}: the cap must be a whole number, zero or more`);
    for (const [name, patch] of Object.entries(area.patches ?? {}))
      for (const [season, id] of Object.entries(patch))
        if (id !== undefined && !known(id))
          out.push(`${mapId}/${name}/${season}: unknown forage "${id}"`);
    for (const [name, table] of Object.entries(area.tables))
      for (const [season, list] of Object.entries(table))
        for (const w of list ?? []) {
          if (!known(w.id))
            out.push(`${mapId}/${name}/${season}: unknown forage "${w.id}"`);
          if (!(w.weight > 0))
            out.push(
              `${mapId}/${name}/${season}: "${w.id}" needs a weight above 0`,
            );
        }
  }
  return out;
}
