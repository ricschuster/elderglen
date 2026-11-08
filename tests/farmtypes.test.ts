import { describe, expect, it } from "vitest";
import { chop, clearWeed, plant, type Outcome } from "../src/core/actions";
import { cropById } from "../src/core/crops";
import {
  FARM_TYPES,
  farmMapOf,
  farmTypeById,
  isFarmMap,
  resolveMapId,
} from "../src/core/farmtypes";
import { maps } from "../src/content/maps";
import { deserialize, newGame, serialize } from "../src/core/save";
import { startGame } from "../src/core/toolbar";
import { MIXED_SEED } from "../src/core/weeds";
import { seedId } from "../src/core/items";
import { sleep } from "../src/core/sleep";

const dropOf = (o: Outcome) => (o.ok ? o.item : undefined);

const ENTRIES = [
  "start",
  "from_house",
  "from_hall",
  "from_sawmill",
  "from_mine",
];

describe("farm type data", () => {
  it("lists Standard and Woodland, each with a real map", () => {
    expect(FARM_TYPES.map((t) => t.id)).toEqual(["standard", "woodland"]);
    for (const t of FARM_TYPES) {
      const map = maps.get(t.map);
      for (const e of ENTRIES)
        expect(map.entry(e), `${t.id} ${e}`).toBeDefined();
      expect(map.problems()).toEqual([]);
      expect(isFarmMap(t.map)).toBe(true);
    }
  });

  it("falls back to Standard for a missing or unknown id", () => {
    expect(farmTypeById(undefined).id).toBe("standard");
    expect(farmTypeById("nope").id).toBe("standard");
  });

  it("turns the interiors' farm exit into the farm type's map", () => {
    expect(resolveMapId("farm", "woodland")).toBe("farm-woodland");
    expect(resolveMapId("farm", "standard")).toBe("farm");
    expect(resolveMapId("hall", "woodland")).toBe("hall");
    for (const id of ["house", "sawmill", "hall", "mine"])
      for (const exit of maps.get(id).exits)
        if (exit.map === "farm")
          for (const t of FARM_TYPES)
            expect(maps.get(t.map).entry(exit.entry)).toBeDefined();
  });

  it("gives Woodland about 40 percent of Standard's farmland", () => {
    const std = maps.get("farm").tillableTiles().length;
    const wood = maps.get("farm-woodland").tillableTiles().length;
    expect(wood / std).toBeGreaterThan(0.35);
    expect(wood / std).toBeLessThan(0.5);
  });

  it("puts Woodland's forage in clearings, with more spots than Standard", () => {
    expect(maps.get("farm-woodland").forageSpots.length).toBeGreaterThan(
      maps.get("farm").forageSpots.length,
    );
    expect(maps.get("farm").trees.some((t) => t.large)).toBe(false);
    expect(maps.get("farm-woodland").trees.filter((t) => t.large)).toHaveLength(
      6,
    );
  });
});

describe("a new game by farm type", () => {
  it("is Standard unless told otherwise", () => {
    expect(newGame().farmType).toBe("standard");
    expect(startGame().inventory.count(seedId("parsnip"))).toBe(15);
  });

  it("starts Woodland with its own trees, stumps and rocks and the normal kit", () => {
    const g = startGame("woodland");
    const map = farmMapOf(g);
    expect(g.farmType).toBe("woodland");
    expect(g.trees.count).toBe(map.trees.length);
    expect(g.rocks.count).toBe(map.rocks.length);
    expect(g.inventory.count(seedId("parsnip"))).toBe(15);
    const stump = map.trees.find((t) => t.large)!;
    expect(g.trees.at(stump.x, stump.y)?.stump).toBe(true);
    expect(g.trees.blocks(stump.x, stump.y)).toBe(true);
  });
});

