import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { chop, plantTree } from "../src/core/actions";
import { itemById } from "../src/core/items";
import { START } from "../src/core/maps";
import { TREE_SEED_IDS, kindOfSeed, seedOfKind } from "../src/core/mahogany";
import { newGame } from "../src/core/save";
import { swingsToFell } from "../src/core/trees";
import { MATURE_STAGE, SEED_STAGE } from "../src/core/trees";

const farm = maps.get(START.map);
const spot = farm.tillableTiles()[0]!;

describe("tree seeds by kind (#396, note 36)", () => {
  it("names the four seeds: Acorn, Maple seed, Pine cone, Mahogany seed", () => {
    expect(itemById("tree-seed")?.name).toBe("Acorn");
    expect(itemById("maple-seed")?.name).toBe("Maple seed");
    expect(itemById("pine-cone")?.name).toBe("Pine cone");
    expect(TREE_SEED_IDS).toHaveLength(4);
    expect(seedOfKind("maple")).toBe("maple-seed");
    expect(seedOfKind("pine")).toBe("pine-cone");
    expect(seedOfKind("oak")).toBeUndefined();
    expect(kindOfSeed("pine-cone")).toBe("pine");
    expect(kindOfSeed("tree-seed")).toBeUndefined();
  });

  it("plants a maple seed and a pine cone as their kinds, and the acorn as an oak", () => {
    const g = newGame();
    g.inventory.add("maple-seed");
    g.inventory.add("pine-cone");
    g.inventory.add("tree-seed");
    const tiles = farm.tillableTiles();
    const free = tiles.filter((t) => !g.trees.at(t.x, t.y)).slice(0, 3);
    for (const [i, id] of ["maple-seed", "pine-cone", "tree-seed"].entries()) {
      const t = free[i]!;
      expect(plantTree(g, farm, t.x, t.y, id).ok, id).toBe(true);
    }
    expect(g.trees.at(free[0]!.x, free[0]!.y)?.kind).toBe("maple");
    expect(g.trees.at(free[1]!.x, free[1]!.y)?.kind).toBe("pine");
    expect(g.trees.at(free[2]!.x, free[2]!.y)?.kind).toBeUndefined();
    expect(g.trees.at(free[0]!.x, free[0]!.y)?.stage).toBe(SEED_STAGE);
  });

  it("gives the seed of its own kind when a mature tree is felled", () => {
    for (const [kind, seed] of [
      ["maple", "maple-seed"],
      ["pine", "pine-cone"],
    ] as const) {
      const g = newGame();
      g.skills.gain("foraging", 100000);
      g.trees.add(spot.x, spot.y, MATURE_STAGE);
      g.trees.at(spot.x, spot.y)!.kind = kind;
      for (let i = 0; i < swingsToFell(0); i++)
        chop(g, spot.x, spot.y, () => 0.99);
      expect(g.inventory.count("tree-seed"), kind).toBe(0);
      expect(g.inventory.count(seed), kind).toBeGreaterThan(0);
    }
  });
});

describe("spreading", () => {
  it("a pine's seedling grows into a pine", () => {
    const g = newGame();
    for (const t of [...g.trees.each()]) g.trees.remove(t.x, t.y);
    g.trees.add(spot.x, spot.y, MATURE_STAGE);
    g.trees.at(spot.x, spot.y)!.kind = "pine";
    // Roll 0 spreads every night, and the spot is one of the offsets around the tree.
    for (let n = 0; n < 6; n++)
      g.trees.endDay(
        "spring",
        () => 0,
        () => true,
      );
    const kids = [...g.trees.each()].filter(
      (t) => t.x !== spot.x || t.y !== spot.y,
    );
    expect(kids.length).toBeGreaterThan(0);
    for (const k of kids) expect(k.kind).toBe("pine");
  });
});
