import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { ensureMapCreatures } from "../src/core/areas";
import {
  CREATURES,
  SLAYER_GOALS,
  creatureById,
  creatureTile,
  creaturesOfBand,
  rollDrops,
} from "../src/core/creatures";
import {
  creatureSpawnsOf,
  creatureTileOk,
  mapDrops,
  placeMapCreatures,
} from "../src/core/mapcreatures";
import { newGame, deserialize, serialize } from "../src/core/save";

const woods = maps.get("secret-woods");
const table = creatureSpawnsOf("secret-woods")!;
const arrive = { x: 45, y: 11 };

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe("Secret Woods creatures (note 73)", () => {
  it("places two green Gloops, a blue Gloop and a Burrmouse", () => {
    const c = placeMapCreatures(table, woods, seeded(1), arrive);
    expect(c.map((x) => x.kind).sort()).toEqual([
      "burrmouse",
      "gloop",
      "gloop",
      "gloop-blue",
    ]);
  });

  it("never lands on a stump, in the passage, at the pond or off the glade and hollow", () => {
    const stumps = woods.trees.filter((t) => t.large);
    expect(stumps).toHaveLength(6);
    for (let seed = 1; seed <= 200; seed++)
      for (const c of placeMapCreatures(table, woods, seeded(seed), arrive)) {
        const t = creatureTile(c, woods.tileSize);
        expect(stumps.some((s) => s.x === t.x && s.y === t.y)).toBe(false);
        expect(t.x >= 38 && t.x <= 39 && t.y >= 22 && t.y <= 26).toBe(false);
        expect(creatureTileOk(table, woods, t.x, t.y)).toBe(true);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            expect(woods.isWater(t.x + dx, t.y + dy)).toBe(false);
        const upper = t.y >= 4 && t.y <= 22;
        const lower = t.y >= 26 && t.y <= 38;
        expect(upper || lower).toBe(true);
      }
  });

  it("places once a day and keeps them until the next", () => {
    const g = newGame();
    const a = ensureMapCreatures(g, "secret-woods", seeded(3), arrive)!;
    const b = ensureMapCreatures(g, "secret-woods", seeded(9), arrive)!;
    expect(b).toBe(a);
    a.pop();
    expect(
      ensureMapCreatures(g, "secret-woods", seeded(9), arrive),
    ).toHaveLength(3);
    g.day.clock.day += 1;
    expect(
      ensureMapCreatures(g, "secret-woods", seeded(9), arrive),
    ).toHaveLength(4);
    expect(ensureMapCreatures(g, "forest", seeded(1), arrive)).toBeUndefined();
  });

  it("survives a save", () => {
    const g = newGame();
    const a = ensureMapCreatures(g, "secret-woods", seeded(3), arrive)!;
    a.pop();
    const back = deserialize(serialize(g))!;
    expect(back.areas["secret-woods"]!.creatures).toHaveLength(3);
    expect(back.areas["secret-woods"]!.creaturesDay).toBe(g.day.clock.day);
  });

  it("gives the 10 percent Mahogany Seed drop in the woods only", () => {
    expect(mapDrops("secret-woods")).toEqual([
      { id: "mahogany-seed", chance: 0.1, min: 1, max: 1 },
    ]);
    expect(mapDrops("forest")).toEqual([]);
    expect(mapDrops("mine-1")).toEqual([]);
    for (const c of CREATURES)
      expect(c.drops.some((d) => d.id === "mahogany-seed")).toBe(false);
    const gloop = creatureById("gloop")!;
    const extra = { ...gloop, drops: mapDrops("secret-woods") };
    expect(rollDrops(extra, () => 0.09)).toEqual([
      { id: "mahogany-seed", count: 1 },
    ]);
    expect(rollDrops(extra, () => 0.1)).toEqual([]);
  });

  it("adds a Burrmouse that is a dasher with fibre and moss, off the mines and with no goal", () => {
    const b = creatureById("burrmouse")!;
    expect(b.behaviour).toBe("dasher");
    expect(b.dash).toBeDefined();
    expect(b.goal).toBeUndefined();
    expect(b.drops.map((d) => d.id).sort()).toEqual(["fiber", "moss"]);
    for (const band of [1, 2, 3])
      expect(creaturesOfBand(band).some((c) => c.id === "burrmouse")).toBe(
        false,
      );
    expect(SLAYER_GOALS).toHaveLength(12);
    expect(SLAYER_GOALS.some((s) => s.kinds.includes("burrmouse"))).toBe(false);
  });
});
