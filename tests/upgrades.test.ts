import { describe, expect, it } from "vitest";
import { chop, till, TOOL_ENERGY } from "../src/core/actions";
import { MAX_ENERGY } from "../src/core/energy";
import { deserialize, newGame, serialize } from "../src/core/save";
import {
  collectUpgrade,
  MAX_TIER,
  MIN_SWING,
  orderReady,
  orderUpgrade,
  swingCost,
  toolAway,
  upgradeCost,
} from "../src/core/upgrades";
import { mine } from "../src/core/mining";
import { swingsToBreak } from "../src/core/rocks";
import { reportLines } from "../src/core/report";
import { sleep } from "../src/core/sleep";
import { useHeld } from "../src/core/tools";
import { maps } from "../src/content/maps";
import { START } from "../src/core/maps";

describe("tool upgrades", () => {
  it("costs rise by tier and stop at the top", () => {
    expect(upgradeCost(0)).toBe(2000);
    expect(upgradeCost(2)).toBe(10000);
    expect(upgradeCost(MAX_TIER)).toBeUndefined();
  });

  it("swings cost less with tier and farming level, never under the floor", () => {
    expect(swingCost(2, 0, 0)).toBe(2);
    expect(swingCost(2, 2, 0)).toBe(1.5);
    expect(swingCost(2, 0, 5)).toBe(1.5);
    expect(swingCost(2, 3, 10)).toBe(MIN_SWING);
  });

  it("an upgraded hoe spends less energy", () => {
    const g = newGame();
    g.toolTiers.hoe = 2;
    till(g, 0, 0);
    expect(g.day.energy.current).toBe(MAX_ENERGY - (TOOL_ENERGY - 0.5));
  });

  it("tiers survive a save, and old saves load as basic", () => {
    const g = newGame();
    g.toolTiers.can = 3;
    expect(deserialize(serialize(g))!.toolTiers).toEqual({
      hoe: 0,
      can: 3,
      pickaxe: 0,
      axe: 0,
    });
    const raw = JSON.parse(serialize(g));
    delete raw.toolTiers;
    expect(deserialize(JSON.stringify(raw))!.toolTiers).toEqual({
      hoe: 0,
      can: 0,
      pickaxe: 0,
      axe: 0,
    });
  });
});

describe("backpack", () => {
  it("grows 12, 24, 36 for 2000g then 10000g, and stops", async () => {
    const { Inventory } = await import("../src/core/inventory");
    const { nextBackpack, upgradeBackpack } =
      await import("../src/core/upgrades");
    const inv = new Inventory();
    const wallet = { money: 1999 };
    expect(nextBackpack(inv)).toEqual({ size: 24, cost: 2000 });
    expect(upgradeBackpack(inv, wallet)).toBe(false);
    wallet.money = 12000;
    expect(upgradeBackpack(inv, wallet)).toBe(true);
    expect(inv.size).toBe(24);
    expect(wallet.money).toBe(10000);
    expect(upgradeBackpack(inv, wallet)).toBe(true);
    expect(inv.size).toBe(36);
    expect(nextBackpack(inv)).toBeUndefined();
    expect(upgradeBackpack(inv, wallet)).toBe(false);
  });

  it("keeps its size and contents through a save", () => {
    const g = newGame();
    g.inventory.grow(24);
    g.inventory.add("parsnip", 1500);
    const back = deserialize(serialize(g))!;
    expect(back.inventory.size).toBe(24);
    expect(back.inventory.count("parsnip")).toBe(1500);
  });
});

