import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import { places, spotMarks } from "../src/content/villagers.json";
import { HOUSE_MAP, houseHolds } from "../src/core/house";
import { SPOUSE_BED, SPOUSE_KITCHEN, SPOUSE_ROOM } from "../src/core/spouse";
import { VILLAGERS, bedPlace, resolvePlace } from "../src/core/villagers";
import { talkTarget, villagersOn, type Present } from "../src/core/townfolk";
import { interiorIds } from "./helpers/interior";

// Nobody is ever placed on a wall (tablet play, 2026-11-20: Linnet drawn inside
// the young burrow wall). Every place id any villager route uses, home, rain
// and override stops included, must resolve to a tile that is open on its map,
// and indoors reachable from the door. Spouse routes reuse these place ids.

const placeIds = new Set<string>();
for (const v of VILLAGERS) {
  placeIds.add(v.home);
  for (const s of [
    ...v.route,
    ...v.rain,
    ...v.weekday.flatMap((o) => o.stops),
    ...v.season.flatMap((o) => o.stops),
  ])
    placeIds.add(s.place);
}

describe("every route stop lands on an open tile", () => {
  it("resolves every place id to a walkable tile on its map", () => {
    const problems: string[] = [];
    for (const id of placeIds) {
      const p = resolvePlace(id);
      if (!p) {
        problems.push(`${id}: unknown place`);
        continue;
      }
      if (p.transit || p.map === null || !(p.map in mapFiles)) continue;
      const m = maps.get(p.map);
      if (m.isBlocked(p.x, p.y))
        problems.push(`${id}: ${p.map} ${p.x},${p.y} is solid`);
      else if (p.indoors) {
        const from = m.entry("door");
        if (from && !m.reachable(from).has(`${p.x},${p.y}`))
          problems.push(
            `${id}: ${p.map} ${p.x},${p.y} is cut off from the door`,
          );
      }
    }
    expect(problems).toEqual([]);
  });
});

const MARKS = spotMarks as unknown as Record<string, string[]>;
/** How far a stop may stand from its mark: a solid mark moves one step or two. */
const NEAR = 3;

describe("every interior stop resolves to its own mark, not a fallback tile", () => {
  it("finds a mark for each spot and stands within a few tiles of it", () => {
    const problems: string[] = [];
    for (const id of placeIds) {
      const [base, spot] = id.split("/") as [string, string | undefined];
      const interior = (places as Record<string, { interior?: string }>)[base]
        ?.interior;
      if (!interior || !(interior in mapFiles) || base === "farm:house")
        continue;
      const want = spot ?? "common";
      const names = MARKS[want];
      if (!names) {
        problems.push(`${id}: spot "${want}" has no marks in spotMarks`);
        continue;
      }
      const marks = maps.marksWith(interior, new Set()).marks;
      const mark = names
        .map((n) => marks.find((m) => m.name === n))
        .find((m) => m);
      if (!mark) {
        problems.push(`${id}: ${interior} has none of ${names.join(", ")}`);
        continue;
      }
      const p = resolvePlace(id)!;
      const d = Math.abs(p.x - mark.x) + Math.abs(p.y - mark.y);
      if (d > NEAR)
        problems.push(`${id}: ${d} tiles from ${mark.name} in ${interior}`);
    }
    expect(problems).toEqual([]);
  });
});

describe("the spouse spots in the house are open", () => {
  it("has the bed, kitchen and room tiles open with the spouse held", () => {
    for (const spot of [SPOUSE_BED, SPOUSE_KITCHEN, SPOUSE_ROOM]) {
      const p = resolvePlace(spot)!;
      for (let tier = 1; tier <= maps.maxTier(HOUSE_MAP); tier++) {
        const holds = new Set(houseHolds(tier, true));
        const m = maps.getWith(HOUSE_MAP, holds, tier);
        expect(m.isBlocked(p.x, p.y), `${spot} tier ${tier}`).toBe(false);
      }
    }
  });
});

