import { dateText } from "./calendar";
import { festivalToday } from "./festivals";
import { isBirthday } from "./friendship";
import { VILLAGERS } from "./villagers";
import type { Weather } from "./weather";

/** Pure parts of the clock panel and the energy and health bars (note 102). */

export type WeatherIcon = "sun" | "rain" | "storm" | "snow";
export type EventIcon = "festival" | "birthday";

/** The picture for today's weather. */
export function weatherIcon(w: Weather): WeatherIcon {
  switch (w) {
    case "rainy":
      return "rain";
    case "stormy":
      return "storm";
    case "snowy":
      return "snow";
    default:
      return "sun";
  }
}

/** A festival beats a birthday; nothing on an ordinary day. */
export function eventIcon(day: number): EventIcon | undefined {
  if (festivalToday(day)) return "festival";
  if (VILLAGERS.some((v) => isBirthday(v.id, day))) return "birthday";
  return undefined;
}

/** The date and time lines of the panel. */
export function clockLines(
  day: number,
  time: string,
): { date: string; time: string } {
  return { date: dateText(day), time };
}

/** Gold with a unit, for its own box. */
export const goldText = (n: number): string => `${Math.floor(n)}g`;

/** How full a bar is, from 0 to 1. A zero or bad maximum reads as empty. */
export function barFraction(current: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.min(1, Math.max(0, current / max));
}

/** Green when full, fading through amber to red when empty, as 0xRRGGBB. */
export function barColour(fraction: number): number {
  const f = Math.min(1, Math.max(0, fraction));
  const green = 0x4cc04c;
  const amber = 0xe0c040;
  const red = 0xd04040;
  const [from, to, t] =
    f >= 0.5 ? [amber, green, (f - 0.5) * 2] : [red, amber, f * 2];
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    out |= Math.round(a + (b - a) * t) << shift;
  }
  return out;
}

/** Health shows where it can be lost, or while it is below full. */
export const healthBarShown = (
  canBeHurt: boolean,
  current: number,
  max: number,
): boolean => canBeHurt || current < max;

/** Exact text for a hover or a tap. */
export const barLabel = (name: string, current: number, max: number): string =>
  `${name} ${Math.ceil(current)}/${max}`;

/**
 * Where the bars sit. Normally flush right at the bottom; with the stick
 * scheme the use and action buttons own the right end, so the bars step left
 * of them.
 */
export function barsInset(stick: boolean, buttonRadius: number): number {
  return stick ? buttonRadius * 2 + 16 : 0;
}