describe("the smith's tool upgrades", () => {
  function rich() {
    const g = newGame();
    g.money = 20000;
    g.inventory.add("copper-bar", 5);
    g.inventory.add("iron-bar", 5);
    g.inventory.add("gold-bar", 5);
    return g;
  }

  it("takes gold and five bars of the grade's metal, and keeps the tool two days", () => {
    const g = rich();
    expect(orderUpgrade(g, "pickaxe")).toBeUndefined();
    expect(g.money).toBe(18000);
    expect(g.inventory.count("copper-bar")).toBe(0);
    expect(g.toolOrder).toEqual({ tool: "pickaxe", tier: 1, readyDay: 3 });
    expect(toolAway(g, "pickaxe")).toBe(true);
    expect(orderReady(g)).toBe(false);
  });

  it("refuses when short of gold or bars, when maxed, and with a tool already away", () => {
    const g = newGame();
    expect(orderUpgrade(g, "hoe")).toBe("Not enough money.");
    g.money = 5000;
    expect(orderUpgrade(g, "hoe")).toBe("You need 5 copper bars.");
    const r = rich();
    r.toolTiers.can = MAX_TIER;
    expect(orderUpgrade(r, "can")).toBe("Already the best.");
    expect(orderUpgrade(r, "hoe")).toBeUndefined();
    expect(orderUpgrade(r, "can")).toBe("Already the best.");
    r.toolTiers.pickaxe = 1;
    expect(orderUpgrade(r, "pickaxe")).toBe(
      "She is still working on another tool.",
    );
  });

  it("goes in grade order: the second step needs iron", () => {
    const g = rich();
    orderUpgrade(g, "hoe");
    g.day.clock.day = 3;
    expect(collectUpgrade(g)).toBe("hoe");
    expect(g.toolTiers.hoe).toBe(1);
    expect(orderUpgrade(g, "hoe")).toBeUndefined();
    expect(g.inventory.count("iron-bar")).toBe(0);
    expect(g.money).toBe(20000 - 2000 - 5000);
  });

  it("cannot be collected early, and the tool cannot be used while away", () => {
    const g = rich();
    orderUpgrade(g, "pickaxe");
    expect(collectUpgrade(g)).toBeUndefined();
    const map = maps.get(START.map);
    const r = useHeld(g, map, { kind: "tool", tool: "pickaxe" }, 1, 1);
    expect(r).toEqual({ ok: false, reason: "at the smithy" });
    expect(useHeld(g, map, { kind: "tool", tool: "hoe" }, 1, 1)).not.toEqual(r);
  });

  it("tells the player on the morning it is ready, across a save", () => {
    const g = rich();
    orderUpgrade(g, "can");
    const back = deserialize(serialize(g))!;
    expect(back.toolOrder).toEqual(g.toolOrder);
    const none = [] as { x: number; y: number }[];
    expect(sleep(back, none, () => 0.5).toolReady).toBeUndefined();
    const r = sleep(back, none, () => 0.5);
    expect(r.toolReady).toBe("can");
    expect(reportLines(r)).toContain(
      "Your watering can is ready at the smithy in Hearthwell.",
    );
  });

  it("makes the pickaxe break rocks in fewer swings and for less energy", () => {
    expect(swingsToBreak("stone", 0)).toBe(2);
    expect(swingsToBreak("stone", 2)).toBe(1);
    expect(swingsToBreak("copper", 0)).toBe(3);
    expect(swingsToBreak("copper", 3)).toBe(1);
    const g = newGame();
    g.toolTiers.pickaxe = 3;
    g.rocks.add(4, 4, "stone");
    const e = g.day.energy.current;
    expect(mine(g, 4, 4, undefined, () => 0.9).ok).toBe(true);
    expect(g.rocks.at(4, 4)).toBeUndefined();
    expect(e - g.day.energy.current).toBe(1.25);
  });

  it("upgrades the axe through the smith and fells trees in fewer swings", () => {
    const g = newGame();
    g.money = 5000;
    g.inventory.add("copper-bar", 5);
    expect(orderUpgrade(g, "axe")).toBeUndefined();
    expect(toolAway(g, "axe")).toBe(true);
    g.day.clock.day += 2;
    expect(collectUpgrade(g)).toBe("axe");
    expect(g.toolTiers.axe).toBe(1);
    g.trees.load([]);
    g.trees.add(1, 0, 5);
    for (let i = 0; i < 7; i++) chop(g, 1, 0, () => 0.99);
    expect(g.inventory.count("wood")).toBe(0);
    chop(g, 1, 0, () => 0.99);
    expect(g.inventory.count("wood")).toBe(12);
  });

  it("swings the axe for less energy by grade", () => {
    const g = newGame();
    g.toolTiers.axe = 2;
    g.trees.load([]);
    g.trees.add(1, 0, 5);
    const e = g.day.energy.current;
    chop(g, 1, 0, () => 0.99);
    expect(e - g.day.energy.current).toBe(1.5);
  });
});

describe("the Hearthsilver grade", () => {
  it("smelts 5 ore and 2 coal into a bar in 8 hours", async () => {
    const { smelt, ready, minutesLeft } = await import("../src/core/furnace");
    const g = newGame();
    g.furnace.gifted = true;
    g.inventory.add("hearthsilver-ore", 5);
    g.inventory.add("coal", 1);
    expect(smelt(g, "hearthsilver-bar")).toBe("not enough coal");
    g.inventory.add("coal", 1);
    expect(smelt(g, "hearthsilver-bar")).toBeUndefined();
    expect(g.inventory.count("hearthsilver-ore")).toBe(0);
    expect(g.inventory.count("coal")).toBe(0);
    expect(minutesLeft(g)).toBe(480);
    expect(ready(g)).toBe(false);
  });

  it("costs five bars and no gold, after the gold grade", () => {
    const g = newGame();
    g.toolTiers.axe = 3;
    g.inventory.add("hearthsilver-bar", 5);
    g.money = 0;
    expect(upgradeCost(3)).toBe(0);
    expect(orderUpgrade(g, "axe")).toBeUndefined();
    expect(g.inventory.count("hearthsilver-bar")).toBe(0);
    g.day.clock.day = 3;
    expect(collectUpgrade(g)).toBe("axe");
    expect(g.toolTiers.axe).toBe(4);
    expect(orderUpgrade(g, "axe")).toBe("Already the best.");
  });

  it("cannot skip grades", () => {
    const g = newGame();
    g.inventory.add("hearthsilver-bar", 5);
    expect(orderUpgrade(g, "hoe")).toBe("Not enough money.");
  });

  it("the top pickaxe breaks Hearthsilver in fewer swings", () => {
    expect(swingsToBreak("hearthsilver", 4)).toBeLessThan(
      swingsToBreak("hearthsilver", 3),
    );
    expect(swingsToBreak("stone", 4)).toBe(1);
  });

  it("the top tier survives a save and the top axe swings twice", () => {
    const g = newGame();
    g.toolTiers.can = 4;
    expect(deserialize(serialize(g))!.toolTiers.can).toBe(4);
    expect(swingCost(2, 4, 0)).toBe(1);
  });
});
