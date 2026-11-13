import { describe, expect, it } from "vitest";
import {
  COMBINE_COST,
  combineProblem,
  combineRings,
  packRings,
  UNFORGE_RETURN,
  unforgeRing,
} from "../src/core/forge";
import { Equipment, comboId, ringById } from "../src/core/equipment";
import { Inventory } from "../src/core/inventory";
import { itemById } from "../src/core/items";

const ORE = "hearthsilver-ore";

function pack(...ids: string[]): Inventory {
  const inv = new Inventory();
  for (const id of ids) inv.add(id, 1);
  inv.add(ORE, COMBINE_COST);
  return inv;
}

describe("ring combining", () => {
  it("makes one ring from two for the ore cost", () => {
    const inv = pack("glow-ring", "magnet-ring");
    const r = combineRings(inv, "magnet-ring", "glow-ring");
    expect(r).toEqual({ ok: true, id: comboId("glow-ring", "magnet-ring") });
    expect(inv.count("glow-ring")).toBe(0);
    expect(inv.count(ORE)).toBe(0);
    if (r.ok) expect(inv.count(r.id)).toBe(1);
  });

  it("stacks both effects when worn", () => {
    const inv = pack("glow-ring", "crabshell-ring");
    const r = combineRings(inv, "glow-ring", "crabshell-ring");
    if (!r.ok) throw new Error(r.reason);
    const eq = new Equipment();
    expect(eq.wear(inv, 0, r.id)).toBe(true);
    expect(eq.lightRadius()).toBe(10);
    expect(eq.defense()).toBe(5);
    expect(itemById(r.id)?.keep).toBe(true);
    expect(ringById(r.id)?.name).toContain("glow ring");
  });

  it("refuses the same ring twice, a combined ring and short ore", () => {
    const inv = pack("glow-ring", "glow-ring");
    expect(combineProblem(inv, "glow-ring", "glow-ring")).toMatch(/same/);
    const inv2 = pack("glow-ring", "magnet-ring", "defense-ring");
    const c = combineRings(inv2, "glow-ring", "magnet-ring");
    if (!c.ok) throw new Error(c.reason);
    expect(combineProblem(inv2, c.id, "defense-ring")).toMatch(/again/);
    const poor = new Inventory();
    poor.add("glow-ring");
    poor.add("magnet-ring");
    expect(combineRings(poor, "glow-ring", "magnet-ring").ok).toBe(false);
    expect(poor.count("glow-ring")).toBe(1);
  });

  it("unforges free, returning both rings and half the ore", () => {
    const inv = pack("glow-ring", "magnet-ring");
    const c = combineRings(inv, "glow-ring", "magnet-ring");
    if (!c.ok) throw new Error(c.reason);
    expect(unforgeRing(inv, c.id).ok).toBe(true);
    expect(inv.count("glow-ring")).toBe(1);
    expect(inv.count("magnet-ring")).toBe(1);
    expect(inv.count(ORE)).toBe(UNFORGE_RETURN);
    expect(unforgeRing(inv, "glow-ring").ok).toBe(false);
  });

  it("lists combined rings in the pack and survives a save", () => {
    const inv = pack("glow-ring", "magnet-ring");
    const c = combineRings(inv, "glow-ring", "magnet-ring");
    if (!c.ok) throw new Error(c.reason);
    expect(packRings(inv).combos).toEqual([c.id]);
    const eq = new Equipment();
    eq.wear(inv, 1, c.id);
    const eq2 = new Equipment();
    eq2.load(eq.save());
    expect(eq2.worn()[1]).toBe(c.id);
  });
});
