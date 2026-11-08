import { describe, expect, it } from "vitest";
import {
  FIXED_STORM_DAYS,
  isRaining,
  RAIN_CHANCE,
  rollWeather,
  STORM_SHARE,
} from "../src/core/weather";
import { plant, till } from "../src/core/actions";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { seedId } from "../src/core/items";
import { DAYS_PER_SEASON } from "../src/core/calendar";

const spots = [{ x: 0, y: 5 }];

/** A random source that returns the given values in turn. */
function seq(...values: number[]) {
  let i = 0;
  return () => values[i++] ?? 0;
}

describe("rollWeather", () => {
  it("is sunny on the first day of a season", () => {
    expect(rollWeather("spring", 1, () => 0)).toBe("sunny");
  });

  it("rains below the season's chance and is sunny at or above it", () => {
    const rain = RAIN_CHANCE.spring - 0.01;
    expect(rollWeather("spring", 2, seq(rain, STORM_SHARE))).toBe("rainy");
    expect(rollWeather("spring", 2, () => RAIN_CHANCE.spring)).toBe("sunny");
  });

  it("makes a quarter of rain days storms, never in winter", () => {
    const rain = RAIN_CHANCE.fall - 0.01;
    expect(rollWeather("fall", 5, seq(rain, STORM_SHARE - 0.01))).toBe(
      "stormy",
    );
    expect(rollWeather("fall", 5, seq(rain, STORM_SHARE))).toBe("rainy");
    for (let d = 2; d <= 28; d++)
      expect(rollWeather("winter", d, () => 0)).not.toBe("stormy");
  });

  it("always storms on summer days 13 and 26, but not on a festival or day 1", () => {
    expect(FIXED_STORM_DAYS.summer).toEqual([13, 26]);
    expect(rollWeather("summer", 13, () => 0.99)).toBe("stormy");
    expect(rollWeather("summer", 26, () => 0.99)).toBe("stormy");
    expect(rollWeather("summer", 12, () => 0.99)).toBe("sunny");
    expect(isRaining("stormy")).toBe(true);
    expect(isRaining("rainy")).toBe(true);
    expect(isRaining("sunny")).toBe(false);
  });

  it("waters the plots on a storm night and saves", () => {
    const g = newGame();
    till(g, 0, 5);
    plant(g, 0, 5, seedId("parsnip"));
    g.tomorrow = "stormy";
    sleep(g, spots, () => 0.5);
    expect(g.weather).toBe("stormy");
    expect(deserialize(serialize(g))?.weather).toBe("stormy");
  });
});

describe("rain", () => {
  it("waters crops overnight so they grow", () => {
    const g = newGame();
    g.inventory.add(seedId("parsnip"));
    till(g, 0, 0);
    plant(g, 0, 0, seedId("parsnip"));
    g.tomorrow = "rainy";
    const r = sleep(g, spots, () => 0.99);
    expect(r.weather).toBe("rainy");
    expect(g.weather).toBe("rainy");
    expect(g.farm.plotAt(0, 0)?.wateredToday).toBe(true);
    sleep(g, spots, () => 0.99);
    expect(g.farm.plotAt(0, 0)?.crop?.daysGrown).toBe(1);
  });

  it("waters freshly tilled soil", () => {
    const g = newGame();
    g.weather = "rainy";
    till(g, 3, 3);
    expect(g.farm.plotAt(3, 3)?.wateredToday).toBe(true);
  });

  it("is saved with the game", () => {
    const g = newGame();
    g.weather = "rainy";
    expect(deserialize(serialize(g))?.weather).toBe("rainy");
    const bad = { ...JSON.parse(serialize(g)), weather: "snow" };
    expect(deserialize(JSON.stringify(bad))).toBeUndefined();
  });
});

describe("forecast", () => {
  it("tomorrow becomes today after sleeping, and a new tomorrow is rolled", () => {
    const g = newGame();
    g.tomorrow = "rainy";
    const report = sleep(g, [], () => 0.99);
    expect(report.weather).toBe("rainy");
    expect(g.weather).toBe("rainy");
    expect(g.tomorrow).toBe("sunny");
  });

  it("the forecast for a season's first day is always clear", () => {
    const g = newGame();
    g.day.clock.day = DAYS_PER_SEASON - 1;
    sleep(g, [], () => 0);
    expect(g.tomorrow).toBe("sunny");
  });

  it("is saved, and old saves still load", () => {
    const g = newGame();
    g.tomorrow = "rainy";
    expect(deserialize(serialize(g))!.tomorrow).toBe("rainy");
    const raw = JSON.parse(serialize(g));
    delete raw.tomorrow;
    expect(deserialize(JSON.stringify(raw))!.tomorrow).toBe("sunny");
  });
});
