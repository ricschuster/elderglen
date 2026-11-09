import { describe, expect, it } from "vitest";
import {
  STABLE_BUILD_DAYS,
  STABLE_COST,
  STABLE_FOOTPRINT,
  advanceBuilding,
  animalReportLines,
  buildingProblem,
  loadAnimals,
  saveAnimals,
  siteOf,
  stableBlocks,
  stableHome,
  endDay as animalsEndDay,
} from "../src/core/animals";
import { maps } from "../src/content/maps";
import {
  HORSE_SPEED_FACTOR,
  PARK_RANGE,
  dismountSafely,
  horseBlocks,
  parkSpot,
  parkable,
  settleHorse,
  typeName,
  type ParkWorld,
  dismount,
  horseEndDay,
  horseTile,
  loadHorse,
  mount,
  mountProblem,
  nameHorse,
  needsName,
  rideable,
  speedFactor,
} from "../src/core/horse";
import {
  moveBuilding,
  orderBuildingAt,
  placementBlockers,
  refundOf,
  removeBuilding,
  removeProblem,
} from "../src/core/placement";
import { sleep } from "../src/core/sleep";
import { reportLines } from "../src/core/report";
import { deserialize, newGame, serialize } from "../src/core/save";
import type { GameState } from "../src/core/save";
import { Trees } from "../src/core/trees";
import { Rocks } from "../src/core/rocks";
import { Weeds } from "../src/core/weeds";
import { Twigs } from "../src/core/debris";
import { ForageField } from "../src/core/forage";

const OUTSIDE = { rideable: true };
const INSIDE = { rideable: false };

function rich(): GameState {
  const g = newGame();
  g.money = 20000;
  g.inventory.add("hardwood", 200);
  g.inventory.add("iron-bar", 10);
  g.trees = new Trees([]);
  g.rocks = new Rocks([]);
  g.weeds = new Weeds();
  g.twigs = new Twigs();
  g.forage = new ForageField();
  return g;
}

/** First free top left tile for the stable. */
function freeSpot(g: GameState) {
  const m = maps.get("farm");
  for (let y = 2; y < m.height - 4; y++)
    for (let x = 2; x < m.width - 6; x++)
      if (placementBlockers(g, m, "farm", "stable", x, y).length === 0)
        return { x, y };
  throw new Error("no free spot");
}

/** A game with a built stable on a free spot. */
function stabled(): GameState {
  const g = rich();
  const s = freeSpot(g);
  expect(orderBuildingAt(g, maps.get("farm"), "farm", "stable", s.x, s.y)).toBe(
    true,
  );
  for (let i = 0; i < STABLE_BUILD_DAYS; i++) advanceBuilding(g);
  return g;
}

