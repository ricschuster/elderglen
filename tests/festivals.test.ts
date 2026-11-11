import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS, dateOf } from "../src/core/calendar";
import {
  FESTIVALS,
  buyAtCounter,
  counterProblem,
  festivalOn,
  festivalAreaShut,
  festivalShutLine,
  festivalStepShut,
  festivalDayToday,
  festivalOpen,
  festivalPlace,
  festivalToday,
  enterFestival,
  enterProblem,
  leaveFestival,
  nextFestival,
} from "../src/core/festivals";
import { hatById } from "../src/core/hats";
import { itemById } from "../src/core/items";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { rollWeather } from "../src/core/weather";

const parade = FESTIVALS.find((f) => f.id === "hat-parade")!;
/** Game day for a season and day of the season, in year one. */
const dayOf = (season: (typeof SEASONS)[number], d: number) =>
  SEASONS.indexOf(season) * DAYS_PER_SEASON + d;

describe("festival data", () => {
  it("follows the calendar rules in 14_festival_calendar.md", () => {
    const keys = FESTIVALS.flatMap((f) =>
      Array.from(
        { length: (f.lastDay ?? f.day) - f.day + 1 },
        (_, i) => `${f.season}${f.day + i}`,
      ),
    );
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(FESTIVALS.map((f) => f.id)).size).toBe(FESTIVALS.length);
    for (const f of FESTIVALS) {
      expect(SEASONS, f.id).toContain(f.season);
      expect(f.day, f.id).toBeGreaterThan(1);
      // The last-week rule is relaxed for the two solstice festivals (note 14).
      if (!["lamplight-evening", "midwinter-feast"].includes(f.id))
        expect(f.lastDay ?? f.day, f.id).toBeLessThanOrEqual(
          DAYS_PER_SEASON - 7,
        );
      expect(f.lastDay ?? f.day, f.id).toBeLessThanOrEqual(DAYS_PER_SEASON);
      expect(f.place.zone.w, f.id).toBeGreaterThan(0);
      expect(f.opens, f.id).toBeLessThan(f.closes);
      expect(f.ends, f.id).toBeGreaterThanOrEqual(f.closes);
      for (const e of f.counter) {
        expect(e.price, f.id).toBeGreaterThan(0);
        expect(Boolean(e.item) !== Boolean(e.hat), f.id).toBe(true);
        if (e.item) expect(itemById(e.item), e.item).toBeDefined();
        if (e.hat) expect(hatById(e.hat), e.hat).toBeDefined();
      }
      if (f.gift) expect(hatById(f.gift.hat), f.id).toBeDefined();
    }
  });

  it("puts the hat parade on spring day 10", () => {
    expect(parade.season).toBe("spring");
    expect(parade.day).toBe(10);
  });
});

describe("lookup", () => {
  it("finds a festival by game day, in every year", () => {
    expect(festivalToday(dayOf("spring", 10))?.id).toBe("hat-parade");
    expect(festivalToday(dayOf("spring", 11))).toBeUndefined();
    const year2 = DAYS_PER_SEASON * SEASONS.length + 10;
    expect(festivalToday(year2)?.id).toBe("hat-parade");
    expect(festivalOn("summer", 10)).toBeUndefined();
    expect(festivalOn("spring", 21)?.id).toBe("seedswap-fair");
    expect(festivalOn("summer", 8)?.id).toBe("cake-day");
    expect(festivalOn("summer", 24)?.id).toBe("lamplight-evening");
    expect(festivalOn("summer", 20)).toBeUndefined();
  });

  it("finds the next festival, wrapping into the next year", () => {
    expect(nextFestival(1)?.day).toBe(10);
    expect(nextFestival(10)?.festival.id).toBe("seedswap-fair");
    const next = nextFestival(dayOf("winter", 25))!;
    expect(next.festival.id).toBe("hat-parade");
    expect(dateOf(next.day).year).toBe(2);
    expect(nextFestival(dayOf("summer", 24))?.festival.id).toBe(
      "harvest-showing",
    );
  });

  it("is open only between opening and closing", () => {
    expect(festivalOpen(parade, parade.opens - 1)).toBe(false);
    expect(festivalOpen(parade, parade.opens)).toBe(true);
    expect(festivalOpen(parade, parade.closes)).toBe(false);
  });
});

