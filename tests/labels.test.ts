import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import {
  exitLabel,
  mergeTags,
  serviceLabel,
  stackOffsets,
} from "../src/core/labels";

describe("label layout", () => {
  it("merges the two tiles of one object into one tag", () => {
    const tags = mergeTags(
      [
        { x: 8, y: 0, text: "Market Stall" },
        { x: 24, y: 0, text: "Market Stall" },
        { x: 400, y: 0, text: "Market Stall" },
      ],
      32,
    );
    expect(tags).toHaveLength(2);
    expect(tags[0]!.x).toBe(16);
  });

  it("stacks overlapping tags upward and leaves clear ones alone", () => {
    const off = stackOffsets([
      { x: 100, y: 50, text: "Cart" },
      { x: 104, y: 50, text: "Hearthwell" },
      { x: 400, y: 50, text: "Door" },
    ]);
    expect(off[0]).toBe(0);
    expect(off[1]).toBeLessThan(0);
    expect(off[2]).toBe(0);
  });
});

describe("placeholder labels", () => {
  it("names every door and counter on every map", () => {
    for (const id of Object.keys(mapFiles)) {
      const map = maps.get(id);
      for (const e of map.exits)
        expect(exitLabel(e.id), `${id} exit ${e.id}`).toBeDefined();
      for (const s of map.services)
        expect(
          serviceLabel(s.kind, s.id),
          `${id} ${s.kind} ${s.id}`,
        ).toBeDefined();
    }
  });
});
