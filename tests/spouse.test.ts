import { describe, expect, it } from "vitest";
import {
  deserialize,
  newGame,
  serialize,
  type GameState,
} from "../src/core/save";
import { HEART } from "../src/core/friendship";
import {
  LINES,
  MAX_EVENT_HEARTS,
  conditionsMet,
  presenceOverlaps,
  validateEvents,
  type HeartEvent,
} from "../src/core/heartevents";
import { SPOUSE_PERK_HEARTS } from "../src/core/marriage";
import { weddingMark } from "../src/core/courtship";
import { questLines } from "../src/core/journal";
import { ELDERFRUIT } from "../src/core/items";
import { SOURCE_FLAGS } from "../src/core/elderfruit";
import { MAX_ENERGY } from "../src/core/energy";
import { festivalDayToday } from "../src/core/festivals";
import { reportLines } from "../src/core/report";
import { buyAnimal } from "../src/core/animals";
import { sleep } from "../src/core/sleep";
import {
  KISS_ENERGY,
  PROPS_MARK,
  PROPS_SIZE,
  SPOUSE_BED,
  WATER_MAX,
  WATER_MIN,
  jealousyLine,
  kiss,
  leaveGift,
  onSpouseRoute,
  propsOf,
  spouseLine,
  spouseMorning,
  spousePlan,
  spouseVillager,
  stayHomeReason,
  waterNearHouse,
} from "../src/core/spouse";
import { meet, villagersOn } from "../src/core/townfolk";
import {
  IDLE_KEYS,
  VILLAGERS,
  dayContext,
  planDay,
  resolvePlace,
  villagerById,
  whereAt,
} from "../src/core/villagers";
import { maps } from "../src/content/maps";
import { hasFlag } from "../src/core/worldflags";

const CANDIDATES = VILLAGERS.filter((v) => v.candidate);
const at = (h: number, m = 0) => h * 60 + m;

/** A day number that is a plain dry Monday-ish day in spring, not a festival or closed day for anyone. */
const DAY = (() => {
  for (let d = 2; d < 28; d++) {
    const c = dayContext(d, "sunny");
    if (festivalDayToday(d) || c.weekday === "Wed" || c.weekday === "Fri")
      continue;
    return d;
  }
  throw new Error("no day");
})();

/** Married to `id` since `wedding`, at `hearts`. */
function married(id = "bramwell", hearts = 10, wedding = 1): GameState {
  const g = newGame();
  g.friendship.meet(id);
  g.friendship.setSpouse(id);
  g.friendship.award(id, hearts * HEART);
  g.friendship.giveBouquet(id);
  g.marriage.court(id, 99999);
  g.marriage.engage(id, 99999, wedding - 3);
  g.marriage.marry(wedding);
  g.day.clock.day = DAY;
  return g;
}

