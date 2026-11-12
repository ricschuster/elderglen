import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  BUILDING_ORDER,
  HAY_PRICE,
  buyAnimal,
  buyHay,
  animalProblem,
  speciesOf,
} from "../src/core/animals";
import { newGame } from "../src/core/save";
import { serviceLabel } from "../src/core/labels";
import {
  CAMP_LINE,
  HERMIT_LINE,
  KEEPER_ADVICE,
  keeperAdvice,
} from "../src/core/forestfolk";

const forest = maps.get("forest");
const farmstead = maps.get("forest-farmstead");
const tower = maps.get("hermit-tower");

describe("the Forest's farmstead, tower and camp (note 72, part 2)", () => {
  it("meets the map contract", () => {
    expect(maps.problems()).toEqual([]);
    expect(farmstead.wild).toBe(false);
    expect(tower.wild).toBe(false);
  });

  it("has doors that lead in and back out", () => {
    expect(forest.exits.find((e) => e.id === "farmstead")).toMatchObject({
      map: "forest-farmstead",
      entry: "door",
      x: 96,
      y: 22,
    });
    expect(forest.exits.find((e) => e.id === "hermit")).toMatchObject({
      map: "hermit-tower",
      entry: "door",
      x: 22,
      y: 92,
    });
    expect(forest.entry("from_farmstead")).toMatchObject({ x: 96, y: 23 });
    expect(forest.entry("from_hermit")).toMatchObject({ x: 22, y: 93 });
    expect(farmstead.exits.find((e) => e.id === "door")).toMatchObject({
      map: "forest",
      entry: "from_farmstead",
    });
    expect(tower.exits.find((e) => e.id === "door")).toMatchObject({
      map: "forest",
      entry: "from_hermit",
    });
  });

  it("walks from the farm road to every door, and from each door into its room", () => {
    const walkable = forest.reachable(forest.entry("from_farm")!);
    for (const at of ["96,23", "22,93", "85,84", "85,84", "73,70"])
      expect(walkable.has(at)).toBe(true);
    // The door tiles are open, the walls beside them are not.
    expect(forest.isBlocked(96, 22)).toBe(false);
    expect(forest.isBlocked(95, 22)).toBe(true);
    expect(forest.isBlocked(22, 92)).toBe(false);
    expect(forest.isBlocked(21, 92)).toBe(true);
    for (const room of [farmstead, tower]) {
      const door = room.exits.find((e) => e.id === "door")!;
      const inside = room.reachable(room.entry("door")!);
      expect(inside.has(`${door.x},${door.y}`)).toBe(true);
    }
  });

  it("has the keeper's counter, the hermit and the camp fire, each reachable", () => {
    expect([...new Set(farmstead.services.map((s) => s.kind))]).toEqual([
      "keeper",
    ]);
    expect([...new Set(tower.services.map((s) => s.kind))]).toEqual(["hermit"]);
    const fire = forest.services.find((s) => s.kind === "camp")!;
    expect(fire).toMatchObject({ x: 85, y: 83 });
    expect(forest.isBlocked(fire.x, fire.y)).toBe(true);
    for (const [room, kind] of [
      [farmstead, "keeper"],
      [tower, "hermit"],
    ] as const) {
      const s = room.services.find((x) => x.kind === kind)!;
      expect(room.reachable(room.entry("door")!).has(`${s.x},${s.y + 1}`)).toBe(
        true,
      );
    }
    expect(serviceLabel("keeper", "keeper")).toBe("Keeper's Counter");
    expect(serviceLabel("hermit", "hermit")).toBe("Hermit");
    expect(serviceLabel("camp", "camp")).toBe("Camp Fire");
  });

  it("has three paddocks that are fenced scenery and cannot be entered", () => {
    const walkable = forest.reachable(forest.entry("from_farm")!);
    for (const [x, y] of <[number, number][]>[
      [87, 29],
      [103, 29],
      [104, 19],
    ]) {
      expect(forest.isBlocked(x, y)).toBe(false);
      expect(walkable.has(`${x},${y}`)).toBe(false);
    }
  });

  it("keeps the old Forest intact: the groves and the lake road still work", () => {
    expect(forest.trees.length).toBeGreaterThanOrEqual(150);
    expect(forest.exits.map((e) => e.id)).toEqual(
      expect.arrayContaining(["to_farm", "to_mountain", "to_secret_woods"]),
    );
  });
});

describe("the keeper's stock and the lines (note 23, note 72)", () => {
  it("sells young animals only for the buildings that stand, and hay", () => {
    const g = newGame();
    g.money = 10000;
    expect(animalProblem(g, "chicken")).toBeDefined();
    g.animals.coopBuilt = true;
    expect(animalProblem(g, "chicken")).toBeUndefined();
    expect(buyAnimal(g, "chicken", "Hen")).toBeDefined();
    expect(g.money).toBe(10000 - 800);
    const before = g.money;
    expect(buyHay(g, 10)).toBe(10);
    expect(g.money).toBe(before - HAY_PRICE * 10);
    expect(BUILDING_ORDER.flatMap((b) => speciesOf(b)).length).toBeGreaterThan(
      0,
    );
  });

  it("gives one piece of advice a day, the same all day", () => {
    expect(keeperAdvice(3)).toBe(keeperAdvice(3));
    const seen = new Set(KEEPER_ADVICE.map((_, d) => keeperAdvice(d)));
    expect(seen.size).toBe(KEEPER_ADVICE.length);
  });

  it("uses no em dashes in its lines", () => {
    for (const line of [...KEEPER_ADVICE, HERMIT_LINE, CAMP_LINE])
      expect(line).not.toContain(String.fromCharCode(0x2014));
  });
});
