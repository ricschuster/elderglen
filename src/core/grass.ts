import type { Outcome } from "./actions";
import { rngOf } from "./rng";
import { addHay, siloCapacity } from "./animals";
import type { GameState } from "./save";
import { tileKey } from "./tilekey";

/**
 * Grass on the player's farm (`docs/design/103_tool_pass.md`, notes 23, 29 and
 * 36). Pure rules: this file knows nothing of Phaser. A grass tile is a flat
 * mark on one free tile. Only the scythe cuts it. A cut tile gives hay into
 * the silo, and only when a silo is built. Grass drops no fiber.
 */

/** Grass tiles scattered on a new farm. Ours, a placeholder. */
export const START_GRASS = 40;
/** Grass tiles scattered on day 1 of spring, summer and fall. Ours, a placeholder. */
export const DAY_ONE_GRASS = 30;
/** Chance a night that grass spreads over each free edge of a grass tile. Ours. */
export const GRASS_SPREAD_CHANCE = 0.02;
/** Chance a cut grass tile gives a bale of hay. As Stardew (from memory). */
export const HAY_CHANCE = 0.5;

export const NO_SILO_HINT = "Cut grass could be hay, if you build a silo.";
export const SILO_FULL_NOTE = "The silo is full. The hay is lost.";

export interface GrassTile {
  x: number;
  y: number;
}

/** The farm's grass. */
export class Grass {
  private tiles = new Map<string, GrassTile>();
  /** The day the no-silo hint was last shown. Not saved: a hint, not state. */
  private hintDay = -1;

  save(): GrassTile[] {
    return [...this.tiles.values()].map((t) => ({ ...t }));
  }

  load(saved: GrassTile[]): void {
    this.tiles = new Map(saved.map((t) => [tileKey(t.x, t.y), { ...t }]));
  }

  *each(): Generator<GrassTile> {
    yield* this.tiles.values();
  }

  at(x: number, y: number): boolean {
    return this.tiles.has(tileKey(x, y));
  }

  get count(): number {
    return this.tiles.size;
  }

  /** Put grass on a tile. Returns false if it is already there. */
  add(x: number, y: number): boolean {
    if (this.at(x, y)) return false;
    this.tiles.set(tileKey(x, y), { x, y });
    return true;
  }

  /** Remove the grass on a tile. Returns false if there was none. */
  remove(x: number, y: number): boolean {
    return this.tiles.delete(tileKey(x, y));
  }

  clear(): void {
    this.tiles.clear();
  }

  /** True the first time it is asked on a day: the no-silo hint is shown once a day. */
  hintDue(day: number): boolean {
    if (this.hintDay === day) return false;
    this.hintDay = day;
    return true;
  }

  /** Scatter `n` grass tiles over free tiles, capped by the free tiles. */
  scatter(
    n: number,
    random: () => number,
    free: (x: number, y: number) => boolean,
    tiles: () => GrassTile[],
  ): void {
    const spots = tiles().filter((t) => !this.at(t.x, t.y) && free(t.x, t.y));
    for (let i = 0; i < n && spots.length > 0; i++) {
      const [t] = spots.splice(Math.floor(random() * spots.length), 1);
      if (t) this.add(t.x, t.y);
    }
  }

  /**
   * Overnight, for the new day. Winter day 1 clears all grass and winter
   * nights spread none. Otherwise each grass tile may spread over each free
   * edge (`GRASS_SPREAD_CHANCE`), then day 1 of spring, summer and fall
   * scatters `DAY_ONE_GRASS` more. `free` says whether a tile can take grass.
   */
  endDay(
    season: string,
    dayOfSeason: number,
    random: () => number,
    free: (x: number, y: number) => boolean,
    tiles: () => GrassTile[],
  ): void {
    if (season === "winter") {
      if (dayOfSeason === 1) this.clear();
      return;
    }
    const sources = [...this.tiles.values()];
    const born: GrassTile[] = [];
    for (const g of sources) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const x = g.x + dx;
        const y = g.y + dy;
        if (!this.at(x, y) && free(x, y) && random() < GRASS_SPREAD_CHANCE)
          born.push({ x, y });
      }
    }
    for (const t of born) this.add(t.x, t.y);
    if (dayOfSeason === 1) this.scatter(DAY_ONE_GRASS, random, free, tiles);
  }
}

/**
 * Cut the grass on a tile with the scythe: free, one hit. 50 percent of the
 * time it gives a bale of hay straight into the silo. With no silo it gives
 * nothing and says so once a day. With a full silo the hay is lost, with a line.
 */
export function cutGrass(
  g: GameState,
  x: number,
  y: number,
  random: () => number = rngOf(g),
): Outcome {
  if (!g.grass.at(x, y)) return { ok: false, reason: "no grass" };
  g.grass.remove(x, y);
  if (siloCapacity(g) === 0)
    return g.grass.hintDue(g.day.clock.day)
      ? { ok: true, note: NO_SILO_HINT }
      : { ok: true };
  if (random() >= HAY_CHANCE) return { ok: true };
  return addHay(g, 1) > 0 ? { ok: true } : { ok: true, note: SILO_FULL_NOTE };
}