describe("the stable", () => {
  it("costs gold, hardwood and iron bars, and nothing is paid until a spot is chosen", () => {
    const g = rich();
    const m = maps.get("farm");
    const bad = placementBlockers(g, m, "farm", "stable", 0, 0);
    expect(bad.length).toBeGreaterThan(0);
    expect(orderBuildingAt(g, m, "farm", "stable", 0, 0)).toBe(false);
    expect(g.money).toBe(20000);
    const s = freeSpot(g);
    expect(orderBuildingAt(g, m, "farm", "stable", s.x, s.y)).toBe(true);
    expect(g.money).toBe(20000 - STABLE_COST.coin);
    expect(g.inventory.count("hardwood")).toBe(200 - STABLE_COST.hardwood);
    expect(g.inventory.count("wood")).toBe(0);
    expect(g.inventory.count("iron-bar")).toBe(10 - STABLE_COST.iron);
    expect(siteOf(g, "stable", "farm")).toEqual(s);
  });

  it("says what is missing", () => {
    const g = rich();
    g.inventory.remove("iron-bar", 10);
    expect(buildingProblem(g, "stable")).toContain("5 more iron bars");
    g.money = 0;
    expect(buildingProblem(g, "stable")).toContain("10000g more");
  });

  it("asks for hardwood, and wood does not stand in for it", () => {
    const g = rich();
    g.inventory.remove("hardwood", 150);
    g.inventory.add("wood", 500);
    expect(buildingProblem(g, "stable")).toContain("50 more hardwood");
  });

  it("takes two days and the horse comes with it", () => {
    const g = rich();
    const s = freeSpot(g);
    orderBuildingAt(g, maps.get("farm"), "farm", "stable", s.x, s.y);
    expect(advanceBuilding(g)).toBeUndefined();
    expect(g.animals.stableBuilt).toBe(false);
    expect(advanceBuilding(g)).toBe("stable");
    expect(g.animals.stableBuilt).toBe(true);
    expect(
      animalReportLines(
        animalsEndDay(g, () => 0.5),
        false,
        false,
        false,
        true,
      ),
    ).toContain(
      "The carpenter has finished your stable. Your horse is waiting.",
    );
  });

  it("is one per player and shares the carpenter with other jobs", () => {
    const g = stabled();
    expect(buildingProblem(g, "stable")).toBe("You already have a stable.");
    const h = rich();
    h.animals.build = { daysLeft: 2, tier: 1, building: "coop" };
    expect(buildingProblem(h, "stable")).toContain("busy");
  });

  it("covers 4 by 2 tiles, all solid, with the horse's place in front", () => {
    const g = stabled();
    const s = siteOf(g, "stable", "farm")!;
    for (let dx = 0; dx < STABLE_FOOTPRINT.w; dx++)
      for (let dy = 0; dy < STABLE_FOOTPRINT.h; dy++)
        expect(stableBlocks(g, "farm", s.x + dx, s.y + dy)).toBe(true);
    expect(stableBlocks(g, "farm", s.x + 4, s.y)).toBe(false);
    const home = stableHome(g, "farm")!;
    expect(stableBlocks(g, "farm", home.x, home.y)).toBe(false);
    expect(home.y).toBe(s.y + STABLE_FOOTPRINT.h);
  });

  it("blocks clutter and the tile in front, like the coop", () => {
    const g = rich();
    const m = maps.get("farm");
    const s = freeSpot(g);
    g.rocks = new Rocks([{ x: s.x + 1, y: s.y + STABLE_FOOTPRINT.h }] as never);
    expect(placementBlockers(g, m, "farm", "stable", s.x, s.y)).not.toEqual([]);
  });

  it("is not placed by two orders on the same spot as another building", () => {
    const g = stabled();
    const s = siteOf(g, "stable", "farm")!;
    g.animals.coopBuilt = true;
    expect(
      placementBlockers(g, maps.get("farm"), "farm", "coop", s.x, s.y).length,
    ).toBeGreaterThan(0);
  });

  it("moves for free and the horse with it", () => {
    const g = stabled();
    const m = maps.get("farm");
    const was = siteOf(g, "stable", "farm")!;
    const s = freeSpot({ ...g } as GameState);
    // Nudge by one tile if the first free spot is the old one.
    const to = s.x === was.x && s.y === was.y ? { x: s.x + 1, y: s.y } : s;
    const money = g.money;
    if (moveBuilding(g, m, "farm", "stable", to.x, to.y)) {
      expect(siteOf(g, "stable", "farm")).toEqual(to);
      expect(g.money).toBe(money);
      expect(stableHome(g, "farm")!.x).toBe(to.x + 1);
    }
  });

  it("is taken down for half back, and the horse leaves with it", () => {
    const g = stabled();
    nameHorse(g, "Dobbin");
    const r = refundOf(g, "stable");
    expect(r).toEqual({
      coin: 5000,
      wood: 0,
      stone: 0,
      hardwood: 50,
      iron: 2,
    });
    const money = g.money;
    expect(removeProblem(g, "stable")).toBeUndefined();
    expect(removeBuilding(g, "stable")).toBe(true);
    expect(g.money).toBe(money + 5000);
    expect(g.inventory.count("iron-bar")).toBe(5 + 2);
    expect(g.animals.stableBuilt).toBe(false);
    expect(g.animals.horse).toEqual({ name: "", parked: undefined });
    expect(siteOf(g, "stable", "farm")).toBeDefined();
    expect(g.animals.sites.stable).toBeUndefined();
  });
});

