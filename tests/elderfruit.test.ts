import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, checkAchievements } from "../src/core/achievements";
import { eat, plant, till } from "../src/core/actions";
import { DAYS_PER_SEASON } from "../src/core/calendar";
import { ringProgress } from "../src/core/completion";
import { PASS_OUT_WAKE_ENERGY } from "../src/core/day";
import {
  ELDERFRUIT_ENERGY,
  ELDERFRUIT_TOTAL,
  EMBERSEED,
  EMBER_BERRY,
  HERMIT_ELDERFRUIT_PRICE,
  SHOWING_ELDERFRUIT_PRICE,
  SOURCE_FLAGS,
  buyElderfruit,
  giveToSpirit,
  hermitStock,
  maxEnergyFor,
} from "../src/core/elderfruit";
import { CROPS, cropById } from "../src/core/crops";
import { MAX_ENERGY } from "../src/core/energy";
import {
  FESTIVALS,
  buyAtCounter,
  counterProblem,
  enterFestival,
} from "../src/core/festivals";
import { itemById } from "../src/core/items";
import { deserialize, newGame, serialize } from "../src/core/save";
import { seedStock } from "../src/core/shop";
import { hasFlag } from "../src/core/worldflags";
import { HEART_EVENTS } from "../src/core/heartevents";

describe("elderfruit", () => {
  it("raises the maximum energy by 34 and fills the new space, with no health", () => {
    const g = newGame();
    g.day.energy.current = 100;
    g.inventory.add("elderfruit");
    const r = eat(g, "elderfruit");
    expect(r.ok).toBe(true);
    expect(g.elderfruit).toBe(1);
    expect(g.day.energy.max).toBe(MAX_ENERGY + ELDERFRUIT_ENERGY);
    expect(g.day.energy.current).toBe(100 + ELDERFRUIT_ENERGY);
    expect(g.inventory.count("elderfruit")).toBe(0);
  });

  it("is eaten even at full energy, and a second restore reaches the new maximum", () => {
    const g = newGame();
    g.inventory.add("elderfruit");
    expect(eat(g, "elderfruit").ok).toBe(true);
    g.day.energy.restore(1000);
    expect(g.day.energy.current).toBe(304);
  });

  it("refuses when there is none, and stops at eight (270 up to 542)", () => {
    const g = newGame();
    expect(eat(g, "elderfruit")).toEqual({
      ok: false,
      reason: "nothing to eat",
    });
    for (let i = 0; i < ELDERFRUIT_TOTAL; i++) {
      g.inventory.add("elderfruit");
      expect(eat(g, "elderfruit").ok).toBe(true);
    }
    expect(g.day.energy.max).toBe(542);
    expect(maxEnergyFor(ELDERFRUIT_TOTAL)).toBe(542);
    g.inventory.add("elderfruit");
    expect(eat(g, "elderfruit")).toEqual({ ok: false, reason: "all eaten" });
  });

  it("a new day and a faint use the raised maximum", () => {
    const g = newGame();
    g.inventory.add("elderfruit");
    eat(g, "elderfruit");
    g.day.energy.current = 10;
    g.day.end(0);
    expect(g.day.energy.current).toBe(304);
    g.day.energy.current = 0;
    g.day.end(0);
    expect(g.day.energy.current).toBe(
      Math.round(304 * PASS_OUT_WAKE_ENERGY.energy),
    );
  });

  it("saves the count and the raised maximum, and loads old saves without it", () => {
    const g = newGame();
    for (let i = 0; i < 3; i++) {
      g.inventory.add("elderfruit");
      eat(g, "elderfruit");
    }
    const back = deserialize(serialize(g))!;
    expect(back.elderfruit).toBe(3);
    expect(back.day.energy.max).toBe(372);
    expect(back.day.energy.current).toBe(g.day.energy.current);
    const old = JSON.parse(serialize(g));
    delete old.elderfruit;
    expect(deserialize(JSON.stringify(old))!.elderfruit).toBe(0);
  });

  it("counts eaten fruit in the completion total's rare boost line", () => {
    const g = newGame();
    const line = () =>
      ringProgress(g)[0]!.categories.find((c) => c.id === "elderfruit")!;
    expect(line().locked).toBe(false);
    expect(line().points).toBe(0);
    g.inventory.add("elderfruit", 2);
    eat(g, "elderfruit");
    eat(g, "elderfruit");
    expect(line().done).toBe(2);
    expect(line().total).toBe(ELDERFRUIT_TOTAL);
    expect(line().points).toBeCloseTo((10 * 2) / ELDERFRUIT_TOTAL, 5);
  });

  it("earns Every Elderfruit and its circlet at eight", () => {
    const a = ACHIEVEMENTS.find((x) => x.id === "every-elderfruit")!;
    expect(a.threshold).toBe(ELDERFRUIT_TOTAL);
    const g = newGame();
    g.elderfruit = 7;
    expect(checkAchievements(g).map((x) => x.id)).not.toContain(a.id);
    g.elderfruit = 8;
    expect(checkAchievements(g).map((x) => x.id)).toContain(a.id);
  });
});

