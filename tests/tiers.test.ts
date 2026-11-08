import { describe, expect, it } from "vitest";
import {
  FarmMap,
  layerBase,
  layersAtTier,
  layerTier,
  maxTierOf,
  visibleTier,
  type TiledLayer,
  type TiledMapJson,
  type TiledObject,
} from "../src/core/map";
import { MapRegistry } from "../src/core/maps";

const W = 8;
const H = 4;
const tiles = (rows: string[]): number[] => rows.join("").split("").map(Number);
const tl = (name: string, rows: string[]): TiledLayer => ({
  name,
  type: "tilelayer",
  data: tiles(rows),
});
const pt = (
  cls: string,
  name: string,
  x: number,
  y: number,
  props: Record<string, unknown> = {},
): TiledObject => ({
  name,
  class: cls,
  x: x * 16,
  y: y * 16,
  properties: Object.entries(props).map(([k, value]) => ({ name: k, value })),
});

/**
 * A tiny growing building: a 3 wide room at tier 0, and a second 3 wide room
 * to its right at tier 1, joined by a doorway cut through the shared wall.
 */
const grow = (
  props: TiledMapJson["properties"] = [],
  extra: TiledLayer[] = [],
): TiledMapJson => ({
  width: W,
  height: H,
  tilewidth: 16,
  tileheight: 16,
  properties: props,
  layers: [
    // Tier 0: columns 0 to 3 (walls at 0 and 3, and along the bottom).
    tl("ground", ["73370000", "73370000", "73370000", "77770000"]),
    // Tier 1: columns 4 to 7, and floor over the shared wall at (3, 1).
    tl("ground-t1", ["00003337", "00033337", "00003337", "00007777"]),
    tl("collision", ["10010000", "10010000", "10010000", "11110000"]),
    // Tier 1 opens (3, 1) in the shared wall and walls in the new room.
    tl("collision-t1", ["00000001", "00020001", "00000001", "00001111"]),
    {
      name: "markers",
      type: "objectgroup",
      objects: [
        pt("entry", "door", 1, 1),
        pt("exit", "door", 1, 2, { map: "farm", entry: "from_house" }),
        pt("service", "bed", 2, 2, { kind: "bed" }),
      ],
    },
    {
      name: "markers-t1",
      type: "objectgroup",
      objects: [
        pt("service", "bed", 6, 2, { kind: "bed" }),
        pt("exit", "door", 5, 2, { map: "farm", entry: "from_house" }),
      ],
    },
    ...extra,
  ],
});

describe("tier layer names", () => {
  it("reads the tier from the suffix", () => {
    expect(layerTier("ground")).toBe(0);
    expect(layerTier("ground-t1")).toBe(1);
    expect(layerTier("objects-t12")).toBe(12);
    expect(layerTier("t1-ground")).toBe(0);
    expect(layerBase("walls-t2")).toBe("walls");
    expect(layerBase("walls")).toBe("walls");
  });

  it("finds the highest tier of a map", () => {
    expect(maxTierOf(grow())).toBe(1);
    expect(maxTierOf({ ...grow(), layers: [tl("ground", ["0"])] })).toBe(0);
  });

  it("keeps the visible tier inside what the map has", () => {
    expect(visibleTier(0, 1)).toBe(0);
    expect(visibleTier(5, 1)).toBe(1);
    expect(visibleTier(-3, 1)).toBe(0);
    expect(visibleTier(1.9, 3)).toBe(1);
    expect(visibleTier(NaN, 3)).toBe(0);
    expect(visibleTier(2, 0)).toBe(0);
  });

  it("lists only the layers at or below the tier, lowest tier first", () => {
    const names = (t: number) => layersAtTier(grow(), t).map((l) => l.name);
    expect(names(0)).toEqual(["ground", "collision", "markers"]);
    expect(names(1)).toEqual([
      "ground",
      "collision",
      "markers",
      "ground-t1",
      "collision-t1",
      "markers-t1",
    ]);
  });
});

