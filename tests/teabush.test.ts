import { describe, expect, it } from "vitest";
import { chop, pickTeaLeaves, plantTeaBush } from "../src/core/actions";
import { recipeById, known } from "../src/core/crafting";
import { itemById } from "../src/core/items";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import {
  TEA_LEAF,
  TEA_SAPLING,
  TeaBushes,
  bearsOn,
  teaStageOf,
} from "../src/core/teabush";
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

describe("tea bush rules", () => {
  it("has two 10 day stages and matures at 20", () => {
    expect([0, 9, 10, 19, 20].map(teaStageOf)).toEqual([0, 0, 1, 1, 2]);
  });

  it("bears only in the last week, not in winter unless indoors", () => {
    expect(bearsOn("spring", 21, false)).toBe(false);
    expect(bearsOn("spring", 22, false)).toBe(true);
    expect(bearsOn("fall", 28, false)).toBe(true);
    expect(bearsOn("winter", 25, false)).toBe(false);
    expect(bearsOn("winter", 25, true)).toBe(true);
  });

  it("grows in winter without water and bears one leaf a day in its window", () => {
    const b = new TeaBushes();
    b.add(1, 1, 0);
    for (let i = 0; i < 20; i++) b.endDay("winter", 3);
    expect(b.at(1, 1)?.age).toBe(20);
    expect(b.at(1, 1)?.leaves).toBe(0);
    b.endDay("summer", 21);
    expect(b.at(1, 1)?.leaves).toBe(0);
    b.endDay("summer", 22);
    expect(b.at(1, 1)?.leaves).toBe(1);
    b.endDay("summer", 23);
    expect(b.at(1, 1)?.leaves).toBe(1);
  });

  it("saves and loads", () => {
    const g = newGame();
    g.teaBushes.add(4, 5, 12);
    g.greenhouseTeaBushes.add(2, 2, 30);
    g.teaBushes.at(4, 5)!.leaves = 1;
    const back = deserialize(serialize(g));
    expect(back!.teaBushes.at(4, 5)).toMatchObject({ age: 12, leaves: 1 });
    expect(back!.greenhouseTeaBushes.at(2, 2)?.age).toBe(30);
  });
});

describe("tea bush play", () => {
  it("is crafted at foraging level 3 from wild seeds and fiber", () => {
    const r = recipeById("tea-sapling")!;
    expect(r.result.item).toBe(TEA_SAPLING);
    expect(itemById(TEA_SAPLING)).toBeDefined();
    expect(itemById(TEA_LEAF)).toBeDefined();
    const g = newGame();
    expect(known(g, r)).toBe(false);
    g.skills.gain("foraging", 100000);
    expect(known(g, r)).toBe(true);
  });

  it("plants a sapling on open ground, blocks the hoe and the spot", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(TEA_SAPLING, 2);
    expect(plantTeaBush(g, map, 5, 5).ok).toBe(true);
    expect(g.teaBushes.at(5, 5)).toBeDefined();
    expect(g.inventory.count(TEA_SAPLING)).toBe(1);
    expect(plantTeaBush(g, map, 5, 5).ok).toBe(false);
    expect(plantTeaBush(g, map, 6, 5).ok).toBe(true);
    const hoe = useHeld(g, map, { kind: "tool", tool: "hoe" }, 5, 5);
    expect(hoe.ok).toBe(false);
  });

  it("is planted from the held item and picked with the hand", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(TEA_SAPLING);
    expect(
      useHeld(g, map, { kind: "item", id: TEA_SAPLING, count: 1 }, 3, 3).ok,
    ).toBe(true);
    expect(pickTeaLeaves(g, 3, 3).ok).toBe(false);
    g.teaBushes.at(3, 3)!.leaves = 1;
    expect(pickTeaLeaves(g, 3, 3).ok).toBe(true);
    expect(g.inventory.count(TEA_LEAF)).toBe(1);
  });

  it("sleeps a bush forward through the calendar", () => {
    const g = newGame();
    g.teaBushes.add(2, 2, 25);
    g.day.clock.day = 21;
    sleep(g, [], () => 0.5, soilMap());
    expect(g.teaBushes.at(2, 2)?.age).toBe(26);
    expect(g.teaBushes.at(2, 2)?.leaves).toBe(1);
  });

  it("is felled in 2 hits by a gold axe and returns its sapling", () => {
    const g = newGame();
    const map = soilMap();
    g.teaBushes.add(3, 3, 25);
    g.toolTiers.axe = 2;
    const iron = chop(g, 3, 3, Math.random, map);
    expect(iron).toEqual({ ok: false, reason: "needs a better axe" });
    g.toolTiers.axe = 3;
    expect(chop(g, 3, 3, Math.random, map).ok).toBe(true);
    expect(g.teaBushes.at(3, 3)).toBeDefined();
    expect(chop(g, 3, 3, Math.random, map).ok).toBe(true);
    expect(g.teaBushes.at(3, 3)).toBeUndefined();
    expect(g.inventory.count(TEA_SAPLING)).toBe(1);
  });

  it("lifts a young bush in one swing with any axe", () => {
    const g = newGame();
    g.teaBushes.add(3, 3, 4);
    expect(chop(g, 3, 3, Math.random, soilMap()).ok).toBe(true);
    expect(g.inventory.count(TEA_SAPLING)).toBe(1);
  });
});
