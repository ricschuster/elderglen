import { describe, expect, it } from "vitest";
import { eat } from "../src/core/actions";
import {
  cook,
  kitchenOpen,
  knownDishes,
  lockedDishes,
} from "../src/core/cooking";
import { DISHES } from "../src/core/dishes";
import { itemById } from "../src/core/items";
import { ringProgress } from "../src/core/completion";
import { deserialize, newGame, serialize } from "../src/core/save";

function kitchen() {
  const g = newGame();
  g.houseTier = 1;
  return g;
}

describe("cooking", () => {
  it("needs the kitchen", () => {
    const g = newGame();
    g.inventory.add("egg");
    expect(kitchenOpen(g)).toBe(false);
    expect(cook(g, "fried-egg")).toBe("no kitchen");
    expect(g.inventory.count("egg")).toBe(1);
  });

  it("starts with the fried egg only", () => {
    const g = kitchen();
    expect(knownDishes(g).map((d) => d.id)).toEqual(["fried-egg"]);
    expect(lockedDishes(g)).toHaveLength(DISHES.length - 1);
  });

  it("consumes ingredients, yields a dish, and counts it", () => {
    const g = kitchen();
    g.inventory.add("egg", 2);
    expect(cook(g, "fried-egg")).toBeUndefined();
    expect(g.inventory.count("egg")).toBe(1);
    expect(g.inventory.count("fried-egg")).toBe(1);
    expect(g.achievements.hasCooked("fried-egg")).toBe(true);
    expect(g.achievements.cookedCount).toBe(1);
  });

  it("refuses missing ingredients and unknown recipes", () => {
    const g = kitchen();
    expect(cook(g, "fried-egg")).toBe("missing ingredients");
    g.inventory.add("potato");
    expect(cook(g, "baked-potato")).toBe("recipe not known");
    expect(cook(g, "nope")).toBe("no such recipe");
    expect(g.achievements.cookedCount).toBe(0);
  });

  it("learns a recipe at a skill level", () => {
    const g = kitchen();
    g.skills.gain("farming", 100000);
    expect(knownDishes(g).map((d) => d.id)).toContain("baked-potato");
  });

  it("dishes sell and restore energy when eaten", () => {
    const g = kitchen();
    expect(itemById("fried-egg")?.sellPrice).toBe(35);
    g.day.energy.current = 100;
    g.inventory.add("fried-egg");
    expect(eat(g, "fried-egg").ok).toBe(true);
    expect(g.day.energy.current).toBe(175);
  });

  it("every ingredient exists", () => {
    for (const d of DISHES)
      for (const i of d.ingredients)
        expect(itemById(i.item), i.item).toBeDefined();
  });

  it("unlocks the cooking counter and saves the cooked set", () => {
    const g = kitchen();
    const cooking = () =>
      ringProgress(g)[0]!.categories.find((c) => c.id === "cooking")!;
    expect(cooking().locked).toBe(false);
    expect(cooking().progress).toBe(0);
    g.inventory.add("egg");
    cook(g, "fried-egg");
    expect(cooking().progress).toBeCloseTo(1 / DISHES.length);
    const back = deserialize(serialize(g))!;
    expect(back.achievements.hasCooked("fried-egg")).toBe(true);
  });
});
