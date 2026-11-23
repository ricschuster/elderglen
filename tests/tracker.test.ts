import { describe, expect, it } from "vitest";
import { compassOf, inView, trackerArrows } from "../src/core/tracker";

const view = { left: 10, top: 10, right: 30, bottom: 25 };

describe("tracker arrows", () => {
  it("ignores forage in view", () => {
    expect(trackerArrows([{ x: 15, y: 15 }], view)).toEqual([]);
    expect(inView(view, 10, 10)).toBe(true);
    expect(inView(view, 9, 10)).toBe(false);
  });

  it("points each off-screen spot the right way, nearest first", () => {
    const arrows = trackerArrows(
      [
        { x: 60, y: 17 },
        { x: 20, y: 0 },
        { x: 0, y: 17 },
        { x: 20, y: 60 },
      ],
      view,
    );
    expect(arrows.map((a) => a.compass)).toEqual([
      "north",
      "west",
      "east",
      "south",
    ]);
    const east = arrows.find((a) => a.compass === "east")!;
    expect(east.edgeX).toBeGreaterThan(0.9);
    expect(east.edgeX).toBeLessThan(1);
    expect(east.edgeY).toBeCloseTo(0.5, 1);
    const north = arrows.find((a) => a.compass === "north")!;
    expect(north.edgeY).toBeLessThan(0.1);
  });

  it("names diagonals and caps the count", () => {
    expect(compassOf(Math.PI / 4)).toBe("south-east");
    expect(compassOf(-Math.PI / 2)).toBe("north");
    expect(compassOf(Math.PI)).toBe("west");
    const many = Array.from({ length: 20 }, (_, i) => ({ x: 40 + i, y: 3 }));
    expect(trackerArrows(many, view)).toHaveLength(6);
    expect(trackerArrows(many, view, 2)).toHaveLength(2);
    expect(trackerArrows(many, view)[0]!.x).toBe(40);
  });
});
