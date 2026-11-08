import { describe, expect, it } from "vitest";
import { harvest, till, WINTER_DIG_CHANCE } from "../src/core/actions";
import { DAYS_PER_SEASON, SEASONS, dateOf } from "../src/core/calendar";
import { BUNDLES } from "../src/core/bundles";
import { NIGHTFALL, darkness } from "../src/core/clock";
import { cropById } from "../src/core/crops";
import { FORAGE, ForageField, RARE_CHANCE } from "../src/core/forage";
import { itemById, seedId } from "../src/core/items";
import { newGame } from "../src/core/save";
import { seedStock } from "../src/core/shop";
import { rollWeather, SNOW_CHANCE, STORM_SHARE } from "../src/core/weather";

const dayOf = (season: string, d: number) =>
  SEASONS.indexOf(season as never) * DAYS_PER_SEASON + d;

describe("the four seasons", () => {
  it("runs spring, summer, fall, winter, then year 2", () => {
    expect(dateOf(dayOf("fall", 1))).toMatchObject({ season: "fall", year: 1 });
    expect(dateOf(dayOf("winter", 28))).toMatchObject({
      season: "winter",
      dayOfSeason: 28,
      year: 1,
    });
    expect(dateOf(4 * DAYS_PER_SEASON + 1)).toMatchObject({
      season: "spring",
      year: 2,
    });
  });

  it("falls dark earlier each season, with no darkness by day", () => {
    expect(NIGHTFALL.fall).toBe(19 * 60);
    expect(NIGHTFALL.winter).toBe(18 * 60);
    expect(darkness("spring", 12 * 60)).toBe(0);
    expect(darkness("winter", 18 * 60)).toBeGreaterThan(
      darkness("spring", 18 * 60),
    );
    expect(darkness("winter", 20 * 60)).toBe(1);
  });

  it("snows in winter and never rains", () => {
    expect(rollWeather("winter", 5, () => SNOW_CHANCE - 0.01)).toBe("snowy");
    expect(rollWeather("winter", 5, () => SNOW_CHANCE)).toBe("sunny");
    expect(rollWeather("winter", 5, () => 0)).not.toBe("rainy");
    expect(rollWeather("fall", 5, seq(0, STORM_SHARE))).toBe("rainy");
  });
});

/** A random source that returns the given values in turn. */
function seq(...values: number[]) {
  let i = 0;
  return () => values[i++] ?? 0;
}

describe("fall crops", () => {
  it("has the six fall crops and corn into fall", () => {
    for (const id of [
      "pumpkin",
      "eggplant",
      "sweet-potato",
      "beet",
      "cranberry",
      "artichoke",
    ])
      expect(cropById(id)?.seasons, id).toEqual(["fall"]);
    expect(cropById("corn")?.seasons).toEqual(["summer", "fall"]);
    expect(seedStock("fall")).toContain(seedId("pumpkin"));
    expect(seedStock("winter")).toEqual([]);
    expect(itemById("pumpkin")?.energy).toBeUndefined();
  });

  it("gives two cranberries a harvest and regrows", () => {
    const g = newGame();
    g.day.clock.day = dayOf("fall", 2);
    g.farm.till(1, 1);
    g.farm.plant(1, 1, "cranberry", "fall");
    g.farm.plotAt(1, 1)!.crop!.daysGrown = 7;
    expect(harvest(g, 1, 1, () => 0.9).ok).toBe(true);
    expect(g.inventory.count("cranberry")).toBe(2);
    expect(g.farm.plotAt(1, 1)?.crop).toBeDefined();
  });

  it("withers crops when winter comes", () => {
    const g = newGame();
    g.farm.till(1, 1);
    g.farm.plant(1, 1, "pumpkin", "fall");
    g.farm.endDay("winter");
    expect(g.farm.plotAt(1, 1)?.crop).toBeUndefined();
  });
});

describe("fall and winter forage", () => {
  it("has eight fall goods and five winter spawns, plus soil finds", () => {
    const common = (s: string) =>
      FORAGE.filter((f) => f.seasons.includes(s as never) && !f.rare);
    expect(common("fall")).toHaveLength(8);
    expect(common("winter")).toHaveLength(5);
    expect(FORAGE.filter((f) => f.soil).map((f) => f.id)).toEqual([
      "frost-root",
      "snow-tuber",
    ]);
  });

  it("spawns a rare find at the rare chance and only in season", () => {
    const spots = Array.from({ length: 40 }, (_, i) => ({ x: i, y: 0 }));
    // The first roll sets the count (a full field), then 0 picks the first
    // spot and is below the rare chance.
    let first = true;
    const field = new ForageField();
    field.respawn("winter", spots, () => {
      if (!first) return 0;
      first = false;
      return 0.99;
    });
    expect(field.itemAt(spots[0]!.x, 0)).toBe("snowcap");
    const common = new ForageField();
    common.respawn("winter", spots, () => RARE_CHANCE + 0.5);
    for (const { id } of common.each()) expect(id).not.toBe("snowcap");
  });

  it("never spawns soil finds on forage spots", () => {
    const spots = Array.from({ length: 40 }, (_, i) => ({ x: i, y: 0 }));
    for (const season of ["fall", "winter"] as const) {
      const field = new ForageField();
      let n = 0;
      field.respawn(season, spots, () => (n++ % 7) / 7);
      for (const { id } of field.each())
        expect(FORAGE.find((f) => f.id === id)?.soil).toBeUndefined();
    }
  });
});

describe("winter soil digging", () => {
  it("turns up frost root or snow tuber on a small chance, in winter only", () => {
    const g = newGame();
    g.day.clock.day = dayOf("winter", 3);
    const root = till(g, 1, 1, () => WINTER_DIG_CHANCE / 2);
    expect(root).toMatchObject({ ok: true, item: "frost-root" });
    expect(g.inventory.count("frost-root")).toBe(1);
    const dud = till(g, 2, 1, () => 0.99);
    expect(dud).toEqual({ ok: true });
    const tuber = till(
      g,
      3,
      1,
      (() => {
        const rolls = [WINTER_DIG_CHANCE / 2, 0.9];
        return () => rolls.shift() ?? 0;
      })(),
    );
    expect(tuber).toMatchObject({ item: "snow-tuber" });
    g.day.clock.day = dayOf("fall", 3);
    expect(till(g, 4, 1, () => 0)).toEqual({ ok: true });
  });
});

describe("bundle pools after build 4", () => {
  const by = (id: string) => BUNDLES.find((b) => b.id === id)!;
  it("uses the real fall and winter pools", () => {
    expect(by("winter-foraging").items.map((i) => i.id)).toEqual([
      "crocus",
      "snowdrop",
      "winter-cress",
      "pine-nut",
      "frost-root",
    ]);
    expect(by("autumn-crops").items.map((i) => i.id)).toEqual([
      "pumpkin",
      "eggplant",
      "sweet-potato",
      "beet",
      "cranberry",
      "artichoke",
    ]);
    expect(by("quality-crops").items.map((i) => i.id)).toEqual([
      "parsnip",
      "melon",
      "corn",
      "pumpkin",
    ]);
    expect(by("artisan-goods").items.map((i) => i.id)).toContain("apple");
  });
});
