import { describe, expect, it } from "vitest";
import {
  BUILD_DAYS,
  houseVisibleTier,
  isHouseMap,
  MAX_HOUSE_TIER,
  orderProblem,
  orderUpgrade,
  WOOD,
} from "../src/core/house";
import { maps } from "../src/content/maps";
import { festivalToday } from "../src/core/festivals";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";

describe("house tier shown", () => {
  it("shows the start room at tier 0 and the new rooms at tier 1", () => {
    expect(houseVisibleTier(0)).toBe(0);
    expect(houseVisibleTier(1)).toBe(1);
  });

  it("shows tier 1 for later tiers until their layers exist", () => {
    expect(houseVisibleTier(MAX_HOUSE_TIER)).toBe(1);
  });

  it("clamps tiers out of range", () => {
    expect(houseVisibleTier(-1)).toBe(0);
    expect(houseVisibleTier(NaN)).toBe(0);
  });

  it("knows which maps are house interiors", () => {
    expect(isHouseMap("house")).toBe(true);
    expect(isHouseMap("house-1")).toBe(true);
    expect(isHouseMap("farm")).toBe(false);
  });

  it("has one house map that grows, with no map per tier", () => {
    expect(maps.ids).toContain("house");
    expect(maps.ids).not.toContain("house-1");
    expect(maps.maxTier("house")).toBe(1);
  });
});

describe("house tier in the save", () => {
  it("starts at tier 0", () => {
    expect(newGame().houseTier).toBe(0);
  });

  it("round-trips the tier", () => {
    const g = newGame();
    g.houseTier = 1;
    expect(deserialize(serialize(g))!.houseTier).toBe(1);
  });

  it("loads a save without a tier as tier 0", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.houseTier;
    expect(deserialize(JSON.stringify(raw))!.houseTier).toBe(0);
  });

  it("clamps a tier that is too high", () => {
    const raw = JSON.parse(serialize(newGame()));
    raw.houseTier = 50;
    expect(deserialize(JSON.stringify(raw))!.houseTier).toBe(MAX_HOUSE_TIER);
  });
});

describe("house maps", () => {
  const start = () => maps.get("house", 0);
  const tier1 = () => maps.get("house", 1);
  const bed = (m: ReturnType<typeof start>) =>
    m.services.find((s) => s.kind === "bed")!;

  it("is one 31 by 12 map at both tiers, with the start room 11 by 10 in it", () => {
    expect([start().width, start().height]).toEqual([31, 12]);
    expect([tier1().width, tier1().height]).toEqual([31, 12]);
    expect(start().bounds).toEqual({ x: 9, y: 2, w: 11, h: 10 });
    expect(tier1().bounds).toEqual({ x: 0, y: 0, w: 31, h: 12 });
  });

  it("keeps the start room's walls, floor and door the same at every tier", () => {
    const a = start().reachable(start().entry("door")!);
    const b = tier1().reachable(tier1().entry("door")!);
    expect(start().entry("door")).toEqual(tier1().entry("door"));
    // Everything the start room offers is still there at tier 1.
    for (let y = 3; y <= 10; y++)
      for (let x = 10; x <= 18; x++)
        if (a.has(`${x},${y}`) && !(x === 18 && y === 9))
          expect(b.has(`${x},${y}`)).toBe(true);
  });

  it("shows nothing unbuilt at tier 0: the rest is void that cannot be walked", () => {
    const m = start();
    const walkable = m.reachable(m.entry("door")!);
    for (const t of walkable) {
      const [x, y] = t.split(",").map(Number) as [number, number];
      expect(x >= 9 && x < 20 && y >= 2 && y < 12).toBe(true);
    }
    expect(m.isBlocked(4, 5)).toBe(true); // where the kitchen will be
    expect(m.isBlocked(25, 5)).toBe(true); // where the bedroom will be
    expect(walkable.has("4,5")).toBe(false);
  });

  it("moves the bed to the bedroom at tier 1", () => {
    expect(bed(start())).toMatchObject({ x: 18, y: 9 });
    expect(bed(tier1())).toMatchObject({ x: 25, y: 2 });
    expect(tier1().services.filter((s) => s.kind === "bed")).toHaveLength(1);
  });

  it("cuts doorways through the start room's walls at tier 1 only", () => {
    expect(start().isBlocked(9, 5)).toBe(true);
    expect(start().isBlocked(19, 5)).toBe(true);
    expect(tier1().isBlocked(9, 5)).toBe(false);
    expect(tier1().isBlocked(19, 5)).toBe(false);
  });

  it("has no problems on either map", () => {
    expect(start().problems()).toEqual([]);
    expect(tier1().problems()).toEqual([]);
    expect(maps.problems()).toEqual([]);
  });

  it("leads each door back to the farm's house entry", () => {
    for (const m of [start(), tier1()]) {
      const door = m.exits.find((e) => e.map === "farm")!;
      expect(door.entry).toBe("from_house");
      expect(m.entry("door")).toBeDefined();
    }
  });

  it("keeps the bed reachable from the door on both maps", () => {
    for (const m of [start(), tier1()]) {
      const b = bed(m);
      const walkable = m.reachable(m.entry("door")!);
      const sides = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([dx, dy]) => walkable.has(`${b.x + dx!},${b.y + dy!}`));
      expect(sides).toBe(true);
    }
  });

  it("lets the player walk from the door into the kitchen and bedroom at tier 1", () => {
    const walkable = tier1().reachable(tier1().entry("door")!);
    expect(walkable.has("4,5")).toBe(true); // kitchen
    expect(walkable.has("25,5")).toBe(true); // bedroom
  });
});

