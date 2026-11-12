import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  contents,
  pickUpChest,
  placeChest,
  pushChest,
  putIn,
  takeOut,
} from "../src/core/chests";
import { canCraft, craft, haveCount } from "../src/core/crafting";
import {
  buyFurniture,
  furnitureProblem,
  placeFurniture,
  stationStock,
} from "../src/core/furniture";
import { till } from "../src/core/actions";
import { itemById } from "../src/core/items";
import { START } from "../src/core/maps";
import { deserialize, newGame, serialize } from "../src/core/save";

const farm = maps.get(START.map);
const house = maps.get("house");
const tile = farm.tillableTiles()[0]!;
const floor = (() => {
  for (let y = 0; y < 44; y++)
    for (let x = 0; x < 74; x++) {
      const g = newGame();
      g.inventory.add("oak-chair");
      if (placeFurniture(g, house, "house", x, y, "oak-chair").ok)
        return { x, y };
    }
  throw new Error("no free tile");
})();

describe("chests", () => {
  it("are four items that cannot be sold", () => {
    for (const id of ["chest", "stone-chest", "big-chest", "big-stone-chest"])
      expect(itemById(id)?.keep, id).toBe(true);
  });

  it("stand on clear farm ground, and block digging there", () => {
    const g = newGame();
    g.inventory.add("chest");
    expect(placeChest(g, farm, "farm", tile.x, tile.y, "chest").ok).toBe(true);
    expect(g.inventory.count("chest")).toBe(0);
    expect(till(g, tile.x, tile.y)).toEqual({
      ok: false,
      reason: "a chest is in the way",
    });
    g.inventory.add("chest");
    expect(placeChest(g, farm, "farm", tile.x, tile.y, "chest").ok).toBe(false);
  });

  it("stand on open floor in the house too", () => {
    const g = newGame();
    g.inventory.add("stone-chest");
    expect(
      placeChest(g, house, "house", floor.x, floor.y, "stone-chest").ok,
    ).toBe(true);
    expect(g.chests.at("house", floor.x, floor.y)).toBe("stone-chest");
  });

  it("move stacks in and out, keeping quality, within the slots", () => {
    const g = newGame();
    g.inventory.add("chest");
    placeChest(g, farm, "farm", tile.x, tile.y, "chest");
    const c = g.chests.get("farm", tile.x, tile.y)!;
    expect(c.items.size).toBe(36);
    g.inventory.add("parsnip@silver", 5);
    g.inventory.add("wood", 20);
    expect(putIn(g, c, "parsnip@silver", 3)).toBe(3);
    expect(putIn(g, c, "wood", 99)).toBe(20);
    expect(contents(c)).toEqual([
      { id: "parsnip@silver", count: 3 },
      { id: "wood", count: 20 },
    ]);
    expect(takeOut(g, c, "wood", 5)).toBe(5);
    expect(g.inventory.count("wood")).toBe(5);
    expect(g.inventory.count("parsnip@silver")).toBe(2);
  });

  it("can only be picked up empty", () => {
    const g = newGame();
    g.inventory.add("big-chest");
    placeChest(g, farm, "farm", tile.x, tile.y, "big-chest");
    const c = g.chests.get("farm", tile.x, tile.y)!;
    expect(c.items.size).toBe(70);
    g.inventory.add("stone");
    putIn(g, c, "stone", 1);
    expect(pickUpChest(g, "farm", tile.x, tile.y)).toEqual({
      ok: false,
      reason: "chest not empty",
    });
    takeOut(g, c, "stone", 1);
    expect(pickUpChest(g, "farm", tile.x, tile.y).ok).toBe(true);
    expect(g.inventory.count("big-chest")).toBe(1);
  });

  it("keep their contents through a save, including a big chest", () => {
    const g = newGame();
    g.inventory.add("big-stone-chest");
    placeChest(g, farm, "farm", tile.x, tile.y, "big-stone-chest");
    const c = g.chests.get("farm", tile.x, tile.y)!;
    g.inventory.add("coal", 40);
    putIn(g, c, "coal", 40);
    const back = deserialize(serialize(g))!;
    const b = back.chests.get("farm", tile.x, tile.y)!;
    expect(b.id).toBe("big-stone-chest");
    expect(b.items.size).toBe(70);
    expect(b.items.count("coal")).toBe(40);
    const raw = JSON.parse(serialize(g));
    delete raw.placed;
    expect(deserialize(JSON.stringify(raw))!.chests.count).toBe(0);
  });
});

