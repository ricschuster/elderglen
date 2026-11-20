import { dateOf } from "./calendar";
import { festivalLayout, type FestivalPropSet } from "./festivalroutes";
import { festivalDayToday } from "./festivals";

/**
 * The placeholder props of today's festival on a map (note 82, "Midwinter Feast
 * on the square"): the long table, its lantern posts and the bonfire. Pure, so
 * the scene only draws what this says and the blocking rule reads the same data.
 * Undefined when no festival with props is held on `mapId` today.
 */
export function festivalPropsOn(
  day: number,
  mapId: string,
  hallRestored: boolean,
): FestivalPropSet | undefined {
  const f = festivalDayToday(day);
  if (!f) return undefined;
  const layout = festivalLayout(f, hallRestored, dateOf(day).year);
  return layout?.map === mapId ? layout.props : undefined;
}

/** True when a festival prop (the long table) stands on this tile today. */
export function festivalPropBlocks(
  day: number,
  mapId: string,
  hallRestored: boolean,
  x: number,
  y: number,
): boolean {
  const t = festivalPropsOn(day, mapId, hallRestored)?.table;
  return !!t && y === t[2] && x >= t[0] && x <= t[1];
}
