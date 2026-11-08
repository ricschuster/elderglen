import { describe, expect, it } from "vitest";
import { chop, plantTree, shake, till } from "../src/core/actions";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { deserialize, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { startGame, heldAt } from "../src/core/toolbar";
import { act, useHeld } from "../src/core/tools";
import {
  Trees,
  SPREAD_CHANCE,
  swingsToFell,
  swingsToUproot,
} from "../src/core/trees";

const never = () => 0.99;
const always = () => 0;

/** A 10x1 open map with a path at x 9 and trees listed by the caller. */
function mapWithTrees(
  trees: { x: number; stage?: number }[] = [],
  rows = 1,
): FarmMap {
  const layer = (name: string, data: number[]) => ({
    name,
    type: "tilelayer",
    data,
  });
  const json: TiledMapJson = {
    width: 10,
    height: rows,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", new Array(10 * rows).fill(0)),
      layer("soil", new Array(10 * rows).fill(1)),
      layer("paths", [
        ...[0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        ...new Array(10 * (rows - 1)).fill(0),
      ]),
      {
        name: "markers",
        type: "objectgroup",
        objects: [
          { name: "start", class: "entry", x: 0, y: 0 },
          ...trees.map((t) => ({
            name: "tree",
            class: "tree",
            x: t.x * 16,
            y: 0,
            properties: [{ name: "stage", value: t.stage ?? 5 }],
          })),
        ],
      },
    ],
  };
  return FarmMap.fromTiled(json);
}

function game(trees: { x: number; y: number; stage: number }[]) {
  const g = startGame();
  g.trees.load([]);
  for (const t of trees) g.trees.add(t.x, t.y, t.stage);
  return g;
}

describe("chop", () => {
  it("fells a mature tree in 5 swings and leaves a stump", () => {
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    for (let i = 0; i < swingsToFell(0) - 1; i++) {
      expect(chop(g, 1, 0).ok).toBe(true);
      expect(g.inventory.count("wood")).toBe(0);
    }
    expect(chop(g, 1, 0, never).ok).toBe(true);
    expect(g.inventory.count("wood")).toBe(12);
    expect(g.inventory.count("sap")).toBe(5);
    expect(g.trees.at(1, 0)?.stump).toBe(true);
    expect(g.skills.xpOf("foraging")).toBe(12);
  });

  it("gives up to 4 more wood by foraging level, and seeds from level 1", () => {
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    g.skills.gain("foraging", 100000);
    for (let i = 0; i < swingsToFell(0); i++) chop(g, 1, 0, always);
    expect(g.inventory.count("wood")).toBe(16);
    expect(g.inventory.count("tree-seed")).toBe(0);
    const h = game([{ x: 1, y: 0, stage: 5 }]);
    h.skills.gain("foraging", 100);
    for (let i = 0; i < swingsToFell(0); i++) chop(h, 1, 0, never);
    expect(h.inventory.count("wood")).toBe(13);
    expect(h.inventory.count("tree-seed")).toBe(2);
  });

  it("uproots a stump for wood and sap, and frees the tile", () => {
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    for (let i = 0; i < swingsToFell(0); i++) chop(g, 1, 0, never);
    const wood = g.inventory.count("wood");
    for (let i = 0; i < swingsToUproot(0); i++) chop(g, 1, 0, always);
    expect(g.inventory.count("wood")).toBe(wood + 4);
    expect(g.inventory.count("sap")).toBe(6);
    expect(g.trees.at(1, 0)).toBeUndefined();
  });

  it("fells a young tree in one swing and clears a seedling", () => {
    const g = game([
      { x: 1, y: 0, stage: 4 },
      { x: 3, y: 0, stage: 2 },
      { x: 5, y: 0, stage: 1 },
    ]);
    expect(chop(g, 1, 0).ok).toBe(true);
    expect(g.inventory.count("wood")).toBe(4);
    expect(chop(g, 3, 0, never).ok).toBe(true);
    expect(g.inventory.count("wood")).toBe(4);
    expect(g.trees.count).toBe(1);
    // A seed lifts only for a forager.
    chop(g, 5, 0);
    expect(g.inventory.count("tree-seed")).toBe(0);
  });

  it("costs energy per swing and refuses once the day is over", () => {
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    const before = g.day.energy.current;
    chop(g, 1, 0);
    expect(g.day.energy.current).toBe(before - 2);
    g.day.energy.current = 0;
    expect(chop(g, 1, 0)).toEqual({ ok: false, reason: "exhausted" });
    expect(chop(g, 5, 0).ok).toBe(false);
  });

  it("puts what does not fit on the ground, and pulls it in when there is room", () => {
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk-${i}`, 1);
    for (let i = 0; i < swingsToFell(0); i++) chop(g, 1, 0, never);
    expect(g.inventory.count("wood")).toBe(0);
    expect(g.trees.at(1, 0)?.stump).toBe(true);
    const wood = g.ground.at(1, 0).find((p) => p.id === "wood");
    expect(wood?.count).toBe(12);
    // Out of reach, then in reach, but still no room.
    expect(g.ground.collect(g.inventory, { x: 5, y: 0 }, 1)).toBe(false);
    expect(g.ground.collect(g.inventory, { x: 2, y: 0 }, 1)).toBe(false);
    g.inventory.remove("junk-0");
    expect(g.ground.collect(g.inventory, { x: 2, y: 0 }, 1)).toBe(true);
    expect(
      g.inventory.count("wood") + g.inventory.count("sap"),
    ).toBeGreaterThan(0);
  });

  it("drops beside the tree when a map is given", () => {
    const g = game([{ x: 5, y: 5, stage: 4 }]);
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk-${i}`, 1);
    chop(g, 5, 5, never, mapWithTrees([], 10));
    const piles = g.ground.each();
    expect(piles).toHaveLength(1);
    expect(piles[0]).toMatchObject({ id: "wood", count: 4 });
    expect(Math.max(Math.abs(piles[0]!.x - 5), Math.abs(piles[0]!.y - 5))).toBe(
      1,
    );
  });

  it("takes 10 swings for a tree and 5 for a stump at tier 0", () => {
    expect(swingsToFell(0)).toBe(10);
    expect(swingsToUproot(0)).toBe(5);
    expect([0, 1, 2, 3, 4].map(swingsToFell)).toEqual([10, 8, 6, 4, 2]);
    expect([0, 1, 2, 3, 4].map(swingsToUproot)).toEqual([5, 4, 3, 2, 1]);
  });
});

