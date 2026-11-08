import { DAYS_PER_SEASON, SEASONS } from "./calendar";
import { withQuality, type Quality } from "./quality";
import treeData from "../content/fruit-trees.json";

/**
 * Fruit trees (`docs/design/31_farm_growth.md`). A sapling grows for 28 days,
 * 7 a stage, but only while the 3x3 around it is clear. A mature tree bears one
 * fruit a night in its season and holds up to 3 until picked. Fruit gains a
 * grade for each year of tree age after maturity. Pure rules; the tree
 * definitions are data in `src/content/fruit-trees.json`.
 */
export interface FruitTreeDef {
  id: string;
  name: string;
  /** The season it bears in. Fall and winter are not in the calendar yet, so a tree for a missing season never bears. */
  season: string;
  saplingPrice: number;
  /** Fruit sell price at normal quality. */
  sellPrice: number;
  energy: number;
}

export const FRUIT_TREES = treeData as FruitTreeDef[];

export const fruitTreeById = (id: string | undefined) =>
  FRUIT_TREES.find((t) => t.id === id);

/** A sapling item id, such as `apricot-sapling`. */
export const saplingId = (treeId: string) => `${treeId}-sapling`;

/** The fruit tree a sapling item plants, if any. */
export function treeOfSapling(id: string): FruitTreeDef | undefined {
  return id.endsWith("-sapling")
    ? fruitTreeById(id.slice(0, -"-sapling".length))
    : undefined;
}

/** Days a sapling takes to mature, and days per growth stage. */
export const STAGE_DAYS = 7;
export const MATURE_DAYS = 28;
/** Fruit a tree holds until picked. */
export const MAX_FRUIT = 3;
/** Days in a calendar year, so quality follows the calendar as seasons are added. */
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS.length;

export interface PlacedFruitTree {
  x: number;
  y: number;
  id: string;
  /** Days grown, counted while the ground around it was clear, then every day. */
  age: number;
  /** Fruit waiting on the tree. */
  fruit: number;
  /** Axe swings taken in the current chop. Reset overnight. */
  hits: number;
}

/** Growth stage 0 to 3 while growing, 4 when mature. */
export const stageOf = (age: number) =>
  Math.min(Math.floor(age / STAGE_DAYS), MATURE_DAYS / STAGE_DAYS);

export const isMature = (t: Pick<PlacedFruitTree, "age">) =>
  t.age >= MATURE_DAYS;

/** Fruit grade by tree age: silver after a year of maturity, gold after two. */
export function fruitQuality(age: number): Quality {
  const years = Math.floor((age - MATURE_DAYS) / DAYS_PER_YEAR);
  return years >= 2 ? "gold" : years >= 1 ? "silver" : "normal";
}

/** The item id of a tree's fruit at a given tree age. */
export const fruitItem = (treeId: string, age: number) =>
  withQuality(treeId, fruitQuality(age));

const key = (x: number, y: number) => `${x},${y}`;

/** The fruit trees on the farm. */
export class FruitTrees {
  private trees = new Map<string, PlacedFruitTree>();

  save(): PlacedFruitTree[] {
    return [...this.trees.values()].map((t) => ({ ...t }));
  }

  load(saved: PlacedFruitTree[]): void {
    this.trees = new Map(saved.map((t) => [key(t.x, t.y), { ...t }]));
  }

  at(x: number, y: number): PlacedFruitTree | undefined {
    return this.trees.get(key(x, y));
  }

  *each(): Generator<PlacedFruitTree> {
    yield* this.trees.values();
  }

  get count(): number {
    return this.trees.size;
  }

  /** True if any fruit tree stands in the 3x3 around a tile, the tile included. */
  near(x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (this.at(x + dx, y + dy)) return true;
    return false;
  }

  /** Plant a sapling. False if the tile is taken or the id is unknown. */
  add(x: number, y: number, id: string, age = 0): boolean {
    if (!fruitTreeById(id) || this.at(x, y)) return false;
    this.trees.set(key(x, y), { x, y, id, age, fruit: 0, hits: 0 });
    return true;
  }

  remove(x: number, y: number): void {
    this.trees.delete(key(x, y));
  }

  /**
   * Overnight, in the season the new day is in. A young tree grows a day if
   * `clear` says its 3x3 is clear, and is returned as stuck if not. A mature
   * tree ages every day and bears a fruit in its season, up to the limit; with
   * `anySeason` (the greenhouse) it bears every day. Returns the trees that
   * could not grow.
   */
  endDay(
    season: string,
    clear: (x: number, y: number) => boolean,
    anySeason = false,
  ): PlacedFruitTree[] {
    const stuck: PlacedFruitTree[] = [];
    for (const t of this.trees.values()) {
      t.hits = 0;
      if (isMature(t)) {
        t.age += 1;
        if (
          (anySeason || fruitTreeById(t.id)?.season === season) &&
          t.fruit < MAX_FRUIT
        )
          t.fruit += 1;
      } else if (clear(t.x, t.y)) t.age += 1;
      else stuck.push(t);
    }
    return stuck;
  }

  /** What a tree holds: the item id and how many, or undefined if bare. */
  ripe(x: number, y: number): { item: string; count: number } | undefined {
    const t = this.at(x, y);
    if (!t || t.fruit < 1) return undefined;
    return { item: fruitItem(t.id, t.age), count: t.fruit };
  }
}