describe("weather", () => {
  it("is always sunny on a festival day", () => {
    expect(rollWeather("spring", parade.day, () => 0)).toBe("sunny");
  });

  it("forecasts a sunny festival the night before", () => {
    const g = newGame();
    g.day.clock.day = dayOf("spring", parade.day - 2);
    sleep(g, [], () => 0);
    expect(festivalToday(g.day.clock.day + 1)?.id).toBe("hat-parade");
    expect(g.tomorrow).toBe("sunny");
  });
});

describe("going", () => {
  const onParade = (minutes: number) => {
    const g = newGame();
    g.day.clock.day = dayOf("spring", parade.day);
    g.day.clock.minutes = minutes;
    return g;
  };

  it("needs a festival today", () => {
    expect(enterProblem(newGame())).toMatch(/no festival/);
  });

  it("waits for opening and ends at closing", () => {
    expect(enterProblem(onParade(parade.opens - 10))).toMatch(/not started/);
    expect(enterProblem(onParade(parade.closes))).toMatch(/over/);
  });

  it("stops time and costs no energy, and is remembered once a year", () => {
    const g = onParade(parade.opens);
    const energy = g.day.energy.current;
    expect(enterFestival(g)?.id).toBe("hat-parade");
    expect(g.day.clock.minutes).toBe(parade.opens);
    expect(g.day.energy.current).toBe(energy);
    expect(enterFestival(g)?.id).toBe("hat-parade");
    expect(g.festivalsJoined).toEqual(["hat-parade:1"]);
  });

  it("sets the clock to the festival's end on leaving, without ending the day", () => {
    const g = onParade(parade.opens);
    enterFestival(g);
    leaveFestival(g);
    expect(g.day.clock.minutes).toBe(parade.ends);
    expect(g.day.clock.day).toBe(dayOf("spring", parade.day));
    expect(g.day.over).toBe(false);
  });

  it("is remembered separately each year", () => {
    const g = onParade(parade.opens);
    enterFestival(g);
    g.day.clock.day += DAYS_PER_SEASON * SEASONS.length;
    enterFestival(g);
    expect(g.festivalsJoined).toEqual(["hat-parade:1", "hat-parade:2"]);
  });
});

describe("save", () => {
  it("remembers joined festivals, and old saves load with none", () => {
    const g = newGame();
    g.festivalsJoined.push("hat-parade:1");
    expect(deserialize(serialize(g))!.festivalsJoined).toEqual([
      "hat-parade:1",
    ]);
    const raw = JSON.parse(serialize(g));
    delete raw.festivalsJoined;
    expect(deserialize(JSON.stringify(raw))!.festivalsJoined).toEqual([]);
  });
});

