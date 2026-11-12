import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import { conditionsOf } from "../src/core/map";
import { DAYS_PER_SEASON, SEASONS, type Season } from "../src/core/calendar";
import { FESTIVALS, inZone } from "../src/core/festivals";
import {
  ENDS_AFTER_MAIN_EVENT,
  LAYOUTS,
  LEAVES,
  MARCH_MIN_PER_TILE,
  PARADE_LINE,
  PARADE_PATH,
  PARADE_START,
  PARADE_TAIL,
  RIVALS,
  attendees,
  endsAfterMainEvent,
  festivalHolds,
  festivalLayout,
  festivalWhere,
  paradeLaps,
  paradeSteps,
  villagerNow,
} from "../src/core/festivalroutes";
import { VILLAGERS, dayContext, villagerById } from "../src/core/villagers";

const dayOf = (season: Season, d: number) =>
  SEASONS.indexOf(season) * DAYS_PER_SEASON + d;
const fest = (id: string) => FESTIVALS.find((f) => f.id === id)!;
const v = (id: string) => villagerById(id)!;

/** The 22 town residents with Aldreth (note 82). */
const TOWN = VILLAGERS.filter((x) => !x.area).map((x) => x.id);
const AREA_AT: Record<string, string[]> = {
  "harvest-showing": ["korvi", "marl", "maren", "dilly", "rushie", "thalwen"],
  "midwinter-feast": ["korvi", "marl", "maren"],
  "midwinter-feast@hall": ["korvi", "marl", "maren"],
  "seedswap-fair": ["dilly"],
  "lamplight-evening": ["thalwen", "rushie"],
  frostday: ["dilly", "rushie"],
  "hat-parade": [],
  "cake-day": [],
  "hollow-eve": [],
};

