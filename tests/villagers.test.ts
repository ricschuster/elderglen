import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import { FESTIVALS } from "../src/core/festivals";
import { mapFiles } from "../src/content/maps";
import data from "../src/content/villagers.json";
import {
  IDLE_KEYS,
  SHOPS,
  VILLAGERS,
  areaAt,
  dayContext,
  parseStop,
  parseTime,
  planDay,
  resolvePlace,
  shopState,
  splitPlace,
  villagerById,
  whereAt,
  type DayContext,
  type Stop,
} from "../src/core/villagers";

const v = (id: string) => villagerById(id)!;
const ctx = (
  weekday: DayContext["weekday"],
  weather: DayContext["weather"] = "sunny",
  season: DayContext["season"] = "spring",
): DayContext => ({ season, weekday, weather });
const at = (h: number, m = 0) => h * 60 + m;

const allStops = (x: (typeof VILLAGERS)[number]): Stop[] => [
  ...x.route,
  ...x.rain,
  ...x.weekday.flatMap((o) => o.stops),
  ...x.season.flatMap((o) => o.stops),
];

describe("villager data", () => {
  it("has 30 unique ids and names", () => {
    expect(VILLAGERS).toHaveLength(30);
    expect(new Set(VILLAGERS.map((x) => x.id)).size).toBe(30);
    expect(new Set(VILLAGERS.map((x) => x.name)).size).toBe(30);
  });

  it("has valid, unique birthdays that dodge festivals, day 1 and Spring 5", () => {
    const keys = VILLAGERS.map((x) => `${x.birthday.season}${x.birthday.day}`);
    expect(new Set(keys).size).toBe(30);
    for (const x of VILLAGERS) {
      expect(SEASONS).toContain(x.birthday.season);
      expect(x.birthday.day).toBeGreaterThanOrEqual(2);
      expect(x.birthday.day).toBeLessThanOrEqual(DAYS_PER_SEASON);
      expect(
        FESTIVALS.some(
          (f) => f.season === x.birthday.season && f.day === x.birthday.day,
        ),
      ).toBe(false);
      expect(`${x.birthday.season}${x.birthday.day}`).not.toBe("spring5");
    }
  });

  it("splits birthdays 8, 8, 7, 7 over the seasons (note 61)", () => {
    const n = (s: string) =>
      VILLAGERS.filter((x) => x.birthday.season === s).length;
    expect([n("spring"), n("summer"), n("fall"), n("winter")]).toEqual([
      8, 8, 7, 7,
    ]);
  });

  it("keeps the story people in different seasons (note 61)", () => {
    const s = (id: string) => v(id).birthday.season;
    expect(new Set([s("rundahl"), s("aldreth"), s("rosmarin")]).size).toBe(3);
  });

  it("references only known places, spots and idle keys", () => {
    for (const x of VILLAGERS) {
      expect(resolvePlace(x.home), `${x.id} home`).toBeDefined();
      for (const s of allStops(x)) {
        expect(resolvePlace(s.place), `${x.id} ${s.place}`).toBeDefined();
        if (s.idle) expect(IDLE_KEYS, `${x.id} ${s.idle}`).toContain(s.idle);
      }
    }
  });

  it("points places at map files that exist", () => {
    for (const area of Object.values(data.areas))
      if (area.map) expect(mapFiles[area.map]).toBeDefined();
    for (const p of Object.values(data.places)) {
      const interior = (p as { interior?: string }).interior;
      if (interior) expect(mapFiles[interior]).toBeDefined();
    }
  });

  it("keeps routes in time order, with home as the first spot", () => {
    for (const x of VILLAGERS) {
      for (const r of [x.route, x.rain]) {
        for (let i = 1; i < r.length; i++)
          expect(r[i]!.time, x.id).toBeGreaterThanOrEqual(r[i - 1]!.time);
      }
      for (const o of [...x.weekday, ...x.season]) {
        expect(o.until).toBeGreaterThan(o.from);
        for (const s of o.stops) {
          expect(s.time, x.id).toBeGreaterThanOrEqual(o.from);
          expect(s.time, x.id).toBeLessThan(o.until + 1);
        }
      }
      expect(x.route[0]!.time, x.id).toBeLessThan(x.bed);
    }
  });

  it("gives every shop a known keeper and every shop keeper a shop", () => {
    for (const s of SHOPS) expect(villagerById(s.keeper), s.id).toBeDefined();
    for (const x of VILLAGERS) {
      if (x.shop) expect(SHOPS.find((s) => s.id === x.shop)?.keeper).toBe(x.id);
    }
    expect(SHOPS).toHaveLength(13);
  });

  it("sends the six area residents to town on one weekday each, never the loners", () => {
    const trips = VILLAGERS.filter((x) =>
      x.weekday.some((o) => o.stops.some((s) => s.place.startsWith("road:"))),
    );
    expect(trips.map((x) => x.id).sort()).toEqual(
      ["dilly", "korvi", "maren", "marl", "rushie", "thalwen"].sort(),
    );
    for (const id of ["rosmarin", "rundahl"]) expect(v(id).weekday).toEqual([]);
  });

  it("closes no weekday with more than two Hearthwell shops", () => {
    const count: Record<string, number> = {};
    for (const s of SHOPS) {
      const hw = !["farmstead", "delta-fisher"].includes(s.id) && s.closedDay;
      if (hw) count[s.closedDay!] = (count[s.closedDay!] ?? 0) + 1;
    }
    for (const n of Object.values(count)) expect(n).toBeLessThanOrEqual(2);
  });
});

