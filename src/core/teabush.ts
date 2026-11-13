import { DAYS_PER_SEASON } from "./calendar";
import data from "../content/tea-bush.json";

/**
 * The tea bush (`docs/design/97_tea_bush.md`). A crafted sapling grows 20 days,
 * 10 a stage, in any season and without water, then gives a tea leaf a day in
 * the last week of the season (spring, summer and fall outdoors; any season in
 * the greenhouse). It is impassable at every stage. Pure rules; the numbers are
 * data in `src/content/tea-bush.json`.
 */
export const TEA_SAPLING = "tea-sapling";
export const TEA_LEAF = "tea-leaf";

export const TEA_STAGE_DAYS = data.stageDays;
export const TEA_MATURE_DAYS = data.matureDays;
/** The first day of the season a mature bush bears (the 22nd); it bears to the last. */
export const TEA_FIRST_BEARING_DAY = data.firstBearingDay;
/** Leaves a bush holds until picked. */
export const TEA_MAX_LEAVES = data.maxLeaves;
/** Axe hits to fell a mature bush, and the lowest axe tier that can (gold). */
export const TEA_CHOP_HITS = data.chopHits;
export const TEA_CHOP_AXE_TIER = data.chopAxeTier;
export const TEA_LEAF_SELL_PRICE = data.leafSellPrice;
export const TEA_LEAF_ENERGY = data.leafEnergy;
export const TEA_SAPLING_SELL_PRICE = data.saplingSellPrice;

export interface PlacedTeaBush {
  x: number;
  y: number;
  /** Days grown. */
  age: number;
  /** Leaves waiting on the bush. */
  leaves: number;
  /** Axe hits taken in the current chop. Reset overnight. */
  hits: number;
}

export const isTeaMature = (b: Pick<PlacedTeaBush, "age">) =>
  b.age >= TEA_MATURE_DAYS;

/** Growth stage 0 or 1 while growing, 2 when mature. */
export const teaStageOf = (age: number) =>
  Math.min(Math.floor(age / TEA_STAGE_DAYS), TEA_MATURE_DAYS / TEA_STAGE_DAYS);

/** True when a bush bears on this day: its last week, and not winter unless indoors. */
export function bearsOn(
  season: string,
  dayOfSeason: number,
  indoors: boolean,
): boolean {
  return (
    dayOfSeason >= TEA_FIRST_BEARING_DAY &&
    dayOfSeason <= DAYS_PER_SEASON &&
    (season !== "winter" || indoors)
  );
}

const key = (x: number, y: number) => `${x},${y}`;

/** The tea bushes of one map. */
export class TeaBushes {
  private bushes = new Map<string, PlacedTeaBush>();

  save(): PlacedTeaBush[] {
    return [...this.bushes.values()].map((b) => ({ ...b }));
  }

  load(saved: PlacedTeaBush[]): void {
    this.bushes = new Map(saved.map((b) => [key(b.x, b.y), { ...b }]));
  }

  at(x: number, y: number): PlacedTeaBush | undefined {
    return this.bushes.get(key(x, y));
  }

  *each(): Generator<PlacedTeaBush> {
    yield* this.bushes.values();
  }

  get count(): number {
    return this.bushes.size;
  }

  /** Plant a bush. False if the tile is taken. */
  add(x: number, y: number, age = 0): boolean {
    if (this.at(x, y)) return false;
    this.bushes.set(key(x, y), { x, y, age, leaves: 0, hits: 0 });
    return true;
  }

  remove(x: number, y: number): void {
    this.bushes.delete(key(x, y));
  }

  /** Overnight, on the new day's date. Every bush ages; a mature one bears in its window. */
  endDay(season: string, dayOfSeason: number, indoors = false): void {
    for (const b of this.bushes.values()) {
      b.hits = 0;
      b.age += 1;
      if (
        isTeaMature(b) &&
        bearsOn(season, dayOfSeason, indoors) &&
        b.leaves < TEA_MAX_LEAVES
      )
        b.leaves += 1;
    }
  }
}