describe("hats and the counter", () => {
  const joined = () => {
    const g = newGame();
    g.day.clock.day = dayOf("spring", parade.day);
    g.day.clock.minutes = parade.opens;
    return g;
  };

  it("gives the parade hat on the first visit, once", () => {
    const g = joined();
    expect(g.wardrobe.has("parade-ribbon")).toBe(false);
    enterFestival(g);
    enterFestival(g);
    expect(g.wardrobe.list()).toEqual(["parade-ribbon"]);
  });

  it("sells hats once, for coin, and only to a visitor", () => {
    const g = joined();
    const e = parade.counter[0]!;
    expect(counterProblem(g, parade, e)).toMatch(/Go to the festival/);
    enterFestival(g);
    g.money = e.price - 1;
    expect(buyAtCounter(g, parade, e)).toBe(false);
    g.money = e.price + 5;
    expect(buyAtCounter(g, parade, e)).toBe(true);
    expect(g.money).toBe(5);
    expect(g.wardrobe.has(e.hat!)).toBe(true);
    expect(buyAtCounter(g, parade, e)).toBe(false);
  });

  it("sells items without limit while the pack has room", () => {
    const g = newGame();
    const fair = FESTIVALS.find((f) => f.id === "seedswap-fair")!;
    g.day.clock.day = dayOf("spring", fair.day);
    g.day.clock.minutes = fair.opens;
    enterFestival(g);
    g.money = 100;
    expect(buyAtCounter(g, fair, fair.counter[0]!)).toBe(true);
    expect(buyAtCounter(g, fair, fair.counter[0]!)).toBe(true);
    expect(g.inventory.count("mixed-seed")).toBe(2);
    expect(g.money).toBe(60);
  });

  it("wears only owned hats", () => {
    const g = newGame();
    expect(g.wardrobe.wear("wool-beret")).toBe(false);
    g.wardrobe.add("wool-beret");
    expect(g.wardrobe.wear("wool-beret")).toBe(true);
    expect(g.wardrobe.wear(undefined)).toBe(true);
    expect(g.wardrobe.worn).toBeUndefined();
  });

  it("saves hats, and old or bad saves load with none", () => {
    const g = newGame();
    g.wardrobe.add("straw-boater");
    g.wardrobe.wear("straw-boater");
    const back = deserialize(serialize(g))!;
    expect(back.wardrobe.list()).toEqual(["straw-boater"]);
    expect(back.wardrobe.worn).toBe("straw-boater");
    const raw = JSON.parse(serialize(g));
    delete raw.wardrobe;
    expect(deserialize(JSON.stringify(raw))!.wardrobe.list()).toEqual([]);
    raw.wardrobe = { owned: ["nope", 3, "wool-beret"], worn: "straw-boater" };
    const odd = deserialize(JSON.stringify(raw))!;
    expect(odd.wardrobe.list()).toEqual(["wool-beret"]);
    expect(odd.wardrobe.worn).toBeUndefined();
  });
});

describe("2026-11-11 festival data (notes 14, 80 and 82)", () => {
  const byId = (id: string) => FESTIVALS.find((f) => f.id === id)!;

  it("has the solstice dates and the dusk hours", () => {
    expect(byId("lamplight-evening")).toMatchObject({
      season: "summer",
      day: 24,
      opens: 17 * 60,
      closes: 22 * 60,
      ends: 23 * 60,
    });
    expect(byId("midwinter-feast")).toMatchObject({
      season: "winter",
      day: 25,
    });
    expect(festivalOn("winter", 20)).toBeUndefined();
  });

  it("runs the Winter Night Market on three evenings, 16 to 18", () => {
    const m = byId("night-market");
    expect([m.day, m.lastDay]).toEqual([16, 18]);
    expect([m.opens, m.closes]).toEqual([17 * 60, 24 * 60]);
    for (const d of [16, 17, 18])
      expect(festivalOn("winter", d)?.id).toBe("night-market");
    expect(festivalOn("winter", 15)).toBeUndefined();
    expect(festivalOn("winter", 19)).toBeUndefined();
    expect(festivalToday(dayOf("winter", 17))?.id).toBe("night-market");
    expect(nextFestival(dayOf("winter", 8))?.festival.id).toBe("night-market");
    expect(nextFestival(dayOf("winter", 18))?.festival.id).toBe(
      "midwinter-feast",
    );
    expect(rollWeather("winter", 17, () => 0)).toBe("sunny");
  });

  it("does not take over the day on a Night Market evening", () => {
    expect(festivalDayToday(dayOf("winter", 17))).toBeUndefined();
    expect(festivalDayToday(dayOf("winter", 25))?.id).toBe("midwinter-feast");
    const g = newGame();
    g.day.clock.day = dayOf("winter", 17);
    g.day.clock.minutes = 18 * 60;
    expect(enterProblem(g)).toMatch(/no festival/);
  });

  it("places each festival in an area, not the old green or river", () => {
    const maps = Object.fromEntries(FESTIVALS.map((f) => [f.id, f.place.map]));
    expect(maps).toMatchObject({
      "seedswap-fair": "forest",
      "lamplight-evening": "delta",
      frostday: "forest",
      "harvest-showing": "green",
      "hollow-eve": "hedge",
      "cake-day": "hearthwell",
      "night-market": "hearthwell",
    });
    const feast = byId("midwinter-feast");
    expect(festivalPlace(feast, false).map).toBe("hearthwell");
    expect(festivalPlace(feast, true).map).toBe("hall");
    expect(festivalPlace(byId("frostday"), true).map).toBe("forest");
  });
});

