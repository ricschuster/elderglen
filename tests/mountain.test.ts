import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import { isAreaMap, newAreas } from "../src/core/areas";
import { fishAvailable, FISH } from "../src/core/fishing";
import {
  FORAGE_AREAS,
  forageCap,
  forageWeights,
} from "../src/core/forageareas";
import { exitOpen, layersAtTier } from "../src/core/map";
import { exitLabel, serviceLabel } from "../src/core/labels";
import { MINES_OPEN_DAY } from "../src/core/mines";
import { newGame } from "../src/core/save";
import { holdsOf } from "../src/core/worldflags";

const mountain = maps.get("mountain");
const open = maps.getWith("mountain", new Set(["mines-open"]));
const shut = maps.getWith("mountain", new Set());

describe("the Mountain map (note 74, steps 1 to 3)", () => {
  it("is 80 by 70, rideable, wild, mountain lake by default, and meets the contract", () => {
    expect(mountain.width).toBe(80);
    expect(mountain.height).toBe(70);
    expect(mountain.rideable).toBe(true);
    expect(mountain.wild).toBe(true);
    expect(isAreaMap("mountain")).toBe(true);
    expect(mountain.traits.waterKind).toBe("mountain-lake");
    expect(maps.problems()).toEqual([]);
    expect(Object.keys(newAreas())).toContain("mountain");
  });

  it("joins the Forest both ways and leaves the Hearthwell exit unauthored", () => {
    expect(mountain.exits.find((e) => e.id === "to_forest")).toMatchObject({
      map: "forest",
      entry: "from_mountain",
      x: 0,
      h: 7,
    });
    expect(
      maps.get("forest").exits.find((e) => e.id === "to_mountain"),
    ).toMatchObject({
      map: "mountain",
      entry: "from_forest",
      x: 119,
      y: 60,
      h: 7,
    });
    expect(maps.get("forest").entry("from_mountain")).toMatchObject({
      x: 116,
      y: 63,
    });
    expect(mountain.entry("from_forest")).toMatchObject({ x: 3, y: 37 });
    expect(mountain.entry("from_hearthwell")).toMatchObject({ x: 47, y: 66 });
    expect(mountain.exits.map((e) => e.id).sort()).toEqual([
      "forge",
      "mine",
      "to_forest",
    ]);
    expect(exitLabel("to_mountain")).toBe("Mountain");
    const forest = maps.get("forest");
    const walkable = forest.reachable(forest.entry("from_farm")!);
    expect(walkable.has("118,63")).toBe(true);
    expect(walkable.has("119,60")).toBe(true);
  });

  it("moves the Mines door from the farm to the mine mouth", () => {
    for (const id of ["farm", "farm-woodland"]) {
      const farm = maps.get(id);
      expect(farm.exits.find((e) => e.id === "mine")).toBeUndefined();
      expect(farm.entry("from_mine")).toBeUndefined();
      expect(farm.isBlocked(20, 0)).toBe(true);
    }
    const door = mountain.exits.find((e) => e.id === "mine")!;
    expect(door).toMatchObject({
      map: "mine",
      entry: "door",
      x: 68,
      y: 10,
      requires: "mines-open",
    });
    expect(mountain.entry("from_mine")).toMatchObject({ x: 68, y: 13 });
    expect(maps.get("mine").exits.find((e) => e.id === "door")).toMatchObject({
      map: "mountain",
      entry: "from_mine",
    });
  });

  it("has the lake, the river from its mouth, and the footbridge as walkable ground", () => {
    expect(mountain.waterKindAt(30, 17)).toBe("mountain-lake");
    expect(mountain.waterKindAt(49, 25)).toBe("river");
    expect(mountain.waterKindAt(46, 18)).toBe("river");
    expect(mountain.waterKindAt(54, 60)).toBe("river");
    expect(mountain.waterKindAt(10, 60)).toBeUndefined();
    for (const [x, y] of [
      [30, 17],
      [49, 25],
      [54, 60],
    ] as const)
      expect(mountain.isBlocked(x, y)).toBe(true);
    // The bridge is 6 by 3 at x 47 to 52, y 35 to 37.
    for (let x = 47; x <= 52; x++)
      for (let y = 35; y <= 37; y++)
        expect(mountain.isBlocked(x, y)).toBe(false);
    // The river is not crossable anywhere else on the east bank walk.
    expect(mountain.isBlocked(49, 34)).toBe(true);
    expect(mountain.isBlocked(51, 38)).toBe(true);
  });

  it("reaches the east half and the Hearthwell road from the Forest entry", () => {
    const walkable = mountain.reachable(mountain.entry("from_forest")!);
    expect(walkable.has("60,36")).toBe(true);
    expect(walkable.has("63,40")).toBe(true);
    expect(walkable.has("47,66")).toBe(true);
    expect(walkable.has("46,22")).toBe(true);
    // The Hearthwell road is on the west bank.
    expect(mountain.isBlocked(47, 66)).toBe(false);
  });

  it("shuts the rockfall until the mines open, and the mine mouth is behind it", () => {
    const from = { x: 63, y: 36 };
    const north = (m: typeof open) => m.reachable(from);
    expect(north(shut).has("63,20")).toBe(true);
    for (const x of [60, 63, 66]) {
      for (const y of [14, 16, 18]) {
        expect(shut.isBlocked(x, y), `${x},${y} shut`).toBe(true);
        expect(open.isBlocked(x, y), `${x},${y} open`).toBe(false);
      }
    }
    expect(north(shut).has("63,13")).toBe(false);
    expect(north(shut).has("68,11")).toBe(false);
    expect(north(open).has("63,13")).toBe(true);
    expect(north(open).has("68,13")).toBe(true);
    expect(north(open).has("68,11")).toBe(true);
    // The mine mouth stays closed to a western walker either way: nothing but
    // the rockfall leads there.
    const west = mountain.reachable(mountain.entry("from_forest")!);
    expect(west.has("68,13")).toBe(false);
  });

  it("clears the rockfall on Spring 5, when the mines open", () => {
    const g = newGame();
    const door = mountain.exits.find((e) => e.id === "mine")!;
    g.day.clock.day = MINES_OPEN_DAY - 1;
    expect(holdsOf(g).has("mines-open")).toBe(false);
    expect(exitOpen(door, holdsOf(g))).toBe(false);
    g.day.clock.day = MINES_OPEN_DAY;
    expect(holdsOf(g).has("mines-open")).toBe(true);
    expect(exitOpen(door, holdsOf(g))).toBe(true);
    const json = mapFiles["mountain"]!;
    const shown = (holds: string[]) =>
      layersAtTier(json, 0, new Set(holds)).map((l) => l.name);
    expect(shown([])).toContain("rockfall");
    expect(shown(["mines-open"])).not.toContain("rockfall");
  });

  it("holds about 80 pines, 60 rocks, 30 twigs, 30 weeds and 24 forage spots", () => {
    expect(mountain.trees.length).toBe(80);
    expect(mountain.trees.every((t) => t.kind === "pine" && !t.large)).toBe(
      true,
    );
    expect(mountain.trees.filter((t) => t.stage === 5).length).toBe(56);
    expect(mountain.rocks.length).toBe(60);
    expect(mountain.litter.twigs.length).toBe(30);
    expect(mountain.litter.weeds.length).toBe(30);
    expect(mountain.forageSpots.length).toBe(24);
    // Every pine can be reached from beside it.
    const walkable = mountain.reachable(mountain.entry("from_forest")!);
    for (const t of mountain.trees) {
      const beside = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => walkable.has(`${t.x + dx!},${t.y + dy!}`));
      expect(beside, `pine at ${t.x},${t.y}`).toBe(true);
    }
  });

  it("has its own forage table, cap 4, from goods that exist", () => {
    const area = FORAGE_AREAS["mountain"]!;
    expect(forageCap(area, "spring")).toBe(4);
    const names = (s: "spring" | "summer" | "fall" | "winter") =>
      forageWeights(area, "default", s).map((w) => w.id);
    expect(names("spring")).toEqual(["leek", "horseradish"]);
    expect(names("winter")).toEqual(["crocus", "pine-nut", "holly-sprig"]);
  });

  it("has the six lake fish and no river fish of its own", () => {
    const lake = FISH.filter((f) => f.water === "mountain-lake");
    expect(lake.map((f) => f.id).sort()).toEqual(
      [
        "arctic-char",
        "cold-quill",
        "ember-trout",
        "glacier-ghost",
        "granite-gudgeon",
        "echo-pike",
      ].sort(),
    );
    const winter = {
      season: "winter",
      minutes: 12 * 60,
      raining: false,
    } as const;
    const ids = fishAvailable("mountain-lake", winter).map((f) => f.id);
    expect(ids).toEqual(
      expect.arrayContaining(["cold-quill", "arctic-char", "granite-gudgeon"]),
    );
    expect(ids).not.toContain("ember-trout");
    expect(fishAvailable("river", winter).length).toBeGreaterThan(0);
  });
});

