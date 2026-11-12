import { describe, expect, it } from "vitest";
import { CHESTS } from "../src/core/chestdefs";
import { itemById } from "../src/core/items";
import { MACHINES } from "../src/core/processing";
import {
  mayPlaceOn,
  PLACEABLES,
  placeableById,
  placeTag,
} from "../src/core/placeables";
import { SPRINKLERS } from "../src/core/sprinklers";
import { maps } from "../src/content/maps";
import { FARM_TYPES, farmMapOf } from "../src/core/farmtypes";
import { GREENHOUSE_MAP } from "../src/core/greenhouse";
import { HOUSE_MAP } from "../src/core/house";
import { newGame } from "../src/core/save";

describe("placeables table", () => {
  it("has one row for every sprinkler, machine, chest and light", () => {
    for (const s of SPRINKLERS)
      expect(placeableById(s.id)?.kind).toBe("sprinkler");
    for (const m of MACHINES) expect(placeableById(m.id)?.kind).toBe("machine");
    for (const c of CHESTS) expect(placeableById(c.id)?.kind).toBe("chest");
    const lights = PLACEABLES.filter((p) => p.kind === "light");
    for (const l of lights) expect(l.light?.radius, l.id).toBeGreaterThan(0);
    expect(PLACEABLES).toHaveLength(
      SPRINKLERS.length + MACHINES.length + CHESTS.length + lights.length,
    );
  });

  it("names only real items, once each", () => {
    const ids = PLACEABLES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(itemById(id), id).toBeDefined();
  });

  it("keeps the cask in the cellar and the rest where they stood", () => {
    expect(placeableById("cask")?.places).toEqual(["cellar"]);
    expect(mayPlaceOn("keg", "farm")).toBe(true);
    expect(mayPlaceOn("keg", "greenhouse")).toBe(false);
    expect(mayPlaceOn("sprinkler", "greenhouse")).toBe(true);
    expect(mayPlaceOn("chest", "house")).toBe(true);
    expect(mayPlaceOn("chest", "greenhouse")).toBe(false);
    expect(mayPlaceOn("chest", undefined)).toBe(false);
    expect(mayPlaceOn("nothing", "farm")).toBe(false);
  });

  it("tags the farm, the greenhouse and a house, and nothing else", () => {
    const g = newGame();
    const farm = farmMapOf(g);
    expect(placeTag(farm)).toBe("farm");
    expect(placeTag(farm, FARM_TYPES[0]!.map)).toBe("farm");
    expect(placeTag(maps.get(GREENHOUSE_MAP))).toBe("greenhouse");
    expect(placeTag(maps.get(HOUSE_MAP), HOUSE_MAP)).toBe("house");
    expect(placeTag(maps.get("green"), "green")).toBeUndefined();
  });
});
