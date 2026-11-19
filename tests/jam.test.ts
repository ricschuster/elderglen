import { describe, expect, it } from "vitest";
import { JAM_BLOCK_MS, JAM_PASS_MS, JamTracker } from "../src/core/jam";

/** Ticks until passing begins; returns elapsed ms, or -1. */
function runUntilPass(
  t: JamTracker,
  id: string,
  dt: number,
  max = 5000,
): number {
  for (let el = dt; el <= max; el += dt) {
    t.tick(dt, [id]);
    if (t.isPassing(id)) return el;
  }
  return -1;
}

describe("JamTracker", () => {
  it("never jams when not blocked", () => {
    const t = new JamTracker();
    for (let i = 0; i < 1000; i++) t.tick(16, []);
    expect(t.isPassing("b")).toBe(false);
  });

  it("starts passing only after the block time", () => {
    const t = new JamTracker();
    for (let i = 0; i < 31; i++) t.tick(16, ["b"]); // 496 ms
    expect(t.isPassing("b")).toBe(false);
    t.tick(16, ["b"]); // 512 ms
    expect(t.isPassing("b")).toBe(true);
  });

  it("passes for the window then solid again", () => {
    const t = new JamTracker();
    t.tick(JAM_BLOCK_MS, ["b"]);
    expect(t.isPassing("b")).toBe(true);
    t.tick(JAM_PASS_MS - 1, ["b"]);
    expect(t.isPassing("b")).toBe(true);
    t.tick(1, ["b"]);
    expect(t.isPassing("b")).toBe(false);
  });

  it("a still-stuck pair needs a fresh block time after the window", () => {
    const t = new JamTracker();
    t.tick(JAM_BLOCK_MS, ["b"]);
    t.tick(JAM_PASS_MS, ["b"]);
    t.tick(JAM_BLOCK_MS - 1, ["b"]);
    expect(t.isPassing("b")).toBe(false);
    t.tick(1, ["b"]);
    expect(t.isPassing("b")).toBe(true);
  });

  it("separating resets the timer", () => {
    const t = new JamTracker();
    t.tick(400, ["b"]);
    t.tick(16, []);
    t.tick(400, ["b"]);
    expect(t.isPassing("b")).toBe(false);
    t.tick(100, ["b"]);
    expect(t.isPassing("b")).toBe(true);
  });

  it("passing continues even if blocking stops being reported", () => {
    const t = new JamTracker();
    t.tick(JAM_BLOCK_MS, ["b"]);
    t.tick(500, []);
    expect(t.isPassing("b")).toBe(true);
  });

  it("two-way: both clients pass at the same time", () => {
    const a = new JamTracker();
    const b = new JamTracker();
    for (let i = 0; i < 40; i++) {
      a.tick(16, ["b"]);
      b.tick(16, ["a"]);
    }
    expect(a.isPassing("b")).toBe(true);
    expect(b.isPassing("a")).toBe(true);
  });

  it("three players: tracked per player", () => {
    const t = new JamTracker();
    t.tick(400, ["b", "c"]);
    t.tick(100, ["b"]); // c separated at 400
    expect(t.isPassing("b")).toBe(true);
    expect(t.isPassing("c")).toBe(false);
    t.tick(100, ["c"]); // c restarts from zero
    expect(t.isPassing("c")).toBe(false);
    t.tick(400, ["c"]);
    expect(t.isPassing("c")).toBe(true);
  });

  it("is independent of tick rate", () => {
    const f = runUntilPass(new JamTracker(), "b", 16);
    const s = runUntilPass(new JamTracker(), "b", 100);
    expect(f).toBeGreaterThanOrEqual(JAM_BLOCK_MS);
    expect(f - JAM_BLOCK_MS).toBeLessThan(16);
    expect(s).toBe(JAM_BLOCK_MS);
  });

  it("window end does not drift with frame time", () => {
    for (const dt of [16, 100]) {
      const t = new JamTracker();
      let start = -1;
      let end = -1;
      for (let el = dt; el < 3000; el += dt) {
        t.tick(dt, ["b"]);
        if (start < 0 && t.isPassing("b")) start = el;
        if (start >= 0 && end < 0 && !t.isPassing("b")) end = el;
      }
      expect(Math.abs(end - (JAM_BLOCK_MS + JAM_PASS_MS))).toBeLessThanOrEqual(
        dt,
      );
    }
  });
});