describe("the forge and the stonekeeper's yard (note 74, steps 4 and 5)", () => {
  const forge = maps.get("forge");

  it("has a forge hut door on the Mountain and a smith counter inside", () => {
    expect(mountain.exits.find((e) => e.id === "forge")).toMatchObject({
      map: "forge",
      entry: "door",
      x: 18,
      y: 46,
    });
    expect(mountain.entry("from_forge")).toMatchObject({ x: 18, y: 47 });
    expect(forge.exits.find((e) => e.id === "door")).toMatchObject({
      map: "mountain",
      entry: "from_forge",
    });
    expect(forge.services.map((s) => s.kind)).toEqual(["smith"]);
    expect(serviceLabel("stonekeeper", "stonekeeper")).toBe("Stonekeeper");
    expect(maps.problems()).toEqual([]);
  });

  it("moves the smith counter off the mine hall", () => {
    expect(
      maps.get("mine").services.find((s) => s.kind === "smith"),
    ).toBeUndefined();
  });

  it("walks from the road to the forge door and back", () => {
    const from = mountain.entry("from_forge")!;
    const walkable = mountain.reachable(from);
    expect(walkable.has("18,47")).toBe(true);
    expect(walkable.has("3,37")).toBe(true);
    expect(mountain.isBlocked(17, 46)).toBe(true);
    expect(mountain.isBlocked(18, 46)).toBe(false);
  });

  it("keeps the yard reachable over the footbridge, with its bench and stone stack", () => {
    const walkable = mountain.reachable(mountain.entry("from_forest")!);
    expect(walkable.has("66,47")).toBe(true);
    expect(walkable.has("62,44")).toBe(true);
    expect(mountain.isBlocked(70, 44)).toBe(true);
    expect(mountain.isBlocked(65, 45)).toBe(true);
    expect(mountain.serviceAt(66, 46)?.kind).toBe("stonekeeper");
    expect(walkable.has("66,47")).toBe(true);
  });

  it("leaves the Quarry bridge and exit unbuilt", () => {
    expect(mountain.exits.find((e) => e.id === "to_quarry")).toBeUndefined();
    expect(mountain.entry("from_quarry")).toBeUndefined();
  });
});
