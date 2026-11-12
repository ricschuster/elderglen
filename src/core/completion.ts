import completionData from "../content/completion.json";
import { CROPS } from "./crops";
import { FORAGE } from "./forage";
import { BUNDLES } from "./bundles";
import { RECIPES, buildable } from "./crafting";
import { cookable } from "./cooking";
import { DISHES } from "./dishes";
import { FISH } from "./fishing";
import { SHELLFISH } from "./pots";
import { itemById } from "./items";
import { ELDERFRUIT_TOTAL } from "./elderfruit";
import { shippedOf } from "./achievements";
import { MAX_LEVEL, SKILLS } from "./skills";
import { SLAYER_GOALS, slayerKills } from "./creatures";
import type { GameState } from "./save";

/**
 * The completion total (`docs/design/39_completion_total.md`). Each ring has
 * categories with fixed weights that add to 100. A category adds its weight
 * times its progress, partial progress counts, and the total is rounded down
 * so 100 shows only at true completion. The valley total is the plain mean of
 * the rings that exist. A category whose system is not built has no counter:
 * it is locked and counts as zero. Content is `src/content/completion.json`.
 * Pure rules.
 */
export interface CategoryDef {
  id: string;
  name: string;
  weight: number;
  /** Key into `COUNTERS`, or null while the category's system is unbuilt. */
  counter: string | null;
}

export interface RingDef {
  id: string;
  name: string;
  categories: CategoryDef[];
}

export const RINGS = completionData.rings as RingDef[];

/** What a counter reads: how many of how many, and what is still missing. */
export interface Count {
  done: number;
  total: number;
  missing: string[];
}

export type Counter = (g: GameState) => Count;

const nameOf = (id: string) => itemById(id)?.name ?? id;

/** Crops and forage, the produce and forage that Stardew's tracker counts. */
export const SHIPPABLE = [
  ...CROPS.map((c) => c.id),
  ...FORAGE.map((f) => f.id),
];

export const COUNTERS: Record<string, Counter> = {
  shipped: (g) => {
    const missing = SHIPPABLE.filter((id) => shippedOf(g, id) === 0);
    return {
      done: SHIPPABLE.length - missing.length,
      total: SHIPPABLE.length,
      missing: missing.map(nameOf),
    };
  },
  bundles: (g) => {
    const missing = BUNDLES.filter((b) => !g.hall.complete(b.id));
    return {
      done: BUNDLES.length - missing.length,
      total: BUNDLES.length,
      missing: missing.map((b) => b.name),
    };
  },
  skills: (g) => {
    const missing = SKILLS.filter((s) => g.skills.level(s) < MAX_LEVEL);
    const levels = SKILLS.reduce(
      (n, s) => n + Math.min(g.skills.level(s), MAX_LEVEL),
      0,
    );
    return {
      done: levels,
      total: SKILLS.length * MAX_LEVEL,
      missing: missing.map((s) => `${s} level ${MAX_LEVEL}`),
    };
  },
  slayer: (g) => {
    const missing = SLAYER_GOALS.filter(
      (s) => slayerKills(s, g.combat.kills) < s.goal,
    );
    return {
      done: SLAYER_GOALS.length - missing.length,
      total: SLAYER_GOALS.length,
      missing: missing.map(
        (s) => `${s.name} (${slayerKills(s, g.combat.kills)} of ${s.goal})`,
      ),
    };
  },
  crafting: (g) => {
    const all = RECIPES.filter(buildable);
    const missing = all.filter((r) => !g.achievements.hasCrafted(r.id));
    return {
      done: all.length - missing.length,
      total: all.length,
      missing: missing.map((r) => nameOf(r.result.item)),
    };
  },
  fish: (g) => {
    // Pot catches count as fish do (note 21, shellfish pots).
    const missing = [
      ...FISH.filter((f) => !g.fishing.has(f.id)),
      ...SHELLFISH.filter((s) => !g.pots.has(s.id)),
    ];
    const total = FISH.length + SHELLFISH.length;
    return {
      done: total - missing.length,
      total,
      missing: missing.map((f) => f.name),
    };
  },
  elderfruit: (g) => ({
    done: Math.min(g.elderfruit, ELDERFRUIT_TOTAL),
    total: ELDERFRUIT_TOTAL,
    missing:
      g.elderfruit >= ELDERFRUIT_TOTAL
        ? []
        : [`${ELDERFRUIT_TOTAL - g.elderfruit} elderfruit left to eat`],
  }),
  cooking: (g) => {
    const all = DISHES.filter(cookable);
    const missing = all.filter((d) => !g.achievements.hasCooked(d.id));
    return {
      done: all.length - missing.length,
      total: all.length,
      missing: missing.map((d) => d.name),
    };
  },
};

export interface CategoryProgress {
  id: string;
  name: string;
  weight: number;
  done: number;
  total: number;
  /** 0 to 1. Zero while locked. */
  progress: number;
  /** The category's system is unbuilt, or it has nothing to count yet. */
  locked: boolean;
  /** Points this category adds to the ring's total, before rounding. */
  points: number;
  missing: string[];
}

export interface RingProgress {
  id: string;
  name: string;
  categories: CategoryProgress[];
  /** The exact sum, for tests and the bar. */
  exact: number;
  /** The shown percent, rounded down. */
  percent: number;
}

/** Round down, with a little slack so float error never costs a whole point. */
export function shownPercent(exact: number): number {
  return Math.min(100, Math.floor(exact + 1e-9));
}

/** Sum categories into a ring total. */
export function sumRing(
  ring: RingDef,
  read: (c: CategoryDef) => Count | undefined,
): RingProgress {
  const categories = ring.categories.map((c): CategoryProgress => {
    const count = read(c);
    const locked = !count || count.total <= 0;
    const progress = locked ? 0 : Math.min(count.done / count.total, 1);
    return {
      id: c.id,
      name: c.name,
      weight: c.weight,
      done: count?.done ?? 0,
      total: count?.total ?? 0,
      progress,
      locked,
      points: c.weight * progress,
      missing: count?.missing ?? [],
    };
  });
  const exact = categories.reduce((n, c) => n + c.points, 0);
  return {
    id: ring.id,
    name: ring.name,
    categories,
    exact,
    percent: shownPercent(exact),
  };
}

/** Read every ring from the game. */
export function ringProgress(g: GameState): RingProgress[] {
  return RINGS.map((r) =>
    sumRing(r, (c) => (c.counter ? COUNTERS[c.counter]?.(g) : undefined)),
  );
}

/** The valley total: the plain mean of the rings that exist, rounded down. */
export function valleyPercent(rings: readonly { exact: number }[]): number {
  if (rings.length === 0) return 0;
  return shownPercent(rings.reduce((n, r) => n + r.exact, 0) / rings.length);
}