describe("tree tools", () => {
  it("blocks the hoe, and the axe picks the tree", () => {
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    const map = mapWithTrees();
    expect(till(g, 1, 0)).toEqual({
      ok: false,
      reason: "a tree is in the way",
    });
    expect(useHeld(g, map, { kind: "tool", tool: "axe" }, 1, 0).ok).toBe(true);
    expect(useHeld(g, map, { kind: "tool", tool: "axe" }, 4, 0)).toEqual({
      ok: false,
      reason: "nothing to chop",
    });
  });

  it("lets the hoe and can lift a seedling, and the hoe a planted seed", () => {
    const g = game([
      { x: 1, y: 0, stage: 2 },
      { x: 3, y: 0, stage: 1 },
      { x: 5, y: 0, stage: 4 },
    ]);
    const map = mapWithTrees();
    const hoe = { kind: "tool", tool: "hoe" } as const;
    const can = { kind: "tool", tool: "can" } as const;
    expect(useHeld(g, map, can, 3, 0).ok).toBe(false); // the can leaves a seed
    expect(g.trees.at(3, 0)).toBeDefined();
    expect(useHeld(g, map, can, 1, 0).ok).toBe(true);
    expect(g.trees.at(1, 0)).toBeUndefined();
    g.skills.gain("foraging", 100);
    expect(useHeld(g, map, hoe, 3, 0).ok).toBe(true);
    expect(g.inventory.count("tree-seed")).toBe(1);
    expect(useHeld(g, map, hoe, 5, 0)).toEqual({
      ok: false,
      reason: "a tree is in the way",
    });
  });

  it("shakes a loose seed down with Action, once", () => {
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    expect(shake(g, 1, 0).ok).toBe(false);
    g.trees.at(1, 0)!.seed = true;
    const map = mapWithTrees();
    expect(act(g, map, 1, 0).ok).toBe(true);
    expect(g.inventory.count("tree-seed")).toBe(1);
    expect(shake(g, 1, 0).ok).toBe(false);
  });

  it("plants a tree seed on open ground only", () => {
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    const map = mapWithTrees();
    expect(plantTree(g, map, 3, 0)).toEqual({ ok: false, reason: "no seeds" });
    g.inventory.add("tree-seed", 4);
    expect(plantTree(g, map, 3, 0).ok).toBe(true);
    expect(g.trees.at(3, 0)?.stage).toBe(1);
    expect(plantTree(g, map, 3, 0).ok).toBe(false); // taken
    expect(plantTree(g, map, 9, 0).ok).toBe(false); // path
    expect(plantTree(g, map, 0, 0).ok).toBe(false); // entry
    g.farm.till(5, 0);
    expect(plantTree(g, map, 5, 0).ok).toBe(false); // tilled
    expect(g.inventory.count("tree-seed")).toBe(3);
    const seeds = { kind: "item", id: "tree-seed", count: 3 } as const;
    expect(useHeld(g, map, seeds, 6, 0).ok).toBe(true);
  });

  it("walks past a seed but not a sapling or a stump", () => {
    const t = new Trees([
      { x: 0, y: 0, stage: 1 },
      { x: 1, y: 0, stage: 2 },
      { x: 2, y: 0, stage: 5 },
    ]);
    expect(t.blocks(0, 0)).toBe(false);
    expect(t.blocks(1, 0)).toBe(true);
    expect(t.blocks(2, 0)).toBe(true);
    t.at(2, 0)!.stump = true;
    expect(t.blocks(2, 0)).toBe(true);
    expect(heldAt(startGame(), 2)).toEqual({ kind: "tool", tool: "axe" });
  });
});

