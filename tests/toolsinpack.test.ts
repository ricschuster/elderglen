import { describe, expect, it } from "vitest";
import { putIn, takeOut } from "../src/core/chests";
import { isSafeFromDefeat, loseItems } from "../src/core/combat";
import { Inventory } from "../src/core/inventory";
import { sortPack, trashSlot } from "../src/core/packmenu";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sell, sellAll } from "../src/core/shop";
import { ShippingBin } from "../src/core/shipping";
import { startGame } from "../src/core/toolbar";
import {
  ensureTools,
  findTool,
  toolItemId,
  TOOLS,
} from "../src/core/toolitems";

describe("tools in the pack (note 102)", () => {
  it("a new game carries the five tools in slots 0 to 4", () => {
    const g = startGame();
    TOOLS.forEach((t, i) =>
      expect(g.inventory.slot(i)?.id).toBe(toolItemId(t)),
    );
  });

  it("an old save with no tool stacks gets them in front, items kept", () => {
    const g = newGame();
    g.inventory.add("wood", 5);
    g.inventory.add("stone", 2);
    g.toolTiers.axe = 1;
    const back = deserialize(serialize(g))!;
    expect(back.inventory.size).toBe(12);
    expect(back.inventory.slot(0)?.id).toBe("tool:hoe");
    expect(back.inventory.slot(5)).toEqual({ id: "wood", count: 5 });
    expect(back.inventory.count("stone")).toBe(2);
    expect(back.toolTiers.axe).toBe(1);
    // A second round trip changes nothing.
    expect(serialize(deserialize(serialize(back))!)).toBe(serialize(back));
  });

  it("a full old pack grows rather than losing anything", () => {
    const inv = new Inventory(12);
    for (let i = 0; i < 12; i++) inv.add(`junk${i}`, 1);
    expect(ensureTools(inv)).toBe(true);
    expect(inv.size).toBe(17);
    for (let i = 0; i < 12; i++) expect(inv.count(`junk${i}`)).toBe(1);
    expect(findTool(inv, "pickaxe")).toBeGreaterThanOrEqual(0);
  });

  it("cannot be trashed", () => {
    const g = startGame();
    expect(trashSlot(g.inventory, 0)).toBeUndefined();
    expect(g.inventory.count("tool:hoe")).toBe(1);
  });

  it("cannot be sold or shipped", () => {
    const g = startGame();
    for (const t of TOOLS) {
      const id = toolItemId(t);
      expect(sell(g.inventory, g, id)).toBe(0);
      expect(sellAll(g.inventory, g, id)).toBe(0);
      expect(new ShippingBin().ship(g.inventory, id, 1)).toBe(0);
      expect(g.inventory.count(id)).toBe(1);
    }
    expect(g.money).toBe(startGame().money);
  });

  it("can go in a chest and come back", () => {
    const g = startGame();
    const chest = { items: new Inventory(12) } as Parameters<typeof putIn>[1];
    expect(putIn(g, chest, "tool:axe", 1)).toBe(1);
    expect(findTool(g.inventory, "axe")).toBe(-1);
    expect(takeOut(g, chest, "tool:axe", 1)).toBe(1);
    expect(findTool(g.inventory, "axe")).toBeGreaterThanOrEqual(0);
  });

  it("are never lost in a defeat", () => {
    const g = startGame();
    expect(isSafeFromDefeat("tool:hoe")).toBe(true);
    loseItems(g, () => 0, false);
    for (const t of TOOLS) expect(g.inventory.count(toolItemId(t))).toBe(1);
  });

  it("stay first when the pack is sorted", () => {
    const g = startGame();
    g.inventory.add("wood", 3);
    sortPack(g.inventory);
    TOOLS.forEach((t, i) =>
      expect(g.inventory.slot(i)?.id).toBe(toolItemId(t)),
    );
  });
});
