import { describe, expect, it } from "vitest";
import { categoryOf } from "../src/core/artisan";
import { BUNDLES } from "../src/core/bundles";
import { known, RECIPES } from "../src/core/crafting";
import { itemById } from "../src/core/items";
import {
  collectMachine,
  jobDone,
  loadMachine,
  placeMachine,
} from "../src/core/machines";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { CLOTH_DOUBLE_CHANCE, processFor } from "../src/core/processing";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { LEVEL_XP } from "../src/core/skills";

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

const never = () => 0.99;

describe("animal-goods machine rules", () => {
  it("press milk and goat milk, one for one", () => {
    expect(processFor("cheese-press", "milk")?.output).toBe("cheese");
    expect(processFor("cheese-press", "goat-milk@gold")?.output).toBe(
      "goat-cheese",
    );
    expect(processFor("cheese-press", "egg")).toBeUndefined();
  });

  it("make mayonnaise from eggs, and keep duck eggs apart", () => {
    expect(processFor("mayonnaise-machine", "egg")?.output).toBe("mayonnaise");
    expect(processFor("mayonnaise-machine", "duck-egg")?.output).toBe(
      "duck-mayonnaise",
    );
    expect(processFor("mayonnaise-machine", "milk")).toBeUndefined();
  });

  it("weave wool into cloth, and better wool may give 2", () => {
    expect(processFor("loom", "wool", never)?.count).toBe(1);
    expect(processFor("loom", "wool@silver", never)?.count).toBe(1);
    expect(processFor("loom", "wool@silver", () => 0.1)?.count).toBe(2);
    expect(processFor("loom", "wool", () => 0)?.count).toBe(1);
    expect(CLOTH_DOUBLE_CHANCE.gold).toBeGreaterThan(
      CLOTH_DOUBLE_CHANCE.silver,
    );
    expect(processFor("loom", "moonwool")).toBeUndefined();
  });

  it("press truffles and corn into oil", () => {
    expect(processFor("oil-maker", "truffle")?.output).toBe("truffle-oil");
    expect(processFor("oil-maker", "corn")?.output).toBe("oil");
    expect(processFor("oil-maker", "parsnip")).toBeUndefined();
  });

  it("price the goods above their raw input", () => {
    expect(itemById("cheese")!.sellPrice).toBeGreaterThan(
      itemById("milk")!.sellPrice * 2,
    );
    expect(itemById("goat-cheese")!.sellPrice).toBeGreaterThan(
      itemById("goat-milk")!.sellPrice * 2,
    );
    expect(itemById("mayonnaise")!.sellPrice).toBeGreaterThan(
      itemById("egg")!.sellPrice * 2,
    );
    expect(itemById("truffle-oil")!.sellPrice).toBeGreaterThan(
      itemById("truffle")!.sellPrice * 1.5,
    );
    expect(categoryOf("duck-mayonnaise")).toBe("mayonnaise");
    expect(categoryOf("truffle-oil")).toBe("oil");
  });
});

describe("animal-goods machines on the farm", () => {
  it("run a batch overnight and hand the goods over", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add("cheese-press");
    expect(placeMachine(g, map, 3, 3, "cheese-press").ok).toBe(true);
    g.inventory.add("goat-milk");
    expect(loadMachine(g, 3, 3, "goat-milk").ok).toBe(true);
    expect(g.inventory.count("goat-milk")).toBe(0);
    expect(jobDone(g, g.machines.get(3, 3)!)).toBe(false);
    sleep(g, [], never, map);
    expect(jobDone(g, g.machines.get(3, 3)!)).toBe(true);
    expect(collectMachine(g, 3, 3).ok).toBe(true);
    expect(g.inventory.count("goat-cheese")).toBe(1);
  });

  it("keeps a working loom through a save", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add("loom");
    placeMachine(g, map, 2, 2, "loom");
    g.inventory.add("wool");
    loadMachine(g, 2, 2, "wool");
    const back = deserialize(serialize(g))!;
    expect(back.machines.get(2, 2)?.job?.output).toBe("cloth");
  });
});

describe("animal-goods unlocks", () => {
  const recipe = (id: string) => RECIPES.find((r) => r.id === id)!;

  it("give the cheese press and loom from their bundles", () => {
    const by = (id: string) => BUNDLES.find((b) => b.id === id)!;
    expect(by("animal-goods").reward.item).toEqual({
      id: "cheese-press",
      count: 1,
    });
    expect(by("animal-goods").required).toBe(4);
    expect(by("weavers").reward.item).toEqual({ id: "loom", count: 1 });
    expect(by("weavers").items.map((i) => `${i.count} ${i.id}`)).toEqual([
      "8 wool",
      "20 fiber",
    ]);
    for (const [machine, bundle] of [
      ["cheese-press", "animal-goods"],
      ["loom", "weavers"],
    ] as const)
      expect(
        recipe(machine).sources.some(
          (s) => s.kind === "bundle" && s.bundle === bundle,
        ),
      ).toBe(true);
  });

  it("teach mayonnaise at farming 2 and oil at farming 8, no bundle", () => {
    const g = newGame();
    expect(known(g, recipe("mayonnaise-machine"))).toBe(false);
    expect(known(g, recipe("oil-maker"))).toBe(false);
    g.skills.gain("farming", LEVEL_XP[1]!);
    expect(known(g, recipe("mayonnaise-machine"))).toBe(true);
    expect(known(g, recipe("oil-maker"))).toBe(false);
    expect(recipe("oil-maker").sources.every((s) => s.kind === "level")).toBe(
      true,
    );
  });
});
