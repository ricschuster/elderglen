import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  areaOf,
  areasEndDay,
  enterArea,
  isAreaMap,
  placeSpawn,
} from "../src/core/areas";
import { SEED_STAGE } from "../src/core/trees";
import { exitOpen } from "../src/core/map";
import { exitLabel } from "../src/core/labels";
import {
  campLine,
  CAMP_LINES,
  QUARRY_OPEN,
  quarryBridgeMended,
  quarryBridgeNews,
  quarryHolds,
  QUARRY_ROOM,
} from "../src/core/quarry";
import { reportLines } from "../src/core/report";
import { newGame } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { farmMapOf } from "../src/core/farmtypes";
import { nightlySpawns, SPAWN_TABLES, spawnAttempts } from "../src/core/spawns";
import { holdsOf } from "../src/core/worldflags";
import { fillBundle } from "./hall-helpers";

const quarry = maps.get("quarry");
const mountain = maps.get("mountain");
const mended = maps.getWith("mountain", new Set([QUARRY_OPEN]));
const ruined = maps.getWith("mountain", new Set());

function mendBridge(g: ReturnType<typeof newGame>) {
  const wallet = {
    get money() {
      return g.money;
    },
    set money(v: number) {
      g.money = v;
    },
  };
  for (const b of g.hall.bundles.filter((x) => x.room === QUARRY_ROOM))
    fillBundle(g.hall, g.inventory, wallet, b);
}

describe("the Quarry map (note 78)", () => {
  it("is 60 by 44, rideable, wild, and meets the contract", () => {
    expect(quarry.width).toBe(60);
    expect(quarry.height).toBe(44);
    expect(quarry.rideable).toBe(true);
    expect(quarry.wild).toBe(true);
    expect(isAreaMap("quarry")).toBe(true);
    expect(maps.problems()).toEqual([]);
    expect(exitLabel("to_quarry")).toBe("Quarry");
  });

  it("has one way in, from the Mountain", () => {
    expect(quarry.exits).toHaveLength(1);
    expect(quarry.exits[0]).toMatchObject({
      id: "to_mountain",
      map: "mountain",
      entry: "from_quarry",
      x: 0,
      y: 20,
      h: 5,
    });
    expect(quarry.entry("from_mountain")).toMatchObject({ x: 3, y: 22 });
  });

  it("keeps the camp, the dwarf and the pads reachable", () => {
    const walkable = quarry.reachable(quarry.entry("from_mountain")!);
    expect(walkable.has("11,28")).toBe(true);
    expect(walkable.has("11,36")).toBe(true);
    expect(quarry.serviceAt(11, 35)?.kind).toBe("stonekeeper");
    expect(quarry.isPad(6, 5)).toBe(true);
    expect(quarry.isPad(28, 12)).toBe(true);
    expect(quarry.isPad(46, 26)).toBe(true);
    expect(quarry.isPad(14, 5)).toBe(false);
  });

  it("starts with about 60 rocks, 8 copper, 4 coal and 2 iron, none on a pad", () => {
    const count = (k: string) =>
      quarry.rocks.filter((r) => (r.kind ?? "stone") === k).length;
    expect(count("stone")).toBe(60);
    expect(count("copper")).toBe(8);
    expect(count("coal")).toBe(4);
    expect(count("iron")).toBe(2);
    expect(quarry.rocks.some((r) => quarry.isPad(r.x, r.y))).toBe(false);
    const g = newGame();
    expect(g.areas["quarry"]!.rocks.count).toBe(74);
    expect(
      g.areas["quarry"]!.rocks.at(quarry.rocks[60]!.x, quarry.rocks[60]!.y)!
        .kind,
    ).toBe("copper");
  });
});

describe("the mended bridge (Mountain)", () => {
  it("is ruined by default: blocked, with the exit shut and the bridge saying so", () => {
    expect(ruined.isBlocked(76, 47)).toBe(true);
    const exit = ruined.exits.find((e) => e.id === "to_quarry")!;
    expect(exit).toMatchObject({
      map: "quarry",
      entry: "from_mountain",
      x: 79,
      h: 5,
    });
    expect(exitOpen(exit, new Set())).toBe(false);
    expect(ruined.serviceAt(73, 47)?.kind).toBe("quarry-bridge");
    const walkable = ruined.reachable(ruined.entry("from_forest")!);
    expect(walkable.has("72,47")).toBe(true);
    expect(walkable.has("79,47")).toBe(false);
  });

  it("is open when mended: walkable across to the exit, no bridge post", () => {
    expect(mended.isBlocked(76, 47)).toBe(false);
    expect(mended.serviceAt(73, 47)).toBeUndefined();
    const walkable = mended.reachable(mended.entry("from_forest")!);
    expect(walkable.has("79,47")).toBe(true);
    expect(mended.entry("from_quarry")).toMatchObject({ x: 76, y: 47 });
    expect(
      exitOpen(
        mended.exits.find((e) => e.id === "to_quarry")!,
        new Set([QUARRY_OPEN]),
      ),
    ).toBe(true);
    expect(mended.isBlocked(76, 40)).toBe(true);
    expect(mountain.exits.some((e) => e.id === "to_quarry")).toBe(true);
  });

  it("is mended by the Foragers' Shelf and reads from the hall, with no flag", () => {
    const g = newGame();
    expect(quarryBridgeMended(g)).toBe(false);
    expect(quarryHolds(g)).toEqual([]);
    expect(holdsOf(g).has(QUARRY_OPEN)).toBe(false);
    mendBridge(g);
    expect(quarryBridgeMended(g)).toBe(true);
    expect(holdsOf(g).has(QUARRY_OPEN)).toBe(true);
    expect(g.flags ?? []).not.toContain(QUARRY_OPEN);
  });

  it("says in the morning report, once, that the bridge is mended", () => {
    const g = newGame();
    expect(quarryBridgeNews(g)).toBe(false);
    mendBridge(g);
    const r = sleep(g, farmMapOf(g).forageSpots, Math.random, farmMapOf(g));
    expect(r.quarryBridge).toBe(true);
    expect(reportLines(r).join(" ")).toContain("Quarry is open");
    const r2 = sleep(g, farmMapOf(g).forageSpots, Math.random, farmMapOf(g));
    expect(r2.quarryBridge).toBe(false);
  });

  it("gives the dwarf a camp line a day", () => {
    expect(campLine(0)).toBe(CAMP_LINES[0]);
    expect(campLine(CAMP_LINES.length + 2)).toBe(CAMP_LINES[2]);
  });
});

