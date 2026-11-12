import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import {
  HOUSE_MAP,
  RENOVATIONS,
  SPOUSE_HOLD,
  houseHolds,
  renoArea,
  renovationById,
} from "../src/core/house";

// Reachability over every tier, spouse and renovation combination (note 85,
// build plan item 7). The house is one map with conditional layers, so the
// combinations are read through `houseHolds`, the way the game builds it.

const W = 74;
const H = 44;
const IDS = RENOVATIONS.map((r) => r.id);

/** Every valid set of renovations: an expansion only with its base room. */
const SUBSETS: string[][] = (() => {
  const out: string[][] = [];
  for (let mask = 0; mask < 1 << IDS.length; mask++) {
    const set = IDS.filter((_, i) => mask & (1 << i));
    const ok = set.every((id) => {
      const need = renovationById(id)!.needs;
      return need === undefined || set.includes(need);
    });
    if (ok) out.push(set);
  }
  return out;
})();

const house = (tier: number, spouse: boolean, renos: string[]) => {
  const holds = new Set(houseHolds(tier, spouse, renos));
  return { holds, map: maps.getWith(HOUSE_MAP, holds, tier) };
};

const cells = (m: ReturnType<typeof maps.getWith>) => {
  const out: string[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) out.push(m.isBlocked(x, y) ? "#" : ".");
  return out;
};
const differs = (a: string[], b: string[]) => {
  const out = new Set<string>();
  a.forEach((v, i) => {
    if (v !== b[i]) out.add(`${i % W},${Math.floor(i / W)}`);
  });
  return out;
};
const rect = (x: number, y: number, w: number, h: number) => {
  const out: string[] = [];
  for (let yy = y; yy < y + h; yy++)
    for (let xx = x; xx < x + w; xx++) out.push(`${xx},${yy}`);
  return out;
};

interface Stair {
  name: string;
  /** The stair's own tiles, in the house frame. */
  cells: string[];
  /** The two floors it joins: the tile above its top row and below its bottom row. */
  above: string;
  below: string;
  /** Whether it is cut with this tier, spouse and these renovations. */
  present: (tier: number, spouse: boolean, renos: string[]) => boolean;
}

const STAIRS: Stair[] = [
  {
    name: "A",
    cells: rect(32, 21, 3, 3),
    above: "33,20",
    below: "33,24",
    present: (t) => t >= 2,
  },
  {
    name: "B",
    cells: rect(38, 21, 3, 3),
    above: "39,20",
    below: "39,24",
    present: (t) => t >= 2,
  },
  {
    name: "C",
    cells: rect(50, 21, 3, 1),
    above: "51,20",
    below: "51,22",
    present: (t) => t >= 2,
  },
  {
    name: "attic",
    cells: rect(27, 10, 3, 2),
    above: "28,9",
    below: "28,12",
    present: (t, _s, r) => t >= 2 && r.includes("attic"),
  },
  {
    name: "southern",
    cells: rect(47, 32, 3, 2),
    above: "48,31",
    below: "48,34",
    present: (t, _s, r) => t >= 2 && r.includes("south"),
  },
  {
    name: "corner",
    cells: rect(60, 21, 3, 1),
    above: "61,20",
    below: "61,22",
    present: (t, s, r) => t >= 2 && s && r.includes("corner"),
  },
];

const key = (m: { x: number; y: number }) => `${m.x},${m.y}`;
const TIERS = [0, 1, 2, 3];