describe("the spouse route", () => {
  it("starts and ends at the farm for all 14 candidates, on every kind of day", () => {
    for (const v of CANDIDATES)
      for (const weather of ["sunny", "rainy", "snowy"] as const)
        for (const day of [DAY, DAY + 1, DAY + 2, 60, 90]) {
          const p = spousePlan(v, day, weather);
          expect(p.stops[0]!.place, v.id).toBe(SPOUSE_BED);
          expect(p.stops[0]!.time).toBe(at(6));
          for (let i = 1; i < p.stops.length; i++)
            expect(p.stops[i]!.time).toBeGreaterThanOrEqual(
              p.stops[i - 1]!.time,
            );
          for (const s of p.stops) {
            expect(resolvePlace(s.place), `${v.id} ${s.place}`).toBeDefined();
            if (s.idle) expect(IDLE_KEYS).toContain(s.idle);
          }
          const last = p.stops[p.stops.length - 1]!;
          expect(
            last.place.startsWith("farm:"),
            `${v.id} ends at the farm`,
          ).toBe(true);
          expect(p.bed).toBe(at(22));
        }
  });

  it("keeps the person's work stops from the first work stop to 17:00 and drops the old home", () => {
    const v = villagerById("bramwell")!;
    const old = planDay(v, dayContext(DAY, "sunny")).stops.filter(
      (s) => s.time > at(9) && s.time < at(17) && !s.place.endsWith("/home"),
    );
    const plan = spousePlan(v, DAY, "sunny");
    expect(plan.stayedHome).toBe("");
    for (const s of old)
      expect(
        plan.stops.some((x) => x.place === s.place),
        s.place,
      ).toBe(true);
    expect(plan.stops.some((s) => s.place === "hw:smithy/home")).toBe(false);
    // Leaves early enough: in transit before the first work stop, on the road.
    const first = plan.stops.findIndex((s) => s.place.startsWith("hw:"));
    expect(plan.stops[first - 1]!.place).toBe("road:hw");
    expect(plan.stops[first - 1]!.time).toBeLessThan(plan.stops[first]!.time);
  });

  it("leaves earlier for a far workplace", () => {
    const near = spousePlan(villagerById("alder")!, DAY, "sunny");
    const far = spousePlan(villagerById("marl")!, DAY, "sunny");
    const leave = (p: ReturnType<typeof spousePlan>) =>
      p.stops.find((s) => s.place.startsWith("road:"))!.time;
    const firstWork = (p: ReturnType<typeof spousePlan>) =>
      p.stops.find(
        (s) => !s.place.startsWith("farm") && !s.place.startsWith("road"),
      )!.time;
    expect(firstWork(far) - leave(far)).toBeGreaterThan(
      firstWork(near) - leave(near),
    );
  });

  it("stays at the farm in rain, on a festival and on the shop's closed day", () => {
    const v = villagerById("bramwell")!;
    const rain = spousePlan(v, DAY, "rainy");
    expect(rain.stayedHome).toBe("rain");
    expect(rain.stops.every((s) => s.place.startsWith("farm:"))).toBe(true);
    const wed = [...Array(28).keys()]
      .map((i) => i + 1)
      .find(
        (d) => dayContext(d, "sunny").weekday === "Wed" && !festivalDayToday(d),
      )!;
    const odette = villagerById("odette")!;
    expect(stayHomeReason(odette, wed, "sunny")).toBe("closed");
    const fest = [...Array(112).keys()]
      .map((i) => i + 1)
      .find((d) => festivalDayToday(d))!;
    expect(stayHomeReason(v, fest, "sunny")).toBe("festival");
  });

  it("spends fair evenings at the corner and wet or winter evenings in the room", () => {
    const v = villagerById("bramwell")!;
    const evening = (day: number, w: "sunny" | "rainy" | "snowy") =>
      whereAt(spouseVillager(v, day, w), dayContext(day, w), at(19)).place;
    expect(evening(DAY, "sunny")).toBe("farm:corner");
    expect(evening(DAY, "rainy")).toBe("farm:house/spouse-room");
    expect(evening(DAY + 28 * 3, "snowy")).toBe("farm:house/spouse-room");
    // Asleep in the farm bed after 22:00.
    const w = whereAt(
      spouseVillager(v, DAY, "sunny"),
      dayContext(DAY, "sunny"),
      at(23),
    );
    expect(w.asleep).toBe(true);
    expect(w.place).toBe(SPOUSE_BED);
    expect(w.where.map).toBe("house");
  });

  it("applies from the wedding day, once married", () => {
    const g = married("bramwell", 10, 5);
    expect(onSpouseRoute(g, "bramwell", 4)).toBe(false);
    expect(onSpouseRoute(g, "bramwell", 5)).toBe(true);
    expect(onSpouseRoute(g, "bramwell", 6)).toBe(true);
    const engaged = newGame();
    engaged.marriage.stage = "engaged";
    engaged.marriage.spouse = "bramwell";
    engaged.marriage.weddingDay = 5;
    expect(onSpouseRoute(engaged, "bramwell", 5)).toBe(false);
    // The wedding day is a day off from chores.
    const w = married("bramwell", 10, 5);
    w.day.clock.day = 5;
    expect(spouseMorning(w, () => 0)).toBeUndefined();
    expect(onSpouseRoute(g, "aurelle", 6)).toBe(false);
    expect(onSpouseRoute(newGame(), "bramwell", 6)).toBe(false);
  });

  it("puts the spouse in the farmhouse in the morning and in the village by day", () => {
    const g = married("bramwell", 10, 1);
    g.weather = "sunny";
    const day = DAY;
    const names = (map: string, t: number) =>
      villagersOn(g, map, day, t).map((p) => p.id);
    expect(names("house", at(6, 10))).toContain("bramwell");
    expect(names("farm", at(6, 40))).toContain("bramwell");
    expect(names("hearthwell", at(7, 30))).not.toContain("bramwell");
    expect(names("hearthwell", at(12))).not.toContain("bramwell");
    expect(names("smithy", at(12))).toContain("bramwell");
    expect(names("farm", at(19))).toContain("bramwell");
    // The wedding day itself already follows the spouse route (after the ceremony).
    expect(villagersOn(g, "house", 1, at(6, 10)).map((p) => p.id)).toContain(
      "bramwell",
    );
    // The day before the wedding does not.
    expect(
      villagersOn(g, "house", 0, at(6, 10)).map((p) => p.id),
    ).not.toContain("bramwell");
  });
});

