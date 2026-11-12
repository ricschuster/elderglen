import type { Outcome } from "./actions";
import { categoryOf, type ArtisanCategory } from "./artisan";
import { itemById } from "./items";
import type { FarmMap } from "./map";
import { QUALITIES, splitQuality, withQuality, type Quality } from "./quality";
import type { GameState } from "./save";

/**
 * Casks (`docs/design/24_processing_and_cooking.md`, "The cask"): they stand
 * only in the cellar, hold one good each and raise its quality as the days
 * pass. Wine, mead and cheese go in. Nothing is lost by taking a good out
 * early, it simply has the quality it has reached. Pure rules.
 */
export const CASK = "cask";

/*
 * There is no cap on the number of casks: floor space is the limit, as in
 * Stardew (its cellar comes with 33 but takes up to 125 with paths left, saved
 * Cask page, read 2026-11-11, SC-144). Ours has 229 free tiles.
 */

/**
 * Days in the cask before a good reaches silver and gold, counted from the day
 * it went in. Stardew's figures from the saved Cask page, read 2026-11-08
 * (SC-82): wine 14 and 28, mead 7 and 14, cheese and goat cheese 3 and 7.
 */
export const CASK_DAYS: Partial<
  Record<ArtisanCategory, { silver: number; gold: number }>
> = {
  wine: { silver: 14, gold: 28 },
  mead: { silver: 7, gold: 14 },
  cheese: { silver: 3, gold: 7 },
  // Beer (wheat) 7 and 14; pale ale has its own days below (saved Cask page, SC-82).
  beer: { silver: 7, gold: 14 },
};

/** Goods whose days differ from their category's: pale ale 9 and 17 (SC-82). */
const CASK_ITEM_DAYS: Record<string, { silver: number; gold: number }> = {
  "pale-ale": { silver: 9, gold: 17 },
};

/** The days a good needs in the cask, by item first, then by category. */
function caskDays(item: string): { silver: number; gold: number } | undefined {
  return CASK_ITEM_DAYS[item] ?? CASK_DAYS[categoryOf(item) as ArtisanCategory];
}

/** What a cask holds: the good, the quality it went in at and the day it went in. */
export interface CaskJob {
  /** Base item id, quality removed. */
  item: string;
  quality: Quality;
  since: number;
}

export interface PlacedCask {
  x: number;
  y: number;
  job?: CaskJob;
}

const key = (x: number, y: number) => `${x},${y}`;

/** The casks standing in the cellar. */
export class Casks {
  private placed = new Map<string, PlacedCask>();

  save(): PlacedCask[] {
    return [...this.placed.values()].map((c) => ({
      ...c,
      job: c.job ? { ...c.job } : undefined,
    }));
  }

  load(saved: PlacedCask[]): void {
    this.placed = new Map(
      saved.map((c) => [
        key(c.x, c.y),
        { ...c, job: c.job ? { ...c.job } : undefined },
      ]),
    );
  }

  *each(): Generator<PlacedCask> {
    yield* this.placed.values();
  }

  get(x: number, y: number): PlacedCask | undefined {
    return this.placed.get(key(x, y));
  }

  at(x: number, y: number): boolean {
    return this.placed.has(key(x, y));
  }

  get count(): number {
    return this.placed.size;
  }

  add(c: PlacedCask): boolean {
    if (this.placed.has(key(c.x, c.y))) return false;
    this.placed.set(key(c.x, c.y), c);
    return true;
  }

