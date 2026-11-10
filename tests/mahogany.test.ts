import { describe, expect, it } from "vitest";
import { chop, plantTree, shake } from "../src/core/actions";
import { itemById } from "../src/core/items";
import {
  MAHOGANY_SEED,
  MAHOGANY_STAGE_CHANCE,
  MAHOGANY_YOUNG_CHANCE,
  STUMP_SEED_CHANCE,
} from "../src/core/mahogany";
import { enterArea } from "../src/core/areas";
import { FarmMap, TREE_KINDS, type TiledMapJson } from "../src/core/map";
import { maps } from "../src/content/maps";
import { deserialize, serialize } from "../src/core/save";
import { startGame } from "../src/core/toolbar";
import { useHeld } from "../src/core/tools";
import { Trees, SPREAD_CHANCE } from "../src/core/trees";

const always = () => 0;

function openMap(): FarmMap {
  const layer = (name: string, data: number[]) => ({
    name,
    type: "tilelayer",
    data,
  });
  const json: TiledMapJson = {
    width: 10,
    height: 10,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", new Array(100).fill(0)),
      layer("soil", new Array(100).fill(1)),
      {
        name: "markers",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  };
  return FarmMap.fromTiled(json);
}

function mahoganyGame(stage: number) {
  const g = startGame();
  g.trees = new Trees([{ x: 3, y: 3, stage }]);
  g.trees.at(3, 3)!.kind = "mahogany";
  return g;
}

describe("Mahogany seed item (note 36)", () => {
  it("is an item and not a map kind", () => {
    expect(itemById(MAHOGANY_SEED)?.name).toBe("Mahogany Seed");
    expect(TREE_KINDS).not.toContain("mahogany");
  });
});

describe("planting Mahogany", () => {
  it("plants a Mahogany seedling from the held seed", () => {
    const g = startGame();
    g.inventory.add(MAHOGANY_SEED, 1);
    const map = openMap();
    expect(plantTree(g, map, 4, 4, MAHOGANY_SEED).ok).toBe(true);
    expect(g.trees.at(4, 4)?.kind).toBe("mahogany");
    expect(g.inventory.count(MAHOGANY_SEED)).toBe(0);
  });

  it("is planted by using the held seed", () => {
    const g = startGame();
    g.inventory.add(MAHOGANY_SEED, 1);
    const r = useHeld(
      g,
      openMap(),
      { kind: "item", id: MAHOGANY_SEED, count: 1 },
      4,
      4,
    );
    expect(r.ok).toBe(true);
    expect(g.trees.at(4, 4)?.kind).toBe("mahogany");
  });

  it("refuses a fruit tree's 3x3 but not the tile beyond it", () => {
    const g = startGame();
    g.inventory.add(MAHOGANY_SEED, 3);
    g.fruitTrees.add(5, 5, "apricot");
    const map = openMap();
    expect(plantTree(g, map, 6, 6, MAHOGANY_SEED).ok).toBe(false);
    expect(plantTree(g, map, 4, 5, MAHOGANY_SEED).ok).toBe(false);
    expect(plantTree(g, map, 7, 5, MAHOGANY_SEED).ok).toBe(true);
  });
});

describe("Mahogany growth", () => {
  it("grows at 15 percent a night, and stage 4 at half that", () => {
    const grows = () => MAHOGANY_STAGE_CHANCE - 0.01;
    const t = new Trees([{ x: 1, y: 1, stage: 2 }]);
    t.at(1, 1)!.kind = "mahogany";
    t.endDay("summer", grows, () => false);
    expect(t.at(1, 1)?.stage).toBe(3);
    // 0.15 is not under 0.15, and 20 percent oaks would have grown.
    const slow = () => MAHOGANY_STAGE_CHANCE;
    t.endDay("summer", slow, () => false);
    expect(t.at(1, 1)?.stage).toBe(3);
    const o = new Trees([{ x: 1, y: 1, stage: 2 }]);
    o.endDay("summer", slow, () => false);
    expect(o.at(1, 1)?.stage).toBe(3);
    // Stage 4 takes twice as long.
    const y = new Trees([{ x: 1, y: 1, stage: 4 }]);
    y.at(1, 1)!.kind = "mahogany";
    y.endDay(
      "summer",
      () => MAHOGANY_YOUNG_CHANCE + 0.01,
      () => false,
    );
    expect(y.at(1, 1)?.stage).toBe(4);
    y.endDay(
      "summer",
      () => MAHOGANY_YOUNG_CHANCE - 0.01,
      () => false,
    );
    expect(y.at(1, 1)?.stage).toBe(5);
  });

  it("does not grow in winter and never spreads a seed", () => {
    const t = new Trees([{ x: 1, y: 1, stage: 2 }]);
    t.at(1, 1)!.kind = "mahogany";
    t.endDay("winter", always, () => false);
    expect(t.at(1, 1)?.stage).toBe(2);
    const m = new Trees([{ x: 1, y: 1, stage: 5 }]);
    m.at(1, 1)!.kind = "mahogany";
    m.endDay(
      "summer",
      () => SPREAD_CHANCE - 0.01,
      () => true,
    );
    expect(m.count).toBe(1);
  });
});

describe("Mahogany yield", () => {
  it("gives 10 Hardwood, no wood, and 0 to 1 seeds", () => {
    const g = mahoganyGame(5);
    g.toolTiers.axe = 4;
    const wood = g.inventory.count("wood");
    for (let i = 0; i < 2; i++) chop(g, 3, 3, always);
    expect(g.inventory.count("hardwood")).toBe(10);
    expect(g.inventory.count("wood")).toBe(wood);
    expect(g.inventory.count(MAHOGANY_SEED)).toBe(1);
    expect(g.trees.at(3, 3)?.stump).toBe(true);
  });

  it("can give no seed, and its stump gives wood by the common rule", () => {
    const g = mahoganyGame(5);
    g.toolTiers.axe = 4;
    const wood = g.inventory.count("wood");
    for (let i = 0; i < 2; i++) chop(g, 3, 3, () => 0.99);
    expect(g.inventory.count(MAHOGANY_SEED)).toBe(0);
    expect(g.inventory.count("wood")).toBe(wood);
    for (let i = 0; i < 2; i++) chop(g, 3, 3, () => 0.5);
    expect(g.inventory.count("wood")).toBeGreaterThanOrEqual(wood + 4);
    expect(g.trees.at(3, 3)).toBeUndefined();
  });

  it("a lifted seedling returns a Mahogany seed, and a shake drops one", () => {
    const g = mahoganyGame(1);
    g.skills.gain("foraging", 100);
    chop(g, 3, 3, always);
    expect(g.inventory.count(MAHOGANY_SEED)).toBe(1);
    const h = mahoganyGame(5);
    h.trees.at(3, 3)!.seed = true;
    expect(shake(h, 3, 3).ok).toBe(true);
    expect(h.inventory.count(MAHOGANY_SEED)).toBe(1);
    expect(h.inventory.count("tree-seed")).toBe(0);
  });

  it("keeps its kind through a save", () => {
    const g = mahoganyGame(3);
    const back = deserialize(serialize(g));
    expect(back?.trees.at(3, 3)?.kind).toBe("mahogany");
  });
});

describe("Secret Woods stump seed", () => {
  const woods = maps.get("secret-woods")!;
  const stump = woods.trees.find((t) => t.large)!;

  function fell(g: ReturnType<typeof startGame>, random: () => number) {
    for (
      let i = 0;
      i < 60 && g.trees.at(stump.x, stump.y)?.regrow === undefined;
      i++
    )
      chop(g, stump.x, stump.y, random, woods);
  }

  it("gives a seed when the chance hits, and none when it misses", () => {
    const hit = startGame();
    enterArea(hit, "secret-woods");
    hit.toolTiers.axe = 4;
    fell(hit, () => STUMP_SEED_CHANCE - 0.01);
    expect(hit.inventory.count("hardwood")).toBe(2);
    expect(hit.inventory.count(MAHOGANY_SEED)).toBe(1);
    const miss = startGame();
    enterArea(miss, "secret-woods");
    miss.toolTiers.axe = 4;
    fell(miss, () => STUMP_SEED_CHANCE + 0.01);
    expect(miss.inventory.count(MAHOGANY_SEED)).toBe(0);
  });
});
