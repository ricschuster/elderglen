import { describe, expect, it } from "vitest";
import { till } from "../src/core/actions";
import { SILO_CAPACITY } from "../src/core/animals";
import {
  cutGrass,
  DAY_ONE_GRASS,
  Grass,
  NO_SILO_HINT,
  SILO_FULL_NOTE,
  START_GRASS,
} from "../src/core/grass";
import { deserialize, serialize } from "../src/core/save";
import { findTool, startGame } from "../src/core/toolbar";
import { maps } from "../src/content/maps";
import { farmTypeById } from "../src/core/farmtypes";
import { useHeld } from "../src/core/tools";
import { TOOLS } from "../src/core/toolitems";

const farm = () => maps.get(farmTypeById("standard").map);
const scythe = { kind: "tool", tool: "scythe" } as const;

describe("the scythe", () => {
  it("is a fifth tool in the pack of a new game", () => {
    const g = startGame();
    expect(TOOLS).toHaveLength(5);
    expect(findTool(g.inventory, "scythe")).toBeGreaterThanOrEqual(0);
  });

  it("cuts a weed for no energy and leaves a crop alone", () => {
    const g = startGame();
    g.weeds.add(1, 1);
    const before = g.day.energy.current;
    const r = useHeld(g, farm(), scythe, 1, 1);
    expect(r.ok).toBe(true);
    expect(g.weeds.at(1, 1)).toBe(false);
    expect(g.day.energy.current).toBe(before);
    expect(useHeld(g, farm(), scythe, 2, 2).ok).toBe(false);
  });

  it("cuts grass for no energy", () => {
    const g = startGame();
    g.grass.clear();
    g.grass.add(3, 3);
    const before = g.day.energy.current;
    expect(useHeld(g, farm(), scythe, 3, 3).ok).toBe(true);
    expect(g.grass.at(3, 3)).toBe(false);
    expect(g.day.energy.current).toBe(before);
  });

  it("only the scythe cuts grass", () => {
    const g = startGame();
    g.grass.add(3, 3);
    for (const tool of ["axe", "can", "pickaxe"] as const)
      useHeld(g, farm(), { kind: "tool", tool }, 3, 3);
    expect(g.grass.at(3, 3)).toBe(true);
  });
});

describe("cut grass and hay", () => {
  it("gives hay to the silo half the time", () => {
    const g = startGame();
    g.animals.silo = true;
    g.grass.add(1, 1);
    g.grass.add(2, 1);
    cutGrass(g, 1, 1, () => 0.1);
    cutGrass(g, 2, 1, () => 0.9);
    expect(g.animals.hay).toBe(1);
  });

  it("gives nothing with no silo, and hints once a day", () => {
    const g = startGame();
    g.grass.add(1, 1);
    g.grass.add(2, 1);
    expect(cutGrass(g, 1, 1, () => 0)).toEqual({
      ok: true,
      note: NO_SILO_HINT,
    });
    expect(cutGrass(g, 2, 1, () => 0)).toEqual({ ok: true });
    expect(g.animals.hay).toBe(0);
    expect(g.inventory.count("hay")).toBe(0);
  });

  it("loses the hay with a line when the silo is full", () => {
    const g = startGame();
    g.animals.silo = true;
    g.animals.hay = SILO_CAPACITY;
    g.grass.add(1, 1);
    expect(cutGrass(g, 1, 1, () => 0)).toEqual({
      ok: true,
      note: SILO_FULL_NOTE,
    });
    expect(g.animals.hay).toBe(SILO_CAPACITY);
  });
});

describe("grass tiles", () => {
  it("a new farm starts with a scatter", () => {
    const g = startGame();
    expect(g.grass.count).toBe(START_GRASS);
  });

  it("tilling clears it", () => {
    const g = startGame();
    const t = farm().tillableTiles()[0]!;
    g.grass.add(t.x, t.y);
    till(g, t.x, t.y);
    expect(g.grass.at(t.x, t.y)).toBe(false);
  });

  it("saves and loads, and an old save has none", () => {
    const g = startGame();
    const back = deserialize(serialize(g));
    expect(back?.grass.count).toBe(g.grass.count);
    const old = JSON.parse(serialize(g));
    delete old.grass;
    expect(deserialize(JSON.stringify(old))?.grass.count).toBe(0);
  });

  const all = () => farm().tillableTiles();
  const free = () => true;

  it("spreads slowly and stops weeds' tiles being taken", () => {
    const gr = new Grass();
    gr.add(5, 5);
    gr.endDay("spring", 5, () => 0, free, all);
    expect(gr.count).toBeGreaterThan(1);
    const none = new Grass();
    none.add(5, 5);
    none.endDay("spring", 5, () => 0.99, free, all);
    expect(none.count).toBe(1);
  });

  it("regrows on day 1 of spring, summer and fall, and winter day 1 clears it", () => {
    for (const season of ["spring", "summer", "fall"]) {
      const gr = new Grass();
      gr.endDay(season, 1, () => 0.5, free, all);
      expect(gr.count).toBe(DAY_ONE_GRASS);
    }
    const gr = new Grass();
    gr.add(1, 1);
    gr.endDay("winter", 1, () => 0, free, all);
    expect(gr.count).toBe(0);
    gr.endDay("winter", 2, () => 0, free, all);
    expect(gr.count).toBe(0);
  });
});
