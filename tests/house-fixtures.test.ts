import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  DIVORCE_CHEST_HOLD,
  houseHolds,
  houseSpouse,
  SPOUSE_HOLD,
  HOUSE_SHIFT,
} from "../src/core/house";
import { layerBase, layerTier } from "../src/core/map";
import { holdsOf } from "../src/core/worldflags";
import { newGame } from "../src/core/save";

const SPOUSE = new Set([SPOUSE_HOLD]);
const CHEST = new Set([DIVORCE_CHEST_HOLD]);
const NONE = new Set<string>();
const house = (tier: number, holds: ReadonlySet<string> = NONE) =>
  maps.getWith("house", holds, tier);
const door = (tier: number, holds: ReadonlySet<string> = NONE) => {
  const m = house(tier, holds);
  return m.reachable(m.entry("door")!);
};
const walk = (tier: number, holds: ReadonlySet<string>, x: number, y: number) =>
  door(tier, holds).has(`${x},${y}`);

describe("houseHolds with a spouse (note 85)", () => {
  it("adds spouse beside the cellar gate", () => {
    expect(houseHolds(1)).toEqual([]);
    expect(houseHolds(1, true)).toEqual([SPOUSE_HOLD]);
    expect(houseHolds(3, true)).toEqual(["cellar-open", SPOUSE_HOLD]);
  });

  it("reads the stand-in flag, and holdsOf carries it into the map build", () => {
    const g = newGame();
    expect(houseSpouse(g)).toBe(false);
    expect(holdsOf(g).has(SPOUSE_HOLD)).toBe(false);
    g.flags = [SPOUSE_HOLD];
    g.houseTier = 1;
    expect(houseSpouse(g)).toBe(true);
    expect(holdsOf(g).has(SPOUSE_HOLD)).toBe(true);
  });

  it("gives feature layers the base of their grid", () => {
    expect(layerBase("ground-spouse-t1")).toBe("ground");
    expect(layerBase("collision-spouse-t2")).toBe("collision");
    expect(layerBase("fixtures-t1")).toBe("fixtures-t1".replace(/-t1$/, ""));
    expect(layerTier("ground-spouse-t1")).toBe(1);
  });
});

describe("spouse room and hall (note 85)", () => {
  const at = (x: number, y: number) =>
    [x + HOUSE_SHIFT.x, y + HOUSE_SHIFT.y] as const;

  it("is void and walled off without a spouse, at every tier", () => {
    for (const tier of [0, 1, 2]) {
      const m = house(tier);
      expect(m.isBlocked(...at(41, 16))).toBe(true);
      expect(walk(tier, NONE, ...at(41, 16))).toBe(false);
      expect(walk(tier, NONE, ...at(35, 18))).toBe(false);
    }
  });

  it("does not appear at tier 0 even with a spouse", () => {
    expect(walk(0, SPOUSE, ...at(41, 16))).toBe(false);
  });

  it("opens a 10 by 10 room and a 5 row hall at tier 1", () => {
    for (let y = 11; y <= 20; y++)
      for (let x = 36; x <= 45; x++)
        expect(walk(1, SPOUSE, ...at(x, y))).toBe(true);
    for (let y = 16; y <= 20; y++)
      for (let x = 32; x <= 35; x++)
        expect(walk(1, SPOUSE, ...at(x, y))).toBe(true);
    // Walls above and below the hall hold, and the room has no other door.
    for (const x of [33, 34, 35])
      expect(walk(1, SPOUSE, ...at(x, 15))).toBe(false);
    for (const x of [32, 33, 34, 35])
      expect(walk(1, SPOUSE, ...at(x, 21))).toBe(false);
    expect(walk(1, SPOUSE, ...at(46, 16))).toBe(false);
  });

  it("joins the room at tier 2 over the same 5 rows, through the moved bedroom wall", () => {
    for (let y = 16; y <= 20; y++)
      for (let x = 30; x <= 45; x++)
        expect(walk(2, SPOUSE, ...at(x, y))).toBe(true);
    for (const x of [34, 35]) expect(walk(2, SPOUSE, ...at(x, 15))).toBe(false);
    expect(house(2, SPOUSE).isBlocked(...at(34, 15))).toBe(true);
    // Tier 2 bedroom floor at the hall's old top wall stays open.
    expect(walk(2, SPOUSE, ...at(33, 15))).toBe(true);
  });

  it("closes the walls over again when the spouse goes", () => {
    for (const tier of [1, 2]) {
      expect(house(tier).isBlocked(...at(34 - (tier === 1 ? 2 : 0), 18))).toBe(
        true,
      );
      expect(walk(tier, NONE, ...at(40, 16))).toBe(false);
    }
  });

  it("has an idle mark in the room, only while married", () => {
    const names = (h: ReadonlySet<string>) =>
      maps.marksWith("house", h, 1).marks.map((m) => m.name);
    expect(names(NONE)).not.toContain("spouse-room-idle");
    const idle = maps
      .marksWith("house", SPOUSE, 1)
      .marks.find((m) => m.name === "spouse-room-idle")!;
    expect([idle.x, idle.y]).toEqual([...at(43, 16)]);
    expect(walk(1, SPOUSE, idle.x, idle.y)).toBe(true);
  });

  it("has no map problems with the spouse, the chest, both or neither", () => {
    for (const tier of [0, 1, 2])
      for (const h of [
        NONE,
        SPOUSE,
        CHEST,
        new Set([SPOUSE_HOLD, DIVORCE_CHEST_HOLD]),
      ])
        expect(house(tier, h).problems()).toEqual([]);
    expect(maps.problems()).toEqual([]);
  });
});

