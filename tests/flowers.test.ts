import { describe, expect, it } from "vitest";
import {
  categoryOf,
  FLOWER_HONEY_PRICE,
  flowerHoneyId,
  HONEY,
  produceOf,
} from "../src/core/artisan";
import { BUNDLES } from "../src/core/bundles";
import { cropById, FLOWER_CROPS, isFlowerCrop } from "../src/core/crops";
import { forage, plant, WILD_FLOWER_SEED_CHANCE } from "../src/core/actions";
import { tagsOf, tasteOf } from "../src/core/friendship";
import { itemById, seedId } from "../src/core/items";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import {
  BEE_RANGE,
  collectMachine,
  honeyFor,
  loadMachine,
  placeMachine,
  statusText,
} from "../src/core/machines";
import { processFor } from "../src/core/processing";
import { newGame } from "../src/core/save";
import { seedStock } from "../src/core/shop";

const SET: Record<string, [string[], number, number, number]> = {
  tulip: [["spring"], 6, 20, 30],
  cornflower: [["spring"], 7, 30, 50],
  poppy: [["summer"], 7, 100, 140],
  zinnia: [["summer"], 8, 50, 90],
  sunflower: [["summer", "fall"], 8, 200, 80],
  dahlia: [["fall"], 12, 200, 290],
};

