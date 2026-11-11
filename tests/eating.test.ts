import { describe, expect, it } from "vitest";
import { eat } from "../src/core/actions";
import { MAX_ENERGY } from "../src/core/energy";
import { itemById } from "../src/core/items";
import { newGame } from "../src/core/save";
import { CROPS } from "../src/core/crops";
import { FORAGE } from "../src/core/forage";

function tired() {
  const g = newGame();
  g.day.energy.current = 100;
  return g;
}

describe("eating", () => {
  it("restores energy and uses up one item", () => {
    const g = tired();
    g.inventory.add("parsnip", 2);
    expect(eat(g, "parsnip").ok).toBe(true);
    expect(g.day.energy.current).toBe(125);
    expect(g.inventory.count("parsnip")).toBe(1);
  });

  it("better quality restores more", () => {
    const g = tired();
    g.inventory.add("parsnip@gold");
    eat(g, "parsnip@gold");
    expect(g.day.energy.current).toBe(100 + 45);
    expect(itemById("parsnip@silver")?.energy).toBe(35);
  });

  it("never goes past the maximum", () => {
    const g = newGame();
    g.day.energy.current = MAX_ENERGY - 5;
    g.inventory.add("melon");
    eat(g, "melon");
    expect(g.day.energy.current).toBe(MAX_ENERGY);
  });

  it("refuses non-food, missing items, and a full tank", () => {
    const g = tired();
    g.inventory.add("daffodil");
    g.inventory.add("parsnip-seed");
    expect(eat(g, "daffodil")).toEqual({ ok: false, reason: "not food" });
    expect(eat(g, "parsnip-seed")).toEqual({ ok: false, reason: "not food" });
    expect(eat(g, "leek")).toEqual({ ok: false, reason: "nothing to eat" });
    g.inventory.add("leek");
    g.day.energy.current = MAX_ENERGY;
    expect(eat(g, "leek")).toEqual({ ok: false, reason: "not hungry" });
    expect(g.inventory.count("leek")).toBe(1);
  });

  it("every crop is food", () => {
    // The pumpkin and wheat are not food (note 07).
    for (const c of CROPS.filter((c) => c.id !== "pumpkin" && c.id !== "wheat"))
      expect(itemById(c.id)?.energy, c.id).toBeGreaterThan(0);
    expect(FORAGE.some((f) => f.energy)).toBe(true);
  });
});
