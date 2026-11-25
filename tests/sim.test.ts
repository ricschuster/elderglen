import { describe, expect, it } from "vitest";
import { BUNDLES } from "../src/core/bundles";
import { playGame, UNPLAYED_BUNDLES } from "../scripts/sim/bot";
import { PERSONAS } from "../scripts/sim/personas";

/** Same small generator as `scripts/sim/main.ts`, so a run can be repeated. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("headless sim", () => {
  it("repeats exactly for the same seed", () => {
    const expert = PERSONAS.expert!;
    expect(playGame(expert, seeded(3), 30)).toEqual(
      playGame(expert, seeded(3), 30),
    );
  }, 120000);

  it("plays all 30 bundles and fills the early ones in the first season and a half", () => {
    // The whole hall is played now: fishing, animals, cooking, the loom and the Last Seat too.
    expect(UNPLAYED_BUNDLES).toEqual([]);
    const r = playGame(PERSONAS.expert!, seeded(6), 56);
    for (const id of ["spring-foraging", "spring-crops", "dyers"])
      expect(r.bundleDays[id], id).toBeDefined();
    // It spends the day on the new work too: fishing, the herd, the forest trips.
    expect(r.timeBy.fish).toBeGreaterThan(0);
    expect(r.timeBy.forest).toBeGreaterThan(0);
    expect(r.moneyAtSeasonEnd.length).toBeGreaterThanOrEqual(1);
    for (const id of Object.keys(r.bundleDays))
      expect(
        BUNDLES.some((b) => b.id === id),
        id,
      ).toBe(true);
    // Adding a world or an activity to the nights shifts the random stream, so a seed that finished a bundle before may miss it: change the seed, not the bar.
  }, 120000);

  it("has no bundle the bot leaves out", () => {
    for (const id of UNPLAYED_BUNDLES)
      expect(
        BUNDLES.some((b) => b.id === id),
        id,
      ).toBe(true);
    expect(UNPLAYED_BUNDLES).toHaveLength(0);
  });
});
