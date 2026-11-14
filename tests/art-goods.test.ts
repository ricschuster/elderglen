import "../src/core/items";
import { describe, expect, it } from "vitest";
import items from "../src/content/item-table.json";
import { GOOD_LOOKS, GOOD_SHAPES } from "../src/scenes/art-goods";

describe("goods art", () => {
  it("draws every shape within 16 columns", () => {
    for (const [name, rows] of Object.entries(GOOD_SHAPES)) {
      expect(rows.length, name).toBeLessThanOrEqual(16);
      for (const r of rows) {
        expect(r.length, `${name}: ${r}`).toBeLessThanOrEqual(16);
        expect(r, name).toMatch(/^[.obdlas]*$/);
      }
    }
  });

  it("uses a known shape and a real item for every look", () => {
    const ids = new Set(items.map((i) => i.id));
    for (const [id, k] of Object.entries(GOOD_LOOKS)) {
      expect(GOOD_SHAPES[k.shape], id).toBeDefined();
      expect(ids.has(id), id).toBe(true);
      expect(k.b, id).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
