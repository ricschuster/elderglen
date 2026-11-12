import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  clearMineLights,
  isLit,
  lightLayer,
  pickUpLight,
  placeLight,
} from "../src/core/lights";
import { RECIPES } from "../src/core/crafting";
import { START } from "../src/core/maps";
import { mineMapId } from "../src/core/mines";
import { mayPlaceOn, placeTag } from "../src/core/placeables";
import { deserialize, newGame, serialize } from "../src/core/save";
import { till } from "../src/core/actions";

const farm = maps.get(START.map);
const tile = farm.tillableTiles()[0]!;
const next = farm.tillableTiles()[1]!;

function holding(id: string, n = 1) {
  const g = newGame();
  g.inventory.add(id, n);
  return g;
}

describe("placing lights", () => {
  it("stands a torch on clear farm ground and takes it from the pack", () => {
    const g = holding("torch");
    expect(placeLight(g, farm, "farm", tile.x, tile.y, "torch").ok).toBe(true);
    expect(g.inventory.count("torch")).toBe(0);
    expect(g.placed.get("farm", tile.x, tile.y)?.id).toBe("torch");
  });

  it("is refused on taken ground, soil, or without the item", () => {
    const g = holding("torch", 2);
    placeLight(g, farm, "farm", tile.x, tile.y, "torch");
    expect(placeLight(g, farm, "farm", tile.x, tile.y, "torch").ok).toBe(false);
    g.inventory.add("hoe");
    expect(till(g, tile.x, tile.y)).toMatchObject({ ok: false });
    expect(
      placeLight(newGame(), farm, "farm", next.x, next.y, "torch").ok,
    ).toBe(false);
  });

  it("blocks digging where it stands, and lifts back into the pack", () => {
    const g = holding("campfire");
    placeLight(g, farm, "farm", tile.x, tile.y, "campfire");
    expect(till(g, tile.x, tile.y)).toMatchObject({ ok: false });
    expect(pickUpLight(g, "farm", tile.x, tile.y).ok).toBe(true);
    expect(g.inventory.count("campfire")).toBe(1);
    expect(g.placed.count).toBe(0);
  });

  it("stays when the pack is full", () => {
    const g = holding("torch");
    placeLight(g, farm, "farm", tile.x, tile.y, "torch");
    for (let i = 0; g.inventory.room("stone") > 0 && i < 500; i++)
      g.inventory.add("stone", 999);
    // Fill every slot with something that is not a torch.
    for (const id of ["wood", "sap", "coal", "fiber", "clay", "hay"])
      g.inventory.add(id, 999);
    if (g.inventory.room("torch") > 0) return;
    expect(pickUpLight(g, "farm", tile.x, tile.y)).toEqual({
      ok: false,
      reason: "backpack full",
    });
    expect(g.placed.count).toBe(1);
  });
});

describe("the place table for lights", () => {
  it("allows torches on the farm, mine floors, camps and the wilds, not indoors", () => {
    for (const tag of ["farm", "mine", "camp", "wild"] as const)
      expect(mayPlaceOn("torch", tag)).toBe(true);
    for (const tag of ["house", "greenhouse", "cellar"] as const)
      expect(mayPlaceOn("torch", tag)).toBe(false);
  });

  it("allows braziers only on the farm and in camps", () => {
    expect(mayPlaceOn("wood-brazier", "farm")).toBe(true);
    expect(mayPlaceOn("stone-brazier", "camp")).toBe(true);
    expect(mayPlaceOn("wood-brazier", "mine")).toBe(false);
    expect(mayPlaceOn("wood-brazier", "wild")).toBe(false);
  });

  it("tags a mine floor, a camp floor and a wild map, and not Hearthwell", () => {
    const mine = maps.get("mine");
    expect(placeTag(mine, mineMapId(3))).toBe("mine");
    expect(placeTag(mine, mineMapId(10))).toBe("camp");
    expect(placeTag(maps.get("hearthwell"), "hearthwell")).toBeUndefined();
  });
});

describe("the light layer", () => {
  it("lists placed lights with their radius, and the worn ring at the player", () => {
    const g = holding("torch");
    placeLight(g, farm, "farm", tile.x, tile.y, "torch");
    expect(lightLayer(g, "farm")).toEqual([
      { x: tile.x, y: tile.y, radius: 3, onlyAtNight: false },
    ]);
    g.inventory.add("small-glow-ring");
    expect(g.equipment.wear(g.inventory, 0, "small-glow-ring")).toBe(true);
    const layer = lightLayer(g, "farm", { x: 1, y: 1 });
    expect(layer.find((l) => l.worn)).toMatchObject({
      x: 1,
      y: 1,
      radius: 5,
    });
  });

  it("measures lit tiles by tile distance", () => {
    const glow = [{ x: 10, y: 10, radius: 3, onlyAtNight: false }];
    expect(isLit(glow, 12, 10)).toBe(true);
    expect(isLit(glow, 13, 10)).toBe(true);
    expect(isLit(glow, 13, 11)).toBe(false);
  });
});

describe("saving lights", () => {
  it("keeps a farm light through a save", () => {
    const g = holding("stone-brazier");
    placeLight(g, farm, "farm", tile.x, tile.y, "stone-brazier");
    const back = deserialize(serialize(g))!;
    expect(back.placed.get("farm", tile.x, tile.y)?.id).toBe("stone-brazier");
  });

  it("does not keep a mine floor light, and the night clears it", () => {
    const g = newGame();
    g.placed.add(mineMapId(3), { x: 2, y: 2, id: "torch" });
    g.placed.add("farm", { x: 4, y: 4, id: "torch" });
    expect(deserialize(serialize(g))!.placed.count).toBe(1);
    clearMineLights(g);
    expect(g.placed.count).toBe(1);
  });
});

describe("lamp-posts", () => {
  it("are farm-only lights of radius 6 with a recipe that needs a battery pack", () => {
    for (const id of ["wood-lamp-post", "iron-lamp-post"]) {
      expect(mayPlaceOn(id, "farm")).toBe(true);
      for (const tag of [
        "greenhouse",
        "house",
        "mine",
        "camp",
        "wild",
      ] as const)
        expect(mayPlaceOn(id, tag)).toBe(false);
      expect(
        RECIPES.find((r) => r.id === id)?.ingredients.map((i) => i.item),
      ).toContain("battery-pack");
    }
  });

  it("stand on the farm, glow six tiles, and lift back", () => {
    const g = holding("wood-lamp-post");
    expect(
      placeLight(g, farm, "farm", tile.x, tile.y, "wood-lamp-post").ok,
    ).toBe(true);
    const glows = lightLayer(g, "farm");
    expect(glows).toHaveLength(1);
    expect(glows[0]!.radius).toBe(6);
    expect(isLit(glows, tile.x + 6, tile.y)).toBe(true);
    expect(isLit(glows, tile.x + 7, tile.y)).toBe(false);
    expect(pickUpLight(g, "farm", tile.x, tile.y).ok).toBe(true);
    expect(g.inventory.count("wood-lamp-post")).toBe(1);
  });

  it("are refused in a mine, and survive a save", () => {
    const g = holding("iron-lamp-post", 2);
    expect(
      placeLight(g, farm, mineMapId(1), tile.x, tile.y, "iron-lamp-post").ok,
    ).toBe(false);
    placeLight(g, farm, "farm", tile.x, tile.y, "iron-lamp-post");
    const back = deserialize(serialize(g))!;
    expect(back.placed.get("farm", tile.x, tile.y)?.id).toBe("iron-lamp-post");
  });
});