describe("chores", () => {
  const crops = (g: GameState, n: number) => {
    for (let i = 0; i < n; i++) {
      g.farm.till(60 + (i % 10), 14 + Math.floor(i / 10));
      g.farm.plant(60 + (i % 10), 14 + Math.floor(i / 10), "parsnip", "spring");
    }
  };
  const wet = (g: GameState) =>
    [...g.farm.each()].filter((t) => t.plot.wateredToday).length;

  it("waters four to six crop tiles near the house in a growing season", () => {
    for (const roll of [0, 0.5, 0.99]) {
      const g = married();
      g.weather = "sunny";
      g.day.clock.day = 3;
      crops(g, 20);
      const n = waterNearHouse(g, () => roll);
      expect(n).toBeGreaterThanOrEqual(WATER_MIN);
      expect(n).toBeLessThanOrEqual(WATER_MAX);
      expect(wet(g)).toBe(n);
    }
  });

  it("waters the nearest first and ignores far crops", () => {
    const g = married();
    g.weather = "sunny";
    g.day.clock.day = 3;
    g.farm.till(62, 14);
    g.farm.plant(62, 14, "parsnip", "spring");
    g.farm.till(5, 60);
    g.farm.plant(5, 60, "parsnip", "spring");
    expect(waterNearHouse(g, () => 0)).toBe(1);
    expect(g.farm.plotAt(62, 14)!.wateredToday).toBe(true);
    expect(g.farm.plotAt(5, 60)!.wateredToday).toBe(false);
  });

  it("does nothing in winter or rain, and leaves empty soil alone", () => {
    const g = married();
    g.weather = "sunny";
    g.day.clock.day = 3;
    crops(g, 8);
    g.farm.till(70, 20);
    g.weather = "rainy";
    expect(waterNearHouse(g, () => 0)).toBe(0);
    g.weather = "sunny";
    g.day.clock.day = 28 * 3 + 2;
    expect(waterNearHouse(g, () => 0)).toBe(0);
    g.day.clock.day = 3;
    waterNearHouse(g, () => 0);
    expect(g.farm.plotAt(70, 20)!.wateredToday).toBe(false);
  });

  it("feeds hay from the silo only, never the pack", () => {
    const g = married("bramwell", 10, 1);
    g.weather = "sunny";
    g.animals.coopBuilt = true;
    g.animals.silo = true;
    g.money = 10000;
    for (let i = 0; i < 3; i++) buyAnimal(g, "chicken", `hen${i}`);
    g.animals.hay = 2;
    g.inventory.add("hay", 5);
    const news = spouseMorning(g, () => 0)!;
    expect(news.fed).toBe(2);
    expect(news.short).toBe(1);
    expect(g.inventory.count("hay")).toBe(5);
    expect(g.animals.hay).toBe(0);
  });

  it("starts the morning after the wedding, and not for an unmarried player", () => {
    const g = married("bramwell", 10, DAY);
    expect(spouseMorning(g, () => 0)).toBeUndefined();
    g.day.clock.day = DAY + 1;
    expect(spouseMorning(g, () => 0)).toBeDefined();
    expect(spouseMorning(newGame(), () => 0)).toBeUndefined();
  });

  it("runs from sleep() and reaches the morning report", () => {
    const g = married("bramwell", 10, DAY - 1);
    g.farm.till(62, 14);
    g.farm.plant(62, 14, "parsnip", "spring");
    const r = sleep(g, [], () => 0.99);
    expect(r.spouse?.name).toBe("Bramwell");
    expect(reportLines(r).join("\n")).toMatch(/Bramwell/);
    expect(sleep(newGame(), [], () => 0.99).spouse).toBeUndefined();
  });
});