describe("Trees.endDay", () => {
  const open = () => true;

  it("grows a stage with the chance, and stage 4 only half as often", () => {
    const t = new Trees([
      { x: 0, y: 0, stage: 2 },
      { x: 5, y: 0, stage: 4 },
    ]);
    t.endDay(
      "spring",
      () => 0.15,
      () => false,
    );
    expect(t.at(0, 0)?.stage).toBe(3);
    expect(t.at(5, 0)?.stage).toBe(4);
    t.endDay(
      "spring",
      () => 0.05,
      () => false,
    );
    expect(t.at(5, 0)?.stage).toBe(5);
  });

  it("does not grow in winter, nor past a mature neighbour", () => {
    const t = new Trees([{ x: 0, y: 0, stage: 2 }]);
    t.endDay("winter" as "spring", always, () => false);
    expect(t.at(0, 0)?.stage).toBe(2);
    const u = new Trees([
      { x: 0, y: 0, stage: 4 },
      { x: 1, y: 1, stage: 5 },
    ]);
    u.endDay(
      "spring",
      () => 0.01,
      () => false,
    );
    expect(u.at(0, 0)?.stage).toBe(4);
  });

  it("spreads a seed within 3 tiles, onto allowed tiles only", () => {
    const t = new Trees([{ x: 5, y: 5, stage: 5 }]);
    // 0 picks the 15 percent spread and the far corner (-3, -3).
    t.endDay("spring", always, open);
    expect(t.at(2, 2)?.stage).toBe(1);
    const u = new Trees([{ x: 5, y: 5, stage: 5 }]);
    u.endDay("spring", always, () => false);
    expect(u.count).toBe(1);
    const v = new Trees([{ x: 5, y: 5, stage: 5 }]);
    v.endDay("spring", () => SPREAD_CHANCE + 0.01, open);
    expect(v.count).toBe(1);
  });

  it("never spreads from a stump or a seedling, and a new seed waits a night", () => {
    const t = new Trees([
      { x: 5, y: 5, stage: 5 },
      { x: 8, y: 8, stage: 3 },
    ]);
    t.at(5, 5)!.stump = true;
    t.endDay("spring", always, open);
    expect(t.count).toBe(2);
  });

  it("resets the swing count overnight", () => {
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    chop(g, 1, 0);
    expect(g.trees.at(1, 0)?.hits).toBe(1);
    sleep(g, [], never);
    expect(g.trees.at(1, 0)?.hits).toBe(0);
  });
});

