import { describe, expect, it } from "vitest";
import { BOOTS, Equipment, RINGS, ringById } from "../src/core/equipment";
import { buyBoots, Health } from "../src/core/combat";
import { pickupRadius } from "../src/core/ground";
import { Inventory } from "../src/core/inventory";
import { itemById } from "../src/core/items";
import { newGame, serialize, deserialize } from "../src/core/save";

describe("rings", () => {
  it("every ring is a kept item", () => {
    for (const r of RINGS) expect(itemById(r.id)?.keep).toBe(true);
  });

  it("wears from the pack and takes off back into it", () => {
    const inv = new Inventory();
    const eq = new Equipment();
    inv.add("magnet-ring");
    expect(eq.wear(inv, 0, "magnet-ring")).toBe(true);
    expect(inv.count("magnet-ring")).toBe(0);
    expect(eq.magnetBonus()).toBe(2);
    expect(eq.remove(inv, 0)).toBe(true);
    expect(inv.count("magnet-ring")).toBe(1);
    expect(eq.magnetBonus()).toBe(0);
  });

  it("refuses a ring not in the pack, an unknown ring and a bad slot", () => {
    const inv = new Inventory();
    const eq = new Equipment();
    expect(eq.wear(inv, 0, "glow-ring")).toBe(false);
    inv.add("glow-ring");
    expect(eq.wear(inv, 2, "glow-ring")).toBe(false);
    expect(eq.wear(inv, 0, "stone")).toBe(false);
    expect(eq.remove(inv, 1)).toBe(false);
  });

  it("stacks light and magnet across both slots", () => {
    const inv = new Inventory();
    const eq = new Equipment();
    inv.add("small-glow-ring");
    inv.add("glow-ring");
    eq.wear(inv, 0, "small-glow-ring");
    eq.wear(inv, 1, "glow-ring");
    expect(eq.lightRadius()).toBe(15);
    expect(ringById("small-magnet-ring")?.magnet).toBe(1);
  });

  it("swapping a slot hands the old ring back", () => {
    const inv = new Inventory();
    const eq = new Equipment();
    inv.add("small-magnet-ring");
    inv.add("magnet-ring");
    eq.wear(inv, 0, "small-magnet-ring");
    expect(eq.wear(inv, 0, "magnet-ring")).toBe(true);
    expect(inv.count("small-magnet-ring")).toBe(1);
    expect(eq.worn()[0]).toBe("magnet-ring");
  });

  it("takes off nothing when the pack is full", () => {
    const inv = new Inventory();
    const eq = new Equipment();
    inv.add("glow-ring");
    eq.wear(inv, 0, "glow-ring");
    for (let i = 0; i < inv.size; i++) inv.add("wood", 999);
    expect(inv.room("glow-ring")).toBe(0);
    expect(eq.remove(inv, 0)).toBe(false);
    expect(eq.worn()[0]).toBe("glow-ring");
  });

  it("magnet rings widen the pickup radius", () => {
    expect(pickupRadius()).toBe(1);
    expect(pickupRadius(2)).toBe(3);
  });

  it("saves and loads, dropping unknown rings", () => {
    const eq = new Equipment();
    eq.load({ rings: ["glow-ring", "nonsense"] });
    expect(eq.worn()).toEqual(["glow-ring", undefined]);
    const copy = new Equipment();
    copy.load(eq.save());
    expect(copy.worn()).toEqual(eq.worn());
    copy.load(undefined);
    expect(copy.worn()).toEqual([undefined, undefined]);
  });

  it("is part of the game save", () => {
    const g = newGame();
    g.inventory.add("magnet-ring");
    g.equipment.wear(g.inventory, 1, "magnet-ring");
    const back = deserialize(serialize(g));
    expect(back!.equipment.worn()[1]).toBe("magnet-ring");
  });
});

describe("boots", () => {
  it("every pair is a kept item with a price", () => {
    for (const b of BOOTS) {
      expect(itemById(b.id)?.keep).toBe(true);
      expect(b.price).toBeGreaterThan(0);
    }
  });

  it("wears, swaps and takes off, giving defense and immunity", () => {
    const inv = new Inventory();
    const eq = new Equipment();
    inv.add("sturdy-boots");
    inv.add("warded-boots");
    expect(eq.wearBoots(inv, "sturdy-boots")).toBe(true);
    expect(eq.defense()).toBe(2);
    expect(eq.wearBoots(inv, "warded-boots")).toBe(true);
    expect(inv.count("sturdy-boots")).toBe(1);
    expect(eq.defense()).toBe(2);
    expect(eq.immunity()).toBe(1);
    expect(eq.removeBoots(inv)).toBe(true);
    expect(eq.defense()).toBe(0);
    expect(eq.wearBoots(inv, "glow-ring")).toBe(false);
  });

  it("defense cuts a hit to a floor of 1, before assist", () => {
    const h = new Health();
    expect(h.hurt(6, false, 2)).toBe(4);
    h.grace = 0;
    expect(h.hurt(2, false, 4)).toBe(1);
    h.grace = 0;
    expect(h.hurt(10, true, 2)).toBe(4);
  });

  it("the smith sells boots for coin, once", () => {
    const g = newGame();
    g.money = 10;
    expect(buyBoots(g, "worn-boots")).toBe("Not enough money.");
    g.money = 200;
    expect(buyBoots(g, "worn-boots")).toBeUndefined();
    expect(g.money).toBe(50);
    expect(buyBoots(g, "worn-boots")).toBe("You already have a pair.");
  });

  it("saves boots, and an old save without them loads", () => {
    const g = newGame();
    g.inventory.add("ember-boots");
    g.equipment.wearBoots(g.inventory, "ember-boots");
    const back = deserialize(serialize(g));
    expect(back?.equipment.wornBoots()).toBe("ember-boots");
    const e = new Equipment();
    e.load({ rings: [null, null] });
    expect(e.wornBoots()).toBeUndefined();
  });
});
