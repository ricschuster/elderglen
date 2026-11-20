import { describe, expect, it } from "vitest";
import {
  planReveal,
  REVEAL_LEG_MAX_MS,
  REVEAL_LEG_MIN_MS,
  standTile,
} from "../src/core/feastreveal";

const all = () => true;

describe("feast reveal walk", () => {
  it("stands below the recipient when free, facing up", () => {
    const s = standTile({ x: 5, y: 5 }, { x: 5, y: 9 }, all);
    expect(s).toEqual({ tile: { x: 5, y: 6 }, facing: "up" });
  });

  it("picks the nearest free side when below is blocked", () => {
    const free = (x: number, y: number) => !(x === 5 && y === 6);
    const s = standTile({ x: 5, y: 5 }, { x: 9, y: 5 }, free);
    expect(s).toEqual({ tile: { x: 6, y: 5 }, facing: "left" });
  });

  it("returns undefined when all sides are taken", () => {
    expect(standTile({ x: 5, y: 5 }, { x: 1, y: 1 }, () => false)).toBe(
      undefined,
    );
  });

  it("counts the giver's own seat as free", () => {
    const s = standTile({ x: 5, y: 5 }, { x: 5, y: 6 }, () => false);
    expect(s?.tile).toEqual({ x: 5, y: 6 });
  });

  it("plans a short walk out, a pause and the same walk back", () => {
    const p = planReveal({ x: 2, y: 2 }, { x: 12, y: 8 }, all)!;
    expect(p.there.duration).toBeLessThanOrEqual(REVEAL_LEG_MAX_MS);
    expect(p.back.to).toEqual({ x: 2, y: 2 });
    expect(p.total).toBe(p.there.duration + p.pause + p.back.duration);
    expect(p.total).toBeLessThan(4000);
  });

  it("keeps a one-tile walk from being instant", () => {
    const p = planReveal({ x: 5, y: 7 }, { x: 5, y: 5 }, all)!;
    expect(p.there.duration).toBeGreaterThanOrEqual(REVEAL_LEG_MIN_MS);
  });
});
