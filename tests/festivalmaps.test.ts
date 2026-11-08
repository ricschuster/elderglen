import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  FESTIVAL_RETURN,
  FESTIVALS,
  festivalOfMap,
  isFestivalMap,
  sightLine,
} from "../src/core/festivals";
import { serviceLabel } from "../src/core/labels";
import { MAZE, cellAt, mazeChest, mazeStart } from "../src/core/maze";
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

  it("is the odd-year maze, tile for tile, beside a plaza with a booth", () => {
    for (let y = 0; y < MAZE.rows.length; y++)
      for (let x = 1; x < MAZE.rows[0]!.length; x++) {
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