describe("the workbench", () => {
  it("is always on sale at the carpenter for 2,000g", () => {
    expect(stationStock().map((f) => f.id)).toEqual(["workbench"]);
    const g = newGame();
    expect(furnitureProblem(g, "workbench")).toBe("You need 1500g more.");
    g.money = 2000;
    expect(buyFurniture(g, "workbench")).toBe(true);
    expect(g.money).toBe(0);
  });

  it("crafts from the pack and the chests beside it, pack first", () => {
    const g = newGame();
    g.inventory.add("chest");
    placeChest(g, farm, "farm", tile.x, tile.y, "chest");
    const c = g.chests.get("farm", tile.x, tile.y)!;
    g.inventory.add("wood", 30);
    putIn(g, c, "wood", 30);
    g.inventory.add("wood", 20);
    expect(craft(g, "chest")).toBe("missing ingredients");
    expect(
      canCraft(g, { ...recipe(), ingredients: [{ item: "wood", count: 50 }] }, [
        c,
      ]),
    ).toBe(true);
    expect(haveCount(g, "wood", [c])).toBe(50);
    expect(craft(g, "chest", [c])).toBeUndefined();
    expect(g.inventory.count("wood")).toBe(0);
    expect(c.items.count("wood")).toBe(0);
    expect(g.inventory.count("chest")).toBe(1);
  });

  it("puts everything back when the result will not fit", () => {
    const g = newGame();
    g.inventory.add("chest");
    placeChest(g, farm, "farm", tile.x, tile.y, "chest");
    const c = g.chests.get("farm", tile.x, tile.y)!;
    g.inventory.add("stone", 50);
    putIn(g, c, "stone", 50);
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk-${i}`);
    expect(craft(g, "stone-chest", [c])).toBe("backpack full");
    expect(c.items.count("stone")).toBe(50);
    expect(g.inventory.count("stone-chest")).toBe(0);
  });
});

import { RECIPES } from "../src/core/crafting";
const recipe = () => RECIPES.find((r) => r.id === "chest")!;

describe("pushing a chest (SC-56)", () => {
  const next = farm
    .tillableTiles()
    .find((t) =>
      farm.tillableTiles().some((u) => u.x === t.x + 1 && u.y === t.y),
    )!;

  it("moves a full chest one tile, stacks and all", () => {
    const g = newGame();
    g.inventory.add("chest");
    placeChest(g, farm, "farm", next.x, next.y, "chest");
    g.chests.get("farm", next.x, next.y)!.items.add("wood", 5);
    expect(pickUpChest(g, "farm", next.x, next.y).ok).toBe(false);
    expect(pushChest(g, farm, "farm", next.x, next.y, 1, 0).ok).toBe(true);
    expect(g.chests.at("farm", next.x, next.y)).toBeUndefined();
    expect(g.chests.get("farm", next.x + 1, next.y)?.items.count("wood")).toBe(
      5,
    );
  });

  it("will not push onto a blocked tile", () => {
    const g = newGame();
    g.inventory.add("chest", 2);
    placeChest(g, farm, "farm", next.x, next.y, "chest");
    placeChest(g, farm, "farm", next.x + 1, next.y, "chest");
    expect(pushChest(g, farm, "farm", next.x, next.y, 1, 0)).toEqual({
      ok: false,
      reason: "chest will not move",
    });
    expect(g.chests.count).toBe(2);
  });

  it("pushes in the house too", () => {
    const g = newGame();
    g.inventory.add("chest");
    placeChest(g, house, "house", floor.x, floor.y, "chest");
    const r = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(
      ([dx, dy]) => pushChest(g, house, "house", floor.x, floor.y, dx!, dy!).ok,
    );
    expect(r).toBe(true);
  });
});