describe("riding", () => {
  it("needs a stable, and only works outdoors", () => {
    const g = rich();
    expect(mountProblem(g, OUTSIDE)).toBe("You have no horse.");
    const s = stabled();
    expect(mountProblem(s, OUTSIDE)).toBeUndefined();
    expect(mountProblem(s, INSIDE)).toBe("You can only ride outdoors.");
    expect(rideable(maps.get("green"))).toBe(true);
    expect(rideable(maps.get("mine"))).toBe(false);
    expect(rideable(maps.get("hall"))).toBe(false);
  });

  it("rides faster than running: 6.6 over 5", () => {
    const g = stabled();
    expect(speedFactor(g)).toBe(1);
    mount(g, OUTSIDE);
    expect(speedFactor(g)).toBeCloseTo(1.32);
    expect(HORSE_SPEED_FACTOR).toBeCloseTo(1.32);
  });

  it("is named once, on the first ride", () => {
    const g = stabled();
    expect(needsName(g)).toBe(true);
    expect(nameHorse(g, "  Pip   the   Brave and the very long  ")).toBe(
      "Pip the Brave an",
    );
    expect(nameHorse(g, "Other")).toBe("Pip the Brave an");
    expect(needsName(g)).toBe(false);
    const h = stabled();
    expect(nameHorse(h, "   ")).toBe("Clover");
  });

  it("waits where it is left, and is back at the stable in the morning", () => {
    const g = stabled();
    const home = stableHome(g, "farm")!;
    expect(horseTile(g, "farm", home)).toEqual(home);
    mount(g, OUTSIDE);
    expect(horseTile(g, "farm", home)).toBeUndefined();
    dismount(g, "green", 3, 4);
    expect(g.animals.mounted).toBe(false);
    expect(horseTile(g, "green", home)).toEqual({ x: 3, y: 4 });
    expect(horseTile(g, "farm", home)).toBeUndefined();
    expect(horseEndDay(g)).toBe(true);
    expect(horseTile(g, "farm", home)).toEqual(home);
    expect(horseEndDay(g)).toBe(false);
  });

  it("lines in the morning report when it spent the night out", () => {
    const g = stabled();
    mount(g, OUTSIDE);
    dismount(g, "farm", 5, 5);
    const r = sleepReport(g);
    expect(r).toContain(
      "Your horse spent the night outside and is back in the stable.",
    );
  });

  it("is on foot after a load", () => {
    const g = stabled();
    mount(g, OUTSIDE);
    const back = deserialize(serialize(g))!;
    expect(back.animals.mounted).toBe(false);
  });
});

function sleepReport(g: GameState): string[] {
  return reportLines(sleep(g, [], () => 0.5));
}

describe("saves", () => {
  it("an old save with no stable loads with none", () => {
    const g = newGame();
    const raw = JSON.parse(serialize(g));
    delete raw.animals.stableBuilt;
    delete raw.animals.horse;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.animals.stableBuilt).toBe(false);
    expect(back.animals.horse).toEqual({ name: "", parked: undefined });
    expect(back.animals.mounted).toBe(false);
  });

  it("the stable, site, name and parked spot survive a save", () => {
    const g = stabled();
    nameHorse(g, "Dobbin");
    mount(g, OUTSIDE);
    dismount(g, "green", 7, 8);
    const back = deserialize(serialize(g))!;
    expect(back.animals.stableBuilt).toBe(true);
    expect(back.animals.sites.stable).toEqual(g.animals.sites.stable);
    expect(back.animals.horse).toEqual({
      name: "Dobbin",
      parked: { map: "green", x: 7, y: 8 },
    });
  });

  it("a stable job under way survives a save", () => {
    const g = rich();
    const s = freeSpot(g);
    orderBuildingAt(g, maps.get("farm"), "farm", "stable", s.x, s.y);
    const back = loadAnimals(saveAnimals(g.animals));
    expect(back.build).toEqual({ daysLeft: 2, tier: 1, building: "stable" });
    expect(back.sites.stable).toEqual(s);
  });

  it("drops a horse with no stable, and broken horse data", () => {
    const a = newGame().animals;
    const raw = JSON.parse(JSON.stringify(saveAnimals(a)));
    raw.horse = { name: "Ghost", parked: { map: "farm", x: 1, y: 1 } };
    expect(loadAnimals(raw).horse).toEqual({ name: "", parked: undefined });
    raw.stableBuilt = true;
    expect(loadAnimals(raw).horse.name).toBe("Ghost");
    expect(loadHorse({ name: 5, parked: { map: "", x: -1, y: "a" } })).toEqual({
      name: "",
      parked: undefined,
    });
    expect(loadHorse(null)).toEqual({ name: "", parked: undefined });
  });
});

