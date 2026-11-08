import { describe, expect, it } from "vitest";
import {
  DEBRIS_CAP,
  DEBRIS_ROCKS,
  DEBRIS_TWIGS,
  returnDebris,
  Twigs,
} from "../src/core/debris";
import { newGame } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { FarmMap, type TiledMapJson } from "../src/core/map";

const W = 20;
const H = 10;

function soilMap(): FarmMap {
  return FarmMap.fromTiled({
    width: W,
    height: H,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      { name: "collision", type: "tilelayer", data: new Array(W * H).fill(0) },
      { name: "soil", type: "tilelayer", data: new Array(W * H).fill(1) },
      {
        name: "markers",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  } as TiledMapJson);
}

/** Sleep to the morning of a day, with rolls that never add a stump. */
function sleepTo(g: ReturnType<typeof newGame>, day: number, map: FarmMap) {
  while (g.day.clock.day < day) sleep(g, [], () => 0.99, map);
}

describe("seasonal debris", () => {
  it("returns a few rocks and twigs on day 1 of summer and fall, and not on other days", () => {
    const map = soilMap();
    const g = newGame();
    g.rocks.load([]);
    sleepTo(g, 28, map);
    expect(g.rocks.count).toBe(0);
    expect(g.twigs.count).toBe(0);
    sleepTo(g, 29, map);
    expect(g.rocks.count).toBe(DEBRIS_ROCKS);
    expect(g.twigs.count).toBe(DEBRIS_TWIGS);
    sleepTo(g, 56, map);
    expect(g.rocks.count).toBe(DEBRIS_ROCKS);
    sleepTo(g, 57, map);
    expect(g.rocks.count).toBe(DEBRIS_ROCKS * 2);
    expect(g.twigs.count).toBe(DEBRIS_TWIGS * 2);
  });

  it("returns nothing in winter", () => {
    const map = soilMap();
    const g = newGame();
    g.rocks.load([]);
    sleepTo(g, 84, map);
    const rocks = g.rocks.count;
    const twigs = g.twigs.count;
    sleepTo(g, 85, map); // winter 1
    sleepTo(g, 112, map);
    expect(g.rocks.count).toBe(rocks);
    expect(g.twigs.count).toBe(twigs);
  });

  it("stops at the standing cap", () => {
    const map = soilMap();
    const g = newGame();
    g.rocks.load([]);
    for (let i = 0; i < DEBRIS_CAP - 3; i++) g.rocks.add(i, 0, "stone");
    const twigs = new Twigs();
    returnDebris(
      "spring",
      1,
      g.rocks,
      twigs,
      g.trees,
      () => 0.5,
      () => true,
      () => map.tillableTiles(),
    );
    expect(g.rocks.count).toBe(DEBRIS_CAP);
  });

  it("never lands on a crop, a path tile, an object or round a fruit tree", () => {
    const map = soilMap();
    const g = newGame();
    g.rocks.load([]);
    g.farm.till(3, 3);
    g.farm.plant(3, 3, "parsnip", "spring");
    g.fruitTrees.add(10, 5, "apricot");
    g.sprinklers.add(5, 5, "sprinkler");
    sleepTo(g, 29, map);
    const spots = [...g.rocks.each(), ...g.twigs.each()];
    expect(spots.length).toBeGreaterThan(0);
    for (const s of spots) {
      expect(`${s.x},${s.y}`).not.toBe("3,3");
      expect(`${s.x},${s.y}`).not.toBe("5,5");
      expect(Math.abs(s.x - 10) <= 1 && Math.abs(s.y - 5) <= 1).toBe(false);
    }
  });

  it("brings a stump only on a lucky roll", () => {
    const map = soilMap();
    const g = newGame();
    g.rocks.load([]);
    returnDebris(
      "fall",
      1,
      g.rocks,
      g.twigs,
      g.trees,
      () => 0.01,
      () => true,
      () => map.tillableTiles(),
    );
    expect([...g.trees.each()].some((t) => t.stump)).toBe(true);
  });
});