describe("festival layouts (note 82)", () => {
  it("has a layout for every festival but the Night Market, plus the hall feast", () => {
    for (const f of FESTIVALS.filter((x) => x.id !== "night-market")) {
      const l = festivalLayout(f);
      expect(l, f.id).toBeDefined();
      expect(l!.map, f.id).toBe(f.place.map);
    }
    const feast = fest("midwinter-feast");
    expect(festivalLayout(feast, true)?.map).toBe("hall");
    expect(festivalLayout(feast, true)?.map).toBe(feast.placeUpgrade?.map);
  });

  it("sends exactly the people note 82 names to each festival", () => {
    for (const l of LAYOUTS) {
      const want = [...TOWN, ...AREA_AT[l.key]!].sort();
      expect(attendees(l).sort(), l.key).toEqual(want);
      expect(attendees(l)).not.toContain("rosmarin");
      expect(attendees(l)).not.toContain("rundahl");
    }
  });

  it("gives 8 distinct start tiles and one distinct standing tile each", () => {
    for (const l of LAYOUTS) {
      expect(l.starts, l.key).toHaveLength(8);
      const all = [...l.starts, ...Object.values(l.spots)].map(
        (t) => `${t[0]},${t[1]}`,
      );
      expect(new Set(all).size, l.key).toBe(all.length);
      for (const id of attendees(l)) expect(villagerById(id), id).toBeDefined();
    }
  });

  it("keeps every standing tile inside the festival's place, except the road and the farm start rows", () => {
    for (const f of FESTIVALS.filter((x) => x.id !== "night-market")) {
      const l = festivalLayout(f)!;
      // The Frostday south shore and the parade start rows are on roads outside the zone.
      if (f.id === "frostday" || f.id === "hat-parade") continue;
      for (const [id, t] of Object.entries(l.spots))
        expect(inZone(f.place.zone, t[0], t[1]), `${f.id} ${id}`).toBe(true);
    }
  });

  for (const l of LAYOUTS) {
    describe(l.key, () => {
      const holds = new Set(l.hold ? [l.hold] : []);
      const map = maps.getWith(l.map, holds);
      const reach = map.reachable({ x: l.starts[0]![0], y: l.starts[0]![1] });
      const near = (t: readonly [number, number]) =>
        [
          [0, 0],
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => reach.has(`${t[0] + dx!},${t[1] + dy!}`));

      it("names a hold that its map uses", () => {
        if (l.hold) expect(conditionsOf(mapFiles[l.map]!)).toContain(l.hold);
      });

      it("puts the eight start entries on free tiles that reach each other and a way out", () => {
        const names = map.entries.map((e) => e.name);
        l.starts.forEach((t, i) => {
          const base = l.key.replace("@", "-");
          expect(names, `${base}_start_${i + 1}`).toContain(
            `${base}_start_${i + 1}`,
          );
          const e = map.entry(`${base}_start_${i + 1}`)!;
          expect([e.x, e.y]).toEqual([...t]);
          expect(map.isBlocked(t[0], t[1])).toBe(false);
          expect(reach.has(`${t[0]},${t[1]}`)).toBe(true);
        });
        const other = map.entries.filter((e) => !e.name.includes("_start_"));
        expect(other.some((e) => reach.has(`${e.x},${e.y}`))).toBe(true);
      });

      it("stands every villager on a free, reachable tile that is not a tree, service or exit", () => {
        for (const [id, t] of Object.entries(l.spots)) {
          const [x, y] = t;
          if (!l.seated.includes(id))
            expect(map.isBlocked(x, y), `${id} ${x},${y}`).toBe(false);
          expect(
            map.trees.some((r) => r.x === x && r.y === y),
            `${id} on a tree`,
          ).toBe(false);
          expect(map.serviceAt(x, y), `${id} on a service`).toBeUndefined();
          expect(map.exitAt(x, y), `${id} on an exit`).toBeUndefined();
          expect(near(t), `${id} ${x},${y} reachable`).toBe(true);
        }
      });

      it("keeps the tiles it promises clear", () => {
        for (const [x, y] of l.keepClear) {
          expect(map.isBlocked(x, y), `${x},${y}`).toBe(false);
          expect(
            Object.values(l.spots).some((t) => t[0] === x && t[1] === y),
          ).toBe(false);
        }
      });
    });
  }

  it("lays the Seedswap hunt on free ground, 18 packets in each parity", () => {
    const l = festivalLayout(fest("seedswap-fair"))!;
    const map = maps.getWith(l.map, new Set([l.hold!]));
    expect(l.hunt).toMatchObject({ seconds: 50, win: 9 });
    expect(l.hunt!.lastStart).toBeLessThan(fest("seedswap-fair").closes);
    for (const set of [l.hunt!.odd, l.hunt!.even]) {
      expect(set).toHaveLength(18);
      expect(new Set(set.map((t) => `${t}`)).size).toBe(18);
      for (const [x, y] of set) {
        expect(map.isBlocked(x, y), `${x},${y}`).toBe(false);
        expect(map.trees.some((t) => t.x === x && t.y === y)).toBe(false);
      }
    }
    expect(l.hunt!.odd.map(String)).not.toEqual(l.hunt!.even.map(String));
  });

  it("freezes the lake for Frostday: walkable ice, twelve holes that are water", () => {
    const l = festivalLayout(fest("frostday"))!;
    const ice = maps.getWith("forest", new Set([l.hold!]));
    const plain = maps.getWith("forest", new Set());
    expect(l.holes).toHaveLength(12);
    expect(plain.isBlocked(48, 24)).toBe(true);
    expect(ice.isBlocked(48, 24)).toBe(false);
    expect(ice.isWater(48, 24)).toBe(false);
    for (const [x, y] of l.holes) {
      expect(plain.isBlocked(x, y)).toBe(true);
      expect(ice.isBlocked(x, y)).toBe(true);
      expect(ice.isWater(x, y)).toBe(true);
      // cast from an adjacent ice tile
      expect(
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => !ice.isBlocked(x + dx!, y + dy!)),
      ).toBe(true);
    }
  });

  it("cuts Hollow Eve's niches as dead ends of length one onto a corridor tile", () => {
    const l = festivalLayout(fest("hollow-eve"))!;
    const map = maps.get("hedge");
    expect(l.niches).toHaveLength(13);
    const nicheSet = new Set(l.niches.map(String));
    for (const [x, y] of l.niches) {
      expect(map.isBlocked(x, y), `${x},${y}`).toBe(false);
      const open = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([dx, dy]) => !map.isBlocked(x + dx!, y + dy!));
      expect(open, `${x},${y} has one way in`).toHaveLength(1);
      const [dx, dy] = open[0]!;
      expect(nicheSet.has(`${x + dx!},${y + dy!}`)).toBe(false);
    }
    // The map is one column wider, with a wall behind the east niches.
    expect(map.width).toBe(24);
    expect(map.isBlocked(23, 3)).toBe(true);
    expect(fest("hollow-eve").place.zone.w).toBe(map.width);
  });
});

