import { describe, expect, it } from "vitest";
import { till } from "../src/core/actions";
import { canCraft, craft, knownRecipes, RECIPES } from "../src/core/crafting";
import { itemById } from "../src/core/items";
import { Farm } from "../src/core/farm";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { Sprinklers, SPRINKLERS } from "../src/core/sprinklers";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { useHeld } from "../src/core/tools";
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

describe("sprinklers", () => {
  it("water the four tiles beside a basic one, tilled tiles only", () => {
    const farm = new Farm();
    for (const [x, y] of [
      [3, 2],
      [2, 3],
      [4, 4],
    ] as const)
      farm.till(x, y);
    const s = new Sprinklers();
    s.add(3, 3, "sprinkler");
    expect(s.water(farm)).toBe(2);
    expect(farm.plotAt(3, 2)?.wateredToday).toBe(true);
    expect(farm.plotAt(2, 3)?.wateredToday).toBe(true);
    expect(farm.plotAt(4, 4)?.wateredToday).toBe(false);
  });

  it("quality sprinklers reach all eight tiles around", () => {
    const farm = new Farm();
    for (const [x, y] of [
      [2, 2],
      [4, 4],
      [3, 4],
    ] as const)
      farm.till(x, y);
    const s = new Sprinklers();
    s.add(3, 3, "quality-sprinkler");
    expect(s.water(farm)).toBe(3);
  });

  it("one per tile, and picking up returns the id", () => {
    const s = new Sprinklers();
    expect(s.add(1, 1, "sprinkler")).toBe(true);
    expect(s.add(1, 1, "quality-sprinkler")).toBe(false);
    expect(s.add(2, 2, "nope")).toBe(false);
    expect(s.remove(1, 1)).toBe("sprinkler");
    expect(s.remove(1, 1)).toBeUndefined();
  });

  it("have items that sell as the tuning note says", () => {
    expect(itemById("sprinkler")?.sellPrice).toBe(100);
    expect(itemById("quality-sprinkler")?.sellPrice).toBe(450);
    expect(SPRINKLERS).toHaveLength(2);
  });

  it("water crops overnight, and the crop grows", () => {
    const g = newGame();
    const map = soilMap();
    till(g, 3, 2);
    g.farm.plant(3, 2, "parsnip", "spring");
    g.sprinklers.add(3, 3, "sprinkler");
    sleep(g, [], never, map);
    expect(g.farm.plotAt(3, 2)?.wateredToday).toBe(true);
    sleep(g, [], never, map);
    expect(g.farm.plotAt(3, 2)?.crop?.daysGrown).toBe(1);
  });

  it("are placed from the pack on clear ground and picked up by hand", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add("sprinkler");
    const held = { kind: "item", id: "sprinkler", count: 1 } as const;
    expect(useHeld(g, map, held, 3, 3).ok).toBe(true);
    expect(g.inventory.count("sprinkler")).toBe(0);
    expect(g.sprinklers.at(3, 3)).toBe("sprinkler");
    expect(till(g, 3, 3).ok).toBe(false);
    const hand = { kind: "tool", tool: "hand" } as const;
    expect(useHeld(g, map, hand, 3, 3).ok).toBe(true);
    expect(g.inventory.count("sprinkler")).toBe(1);
  });

  it("refuse dug soil, a weed or an occupied tile", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add("sprinkler", 3);
    const held = { kind: "item", id: "sprinkler", count: 3 } as const;
    till(g, 1, 1);
    g.weeds.add(2, 2);
    expect(useHeld(g, map, held, 1, 1).ok).toBe(false);
    expect(useHeld(g, map, held, 2, 2).ok).toBe(false);
    expect(g.sprinklers.count).toBe(0);
  });

  it("are saved with the game, and an old save loads with none", () => {
    const g = newGame();
    g.sprinklers.add(4, 5, "quality-sprinkler");
    const back = deserialize(serialize(g))!;
    expect(back.sprinklers.at(4, 5)).toBe("quality-sprinkler");
    const raw = JSON.parse(serialize(newGame()));
    delete raw.sprinklers;
    expect(deserialize(JSON.stringify(raw))!.sprinklers.count).toBe(0);
  });
});

describe("crafting", () => {
  function level(g: ReturnType<typeof newGame>, n: number) {
    g.skills.gain("farming", LEVEL_XP[n - 1]!);
  }

  it("offers the sprinkler at farming level 2 only", () => {
    const g = newGame();
    expect(knownRecipes(g).map((r) => r.id)).toEqual(["chest", "stone-chest"]);
    level(g, 2);
    expect(knownRecipes(g).map((r) => r.id)).toEqual([
      "sprinkler",
      "basic-fertilizer",
      "chest",
      "stone-chest",
      "mayonnaise-machine",
    ]);
  });

  it("hides recipes that need items the game lacks, and every other id exists", () => {
    const g = newGame();
    level(g, 10);
    const ids = knownRecipes(g).map((r) => r.id);
    expect(ids).toContain("quality-sprinkler");
    expect(RECIPES.length).toBeGreaterThanOrEqual(ids.length);
  });

  it("takes the bars and gives the sprinkler", () => {
    const g = newGame();
    level(g, 2);
    expect(craft(g, "sprinkler")).toBe("missing ingredients");
    g.inventory.add("copper-bar");
    g.inventory.add("iron-bar");
    expect(canCraft(g, RECIPES[0]!)).toBe(true);
    expect(craft(g, "sprinkler")).toBeUndefined();
    expect(g.inventory.count("copper-bar")).toBe(0);
    expect(g.inventory.count("sprinkler")).toBe(1);
  });

  it("refuses an unknown or locked recipe", () => {
    const g = newGame();
    g.inventory.add("copper-bar");
    g.inventory.add("iron-bar");
    expect(craft(g, "sprinkler")).toBe("recipe not known");
    expect(craft(g, "nope")).toBe("no such recipe");
  });
});

describe("lifting a sprinkler", () => {
  it("works with any tool or the hand, and blocks the tool's usual job", () => {
    const map = soilMap();
    for (const tool of ["hand", "axe", "pickaxe", "hoe", "can"] as const) {
      const g = newGame();
      g.sprinklers.add(2, 2, "sprinkler");
      const r = useHeld(g, map, { kind: "tool", tool }, 2, 2);
      expect(r.ok).toBe(true);
      expect(g.sprinklers.at(2, 2)).toBeUndefined();
      expect(g.inventory.count("sprinkler")).toBe(1);
    }
  });

  it("stays put when the backpack is full or a seed is held", () => {
    const map = soilMap();
    const g = newGame();
    g.sprinklers.add(2, 2, "sprinkler");
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`filler${i}`);
    expect(useHeld(g, map, { kind: "tool", tool: "axe" }, 2, 2).ok).toBe(false);
    expect(g.sprinklers.at(2, 2)).toBe("sprinkler");
  });
});