describe("every mark and stair is reachable from the door (note 85)", () => {
  for (const tier of TIERS)
    for (const spouse of [false, true])
      it(`tier ${tier}${spouse ? " with a spouse" : ""}, in every renovation set`, () => {
        // Renovations show only from tier 2; below it one set is the whole story.
        const sets = tier >= 2 ? SUBSETS : [[]];
        for (const renos of sets) {
          const { holds, map } = house(tier, spouse, renos);
          const label = `tier ${tier} spouse ${spouse} [${renos.join(",")}]`;
          const reach = map.reachable(map.entry("door")!);
          for (const mark of maps.marksWith(HOUSE_MAP, holds, tier).marks)
            expect(reach.has(key(mark)), `${label}: mark ${mark.name}`).toBe(
              true,
            );
          for (const s of STAIRS) {
            if (s.present(tier, spouse, renos)) {
              for (const c of s.cells)
                expect(reach.has(c), `${label}: stair ${s.name} ${c}`).toBe(
                  true,
                );
              // Each stair joins two floors: land at both ends.
              expect(reach.has(s.above), `${label}: ${s.name} above`).toBe(
                true,
              );
              expect(reach.has(s.below), `${label}: ${s.name} below`).toBe(
                true,
              );
            } else
              for (const c of s.cells)
                expect(
                  reach.has(c),
                  `${label}: stair ${s.name} should be absent`,
                ).toBe(false);
          }
        }
      });

  it("has the spouse marks only with a spouse", () => {
    for (const tier of [1, 2]) {
      const names = (spouse: boolean) =>
        maps
          .marksWith(HOUSE_MAP, new Set(houseHolds(tier, spouse)), tier)
          .marks.map((m) => m.name);
      expect(names(false)).not.toContain("spouse-room-idle");
      expect(names(true)).toContain("spouse-room-idle");
    }
    expect(SPOUSE_HOLD).toBe("spouse");
  });
});

describe("a stair joins two floors that are apart without it", () => {
  it("cuts a different floor on each side of A, B and C", () => {
    const { map } = house(2, false, []);
    for (const s of STAIRS.slice(0, 3)) {
      const [ax, ay] = s.above.split(",").map(Number) as [number, number];
      const [bx, by] = s.below.split(",").map(Number) as [number, number];
      expect(map.isBlocked(ax, ay), s.name).toBe(false);
      expect(map.isBlocked(bx, by), s.name).toBe(false);
      expect(by).toBeGreaterThan(ay + 1);
      for (const c of s.cells) {
        const [x, y] = c.split(",").map(Number) as [number, number];
        expect(map.isBlocked(x, y), `${s.name} ${c}`).toBe(false);
      }
    }
  });
});

describe("a renovation stays in its rectangle in every combination", () => {
  const base = (spouse: boolean) => cells(house(2, spouse, []).map);
  const areaOf = (renos: string[]) => {
    const out = new Set<string>();
    for (const id of renos) for (const c of renoArea(id)) out.add(c);
    return out;
  };

  it.each([false, true])(
    "adds no tile outside the renovations' own areas (spouse %s)",
    (spouse) => {
      for (const renos of SUBSETS) {
        const area = areaOf(renos);
        const changed = differs(
          cells(house(2, spouse, renos).map),
          base(spouse),
        );
        for (const c of changed)
          expect(area.has(c), `[${renos.join(",")}] ${c}`).toBe(true);
      }
    },
  );

  it.each([false, true])(
    "restores its tiles when taken back, whatever else stands (spouse %s)",
    (spouse) => {
      for (const renos of SUBSETS)
        for (const id of renos) {
          const rest = renos.filter((r) => r !== id);
          // An expansion stands only on its base: drop dependents with it.
          if (rest.some((r) => renovationById(r)!.needs === id)) continue;
          const changed = differs(
            cells(house(2, spouse, renos).map),
            cells(house(2, spouse, rest).map),
          );
          const area = renoArea(id);
          for (const c of changed)
            expect(area.has(c), `[${renos.join(",")}] -${id} ${c}`).toBe(true);
        }
    },
  );

  it("changes the house with every renovation, and not with none", () => {
    for (const spouse of [false, true]) {
      expect(
        differs(
          cells(house(2, spouse, IDS).map),
          cells(house(2, spouse, []).map),
        ).size,
      ).toBeGreaterThan(0);
      expect(
        differs(
          cells(house(2, spouse, []).map),
          cells(house(2, spouse, ["bogus"]).map),
        ).size,
      ).toBe(0);
    }
  });

  it("shows no renovation below tier 2", () => {
    for (const tier of [0, 1])
      expect(houseHolds(tier, true, IDS)).toEqual(houseHolds(tier, true));
  });

  it("keeps every combination free of map problems", () => {
    for (const tier of [2, 3])
      for (const spouse of [false, true])
        for (const renos of SUBSETS)
          expect(
            house(tier, spouse, renos).map.problems(),
            `tier ${tier} spouse ${spouse} [${renos.join(",")}]`,
          ).toEqual([]);
  });
});
