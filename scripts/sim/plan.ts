// Pure decision helpers for the sim bot (note 98): what to fish for and where,
// how a fight goes for a player of a given skill, what to buy for the barn and
// the coop, and which crop pays best. No game state is changed here, so they
// are unit tested (`tests/simplan.test.ts`).
import { categoryOf } from "../../src/core/artisan";
import {
  Fight,
  fishAvailable,
  fishWeight,
  timeSlot,
  type Conditions,
  type FightSetup,
  type Water,
} from "../../src/core/fishing";
import { NIGHTFALL } from "../../src/core/clock";
import type { Season } from "../../src/core/calendar";
import { CROPS } from "../../src/core/crops";
import { itemById, seedId } from "../../src/core/items";
import { QUALITIES, splitQuality, type Quality } from "../../src/core/quality";
import type { Species } from "../../src/core/animals";

/** One good the hall still takes: a slot, how good it must be, and the goods that fill it. */
export interface Want {
  bundle: string;
  item: string;
  room: string;
  min: Quality;
  /** Goods (or artisan categories) that also fill the slot. */
  anyOf?: string[];
}

/** True when a stack (quality removed or not) fills the slot a want names. */
export function fillsWant(w: Want, stackId: string): boolean {
  const { base, quality } = splitQuality(stackId);
  if (QUALITIES.indexOf(quality) < QUALITIES.indexOf(w.min)) return false;
  const category = categoryOf(base);
  return (
    base === w.item ||
    category === w.item ||
    !!w.anyOf?.includes(base) ||
    (!!category && !!w.anyOf?.includes(category))
  );
}

/** Wants in the order a hand-in should fill them: the pickiest slots first, so a gold fish is not spent on a plain slot. */
export function pickiestFirst(wants: Want[]): Want[] {
  return [...wants].sort(
    (a, b) => QUALITIES.indexOf(b.min) - QUALITIES.indexOf(a.min),
  );
}

// ---- fishing

/** The map to stand on for each water the bot fishes (the cove opens late, so it is left out). */
export const WATER_MAPS: Partial<Record<Water, string>> = {
  "farm-pond": "farm",
  river: "delta",
  "marsh-lake": "delta",
  sea: "delta",
  "forest-lake": "forest",
  "mountain-lake": "mountain",
};

/** Share of casts that give the Pearl Lobster at sea (`pots.json`, `rodLobsterChance`). */
const LOBSTER_CHANCE = 0.03;

/** Chance one cast gives a fish (or the lobster) the bot needs, among what bites. */
export function castHitChance(
  needs: ReadonlySet<string>,
  water: Water,
  c: Conditions,
): number {
  const pool = fishAvailable(water, c);
  const total = pool.reduce((n, f) => n + fishWeight(f, {}), 0);
  if (total === 0) return 0;
  const want = pool
    .filter((f) => needs.has(f.id))
    .reduce((n, f) => n + fishWeight(f, {}), 0);
  let p = want / total;
  if (water === "sea" && needs.has("pearl-lobster"))
    p = p * (1 - LOBSTER_CHANCE) + LOBSTER_CHANCE;
  return p;
}

export interface CastPlan {
  water: Water;
  /** The minute of the day to start casting. */
  at: number;
  chance: number;
}

/**
 * The best water and hour to fish for a set of fish, today. A later hour costs
 * waiting, so it must beat the chance now by a margin per hour.
 */
export function bestCast(
  needs: ReadonlySet<string>,
  season: Season,
  raining: boolean,
  now: number,
  latest: number,
  waters: readonly Water[] = Object.keys(WATER_MAPS) as Water[],
): CastPlan | undefined {
  const fall = NIGHTFALL[season] ?? NIGHTFALL.spring!;
  // The moments the time slot can change, then now.
  const times = [now, 8 * 60, fall - 120, fall].filter(
    (t) => t >= now && t <= latest,
  );
  let best: CastPlan | undefined;
  let bestScore = 0;
  for (const water of waters)
    for (const at of new Set(times)) {
      const chance = castHitChance(needs, water, {
        season,
        minutes: at,
        raining,
      });
      const score = chance - ((at - now) / 60) * 0.01;
      if (chance > 0 && score > bestScore) {
        bestScore = score;
        best = { water, at, chance };
      }
    }
  return best;
}

/** The slot of the day at a minute, for a season (a thin wrapper, so the bot reads in plain words). */
export const slotAt = timeSlot;

/** How a player plays the bar: seconds of delay before the bar answers, and how often it fumbles. */
export interface Hands {
  reaction: number;
  fumble: number;
}

/**
 * Play one fight to its end with a simple hold-and-release rule that aims the
 * bar at where the fish was `reaction` seconds ago, and sometimes lets go for
 * a moment (`fumble`). Returns whether the fish was landed and whether the
 * fight stayed perfect.
 */
export function playFight(
  setup: FightSetup,
  hands: Hands,
  random: () => number,
): { landed: boolean; perfect: boolean; seconds: number } {
  const fight = new Fight(setup, random);
  const dt = 0.02;
  const lag = Math.max(1, Math.round(hands.reaction / dt));
  const seen: number[] = [];
  let slip = 0;
  let t = 0;
  while (fight.state === "playing" && t < 120) {
    seen.push(fight.fishPos);
    const eye = seen[Math.max(0, seen.length - 1 - lag)] as number;
    // Aim the bar's middle at the fish, and damp the speed so it does not overshoot.
    const mid = fight.barPos + setup.width / 2;
    if (slip <= 0 && random() < hands.fumble * dt) slip = 0.5;
    const want = (eye - mid) * 6 - fight.barVel * 1.4;
    fight.step(dt, slip <= 0 && want > 0, random);
    slip -= dt;
    t += dt;
  }
  return {
    landed: fight.state === "caught",
    perfect: fight.state === "caught" && fight.perfect,
    seconds: t,
  };
}
// ---- animals

