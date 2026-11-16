import { describe, expect, it } from "vitest";
import {
  chestGridLayout,
  clampRow,
  fillStacks,
  MIN_PITCH,
  quickMove,
  rowFromSwipe,
  slotVisible,
  transfer,
} from "../src/core/chestmenu";
import { Inventory } from "../src/core/inventory";
import { maps } from "../src/content/maps";
import { START } from "../src/core/maps";
import { colourChest, placeChest } from "../src/core/chests";
import { deserialize, newGame, serialize } from "../src/core/save";

const chestInv = () => new Inventory(36, 70);

describe("chest grids", () => {
  it("moves, merges and swaps between pack and chest", () => {
    const pack = new Inventory(12);
    const chest = chestInv();
    pack.add("wood", 10);
    pack.add("stone", 4);
    expect(transfer(pack, 0, chest, 5, { chestSide: chest })).toBe(true);
    expect(chest.slot(5)).toEqual({ id: "wood", count: 10 });
    expect(pack.slot(0)).toBeUndefined();
    chest.add("stone", 2);
    // Different item on the target: swap.
    expect(transfer(pack, 1, chest, 5, { chestSide: chest })).toBe(true);
    expect(chest.slot(5)).toEqual({ id: "stone", count: 4 });
    expect(pack.slot(1)).toEqual({ id: "wood", count: 10 });
  });

  it("splits half, rounded up", () => {
    const pack = new Inventory(12);
    const chest = chestInv();
    pack.add("wood", 5);
    transfer(pack, 0, chest, 0, { half: true, chestSide: chest });
    expect(chest.slot(0)?.count).toBe(3);
    expect(pack.slot(0)?.count).toBe(2);
  });

  it("never puts a tool in a chest", () => {
    const pack = new Inventory(12);
    const chest = chestInv();
    pack.add("tool:hoe");
    expect(transfer(pack, 0, chest, 0, { chestSide: chest })).toBe(false);
    expect(quickMove(pack, 0, chest, chest)).toBe(0);
    chest.add("wood", 1);
    // Swapping a tool out would put it in the chest too.
    pack.add("wood", 1);
    expect(transfer(chest, 0, pack, 0, { chestSide: chest })).toBe(false);
  });

  it("sends a stack across and fills stacks", () => {
    const pack = new Inventory(12);
    const chest = chestInv();
    pack.add("wood", 7);
    pack.add("stone", 3);
    expect(quickMove(pack, 0, chest, chest)).toBe(7);
    expect(chest.count("wood")).toBe(7);
    pack.add("wood", 2);
    expect(fillStacks(pack, chest)).toBe(2);
    expect(pack.count("stone")).toBe(3);
    expect(chest.count("wood")).toBe(9);
  });
});

describe("chest placement", () => {
  it("stands on non-tillable open ground, not on water", () => {
    const farm = maps.get(START.map)!;
    const g = newGame();
    let open: { x: number; y: number } | undefined;
    let wet: { x: number; y: number } | undefined;
    for (let y = 0; y < farm.height; y++)
      for (let x = 0; x < farm.width; x++) {
        if (
          !open &&
          !farm.isTillable(x, y) &&
          !farm.isBlocked(x, y) &&
          !farm.exitAt(x, y) &&
          !farm.serviceAt(x, y) &&
          !farm.entries.some((e) => e.x === x && e.y === y)
        )
          open = { x, y };
        if (farm.isBlocked(x, y) && !wet) wet = { x, y };
      }
    expect(open).toBeDefined();
    g.inventory.add("chest", 2);
    expect(placeChest(g, farm, START.map, open!.x, open!.y, "chest").ok).toBe(
      true,
    );
    expect(placeChest(g, farm, START.map, wet!.x, wet!.y, "chest").ok).toBe(
      false,
    );
  });
});

describe("chest colour and upgrade", () => {
  const farm = maps.get(START.map)!;
  const spot = () => {
    for (let y = 0; y < farm.height; y++)
      for (let x = 0; x < farm.width; x++)
        if (farm.isTillable(x, y)) return { x, y };
    throw new Error("no tillable tile");
  };

  it("keeps the colour through a save", () => {
    const g = newGame();
    const { x, y } = spot();
    g.inventory.add("chest");
    placeChest(g, farm, START.map, x, y, "chest");
    const c = g.chests.get(START.map, x, y)!;
    expect(colourChest(c, 7)).toBe(true);
    expect(colourChest(c, 21)).toBe(false);
    const back = deserialize(serialize(g));
    expect(back?.chests.get(START.map, x, y)?.colour).toBe(7);
    colourChest(c, 0);
    expect(c.colour).toBeUndefined();
  });

  it("swaps a big chest in over a small one, keeping stacks and colour", () => {
    const g = newGame();
    const { x, y } = spot();
    g.inventory.add("chest");
    g.inventory.add("big-chest");
    placeChest(g, farm, START.map, x, y, "chest");
    const c = g.chests.get(START.map, x, y)!;
    c.items.add("wood", 40);
    colourChest(c, 3);
    expect(placeChest(g, farm, START.map, x, y, "big-chest").ok).toBe(true);
    const big = g.chests.get(START.map, x, y)!;
    expect(big.id).toBe("big-chest");
    expect(big.items.size).toBe(70);
    expect(big.items.count("wood")).toBe(40);
    expect(big.colour).toBe(3);
    expect(g.inventory.count("chest")).toBe(1);
    // A small chest does not replace a big one.
    expect(placeChest(g, farm, START.map, x, y, "chest").ok).toBe(false);
  });
});

describe("chest grid scrolling", () => {
  it("keeps a small chest whole and a big one in a window", () => {
    const small = chestGridLayout(3, 3, 356);
    expect(small.visible).toBe(3);
    const big = chestGridLayout(6, 3, 356);
    expect(big.pitch).toBeGreaterThanOrEqual(MIN_PITCH);
    expect(big.visible).toBeLessThan(6);
    expect(big.visible).toBeGreaterThan(0);
  });
  it("clamps the first row", () => {
    expect(clampRow(-2, 6, 4)).toBe(0);
    expect(clampRow(9, 6, 4)).toBe(2);
    expect(clampRow(1.4, 6, 4)).toBe(1);
    expect(clampRow(3, 3, 4)).toBe(0);
  });
  it("turns a swipe up into rows further down", () => {
    expect(rowFromSwipe(0, 92, 46)).toBe(2);
    expect(rowFromSwipe(2, -46, 46)).toBe(1);
  });
  it("knows which slots show", () => {
    expect(slotVisible(0, 12, 1, 4)).toBe(false);
    expect(slotVisible(12, 12, 1, 4)).toBe(true);
    expect(slotVisible(60, 12, 1, 4)).toBe(false);
  });
});
