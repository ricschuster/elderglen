import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { isClear, till } from "../src/core/actions";
import {
  buyFarmDecor,
  decorTiles,
  farmDecorAt,
  farmDecorIds,
  farmDecorProblem,
  isFarmDecor,
  pickUpFarmDecor,
  placeFarmDecor,
} from "../src/core/farmdecor";
import { itemById } from "../src/core/items";
import { placeLight } from "../src/core/lights";
import { START } from "../src/core/maps";
import { mineMapId } from "../src/core/mines";
import { mayPlaceOn, placeableById } from "../src/core/placeables";
import { deserialize, newGame, serialize } from "../src/core/save";

const farm = maps.get(START.map);
const tiles = farm.tillableTiles();
const probe = newGame();
const ok = (x: number, y: number) => isClear(probe, farm, x, y);
/** A tile that starts a clear 2 by 2 block. */
const block = tiles.find(
  (t) =>
    ok(t.x, t.y) &&
    ok(t.x + 1, t.y) &&
    ok(t.x, t.y + 1) &&
    ok(t.x + 1, t.y + 1),
)!;

function holding(id: string, n = 1) {
  const g = newGame();
  g.inventory.add(id, n);
  return g;
}

describe("farm decoration rows", () => {
  it("are the six pieces, farm only, blocking, lifted by hand, with the keeper's prices", () => {
    expect(farmDecorIds()).toEqual([
      "ornamental-hay-bale",
      "doghouse",
      "dark-doghouse",
      "cat-tree",
      "dark-cat-tree",
      "bird-house",
    ]);
    for (const id of farmDecorIds()) {
      const p = placeableById(id)!;
      expect(p.kind).toBe("decor");
      expect(p.places).toEqual(["farm"]);
      expect(p.blocksWalking).toBe(true);
      expect(p.pickUp).toBe("hand");
      expect(itemById(id)?.keep).toBe(true);
    }
    expect(placeableById("ornamental-hay-bale")).toMatchObject({
      footprint: [1, 1],
      price: 250,
    });
    expect(placeableById("doghouse")).toMatchObject({
      footprint: [2, 2],
      price: 10000,
    });
    expect(placeableById("bird-house")?.price).toBe(5000);
    expect(mayPlaceOn("doghouse", "mine")).toBe(false);
    expect(mayPlaceOn("doghouse", "greenhouse")).toBe(false);
    expect(isFarmDecor("torch")).toBe(false);
  });
});

describe("placing and lifting", () => {
  it("stands a 2 by 2 piece on four clear tiles and covers all four", () => {
    const g = holding("doghouse");
    expect(
      placeFarmDecor(g, farm, "farm", block.x, block.y, "doghouse").ok,
    ).toBe(true);
    expect(g.inventory.count("doghouse")).toBe(0);
    for (const t of decorTiles("doghouse", block.x, block.y))
      expect(farmDecorAt(g, t.x, t.y)?.id).toBe("doghouse");
    expect(g.placed.count).toBe(1);
    // A covered tile cannot be dug.
    g.inventory.add("hoe");
    expect(till(g, block.x + 1, block.y + 1)).toMatchObject({ ok: false });
  });

  it("is refused when any covered tile is taken, and nothing is spent", () => {
    const g = holding("doghouse", 2);
    g.inventory.add("torch");
    placeLight(g, farm, "farm", block.x + 1, block.y + 1, "torch");
    expect(
      placeFarmDecor(g, farm, "farm", block.x, block.y, "doghouse").ok,
    ).toBe(false);
    expect(g.inventory.count("doghouse")).toBe(2);
    // A second piece cannot overlap the first.
    const h = holding("doghouse", 2);
    placeFarmDecor(h, farm, "farm", block.x, block.y, "doghouse");
    expect(
      placeFarmDecor(h, farm, "farm", block.x + 1, block.y, "doghouse").ok,
    ).toBe(false);
  });

  it("a light cannot stand under a decoration's far tile", () => {
    const g = holding("doghouse");
    g.inventory.add("torch");
    placeFarmDecor(g, farm, "farm", block.x, block.y, "doghouse");
    expect(
      placeLight(g, farm, "farm", block.x + 1, block.y + 1, "torch").ok,
    ).toBe(false);
  });

  it("is refused on soil, off the farm and without the item", () => {
    const g = holding("bird-house");
    g.inventory.add("hoe");
    till(g, block.x, block.y);
    expect(
      placeFarmDecor(g, farm, "farm", block.x, block.y, "bird-house").ok,
    ).toBe(false);
    expect(
      placeFarmDecor(
        holding("bird-house"),
        maps.get("mine"),
        mineMapId(1),
        3,
        3,
        "bird-house",
      ).ok,
    ).toBe(false);
    expect(
      placeFarmDecor(newGame(), farm, "farm", block.x, block.y, "bird-house")
        .ok,
    ).toBe(false);
  });

  it("lifts from any covered tile back to the pack, and stays when the pack is full", () => {
    const g = holding("cat-tree");
    placeFarmDecor(g, farm, "farm", block.x, block.y, "cat-tree");
    for (let i = 0; g.inventory.room("cat-tree") > 0 && i < 500; i++)
      g.inventory.add("stone", 999);
    expect(pickUpFarmDecor(g, block.x + 1, block.y + 1)).toMatchObject({
      ok: false,
    });
    expect(g.placed.count).toBe(1);
    for (let i = 0; i < g.inventory.size; i++)
      g.inventory.remove(g.inventory.slot(i)?.id ?? "stone", 999);
    expect(pickUpFarmDecor(g, block.x + 1, block.y + 1).ok).toBe(true);
    expect(g.inventory.count("cat-tree")).toBe(1);
    expect(g.placed.count).toBe(0);
    expect(pickUpFarmDecor(g, block.x, block.y).ok).toBe(false);
  });

  it("saves and loads with the other placeables", () => {
    const g = holding("dark-doghouse");
    placeFarmDecor(g, farm, "farm", block.x, block.y, "dark-doghouse");
    const back = deserialize(serialize(g))!;
    expect(farmDecorAt(back, block.x + 1, block.y)?.id).toBe("dark-doghouse");
  });
});

describe("the keeper's counter", () => {
  it("sells each piece for its price into the pack", () => {
    const g = newGame();
    g.money = 249;
    expect(farmDecorProblem(g, "ornamental-hay-bale")).toMatch(/1g more/);
    expect(buyFarmDecor(g, "ornamental-hay-bale")).toMatch(/more/);
    g.money = 250;
    expect(buyFarmDecor(g, "ornamental-hay-bale")).toBeUndefined();
    expect(g.money).toBe(0);
    expect(g.inventory.count("ornamental-hay-bale")).toBe(1);
    expect(buyFarmDecor(g, "torch")).toMatch(/does not sell/);
  });
});
