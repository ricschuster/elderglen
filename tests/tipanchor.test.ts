import { describe, expect, it } from "vitest";
import { isLongPress, tileScreenRect } from "../src/core/tipanchor";

describe("tipanchor", () => {
  it("places a tile on screen from the view corner and zoom", () => {
    expect(tileScreenRect(3, 2, 16, { x: 16, y: 0 }, 2)).toEqual({
      x: 64,
      y: 64,
      w: 32,
      h: 32,
    });
  });
  it("treats a hold of 450 ms as a long press", () => {
    expect(isLongPress(449)).toBe(false);
    expect(isLongPress(450)).toBe(true);
  });
});
