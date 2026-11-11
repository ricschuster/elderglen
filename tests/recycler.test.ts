import { describe, expect, it } from "vitest";
import { known, RECIPES } from "../src/core/crafting";
import { bite, rodTrashChance } from "../src/core/fishing";
import {
  collectMachine,
  loadMachine,
  placeMachine,
} from "../src/core/machines";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { JUNK, landTrash } from "../src/core/pots";
import {
  processFor,
  RECYCLER_MINUTES,
  RECYCLER_OUTPUTS,
  recyclerRoll,
} from "../src/core/processing";
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

const day = { season: "summer", minutes: 600, raining: false } as const;

describe("trash on the rod", () => {
  it("is likelier in weak waters", () => {
    expect(rodTrashChance("farm-pond")).toBe(0.15);
    expect(rodTrashChance("marsh-lake")).toBe(0.15);
    expect(rodTrashChance("river")).toBeLessThan(0.05);
  });

  it("bites as trash on a low roll in a weak water, with an item from the junk list", () => {
    const b = bite("farm-pond", day, () => 0.01);
    expect(b.kind).toBe("trash");
    if (b.kind === "trash") expect(JUNK.map((j) => j.id)).toContain(b.item);
  });

  it("never comes on the tutorial cast", () => {
    expect(bite("farm-pond", day, () => 0.01, true).kind).toBe("fish");
  });

  it("gives no bar roll above the chance", () => {
    expect(bite("farm-pond", day, () => 0.5).kind).toBe("fish");
  });

  it("lands in the pack, gives junk XP and drops when the pack is full", () => {
    const g = newGame();
    const at = { x: 1, y: 1 };
    const before = g.skills.save().fishing;
    expect(landTrash(g, at, "old-boot").dropped).toBe(false);
    expect(g.inventory.count("old-boot")).toBe(1);
    expect(g.skills.save().fishing).toBeGreaterThan(before);
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk${i}`);
    expect(landTrash(g, at, "cracked-jar").dropped).toBe(true);
  });
});

describe("the recycler", () => {
  it("takes trash only, in an hour", () => {
    const p = processFor("recycler", "old-boot", () => 0);
    expect(p?.minutes).toBe(RECYCLER_MINUTES);
    expect(p?.use).toBe(1);
    expect(processFor("recycler", "wood")).toBeUndefined();
    expect(processFor("recycler", "crab")).toBeUndefined();
  });

  it("draws an output by weight across its table", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(recyclerRoll(() => i / 100).item);
    expect([...seen].sort()).toEqual(
      RECYCLER_OUTPUTS.map((o) => o.item).sort(),
    );
  });

  it("is a fishing level 4 recipe of wood, stone and an iron bar", () => {
    const r = RECIPES.find((x) => x.id === "recycler")!;
    expect(r.ingredients.map((i) => i.item).sort()).toEqual([
      "iron-bar",
      "stone",
      "wood",
    ]);
    const g = newGame();
    expect(known(g, r)).toBe(false);
    g.skills.gain("fishing", LEVEL_XP[3]!);
    expect(known(g, r)).toBe(true);
  });

  it("runs a batch of trash to its output, overnight, and saves mid-job", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add("recycler");
    expect(placeMachine(g, map, 2, 2, "recycler").ok).toBe(true);
    g.inventory.add("old-boot");
    expect(loadMachine(g, 2, 2, "old-boot", () => 0).ok).toBe(true);
    expect(g.inventory.count("old-boot")).toBe(0);
    const back = deserialize(serialize(g))!;
    expect(back.machines.get(2, 2)?.job?.output).toBe("stone");
    sleep(g, [], () => 0.99, map);
    expect(collectMachine(g, 2, 2).ok).toBe(true);
    expect(g.inventory.count("stone")).toBe(3);
  });
});
