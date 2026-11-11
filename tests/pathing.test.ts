import { describe, expect, it } from "vitest";
import { findPath, planTap, planUse, type Grid } from "../src/core/pathing";

/** A grid from rows: "#" blocks. */
function grid(rows: string[]): Grid {
  return {
    width: rows[0]!.length,
    height: rows.length,
    blocked: (x, y) => rows[y]![x] === "#",
  };
}

describe("findPath", () => {
  it("goes straight over open ground", () => {
    const g = grid(["....", "....", "...."]);
    expect(findPath(g, { x: 0, y: 0 }, { x: 3, y: 0 })).toHaveLength(3);
  });

  it("walks round a wall", () => {
    const g = grid([".#.", ".#.", "..."]);
    const p = findPath(g, { x: 0, y: 0 }, { x: 2, y: 0 })!;
    expect(p).toHaveLength(6);
    expect(p.at(-1)).toEqual({ x: 2, y: 0 });
    expect(p.every((t) => !g.blocked(t.x, t.y))).toBe(true);
  });

  it("is empty on the start tile and undefined with no route", () => {
    const g = grid([".#.", ".#.", ".#."]);
    expect(findPath(g, { x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([]);
    expect(findPath(g, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeUndefined();
  });

  it("refuses a blocked or outside goal, but may start on a blocked tile", () => {
    const g = grid(["..#", "..."]);
    expect(findPath(g, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeUndefined();
    expect(findPath(g, { x: 0, y: 0 }, { x: 9, y: 9 })).toBeUndefined();
    expect(findPath(g, { x: 2, y: 0 }, { x: 0, y: 0 })).toHaveLength(2);
  });
});

describe("planTap", () => {
  const g = grid(["....", ".#..", "...."]);
  const object = (x: number, y: number): boolean => x === 1 && y === 1;

  it("walks to an open tile with nothing to act on", () => {
    const plan = planTap(g, { x: 0, y: 0 }, { x: 3, y: 2 }, object)!;
    expect(plan.act).toBeUndefined();
    expect(plan.path.at(-1)).toEqual({ x: 3, y: 2 });
  });

  it("walks beside an object and acts on it", () => {
    const plan = planTap(g, { x: 0, y: 0 }, { x: 1, y: 1 }, object)!;
    expect(plan.act).toEqual({ x: 1, y: 1 });
    expect(plan.path).toHaveLength(1);
    const end = plan.path.at(-1)!;
    expect(Math.abs(end.x - 1) + Math.abs(end.y - 1)).toBe(1);
  });

  it("gives no plan for a wall that is not an object", () => {
    const wall = grid([".#."]);
    expect(planTap(wall, { x: 0, y: 0 }, { x: 1, y: 0 }, () => false)).toBe(
      undefined,
    );
  });
});

describe("planUse", () => {
  it("walks beside the tile and marks the act as a use", () => {
    const g = grid(["....", "....", "...."]);
    const plan = planUse(g, { x: 0, y: 0 }, { x: 3, y: 0 })!;
    expect(plan.use).toBe(true);
    expect(plan.act).toEqual({ x: 3, y: 0 });
    expect(plan.path.at(-1)).toEqual({ x: 2, y: 0 });
  });

  it("does not walk when already beside the tile", () => {
    const g = grid(["...."]);
    expect(planUse(g, { x: 1, y: 0 }, { x: 2, y: 0 })!.path).toEqual([]);
  });

  it("steps off the tile when the farmer stands on it", () => {
    const g = grid(["..."]);
    const plan = planUse(g, { x: 1, y: 0 }, { x: 1, y: 0 })!;
    expect(plan.path).toHaveLength(1);
  });

  it("is undefined when no side is reachable", () => {
    const g = grid([".#.#.", ".#.#."]);
    expect(planUse(g, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeUndefined();
  });
});