describe("parsing", () => {
  it("reads times and stops", () => {
    expect(parseTime("24:30")).toBe(1470);
    expect(parseStop("8:50 hw:store/counter (serve)")).toEqual({
      time: 530,
      place: "hw:store/counter",
      idle: "serve",
    });
    expect(parseStop("5:30 delta:hut/home")).toEqual({
      time: 330,
      place: "delta:hut/home",
    });
    expect(() => parseStop("nonsense")).toThrow();
    expect(splitPlace("hw:inn")).toEqual({ base: "hw:inn" });
  });

  it("derives the weekday from the day number", () => {
    expect(dayContext(1, "sunny").weekday).toBe("Mon");
    expect(dayContext(8, "sunny").weekday).toBe("Mon");
    expect(dayContext(7, "sunny").weekday).toBe("Sun");
    expect(dayContext(29, "rainy")).toMatchObject({
      season: "summer",
      weekday: "Mon",
    });
  });
});

describe("schedule engine", () => {
  it("follows the default route (Odette, spring Monday)", () => {
    const c = ctx("Mon");
    expect(whereAt(v("odette"), c, at(7)).place).toBe("hw:store/home");
    expect(whereAt(v("odette"), c, at(9))).toMatchObject({
      place: "hw:store/counter",
      idle: "serve",
    });
    expect(whereAt(v("odette"), c, at(18)).place).toBe("hw:inn");
    expect(whereAt(v("odette"), c, at(22, 29)).place).toBe("hw:store/home");
  });

  it("puts people at home before the first stop and asleep from bedtime", () => {
    const c = ctx("Mon");
    const early = whereAt(v("odette"), c, at(6));
    expect(early).toMatchObject({ place: "hw:store/home", asleep: false });
    expect(early.next?.time).toBe(at(7));
    const late = whereAt(v("odette"), c, at(22, 30));
    expect(late).toMatchObject({ place: "hw:store/home", asleep: true });
    expect(whereAt(v("fitch"), c, at(20))).toMatchObject({ asleep: true });
  });

  it("tells the walker where to go next", () => {
    const w = whereAt(v("odette"), ctx("Mon"), at(10));
    expect(w.next).toMatchObject({ place: "hw:store/home" });
    expect(whereAt(v("odette"), ctx("Mon"), at(23)).next).toBeUndefined();
  });

  it("uses the rain route in rain and storms, but not in snow", () => {
    expect(planDay(v("fitch"), ctx("Mon", "rainy")).layer).toBe("rain");
    expect(planDay(v("fitch"), ctx("Mon", "stormy")).layer).toBe("rain");
    expect(whereAt(v("fitch"), ctx("Mon", "rainy"), at(10)).place).toBe(
      "hw:store/home",
    );
    expect(whereAt(v("fitch"), ctx("Mon"), at(10)).place).toBe("hw:green");
    expect(planDay(v("fitch"), ctx("Mon", "snowy", "winter")).layer).not.toBe(
      "rain",
    );
  });

  it("lets rain win over a weekday override", () => {
    // Dilly goes to town on Tuesday, but not in the rain (note 80).
    const dry = whereAt(v("dilly"), ctx("Tue"), at(12, 30));
    expect(dry.place).toBe("hw:inn");
    const wet = whereAt(v("dilly"), ctx("Tue", "rainy"), at(12, 30));
    expect(wet.place).toBe("forest:farmstead/counter");
  });

  it("applies a weekday override and falls back to the default after it", () => {
    // Odette's Wednesday outing replaces counter hours, default from 17:00.
    const wed = ctx("Wed");
    expect(whereAt(v("odette"), wed, at(10)).place).toBe("hw:square");
    expect(whereAt(v("odette"), wed, at(12)).place).toBe("hw:river-path");
    expect(whereAt(v("odette"), wed, at(14)).place).toBe("hw:store/home");
    expect(whereAt(v("odette"), wed, at(17)).place).toBe("hw:store/home");
    expect(whereAt(v("odette"), wed, at(18)).place).toBe("hw:inn");
    // On a day with no override the person falls through to the default.
    expect(planDay(v("odette"), ctx("Tue")).layer).toBe("default");
    expect(whereAt(v("odette"), ctx("Tue"), at(10)).place).toBe(
      "hw:store/counter",
    );
  });

  it("keeps the stops outside an override window", () => {
    // Dorrie at the Wednesday market only for 9:30 to 11:30.
    const wed = ctx("Wed");
    expect(whereAt(v("dorrie"), wed, at(9)).place).toBe("hw:green");
    expect(whereAt(v("dorrie"), wed, at(10)).place).toBe("hw:square");
    expect(whereAt(v("dorrie"), wed, at(11, 45)).place).toBe(
      "hw:store/counter",
    );
    expect(whereAt(v("dorrie"), wed, at(14)).place).toBe("hw:square");
  });

  it("empties an area on a town trip day and brings the person home", () => {
    const tue = ctx("Tue");
    expect(whereAt(v("dilly"), tue, at(9, 45))).toMatchObject({
      place: "road:forest",
      where: { transit: true, map: null },
    });
    expect(areaAt(v("dilly"), tue, at(11))).toBe("hw");
    expect(areaAt(v("dilly"), tue, at(15, 45))).toBe("road");
    expect(whereAt(v("dilly"), tue, at(16, 45)).place).toBe("forest:paddock");
    expect(whereAt(v("dilly"), tue, at(19)).place).toBe(
      "forest:farmstead/home",
    );
    // Not on another weekday.
    expect(areaAt(v("dilly"), ctx("Wed"), at(11))).toBe("forest");
  });

  it("returns to the default stop in force once an override ends", () => {
    // Maren's Friday trip ends 18:30; she was sparring at 13:00 by default.
    expect(whereAt(v("maren"), ctx("Fri"), at(18, 45)).place).toBe(
      "mines:hall/dummy",
    );
    expect(whereAt(v("maren"), ctx("Fri"), at(19, 30)).place).toBe(
      "mines:hall/home",
    );
  });

  it("applies season overrides, then weekday overrides on top", () => {
    const winterSnow = ctx("Mon", "snowy", "winter");
    // Fitch plays at home in winter, on the green only on a snow day 13:00 to 15:00.
    expect(whereAt(v("fitch"), winterSnow, at(10)).place).toBe("hw:store/home");
    expect(whereAt(v("fitch"), winterSnow, at(13, 30)).place).toBe("hw:green");
    expect(whereAt(v("fitch"), winterSnow, at(15, 30)).place).toBe(
      "hw:store/home",
    );
    const winterSun = ctx("Mon", "sunny", "winter");
    expect(whereAt(v("fitch"), winterSun, at(13, 30)).place).toBe(
      "hw:store/home",
    );
    // A weekend override beats the season one.
    expect(planDay(v("fitch"), ctx("Sat", "sunny", "winter")).layer).toBe(
      "weekday",
    );
    // Summer bedtime moves.
    expect(planDay(v("fitch"), ctx("Mon", "sunny", "summer")).bed).toBe(
      at(20, 30),
    );
    expect(planDay(v("fitch"), ctx("Mon")).bed).toBe(at(20));
  });

  it("falls through to the default when a season has no entry", () => {
    const base = planDay(v("maren"), ctx("Mon"));
    for (const s of SEASONS)
      expect(planDay(v("maren"), ctx("Mon", "sunny", s)).stops).toEqual(
        base.stops,
      );
  });

  it("keeps Rundahl at the camp, with no door to lock", () => {
    expect(v("rundahl").home).toBe("forest:camp");
    expect(whereAt(v("rundahl"), ctx("Mon"), at(23)).place).toBe("forest:camp");
    expect(
      whereAt(v("rundahl"), ctx("Mon", "snowy", "winter"), at(12)).idle,
    ).toBe("tent");
  });

  it("resolves places to maps and tiles, marking stand-ins", () => {
    expect(resolvePlace("hw:store")).toMatchObject({
      map: "hearthwell",
      x: 22,
      y: 24,
      placeholder: false,
      indoors: false,
    });
    expect(resolvePlace("hw:store/counter")).toMatchObject({
      map: "general-store",
      indoors: true,
      placeholder: true,
    });
    expect(resolvePlace("hw:inn")).toMatchObject({
      map: "inn",
      indoors: true,
    });
    expect(resolvePlace("hw:square")?.placeholder).toBe(true);
    expect(resolvePlace("beach:dunes")?.map).toBeNull();
    expect(resolvePlace("nowhere:else")).toBeUndefined();
  });
});

