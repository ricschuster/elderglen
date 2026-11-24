import { describe, expect, it } from "vitest";
import { fertilize, harvest, plant, till, water } from "../src/core/actions";
import { DAYS_PER_SEASON } from "../src/core/calendar";
import { FERTILIZERS, fertilizersOnSale } from "../src/core/fertilizer";
import { Farm } from "../src/core/farm";
import { seedId } from "../src/core/items";
import { cropQuality } from "../src/core/quality";
import { newGame } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { useHeld } from "../src/core/tools";
import { FarmMap, type TiledMapJson } from "../src/core/map";

function soilMap(): FarmMap {
  const layer = (name: string, data: number[]) => ({
    name,
    type: "tilelayer",
    data,
  });
  const json: TiledMapJson = {
    width: 4,
    height: 4,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", new Array(16).fill(0)),
      layer("soil", new Array(16).fill(1)),
      {
        name: "markers",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  };
  return FarmMap.fromTiled(json);
}

/** A farm with a dug, watered plot. */
function plot() {
  const f = new Farm();
  f.till(0, 0);
  return f;
}

describe("crop quality with fertilizer", () => {
  // The saved Fertilizer page's table, gold share by farming level.
  it.each([
    [0, 0, 0.01],
    [0, 1, 0.04],
    [0, 2, 0.08],
    [10, 0, 0.21],
    [10, 1, 0.41],
    [5, 1, 0.23],
    [3, 2, 0.24],
  ])("level %i soil %i gives about %f gold", (level, soil, gold) => {
    expect(cropQuality(level, gold - 0.005, soil)).toBe("gold");
    expect(cropQuality(level, gold + 0.012, soil)).not.toBe("gold");
  });
});

describe("applying fertilizer", () => {
  it("mixes into tilled soil, one per tile, and uses one up", () => {
    const g = newGame();
    g.inventory.add("basic-fertilizer", 2);
    till(g, 0, 0);
    expect(fertilize(g, 1, 1, "basic-fertilizer")).toEqual({
      ok: false,
      reason: "nothing to fertilize",
    });
    expect(fertilize(g, 0, 0, "basic-fertilizer").ok).toBe(true);
    expect(g.farm.plotAt(0, 0)?.fertilizer).toBe("basic-fertilizer");
    expect(g.inventory.count("basic-fertilizer")).toBe(1);
    expect(fertilize(g, 0, 0, "speed-fertilizer")).toEqual({
      ok: false,
      reason: "no fertilizer",
    });
    g.inventory.add("speed-fertilizer");
    expect(fertilize(g, 0, 0, "speed-fertilizer")).toEqual({
      ok: false,
      reason: "already fertilized",
    });
    expect(g.inventory.count("basic-fertilizer")).toBe(1);
  });

  it("quality and retaining go in before the seed sprouts, speed any time", () => {
    const g = newGame();
    g.inventory.add(seedId("parsnip"), 1);
    g.inventory.add("basic-fertilizer");
    g.inventory.add("speed-fertilizer");
    till(g, 0, 0);
    plant(g, 0, 0, seedId("parsnip"));
    // Planted today: nothing has sprouted yet.
    expect(fertilize(g, 0, 0, "basic-fertilizer").ok).toBe(true);
    g.farm.endDay("spring");
    water(g, 0, 0);
    g.farm.endDay("spring");
    const f = new Farm();
    f.till(1, 1);
    f.plant(1, 1, "parsnip", "spring");
    f.water(1, 1);
    f.endDay("spring");
    expect(f.fertilize(1, 1, "basic-fertilizer")).toBe("too late to fertilize");
    expect(f.fertilize(1, 1, "speed-fertilizer")).toBeUndefined();
  });

  it("is the held item's job on a tilled tile", () => {
    const map = soilMap();
    const g = newGame();
    g.inventory.add("basic-retaining-soil");
    till(g, 2, 2);
    const out = useHeld(
      g,
      map,
      { kind: "item", id: "basic-retaining-soil", count: 1 },
      2,
      2,
    );
    expect(out.ok).toBe(true);
    expect(g.farm.plotAt(2, 2)?.fertilizer).toBe("basic-retaining-soil");
  });
});

describe("what fertilizer does overnight", () => {
  it("speed fertilizer adds 10 percent growth", () => {
    const f = plot();
    f.plant(0, 0, "parsnip", "spring");
    f.fertilize(0, 0, "speed-fertilizer");
    f.water(0, 0);
    f.endDay("spring");
    expect(f.plotAt(0, 0)?.crop?.daysGrown).toBeCloseTo(1.1);
    f.water(0, 0);
    f.endDay("spring", 1.1);
    expect(f.plotAt(0, 0)?.crop?.daysGrown).toBeCloseTo(2.3);
  });

  it("retaining soil keeps the soil wet on its chance", () => {
    const f = plot();
    f.fertilize(0, 0, "basic-retaining-soil");
    f.water(0, 0);
    f.endDay("spring", 1, () => 0.32);
    expect(f.plotAt(0, 0)?.wateredToday).toBe(true);
    f.endDay("spring", 1, () => 0.34);
    expect(f.plotAt(0, 0)?.wateredToday).toBe(false);
  });

  it("plain soil dries out and never rolls", () => {
    const f = plot();
    f.water(0, 0);
    f.endDay("spring", 1, () => {
      throw new Error("no roll expected");
    });
    expect(f.plotAt(0, 0)?.wateredToday).toBe(false);
  });

  it("wears off when the season changes, unless a crop that fits stays", () => {
    const f = plot();
    f.till(1, 0);
    f.fertilize(0, 0, "basic-fertilizer");
    f.fertilize(1, 0, "basic-fertilizer");
    f.plant(1, 0, "parsnip", "spring");
    // Spring to spring (a mid season night): both keep it.
    f.endDay("spring", 1, Math.random, false);
    expect(f.plotAt(0, 0)?.fertilizer).toBeDefined();
    // Summer: the parsnip withers, so the soil is bare and loses it too.
    f.endDay("summer", 1, Math.random, true);
    expect(f.plotAt(0, 0)?.fertilizer).toBeUndefined();
    expect(f.plotAt(1, 0)?.fertilizer).toBeUndefined();
  });

  it("is lost at the season change through sleep", () => {
    const g = newGame();
    till(g, 0, 0);
    g.farm.fertilize(0, 0, "basic-fertilizer");
    while (g.day.clock.day < DAYS_PER_SEASON) sleep(g, [], () => 0.99);
    expect(g.farm.plotAt(0, 0)?.fertilizer).toBe("basic-fertilizer");
    sleep(g, [], () => 0.99);
    expect(g.farm.plotAt(0, 0)?.fertilizer).toBeUndefined();
  });

  it("quality fertilizer improves the grade at harvest", () => {
    const g = newGame();
    g.inventory.add(seedId("parsnip"), 1);
    till(g, 0, 0);
    plant(g, 0, 0, seedId("parsnip"));
    g.farm.fertilize(0, 0, "quality-fertilizer");
    const crop = g.farm.plotAt(0, 0)!.crop!;
    crop.daysGrown = 99;
    // A roll of 0.05 is gold only with the fertilizer (8 percent against 1).
    expect(harvest(g, 0, 0, () => 0.05)).toMatchObject({
      ok: true,
      item: "parsnip@gold",
    });
  });
});

describe("the shop", () => {
  it("sells the basic three from spring 15 and the quality two from year 2", () => {
    expect(fertilizersOnSale(14)).toEqual([]);
    expect(fertilizersOnSale(15).sort()).toEqual(
      ["basic-fertilizer", "basic-retaining-soil", "speed-fertilizer"].sort(),
    );
    expect(fertilizersOnSale(DAYS_PER_SEASON * 4 + 1)).toHaveLength(
      FERTILIZERS.length,
    );
  });
});