describe("the kiss and the lines", () => {
  it("restores energy once a day, only the first kiss", () => {
    const g = married();
    g.day.energy.current = 100;
    expect(kiss(g, "bramwell")).toBe(KISS_ENERGY);
    expect(g.day.energy.current).toBe(100 + KISS_ENERGY);
    expect(kiss(g, "bramwell")).toBeUndefined();
    expect(g.day.energy.current).toBe(100 + KISS_ENERGY);
    g.day.clock.day += 1;
    expect(kiss(g, "bramwell")).toBe(KISS_ENERGY);
    g.day.energy.current = MAX_ENERGY - 5;
    g.day.clock.day += 1;
    expect(kiss(g, "bramwell")).toBe(5);
  });

  it("is only for the spouse", () => {
    const g = married();
    expect(kiss(g, "aurelle")).toBeUndefined();
    expect(kiss(newGame(), "bramwell")).toBeUndefined();
  });

  it("comes from talking to the spouse, with a heart effect flag and a line", () => {
    const g = married();
    g.day.energy.current = 50;
    const a = meet(g, "bramwell", undefined);
    expect(a.kiss).toBe(true);
    expect(a.message).toMatch(/Bramwell/);
    expect(g.day.energy.current).toBe(50 + KISS_ENERGY);
    const b = meet(g, "bramwell", undefined);
    expect(b.kiss).toBeUndefined();
    expect(g.day.energy.current).toBe(50 + KISS_ENERGY);
  });

  it("picks a daily line by heart level", () => {
    const low = married("bramwell", 3);
    const high = married("bramwell", 13);
    const seen = (g: GameState) =>
      new Set([0, 1, 2, 3, 4, 5].map((d) => spouseLine(g, "bramwell", d)));
    expect(seen(low).size).toBeGreaterThan(1);
    for (const l of seen(low)) expect(seen(high)).not.toContain(l);
    expect([...seen(low)][0]).toContain("Bramwell");
  });

  it("saves the kiss day", () => {
    const g = married();
    kiss(g, "bramwell");
    const back = deserialize(serialize(g))!;
    expect(back.marriage.kissDay).toBe(g.day.clock.day);
    expect(kiss(back, "bramwell")).toBeUndefined();
  });
});

describe("spouse gifts", () => {
  it("take no weekly limit and gain and lose half", () => {
    const g = married("bramwell", 10);
    const f = g.friendship;
    const before = f.points("bramwell");
    const r = f.gift("bramwell", "pearl-lobster", 20);
    expect(r.ok && r.points).toBe(40);
    for (let d = 21; d < 24; d++) {
      const bad = f.gift("bramwell", "copper-ore", d);
      expect(bad.ok && bad.points).toBe(-20);
    }
    expect(f.points("bramwell")).toBeLessThan(before);
    const other = newGame();
    other.friendship.meet("aurelle");
    other.friendship.gift("aurelle", "stone", 1);
    other.friendship.gift("aurelle", "stone", 2);
    expect(other.friendship.canGift("aurelle", 3)).toBe(false);
  });
});