describe("saving the choice", () => {
  it("round trips the farm type and a chopped large stump", () => {
    const g = startGame("woodland");
    const stump = farmMapOf(g).trees.find((t) => t.large)!;
    for (let i = 0; i < 8; i++) chop(g, stump.x, stump.y, () => 0.5);
    const back = deserialize(serialize(g))!;
    expect(back.farmType).toBe("woodland");
    expect(back.trees.at(stump.x, stump.y)?.regrow).toBe(4);
  });

  it("loads an old save, with no farm type, as Standard", () => {
    const raw = JSON.parse(serialize(startGame()));
    delete raw.farmType;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.farmType).toBe("standard");
    expect(back.trees.count).toBe(back.trees.save().length);
  });

  it("loads an unknown farm type as Standard", () => {
    const raw = JSON.parse(serialize(startGame()));
    raw.farmType = "volcano";
    expect(deserialize(JSON.stringify(raw))!.farmType).toBe("standard");
  });
});

describe("large stumps", () => {
  it("drop wood, then stand aside and regrow after the farm's days", () => {
    const g = startGame("woodland");
    const map = farmMapOf(g);
    const s = map.trees.find((t) => t.large)!;
    expect(chop(g, s.x, s.y, () => 0.5).ok).toBe(true);
    expect(g.trees.at(s.x, s.y)?.regrow).toBeUndefined(); // more swings needed
    for (let i = 0; i < 12; i++) chop(g, s.x, s.y, () => 0.5);
    expect(g.inventory.count("wood")).toBeGreaterThanOrEqual(8);
    expect(g.trees.blocks(s.x, s.y)).toBe(false);
    expect(chop(g, s.x, s.y)).toEqual({ ok: false, reason: "nothing to chop" });
    for (let day = 0; day < 4; day++) {
      expect(g.trees.blocks(s.x, s.y)).toBe(false);
      sleep(g, map.forageSpots, () => 0.99, map);
    }
    expect(g.trees.blocks(s.x, s.y)).toBe(true);
    expect(g.trees.at(s.x, s.y)?.regrow).toBeUndefined();
  });

  it("never spread seeds", () => {
    const g = startGame("woodland");
    const map = farmMapOf(g);
    const before = g.trees.count;
    for (let i = 0; i < 5; i++) sleep(g, map.forageSpots, () => 0, map);
    const stumps = [...g.trees.each()].filter((t) => t.large);
    expect(stumps).toHaveLength(6);
    expect(g.trees.count).toBeGreaterThanOrEqual(before);
  });
});

describe("weeds and mixed seeds", () => {
  it("drop a mixed seed on Woodland whenever they drop no fiber", () => {
    const g = startGame("woodland");
    g.weeds.add(1, 1);
    expect(dropOf(clearWeed(g, 1, 1, "hoe", () => 0.99))).toBe(MIXED_SEED);
    g.weeds.add(2, 1);
    expect(dropOf(clearWeed(g, 2, 1, "hoe", () => 0))).toBe("fiber");
  });

  it("drop one 5 percent of the time when no fiber falls, on Standard", () => {
    const g = startGame();
    g.weeds.add(1, 1);
    g.weeds.add(2, 1);
    const a = [0.9, 0.04];
    expect(dropOf(clearWeed(g, 1, 1, "hoe", () => a.shift()!))).toBe(
      MIXED_SEED,
    );
    const b = [0.9, 0.06];
    expect(dropOf(clearWeed(g, 2, 1, "hoe", () => b.shift()!))).toBeUndefined();
  });

  it("plant a random crop that suits the season", () => {
    const g = startGame("woodland");
    const map = farmMapOf(g);
    const spot = map.tillableTiles()[0]!;
    g.farm.till(spot.x, spot.y);
    g.inventory.add(MIXED_SEED, 1);
    expect(plant(g, spot.x, spot.y, MIXED_SEED, () => 0.5).ok).toBe(true);
    const id = g.farm.plotAt(spot.x, spot.y)!.crop!.id;
    expect(cropById(id)!.seasons).toContain("spring");
    expect(g.inventory.count(MIXED_SEED)).toBe(0);
  });
});

describe("bundles", () => {
  it("keeps Woodland's fiber supply: weeds can appear on its farmland", () => {
    const map = maps.get("farm-woodland");
    expect(map.tillableTiles().length).toBeGreaterThan(30);
  });
});