describe("every interior bed and spot mark is open or beside an open tile", () => {
  it("has each mark on, or next to, a tile reachable from the door", () => {
    const problems: string[] = [];
    for (const id of interiorIds()) {
      const m = maps.get(id);
      const open = m.reachable(m.entry("door")!);
      for (const mk of maps.marksWith(id, new Set()).marks) {
        if (!/^(bed|spot)-/.test(mk.name)) continue;
        const near = [
          [0, 0],
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => open.has(`${mk.x + dx!},${mk.y + dy!}`));
        if (!near) problems.push(`${id} ${mk.name} ${mk.x},${mk.y}`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("nobody shares a tile", () => {
  const g = { weather: "sunny" } as Parameters<typeof villagersOn>[0];
  it("spreads people over open tiles all day, on every map they stand on", () => {
    const problems: string[] = [];
    const mapIds = new Set<string>();
    for (const id of placeIds) {
      const p = resolvePlace(id);
      if (p?.map && p.map in mapFiles) mapIds.add(p.map);
    }
    for (const day of [1, 3, 5, 7, 40, 66, 92])
      for (const mapId of mapIds)
        for (let t = 6 * 60; t <= 26 * 60; t += 30) {
          const seen = new Set<string>();
          for (const p of villagersOn(g, mapId, day, t)) {
            const k = `${p.x},${p.y}`;
            if (seen.has(k))
              problems.push(`${mapId} day ${day} min ${t}: ${k} shared`);
            seen.add(k);
          }
        }
    expect(problems).toEqual([]);
  });
});

describe("talkTarget", () => {
  const p = (id: string, x: number, y: number): Present => ({
    id,
    name: id,
    x,
    y,
    placeholder: false,
  });
  it("prefers the person on the faced tile", () => {
    const list = [p("hattie", 5, 5), p("linnet", 4, 5)];
    expect(talkTarget(list, { x: 4, y: 5 }, { x: 4, y: 7 })?.id).toBe("linnet");
  });
  it("else takes the nearest beside it, then the last talked to, then the id", () => {
    const face = { x: 5, y: 6 };
    const two = [p("b", 4, 6), p("a", 6, 6)];
    expect(talkTarget(two, face, { x: 4, y: 8 })?.id).toBe("b");
    expect(talkTarget(two, face, { x: 5, y: 8 })?.id).toBe("a");
    expect(talkTarget(two, face, { x: 5, y: 8 }, "b")?.id).toBe("b");
    expect(talkTarget(two, { x: 20, y: 20 }, { x: 5, y: 8 })).toBeUndefined();
  });
  it("exactOnly leaves a counter beside a stallkeeper to the counter", () => {
    const list = [p("cordelia", 33, 60)];
    const face = { x: 33, y: 61 };
    expect(talkTarget(list, face, { x: 33, y: 62 })?.id).toBe("cordelia");
    expect(talkTarget(list, face, { x: 33, y: 62 }, "", true)).toBeUndefined();
    expect(
      talkTarget(list, { x: 33, y: 60 }, { x: 33, y: 62 }, "", true)?.id,
    ).toBe("cordelia");
  });
});

describe("per-person beds (#992)", () => {
  it("gives every villager with a home interior a bed mark that exists there", () => {
    const problems: string[] = [];
    for (const v of VILLAGERS) {
      const base = v.home.split("/")[0]!;
      const interior = (places as Record<string, { interior?: string }>)[base]
        ?.interior;
      if (!interior || !(interior in mapFiles)) {
        if (v.bedMark) problems.push(`${v.id}: bed mark but no interior`);
        continue;
      }
      if (!v.bedMark) {
        problems.push(`${v.id}: no bed mark in ${interior}`);
        continue;
      }
      const has = maps
        .marksWith(interior, new Set())
        .marks.some((m) => m.name === v.bedMark);
      if (!has) problems.push(`${v.id}: ${interior} has no ${v.bedMark}`);
      const p = bedPlace(v);
      if (!p || p.map !== interior || maps.get(interior).isBlocked(p.x, p.y))
        problems.push(`${v.id}: bad bed tile`);
    }
    expect(problems).toEqual([]);
  });

  it("gives every villager a bed of their own, even the couples (partners lie on the two sides of the double bed)", () => {
    const byBed = new Map<string, string[]>();
    for (const v of VILLAGERS) {
      if (!v.bedMark) continue;
      const k = `${v.home.split("/")[0]}|${v.bedMark}`;
      byBed.set(k, [...(byBed.get(k) ?? []), v.id]);
    }
    for (const ids of byBed.values()) expect(ids).toHaveLength(1);
    const tiles = new Map<string, string[]>();
    for (const v of VILLAGERS) {
      const b = bedPlace(v);
      if (!b) continue;
      const k = `${b.map}|${b.x},${b.y}`;
      tiles.set(k, [...(tiles.get(k) ?? []), v.id]);
    }
    for (const [k, ids] of tiles) expect(ids, k).toHaveLength(1);
  });

  it("leaves only the camp wanderer without a bed", () => {
    const without = VILLAGERS.filter((v) => !bedPlace(v)).map((v) => v.id);
    expect(without).toEqual(["rundahl"]);
  });

  it("names every bed mark bed-<id> for the two new homes, and walks Marl and Maren to their own", () => {
    for (const id of ["marl", "maren"]) {
      const v = VILLAGERS.find((x) => x.id === id)!;
      expect(v.bedMark).toBe(`bed-${id}`);
      expect(bedPlace(v)?.map).toBe(
        id === "marl" ? "quarry-tent" : "mine-room",
      );
    }
  });

  it("lies each person on their bed at bedtime and in the morning before the first stop, only on their home map", () => {
    const g = { weather: "sunny" } as Parameters<typeof villagersOn>[0];
    const problems: string[] = [];
    for (const v of VILLAGERS) {
      const b = bedPlace(v);
      if (!b) continue;
      const first = v.route[0];
      for (const t of [v.bed + 30, 6 * 60]) {
        if (t === 6 * 60 && first && first.time <= t) continue;
        const here = villagersOn(g, b.map!, 1, t).find((p) => p.id === v.id);
        if (!here?.lying || here.x !== b.x || here.y !== b.y)
          problems.push(`${v.id} at ${t}`);
      }
      const elsewhere = villagersOn(g, "hearthwell", 1, v.bed + 30).some(
        (p) => p.id === v.id,
      );
      if (elsewhere) problems.push(`${v.id} shown outside`);
    }
    expect(problems).toEqual([]);
  });
});

describe("Maren's back room and Marl's tent (#992)", () => {
  const link = [
    ["mine", "mine-room", "room", "from_room"],
    ["quarry", "quarry-tent", "tent", "from_tent"],
  ] as const;
  it("load, and connect to the outer map both ways", () => {
    for (const [outer, inner, exitId, entry] of link) {
      const o = maps.get(outer);
      const i = maps.get(inner);
      expect(o.exits.find((e) => e.id === exitId)).toMatchObject({
        map: inner,
        entry: "door",
      });
      expect(i.exits.find((e) => e.id === "door")).toMatchObject({
        map: outer,
        entry,
      });
      const back = o.entry(entry)!;
      expect(back).toBeDefined();
      expect(o.isBlocked(back.x, back.y)).toBe(false);
      expect(i.entry("door")).toBeDefined();
    }
    expect(maps.problems()).toEqual([]);
  });

  it("have a walkable bed mark and a home spot, and are reachable from the door", () => {
    for (const [id, bed] of [
      ["mine-room", "bed-maren"],
      ["quarry-tent", "bed-marl"],
    ] as const) {
      const m = maps.get(id);
      const open = m.reachable(m.entry("door")!);
      const names = maps.marksWith(id, new Set()).marks;
      for (const n of [bed, "spot-home-sit"]) {
        const mk = names.find((x) => x.name === n)!;
        expect(mk, `${id} ${n}`).toBeDefined();
        expect(open.has(`${mk.x},${mk.y}`), `${id} ${n} walkable`).toBe(true);
      }
    }
  });
});
