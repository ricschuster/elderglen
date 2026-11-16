import { describe, expect, it } from "vitest";
import { itemTip } from "../src/core/itemtip";
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
