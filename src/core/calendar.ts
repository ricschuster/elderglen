/** Seasons, in order, as in note 26. Day numbers start at 1 (see Clock.day). */
export const SEASONS = ["spring", "summer", "fall", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export const DAYS_PER_SEASON = 28;

export interface CalendarDate {
  season: Season;
  /** 1 to DAYS_PER_SEASON. */
  dayOfSeason: number;
  /** 1 based; a year is one pass through SEASONS. */
  year: number;
}

export function dateOf(day: number): CalendarDate {
  const index = day - 1;
  const seasonIndex = Math.floor(index / DAYS_PER_SEASON) % SEASONS.length;
  return {
    season: SEASONS[seasonIndex] as Season,
    dayOfSeason: (index % DAYS_PER_SEASON) + 1,
    year: Math.floor(index / (DAYS_PER_SEASON * SEASONS.length)) + 1,
  };
}

export const WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

/** The week of a day, counted from 0. */
export const weekOf = (day: number): number =>
  Math.floor((day - 1) / WEEKDAYS.length);

/** Date in words, such as "Mon. Spring 1", with a seven day week as in Stardew. */
export function dateText(day: number): string {
  const { season, dayOfSeason } = dateOf(day);
  const weekday = WEEKDAYS[(dayOfSeason - 1) % WEEKDAYS.length];
  const name = season.charAt(0).toUpperCase() + season.slice(1);
  return `${weekday}. ${name} ${dayOfSeason}`;
}
