import { describe, expect, it } from "vitest";
import { claimSlayerItem, slayerItemReady } from "../src/core/combat";
import { RECIPES } from "../src/core/crafting";
import { creatureById, SLAYER_GOALS } from "../src/core/creatures";
import { itemById } from "../src/core/items";
import { newGame } from "../src/core/save";

describe("bug meat", () => {
  it("is an item and bug creatures drop it modestly", () => {
    expect(itemById("bug-meat")?.name).toBe("Bug meat");
    for (const id of ["dustmoth", "lanternmoth", "mossbeetle"]) {
      const d = creatureById(id)!.drops.find((x) => x.id === "bug-meat");
      expect(d, id).toBeDefined();
      expect(d!.chance).toBeLessThanOrEqual(0.4);
    }
  });

  it("the sturdy band uses bug meat, not moth dust", () => {
    const r = RECIPES.find((x) => x.id === "sturdy-band")!;
    const ing = Object.fromEntries(r.ingredients.map((i) => [i.item, i.count]));
    expect(ing).toEqual({ "copper-bar": 2, "bug-meat": 25, "gloop-jelly": 25 });
  });

  it("the Icicle Hopper goal gives 25 bug meat once", () => {
    const goal = SLAYER_GOALS.find((s) => s.id === "icicle-hopper")!;
    expect(goal.reward).toEqual({ item: "bug-meat", count: 25 });
    const g = newGame();
    expect(claimSlayerItem(g, "icicle-hopper")).toBe(
      "That goal is not met yet.",
    );
    expect(slayerItemReady(g, goal)).toBe(false);
    g.combat.kills["icicle-hopper"] = 100;
    expect(slayerItemReady(g, goal)).toBe(true);
    expect(claimSlayerItem(g, "icicle-hopper")).toBeUndefined();
    expect(g.inventory.count("bug-meat")).toBe(25);
    expect(claimSlayerItem(g, "icicle-hopper")).toBe("You already took it.");
    expect(slayerItemReady(g, goal)).toBe(false);
    expect(claimSlayerItem(g, "nope")).toBe("She has no such reward.");
  });
});
