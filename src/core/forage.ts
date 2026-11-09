import type { Season } from "./calendar";
import forageData from "../content/forage.json";
import {
  forageAreaOf,
  forageCap,
  forageWeights,
  pickForage,
  type ForageArea,
} from "./forageareas";

export interface ForageDef {
  id: string;
  name: string;
  seasons: Season[];
  sellPrice: number;
  /** Energy restored when eaten. Absent for goods that are not food. */
  energy?: number;
  /** Wild fruit can be preserved. Other forage cannot. */
  produce?: "fruit";
  /** A rare find: a small share of spawns in its season, not a common good. */
  rare?: boolean;
  /** An edible mushroom: the dehydrator takes it, and the mushroom cave grows it. */
  mushroom?: boolean;
  /** Turned up by tilling farm soil, not found on forage spots. */
  soil?: boolean;
}

export const FORAGE = forageData as ForageDef[];

export function forageById(id: string): ForageDef | undefined {
  return FORAGE.find((f) => f.id === id);
}

export interface Spot {
  x: number;
  y: number;
}

/** Most spots that hold wild goods on one day, as a share of candidate spots. */
export const MAX_FILL = 0.25;

/** Share of forage spawns that are a rare find, when one is in season. Placeholder (note 07). */
export const RARE_CHANCE = 0.05;

/** Wild goods lying on the ground. They reset each morning. */
export class ForageField {
  private found = new Map<string, string>();

  itemAt(x: number, y: number): string | undefined {
    return this.found.get(`${x},${y}`);
  }

  /** Every good on the ground with its tile, for drawing. */
  *each(): Generator<{ x: number; y: number; id: string }> {
    for (const [k, id] of this.found) {
      const [x, y] = k.split(",").map(Number) as [number, number];
      yield { x, y, id };
    }
  }

  get count(): number {
    return this.found.size;
  }

  /** Clear yesterday's leftovers and scatter new goods for the season. */
  respawn(season: Season, spots: Spot[], random: () => number): void {
    this.found.clear();
    const inSeason = FORAGE.filter((f) => f.seasons.includes(season));
    const options = inSeason.filter((f) => !f.rare);
    const rares = inSeason.filter((f) => f.rare);
    if (options.length === 0) return;
    const pool = [...spots];
    const target = Math.floor(random() * (pool.length * MAX_FILL + 1));
    for (let i = 0; i < target && pool.length > 0; i++) {
      const spot = pool.splice(
        Math.floor(random() * pool.length),
        1,
      )[0] as Spot;
      const pickFrom =
        rares.length > 0 && random() < RARE_CHANCE ? rares : options;
      const def = pickFrom[Math.floor(random() * pickFrom.length)] as ForageDef;
      this.found.set(`${spot.x},${spot.y}`, def.id);
    }
  }

  /**
   * Scatter the day's goods on a map with its own forage area: up to the area's
   * cap of points, each given a good from the weight table of its region
   * (`tableOf`), with no rare chance on top. Without an area for the map this
   * is the shared pool (`respawn`).
   */
  respawnArea(
    mapId: string,
    season: Season,
    spots: Spot[],
    tableOf: (spot: Spot) => string,
    random: () => number,
    area: ForageArea | undefined = forageAreaOf(mapId),
  ): void {
    if (area === undefined) return this.respawn(season, spots, random);
    this.found.clear();
    const pool = [...spots];
    const target = Math.min(forageCap(area, season), pool.length);
    for (let i = 0; i < target; i++) {
      const spot = pool.splice(
        Math.floor(random() * pool.length),
        1,
      )[0] as Spot;
      const id = pickForage(forageWeights(area, tableOf(spot), season), random);
      if (id !== undefined) this.found.set(`${spot.x},${spot.y}`, id);
    }
  }

  /** Pick up whatever lies at a spot. Returns the item id, if any. */
  collect(x: number, y: number): string | undefined {
    const id = this.itemAt(x, y);
    this.found.delete(`${x},${y}`);
    return id;
  }
}
