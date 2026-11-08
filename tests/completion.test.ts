import { describe, expect, it } from "vitest";
import {
  RINGS,
  ringProgress,
  shownPercent,
  sumRing,
  valleyPercent,
  type RingDef,
} from "../src/core/completion";
import { MAX_LEVEL, SKILLS } from "../src/core/skills";
import { CROPS } from "../src/core/crops";
import { deserialize, newGame, serialize } from "../src/core/save";

const ring: RingDef = {
  id: "t",
  name: "t",
  categories: [
    { id: "a", name: "a", weight: 60, counter: "a" },
    { id: "b", name: "b", weight: 40, counter: null },
  ],
};

describe("completion total", () => {
  it("has weights that add to 100 in every ring", () => {
    for (const r of RINGS)
      expect(r.categories.reduce((n, c) => n + c.weight, 0)).toBe(100);
  });

  it("shows 99.9 as 99 and 100 only when complete", () => {
    expect(shownPercent(99.9)).toBe(99);
    expect(shownPercent(100)).toBe(100);
    expect(shownPercent(0)).toBe(0);
  });

  it("counts partial progress and treats unbuilt categories as zero", () => {
    const r = sumRing(ring, (c) =>
      c.id === "a" ? { done: 1, total: 2, missing: ["x"] } : undefined,
    );
    expect(r.exact).toBe(30);
    expect(r.percent).toBe(30);
    expect(r.categories[1]!.locked).toBe(true);
    expect(r.categories[0]!.missing).toEqual(["x"]);
  });

  it("takes the valley total as the mean of the rings that exist", () => {
    expect(valleyPercent([{ exact: 100 }, { exact: 50 }])).toBe(75);
    expect(valleyPercent([{ exact: 100 }])).toBe(100);
    expect(valleyPercent([{ exact: 99 }, { exact: 100 }])).toBe(99);
    expect(valleyPercent([])).toBe(0);
  });

  it("starts a new game at zero and rises with skills and shipping", () => {
    const g = newGame();
    expect(ringProgress(g)[0]!.percent).toBe(0);
    g.skills.gain("farming", 100000);
    const skills = ringProgress(g)[0]!.categories.find(
      (c) => c.id === "skills",
    )!;
    expect(skills.done).toBe(MAX_LEVEL);
    expect(skills.points).toBeCloseTo(5 / SKILLS.length, 5);
  });

  it("counts a shipped crop once, whatever the quality", () => {
    const g = newGame();
    const id = CROPS[0]!.id;
    g.inventory.add(id, 1);
    g.bin.ship(g.inventory, id, 1);
    const shipped = () =>
      ringProgress(g)[0]!.categories.find((c) => c.id === "shipped")!;
    expect(shipped().done).toBe(0);
    g.bin.settle(g);
    expect(shipped().done).toBe(1);
  });

  it("locks the categories whose systems are unbuilt", () => {
    const cats = ringProgress(newGame())[0]!.categories;
    for (const id of ["gallery", "slayer", "friends", "elderfruit"])
      expect(cats.find((c) => c.id === id)!.locked, id).toBe(true);
  });

  it("saves the cooked counter and loads old saves without it", () => {
    const g = newGame();
    g.achievements.noteCooked("stew");
    const back = deserialize(serialize(g))!;
    expect(back.achievements.hasCooked("stew")).toBe(true);
    expect(back.achievements.cookedCount).toBe(1);
    const old = JSON.parse(serialize(g));
    delete old.achievements.cooked;
    const loaded = deserialize(JSON.stringify(old))!;
    expect(loaded.achievements.cookedCount).toBe(0);
  });
});

describe("day-end recheck", () => {
  it("reports the new total and its gain after a night that ships", async () => {
    const { sleep } = await import("../src/core/sleep");
    const { reportLines } = await import("../src/core/report");
    const { SHIPPABLE } = await import("../src/core/completion");
    const g = newGame();
    const quiet = sleep(g, [], () => 0);
    expect(quiet.completionGain).toBe(0);
    expect(reportLines(quiet).join(" ")).not.toMatch(/Collections/);
    for (const id of SHIPPABLE) {
      g.inventory.add(id, 1);
      g.bin.ship(g.inventory, id, 1);
    }
    const r = sleep(g, [], () => 0);
    expect(r.completion).toBeGreaterThan(0);
    expect(r.completionGain).toBe(r.completion);
    expect(reportLines(r)).toContain(
      `Collections: ${r.completion} percent complete.`,
    );
  });
});
