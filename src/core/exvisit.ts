import { WEEKDAYS } from "./calendar";
import { hostMarriage } from "./playerid";
import { festivalDayToday } from "./festivals";
import { type Marriage } from "./marriage";
import type { Villager, Stop } from "./villagers";
import { isRaining, type Weather } from "./weather";

/**
 * The ex-spouse visits the children (note 12, owner decision 2026-11-16). After
 * a divorce the children stay with the player, and the most recent ex comes to
 * the farm yard once a week, on the last day of the week, from 10:00 to 15:00,
 * on dry days that are not a festival. Pure: it only reads the exes and the
 * children, so it adds nothing to the save. Placeholder numbers (note 07).
 */
export const VISIT_WEEKDAY = WEEKDAYS.length;
export const VISIT_FROM = 10 * 60;
export const VISIT_UNTIL = 15 * 60;
export const VISIT_PLACE = "farm:yard";

type Visit = Pick<Marriage, "kids" | "spouse" | "stage" | "exes">;
type Src = {
  marriage?: Visit;
  players?: { get(id: string): { marriage: Visit } };
};

/** Who visits the children on `day`, or undefined. */
export function exVisitor(
  g: Src,
  day: number,
  weather: Weather,
): string | undefined {
  // The yard and the children are the farm's own, so the host's marriage and exes (note 12).
  const m = hostMarriage(g);
  if ((m?.kids.length ?? 0) === 0) return undefined;
  if (day % VISIT_WEEKDAY !== 0 || isRaining(weather)) return undefined;
  if (festivalDayToday(day) !== undefined) return undefined;
  const id = m.exes[m.exes.length - 1];
  if (!id || (m.stage !== "none" && m.spouse === id)) return undefined;
  return id;
}

/** The villager row on `day`: the visiting ex gets a yard stop in the window, else the row itself. */
export function exVisitVillager(
  g: Src,
  v: Villager,
  day: number,
  weather: Weather,
): Villager {
  if (exVisitor(g, day, weather) !== v.id) return v;
  const stops: Stop[] = [
    ...v.route.filter((s) => s.time < VISIT_FROM),
    { time: VISIT_FROM, place: VISIT_PLACE },
  ];
  const after = v.route.filter((s) => s.time >= VISIT_UNTIL);
  if (after[0]?.time !== VISIT_UNTIL) {
    const inForce = [...v.route].reverse().find((s) => s.time < VISIT_UNTIL);
    stops.push({
      time: VISIT_UNTIL,
      place: inForce?.place ?? v.home,
      ...(inForce?.idle ? { idle: inForce.idle } : {}),
    });
  }
  return { ...v, route: [...stops, ...after], weekday: [], season: [] };
}
