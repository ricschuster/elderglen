import { describe, expect, it } from "vitest";
import { placedChestTip, itemTip } from "../src/core/itemtip";
import { allItems } from "../src/core/items";

describe("itemTip", () => {
  it("describes tools, with the tier name", () => {
    expect(itemTip("tool:hoe")).toMatchObject({ name: "Hoe", kind: "Tool" });
    expect(itemTip("tool:axe", 2).name).toBe("Steel axe");
  });
  it("has the scythe line", () => {
    expect(itemTip("tool:scythe").text).toBe(
      "It can cut grass into hay, if you've built a silo.",
    );
  });
  it("gives every item a name, kind and no throw", () => {
    for (const it of allItems()) {
      const t = itemTip(it.id);
      expect(t.name).not.toBe("");
      expect(t.kind).not.toBe("");
    }
  });
  it("knows seeds and unknown ids", () => {
    const seed = allItems().find((i) => i.id.endsWith("-seed"))!;
    expect(itemTip(seed.id).kind).toBe("Seed");
    expect(itemTip("nope").name).toBe("nope");
  });
});

describe("placedChestTip", () => {
  const chest = (slots: ({ id: string; count: number } | undefined)[]) => ({
    id: "chest",
    items: { size: slots.length, slot: (i: number) => slots[i] },
  });
  it("says an empty chest is empty", () => {
    const t = placedChestTip(chest([undefined, undefined]));
    expect(t).toMatchObject({ name: "Chest", kind: "Chest" });
    expect(t.text).toBe("Empty (2 slots).");
  });
  it("counts slots and lists the fullest items", () => {
    const t = placedChestTip(
      chest([
        { id: "wood", count: 5 },
        { id: "wood", count: 3 },
        { id: "carrot", count: 1 },
        undefined,
      ]),
    );
    expect(t.text).toContain("3 of 4 slots used.");
    expect(t.text).toContain("Wood x8");
  });
  it("marks an order chest", () => {
    const c = { ...chest([undefined]), order: "x", closed: true };
    expect(placedChestTip(c).text).toContain("order has ended");
  });
});