const bigMap = (): FarmMap => {
  const layer = (name: string, data: number[]) => ({
    name,
    type: "tilelayer",
    data,
  });
  const json: TiledMapJson = {
    width: 20,
    height: 20,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", new Array(400).fill(0)),
      layer("soil", new Array(400).fill(1)),
      {
        name: "markers",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  };
  return FarmMap.fromTiled(json);
};

/** A game with a bee house at (10, 10) and a flower crop in the ground at (x, y). */
function withBees(flowers: [string, number, number][] = []) {
  const g = newGame();
  const map = bigMap();
  g.inventory.add("bee-house");
  expect(placeMachine(g, map, 10, 10, "bee-house").ok).toBe(true);
  for (const [id, x, y] of flowers) {
    g.farm.till(x, y);
    g.farm.plotAt(x, y)!.crop = { id, daysGrown: 0, harvests: 0 };
  }
  return g;
}

/** Finish the bee house's batch without passing days. */
const finish = (g: ReturnType<typeof newGame>) => {
  g.machines.get(10, 10)!.job!.doneAt = 0;
};

describe("flower crops (note 91)", () => {
  it("are six crops with the set's seasons, days and prices", () => {
    expect(FLOWER_CROPS.map((c) => c.id).sort()).toEqual(
      Object.keys(SET).sort(),
    );
    for (const [id, [seasons, days, seed, sell]] of Object.entries(SET)) {
      const c = cropById(id)!;
      expect(c.seasons, id).toEqual(seasons);
      expect(c.growDays, id).toBe(days);
      expect(c.seedPrice, id).toBe(seed);
      expect(c.sellPrice, id).toBe(sell);
      expect(c.regrowDays, id).toBeUndefined();
      expect(isFlowerCrop(id)).toBe(true);
    }
    expect(isFlowerCrop("parsnip")).toBe(false);
  });

  it("none grows in winter, and sunflower covers summer and fall", () => {
    for (const c of FLOWER_CROPS) expect(c.seasons).not.toContain("winter");
    expect(cropById("sunflower")!.seasons).toEqual(["summer", "fall"]);
  });

  it("sells as an item and is not food, jam or pickles", () => {
    for (const id of Object.keys(SET)) {
      expect(itemById(id)?.sellPrice).toBe(SET[id]![3]);
      expect(itemById(id)?.energy).toBeUndefined();
      expect(produceOf(id)).toBeUndefined();
      expect(itemById(`${id}-jam`)).toBeUndefined();
      expect(itemById(`${id}-pickles`)).toBeUndefined();
      expect(processFor("preserves-jar", id)).toBeUndefined();
      expect(processFor("keg", id)).toBeUndefined();
    }
  });

  it("grows once, with no regrowth", () => {
    const g = newGame();
    g.inventory.add(seedId("tulip"));
    g.farm.till(0, 0);
    expect(plant(g, 0, 0, seedId("tulip"), () => 0).ok).toBe(true);
    for (let i = 0; i < 6; i++) {
      g.farm.water(0, 0);
      g.farm.endDay("spring");
    }
    expect(g.farm.isRipe(0, 0)).toBe(true);
    expect(g.farm.harvest(0, 0)).toBe("tulip");
    expect(g.farm.plotAt(0, 0)?.crop).toBeUndefined();
  });
});

describe("flower seeds", () => {
  it("the general store stocks each flower's seed in its season only", () => {
    expect(seedStock("spring")).toEqual(
      expect.arrayContaining([seedId("tulip"), seedId("cornflower")]),
    );
    expect(seedStock("spring")).not.toContain(seedId("poppy"));
    expect(seedStock("summer")).toEqual(
      expect.arrayContaining([
        seedId("poppy"),
        seedId("zinnia"),
        seedId("sunflower"),
      ]),
    );
    expect(seedStock("fall")).toEqual(
      expect.arrayContaining([seedId("sunflower"), seedId("dahlia")]),
    );
    expect(seedStock("winter")).not.toContain(seedId("dahlia"));
    expect(itemById(seedId("dahlia"))?.buyPrice).toBe(200);
  });

  it("a forage pickup sometimes also gives an in-season flower seed packet", () => {
    const g = newGame();
    g.forage.respawn("spring", [{ x: 1, y: 1 }], () => 0.99);
    // Place a good directly: respawn may roll none.
    const spot = { x: 1, y: 1 };
    if (!g.forage.itemAt(spot.x, spot.y)) {
      g.forage.respawn("spring", [spot], () => 0.99);
    }
    expect(g.forage.itemAt(1, 1)).toBeDefined();
    // 0 passes every roll: the chance draw is below 2 percent and the pick is the first.
    expect(forage(g, 1, 1, () => 0).ok).toBe(true);
    const seeds = ["tulip", "cornflower"].map((c) =>
      g.inventory.count(seedId(c)),
    );
    expect(seeds.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it("no packet when the roll misses", () => {
    const g = newGame();
    g.forage.respawn("spring", [{ x: 1, y: 1 }], () => 0.99);
    expect(forage(g, 1, 1, () => WILD_FLOWER_SEED_CHANCE + 0.5).ok).toBe(true);
    for (const c of FLOWER_CROPS)
      expect(g.inventory.count(seedId(c.id))).toBe(0);
  });
});

describe("flower honey", () => {
  it("is plain honey with no flower in reach", () => {
    const g = withBees();
    expect(honeyFor(g, g.machines.get(10, 10)!)).toBe(HONEY);
    finish(g);
    expect(collectMachine(g, 10, 10).ok).toBe(true);
    expect(g.inventory.count(HONEY)).toBe(1);
  });

  it("takes the flower within range and sells by it", () => {
    for (const [flower, price] of Object.entries(FLOWER_HONEY_PRICE)) {
      const g = withBees([[flower, 10 + BEE_RANGE, 10]]);
      finish(g);
      expect(statusText(g, 10, 10)).toBe(
        `The ${itemById(flowerHoneyId(flower))!.name.toLowerCase()} is ready.`,
      );
      expect(collectMachine(g, 10, 10)).toMatchObject({
        ok: true,
        item: flowerHoneyId(flower),
      });
      expect(g.inventory.count(flowerHoneyId(flower))).toBe(1);
      expect(itemById(flowerHoneyId(flower))?.sellPrice).toBe(price);
      expect(categoryOf(flowerHoneyId(flower))).toBe("honey");
    }
  });

  it("ignores a flower out of range, or a vegetable", () => {
    const g = withBees([
      ["poppy", 10 + BEE_RANGE + 1, 10],
      ["parsnip", 10, 11],
    ]);
    expect(honeyFor(g, g.machines.get(10, 10)!)).toBe(HONEY);
  });

  it("chooses the nearest flower when two are in reach", () => {
    const g = withBees([
      ["dahlia", 10, 15],
      ["tulip", 12, 10],
    ]);
    expect(honeyFor(g, g.machines.get(10, 10)!)).toBe("tulip-honey");
  });

  it("looks at the flowers when the batch is collected, and the next batch starts plain", () => {
    const g = withBees();
    g.farm.till(11, 10);
    g.farm.plotAt(11, 10)!.crop = { id: "zinnia", daysGrown: 0, harvests: 0 };
    finish(g);
    collectMachine(g, 10, 10);
    expect(g.inventory.count("zinnia-honey")).toBe(1);
    expect(g.machines.get(10, 10)!.job!.output).toBe(HONEY);
    g.farm.harvest(11, 10);
    g.farm.plotAt(11, 10)!.crop = undefined;
    finish(g);
    collectMachine(g, 10, 10);
    expect(g.inventory.count(HONEY)).toBe(1);
  });

  it("will not take a flower into a machine as honey input (keg only takes plain honey)", () => {
    expect(processFor("keg", "tulip-honey")).toBeUndefined();
    const g = newGame();
    expect(loadMachine(g, 0, 0, "tulip").ok).toBe(false);
  });
});

describe("flower uses", () => {
  it("each flower makes its colour in the dye vat", () => {
    const dyes: Record<string, string> = {
      tulip: "pink-dye",
      cornflower: "blue-dye",
      poppy: "red-dye",
      zinnia: "orange-dye",
      sunflower: "yellow-dye",
      dahlia: "violet-dye",
    };
    for (const [flower, dye] of Object.entries(dyes))
      expect(processFor("dye-vat", flower)).toMatchObject({ output: dye });
  });

  it("carry the flower tag and are a universal like", () => {
    for (const id of Object.keys(SET)) {
      expect(tagsOf(id)).toContain("flower");
      expect(tasteOf("odette", id)).not.toBe("hate");
    }
    expect(tagsOf("daffodil")).toContain("flower");
  });

  it("Dyer's bundle lists all six", () => {
    const dyers = BUNDLES.find((b) => b.id === "dyers")!;
    const ids = dyers.items.map((i) => i.id);
    for (const id of Object.keys(SET)) expect(ids).toContain(id);
  });
});
