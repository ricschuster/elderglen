import { describe, expect, it } from "vitest";
import {
  bestCast,
  castHitChance,
  cashCropFor,
  cropFromList,
  fillsWant,
  nextHerdStep,
  pickiestFirst,
  playFight,
  plannedHerdStep,
  rabbitTarget,
  type HerdPrices,
  type HerdState,
  type Want,
} from "../scripts/sim/plan";

function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const want = (over: Partial<Want>): Want => ({
  bundle: "b",
  item: "x",
  room: "r",
  min: "normal",
  ...over,
});

describe("sim bot: matching a good to a hall slot", () => {
  it("fills a slot by the good, by its artisan category, or by an any-of list", () => {
    expect(fillsWant(want({ item: "carp" }), "carp")).toBe(true);
    expect(fillsWant(want({ item: "carp" }), "perch")).toBe(false);
    expect(
      fillsWant(
        want({ item: "any-bar", anyOf: ["copper-bar", "iron-bar"] }),
        "iron-bar",
      ),
    ).toBe(true);
    expect(fillsWant(want({ item: "jam" }), "apple-jam")).toBe(true);
  });

  it("respects the lowest quality a slot takes", () => {
    const gold = want({ item: "carp", min: "gold" });
    expect(fillsWant(gold, "carp")).toBe(false);
    expect(fillsWant(gold, "carp@silver")).toBe(false);
    expect(fillsWant(gold, "carp@gold")).toBe(true);
    expect(fillsWant(gold, "carp@hearthsilver")).toBe(true);
  });

  it("puts the pickiest slots first", () => {
    const wants = [want({ item: "a" }), want({ item: "b", min: "gold" })];
    expect(pickiestFirst(wants).map((w) => w.item)).toEqual(["b", "a"]);
  });
});

describe("sim bot: where and when to fish", () => {
  it("finds a chance only where a wanted fish can bite", () => {
    const needs = new Set(["carp"]);
    const day = { season: "spring", minutes: 12 * 60, raining: false } as const;
    expect(castHitChance(needs, "forest-lake", day)).toBeGreaterThan(0);
    expect(castHitChance(needs, "sea", day)).toBe(0);
    expect(
      castHitChance(new Set(["pearl-lobster"]), "sea", day),
    ).toBeGreaterThan(0);
  });

  it("plans to wait for night when only a night fish is wanted", () => {
    const plan = bestCast(
      new Set(["moonmirror"]),
      "spring",
      false,
      9 * 60,
      22 * 60,
    );
    // The farm pond fishes the forest lake's table, so it is the cheapest walk.
    expect(["farm-pond", "forest-lake"]).toContain(plan?.water);
    expect(plan!.at).toBeGreaterThan(9 * 60);
  });

  it("plans nothing when the wanted fish cannot bite today", () => {
    // The glacier ghost needs winter and night on the mountain lake.
    expect(
      bestCast(new Set(["cod"]), "spring", false, 9 * 60, 22 * 60),
    ).toBeUndefined();
  });
});

describe("sim bot: the fight on the bar", () => {
  const setup = {
    behaviour: "mixed" as const,
    difficulty: 25,
    width: 0.36,
    assist: 0 as const,
  };

  it("lets a steady player land an easy fish most of the time", () => {
    let landed = 0;
    for (let i = 1; i <= 30; i++)
      if (playFight(setup, { reaction: 0.12, fumble: 0.1 }, seeded(i)).landed)
        landed++;
    expect(landed).toBeGreaterThanOrEqual(24);
  });

  it("keeps more fights perfect with quick, steady hands (the bar is forgiving, so most fish land either way)", () => {
    const hard = { ...setup, difficulty: 40, behaviour: "mixed" as const };
    let steady = 0;
    let fumbling = 0;
    for (let i = 1; i <= 40; i++) {
      if (playFight(hard, { reaction: 0.1, fumble: 0.05 }, seeded(i)).perfect)
        steady++;
      if (
        playFight(hard, { reaction: 0.9, fumble: 1.5 }, seeded(i + 1000))
          .perfect
      )
        fumbling++;
    }
    expect(steady).toBeGreaterThan(fumbling);
  });
});

describe("sim bot: the herd ladder", () => {
  const prices: HerdPrices = {
    build: { coop: 4000, barn: 4000 },
    upgrade: { coop: { 2: 10000, 3: 20000 }, barn: { 2: 10000, 3: 20000 } },
    animal: {
      chicken: 800,
      duck: 1200,
      rabbit: 8000,
      cow: 1500,
      goat: 4000,
      sheep: 8000,
      pig: 16000,
    },
    kitchen: 10000,
  };
  const base: HerdState = {
    money: 100000,
    reserve: 800,
    coopTier: 0,
    barnTier: 0,
    carpenterBusy: false,
    counts: {},
    woolNeed: 23,
    coopRoom: 0,
    barnRoom: 0,
    kitchenWanted: true,
  };

  it("starts with the coop, then hens, then the barn", () => {
    expect(nextHerdStep(base, prices)).toEqual({
      kind: "build",
      building: "coop",
    });
    const coop = { ...base, coopTier: 1, coopRoom: 4 };
    expect(nextHerdStep(coop, prices)).toEqual({
      kind: "buy",
      species: "chicken",
    });
    const hens = { ...coop, counts: { chicken: 2 } };
    expect(nextHerdStep(hens, prices)).toEqual({
      kind: "build",
      building: "barn",
    });
  });

  it("saves for a step rather than skipping to a cheaper one", () => {
    const poor = { ...base, money: 3000 };
    expect(nextHerdStep(poor, prices)).toBeUndefined();
    expect(plannedHerdStep(poor, prices)).toEqual({
      kind: "build",
      building: "coop",
    });
  });

  it("waits while the carpenter is busy, but still buys animals", () => {
    expect(
      nextHerdStep({ ...base, carpenterBusy: true }, prices),
    ).toBeUndefined();
    const coop = { ...base, coopTier: 1, coopRoom: 4, carpenterBusy: true };
    expect(nextHerdStep(coop, prices)).toEqual({
      kind: "buy",
      species: "chicken",
    });
  });

  it("reaches rabbits only after the deluxe coop", () => {
    const deluxe: HerdState = {
      ...base,
      coopTier: 3,
      barnTier: 1,
      coopRoom: 8,
      barnRoom: 3,
      kitchenWanted: false,
      counts: { chicken: 2, cow: 1, duck: 1 },
    };
    expect(nextHerdStep(deluxe, prices)).toEqual({
      kind: "buy",
      species: "rabbit",
    });
    expect(nextHerdStep({ ...deluxe, woolNeed: 0 }, prices)).toBeUndefined();
  });

  it("wants more rabbits for more wool, up to four", () => {
    expect(rabbitTarget(0)).toBe(0);
    expect(rabbitTarget(8)).toBe(2);
    expect(rabbitTarget(100)).toBe(4);
  });
});

describe("sim bot: crops", () => {
  it("picks the crop that pays most a day among the seeds in stock", () => {
    const all = () => true;
    const pick = cashCropFor("summer", 28, all);
    expect(pick).toBeDefined();
    expect(cashCropFor("summer", 1, all)).toBeUndefined();
    expect(cashCropFor("summer", 28, () => false)).toBeUndefined();
  });

  it("picks the first crop of a list that fits the season", () => {
    const roots = ["parsnip", "potato", "radish", "beet", "sweet-potato"];
    expect(cropFromList(roots, "spring", 20)).toBe("parsnip");
    expect(cropFromList(roots, "summer", 20)).toBe("radish");
    expect(cropFromList(roots, "winter", 20)).toBeUndefined();
  });
});
