import { describe, expect, it } from "vitest";
import { known, RECIPES } from "../src/core/crafting";
import {
  collectMachine,
  handOnMachine,
  loadMachine,
  minutesLeft,
  placeMachine,
} from "../src/core/machines";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import {
  COPYABLE,
  MINERAL_COPY_MINUTES,
  MINUTES_PER_DAY,
  copyMinutes,
  processFor,
} from "../src/core/processing";
import { placeableById } from "../src/core/placeables";
import { itemById } from "../src/core/items";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";

function soilMap(): FarmMap {
  const layer = (name: string, data: number[]) => ({
    name,
    type: "tilelayer",
    data,
  });
  const json: TiledMapJson = {
    width: 8,
    height: 8,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", new Array(64).fill(0)),
      layer("soil", new Array(64).fill(1)),
      {
        name: "markers",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  };
  return FarmMap.fromTiled(json);
}

const scale = MINUTES_PER_DAY / 1440;

describe("the crystalarium times", () => {
  it("follows Stardew's table, rescaled to our day", () => {
    expect(copyMinutes("quartz-crystal")).toBe(Math.round(420 * scale));
    expect(copyMinutes("gem-low-a")).toBe(Math.round(1120 * scale));
    expect(copyMinutes("gem-low-b")).toBe(Math.round(1360 * scale));
    expect(copyMinutes("gem-high-b")).toBe(Math.round(7200 * scale));
    expect(MINERAL_COPY_MINUTES).toBe(Math.round(5000 * scale));
    expect(copyMinutes("river-garnet")).toBe(MINERAL_COPY_MINUTES);
  });

  it("takes every gem and mineral and nothing else", () => {
    for (const id of COPYABLE) {
      expect(itemById(id), id).toBeDefined();
      expect(processFor("crystalarium", id)?.output, id).toBe(id);
    }
    for (const id of ["wood", "copper-ore", "hearthsilver-ore", "geode"])
      expect(processFor("crystalarium", id), id).toBeUndefined();
  });

  it("makes one machine copy about 100 to 150g a day", () => {
    const perDay = (id: string) =>
      (itemById(id)!.sellPrice * MINUTES_PER_DAY) / copyMinutes(id)!;
    for (const id of ["gem-mid-a", "gem-mid-b", "gem-high-b"]) {
      expect(perDay(id), id).toBeGreaterThan(60);
      expect(perDay(id), id).toBeLessThan(250);
    }
  });
});

describe("the crystalarium machine", () => {
  it("is a farm placeable and a Harvest Feast recipe of stone, gold, Hearthsilver and a pack", () => {
    expect(placeableById("crystalarium")?.kind).toBe("machine");
    const r = RECIPES.find((x) => x.id === "crystalarium")!;
    expect(r.ingredients.map((i) => `${i.item}:${i.count}`).sort()).toEqual([
      "battery-pack:1",
      "gold-bar:5",
      "hearthsilver-bar:2",
      "stone:99",
    ]);
    const g = newGame();
    expect(known(g, r)).toBe(false);
  });

  it("copies a gem again and again, and pulling it returns the gem inside", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add("crystalarium");
    expect(placeMachine(g, map, 2, 2, "crystalarium").ok).toBe(true);
    g.inventory.add("gem-low-a");
    expect(loadMachine(g, 2, 2, "gem-low-a").ok).toBe(true);
    expect(g.inventory.count("gem-low-a")).toBe(0);
    expect(collectMachine(g, 2, 2).ok).toBe(false);
    const back = deserialize(serialize(g))!;
    expect(back.machines.get(2, 2)?.job?.output).toBe("gem-low-a");
    sleep(g, [], () => 0.99, map);
    sleep(g, [], () => 0.99, map);
    expect(collectMachine(g, 2, 2).ok).toBe(true);
    expect(g.inventory.count("gem-low-a")).toBe(1);
    const m = g.machines.get(2, 2)!;
    expect(m.job?.output).toBe("gem-low-a");
    expect(minutesLeft(g, m)).toBe(copyMinutes("gem-low-a"));
    expect(loadMachine(g, 2, 2, "gem-low-a").ok).toBe(false);
    // Pulling the machine with the hand gives back the gem inside.
    expect(handOnMachine(g, 2, 2).ok).toBe(true);
    expect(g.inventory.count("gem-low-a")).toBe(2);
    expect(g.inventory.count("crystalarium")).toBe(1);
    expect(g.machines.get(2, 2)).toBeUndefined();
  });

  it("refuses an item that is not a gem or mineral", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add("crystalarium");
    placeMachine(g, map, 2, 2, "crystalarium");
    g.inventory.add("wood");
    expect(loadMachine(g, 2, 2, "wood").ok).toBe(false);
    expect(g.inventory.count("wood")).toBe(1);
  });
});