describe("festival areas are shut before opening (note 82, decision 12)", () => {
  const frost = dayOf("winter", 8);
  it("shuts the festival zone, not the rest of the map, until it opens", () => {
    expect(festivalAreaShut(frost, 11 * 60, "forest", 46, 22)).toBe(true);
    expect(festivalAreaShut(frost, 12 * 60, "forest", 46, 22)).toBe(false);
    expect(festivalAreaShut(frost, 11 * 60, "forest", 90, 50)).toBe(false);
    expect(festivalAreaShut(frost, 11 * 60, "delta", 46, 22)).toBe(false);
  });

  it("is open on other days, and uses the festival's own opening time", () => {
    expect(festivalAreaShut(frost + 1, 8 * 60, "forest", 46, 22)).toBe(false);
    const lamp = dayOf("summer", 24);
    expect(festivalAreaShut(lamp, 16 * 60, "delta", 70, 40)).toBe(true);
    expect(festivalAreaShut(lamp, 17 * 60, "delta", 70, 40)).toBe(false);
  });

  it("follows the hall when the feast moves there, and skips the Night Market", () => {
    const feast = dayOf("winter", 25);
    expect(festivalAreaShut(feast, 600, "hall", 20, 10, true)).toBe(true);
    expect(festivalAreaShut(feast, 600, "hall", 20, 10, false)).toBe(false);
    expect(festivalAreaShut(feast, 600, "hearthwell", 70, 58, false)).toBe(
      true,
    );
    expect(
      festivalAreaShut(dayOf("winter", 16), 600, "hearthwell", 70, 58),
    ).toBe(false);
  });
});

describe("stepping into a shut festival place (note 82 decision 12)", () => {
  const frost = dayOf("winter", 8);
  const out = { map: "delta", x: 5, y: 5 };
  const lake = { map: "forest", x: 46, y: 22 };

  it("blocks entering before opening and allows it at opening", () => {
    expect(festivalStepShut(frost, 11 * 60, out, lake)).toBe(true);
    expect(festivalStepShut(frost, 12 * 60, out, lake)).toBe(false);
    expect(festivalStepShut(frost, 11 * 60, undefined, lake)).toBe(true);
  });

  it("never blocks a player already inside, or one heading outside", () => {
    const inside = { map: "forest", x: 47, y: 22 };
    expect(festivalStepShut(frost, 11 * 60, inside, lake)).toBe(false);
    expect(festivalStepShut(frost, 11 * 60, inside, out)).toBe(false);
  });

  it("stays open after closing and on other days", () => {
    expect(festivalStepShut(frost, 23 * 60, out, lake)).toBe(false);
    expect(festivalStepShut(frost + 1, 8 * 60, out, lake)).toBe(false);
  });

  it("never shuts the three-day Night Market", () => {
    for (const d of [16, 17, 18])
      expect(
        festivalStepShut(dayOf("winter", d), 8 * 60, out, {
          map: "hearthwell",
          x: 70,
          y: 58,
        }),
      ).toBe(false);
  });

  it("shuts the place of every day festival and no other tile", () => {
    for (const f of FESTIVALS.filter((x) => !x.evening)) {
      const day = dayOf(f.season, f.day);
      const { map, zone } = f.place;
      expect(
        festivalStepShut(day, f.opens - 1, out, { map, x: zone.x, y: zone.y }),
      ).toBe(true);
      expect(
        festivalStepShut(day, f.opens, out, { map, x: zone.x, y: zone.y }),
      ).toBe(false);
      expect(
        festivalStepShut(day, f.opens - 1, out, {
          map,
          x: zone.x + zone.w,
          y: zone.y,
        }),
      ).toBe(false);
    }
  });

  it("words the line with the festival's name and opening time", () => {
    expect(festivalShutLine(frost)).toBe(
      "Setting up for the Frostday. Opens at 12 pm.",
    );
    expect(festivalShutLine(dayOf("summer", 24))).toContain("5 pm");
    expect(festivalShutLine(frost + 1)).toBe("");
  });
});
