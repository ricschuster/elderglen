import { isRaining, type Weather } from "./weather";

/**
 * Weeds on the player's farm (`docs/design/29_weeds.md` and
 * `36_gathering_trees_sap_fiber.md`). Pure rules: this file knows nothing of
 * Phaser. A weed is a flat mark on one tile. It never destroys anything: it
 * only takes free tiles, and any tool clears it in one hit.
 */

/** Weeds placed on day 1 of spring, summer and fall. Ours, a placeholder. */
export const DAY_ONE_WEEDS = 20;
/** Chance a night that a weed spreads to a free adjacent tile. Ours. */
export const SPREAD_CHANCE = 0.1;
/** The same, in summer. Ours. */
export const SUMMER_SPREAD_CHANCE = 0.15;
/** The same, on a rainy night. Ours. */
export const RAIN_SPREAD_CHANCE = 0.2;
/** Chance a cut weed drops 1 fiber. As Stardew. */
export const FIBER_CHANCE = 0.5;
/** The item a weed drops. */
export const FIBER = "fiber";
/** Wild seeds that plant a random crop for the season. A weed may drop one. */
export const MIXED_SEED = "mixed-seed";

export interface Weed {
  x: number;
  y: number;
}

const key = (x: number, y: number) => `${x},${y}`;

/** The farm's weeds. */
export class Weeds {
  private weeds = new Map<string, Weed>();

  save(): Weed[] {
    return [...this.weeds.values()].map((w) => ({ ...w }));
  }

  load(saved: Weed[]): void {
    this.weeds = new Map(saved.map((w) => [key(w.x, w.y), { ...w }]));
  }

  *each(): Generator<Weed> {
    yield* this.weeds.values();
  }

  at(x: number, y: number): boolean {
    return this.weeds.has(key(x, y));
  }

  get count(): number {
    return this.weeds.size;
  }

  /** Put a weed on a tile. Returns false if one is already there. */
  add(x: number, y: number): boolean {
    if (this.at(x, y)) return false;
    this.weeds.set(key(x, y), { x, y });
    return true;
  }

  /** Remove the weed on a tile. Returns false if there was none. */
  remove(x: number, y: number): boolean {
    return this.weeds.delete(key(x, y));
  }

  /** Winter day 1 clears every weed, as it clears crops. */
  clear(): void {
    this.weeds.clear();
  }

  /**
   * Overnight, for the new day. Winter day 1 clears everything. Otherwise
   * every weed may spread to one free tile next to it (rain and summer make
   * that likelier), then day 1 of spring, summer and fall scatters
   * `DAY_ONE_WEEDS` more, capped by the free tiles. `free` says whether a
   * tile can take a weed; a weed already there is never free.
   */
  endDay(
    season: string,
    dayOfSeason: number,
    weather: Weather,
    random: () => number,
    free: (x: number, y: number) => boolean,
    tiles: () => Weed[],
  ): void {
    if (season === "winter" && dayOfSeason === 1) {
      this.clear();
      return;
    }
    const chance = isRaining(weather)
      ? RAIN_SPREAD_CHANCE
      : season === "summer"
        ? SUMMER_SPREAD_CHANCE
        : SPREAD_CHANCE;
    const open = (x: number, y: number) => !this.at(x, y) && free(x, y);
    // A weed that spread tonight does not spread again tonight.
    for (const w of [...this.weeds.values()]) {
      if (random() >= chance) continue;
      const near = [
        { x: w.x + 1, y: w.y },
        { x: w.x - 1, y: w.y },
        { x: w.x, y: w.y + 1 },
        { x: w.x, y: w.y - 1 },
      ].filter((t) => open(t.x, t.y));
      const pick = near[Math.floor(random() * near.length)];
      if (pick) this.add(pick.x, pick.y);
    }
    if (dayOfSeason !== 1) return;
    const spots = tiles().filter((t) => open(t.x, t.y));
    for (let n = 0; n < DAY_ONE_WEEDS && spots.length > 0; n++) {
      const i = Math.floor(random() * spots.length);
      const [t] = spots.splice(i, 1);
      if (t) this.add(t.x, t.y);
    }
  }
}