  remove(x: number, y: number): PlacedCask | undefined {
    const c = this.get(x, y);
    this.placed.delete(key(x, y));
    return c;
  }
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

const rank = (q: Quality) => QUALITIES.indexOf(q);
const nameOf = (id: string) => itemById(id)?.name ?? id;

/** True if a cask takes this good. */
export function caskTakes(item: string): boolean {
  const cat = categoryOf(item);
  return cat !== undefined && CASK_DAYS[cat] !== undefined;
}

/** Whole days a cask has held its good. */
export function caskAge(g: GameState, job: CaskJob): number {
  return Math.max(g.day.clock.day - job.since, 0);
}

/** The quality a good has reached: the age's grade, never below the grade it went in at. */
export function caskQuality(g: GameState, job: CaskJob): Quality {
  const days = caskDays(job.item);
  if (!days) return job.quality;
  const age = caskAge(g, job);
  const earned: Quality =
    age >= days.gold ? "gold" : age >= days.silver ? "silver" : "normal";
  return rank(earned) > rank(job.quality) ? earned : job.quality;
}

/** Days until the next grade, or undefined at gold. */
export function daysToNextGrade(
  g: GameState,
  job: CaskJob,
): number | undefined {
  const days = caskDays(job.item);
  if (!days) return undefined;
  const age = caskAge(g, job);
  const q = caskQuality(g, job);
  if (q === "gold") return undefined;
  const target = q === "normal" ? days.silver : days.gold;
  return Math.max(target - age, 0);
}

/** True at gold: nothing more to wait for. */
export function caskDone(g: GameState, c: PlacedCask): boolean {
  return c.job !== undefined && caskQuality(g, c.job) === "gold";
}

/** What a cask is doing, for the message when the player uses it. */
export function caskStatus(g: GameState, x: number, y: number): string {
  const c = g.casks.get(x, y);
  if (!c) return "";
  if (!c.job) return "The cask is empty.";
  const q = caskQuality(g, c.job);
  const name = nameOf(c.job.item);
  const left = daysToNextGrade(g, c.job);
  if (left === undefined) return `${name}: gold quality, ready.`;
  const next = q === "normal" ? "silver" : "gold";
  return `${name}: ${q}, ${next} in ${left} day${left === 1 ? "" : "s"}.`;
}

/** Stand a cask from the backpack on a clear floor tile of the cellar. Free. */
export function placeCask(
  g: GameState,
  map: FarmMap,
  x: number,
  y: number,
): Outcome {
  if (g.day.over) return fail("exhausted");
  if (g.inventory.count(CASK) < 1) return fail("no cask");
  if (
    map.isBlocked(x, y) ||
    map.exitAt(x, y) ||
    map.entries.some((e) => e.x === x && e.y === y) ||
    map.serviceAt(x, y) ||
    g.casks.at(x, y)
  )
    return fail("cannot place here");
  g.inventory.remove(CASK);
  g.casks.add({ x, y });
  return { ok: true };
}

/** Put the held good into the cask on a tile. It keeps its quality as the floor. */
export function loadCask(
  g: GameState,
  x: number,
  y: number,
  item: string,
): Outcome {
  if (g.day.over) return fail("exhausted");
  const c = g.casks.get(x, y);
  if (!c) return fail("no cask here");
  if (c.job) return fail("cask busy");
  if (!caskTakes(item)) return fail("cask will not take that");
  if (g.inventory.count(item) < 1) return fail("not enough input");
  const { base, quality } = splitQuality(item);
  g.inventory.remove(item);
  c.job = { item: base, quality, since: g.day.clock.day };
  return { ok: true, note: `${nameOf(base)} is laid down to age.` };
}

/** Take the good out at the quality it has reached. */
export function collectCask(g: GameState, x: number, y: number): Outcome {
  if (g.day.over) return fail("exhausted");
  const c = g.casks.get(x, y);
  if (!c) return fail("no cask here");
  if (!c.job) return fail("cask empty");
  const out = withQuality(c.job.item, caskQuality(g, c.job));
  if (g.inventory.room(out) < 1) return fail("backpack full");
  g.inventory.add(out);
  c.job = undefined;
  return { ok: true, item: out };
}

/** Take an empty cask up into the backpack. */
export function pickUpCask(g: GameState, x: number, y: number): Outcome {
  if (g.day.over) return fail("exhausted");
  const c = g.casks.get(x, y);
  if (!c) return fail("no cask here");
  if (c.job) return fail("cask not empty");
  if (g.inventory.room(CASK) < 1) return fail("backpack full");
  g.casks.remove(x, y);
  g.inventory.add(CASK);
  return { ok: true, item: CASK };
}

/**
 * The hand or an axe or pickaxe on a cask: take a good out if there is one,
 * else take the empty cask up.
 */
export function handOnCask(g: GameState, x: number, y: number): Outcome {
  const c = g.casks.get(x, y);
  if (!c) return fail("no cask here");
  return c.job ? collectCask(g, x, y) : pickUpCask(g, x, y);
}
