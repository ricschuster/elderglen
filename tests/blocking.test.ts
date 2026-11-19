import { describe, expect, it } from "vitest";
import {
  gateShut,
  outdoorSoil,
  outdoorWorld,
  tileBlocked,
  tileBlockedNoHorse,
  type BlockWorld,
} from "../src/core/blocking";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { newGame } from "../src/core/save";

function soilMap(): FarmMap {
  const layer = (name: string, data: number[]) => ({
    name,
    type: "tilelayer",
    data,
  });
  const walls = new Array(64).fill(0);
  walls[0] = 1;
  const json: TiledMapJson = {
    width: 8,
    height: 8,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", walls),
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

function world(shut = false): BlockWorld {
  return {
    state: newGame(),
    map: soilMap(),
    mapId: "farm",
    rocks: undefined,
    festivalShut: () => shut,
  };
}

describe("tile blocking", () => {
  it("blocks a wall and leaves open ground free", () => {
    const w = world();
    expect(tileBlocked(w, 0, 0)).toBe(true);
    expect(tileBlocked(w, 4, 4)).toBe(false);
  });

  it("blocks a tile a festival is setting up", () => {
    expect(tileBlockedNoHorse(world(true), 4, 4)).toBe(true);
  });

  it("reads soil and the outdoor world off the map", () => {
    expect(outdoorSoil(soilMap())).toBe(true);
    expect(outdoorWorld(soilMap(), "farm")).toBe(true);
  });

  it("has no gate on a plain tile", () => {
    const w = world();
    expect(gateShut(w.state, w.map, w.mapId, 4, 4)).toBe(false);
  });
});