/** A small world from rows: "#" is solid, "!" is a door, anything else is open. */
function world(rows: string[]): ParkWorld {
  const at = (x: number, y: number) => rows[y]?.[x];
  const doors = (x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (at(x + dx, y + dy) === "!") return true;
    return false;
  };
  return {
    width: rows[0]!.length,
    height: rows.length,
    blocked: (x, y) => at(x, y) === "#" || at(x, y) === undefined,
    reserved: doors,
  };
}

describe("a parked horse blocks, and never traps the player", () => {
  it("blocks only a parked horse: not while ridden, not at the stable", () => {
    const g = stabled();
    const home = stableHome(g, "farm")!;
    expect(horseBlocks(g, "farm", home.x, home.y)).toBe(false);
    mount(g, OUTSIDE);
    expect(horseBlocks(g, "farm", 5, 5)).toBe(false);
    dismount(g, "farm", 5, 5);
    expect(horseBlocks(g, "farm", 5, 5)).toBe(true);
    expect(horseBlocks(g, "farm", 6, 5)).toBe(false);
    expect(horseBlocks(g, "green", 5, 5)).toBe(false);
    mount(g, OUTSIDE);
    expect(horseBlocks(g, "farm", 5, 5)).toBe(false);
    dismount(g, "farm", 5, 5);
    horseEndDay(g);
    expect(horseBlocks(g, "farm", 5, 5)).toBe(false);
  });

  it("parks on the faced tile when it is free", () => {
    const w = world(["......", "......", "......"]);
    expect(parkSpot(w, { x: 2, y: 1 }, { x: 3, y: 1 })).toEqual({ x: 3, y: 1 });
  });

  it("never parks on the rider, a wall, a door or beside one", () => {
    const w = world(["#####", "#.!.#", "#...#", "#####"]);
    const from = { x: 1, y: 2 };
    expect(parkable(w, from, from)).toBe(false);
    expect(parkable(w, from, { x: 0, y: 0 })).toBe(false);
    expect(parkable(w, from, { x: 2, y: 1 })).toBe(false);
    expect(parkable(w, from, { x: 1, y: 1 })).toBe(false);
    expect(parkable(w, from, { x: 3, y: 2 })).toBe(false);
    expect(parkSpot(w, from, { x: 2, y: 1 })).toBeUndefined();
  });

  it("never parks where it would wall off part of the map", () => {
    // A one tile corridor: the rider at the left, the way on to the right.
    const w = world(["#####", "..#..", "#...#", "#####"].map((r) => r));
    const from = { x: 0, y: 1 };
    const front = { x: 1, y: 1 };
    expect(parkable(w, from, front)).toBe(false);
    const open = world(["#######", "#.....#", "#.....#", "#######"]);
    expect(parkable(open, { x: 1, y: 1 }, { x: 2, y: 1 })).toBe(true);
    // In a corridor with a bay, the bay is fine and the corridor is not.
    const bay = world(["#######", "......#", "###.###", "#######"]);
    expect(parkable(bay, { x: 0, y: 1 }, { x: 1, y: 1 })).toBe(false);
    expect(parkable(bay, { x: 0, y: 1 }, { x: 3, y: 2 })).toBe(true);
  });

  it("parks on the nearest tile that works, and goes home if none does", () => {
    const w = world(["#####", "#...#", "#####"]);
    const from = { x: 1, y: 1 };
    // Only two tiles to the right, and parking at either would cut one off
    // the rider's side only if it sits in the middle.
    expect(parkSpot(w, from, { x: 2, y: 1 })).toEqual({ x: 3, y: 1 });
    expect(PARK_RANGE).toBeGreaterThan(2);
    const g = stabled();
    mount(g, OUTSIDE);
    const none = world(["###", "#.#", "###"]);
    expect(
      dismountSafely(g, "farm", none, { x: 1, y: 1 }, { x: 1, y: 1 }),
    ).toBe(undefined);
    expect(g.animals.mounted).toBe(false);
    expect(g.animals.horse.parked).toBeUndefined();
  });

  it("dismounts onto a safe tile and the player can still walk everywhere", () => {
    const g = stabled();
    mount(g, OUTSIDE);
    const w = world(["#####", "#...#", "#...#", "#####"]);
    const spot = dismountSafely(g, "farm", w, { x: 1, y: 1 }, { x: 2, y: 1 })!;
    expect(spot).toEqual({ x: 2, y: 1 });
    expect(g.animals.horse.parked).toEqual({ map: "farm", x: 2, y: 1 });
    expect(horseBlocks(g, "farm", 2, 1)).toBe(true);
  });

  it("moves a horse found on a bad tile when the map is entered", () => {
    const g = stabled();
    const w = world(["#####", "#...#", "#...#", "#####"]);
    // On the rider's own tile.
    mount(g, OUTSIDE);
    dismount(g, "farm", 1, 1);
    settleHorse(g, "farm", w, { x: 1, y: 1 });
    expect(g.animals.horse.parked).not.toEqual({ map: "farm", x: 1, y: 1 });
    expect(g.animals.horse.parked?.map).toBe("farm");
    // On a wall.
    dismount(g, "farm", 0, 0);
    settleHorse(g, "farm", w, { x: 1, y: 1 });
    const p = g.animals.horse.parked!;
    expect(parkable(w, { x: 1, y: 1 }, p)).toBe(true);
    // A good tile is left alone.
    const keep = { ...p };
    settleHorse(g, "farm", w, { x: 1, y: 1 });
    expect(g.animals.horse.parked).toEqual(keep);
    // Another map's horse is not touched.
    g.animals.horse.parked = { map: "green", x: 0, y: 0 };
    settleHorse(g, "farm", w, { x: 1, y: 1 });
    expect(g.animals.horse.parked).toEqual({ map: "green", x: 0, y: 0 });
  });

  it("never leaves a horse on any exit, entry or counter of the real farm", () => {
    const m = maps.get("farm");
    const g = stabled();
    const w: ParkWorld = {
      width: m.width,
      height: m.height,
      blocked: (x, y) => m.isBlocked(x, y),
      reserved: (x, y) => {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (
              m.exitAt(x + dx, y + dy) ||
              m.serviceAt(x + dx, y + dy) ||
              m.entries.some((e) => e.x === x + dx && e.y === y + dy)
            )
              return true;
        return false;
      },
    };
    for (const e of m.entries) {
      const spot = parkSpot(w, { x: e.x, y: e.y }, { x: e.x, y: e.y + 1 });
      if (spot) {
        expect(m.exitAt(spot.x, spot.y)).toBeUndefined();
        expect(m.serviceAt(spot.x, spot.y)).toBeUndefined();
        expect(m.entries.some((n) => n.x === spot.x && n.y === spot.y)).toBe(
          false,
        );
      }
    }
    expect(g.animals.stableBuilt).toBe(true);
  });
});

describe("naming the horse", () => {
  it("types letters, capitalises words, and stops at 16", () => {
    let t = "";
    for (const k of "pip the brave") t = typeName(t, k);
    expect(t).toBe("Pip The Brave");
    for (const k of "abcdefghij") t = typeName(t, k);
    expect(t).toHaveLength(16);
    expect(t).toBe("Pip The Braveabc");
  });

  it("deletes, and ignores stray keys, doubled and leading spaces", () => {
    expect(typeName("Pip", "Backspace")).toBe("Pi");
    expect(typeName("", "Backspace")).toBe("");
    expect(typeName("Pip", "Shift")).toBe("Pip");
    expect(typeName("Pip", "@")).toBe("Pip");
    expect(typeName("", " ")).toBe("");
    expect(typeName("Pip ", " ")).toBe("Pip ");
    expect(typeName("Pip", "'")).toBe("Pip'");
  });

  it("an empty name is Clover", () => {
    const g = stabled();
    expect(nameHorse(g, "")).toBe("Clover");
  });
});
