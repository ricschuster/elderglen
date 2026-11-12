import newsData from "../content/road-news.json";
import { festivalToday } from "./festivals";
import { seeded, daysToTrader, traderHere } from "./trader";
import type { Weather } from "./weather";

/**
 * Road news (note 57). The board shows today's news and nothing from missed
 * days. Flavour lines are drawn by the day's seed and have no game effect. The
 * trader notice and the forecast are rules, so the board never says anything
 * the game will not do. The steward says the same lines (not wired yet).
 */
export const NEWS_LINES: readonly string[] = newsData.lines;

/** One or two flavour lines for a day (1 based), the same on every reload. */
export function newsLines(day: number): string[] {
  const random = seeded(day * 6151 + 29);
  const first = Math.floor(random() * NEWS_LINES.length);
  const out = [NEWS_LINES[first]!];
  if (random() < 0.5) {
    const second =
      (first + 1 + Math.floor(random() * (NEWS_LINES.length - 1))) %
      NEWS_LINES.length;
    out.push(NEWS_LINES[second]!);
  }
  return out;
}

/** The trader notice: here today, or the days to his next visit. */
export function traderNotice(day: number): string {
  if (traderHere(day))
    return "The road trader has his stall in the yard today.";
  const n = daysToTrader(day);
  return `The road trader is due in ${n} day${n === 1 ? "" : "s"}, with rare goods.`;
}

const FORECAST: Record<Weather, string> = {
  sunny: "clear skies",
  rainy: "rain",
  stormy: "a thunderstorm",
  snowy: "snow",
};

/** Tomorrow's weather, read from the same roll the night uses, and tomorrow's festival if any. */
export function forecastLine(day: number, tomorrow: Weather): string {
  const f = festivalToday(day + 1);
  const heads = f ? ` Tomorrow is the ${f.name}.` : "";
  return `Forecast for tomorrow: ${FORECAST[tomorrow]}.${heads}`;
}

/** All the board says on a day. */
export function roadNews(day: number, tomorrow: Weather): string {
  return [
    ...newsLines(day),
    traderNotice(day),
    forecastLine(day, tomorrow),
  ].join(" ");
}
