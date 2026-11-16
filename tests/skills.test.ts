import { describe, expect, it } from "vitest";
import {
  MAX_LEVEL,
  Skills,
  harvestXp,
  skillTitle,
  totalLevels,
} from "../src/core/skills";

describe("Skills", () => {
  it("starts at level 0", () => {
    expect(new Skills().level("farming")).toBe(0);
  });

  it("reports a level up only when it happens", () => {
    const s = new Skills();
    expect(s.gain("farming", 99)).toBeUndefined();
    expect(s.gain("farming", 1)).toBe(1);
    expect(s.level("foraging")).toBe(0);
  });

  it("can jump several levels and caps at the maximum", () => {
    const s = new Skills();
    expect(s.gain("foraging", 800)).toBe(3);
    s.gain("foraging", 1_000_000);
    expect(s.level("foraging")).toBe(MAX_LEVEL);
  });

  it("ignores negative gains", () => {
    const s = new Skills();
    s.gain("farming", -50);
    expect(s.xpOf("farming")).toBe(0);
  });

  it("gives more harvest XP for dearer crops", () => {
    expect(harvestXp(35)).toBe(7);
    expect(harvestXp(250)).toBeGreaterThan(harvestXp(35));
  });
});

describe("skillRows", () => {
  it("shows level, xp and the next threshold", async () => {
    const { skillRows, Skills, LEVEL_XP } = await import("../src/core/skills");
    const s = new Skills();
    s.gain("farming", 150);
    const farming = skillRows(s).find((r) => r.skill === "farming")!;
    expect(farming).toEqual({
      skill: "farming",
      level: 1,
      xp: 150,
      next: LEVEL_XP[1],
    });
    s.gain("foraging", 99999);
    expect(
      skillRows(s).find((r) => r.skill === "foraging")!.next,
    ).toBeUndefined();
  });
});

describe("skill title", () => {
  it("steps up by total levels and caps at the last band", () => {
    expect(skillTitle(0)).toBe("Newcomer");
    expect(skillTitle(4)).toBe("Newcomer");
    expect(skillTitle(5)).toBe("Hand");
    expect(skillTitle(50)).toBe("Elder of the Glen");
    expect(skillTitle(999)).toBe("Elder of the Glen");
  });

  it("sums the five levels", () => {
    const s = new Skills();
    s.gain("farming", 100);
    s.gain("mining", 380);
    expect(totalLevels(s)).toBe(3);
  });
});
