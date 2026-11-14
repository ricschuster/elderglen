import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  FESTIVAL_RETURN,
  FESTIVALS,
  festivalMapFor,
  festivalPlace,
  festivalOfMap,
  isFestivalMap,
  sightLine,
} from "../src/core/festivals";
import { festivalLayout } from "../src/core/festivalroutes";
import { serviceLabel } from "../src/core/labels";
import {
  MAZE,
  MAZE_EVEN,
  cellAt,
  mazeChest,
  mazeStart,
} from "../src/core/maze";
import { isFarmMap, FARM_TYPES } from "../src/core/farmtypes";
import type { FarmMap } from "../src/core/map";

const OX = 4;
const OY = 1;

/** True when the player can stand beside this service and face it. */
const faceable = (map: FarmMap, reach: Set<string>, x: number, y: number) =>
  [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ].some(([dx, dy]) => reach.has(`${x + dx!},${y + dy!}`));

describe("festival maps (note 66 layout addendum)", () => {
  it("puts the Harvest Showing on the green and Hollow Eve on the hedge map", () => {
    expect(FESTIVALS.find((f) => f.id === "harvest-showing")?.map).toBe(
      "green",
    );
    expect(FESTIVALS.find((f) => f.id === "hollow-eve")?.map).toBe("hedge");
    expect(festivalOfMap("green")?.activity).toBe("showing");
    expect(isFestivalMap("farm")).toBe(false);
    for (const f of FESTIVALS.filter((x) => x.map))
      expect(maps.ids, f.id).toContain(f.map);
  });

  it("has a way in and a way home on every farm map", () => {
    for (const t of FARM_TYPES) {
      expect(isFarmMap(t.map)).toBe(true);
      const map = maps.get(t.map);
      expect(map.entry(FESTIVAL_RETURN), t.id).toBeDefined();
      const gate = map.services.find((s) => s.kind === "festival");
      expect(gate, t.id).toBeDefined();
      expect(map.isBlocked(gate!.x, gate!.y)).toBe(true);
      const from = map.entry(FESTIVAL_RETURN)!;
      expect(map.reachable(from).has(`${gate!.x},${gate!.y + 1}`)).toBe(true);
      expect(
        map.reachable(map.entry("start")!).has(`${from.x},${from.y}`),
      ).toBe(true);
    }
  });

  for (const f of FESTIVALS.filter((x) => x.map)) {
    describe(f.name, () => {
      const map = maps.get(f.map!);
      const door = map.entry("door")!;
      const reach = map.reachable(door);

      it("locks every shop: no door leads out, only the way home", () => {
        expect(map.exits).toEqual([]);
        expect(map.problems()).toEqual([]);
        expect(map.hasSoil).toBe(false);
        const leave = map.services.filter((s) => s.kind === "festival-leave");
        expect(leave).toHaveLength(1);
        expect(faceable(map, reach, leave[0]!.x, leave[0]!.y)).toBe(true);
      });

      it("has every service named and within reach", () => {
        for (const s of map.services) {
          expect(serviceLabel(s.kind, s.id), s.id).toBeDefined();
          expect(faceable(map, reach, s.x, s.y), s.id).toBe(true);
          expect(map.isBlocked(s.x, s.y), s.id).toBe(true);
        }
      });

      it("gives each villager and decoration a line", () => {
        for (const s of map.services.filter((x) => x.kind === "sight"))
          expect(sightLine(f, s.id), s.id).toBeTruthy();
      });
    });
  }

  it("the green has the table, the judge and a prize counter", () => {
    const ids = maps.get("green").services.map((s) => `${s.kind}:${s.id}`);
    expect(ids).toEqual(
      expect.arrayContaining([
        "showing:table",
        "showing:judge",
        "festival-counter:prizes",
      ]),
    );
    expect(
      maps.get("green").services.filter((s) => s.kind === "sight").length,
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("the hedge map", () => {
  const map = maps.get("hedge");

  it("is the odd-year maze, tile for tile except the villagers' niches, beside a plaza with a booth", () => {
    // Note 82: a niche is cut into the outer hedge for each villager (the map is one column wider).
    const niches = new Set(
      festivalLayout(FESTIVALS.find((f) => f.id === "hollow-eve")!)!.niches.map(
        String,
      ),
    );
    for (let y = 0; y < MAZE.rows.length; y++)
      for (let x = 1; x < MAZE.rows[0]!.length; x++) {
        if (niches.has(String([x + OX, y + OY]))) continue;
        const c = cellAt(x, y);
        const solid =
          c === "#" || c in MAZE.scares || c in MAZE.talkers || c === "E";
        expect(map.isBlocked(x + OX, y + OY), `${x},${y}`).toBe(solid);
      }
    expect(
      map.services.some(
        (s) => s.kind === "festival-counter" && s.id === "booth",
      ),
    ).toBe(true);
  });

  it("puts every scare and villager of the maze file inside it", () => {
    const ids = map.services.map((s) => s.id);
    for (const k of Object.keys(MAZE.scares))
      expect(ids).toContain(`scare-${k}`);
    for (const k of Object.keys(MAZE.talkers))
      expect(ids).toContain(`talk-${k}`);
  });

  it("puts the chest at the maze end and a cart beside it back to the door", () => {
    const e = mazeChest();
    const chest = map.services.find((s) => s.kind === "hedge-chest")!;
    expect(chest).toMatchObject({ x: e.x + OX, y: e.y + OY });
    const cart = map.services.find((s) => s.kind === "hedge-cart")!;
    expect(cart).toBeDefined();
    const reach = map.reachable(map.entry("door")!);
    expect(reach.has(`${cart.x},${cart.y + 1}`)).toBe(true);
    expect(reach.has(`${chest.x - 1},${chest.y}`)).toBe(true);
  });

  it("keeps the hidden gap a shorter way, never the only way", () => {
    const dist = (open: boolean) => {
      const s = mazeStart();
      const seen = new Map<string, number>([[`${s.x},${s.y}`, 0]]);
      const q = [s];
      const wall = (x: number, y: number) => {
        const c = MAZE.rows[y]?.[x] ?? "#";
        const gap = x === MAZE.gap.x && y === MAZE.gap.y;
        return (
          (c === "#" && !(open && gap)) || c in MAZE.scares || c in MAZE.talkers
        );
      };
      for (let i = 0; i < q.length; i++) {
        const c = q[i]!;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const n = { x: c.x + dx, y: c.y + dy };
          const k = `${n.x},${n.y}`;
          if (seen.has(k) || wall(n.x, n.y)) continue;
          seen.set(k, seen.get(`${c.x},${c.y}`)! + 1);
          q.push(n);
        }
      }
      const e = mazeChest();
      return seen.get(`${e.x},${e.y}`);
    };
    expect(MAZE.rows[MAZE.gap.y]![MAZE.gap.x]).toBe("#");
    expect(dist(false)).toBeDefined();
    expect(dist(true)!).toBeLessThan(dist(false)!);
    expect(map.isBlocked(MAZE.gap.x + OX, MAZE.gap.y + OY)).toBe(false);
  });
});

describe("the even-year hedge map (note 82)", () => {
  const map = maps.get("hedge-even");
  const f = FESTIVALS.find((x) => x.id === "hollow-eve")!;
  const l = festivalLayout(f, false, 2)!;

  it("is chosen in even years and the odd map in odd years", () => {
    expect(festivalMapFor(f, 1)).toBe("hedge");
    expect(festivalMapFor(f, 2)).toBe("hedge-even");
    expect(festivalOfMap("hedge-even")?.id).toBe("hollow-eve");
    expect(isFestivalMap("hedge-even")).toBe(true);
    expect(festivalLayout(f, false, 1)!.map).toBe("hedge");
    expect(l.map).toBe("hedge-even");
    expect(festivalPlace(f, false, 2).zone.w).toBe(map.width);
  });

  it("is the even-year maze tile for tile, except the niches and the opening", () => {
    const niches = new Set(l.niches.map(String));
    for (let y = 0; y < MAZE_EVEN.rows.length; y++)
      for (let x = 1; x < MAZE_EVEN.rows[0]!.length; x++) {
        if (niches.has(String([x + OX, y + OY]))) continue;
        const c = MAZE_EVEN.rows[y]![x]!;
        const gap = x === MAZE_EVEN.gap.x && y === MAZE_EVEN.gap.y;
        const solid =
          (c === "#" && !gap) ||
          c in MAZE_EVEN.scares ||
          c in MAZE_EVEN.talkers ||
          c === "E";
        expect(map.isBlocked(x + OX, y + OY), `${x},${y}`).toBe(solid);
      }
    expect(map.width).toBe(MAZE_EVEN.rows[0]!.length + OX + 1);
    expect(map.height).toBe(MAZE_EVEN.rows.length + 2);
  });

  it("has the services, a reachable chest and cart, and a way home", () => {
    const ids = map.services.map((s) => s.id);
    for (const k of Object.keys(MAZE_EVEN.scares))
      expect(ids).toContain(`scare-${k}`);
    for (const k of Object.keys(MAZE_EVEN.talkers))
      expect(ids).toContain(`talk-${k}`);
    expect(map.exits).toEqual([]);
    expect(map.problems()).toEqual([]);
    const reach = map.reachable(map.entry("door")!);
    const chest = map.services.find((s) => s.kind === "hedge-chest")!;
    const ey = MAZE_EVEN.rows.findIndex((r) => r.includes("E"));
    const e = { x: MAZE_EVEN.rows[ey]!.indexOf("E"), y: ey };
    expect(chest).toMatchObject({ x: e.x + OX, y: e.y + OY });
    expect(reach.has(`${chest.x - 1},${chest.y}`)).toBe(true);
    const cart = map.services.find((s) => s.kind === "hedge-cart")!;
    expect(reach.has(`${cart.x},${cart.y + 1}`)).toBe(true);
    const leave = map.services.find((s) => s.kind === "festival-leave")!;
    expect(reach.has(`${leave.x},${leave.y - 1}`)).toBe(true);
  });

  it("cuts a niche per villager as dead ends of length one, never touching", () => {
    expect(l.niches).toHaveLength(14);
    for (const [x, y] of l.niches) {
      expect(map.isBlocked(x, y), `${x},${y}`).toBe(false);
      const open = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([dx, dy]) => !map.isBlocked(x + dx!, y + dy!));
      expect(open, `${x},${y} has one way in`).toHaveLength(1);
      for (const [ox, oy] of l.niches)
        if (ox !== x || oy !== y)
          expect(Math.max(Math.abs(ox - x), Math.abs(oy - y))).toBeGreaterThan(
            1,
          );
    }
    expect(map.isBlocked(map.width - 1, 3)).toBe(true);
  });

  it("keeps every villager and start reachable with the villagers standing in the way", () => {
    // Any one villager's tile can be blocked without cutting the chest off from the start.
    const start = l.starts[0]!;
    const chest = map.services.find((s) => s.kind === "hedge-chest")!;
    const reach = map.reachable({ x: start[0], y: start[1] });
    expect(reach.has(`${chest.x - 1},${chest.y}`)).toBe(true);
    for (const t of Object.values(l.spots))
      expect(reach.has(`${t[0]},${t[1]}`) || t[0] <= 3).toBe(true);
  });
});
