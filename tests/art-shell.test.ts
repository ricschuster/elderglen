import "../src/core/items";
import { describe, expect, it } from "vitest";
import pots from "../src/content/pots.json";
import { POND_SPECIES, agedRoeOf, roeOf } from "../src/core/pondspecies";
import {
  MELON_COLOURS,
  MELON_MAP,
  ROE_SHAPE,
  SHELL_LOOKS,
  SHELL_SHAPES,
  roeIconKey,
  roePalette,
} from "../src/scenes/art-shell";

describe("shellfish, roe and melon art", () => {
  it("has a look for every shellfish and none for a missing one", () => {
    expect(Object.keys(SHELL_LOOKS).sort()).toEqual(
      pots.catches.map((c) => c.id).sort(),
    );
  });

  it("draws every shape in a 16 wide frame with known letters", () => {
    for (const [name, rows] of Object.entries(SHELL_SHAPES))
      for (const r of rows) {
        expect(r.length, `${name}: ${r}`).toBe(16);
        expect(r, name).toMatch(/^[.odblfmewe]+$/);
      }
    for (const r of ROE_SHAPE) expect(r).toMatch(/^[.obl]{16}$/);
    for (const r of MELON_MAP) {
      expect(r.length).toBe(16);
      for (const ch of r)
        if (ch !== ".") expect(MELON_COLOURS[ch], ch).toBeDefined();
    }
  });

  it("keeps shellfish distinguishable", () => {
    const seen = new Set<string>();
    for (const [id, k] of Object.entries(SHELL_LOOKS)) {
      const key = `${k.shape}${k.b}`;
      expect(seen.has(key), id).toBe(false);
      seen.add(key);
    }
  });

  it("gives every roe and aged roe a picture, aged ones different", () => {
    for (const s of POND_SPECIES) {
      expect(roeIconKey(roeOf(s.id)), s.id).toBeDefined();
      expect(roeIconKey(agedRoeOf(s.id)), s.id).toBeDefined();
      expect(roeIconKey(roeOf(s.id))).not.toBe(roeIconKey(agedRoeOf(s.id)));
      expect(roePalette(s.id, true).b).not.toBe(roePalette(s.id, false).b);
    }
    expect(roeIconKey("carp")).toBeUndefined();
  });
});
