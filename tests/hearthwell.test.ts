import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";

// The river layout pass of note 77 (#661): terrain, streets, bridges and lots.
const town = maps.get("hearthwell");
const region = (id: string) => {
  const r = town.regions.find((x) => x.id === id);
  if (!r) throw new Error(`no region ${id}`);
  return r;
};
const inside = (r: { x: number; y: number; w: number; h: number }) => {
  const out: [number, number][] = [];
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]);
  return out;
};
const lots = town.regions.filter((r) => r.id.startsWith("lot-"));

describe("the Hearthwell river layout (note 77, #661)", () => {
  it("is 120 by 110, rideable, river water, and meets the contract", () => {
    expect(town.width).toBe(120);
    expect(town.height).toBe(110);
    expect(town.rideable).toBe(true);
    expect(town.traits.waterKind).toBe("river");
    expect(maps.problems()).toEqual([]);
    expect(mapFiles["hearthwell"]).toBeDefined();
  });

  it("has a straight 7 wide main arm, bridged only at the three crossings", () => {
    const bridges = ["bridge-north", "bridge-middle", "bridge-south"].map(
      region,
    );
    const rows = new Set(bridges.flatMap((b) => inside(b).map(([, y]) => y)));
    for (let y = 0; y < 94; y++)
      for (let x = 56; x <= 62; x++) {
        expect(town.isWater(x, y)).toBe(!rows.has(y));
        if (rows.has(y)) expect(town.isBlocked(x, y)).toBe(false);
      }
    expect(bridges.map((b) => [b.w, b.h])).toEqual([
      [7, 3],
      [7, 5],
      [7, 3],
    ]);
    expect(bridges.map((b) => b.y)).toEqual([29, 60, 90]);
    // Land on both sides of the arm, so the bridges are the only crossings.
    expect(town.isWater(55, 10)).toBe(false);
    expect(town.isWater(63, 10)).toBe(false);
  });

  it("bends the main arm once, east, under the festival green", () => {
    expect(town.isWater(56, 94)).toBe(true);
    expect(town.isWater(60, 99)).toBe(true);
    expect(town.isWater(72, 102)).toBe(true);
    for (let x = 69; x <= 113; x++) {
      expect(town.isWater(x, 100)).toBe(true);
      expect(town.isWater(x, 106)).toBe(true);
      expect(town.isWater(x, 99)).toBe(x >= 109);
    }
    const green = region("festival-green");
    expect([green.w, green.h]).toEqual([36, 22]);
    for (const [x, y] of inside(green)) expect(town.isWater(x, y)).toBe(false);
  });

  it("has a 5 wide east arm whose broken bridge is still water", () => {
    for (let y = 0; y < 100; y++) {
      for (let x = 109; x <= 113; x++) expect(town.isWater(x, y)).toBe(true);
      expect(town.isWater(108, y)).toBe(false);
      expect(town.isWater(114, y)).toBe(false);
    }
    const broken = region("broken-bridge");
    expect([broken.x, broken.y, broken.w, broken.h]).toEqual([109, 60, 5, 5]);
    for (const [x, y] of inside(broken)) expect(town.isWater(x, y)).toBe(true);
  });

  it("joins the arms into one river that leaves by the south edge", () => {
    // Flood the water from below the south bridge (the main arm) only.
    const seen = new Set<string>();
    const stack: [number, number][] = [[59, 93]];
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const k = `${x},${y}`;
      if (seen.has(k) || !town.isWater(x, y)) continue;
      seen.add(k);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const)
        if (x + dx >= 0 && y + dy >= 0 && x + dx < 120 && y + dy < 110)
          stack.push([x + dx, y + dy]);
    }
    // The main arm's last reach joins the east arm's whole length.
    expect(seen.has("111,0")).toBe(true);
    expect(seen.has("111,99")).toBe(true);
    const edge = [];
    for (let x = 0; x < 120; x++) if (town.isWater(x, 109)) edge.push(x);
    expect(edge).toEqual([104, 105, 106, 107, 108, 109, 110, 111, 112, 113]);
  });

  it("keeps each street and avenue on the paths layer", () => {
    for (const [x, y] of [
      [10, 30],
      [10, 62],
      [10, 91],
      [31, 50],
      [51, 10],
      [88, 40],
      [75, 30],
      [100, 62],
      [59, 62],
      [59, 30],
      [59, 91],
      [50, 76],
      [73, 107],
    ])
      expect(town.isPath(x!, y!)).toBe(true);
  });

  it("reserves twelve lots on dry land that do not overlap or touch the water", () => {
    expect(lots).toHaveLength(12);
    const taken = new Set<string>();
    for (const lot of lots) {
      expect(lot.x).toBeGreaterThan(0);
      expect(lot.x + lot.w).toBeLessThan(119);
      for (const [x, y] of inside(lot)) {
        expect(town.isWater(x, y)).toBe(false);
        expect(town.isPath(x, y)).toBe(false);
        expect(taken.has(`${x},${y}`)).toBe(false);
        taken.add(`${x},${y}`);
      }
    }
  });

  it("gives every lot an entry on a street below its door, all reachable from the Farm", () => {
    const from = town.entry("from_farm")!;
    const walkable = town.reachable(from);
    for (const lot of lots) {
      const id = lot.id.slice("lot-".length);
      const e = town.entry(`from_${id}`);
      expect(e, id).toBeDefined();
      expect(e!.y).toBe(lot.y + lot.h);
      expect(e!.x).toBeGreaterThanOrEqual(lot.x);
      expect(e!.x).toBeLessThan(lot.x + lot.w);
      expect(town.isPath(e!.x, e!.y)).toBe(true);
      expect(walkable.has(`${e!.x},${e!.y}`)).toBe(true);
    }
    for (const name of ["from_mountain", "from_delta"]) {
      const e = town.entry(name)!;
      expect(walkable.has(`${e.x},${e.y}`)).toBe(true);
    }
  });

  it("puts the hall, the Outpost and the square on the island, the sawmill and the rest on the west bank", () => {
    const west = [
      "general-store",
      "healer",
      "inn",
      "library",
      "burrow-young",
      "sawmill",
      "smithy",
      "hatter",
    ];
    const island = ["burrow-gardener", "outpost", "hall", "burrow-retired"];
    for (const id of west)
      expect(region(`lot-${id}`).x + region(`lot-${id}`).w).toBeLessThan(56);
    for (const id of island) expect(region(`lot-${id}`).x).toBeGreaterThan(62);
    const sq = region("town-square");
    expect([sq.x, sq.y, sq.w, sq.h]).toEqual([64, 54, 17, 17]);
    // The mill wheel stands in the main arm beside the carpenter's yard.
    const wheel = region("mill-wheel");
    for (const [x, y] of inside(wheel)) expect(town.isWater(x, y)).toBe(true);
    const yard = region("sawmill-yard");
    expect(yard.x + yard.w).toBe(wheel.x);
    expect(yard.y).toBeLessThanOrEqual(wheel.y);
  });

  it("keeps the far bank and the ring 2 gate apart from the town", () => {
    const walkable = town.reachable(town.entry("from_farm")!);
    expect(walkable.has("116,60")).toBe(false);
    expect(walkable.has("100,62")).toBe(true);
    const gate = region("exit-ring2");
    expect([gate.x, gate.y, gate.w, gate.h]).toEqual([119, 58, 1, 8]);
  });

  it("puts the three edge exits on dry land of the right bank", () => {
    const walkable = town.reachable(town.entry("from_farm")!);
    for (const id of ["exit-farm", "exit-mountain", "exit-delta"])
      for (const [x, y] of inside(region(id)))
        expect(walkable.has(`${x},${y}`)).toBe(true);
    // The delta exit is on the south bank, reached from the west bank.
    const d = region("exit-delta");
    expect(d.x).toBe(70);
    expect(town.isWater(d.x, d.y - 1)).toBe(false);
    expect(town.isWater(d.x, 106)).toBe(true);
  });
});
