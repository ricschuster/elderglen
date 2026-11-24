import { describe, expect, it } from "vitest";
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
});
