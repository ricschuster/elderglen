import { describe, expect, it } from "vitest";
import { chop, pickFruit, plantFruitTree, till } from "../src/core/actions";
import {
  DAYS_PER_YEAR,
  FruitTrees,
  fruitQuality,
  MATURE_DAYS,
  MAX_FRUIT,
  saplingId,
  stageOf,
} from "../src/core/fruittrees";
import { itemById } from "../src/core/items";
import { processFor } from "../src/core/processing";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { deserialize, newGame, serialize } from "../src/core/save";
import { saplingStock } from "../src/core/shop";
import { sleep } from "../src/core/sleep";
import { sellMultiplier } from "../src/core/professions";
import { useHeld } from "../src/core/tools";

function soilMap(): FarmMap {
  const layer = (name: string, data: number[]) => ({
    name,
    type: "tilelayer",
    data,
  });
  const json: TiledMapJson = {
    width: 12,
    height: 12,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", new Array(144).fill(0)),
      layer("soil", new Array(144).fill(1)),
      {
        name: "markers",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  };
  return FarmMap.fromTiled(json);
}

const never = () => 0.99;
const clear = () => true;

describe("fruit tree growth and fruit", () => {
  it("grows a stage every 7 days and matures at 28", () => {
    const f = new FruitTrees();
    f.add(3, 3, "apricot");
    for (let i = 0; i < 27; i++) f.endDay("winter", clear);
    expect(f.at(3, 3)?.age).toBe(27);
    expect(stageOf(27)).toBe(3);
    f.endDay("winter", clear);
    expect(stageOf(f.at(3, 3)!.age)).toBe(4);
  });

  it("does not grow a young tree when its 3x3 is not clear, and says so", () => {
    const f = new FruitTrees();
    f.add(3, 3, "apricot");
    const stuck = f.endDay("spring", () => false);
    expect(stuck).toHaveLength(1);
    expect(f.at(3, 3)?.age).toBe(0);
  });

  it("bears one fruit a night in season up to 3, none out of season", () => {
    const f = new FruitTrees();
    f.add(3, 3, "apricot", MATURE_DAYS);
    f.endDay("summer", clear);
    expect(f.at(3, 3)?.fruit).toBe(0);
    for (let i = 0; i < 6; i++) f.endDay("spring", clear);
    expect(f.at(3, 3)?.fruit).toBe(MAX_FRUIT);
  });

  it("matured trees need no clear ground", () => {
    const f = new FruitTrees();
    f.add(3, 3, "apricot", MATURE_DAYS);
    f.endDay("spring", () => false);
    expect(f.at(3, 3)?.fruit).toBe(1);
  });

  it("grades fruit by age after maturity: silver after a year, gold after two", () => {
    expect(fruitQuality(MATURE_DAYS)).toBe("normal");
    expect(fruitQuality(MATURE_DAYS + DAYS_PER_YEAR)).toBe("silver");
    expect(fruitQuality(MATURE_DAYS + 2 * DAYS_PER_YEAR)).toBe("gold");
  });
});

describe("fruit trees on the farm", () => {
  it("plants a sapling, refuses a neighbour tree, and takes the sapling", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(saplingId("apricot"), 2);
    expect(plantFruitTree(g, map, 4, 4, saplingId("apricot")).ok).toBe(true);
    expect(g.inventory.count(saplingId("apricot"))).toBe(1);
    const near = plantFruitTree(g, map, 5, 5, saplingId("apricot"));
    expect(near).toEqual({ ok: false, reason: "too close to another tree" });
    expect(plantFruitTree(g, map, 6, 4, saplingId("apricot")).ok).toBe(true);
  });

  it("is planted from the toolbar and blocks digging", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(saplingId("cherry"));
    const r = useHeld(
      g,
      map,
      { kind: "item", id: saplingId("cherry"), count: 1 },
      4,
      4,
    );
    expect(r.ok).toBe(true);
    expect(till(g, 4, 4).ok).toBe(false);
  });

  it("is blocked by a weed in its 3x3 overnight and named in the report", () => {
    const g = newGame();
    const map = soilMap();
    g.fruitTrees.add(4, 4, "apricot");
    g.weeds.add(5, 5);
    const r = sleep(g, [], never, map);
    expect(g.fruitTrees.at(4, 4)?.age).toBe(0);
    expect(r.stuckTrees).toEqual(["Apricot"]);
    g.weeds.remove(5, 5);
    const r2 = sleep(g, [], never, map);
    expect(g.fruitTrees.at(4, 4)?.age).toBe(1);
    expect(r2.stuckTrees).toEqual([]);
  });

  it("is blocked by a sprinkler or a machine beside it", () => {
    const g = newGame();
    const map = soilMap();
    g.fruitTrees.add(4, 4, "apricot");
    g.sprinklers.add(3, 4, "sprinkler");
    expect(sleep(g, [], never, map).stuckTrees).toHaveLength(1);
  });

  it("picks all fruit by hand at the tree's grade", () => {
    const g = newGame();
    g.fruitTrees.add(4, 4, "peach", MATURE_DAYS + DAYS_PER_YEAR);
    g.fruitTrees.at(4, 4)!.fruit = 2;
    const r = pickFruit(g, 4, 4);
    expect(r).toMatchObject({ ok: true, item: "peach@silver" });
    expect(g.inventory.count("peach@silver")).toBe(2);
    expect(pickFruit(g, 4, 4)).toEqual({ ok: false, reason: "nothing ripe" });
  });

  it("chopping gives wood and returns the sapling", () => {
    const g = newGame();
    g.fruitTrees.add(4, 4, "apricot");
    expect(chop(g, 4, 4).ok).toBe(true);
    expect(g.fruitTrees.at(4, 4)).toBeUndefined();
    expect(g.inventory.count(saplingId("apricot"))).toBe(1);
    expect(g.inventory.count("wood")).toBeGreaterThan(0);
  });

  it("a mature tree takes several swings to fell", () => {
    const g = newGame();
    g.fruitTrees.add(4, 4, "apricot", MATURE_DAYS);
    chop(g, 4, 4);
    expect(g.fruitTrees.at(4, 4)).toBeDefined();
  });

  it("saves and loads, and an old save without fruit trees still loads", () => {
    const g = newGame();
    g.fruitTrees.add(4, 4, "orange", 10);
    g.fruitTrees.at(4, 4)!.fruit = 2;
    const back = deserialize(serialize(g))!;
    expect(back.fruitTrees.at(4, 4)).toMatchObject({
      id: "orange",
      age: 10,
      fruit: 2,
    });
    const old = JSON.parse(serialize(g));
    delete old.fruitTrees;
    delete old.mapItems;
    expect(deserialize(JSON.stringify(old))!.fruitTrees.count).toBe(0);
  });
});

describe("fruit tree goods", () => {
  it("has items, a shop for all six trees, and feeds the jar and keg", () => {
    expect(itemById("apricot")?.sellPrice).toBe(50);
    expect(itemById("apricot@gold")?.sellPrice).toBe(75);
    expect(itemById(saplingId("peach"))?.buyPrice).toBe(6000);
    expect(saplingStock().sort()).toEqual(
      ["apricot", "cherry", "orange", "peach", "apple", "pomegranate"]
        .map(saplingId)
        .sort(),
    );
    expect(processFor("preserves-jar", "cherry")?.output).toBe("cherry-jam");
    expect(processFor("keg", "cherry@silver")?.output).toBe("cherry-wine");
    expect(itemById("cherry-wine")?.sellPrice).toBe(240);
  });

  it("gets the Tiller price bonus", () => {
    const g = newGame();
    expect(sellMultiplier(g.skills, "apple")).toBe(1);
    g.skills.setProfession("farming", "tiller");
    expect(sellMultiplier(g.skills, "apple@silver")).toBeGreaterThan(1);
  });
});
