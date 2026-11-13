import { describe, expect, it } from "vitest";
import fish from "../src/content/fish.json";
import { FISH_LOOKS, SHAPES, colourOf, darken } from "../src/scenes/art-fish";

describe("fish art", () => {
  it("has a look for every fish and none for a missing one", () => {
    const ids = fish.map((f) => f.id).sort();
    expect(Object.keys(FISH_LOOKS).sort()).toEqual(ids);
  });

  it("draws every shape in a 16 wide frame with known letters", () => {
    for (const [name, rows] of Object.entries(SHAPES)) {
      expect(rows.length, name).toBeLessThanOrEqual(16);
      for (const r of rows) {
        expect(r.length, `${name}: ${r}`).toBe(16);
        expect(r, name).toMatch(/^[.odblfmewe]+$/);
      }
    }
  });

  it("uses valid hex colours and a darker outline", () => {
    for (const [id, k] of Object.entries(FISH_LOOKS)) {
      for (const c of [k.d, k.b, k.l, k.f, k.m ?? k.b])
        expect(c, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(colourOf("o", k)).toBe(darken(k.d));
    }
  });

  it("keeps fish distinguishable: no two share shape and body", () => {
    const seen = new Set<string>();
    for (const [id, k] of Object.entries(FISH_LOOKS)) {
      const key = `${k.shape}${k.b}${k.l}`;
      expect(seen.has(key), id).toBe(false);
      seen.add(key);
    }
  });
});