describe("the festival route layer", () => {
  const hat = fest("hat-parade");

  it("holds today's layout on festival days only", () => {
    expect(festivalHolds(dayOf("spring", 10))).toEqual(["festival-hat-parade"]);
    expect(festivalHolds(dayOf("winter", 8))).toEqual(["festival-frostday"]);
    expect(festivalHolds(dayOf("spring", 11))).toEqual([]);
    // The Night Market is an evening festival and has no layout hold.
    expect(festivalHolds(dayOf("winter", 17))).toEqual([]);
    expect(festivalHolds(dayOf("winter", 25))).toEqual([
      "festival-midwinter-feast",
    ]);
    expect(festivalHolds(dayOf("winter", 25), true)).toEqual([
      "festival-midwinter-feast-hall",
    ]);
  });

  it("keeps the normal day before opening and after the end", () => {
    expect(festivalWhere(v("odette"), hat, hat.opens - 1)).toBeUndefined();
    expect(festivalWhere(v("odette"), hat, hat.ends)).toBeUndefined();
    expect(festivalWhere(v("odette"), hat, hat.opens)).toMatchObject({
      map: "hearthwell",
      x: 73,
      y: 58,
      state: "standing",
    });
  });

  it("leaves people who do not go on their normal route", () => {
    for (const id of ["rosmarin", "rundahl", "korvi"])
      expect(festivalWhere(v(id), hat, 13 * 60)).toBeUndefined();
    const ctx = dayContext(dayOf("spring", 10), "sunny");
    const r = villagerNow(v("rosmarin"), dayOf("spring", 10), ctx, 13 * 60);
    expect(r.festival).toBeUndefined();
    expect(
      villagerNow(v("odette"), dayOf("spring", 10), ctx, 13 * 60).festival,
    ).toBeDefined();
  });

  it("sends Hester home at 20:30 on every festival day", () => {
    expect(LEAVES.hester).toBe(20 * 60 + 30);
    for (const f of FESTIVALS.filter((x) => x.id !== "night-market")) {
      expect(festivalWhere(v("hester"), f, 20 * 60 + 29)?.state, f.id).not.toBe(
        "home",
      );
      const home = festivalWhere(v("hester"), f, 20 * 60 + 30);
      expect(home?.state, f.id).toBe("home");
      expect(festivalWhere(v("walter"), f, 20 * 60 + 30)?.state).not.toBe(
        "home",
      );
    }
  });

  it("names Linnet the Seedswap rival and ends two festivals after the main event", () => {
    expect(RIVALS["seedswap-fair"]).toBe("linnet");
    expect(RIVALS.frostday).toBe("rushie");
    expect(villagerById(RIVALS["seedswap-fair"]!)).toBeDefined();
    expect(ENDS_AFTER_MAIN_EVENT).toEqual(["seedswap-fair", "frostday"]);
    expect(endsAfterMainEvent(fest("seedswap-fair"))).toBe(true);
    expect(endsAfterMainEvent(fest("frostday"))).toBe(true);
    expect(endsAfterMainEvent(hat)).toBe(false);
  });

  it("puts the rival at the festival, standing", () => {
    expect(
      festivalWhere(v("linnet"), fest("seedswap-fair"), 13 * 60),
    ).toMatchObject({ state: "standing", map: "forest" });
    expect(festivalWhere(v("rushie"), fest("frostday"), 13 * 60)).toMatchObject(
      {
        state: "standing",
        map: "forest",
      },
    );
  });

  it("uses the hall layout for the feast when the hall is restored", () => {
    const f = fest("midwinter-feast");
    expect(festivalWhere(v("cuthbert"), f, 13 * 60)).toMatchObject({
      map: "hearthwell",
      x: 78,
      y: 56,
    });
    expect(
      festivalWhere(v("cuthbert"), f, 13 * 60, { hallRestored: true }),
    ).toMatchObject({ map: "hall", x: 30, y: 11 });
  });
});

