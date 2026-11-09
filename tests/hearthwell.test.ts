import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import { BOARD_LINES, serviceLabel } from "../src/core/labels";
import { newGame } from "../src/core/save";
import { Walker } from "../scripts/sim/world";

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
/** The ten lot doors that #646 opened onto interiors. */
const DOORS = [
  "general-store",
  "healer",
  "inn",
  "library",
  "smithy",
  "hatter",
  "outpost",
  "burrow-gardener",
  "burrow-retired",
  "burrow-young",
];

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

describe("the Hearthwell shell (note 77, #645)", () => {
  const farmIds = ["farm", "farm-woodland"];

  it("joins the farm, the Mountain and the delta both ways", () => {
    const to = (id: string) => town.exits.find((e) => e.id === id);
    expect(to("to_farm")).toMatchObject({
      map: "farm",
      entry: "from_hearthwell",
    });
    expect(to("to_mountain")).toMatchObject({
      map: "mountain",
      entry: "from_hearthwell",
    });
    expect(to("to_delta")).toMatchObject({
      map: "delta",
      entry: "from_hearthwell",
    });
    // Each exit stands on its reserved edge region.
    for (const [exit, reserved] of [
      ["to_farm", "exit-farm"],
      ["to_mountain", "exit-mountain"],
      ["to_delta", "exit-delta"],
    ] as const) {
      const e = to(exit)!;
      const r = region(reserved);
      expect([e.x, e.y, e.w, e.h]).toEqual([r.x, r.y, r.w, r.h]);
    }
    // No ring 2 exit until ring 2 has a map.
    expect(town.exits.find((e) => e.map === "")).toBeUndefined();
    expect(town.exits.map((e) => e.id).sort()).toEqual(
      [
        ...DOORS,
        "hall",
        "sawmill",
        "to_delta",
        "to_farm",
        "to_mountain",
      ].sort(),
    );
    for (const id of farmIds)
      expect(
        maps.get(id).exits.find((e) => e.id === "hearthwell"),
      ).toMatchObject({
        map: "hearthwell",
        entry: "from_farm",
      });
    expect(
      maps.get("mountain").exits.find((e) => e.id === "to_hearthwell"),
    ).toMatchObject({ map: "hearthwell", entry: "from_mountain" });
    expect(
      maps.get("delta").exits.find((e) => e.id === "to_hearthwell"),
    ).toMatchObject({ map: "hearthwell", entry: "from_delta" });
    expect(maps.get("delta").entry("from_hearthwell")).toMatchObject({
      x: 69,
      y: 3,
    });
    expect(maps.get("farm").entry("from_hearthwell")).toBeDefined();
  });

  it("takes the hall and sawmill doors off both farms and points the interiors here", () => {
    for (const id of farmIds) {
      const farm = maps.get(id);
      for (const gone of ["hall", "sawmill"])
        expect(farm.exits.find((e) => e.id === gone)).toBeUndefined();
      for (const gone of ["from_hall", "from_sawmill"])
        expect(farm.entry(gone)).toBeUndefined();
      // The two building sites are open ground again.
      expect(farm.isBlocked(6, 23)).toBe(false);
      expect(farm.isBlocked(33, 9)).toBe(false);
      // The shop, board and request counters stay on the farm.
      for (const kind of ["shop", "orders", "requests"])
        expect(farm.services.some((s) => s.kind === kind)).toBe(true);
    }
    expect(town.exits.find((e) => e.id === "hall")).toMatchObject({
      map: "hall",
    });
    expect(maps.get("hall").exits[0]).toMatchObject({
      map: "hearthwell",
      entry: "from_hall",
    });
    expect(maps.get("sawmill").exits[0]).toMatchObject({
      map: "hearthwell",
      entry: "from_sawmill",
    });
  });

  it("stands the hall and sawmill doors on their lots, above the entries", () => {
    for (const id of ["hall", "sawmill"]) {
      const door = town.exits.find((e) => e.id === id)!;
      const lot = region(`lot-${id}`);
      const entry = town.entry(`from_${id}`)!;
      expect(door.y).toBe(lot.y + lot.h - 1);
      expect(door.x).toBeGreaterThanOrEqual(lot.x);
      expect(door.x).toBeLessThan(lot.x + lot.w);
      expect([entry.x, entry.y]).toEqual([door.x, door.y + 1]);
      expect(town.isBlocked(door.x, door.y)).toBe(false);
    }
  });

  it("builds every lot as a solid building with one open door tile on the bottom row", () => {
    for (const lot of lots) {
      let solid = 0;
      let open = 0;
      for (const [x, y] of inside(lot)) {
        if (town.isBlocked(x, y)) solid++;
        else open++;
      }
      const id = lot.id.slice(4);
      // Every lot has one walkable door now (#646 opened the other ten).
      expect(open, id).toBe(1);
      expect(solid + open, id).toBe(lot.w * lot.h);
    }
  });

  it("keeps the Help Wanted board on the store's wall and moves the shop and smith counters inside", () => {
    expect(town.services.find((s) => s.kind === "shop")).toBeUndefined();
    expect(town.services.find((s) => s.kind === "smith")).toBeUndefined();
    const help = town.services.find((s) => s.kind === "requests")!;
    expect(help.y).toBe(28);
    expect(help.x).toBeGreaterThanOrEqual(region("lot-general-store").x);
    expect(help.x).toBeLessThan(region("lot-general-store").x + 10);
    const walkable = town.reachable(town.entry("from_farm")!);
    expect(walkable.has(`${help.x},${help.y + 1}`)).toBe(true);
    expect(maps.get("general-store").services[0]).toMatchObject({
      kind: "shop",
    });
    expect(maps.get("smithy").services[0]).toMatchObject({ kind: "smith" });
  });

  it("hangs the road news and Special Orders boards on the Outpost wall", () => {
    const outpost = region("lot-outpost");
    for (const [id, kind] of [
      ["road-news", "board-news"],
      ["special-orders", "board-orders"],
    ] as const) {
      const s = town.services.find((x) => x.id === id)!;
      expect(s.kind).toBe(kind);
      expect(s.y).toBe(outpost.y + outpost.h - 1);
      expect(BOARD_LINES[kind]).toBeDefined();
      expect(serviceLabel(kind, id)).toBeDefined();
    }
  });

  it("reaches the hall, sawmill and shop from the house through Hearthwell", () => {
    const seen = new Map<string, string[]>([["house", ["house"]]]);
    const queue = ["house"];
    for (let i = 0; i < queue.length; i++) {
      const at = queue[i]!;
      for (const e of maps.get(at).exits) {
        const to = e.map === "farm" ? "farm" : e.map;
        if (!to || seen.has(to) || !mapFiles[to]) continue;
        seen.set(to, [...seen.get(at)!, to]);
        queue.push(to);
      }
    }
    expect(seen.get("hall")).toEqual(["house", "farm", "hearthwell", "hall"]);
    expect(seen.get("sawmill")).toEqual([
      "house",
      "farm",
      "hearthwell",
      "sawmill",
    ]);
    expect(seen.get("hearthwell")).toBeDefined();
    // The sim's walker finds them the same way and the carpenter is reachable.
    const g = newGame();
    const walker = new Walker(g);
    expect(walker.goToService("hall", "larder")).toBe(true);
    expect(walker.mapId).toBe("hall");
    expect(walker.goToService("sawmill", "carpenter")).toBe(true);
    expect(walker.goToService("general-store", "shop")).toBe(true);
    expect(walker.mapId).toBe("general-store");
    expect(walker.goToService("farm", "shop")).toBe(true);
    expect(walker.mapId).toBe("farm");
  });

  it("passes the map check with every edge exit reachable", () => {
    expect(maps.problems()).toEqual([]);
    for (const e of ["from_farm", "from_mountain", "from_delta", "from_hall"]) {
      const walkable = town.reachable(town.entry(e)!);
      for (const x of town.exits) {
        const any = inside(x).some(([tx, ty]) => walkable.has(`${tx},${ty}`));
        expect(any, `${x.id} from ${e}`).toBe(true);
      }
    }
  });
});
