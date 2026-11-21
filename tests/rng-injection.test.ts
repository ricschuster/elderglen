import { describe, expect, it, vi } from "vitest";
import { startGame } from "../src/core/toolbar";
import { GEODE, crackGeode } from "../src/core/geodes";
import { rngOf, seeded } from "../src/core/rng";
import { deserialize, serialize } from "../src/core/save";

describe("injectable RNG through GameState (issue 977)", () => {
  const crack = (seed: number) => {
    const g = startGame();
    g.rng = seeded(seed);
    g.money = 1000;
    g.inventory.add(GEODE, 5);
    const spy = vi.spyOn(Math, "random");
    const out = Array.from({ length: 5 }, () => crackGeode(g));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    return JSON.stringify(out) + JSON.stringify(g.inventory.save());
  };

  it("the same seed gives the same geode results without Math.random", () => {
    expect(crack(7)).toBe(crack(7));
  });

  it("rngOf falls back to Math.random", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.25);
    expect(rngOf({})()).toBe(0.25);
    spy.mockRestore();
    expect(rngOf({ rng: () => 0.5 })()).toBe(0.5);
  });

  it("the rng is not saved", () => {
    const g = startGame();
    g.rng = () => 0.1;
    expect(serialize(g)).not.toContain("rng");
    expect(deserialize(serialize(g))?.rng).toBeUndefined();
  });
});
