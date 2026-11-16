import { describe, expect, it } from "vitest";
import {
  PORTRAIT_CROP,
  portraitOrigin,
  portraitScale,
} from "../src/core/portrait";

describe("portrait maths", () => {
  it("uses whole-number scales", () => {
    expect(portraitScale(40)).toBe(4);
    expect(portraitScale(120)).toBe(12);
    expect(portraitScale(5)).toBe(1);
  });
  it("centres the crop in the box", () => {
    const o = portraitOrigin(100, 50, 40);
    expect(o.scale).toBe(4);
    expect(o.x + PORTRAIT_CROP.x * 4).toBe(100);
    expect(o.y + PORTRAIT_CROP.y * 4).toBe(50);
  });
});
