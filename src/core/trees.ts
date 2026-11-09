import type { Season } from "./calendar";
import type { TreeKind } from "./map";

/**
 * Common trees on the farm (`docs/design/36_gathering_trees_sap_fiber.md` and
 * `43_wood_source.md`). Pure rules: this file knows nothing of Phaser. Stage 1
 * is a seed in the ground, 2 and 3 are seedlings, 4 is a young tree and 5 is
 * mature.
 */
export const SEED_STAGE = 1;
export const YOUNG_STAGE = 4;
export const MATURE_STAGE = 5;

/** The seed item a mature tree drops and the player plants. */
export const TREE_SEED = "tree-seed";

/** Chance a night that a seed or seedling reaches the next stage. As Stardew. */
export const STAGE_CHANCE = 0.2;
/** Stage 4 takes twice as long. As Stardew. */
export const YOUNG_CHANCE = 0.1;
/** Chance a night that a mature tree holds a loose seed to shake down. */
export const LOOSE_SEED_CHANCE = 0.05;
/** Chance a night that a mature tree grows moss, outside winter. Ours (note 34). */
export const MOSS_CHANCE = 0.07;
/** Moss from one tree: 1 to 2. As Stardew's Trees page. */
export const MOSS_MIN = 1;
export const MOSS_MAX = 2;
/** Chance a night that a mature tree plants a seed nearby. */
export const SPREAD_CHANCE = 0.15;
/** How far a spread seed can land, in tiles on each axis. */
export const SPREAD_RANGE = 3;
/** Seasons when trees do not grow. The first playable has none. */
const NO_GROWTH: readonly string[] = ["winter"];

/** Swings to fell a mature tree at an axe tier: 10, 8, 6, 4, 2. As Stardew's Axe page. */
export const swingsToFell = (tier: number) => Math.max(10 - 2 * tier, 2);
/** Swings to remove a stump at an axe tier: 5, 4, 3, 2, 1. As Stardew's Axe page. */
export const swingsToUproot = (tier: number) => Math.max(5 - tier, 1);

export interface Tree {
  x: number;
  y: number;
  stage: number;
  /** A mature tree that was chopped. It stays until the axe removes it. */
  stump: boolean;
  /** Swings taken in the current chop. Reset overnight. */
  hits: number;
  /** A mature tree holding a loose seed that shaking drops. */
  seed: boolean;
  /** A mature tree with moss on it. Any tool or the hand gathers it. Absent in old saves. */
  moss?: boolean;
  /**
   * A large stump from the map. It is a stump from the start, and once chopped
   * it regrows (`docs/design/32_farm_types.md`, Woodland).
   */
  large?: boolean;
  /** The kind of tree, from the map (note 71). Absent means oak. */
  kind?: TreeKind;
  /** Days until a chopped large stump is whole again. Absent while it stands. */
  regrow?: number;
}

const key = (x: number, y: number) => `${x},${y}`;

/** The farm's trees and stumps. */
export class Trees {
  private trees = new Map<string, Tree>();

  constructor(
    initial: {
      x: number;
      y: number;
      stage: number;
      large?: boolean;
      kind?: TreeKind;
    }[] = [],
  ) {
    for (const t of initial) {
      this.add(t.x, t.y, t.stage);
      if (t.kind) {
        const added = this.at(t.x, t.y);
        if (added) added.kind = t.kind;
      }
      if (t.large) {
        const added = this.at(t.x, t.y);
        if (added) {
          added.large = true;
          added.stump = true;
        }
      }
    }
  }

  save(): Tree[] {
    return [...this.trees.values()].map((t) => ({ ...t }));
  }

  load(saved: Tree[]): void {
    this.trees = new Map(saved.map((t) => [key(t.x, t.y), { ...t }]));
  }

  at(x: number, y: number): Tree | undefined {
    return this.trees.get(key(x, y));
  }

  *each(): Generator<Tree> {
    yield* this.trees.values();
  }

  get count(): number {
    return this.trees.size;
  }

  /** A seed lies flat in the soil. Anything bigger, and every stump, blocks. */
  blocks(x: number, y: number): boolean {
    const t = this.at(x, y);
    return (
      t !== undefined &&
      t.regrow === undefined &&
      (t.stump || t.stage > SEED_STAGE)
    );
  }

  /** Plant a tree at a stage. Returns false if the tile already holds one. */
  add(x: number, y: number, stage = SEED_STAGE): boolean {
    if (this.at(x, y)) return false;
    this.trees.set(key(x, y), {
      x,
      y,
      stage,
      stump: false,
      hits: 0,
      seed: false,
    });
    return true;
  }

  remove(x: number, y: number): void {
    this.trees.delete(key(x, y));
  }

  private matureNeighbour(t: Tree): boolean {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const n = this.at(t.x + dx, t.y + dy);
        if (n && n !== t && !n.stump && n.stage === MATURE_STAGE) return true;
      }
    return false;
  }

  /**
   * Overnight: seeds and seedlings may grow a stage (not in winter), mature
   * trees may hold a loose seed, and some plant a seed within 3 tiles when
   * `canPlant` allows that tile. A seed planted tonight does not grow tonight.
   */
  endDay(
    season: Season,
    random: () => number,
    canPlant: (x: number, y: number) => boolean,
  ): void {
    const grows = !NO_GROWTH.includes(season);
    const list = [...this.trees.values()];
    const spreaders = list.filter(
      (t) => !t.stump && !t.large && t.stage === MATURE_STAGE,
    );
    for (const t of list) {
      t.hits = 0;
      if (t.large) {
        // A chopped large stump counts down and is whole again at 0.
        if (t.regrow !== undefined && --t.regrow <= 0) delete t.regrow;
        continue;
      }
      if (t.stump) continue;
      if (t.stage < MATURE_STAGE) {
        const chance = t.stage === YOUNG_STAGE ? YOUNG_CHANCE : STAGE_CHANCE;
        if (grows && random() < chance) {
          if (t.stage < YOUNG_STAGE || !this.matureNeighbour(t)) t.stage += 1;
        }
      } else {
        if (!t.seed && random() < LOOSE_SEED_CHANCE) t.seed = true;
        // Moss grows in the warm seasons and is gone by winter.
        if (!grows) delete t.moss;
        else if (!t.moss && random() < MOSS_CHANCE) t.moss = true;
      }
    }
    for (const t of spreaders) {
      if (random() >= SPREAD_CHANCE) continue;
      const span = 2 * SPREAD_RANGE + 1;
      const x = t.x + Math.floor(random() * span) - SPREAD_RANGE;
      const y = t.y + Math.floor(random() * span) - SPREAD_RANGE;
      if (!this.at(x, y) && canPlant(x, y)) this.add(x, y, SEED_STAGE);
    }
  }
}
