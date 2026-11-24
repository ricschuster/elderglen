import { describe, expect, it } from "vitest";
import { itemLabel } from "../src/core/items";
import { tileKey } from "../src/core/tilekey";
import { isLiftTool } from "../src/core/toolbar";
import { NAME_MAX, cleanName, isNum, isObject } from "../src/core/guards";

describe("guards", () => {
  it("isObject accepts plain objects only", () => {
    expect(isObject({})).toBe(true);
    expect(isObject({ a: 1 })).toBe(true);
    expect(isObject(null)).toBe(false);
    expect(isObject([])).toBe(false);
    expect(isObject("x")).toBe(false);
    expect(isObject(undefined)).toBe(false);
  });

  it("isNum accepts finite numbers only", () => {
    expect(isNum(0)).toBe(true);
    expect(isNum(-2.5)).toBe(true);
    expect(isNum(NaN)).toBe(false);
    expect(isNum(Infinity)).toBe(false);
    expect(isNum("3")).toBe(false);
  });

  it("cleanName trims, collapses space and cuts to the limit", () => {
    expect(cleanName("  Maple   Leaf ")).toBe("Maple Leaf");
    expect(cleanName("a".repeat(40))).toHaveLength(NAME_MAX);
    expect(cleanName("abcdef", 3)).toBe("abc");
    expect(cleanName("   ")).toBe("");
  });

  it("tileKey joins x and y", () => {
    expect(tileKey(3, 7)).toBe("3,7");
    expect(tileKey(-1, 0)).toBe("-1,0");
  });

  it("isLiftTool is true for the axe and pickaxe only", () => {
    expect(isLiftTool({ kind: "tool", tool: "axe" })).toBe(true);
    expect(isLiftTool({ kind: "tool", tool: "pickaxe" })).toBe(true);
    expect(isLiftTool({ kind: "tool", tool: "hoe" })).toBe(false);
    expect(isLiftTool({ kind: "empty" })).toBe(false);
    expect(isLiftTool({ kind: "item", id: "axe", count: 1 })).toBe(false);
  });

  it("itemLabel lower-cases a known name and falls back otherwise", () => {
    expect(itemLabel("parsnip")).toBe("parsnip");
    expect(itemLabel("Nope-item")).toBe("Nope-item");
    expect(itemLabel("nope-item", "keepsake")).toBe("keepsake");
  });
});
