import { describe, expect, it } from "vitest";
import { FarmMap } from "../src/core/map";
import {
  BUILT_FLOORS,
  FLOOR_HEIGHT,
  FLOOR_WIDTH,
  floorCreatures,
  floorLayout,
  floorMapJson,
} from "../src/core/mines";

const floors = () => {
  const out: ReturnType<typeof floorLayout>[] = [];
  for (let day = 5; day < 45; day++)
    for (let f = 1; f <= BUILT_FLOORS; f += 7) out.push(floorLayout(f, day));
  return out;
};

describe("cave pools on mine floors (note 93)", () => {
  it("some floors have a 3 by 2 pool and most do not", () => {
    const all = floors();
    const pooled = all.filter((l) => l.pool.length > 0);
    expect(pooled.length).toBeGreaterThan(0);
    expect(pooled.length).toBeLessThan(all.length / 2);
    for (const l of pooled) expect(l.pool).toHaveLength(6);
  });

  it("keeps rocks, the ladder, the camp and creatures off the water", () => {
    for (const l of floors().filter((x) => x.pool.length > 0)) {
      const wet = new Set(l.pool.map((p) => `${p.x},${p.y}`));
      for (const r of l.rocks) expect(wet.has(`${r.x},${r.y}`)).toBe(false);
      if (l.ladder) expect(wet.has(`${l.ladder.x},${l.ladder.y}`)).toBe(false);
      if (l.camp) expect(wet.has(`${l.camp.x},${l.camp.y}`)).toBe(false);
    }
    for (let day = 5; day < 45; day++)
      for (const c of floorCreatures(3, day)) {
        const l = floorLayout(3, day);
        const wet = new Set(l.pool.map((p) => `${p.x},${p.y}`));
        expect(wet.has(`${Math.floor(c.x)},${Math.floor(c.y)}`)).toBe(false);
      }
  });

  it("is water of the cave-pool kind on the map, never walkable, and leaves the floor joined", () => {
    const l = floors().find((x) => x.pool.length > 0)!;
    const map = FarmMap.fromTiled(floorMapJson(l));
    for (const p of l.pool) {
      expect(map.isWater(p.x, p.y)).toBe(true);
      expect(map.waterKindAt(p.x, p.y)).toBe("cave-pool");
      expect(map.isBlocked(p.x, p.y)).toBe(true);
    }
    const open = (x: number, y: number) =>
      x >= 0 &&
      y >= 0 &&
      x < FLOOR_WIDTH &&
      y < FLOOR_HEIGHT &&
      !map.isBlocked(x, y);
    const seen = new Set<string>([`${l.arrive.x},${l.arrive.y}`]);
    const todo = [l.arrive];
    while (todo.length) {
      const t = todo.pop()!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const k = `${t.x + dx},${t.y + dy}`;
        if (open(t.x + dx, t.y + dy) && !seen.has(k)) {
          seen.add(k);
          todo.push({ x: t.x + dx, y: t.y + dy });
        }
      }
    }
    let openCount = 0;
    for (let y = 0; y < FLOOR_HEIGHT; y++)
      for (let x = 0; x < FLOOR_WIDTH; x++) if (open(x, y)) openCount++;
    expect(seen.size).toBe(openCount);
  });
});