describe("house upgrade order", () => {
  const rich = () => {
    const g = newGame();
    g.money = 12000;
    g.inventory.add(WOOD, 450);
    return g;
  };
  const noSpots: never[] = [];
  const sleepOnce = (g: ReturnType<typeof newGame>) =>
    sleep(g, noSpots, () => 0.5);
  /** Move the clock so the next sleep wakes on a day with no festival. */
  const toPlainDay = (g: ReturnType<typeof newGame>) => {
    while (festivalToday(g.day.clock.day + 1)) g.day.clock.day += 1;
  };

  it("needs both the coin and the wood", () => {
    const g = newGame();
    expect(orderProblem(g)).toMatch(/9500g more and 450 more wood/);
    g.money = 10000;
    expect(orderProblem(g)).toMatch(/450 more wood/);
    expect(orderProblem(g)).not.toMatch(/g more/);
    g.inventory.add(WOOD, 449);
    expect(orderProblem(g)).toMatch(/1 more wood/);
    g.inventory.add(WOOD);
    expect(orderProblem(g)).toBeUndefined();
  });

  it("takes the payment and starts a three day build", () => {
    const g = rich();
    expect(orderUpgrade(g)).toBe(true);
    expect(g.money).toBe(2000);
    expect(g.inventory.count(WOOD)).toBe(0);
    expect(g.houseBuild).toEqual({ tier: 1, daysLeft: BUILD_DAYS });
    expect(g.houseTier).toBe(0);
  });

  it("refuses a second order while one is building", () => {
    const g = rich();
    orderUpgrade(g);
    g.money = 99999;
    g.inventory.add(WOOD, 450);
    expect(orderUpgrade(g)).toBe(false);
    expect(orderProblem(g)).toMatch(/already at work/);
  });

  it("refuses an upgrade past the last one for sale", () => {
    const g = rich();
    g.houseTier = 1;
    expect(orderProblem(g)).toMatch(/no further upgrade/);
    expect(orderUpgrade(g)).toBe(false);
  });

  it("opens the new rooms on the third morning, not before", () => {
    const g = rich();
    toPlainDay(g);
    orderUpgrade(g);
    for (let i = 1; i <= 2; i++) {
      toPlainDay(g);
      const r = sleepOnce(g);
      expect(r.houseFinished).toBe(false);
      expect(g.houseTier).toBe(0);
    }
    toPlainDay(g);
    const r = sleepOnce(g);
    expect(r.houseFinished).toBe(true);
    expect(g.houseTier).toBe(1);
    expect(g.houseBuild).toBeUndefined();
  });

  it("does not count a festival morning", () => {
    const g = rich();
    orderUpgrade(g);
    g.houseBuild!.daysLeft = 1;
    const fest = [...Array(120).keys()].find((d) => festivalToday(d + 1))! + 1;
    g.day.clock.day = fest - 1;
    expect(sleepOnce(g).houseFinished).toBe(false);
    expect(g.houseBuild!.daysLeft).toBe(1);
    toPlainDay(g);
    expect(sleepOnce(g).houseFinished).toBe(true);
  });

  it("saves and resumes a build in progress", () => {
    const g = rich();
    orderUpgrade(g);
    g.houseBuild!.daysLeft = 2;
    const back = deserialize(serialize(g))!;
    expect(back.houseBuild).toEqual({ tier: 1, daysLeft: 2 });
  });

  it("ignores a saved build that makes no sense", () => {
    for (const bad of [
      { tier: 3, daysLeft: 2 },
      { tier: 1, daysLeft: 0 },
      { tier: 1, daysLeft: 9 },
      { tier: 1, daysLeft: "x" },
    ]) {
      const raw = JSON.parse(serialize(newGame()));
      raw.houseBuild = bad;
      expect(deserialize(JSON.stringify(raw))!.houseBuild).toBeUndefined();
    }
  });
});

describe("sawmill map", () => {
  it("joins the farm's sawmill door both ways", () => {
    expect(
      maps.get("farm").exits.find((e) => e.id === "sawmill"),
    ).toMatchObject({ map: "sawmill", entry: "door" });
    expect(maps.get("sawmill").exits[0]).toMatchObject({
      map: "farm",
      entry: "from_sawmill",
    });
  });

  it("has a carpenter's counter the player can reach", () => {
    const sawmill = maps.get("sawmill");
    const counter = sawmill.services.find((s) => s.kind === "carpenter")!;
    const walkable = sawmill.reachable(sawmill.entry("door")!);
    expect(walkable.has(`${counter.x},${counter.y + 1}`)).toBe(true);
  });
});
