import spawnData from "../content/spawns.json";

/**
 * Nightly spawns (note 71, addition 10; the Quarry, note 78). A map with an
 * entry gets a number of spawn attempts each night, rising by year. Each
 * attempt picks a weighted kind and a random tile, and a tile with anything
 * on it is skipped. Free of Phaser and the DOM.
 */
export interface SpawnKind {
  /** What spawns: `rock`, `hard-rock` or an ore node id. The map's scene knows how to place it. */
  kind: string;
  weight: number;
  /** Mining level needed before this kind spawns (note 78 "Ore gates"). Default none. */
  minLevel?: number;
}

export interface SpawnTable {
  /** Attempts on a night of year 1. */
  attempts: number;
  /** More attempts for each year after the first. Default 0. */
  perYear?: number;
  /** Most attempts on any night. Default no limit. */
  maxAttempts?: number;
  kinds: SpawnKind[];
}

export type SpawnTables = Record<string, SpawnTable>;

export const SPAWN_TABLES = spawnData as SpawnTables;

/** The table for a map, if it has one. */
export function spawnTableOf(
  mapId: string,
  tables: SpawnTables = SPAWN_TABLES,
): SpawnTable | undefined {
  return tables[mapId];
}

/** Attempts on a night of a year (1 based). */
export function spawnAttempts(table: SpawnTable, year: number): number {
  const n = table.attempts + (table.perYear ?? 0) * Math.max(0, year - 1);
  return Math.max(0, Math.min(n, table.maxAttempts ?? n));
}

export interface Spawn {
  x: number;
  y: number;
  kind: string;
}

/**
 * One night's spawns. `tiles` are the map's candidate tiles and `free` says
 * whether a tile has nothing on it. A tile that is not free is skipped, so an
 * attempt on it is lost, and a tile never takes two spawns in one night.
 */
export function nightlySpawns(
  table: SpawnTable,
  year: number,
  tiles: readonly { x: number; y: number }[],
  free: (x: number, y: number) => boolean,
  random: () => number,
  miningLevel = Infinity,
): Spawn[] {
  const kinds = table.kinds.filter((k) => (k.minLevel ?? 0) <= miningLevel);
  const total = kinds.reduce((n, k) => n + k.weight, 0);
  if (tiles.length === 0 || total <= 0) return [];
  const out: Spawn[] = [];
  const used = new Set<string>();
  for (let i = 0; i < spawnAttempts(table, year); i++) {
    const tile = tiles[Math.floor(random() * tiles.length)]!;
    const key = `${tile.x},${tile.y}`;
    if (used.has(key) || !free(tile.x, tile.y)) continue;
    let pick = random() * total;
    let kind = kinds[kinds.length - 1]!.kind;
    for (const k of kinds) {
      pick -= k.weight;
      if (pick < 0) {
        kind = k.kind;
        break;
      }
    }
    used.add(key);
    out.push({ x: tile.x, y: tile.y, kind });
  }
  return out;
}