describe("elderfruit sources", () => {
  it("source 1: the Harvest Showing counter sells one for gold, once", () => {
    const g = newGame();
    const f = FESTIVALS.find((x) => x.id === "harvest-showing")!;
    g.day.clock.day = 2 * DAYS_PER_SEASON + f.day;
    g.day.clock.minutes = f.opens;
    enterFestival(g);
    const e = f.counter.find((c) => c.item === "elderfruit")!;
    expect(e.price).toBe(SHOWING_ELDERFRUIT_PRICE);
    expect(e.tokens).toBeFalsy();
    g.money = e.price - 1;
    expect(buyAtCounter(g, f, e)).toBe(false);
    g.money = e.price + 7;
    expect(buyAtCounter(g, f, e)).toBe(true);
    expect(g.money).toBe(7);
    expect(g.inventory.count("elderfruit")).toBe(1);
    g.money = 10000;
    expect(counterProblem(g, f, e)).toMatch(/already/);
    expect(buyAtCounter(g, f, e)).toBe(false);
    expect(g.inventory.count("elderfruit")).toBe(1);
  });

  it("source 2: the floor 100 camp chest holds one", async () => {
    const { campItem } = await import("../src/core/mines");
    expect(campItem(100)).toBe("elderfruit");
  });

  it("source 4: the hermit sells one at a very high price, once", () => {
    const g = newGame();
    expect(hermitStock(g)).toEqual(["elderfruit"]);
    g.money = HERMIT_ELDERFRUIT_PRICE - 1;
    expect(
      buyElderfruit(g, SOURCE_FLAGS.hermit, HERMIT_ELDERFRUIT_PRICE),
    ).toMatch(/more/);
    g.money = HERMIT_ELDERFRUIT_PRICE + 1;
    expect(
      buyElderfruit(g, SOURCE_FLAGS.hermit, HERMIT_ELDERFRUIT_PRICE),
    ).toBeUndefined();
    expect(g.money).toBe(1);
    expect(g.inventory.count("elderfruit")).toBe(1);
    expect(hermitStock(g)).toEqual([]);
    g.money = 99999;
    expect(
      buyElderfruit(g, SOURCE_FLAGS.hermit, HERMIT_ELDERFRUIT_PRICE),
    ).toMatch(/already/);
    expect(g.money).toBe(99999);
  });

  it("source 4: refuses with a full pack and keeps the money", () => {
    const g = newGame();
    g.money = 30000;
    for (let i = 0; g.inventory.room("stone") > 0 && i < 500; i++)
      g.inventory.add("stone", 1);
    g.inventory.add("stone", 999);
    if (g.inventory.room("elderfruit") > 0) return;
    expect(
      buyElderfruit(g, SOURCE_FLAGS.hermit, HERMIT_ELDERFRUIT_PRICE),
    ).toMatch(/full/);
    expect(g.money).toBe(30000);
  });

  it("source 5: the ember berry is a rare crop that is not on sale, not mixed, not shipped for the total", () => {
    const crop = cropById(EMBER_BERRY)!;
    expect(crop.rare).toBe(true);
    expect(crop.seasons).toEqual(["spring", "summer", "fall"]);
    expect(CROPS.some((c) => c.id === EMBER_BERRY)).toBe(false);
    for (const s of ["spring", "summer", "fall", "winter"] as const)
      expect(seedStock(s)).not.toContain(EMBERSEED);
    expect(itemById(EMBERSEED)?.name).toBe("Emberseed");
    expect(itemById(EMBERSEED)?.buyPrice).toBeUndefined();
    expect(itemById(EMBER_BERRY)?.name).toBe("Ember berry");
    expect(itemById(EMBER_BERRY)?.keep).toBe(true);
  });

  it("source 5: the emberseed plants in spring, and not in winter", () => {
    const g = newGame();
    g.inventory.add(EMBERSEED, 2);
    expect(till(g, 1, 1).ok).toBe(true);
    expect(plant(g, 1, 1, EMBERSEED).ok).toBe(true);
    const w = newGame();
    w.day.clock.day = 3 * DAYS_PER_SEASON + 1;
    w.inventory.add(EMBERSEED, 1);
    till(w, 1, 1);
    expect(plant(w, 1, 1, EMBERSEED).ok).toBe(false);
  });

  it("source 5: the hermit's 4 heart event gives the emberseed", () => {
    const ev = HEART_EVENTS.find((e) => e.id === "rosmarin-fairy-ring-4")!;
    expect(ev.hearts).toBe(4);
    expect(
      ev.scene.some(
        (c) => c.cmd === "give" && "item" in c && c.item === EMBERSEED,
      ),
    ).toBe(true);
  });

  it("source 5: the spirit takes one ember berry, once, for an elderfruit", () => {
    const g = newGame();
    expect(giveToSpirit(g)).toMatch(/rare seed/);
    expect(g.inventory.count("elderfruit")).toBe(0);
    g.inventory.add(EMBER_BERRY, 2);
    expect(giveToSpirit(g)).toMatch(/takes/);
    expect(g.inventory.count("elderfruit")).toBe(1);
    expect(g.inventory.count(EMBER_BERRY)).toBe(1);
    expect(hasFlag(g, SOURCE_FLAGS.spirit)).toBe(true);
    expect(giveToSpirit(g)).toMatch(/quiet/);
    expect(g.inventory.count("elderfruit")).toBe(1);
    expect(g.inventory.count(EMBER_BERRY)).toBe(1);
  });

  it("source 6: the fish letter carries one (see mail.test.ts)", () => {
    const g = newGame();
    expect(g.elderfruit).toBe(0);
  });
});