describe("jealousy", () => {
  it("is one line when a non-hated gift goes to another candidate with a bouquet", () => {
    const g = married("bramwell", 10);
    g.friendship.meet("aurelle");
    g.friendship.award("aurelle", 8 * HEART);
    expect(jealousyLine(g, "aurelle", "love")).toBe("");
    g.friendship.giveBouquet("aurelle");
    const before = g.friendship.points("bramwell");
    expect(jealousyLine(g, "aurelle", "love")).toMatch(/Bramwell/);
    expect(jealousyLine(g, "aurelle", "hate")).toBe("");
    expect(jealousyLine(g, "bramwell", "love")).toBe("");
    expect(g.friendship.points("bramwell")).toBe(before);
  });

  it("shows in the gift message and never for an unmarried player", () => {
    const g = married("bramwell", 10);
    g.friendship.meet("aurelle");
    g.friendship.award("aurelle", 8 * HEART);
    g.friendship.giveBouquet("aurelle");
    g.inventory.add("pearl-lobster");
    const r = meet(g, "aurelle", "pearl-lobster");
    expect(r.consumed).toBe("pearl-lobster");
    expect(r.message).toMatch(/wistful/);
    const single = newGame();
    single.friendship.meet("aurelle");
    single.friendship.award("aurelle", 8 * HEART);
    single.friendship.giveBouquet("aurelle");
    single.inventory.add("pearl-lobster");
    expect(meet(single, "aurelle", "pearl-lobster").message).not.toMatch(
      /wistful/,
    );
  });
});