export interface HerdState {
  money: number;
  /** Gold kept back before any purchase. */
  reserve: number;
  coopTier: number;
  barnTier: number;
  /** The carpenter is at work on something. */
  carpenterBusy: boolean;
  counts: Partial<Record<Species, number>>;
  /** Wool still wanted (the Weaver's and the cloth of the Last Seat). */
  woolNeed: number;
  /** Capacity left in the coop and the barn. */
  coopRoom: number;
  barnRoom: number;
  /** A kitchen is wanted (for the dishes of the hall) and not yet built. */
  kitchenWanted: boolean;
}

export type HerdStep =
  | { kind: "build"; building: "coop" | "barn" }
  | { kind: "upgrade"; building: "coop" | "barn" }
  | { kind: "kitchen" }
  | { kind: "buy"; species: Species };

/** Prices the plan reads. They match `animals.ts`; the bot passes the live ones. */
export interface HerdPrices {
  build: Record<"coop" | "barn", number>;
  upgrade: Record<"coop" | "barn", Record<number, number>>;
  animal: Record<Species, number>;
  kitchen: number;
}

/** The rabbits that clear the wool in about a month: one wool each four days. */
export function rabbitTarget(woolNeed: number): number {
  if (woolNeed <= 0) return 0;
  return Math.min(4, 1 + Math.floor(woolNeed / 8));
}

/**
 * The ladder of purchases for the animal bundles and the Last Seat's cloth: a
 * coop with two hens, a barn with a cow, the kitchen, the big coop for a duck,
 * then the deluxe coop for rabbits. Cheapest step first; each is priced.
 */
function herdLadder(
  s: HerdState,
  p: HerdPrices,
): (HerdStep & { price: number })[] {
  const have = (sp: Species) => s.counts[sp] ?? 0;
  const ladder: (HerdStep & { price: number })[] = [];
  const coopTier = s.coopTier;
  if (coopTier === 0)
    ladder.push({ kind: "build", building: "coop", price: p.build.coop });
  else if (have("chicken") < 2 && s.coopRoom > 0)
    ladder.push({ kind: "buy", species: "chicken", price: p.animal.chicken });
  if (s.barnTier === 0)
    ladder.push({ kind: "build", building: "barn", price: p.build.barn });
  else if (have("cow") < 1 && s.barnRoom > 0)
    ladder.push({ kind: "buy", species: "cow", price: p.animal.cow });
  if (s.kitchenWanted) ladder.push({ kind: "kitchen", price: p.kitchen });
  if (coopTier >= 1 && coopTier < 2)
    ladder.push({
      kind: "upgrade",
      building: "coop",
      price: p.upgrade.coop[2] as number,
    });
  else if (coopTier >= 2 && have("duck") < 1 && s.coopRoom > 0)
    ladder.push({ kind: "buy", species: "duck", price: p.animal.duck });
  if (coopTier === 2 && have("duck") >= 1)
    ladder.push({
      kind: "upgrade",
      building: "coop",
      price: p.upgrade.coop[3] as number,
    });
  if (
    coopTier >= 3 &&
    have("rabbit") < rabbitTarget(s.woolNeed) &&
    s.coopRoom > 0
  )
    ladder.push({ kind: "buy", species: "rabbit", price: p.animal.rabbit });
  return ladder;
}

const bare = (step: HerdStep & { price: number }): HerdStep => {
  const { price, ...rest } = step;
  void price;
  return rest as HerdStep;
};

/** The step the bot is working towards, whether or not it can pay for it yet. */
export function plannedHerdStep(
  s: HerdState,
  p: HerdPrices,
): HerdStep | undefined {
  const first = herdLadder(s, p)[0];
  return first && bare(first);
}

/**
 * What the bot buys now: the first step of the ladder if the purse covers it
 * and a reserve. It saves for that step rather than skip to a dearer one.
 */
export function nextHerdStep(
  s: HerdState,
  p: HerdPrices,
): HerdStep | undefined {
  const first = herdLadder(s, p)[0];
  if (!first || s.money < first.price + s.reserve) return undefined;
  if (first.kind !== "buy" && s.carpenterBusy) return undefined;
  return bare(first);
}

// ---- crops

/** The crop that pays most a day among those that finish in a season, for spare soil. */
export function cashCropFor(
  season: Season,
  daysLeft: number,
  seedStocked: (seed: string) => boolean,
): string | undefined {
  let best: { id: string; rate: number } | undefined;
  for (const c of CROPS) {
    if (!c.seasons.includes(season) || c.growDays > daysLeft) continue;
    if (!seedStocked(seedId(c.id))) continue;
    const price = itemById(c.id)?.sellPrice ?? 0;
    const cost = itemById(seedId(c.id))?.buyPrice ?? 0;
    const rate = (price - cost) / c.growDays;
    if (price > 0 && (!best || rate > best.rate)) best = { id: c.id, rate };
  }
  return best?.id;
}

/** A crop of a list that grows in a season and has time to finish, preferring the earliest in the list. */
export function cropFromList(
  list: readonly string[],
  season: Season,
  daysLeft: number,
): string | undefined {
  return list.find((id) => {
    const def = CROPS.find((c) => c.id === id);
    return !!def && def.seasons.includes(season) && def.growDays <= daysLeft;
  });
}