describe("a map read at a tier", () => {
  it("blocks the unbuilt space at tier 0 and opens it at tier 1", () => {
    const t0 = FarmMap.fromTiled(grow(), 0);
    const t1 = FarmMap.fromTiled(grow(), 1);
    expect(t0.isBlocked(5, 1)).toBe(true);
    expect(t1.isBlocked(5, 1)).toBe(false);
  });

  it("treats a cell with no ground as void even where collision is empty", () => {
    const m = FarmMap.fromTiled(grow(), 0);
    // Collision says open at (6, 1), but nothing is built there.
    expect(m.isBlocked(6, 1)).toBe(true);
    expect(m.reachable({ x: 1, y: 1 }).has("6,1")).toBe(false);
  });

  it("lets a tier open a cell of a lower tier with the open tile", () => {
    expect(FarmMap.fromTiled(grow(), 0).isBlocked(3, 1)).toBe(true);
    expect(FarmMap.fromTiled(grow(), 1).isBlocked(3, 1)).toBe(false);
  });

  it("does not change a map with no tier layers", () => {
    const flat: TiledMapJson = {
      width: 2,
      height: 1,
      tilewidth: 16,
      tileheight: 16,
      layers: [tl("ground", ["00"]), tl("collision", ["01"])],
    };
    const m = FarmMap.fromTiled(flat, 0);
    expect(m.isBlocked(0, 0)).toBe(false);
    expect(m.isBlocked(1, 0)).toBe(true);
    expect(m.bounds).toEqual({ x: 0, y: 0, w: 2, h: 1 });
    expect(FarmMap.fromTiled(flat, 4).tier).toBe(0);
  });

  it("clamps the tier it reads", () => {
    expect(FarmMap.fromTiled(grow(), 9).tier).toBe(1);
  });

  it("takes the highest named door and bed at or below the tier", () => {
    const t0 = FarmMap.fromTiled(grow(), 0);
    const t1 = FarmMap.fromTiled(grow(), 1);
    expect(t0.services.map((s) => [s.id, s.x])).toEqual([["bed", 2]]);
    expect(t1.services.map((s) => [s.id, s.x])).toEqual([["bed", 6]]);
    expect(t0.exits).toHaveLength(1);
    expect(t1.exits).toHaveLength(1);
    expect(t0.exits[0]!.x).toBe(1);
    expect(t1.exits[0]!.x).toBe(5);
  });

  it("puts an object on a tier with its own tier property", () => {
    const json = grow(
      [],
      [
        {
          name: "extra",
          type: "objectgroup",
          objects: [pt("forage", "f", 1, 1, { tier: 1 })],
        },
      ],
    );
    expect(FarmMap.fromTiled(json, 0).forageSpots).toHaveLength(0);
    expect(FarmMap.fromTiled(json, 1).forageSpots).toHaveLength(1);
  });

  it("keeps two same-named objects of one tier, so duplicates are still caught", () => {
    const json = grow(
      [],
      [
        {
          name: "dup",
          type: "objectgroup",
          objects: [pt("service", "bed", 2, 1, { kind: "bed" })],
        },
      ],
    );
    expect(FarmMap.fromTiled(json, 0).problems()).toContain(
      "service names must be unique",
    );
  });
});

describe("camera bounds per tier", () => {
  const props = [
    { name: "bounds", value: "0,0,4,4" },
    { name: "bounds-t1", value: "0,0,8,4" },
  ];

  it("reads the map property for the tier", () => {
    expect(FarmMap.fromTiled(grow(props), 0).bounds).toEqual({
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    });
    expect(FarmMap.fromTiled(grow(props), 1).bounds).toEqual({
      x: 0,
      y: 0,
      w: 8,
      h: 4,
    });
  });

  it("falls back to the box around the built cells", () => {
    expect(FarmMap.fromTiled(grow(), 0).bounds).toEqual({
      x: 0,
      y: 0,
      w: 4,
      h: 4,
    });
    expect(FarmMap.fromTiled(grow(), 1).bounds).toEqual({
      x: 0,
      y: 0,
      w: 8,
      h: 4,
    });
  });

  it("uses the nearest lower tier's property when a tier has none", () => {
    const only0 = [{ name: "bounds", value: "1,1,2,2" }];
    expect(FarmMap.fromTiled(grow(only0), 1).bounds).toEqual({
      x: 1,
      y: 1,
      w: 2,
      h: 2,
    });
  });

  it("ignores a property that is not four whole numbers", () => {
    const bad = [{ name: "bounds", value: "1,1,x,2" }];
    expect(FarmMap.fromTiled(grow(bad), 0).bounds.w).toBe(4);
  });
});

describe("the registry at a tier", () => {
  it("holds every tier of a map and the highest tier", () => {
    const reg = MapRegistry.fromTiled({ grow: grow() });
    expect(reg.maxTier("grow")).toBe(1);
    expect(reg.get("grow").tier).toBe(0);
    expect(reg.get("grow", 1).tier).toBe(1);
    expect(reg.get("grow", 7).tier).toBe(1);
  });

  it("checks every tier for problems", () => {
    const json = grow();
    // The tier 1 door leads to an entry that does not exist.
    json.layers.find((l) => l.name === "markers-t1")!.objects![1]!.properties =
      [
        { name: "map", value: "farm" },
        { name: "entry", value: "nowhere" },
      ];
    const farm: TiledMapJson = {
      ...grow(),
      layers: [
        tl("ground", ["0".repeat(W * H)]),
        tl("collision", ["0".repeat(W * H)]),
        {
          name: "m",
          type: "objectgroup",
          objects: [
            pt("entry", "start", 0, 0),
            pt("entry", "from_house", 1, 1),
          ],
        },
      ],
    };
    const reg = MapRegistry.fromTiled({ farm, grow: json });
    const problems = reg.problems();
    expect(problems.some((p) => p.startsWith("grow tier 1:"))).toBe(true);
    expect(problems.some((p) => p.startsWith("grow tier 0:"))).toBe(false);
  });
});