describe("the 12.5 heart gift", () => {
  it("is one elderfruit per save, eaten on receipt, left at wake-up", () => {
    const g = married("bramwell", SPOUSE_PERK_HEARTS - 0.1, 1);
    expect(leaveGift(g)).toBe(false);
    g.friendship.award("bramwell", 0.1 * HEART + 1);
    expect(g.friendship.points("bramwell")).toBeGreaterThanOrEqual(
      SPOUSE_PERK_HEARTS * HEART,
    );
    expect(g.elderfruit).toBe(0);
    expect(leaveGift(g)).toBe(true);
    expect(g.elderfruit).toBe(1);
    expect(g.day.energy.max).toBe(MAX_ENERGY + 34);
    expect(hasFlag(g, SOURCE_FLAGS.spouse)).toBe(true);
    expect(leaveGift(g)).toBe(false);
    expect(g.elderfruit).toBe(1);
  });

  it("waits a day when the pack is full", () => {
    const g = married("bramwell", 13, 1);
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk-${i}`);
    const full = g.inventory.room(ELDERFRUIT) < 1;
    if (full) expect(leaveGift(g)).toBe(false);
    expect(hasFlag(g, SOURCE_FLAGS.spouse)).toBe(!full);
  });
});

describe("spouse events (11 to 14 hearts)", () => {
  const ev = (hearts: number, villager = "bramwell"): HeartEvent => ({
    id: `spouse-test-${hearts}`,
    villager,
    place: "farm:house",
    hearts,
    window: { from: "18:00", until: "21:00" },
    scene: [
      { cmd: "say", who: villager, line: Object.keys(LINES)[0]! },
      { cmd: "end" },
    ],
  });

  it("accepts up to 14 hearts and rejects more or a non-candidate", () => {
    expect(MAX_EVENT_HEARTS).toBe(14);
    const mine = (d: HeartEvent[]) =>
      validateEvents(d).filter((m) => m.startsWith("spouse-test"));
    expect(mine([ev(11), ev(14)])).toEqual([]);
    expect(mine([ev(15)]).join()).toMatch(/1 to 14/);
    expect(mine([ev(11, "odette")]).join()).toMatch(/candidate/);
  });

  it("reads the presence window on the spouse route", () => {
    expect(presenceOverlaps(ev(12))).toBe(true);
    expect(
      presenceOverlaps({
        ...ev(12),
        window: { from: "6:30", until: "7:20" },
        conditions: { weather: ["sunny"] },
      }),
    ).toBe(false);
  });

  it("starts only for the married person at those hearts", () => {
    const ctx = { day: DAY, weather: "sunny" } as const;
    const e = ev(12);
    const g = married("bramwell", 12);
    expect(conditionsMet(g, e, ctx)).toBe(true);
    const other = newGame();
    other.friendship.meet("bramwell");
    other.friendship.award("bramwell", 10 * HEART);
    expect(conditionsMet(other, ev(11), ctx)).toBe(false);
    const wrong = married("aurelle", 12);
    expect(conditionsMet(wrong, e, ctx)).toBe(false);
  });
});

describe("the spouse room and the wedding mark", () => {
  it("has a 4 by 4 prop block for every candidate, from data", () => {
    for (const v of CANDIDATES) {
      const props = propsOf(v.id);
      expect(props.length, v.id).toBeGreaterThan(0);
      for (const p of props) {
        expect(p.dx).toBeGreaterThanOrEqual(0);
        expect(p.dy).toBeGreaterThanOrEqual(0);
        expect(p.dx + p.w).toBeLessThanOrEqual(PROPS_SIZE);
        expect(p.dy + p.h).toBeLessThanOrEqual(PROPS_SIZE);
      }
    }
    expect(propsOf("nobody").length).toBeGreaterThan(0);
  });

  it("places the block with a mark in the spouse room, only while married", () => {
    const withSpouse = maps.marksWith("house", new Set(["spouse"]), 1).marks;
    const m = withSpouse.find((x) => x.name === PROPS_MARK)!;
    expect(m).toBeDefined();
    const room = withSpouse.find((x) => x.name === "spouse-room-idle")!;
    expect(m.x + PROPS_SIZE - 1).toBeGreaterThanOrEqual(room.x);
    expect(
      maps
        .marksWith("house", new Set(), 1)
        .marks.some((x) => x.name === PROPS_MARK),
    ).toBe(false);
  });

  it("marks the wedding day in the journal while engaged", () => {
    const g = newGame();
    g.friendship.meet("bramwell");
    g.friendship.award("bramwell", 10 * HEART);
    g.marriage.court("bramwell", 99999);
    expect(weddingMark(g)).toBe("");
    g.marriage.engage("bramwell", 99999, g.day.clock.day);
    expect(weddingMark(g)).toMatch(/Bramwell.*in 3 days/);
    expect(questLines(g)[0]).toMatch(/Wedding/);
  });

  it("keeps a married-since line in the journal after the wedding", () => {
    const g = newGame();
    g.friendship.meet("bramwell");
    g.friendship.award("bramwell", 10 * HEART);
    g.marriage.court("bramwell", 99999);
    g.marriage.engage("bramwell", 99999, g.day.clock.day);
    g.day.clock.day += 3;
    expect(g.marriage.marry(g.day.clock.day)).toBe(true);
    expect(weddingMark(g)).toMatch(/Married to Bramwell since .* year 1\./);
    expect(questLines(g)[0]).toMatch(/Married to/);
  });
});

describe("a wedding put off by a festival or rain", () => {
  it("records the day and the reason, and clears them on an end", () => {
    const g = newGame();
    g.marriage.court("bramwell", 99999);
    g.marriage.engage("bramwell", 99999, 5);
    expect(g.marriage.postpone(8, "rain")).toBe(true);
    expect(g.marriage.weddingDay).toBe(9);
    expect(g.marriage.putOffWhy).toBe("rain");
    const copy = newGame();
    copy.marriage.load(JSON.parse(JSON.stringify(g.marriage.save())));
    expect([copy.marriage.putOffDay, copy.marriage.putOffWhy]).toEqual([
      8,
      "rain",
    ]);
    g.marriage.end();
    expect(g.marriage.putOffDay).toBe(0);
  });
});
