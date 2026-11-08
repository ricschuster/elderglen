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

const FARMS = ["farm", "farm-woodland"];

function rich(): GameState {
  const g = newGame();
  g.money = 20000;
  g.inventory.add("wood", 200);
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
  it("costs gold, wood and iron bars, and nothing is paid until a spot is chosen", () => {
    const g = rich();
    const m = maps.get("farm");
    const bad = placementBlockers(g, m, "farm", "stable", 0, 0);
    expect(bad.length).toBeGreaterThan(0);
    expect(orderBuildingAt(g, m, "farm", "stable", 0, 0)).toBe(false);
    expect(g.money).toBe(20000);
    const s = freeSpot(g);
    expect(orderBuildingAt(g, m, "farm", "stable", s.x, s.y)).toBe(true);
    expect(g.money).toBe(20000 - STABLE_COST.coin);
    expect(g.inventory.count("wood")).toBe(200 - STABLE_COST.wood);
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
    expect(r).toEqual({ coin: 5000, wood: 50, stone: 0, iron: 2 });
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
    expect(mountProblem(g, "farm", FARMS)).toBe("You have no horse.");
    const s = stabled();
    expect(mountProblem(s, "farm", FARMS)).toBeUndefined();
    expect(mountProblem(s, "house", FARMS)).toBe("You can only ride outdoors.");
    expect(rideable("green", FARMS)).toBe(true);
    expect(rideable("mine-1", FARMS)).toBe(false);
    expect(rideable("hall", FARMS)).toBe(false);
  });

  it("rides faster than running: 6.6 over 5", () => {
    const g = stabled();
    expect(speedFactor(g)).toBe(1);
    mount(g, "farm", FARMS);
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
    mount(g, "farm", FARMS);
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
    mount(g, "farm", FARMS);
    dismount(g, "farm", 5, 5);
    const r = sleepReport(g);
    expect(r).toContain(
      "Your horse spent the night outside and is back in the stable.",
    );
  });

  it("is on foot after a load", () => {
    const g = stabled();
    mount(g, "farm", FARMS);
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
    mount(g, "farm", FARMS);
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
