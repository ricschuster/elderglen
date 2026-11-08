import { describe, expect, it } from "vitest";
import { AIM_REACH, aimAt } from "../src/core/aim";

const here = { x: 10, y: 10 };

describe("aimAt", () => {
  it("aims at the cursor tile within reach", () => {
    expect(aimAt(here, { x: 11, y: 10 }, "down")).toEqual({
      tile: { x: 11, y: 10 },
      facing: "right",
    });
    expect(aimAt(here, { x: 9, y: 9 }, "down")).toEqual({
      tile: { x: 9, y: 9 },
      facing: "up",
    });
  });

  it("turns toward a cursor two tiles off instead of reaching it", () => {
    expect(aimAt(here, { x: 12, y: 10 }, "down")).toEqual({
      tile: { x: 11, y: 10 },
      facing: "right",
    });
  });

  it("counts the diagonals as within reach", () => {
    expect(aimAt(here, { x: 11, y: 11 }, "left").tile).toEqual({
      x: 11,
      y: 11,
    });
  });

  it("turns toward a far cursor and takes the next tile on that side", () => {
    expect(aimAt(here, { x: 20, y: 11 }, "up")).toEqual({
      tile: { x: 11, y: 10 },
      facing: "right",
    });
    expect(aimAt(here, { x: 8, y: 2 }, "down")).toEqual({
      tile: { x: 10, y: 9 },
      facing: "up",
    });
    expect(aimAt(here, { x: 3, y: 10 }, "down")).toEqual({
      tile: { x: 9, y: 10 },
      facing: "left",
    });
    expect(aimAt(here, { x: 10, y: 30 }, "up")).toEqual({
      tile: { x: 10, y: 11 },
      facing: "down",
    });
  });

  it("turns vertically on a diagonal tie", () => {
    const far = AIM_REACH + 3;
    expect(aimAt(here, { x: 10 + far, y: 10 + far }, "left").facing).toBe(
      "down",
    );
  });

  it("keeps the facing when the cursor is on the farmer's own tile", () => {
    expect(aimAt(here, here, "left")).toEqual({
      tile: { x: 9, y: 10 },
      facing: "left",
    });
  });

  it("takes a reach of its own", () => {
    expect(aimAt(here, { x: 12, y: 10 }, "down", 1)).toEqual({
      tile: { x: 11, y: 10 },
      facing: "right",
    });
  });
});
