import { describe, expect, it } from "vitest";
import { newGame } from "../src/core/save";
import { itemById } from "../src/core/items";
import {
  TRADER_GOODS,
  buyFromTrader,
  daysToTrader,
  traderHere,
  traderPrice,
  traderProblem,
  traderStock,
} from "../src/core/trader";
import { forecastLine, newsLines, roadNews } from "../src/core/roadnews";
import { mapFiles } from "../src/content/maps";

describe("the road trader", () => {
  it("visits Wednesday and Saturday only", () => {
    // Day 1 is Monday.
    expect([1, 2, 3, 4, 5, 6, 7].filter(traderHere)).toEqual([3, 6]);
    expect(daysToTrader(1)).toBe(2);
    expect(daysToTrader(3)).toBe(0);
    expect(daysToTrader(4)).toBe(2);
  });

  it("never goes more than three days between visits", () => {
    for (let d = 1; d <= 56; d++)
      expect(daysToTrader(d)).toBeLessThanOrEqual(3);
  });

  it("lists only real items", () => {
    for (const id of TRADER_GOODS) expect(itemById(id), id).toBeDefined();
  });

  it("draws 4 to 6 goods, the same on a reload, none when away", () => {
    for (const d of [3, 6, 10, 13, 17, 20, 24, 27, 87]) {
      if (!traderHere(d)) continue;
      const a = traderStock(d);
      expect(a.length).toBeGreaterThanOrEqual(4);
      expect(a.length).toBeLessThanOrEqual(6);
      expect(new Set(a).size).toBe(a.length);
      expect(traderStock(d)).toEqual(a);
    }
    expect(traderStock(1)).toEqual([]);
  });

  it("varies stock between visits", () => {
    const seen = new Set<string>();
    for (let d = 3; d <= 90; d += 7) seen.add(traderStock(d).join());
    expect(seen.size).toBeGreaterThan(3);
  });

  it("prices at 1.5 times sell value, rounded down", () => {
    expect(traderPrice("gold-bar")).toBe(375);
    expect(traderPrice("geode")).toBe(75);
  });

  it("sells for money at the stall in its hours", () => {
    const g = newGame();
    g.day.clock.day = 3;
    g.day.clock.minutes = 10 * 60;
    g.money = 10000;
    const id = traderStock(3)[0]!;
    expect(traderProblem(3, g.day.clock.minutes)).toBe("");
    expect(buyFromTrader(g, id, 2)).toBe(true);
    expect(g.money).toBe(10000 - 2 * traderPrice(id));
    expect(g.inventory.count(id)).toBe(2);
    expect(buyFromTrader(g, "not-on-sale")).toBe(false);
    g.money = 0;
    expect(buyFromTrader(g, id)).toBe(false);
  });

  it("is shut before opening, after closing and on other days", () => {
    expect(traderProblem(3, 8 * 60)).toMatch(/setting out/);
    expect(traderProblem(3, 21 * 60)).toMatch(/packed up/);
    expect(traderProblem(1, 12 * 60)).toMatch(/in 2 days/);
    const g = newGame();
    g.day.clock.day = 1;
    g.money = 10000;
    expect(buyFromTrader(g, TRADER_GOODS[0]!)).toBe(false);
  });

  it("has a stall in the Outpost yard", () => {
    const objs = mapFiles["hearthwell"]!.layers.flatMap((l) => l.objects ?? []);
    expect(objs.some((o) => o.name === "trader-stall")).toBe(true);
  });
});

describe("road news", () => {
  it("gives one or two lines a day, the same on a reload", () => {
    for (let d = 1; d <= 30; d++) {
      const a = newsLines(d);
      expect([1, 2]).toContain(a.length);
      expect(newsLines(d)).toEqual(a);
    }
  });

  it("states the forecast from the stored roll and the trader notice", () => {
    expect(forecastLine(1, "rainy")).toMatch(/rain/);
    expect(forecastLine(9, "sunny")).toMatch(/Tomorrow is the/); // Spring 10 is a festival
    const text = roadNews(1, "stormy");
    expect(text).toMatch(/thunderstorm/);
    expect(text).toMatch(/due in 2 days/);
    expect(roadNews(3, "sunny")).toMatch(/stall in the yard today/);
  });
});