describe("the Hat Parade march", () => {
  const hat = fest("hat-parade");
  const t = (h: number, m = 0) => h * 60 + m;

  it("lines up Cuthbert, the four children and the other 17, all of whom go", () => {
    expect(PARADE_LINE).toHaveLength(22);
    expect(PARADE_LINE.slice(0, 5)).toEqual([
      "cuthbert",
      "fitch",
      "wren",
      "pim",
      "toby",
    ]);
    expect(new Set(PARADE_LINE)).toEqual(
      new Set(attendees(festivalLayout(hat)!)),
    );
    expect(PARADE_TAIL).toBe(22);
  });

  it("stands everyone at their spot before 14:00 minus the walk, and after the march", () => {
    const stand = festivalLayout(hat)!.spots.hattie!;
    expect(festivalWhere(v("hattie"), hat, t(12))).toMatchObject({
      x: stand[0],
      y: stand[1],
      state: "standing",
    });
    expect(festivalWhere(v("hattie"), hat, t(17))).toMatchObject({
      x: stand[0],
      y: stand[1],
      state: "standing",
    });
  });

  it("marches the head out the street lane, to the turn and back along the other lane", () => {
    const head = (m: number) => festivalWhere(v("cuthbert"), hat, m)!;
    expect(head(PARADE_START)).toMatchObject({
      x: PARADE_PATH[0]![0],
      y: PARADE_PATH[0]![1],
      state: "marching",
    });
    const turn = PARADE_START + 16 * MARCH_MIN_PER_TILE;
    expect(head(turn)).toMatchObject({ x: 48, y: 61 });
    expect(head(turn + 2 * MARCH_MIN_PER_TILE)).toMatchObject({ x: 48, y: 63 });
    for (let m = PARADE_START; m < PARADE_START + 34; m++) {
      const p = head(m);
      expect([61, 62, 63]).toContain(p.y);
      expect(p.x).toBeGreaterThanOrEqual(48);
    }
  });

  it("keeps the march inside 14:00 to 15:00 for everyone", () => {
    for (const id of PARADE_LINE) {
      const i = PARADE_LINE.indexOf(id);
      const steps = paradeSteps(
        festivalLayout(hat)!.spots[id]!,
        i,
        PARADE_START,
      );
      expect(steps[steps.length - 1]!.t, id).toBeLessThanOrEqual(t(15) + 30);
      expect(steps[0]!.t, id).toBeGreaterThan(t(13, 0));
    }
  });

  it("keeps the marchers on lanes y 61 to 63, never the rows y 60 and 64 the players use", () => {
    const stands = festivalLayout(hat)!.spots;
    for (const id of PARADE_LINE) {
      const i = PARADE_LINE.indexOf(id);
      const steps = paradeSteps(stands[id]!, i, PARADE_START);
      for (const s of steps.slice(1, 5)) expect([61, 63]).toContain(s.p[1]);
    }
  });

  it("does one lap normally and one extra lap for a late joiner, who walks at the tail", () => {
    expect(paradeLaps()).toEqual([PARADE_START]);
    expect(paradeLaps(PARADE_START)).toEqual([PARADE_START]);
    const late = paradeLaps(t(16));
    expect(late).toHaveLength(2);
    expect(late[1]).toBe(t(16));
    // Joined mid-march: the extra lap waits for the first to finish.
    const mid = paradeLaps(PARADE_START + 20);
    expect(mid[1]).toBeGreaterThan(PARADE_START + 20);
    // At 16:20 the head is marching again, because the player joined late.
    const where = festivalWhere(v("cuthbert"), hat, t(16, 2), {
      paradeJoinedAt: t(16),
    })!;
    expect(where.state).toBe("marching");
    const none = festivalWhere(v("cuthbert"), hat, t(16, 2))!;
    expect(none.state).toBe("standing");
    expect(PARADE_TAIL).toBe(PARADE_LINE.length);
  });
});
