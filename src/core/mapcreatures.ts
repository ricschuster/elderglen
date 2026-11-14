import spawnData from "../content/creature-spawns.json";
import { newCreature, type Creature, type DropDef } from "./creatures";
import type { FarmMap } from "./map";
import type { Vec } from "./movement";

/**
 * Creatures placed by map rather than by mine band (`docs/design/73_secret_woods.md`,
 * "Creatures"). A map with an entry gets its fixed mix each morning, placed when
 * the player arrives, none refilling in the day, on open tiles inside its regions
 * and outside its avoid areas, off every large stump and clear of the water's edge.
 * The entry also adds drops to every creature beaten on that map. Free of Phaser.
 */
interface Rect {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CreatureSpawnTable {
  regions: Rect[];
  avoid: Rect[];
  /** Tiles around water that stay empty. */
  pondMargin: number;
  /** Tiles from the arrival point that stay empty. */
  keepAway: number;
  creatures: { kind: string; count: number }[];
  /** Extra drops for any creature beaten on this map. */
  drops: DropDef[];
}

export const CREATURE_SPAWNS = spawnData as Record<string, CreatureSpawnTable>;

/** The map's creature spawn table, if it has one. */
export const creatureSpawnsOf = (
  mapId: string,
  tables: Record<string, CreatureSpawnTable> = CREATURE_SPAWNS,
): CreatureSpawnTable | undefined => tables[mapId];

/** Extra drops for a creature beaten on a map (empty where there is no table). */
export const mapDrops = (mapId: string): DropDef[] =>
  creatureSpawnsOf(mapId)?.drops ?? [];

const inRect = (r: Rect, x: number, y: number) =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** Whether a creature may be placed on a tile of this map. */
export function creatureTileOk(
  table: CreatureSpawnTable,
  map: FarmMap,
  x: number,
  y: number,
): boolean {
  if (!table.regions.some((r) => inRect(r, x, y))) return false;
  if (table.avoid.some((r) => inRect(r, x, y))) return false;
  if (map.isBlocked(x, y) || map.isWater(x, y)) return false;
  if (map.trees.some((t) => t.x === x && t.y === y)) return false;
  if (map.rocks.some((r) => r.x === x && r.y === y)) return false;
  const m = table.pondMargin;
  for (let dy = -m; dy <= m; dy++)
    for (let dx = -m; dx <= m; dx++)
      if (map.isWater(x + dx, y + dy)) return false;
  return true;
}

/**
 * The morning's creatures for a map. `free` says whether something of the world
 * (a chopped stump, a rock, a weed) is on a tile. Positions are the tile's feet point.
 */
export function placeMapCreatures(
  table: CreatureSpawnTable,
  map: FarmMap,
  random: () => number,
  arrive: Vec,
  free: (x: number, y: number) => boolean = () => true,
): Creature[] {
  const tiles: Vec[] = [];
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++)
      if (
        creatureTileOk(table, map, x, y) &&
        free(x, y) &&
        Math.max(Math.abs(x - arrive.x), Math.abs(y - arrive.y)) >=
          table.keepAway
      )
        tiles.push({ x, y });
  const out: Creature[] = [];
  const ts = map.tileSize;
  for (const row of table.creatures)
    for (let i = 0; i < row.count && tiles.length > 0; i++) {
      const at = tiles.splice(Math.floor(random() * tiles.length), 1)[0]!;
      out.push(
        newCreature(
          out.length + 1,
          row.kind,
          (at.x + 0.5) * ts,
          (at.y + 1) * ts - 2,
        ),
      );
    }
  return out;
}
