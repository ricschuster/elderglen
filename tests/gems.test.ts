import { describe, expect, it } from "vitest";
import { drops, mine, ROCK_XP } from "../src/core/mining";
import {
  GEMS,
  GEM_ITEMS,
  GLIMMERSTONE,
  QUARRY_GEM_SHARE,
  gemDrop,
  gemShare,
  gemXp,
} from "../src/core/gems";
import { rockKindAt } from "../src/core/mines";
import { itemById } from "../src/core/items";
import { SPAWN_TABLES } from "../src/core/spawns";
import { swingsToBreak } from "../src/core/rocks";
import { newGame } from "../src/core/save";

describe("gem data (note 69)", () => {
  it("has six gems in three bands priced 50 to 750, all items", () => {
    expect(GEMS).toHaveLength(6);
    expect(GEMS.map((g) => g.minFloor)).toEqual([1, 1, 41, 41, 81, 81]);
    expect(Math.min(...GEMS.map((g) => g.sellPrice))).toBe(50);
    expect(Math.max(...GEMS.map((g) => g.sellPrice))).toBe(750);
    for (const g of GEM_ITEMS)
      expect(itemById(g.id)?.sellPrice).toBe(g.sellPrice);
  });
  it("shares rise by band: 1.5, 2.5 and 3.5 percent", () => {
    expect([gemShare(10), gemShare(50), gemShare(90)]).toEqual([
      0.015, 0.025, 0.035,
    ]);
    expect(QUARRY_GEM_SHARE).toBe(0.005);
    expect(SPAWN_TABLES["quarry"]!.kinds.some((k) => k.kind === "gem")).toBe(
      true,
    );
  });
  it("makes gem nodes part of the floor's rocks", () => {
    expect(rockKindAt(10, 0.999)).toBe("stone");
    const seen = new Set<string>();
    for (let r = 0; r < 1; r += 0.0005) seen.add(rockKindAt(50, r));
    expect(seen.has("gem")).toBe(true);
  });
});

describe("gem drops", () => {
  it("offers only the low gems above floor 41", () => {
    for (let r = 0; r < 1; r += 0.05)
      expect(["gem-low-a", "gem-low-b"]).toContain(gemDrop(20, () => r));
  });
  it("opens the mid and high gems by depth", () => {
    expect(gemDrop(50, () => 0.99)).toBe("gem-mid-b");
    expect(gemDrop(85, () => 0.99)).toBe("gem-high-b");
  });
  it("gives the Glimmerstone only from floor 100, by its chance", () => {
    expect(gemDrop(99, () => 0)).not.toBe(GLIMMERSTONE.id);
    expect(gemDrop(100, () => 0)).toBe(GLIMMERSTONE.id);
    expect(gemDrop(110, () => GLIMMERSTONE.chance)).not.toBe(GLIMMERSTONE.id);
  });
  it("does not depend on mining level", () => {
    const a = drops("gem", 0, false, () => 0.3, 60);
    const b = drops("gem", 10, true, () => 0.3, 60);
    expect(a).toEqual(b);
  });
  it("takes a geode node's swings and gives more experience than a plain rock", () => {
    for (let t = 0; t < 5; t++)
      expect(swingsToBreak("gem", t)).toBe(swingsToBreak("geode", t));
    expect(ROCK_XP.gem).toBeGreaterThan(ROCK_XP.stone);
    expect(gemXp("gem-low-a")).toBeLessThan(gemXp("gem-mid-a"));
    expect(gemXp("gem-mid-a")).toBeLessThan(gemXp("gem-high-a"));
    expect(gemXp(GLIMMERSTONE.id)).toBeGreaterThan(gemXp("gem-high-b"));
  });
});

describe("breaking a gem node", () => {
  it("drops the gem and gives its experience", () => {
    const g = newGame();
    g.mines.visit(50, 1).rocks.add(2, 2, "gem");
    const rocks = g.mines.visit(50, 1).rocks;
    let r = mine(g, 2, 2, 50, () => 0.99);
    for (let i = 0; i < 5 && rocks.at(2, 2); i++)
      r = mine(g, 2, 2, 50, () => 0.99);
    expect(r.ok && r.item).toBe("gem-mid-b");
    expect(g.inventory.count("gem-mid-b")).toBe(1);
  });
  it("Rockhound turns up a gem from plain rock as often as nodes show", () => {
    const g = newGame();
    g.day.clock.day = 5;
    g.skills.gain("mining", 100000);
    g.skills.setProfession("mining", "rockhound");
    g.mines.visit(50, 5).rocks.add(2, 2, "stone");
    mine(g, 2, 2, 50, () => 0);
    mine(g, 2, 2, 50, () => 0);
    expect(g.inventory.count("gem-low-a")).toBe(1);
  });
});