describe("house fixtures (note 85)", () => {
  const at = (x: number, y: number) =>
    [x + HOUSE_SHIFT.x, y + HOUSE_SHIFT.y] as const;
  const kinds = (tier: number, h: ReadonlySet<string> = NONE) =>
    maps.marksWith("house", h, tier).fixtures.map((f) => f.kind);

  it("stands the TV and hearth in the start room from tier 0, and they block", () => {
    expect(kinds(0)).toEqual(expect.arrayContaining(["tv", "hearth"]));
    for (const x of [15, 16, 17])
      expect(house(0).isBlocked(...at(x, 13))).toBe(true);
    const hearth = maps
      .marksWith("house", NONE, 0)
      .fixtures.find((f) => f.kind === "hearth")!;
    expect([hearth.x, hearth.y, hearth.w, hearth.h]).toEqual([
      ...at(16, 13),
      2,
      1,
    ]);
  });

  it("adds the counters, sink and fridge at tier 1 and blocks them", () => {
    expect(kinds(0)).not.toContain("sink");
    const k = kinds(1);
    expect(k.filter((x) => x === "counter")).toHaveLength(2);
    expect(k).toEqual(expect.arrayContaining(["sink", "fridge"]));
    for (const x of [3, 4, 5, 7, 8])
      expect(house(1).isBlocked(...at(x, 11))).toBe(true);
    expect(house(0).isBlocked(...at(3, 11))).toBe(true); // void before tier 1
  });

  it("keeps the stove usable from below and the kitchen row open on both sides", () => {
    const m = house(1);
    expect(m.services.find((s) => s.kind === "cooking")).toMatchObject({
      x: 25,
      y: 22,
    });
    expect(walk(1, NONE, 25, 23)).toBe(true);
    expect(walk(1, NONE, ...at(6, 11))).toBe(true);
    expect(walk(1, NONE, ...at(9, 11))).toBe(true);
  });

  it("puts the crib and two child beds in the nursery at tier 2 only, all blocking", () => {
    expect(kinds(1)).not.toContain("crib");
    const k = kinds(2);
    expect(k.filter((x) => x === "crib")).toHaveLength(1);
    expect(k.filter((x) => x === "child-bed")).toHaveLength(2);
    for (const [x0, y0] of [
      [19, 1],
      [26, 1],
      [30, 1],
    ] as const)
      for (const dx of [0, 1])
        for (const dy of [0, 1])
          expect(house(2).isBlocked(...at(x0 + dx, y0 + dy))).toBe(true);
    // The spare room stays bare.
    for (const x of [2, 8]) expect(walk(2, NONE, ...at(x, 2))).toBe(true);
  });

  it("marks the door, both sides of the double bed and the kitchen, reachable from the door", () => {
    const find = (tier: number, h: ReadonlySet<string>, name: string) =>
      maps.marksWith("house", h, tier).marks.find((m) => m.name === name);
    const marks = maps.marksWith("house", NONE, 1).marks.map((m) => m.name);
    expect(marks).toEqual(
      expect.arrayContaining([
        "door-entry",
        "door-entry-2",
        "player-wake",
        "spouse-bed",
        "spouse-kitchen",
      ]),
    );
    expect(find(0, NONE, "player-wake")).toBeUndefined();
    const bed = house(1).services.find((s) => s.kind === "bed")!;
    for (const name of ["player-wake", "spouse-bed"]) {
      const m = find(1, NONE, name)!;
      expect(m.y).toBe(bed.y + 1);
      expect(Math.abs(m.x - bed.x)).toBeLessThanOrEqual(1);
      expect(walk(1, NONE, m.x, m.y)).toBe(true);
    }
    const wake = find(1, NONE, "player-wake")!;
    const mate = find(1, NONE, "spouse-bed")!;
    expect([wake.x, wake.y]).toEqual([...at(26, 13)]);
    expect([mate.x, mate.y]).toEqual([...at(28, 13)]);
    for (const name of ["door-entry", "door-entry-2", "spouse-kitchen"]) {
      const m = find(1, NONE, name)!;
      expect(walk(1, NONE, m.x, m.y)).toBe(true);
    }
  });

  it("holds the divorce chest in the bedroom corner only after a divorce, blocking", () => {
    expect(kinds(1)).not.toContain("chest");
    expect(house(1).isBlocked(...at(31, 20))).toBe(false);
    const chest = maps
      .marksWith("house", CHEST, 1)
      .fixtures.find((f) => f.kind === "chest")!;
    expect([chest.x, chest.y]).toEqual([...at(31, 20)]);
    expect(house(1, CHEST).isBlocked(chest.x, chest.y)).toBe(true);
    expect(
      maps.marksWith("house", CHEST, 1).marks.map((m) => m.name),
    ).toContain("chest-divorce");
    expect(walk(1, CHEST, chest.x - 1, chest.y)).toBe(true);
    expect(walk(2, CHEST, chest.x - 1, chest.y)).toBe(true);
  });
});