describe("the nightly spawn table (note 78, owner answer 3)", () => {
  const table = SPAWN_TABLES["quarry"]!;

  it("tries 7 spawns in year 1, 2 more a year, at most 16", () => {
    expect(spawnAttempts(table, 1)).toBe(7);
    expect(spawnAttempts(table, 2)).toBe(9);
    expect(spawnAttempts(table, 5)).toBe(15);
    expect(spawnAttempts(table, 6)).toBe(16);
    expect(spawnAttempts(table, 20)).toBe(16);
  });

  it("only picks free tiles, at most one a tile", () => {
    const tiles = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ];
    const out = nightlySpawns(
      table,
      1,
      tiles,
      (x) => x === 2,
      () => 0.3,
    );
    expect(out.length).toBeLessThanOrEqual(1);
    for (const s of out) expect(s.x).toBe(2);
  });

  it("restores nodes overnight, never on a pad, and clearing the map keeps them coming", () => {
    const g = newGame();
    const w = g.areas["quarry"]!;
    // Clear every rock, as a player who has cleared the field.
    for (const r of [...w.rocks.each()]) w.rocks.remove(r.x, r.y);
    expect(w.rocks.count).toBe(0);
    for (let n = 0; n < 5; n++) areasEndDay(g, Math.random);
    expect(w.rocks.count + w.trees.save().length).toBeGreaterThan(5);
    for (const r of w.rocks.each()) {
      expect(quarry.isPad(r.x, r.y)).toBe(false);
      expect(quarry.canPlantTree(r.x, r.y)).toBe(true);
    }
  });

  it("spawns nothing on top of an existing rock", () => {
    const g = newGame();
    const w = g.areas["quarry"]!;
    const before = new Map(
      [...w.rocks.each()].map((r) => [`${r.x},${r.y}`, r.kind]),
    );
    for (let n = 0; n < 5; n++) areasEndDay(g, Math.random);
    for (const [k, kind] of before) {
      const [x, y] = k.split(",").map(Number);
      expect(w.rocks.at(x!, y!)?.kind).toBe(kind);
    }
  });

  it("does not touch the farm's or another area's rocks when sleeping away from home", () => {
    const g = newGame();
    const farmRocks = g.rocks.count;
    enterArea(g, "quarry");
    sleep(g, farmMapOf(g).forageSpots, Math.random, farmMapOf(g));
    expect(areaOf(g)).toBeUndefined();
    expect(g.rocks.count).toBeLessThanOrEqual(farmRocks + 8);
    expect(g.areas["quarry"]!.rocks.count).toBeGreaterThan(74 - 1);
  });

  it("places oak and maple seeds as seeds of that kind, and ore as its own node", () => {
    const w = newGame().areas["quarry"]!;
    expect(placeSpawn(w, { x: 20, y: 20, kind: "oak-seed" })).toBe(true);
    expect(placeSpawn(w, { x: 21, y: 20, kind: "maple-seed" })).toBe(true);
    expect(w.trees.at(20, 20)).toMatchObject({
      stage: SEED_STAGE,
      kind: "oak",
    });
    expect(w.trees.at(21, 20)).toMatchObject({
      stage: SEED_STAGE,
      kind: "maple",
    });
    expect(placeSpawn(w, { x: 22, y: 20, kind: "iron" })).toBe(true);
    expect(w.rocks.at(22, 20)!.kind).toBe("iron");
    expect(placeSpawn(w, { x: 23, y: 20, kind: "hard-rock" })).toBe(true);
    expect(w.rocks.at(23, 20)!.kind).toBe("stone");
    expect(placeSpawn(w, { x: 22, y: 20, kind: "rock" })).toBe(false);
  });

  it("has the table's kinds in the saved Quarry shape", () => {
    expect(table.kinds.map((k) => k.kind)).toContain("hearthsilver");
  });
});
