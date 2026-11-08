import { describe, expect, it } from "vitest";
import {
  finishBuild,
  giveItem,
  giveMoney,
  giveXp,
  refillEnergy,
  setWeather,
  stepHouseTier,
} from "../src/core/debug";
import { MAX_HOUSE_TIER, orderUpgrade, WOOD } from "../src/core/house";
import { allItems } from "../src/core/items";
import { newGame } from "../src/core/save";

describe("debug edits", () => {
  it("adds money and never goes below zero", () => {
    const g = newGame();
    const start = g.money;
    giveMoney(g, 1000);
    expect(g.money).toBe(start + 1000);
    giveMoney(g, -g.money - 50);
    expect(g.money).toBe(0);
  });

  it("gives items, refusing unknown ids and a full backpack", () => {
    const g = newGame();
    expect(giveItem(g, WOOD, 450)).toBe("ok");
    expect(g.inventory.count(WOOD)).toBe(450);
    expect(giveItem(g, "nonsense", 1)).toBe("unknown");
    const room = g.inventory.room(WOOD);
    expect(giveItem(g, WOOD, room + 1)).toBe("full");
    expect(g.inventory.count(WOOD)).toBe(450);
  });

  it("gives items with a quality suffix", () => {
    const g = newGame();
    expect(giveItem(g, "parsnip@gold", 3)).toBe("ok");
    expect(g.inventory.count("parsnip@gold")).toBe(3);
  });

  it("lists items once each, wood included", () => {
    const ids = allItems().map((i) => i.id);
    expect(ids).toContain(WOOD);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reports a level-up from XP", () => {
    const g = newGame();
    expect(giveXp(g, "farming", 100)).toBe(1);
    expect(giveXp(g, "farming", 1)).toBeUndefined();
  });

  it("sets the weather", () => {
    const g = newGame();
    setWeather(g, "rainy");
    expect(g.weather).toBe("rainy");
  });

  it("steps the house tier within range", () => {
    const g = newGame();
    stepHouseTier(g, -1);
    expect(g.houseTier).toBe(0);
    for (let i = 0; i < 10; i++) stepHouseTier(g, 1);
    expect(g.houseTier).toBe(MAX_HOUSE_TIER);
  });

  it("finishes a build now, and says so when there is none", () => {
    const g = newGame();
    expect(finishBuild(g)).toBe(false);
    giveMoney(g, 10000);
    giveItem(g, WOOD, 450);
    expect(orderUpgrade(g)).toBe(true);
    expect(finishBuild(g)).toBe(true);
    expect(g.houseTier).toBe(1);
    expect(g.houseBuild).toBeUndefined();
  });

  it("refills energy", () => {
    const g = newGame();
    g.day.energy.spend(100);
    refillEnergy(g);
    expect(g.day.energy.current).toBe(270);
  });
});

describe("item groups for the picker", () => {
  it("every item has a group, so none falls into Other", () => {
    const loose = allItems().filter((i) => i.group === undefined);
    expect(loose.map((i) => i.id)).toEqual([]);
  });
});
