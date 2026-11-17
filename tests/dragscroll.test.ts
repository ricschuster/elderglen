import { describe, expect, it } from "vitest";
import { dragFirst, isDrag } from "../src/core/dragscroll";

describe("dragscroll", () => {
  it("treats small movement as a tap", () => {
    expect(isDrag(2, 3)).toBe(false);
    expect(isDrag(0, 12)).toBe(true);
  });
  it("scrolls down when the finger moves up", () => {
    expect(dragFirst(0, -88, 44, 39, 7)).toBe(2);
    expect(dragFirst(5, 88, 44, 39, 7)).toBe(3);
  });
  it("clamps to the list", () => {
    expect(dragFirst(30, -4000, 44, 39, 7)).toBe(32);
    expect(dragFirst(1, 4000, 44, 39, 7)).toBe(0);
    expect(dragFirst(0, -400, 44, 3, 7)).toBe(0);
  });
});
