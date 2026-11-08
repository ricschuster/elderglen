import type { Season } from "./calendar";
import { festivalOn } from "./festivals";

export const WEATHERS = ["sunny", "rainy", "stormy", "snowy"] as const;
export type Weather = (typeof WEATHERS)[number];

/** Chance that a day is rainy, by season. Tunable. */
export const RAIN_CHANCE: Record<Season, number> = {
  spring: 0.2,
  summer: 0.15,
  fall: 0.2,
  winter: 0,
};

/** Chance that a winter day is snowy. Ours, a look and a forecast only (note 07). */
export const SNOW_CHANCE = 0.3;

/** Chance that a rain day outside winter is a thunderstorm. Ours (note 07). */
export const STORM_SHARE = 0.25;

/** Summer days that are always storms, every year. As Stardew (note 07). */
export const FIXED_STORM_DAYS: Record<Season, readonly number[]> = {
  spring: [],
  summer: [13, 26],
  fall: [],
  winter: [],
};

/** True for rain and for a storm, both of which water the plots. */
export const isRaining = (w: Weather): boolean =>
  w === "rainy" || w === "stormy";

/**
 * Weather for a new day. The first day of a season and festival days are
 * always sunny. Rain
 * waters every plot overnight (see `sleep`). A rain day is a storm a quarter
 * of the time, and summer days 13 and 26 are always storms. Storms are
 * weather only for now: no strikes yet (note 07).
 */
export function rollWeather(
  season: Season,
  dayOfSeason: number,
  random: () => number,
): Weather {
  if (dayOfSeason === 1 || festivalOn(season, dayOfSeason)) return "sunny";
  if (season === "winter") return random() < SNOW_CHANCE ? "snowy" : "sunny";
  if (FIXED_STORM_DAYS[season].includes(dayOfSeason)) return "stormy";
  if (random() >= RAIN_CHANCE[season]) return "sunny";
  return random() < STORM_SHARE ? "stormy" : "rainy";
}
