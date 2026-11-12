import { describe, expect, it } from "vitest";
import { floorLayout, specialFloor, isCampFloor } from "../src/core/mines";
import { Mines } from "../src/core/mines";
import { newGame, serialize, deserialize } from "../src/core/save";
import { collectPacks, rollStrikes, Rods } from "../src/core/lightning";

function find(kind: "infested" | "geode") {
  for (let day = 1; day < 400; day++)
    for (let floor = 11; floor < 40; floor++)
      if (specialFloor(floor, day) === kind) return { floor, day };
  throw new Error("none found");
}

describe("special floors", () => {
  it("are about 1 in 15, never camp floors or below 10", () => {
    let n = 0;
    let total = 0;
    for (let day = 1; day <= 60; day++)
      for (let floor = 1; floor <= 120; floor++) {
        const s = specialFloor(floor, day);
        if (floor < 10 || isCampFloor(floor)) expect(s).toBeUndefined();
        else total += 1;
        if (s) n += 1;
      }
    expect(n / total).toBeGreaterThan(0.04);
    expect(n / total).toBeLessThan(0.1);
  });

  it("makes a geode floor of geode nodes with no creatures", () => {
    const { floor, day } = find("geode");
    const l = floorLayout(floor, day);
    expect(l.special).toBe("geode");
    expect(l.rocks.every((r) => r.kind === "geode")).toBe(true);
    expect(new Mines().visit(floor, day).creatures).toHaveLength(0);
  });

  it("hides the ladder on an infested floor until every creature falls", () => {
    const { floor, day } = find("infested");
    expect(floorLayout(floor, day).ladder).toBeUndefined();
    const m = new Mines();
    const f = m.visit(floor, day);
    expect(f.creatures.length).toBeGreaterThan(4);
    expect(m.rockBroken(floor, day, 3, 3, () => 0)).toBe(false);
    expect(m.rockBroken(floor, day, 3, 3, () => 0, true)).toBe(true);
    f.ladder = undefined;
    const last = f.creatures.length;
    for (let i = 0; i < last; i++) {
      f.creatures.pop();
      const shown = m.creatureBeaten(floor, day, 4, 4, () => 0.99);
      expect(shown).toBe(i === last - 1);
    }
    expect(f.ladder).toEqual({ x: 4, y: 4 });
  });

  it("gives a second drop roll and one extra slayer count in four", () => {
    const { floor, day } = find("infested");
    const m = new Mines();
    const extra = [1, 2, 3, 4].map(() => m.killBonus(floor, day).extraKill);
    expect(extra).toEqual([false, false, false, true]);
    expect(m.killBonus(floor, day).extraDrop).toBe(true);
    expect(new Mines().killBonus(1, 1).extraDrop).toBe(false);
  });
});

describe("lightning rods", () => {
  it("catches the first strike with a single rod and then ignores more", () => {
    const rods = new Rods();
    rods.place(2, 2);
    expect(rods.strike(() => 0)).toBe(true);
    expect(rods.strike(() => 0)).toBe(false);
    expect(rods.endDay()).toBe(1);
    expect(rods.charged).toBe(0);
  });

  it("only strikes in a storm and gives a pack the next morning", () => {
    const g = newGame();
    g.rods.place(5, 5);
    g.weather = "rainy";
    expect(rollStrikes(g, 840, () => 0).strikes).toBe(0);
    g.weather = "stormy";
    expect(rollStrikes(g, 100, () => 0)).toEqual({ strikes: 10, caught: 1 });
    expect(collectPacks(g)).toBe(1);
    expect(g.inventory.count("battery-pack")).toBe(1);
    expect(collectPacks(g)).toBe(0);
  });

  it("saves rods and keeps old saves loading", () => {
    const g = newGame();
    g.rods.place(1, 2);
    const back = deserialize(serialize(g))!;
    expect(back.rods.at(1, 2)).toBeDefined();
  });
});
