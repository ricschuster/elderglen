import { MATURE_STAGE, type Trees } from "./trees";

/**
 * Seasonal debris (`docs/design/65_special_orders_and_debris.md`, SC-29): a
 * small capped share of rocks, twigs and the odd stump returns to the farm on
 * day 1 of spring, summer and fall, and nothing returns in winter. Pure rules.
 */

/** Most rocks that appear on one of those mornings. Ours, a placeholder. */
export const DEBRIS_ROCKS = 8;
/** Most twigs that appear on one of those mornings. Ours, a placeholder. */
export const DEBRIS_TWIGS = 8;
/** Standing cap on rocks (or on twigs) on the farm. Ours, a placeholder. */
export const DEBRIS_CAP = 25;
/** Chance a season brings one stump. Ours, a placeholder. */
export const DEBRIS_STUMP_CHANCE = 0.1;
/** The wood a twig gives. */
export const TWIG_WOOD = 1;

export interface Twig {
  x: number;
  y: number;
}

const key = (x: number, y: number) => `${x},${y}`;

/** The farm's twigs: flat bits of branch that any tool clears for wood. */
export class Twigs {
  private twigs = new Map<string, Twig>();

  save(): Twig[] {
    return [...this.twigs.values()].map((t) => ({ ...t }));
  }

  load(saved: Twig[]): void {
    this.twigs = new Map(saved.map((t) => [key(t.x, t.y), { ...t }]));
  }

  *each(): Generator<Twig> {
    yield* this.twigs.values();
  }

  at(x: number, y: number): boolean {
    return this.twigs.has(key(x, y));
  }

  get count(): number {
    return this.twigs.size;
  }

  /** Put a twig on a tile. Returns false if one is already there. */
  add(x: number, y: number): boolean {
    if (this.at(x, y)) return false;
    this.twigs.set(key(x, y), { x, y });
    return true;
  }

  remove(x: number, y: number): boolean {
    return this.twigs.delete(key(x, y));
  }
}

/** Anything that holds rocks: the farm's `Rocks`. */
interface RockField {
  count: number;
  add(x: number, y: number, kind: "stone"): boolean;
}

/**
 * Scatter debris for a new day. Only day 1 of spring, summer and fall does
 * anything. `free` says whether a tile can take debris (the caller keeps it off
 * soil, crops, objects and the 3 by 3 round a fruit tree), `tiles` lists the
 * candidates, and `random` is a 0 to 1 roll.
 */
export function returnDebris(
  season: string,
  dayOfSeason: number,
  rocks: RockField,
  twigs: Twigs,
  trees: Trees,
  random: () => number,
  free: (x: number, y: number) => boolean,
  tiles: () => Twig[],
): void {
  if (season === "winter" || dayOfSeason !== 1) return;
  const spots = tiles().filter((t) => free(t.x, t.y));
  const take = (): Twig | undefined => {
    if (spots.length === 0) return undefined;
    return spots.splice(Math.floor(random() * spots.length), 1)[0];
  };
  const rockRoom = Math.max(0, DEBRIS_CAP - rocks.count);
  for (let n = 0; n < Math.min(DEBRIS_ROCKS, rockRoom); n++) {
    const t = take();
    if (t) rocks.add(t.x, t.y, "stone");
  }
  const twigRoom = Math.max(0, DEBRIS_CAP - twigs.count);
  for (let n = 0; n < Math.min(DEBRIS_TWIGS, twigRoom); n++) {
    const t = take();
    if (t) twigs.add(t.x, t.y);
  }
  if (random() < DEBRIS_STUMP_CHANCE) {
    const t = take();
    if (t && trees.add(t.x, t.y, MATURE_STAGE)) {
      const stump = trees.at(t.x, t.y);
      if (stump) stump.stump = true;
    }
  }
}