describe("sleep with a map", () => {
  it("spreads seeds only with a map, and keeps forage off trees", () => {
    const g = game([{ x: 5, y: 5, stage: 5 }]);
    sleep(g, [], always);
    expect(g.trees.count).toBe(1);
    sleep(g, [{ x: 2, y: 2 }], always, mapWithTrees([], 10));
    expect(g.trees.count).toBeGreaterThan(1);
    expect(g.trees.at(2, 2)?.stage).toBe(1);
    expect(g.forage.itemAt(2, 2)).toBeUndefined();
  });
});

describe("saving", () => {
  it("round trips trees, and starts old saves with the map's trees", () => {
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    chop(g, 1, 0);
    g.trees.at(1, 0)!.seed = true;
    g.ground.drop(2, 0, "wood", 7);
    const back = deserialize(serialize(g))!;
    expect(back.trees.save()).toEqual(g.trees.save());
    expect(back.ground.save()).toEqual([{ x: 2, y: 0, id: "wood", count: 7 }]);
    const old = JSON.parse(serialize(g));
    delete old.trees;
    delete old.ground;
    const fresh = deserialize(JSON.stringify(old))!;
    expect(fresh.ground.count).toBe(0);
    expect(fresh.trees.count).toBeGreaterThan(20);
  });
});

describe("the map", () => {
  it("reads tree objects with a stage and checks them", () => {
    const m = mapWithTrees([{ x: 2 }, { x: 4, stage: 2 }]);
    expect(m.trees).toEqual([
      { x: 2, y: 0, stage: 5 },
      { x: 4, y: 0, stage: 2 },
    ]);
    expect(m.problems()).toEqual([]);
    expect(mapWithTrees([{ x: 9 }]).problems()).toHaveLength(1); // on a path
    expect(mapWithTrees([{ x: 2 }, { x: 2 }]).problems()).toHaveLength(1);
    expect(mapWithTrees([{ x: 2, stage: 6 }]).problems()).toHaveLength(1);
  });
});

describe("moss on a tree", () => {
  it("any tool or the hand gathers it instead of chopping", () => {
    for (const tool of ["axe", "hoe", "can", "pickaxe"] as const) {
      const map = mapWithTrees([{ x: 1 }]);
      const g = game([{ x: 1, y: 0, stage: 5 }]);
      g.trees.at(1, 0)!.moss = true;
      expect(useHeld(g, map, { kind: "tool", tool }, 1, 0).ok).toBe(true);
      expect(g.inventory.count("moss")).toBeGreaterThan(0);
      expect(g.trees.at(1, 0)?.stump).toBe(false);
      expect(g.trees.at(1, 0)?.hits).toBe(0);
    }
    const map = mapWithTrees([{ x: 1 }]);
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    g.trees.at(1, 0)!.moss = true;
    expect(act(g, map, 1, 0).ok).toBe(true);
    expect(g.inventory.count("moss")).toBeGreaterThan(0);
  });

  it("the axe chops a bare tree as before", () => {
    const map = mapWithTrees([{ x: 1 }]);
    const g = game([{ x: 1, y: 0, stage: 5 }]);
    useHeld(g, map, { kind: "tool", tool: "axe" }, 1, 0);
    expect(g.trees.at(1, 0)?.hits).toBe(1);
    expect(g.inventory.count("moss")).toBe(0);
  });
});
