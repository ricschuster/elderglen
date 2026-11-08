import { describe, expect, it } from "vitest";
import {
  BUILD_DAYS,
  houseHasCellar,
  houseVisibleTier,
  nextUpgrade,
  WAITING_ROOMS_LINE,
  isHouseMap,
  MAX_HOUSE_TIER,
  orderProblem,
  orderUpgrade,
  WOOD,
} from "../src/core/house";
import { maps } from "../src/content/maps";
import { festivalToday } from "../src/core/festivals";
import { deserialize, newGame, serialize } from "../src/core/save";
import { reportLines } from "../src/core/report";
import { sleep } from "../src/core/sleep";

describe("house tier shown", () => {
  it("shows the start room at tier 0 and the new rooms at tier 1", () => {
    expect(houseVisibleTier(0)).toBe(0);
    expect(houseVisibleTier(1)).toBe(1);
  });

  it("shows the upper band at tier 2, and tier 3 shows tier 2", () => {
    expect(houseVisibleTier(2)).toBe(2);
    expect(houseVisibleTier(MAX_HOUSE_TIER)).toBe(2);
  });

  it("flags the cellar stairs from tier 3 only", () => {
    expect(houseHasCellar(2)).toBe(false);
    expect(houseHasCellar(3)).toBe(true);
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
    expect(maps.maxTier("house")).toBe(2);
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
  const tier2 = () => maps.get("house", 2);
  const bed = (m: ReturnType<typeof start>) =>
    m.services.find((s) => s.kind === "bed")!;

  it("is one 31 by 22 map at every tier, with the start room 11 by 10 in it", () => {
    for (const m of [start(), tier1(), tier2(), maps.get("house", 3)])
      expect([m.width, m.height]).toEqual([31, 22]);
    expect(start().bounds).toEqual({ x: 9, y: 12, w: 11, h: 10 });
    expect(tier1().bounds).toEqual({ x: 0, y: 10, w: 31, h: 12 });
  });

  it("clamps the camera to the whole house at tiers 2 and 3", () => {
    const whole = { x: 0, y: 0, w: 31, h: 22 };
    expect(tier2().bounds).toEqual(whole);
    expect(maps.get("house", 3).bounds).toEqual(whole);
  });

  it("keeps the start room's walls, floor and door the same at every tier", () => {
    const a = start().reachable(start().entry("door")!);
    const b = tier1().reachable(tier1().entry("door")!);
    expect(start().entry("door")).toEqual(tier1().entry("door"));
    // Everything the start room offers is still there at tier 1.
    for (let y = 13; y <= 20; y++)
      for (let x = 10; x <= 18; x++)
        if (a.has(`${x},${y}`) && !(x === 18 && y === 19))
          expect(b.has(`${x},${y}`)).toBe(true);
  });

  it("shows nothing unbuilt at tier 0: the rest is void that cannot be walked", () => {
    const m = start();
    const walkable = m.reachable(m.entry("door")!);
    for (const t of walkable) {
      const [x, y] = t.split(",").map(Number) as [number, number];
      expect(x >= 9 && x < 20 && y >= 12 && y < 22).toBe(true);
    }
    expect(m.isBlocked(4, 15)).toBe(true); // where the kitchen will be
    expect(m.isBlocked(25, 15)).toBe(true); // where the bedroom will be
    expect(m.isBlocked(4, 5)).toBe(true); // where the upper band will be
    expect(walkable.has("4,15")).toBe(false);
  });

  it("moves the bed to the bedroom at tier 1", () => {
    expect(bed(start())).toMatchObject({ x: 18, y: 19 });
    expect(bed(tier1())).toMatchObject({ x: 25, y: 12 });
    expect(tier1().services.filter((s) => s.kind === "bed")).toHaveLength(1);
  });

  it("cuts doorways through the start room's walls at tier 1 only", () => {
    expect(start().isBlocked(9, 15)).toBe(true);
    expect(start().isBlocked(19, 15)).toBe(true);
    expect(tier1().isBlocked(9, 15)).toBe(false);
    expect(tier1().isBlocked(19, 15)).toBe(false);
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
    expect(walkable.has("4,15")).toBe(true); // kitchen
    expect(walkable.has("25,15")).toBe(true); // bedroom
  });
});

describe("house tiers 2 and 3", () => {
  const tier2 = () => maps.get("house", 2);
  const walk = (m = tier2()) => m.reachable(m.entry("door")!);

  it("keeps the start room and tier 1 rooms unchanged, and only adds tiles", () => {
    const t1 = maps.get("house", 1);
    const before = walk(t1);
    const after = walk();
    for (const t of before) expect(after.has(t)).toBe(true);
    expect(t1.entry("door")).toEqual(tier2().entry("door"));
    expect(tier2().services.filter((s) => s.kind === "bed")).toHaveLength(1);
  });

  it("is still black void above at tier 1", () => {
    const t1 = maps.get("house", 1);
    expect(t1.isBlocked(4, 5)).toBe(true);
    expect(walk(t1).has("4,5")).toBe(false);
  });

  it("lets the player climb the stairs into the spare room and on to the nursery", () => {
    const w = walk();
    expect(w.has("4,10")).toBe(true); // the stairs over the kitchen end
    expect(w.has("4,5")).toBe(true); // spare room
    expect(w.has("14,5")).toBe(true); // doorway between the rooms
    expect(w.has("22,5")).toBe(true); // nursery
  });

  it("has no problems at any tier", () => {
    for (let t = 0; t <= 3; t++)
      expect(maps.get("house", t).problems()).toEqual([]);
    expect(maps.problems()).toEqual([]);
  });

  it("orders tier 2 for 65,000g and wood standing in for 100 hardwood, only after tier 1", () => {
    const g = newGame();
    g.money = 200000;
    g.inventory.add(WOOD, 600);
    expect(orderProblem(g)).toBeUndefined();
    g.houseTier = 1;
    expect(nextUpgrade(1)).toEqual({ coin: 65000, wood: 100 });
    g.money = 64999;
    expect(orderProblem(g)).toMatch(/1g more/);
    g.money = 65000;
    g.inventory.remove(WOOD, 500);
    expect(orderProblem(g)).toBeUndefined();
    expect(orderUpgrade(g)).toBe(true);
    expect(g.money).toBe(0);
    expect(g.inventory.count(WOOD)).toBe(0);
    expect(g.houseBuild).toEqual({ tier: 2, daysLeft: BUILD_DAYS });
  });

  it("orders tier 3 for 100,000g alone, only after tier 2, and nothing past it", () => {
    const g = newGame();
    g.money = 100000;
    expect(nextUpgrade(2)).toEqual({ coin: 100000, wood: 0 });
    g.houseTier = 2;
    expect(orderProblem(g)).toBeUndefined();
    expect(orderUpgrade(g)).toBe(true);
    expect(g.money).toBe(0);
    expect(g.houseBuild).toEqual({ tier: 3, daysLeft: BUILD_DAYS });
    g.houseBuild = undefined;
    g.houseTier = 3;
    g.money = 999999;
    expect(orderProblem(g)).toMatch(/no further upgrade/);
    expect(orderUpgrade(g)).toBe(false);
  });

  it("finishes tier 2 on the third morning with the waiting rooms line", () => {
    const g = newGame();
    g.houseTier = 1;
    g.houseBuild = { tier: 2, daysLeft: BUILD_DAYS };
    for (let i = 1; i <= 3; i++) {
      while (festivalToday(g.day.clock.day + 1)) g.day.clock.day += 1;
      const r = sleep(g, [], () => 0.5);
      expect(r.houseFinished).toBe(i === 3);
      if (i === 3) {
        expect(r.houseTier).toBe(2);
        expect(reportLines(r)).toContain(WAITING_ROOMS_LINE);
      }
    }
    expect(g.houseTier).toBe(2);
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
    g.houseTier = 3;
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