describe("shop hours", () => {
  const shop = (id: string) => SHOPS.find((s) => s.id === id)!;
  it("separates counter hours from door hours", () => {
    const s = shop("store");
    expect(shopState(s, "Mon", "sunny", at(8))).toBe("closed");
    expect(shopState(s, "Mon", "sunny", at(9))).toBe("open");
    expect(shopState(s, "Mon", "sunny", at(16, 59))).toBe("open");
    expect(shopState(s, "Mon", "sunny", at(17))).toBe("door");
    expect(shopState(s, "Mon", "sunny", at(21))).toBe("closed");
  });

  it("shuts on the closed weekday, except rain-open shops in rain", () => {
    expect(shopState(shop("store"), "Wed", "sunny", at(10))).toBe("closed");
    expect(shopState(shop("store"), "Wed", "rainy", at(10))).toBe("closed");
    expect(shopState(shop("sawmill"), "Tue", "sunny", at(10))).toBe("closed");
    expect(shopState(shop("sawmill"), "Tue", "rainy", at(10))).toBe("open");
    expect(shopState(shop("sawmill"), "Tue", "snowy", at(10))).toBe("closed");
  });

  it("opens the store and smithy daily after the hall, and shuts all for festivals", () => {
    const opts = { hallDone: true };
    expect(shopState(shop("store"), "Wed", "sunny", at(10), opts)).toBe("open");
    expect(shopState(shop("smithy"), "Fri", "sunny", at(10), opts)).toBe(
      "open",
    );
    expect(shopState(shop("library"), "Mon", "sunny", at(11), opts)).toBe(
      "closed",
    );
    expect(
      shopState(shop("store"), "Mon", "sunny", at(12), { festival: true }),
    ).toBe("closed");
  });

  it("has no door beyond counter hours for the open-daily area stalls", () => {
    const forge = shop("forge");
    expect(shopState(forge, "Sun", "sunny", at(12))).toBe("open");
    expect(shopState(forge, "Sun", "sunny", at(20))).toBe("closed");
  });
});
