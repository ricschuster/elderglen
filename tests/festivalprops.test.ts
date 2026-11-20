import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import { festivalPropBlocks, festivalPropsOn } from "../src/core/festivalprops";
import { CROWD, CROWD_TAGS, taggedIds } from "../src/core/labels";

const winter = (d: number) => SEASONS.indexOf("winter") * DAYS_PER_SEASON + d;

describe("Midwinter Feast props", () => {
  it("has the long table, two lanterns and the bonfire on the square", () => {
    const p = festivalPropsOn(winter(25), "hearthwell", false)!;
    expect(p.table).toEqual([66, 77, 56]);
    expect(p.lanterns).toHaveLength(2);
    expect(p.bonfire).toEqual([72, 53]);
  });

  it("blocks only the table tiles", () => {
    const b = (x: number, y: number) =>
      festivalPropBlocks(winter(25), "hearthwell", false, x, y);
    expect(b(66, 56)).toBe(true);
    expect(b(77, 56)).toBe(true);
    expect(b(72, 56)).toBe(true);
    expect(b(78, 56)).toBe(false);
    expect(b(72, 55)).toBe(false);
    expect(b(72, 53)).toBe(false);
  });

  it("is only there on the festival day, on its map", () => {
    expect(festivalPropsOn(winter(24), "hearthwell", false)).toBeUndefined();
    expect(festivalPropsOn(winter(25), "farm", false)).toBeUndefined();
  });

  it("moves to the hall table once the hall is restored", () => {
    expect(festivalPropsOn(winter(25), "hearthwell", true)).toBeUndefined();
    expect(festivalPropsOn(winter(25), "hall", true)!.table).toEqual([
      18, 29, 11,
    ]);
  });
});

describe("crowd name tags", () => {
  const row = Array.from({ length: 25 }, (_, i) => ({
    id: `p${String(i).padStart(2, "0")}`,
    x: 60 + i,
    y: 55,
  }));

  it("names everyone in a small group", () => {
    const few = row.slice(0, CROWD);
    expect(taggedIds(few, { x: 0, y: 0 }).size).toBe(CROWD);
  });

  it("names only the nearest few in a crowd, plus the always set", () => {
    const ids = taggedIds(row, { x: 70, y: 59 }, new Set(["p00"]));
    expect(ids.size).toBe(CROWD_TAGS + 1);
    expect(ids.has("p00")).toBe(true);
    expect(ids.has("p10")).toBe(true);
    expect(ids.has("p24")).toBe(false);
  });

  it("is deterministic on ties", () => {
    const a = [...taggedIds(row, { x: 72.5, y: 55 })].sort();
    const b = [...taggedIds([...row].reverse(), { x: 72.5, y: 55 })].sort();
    expect(a).toEqual(b);
  });
});
