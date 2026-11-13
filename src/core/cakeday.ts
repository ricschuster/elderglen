import data from "../content/cake-day.json";
import { dateOf } from "./calendar";
import { dishById } from "./dishes";
import { FESTIVALS, festivalDayToday } from "./festivals";
import { attendees, festivalLayout } from "./festivalroutes";
import { splitQuality, type Quality } from "./quality";
import type { GameState } from "./save";

/**
 * The Cake Day cake table (note 82, owner answers 2026-11-11): the player
 * hands in one cooked dish, everyone tastes it, and the dish's quality sets a
 * small friendship gain with every attendee, once a year. The points follow the
 * saved Luau scale (60, 90, 120) in `src/content/cake-day.json`.
 */
export const CAKE_POINTS = data.points as Record<Quality, number>;

const cakeKey = (day: number) => `cake-day-table:${dateOf(day).year}`;

/** True once this year's dish has been handed in. */
export const cakeHandedIn = (g: GameState) =>
  g.festivalsJoined.includes(cakeKey(g.day.clock.day));

/** Why a dish cannot go on the table, or undefined if it can. */
export function cakeProblem(g: GameState, itemId: string): string | undefined {
  if (festivalDayToday(g.day.clock.day)?.id !== "cake-day")
    return "There is no cake table today.";
  if (cakeHandedIn(g)) return "Your dish is already on the table.";
  if (!dishById(splitQuality(itemId).base))
    return "The table is for cooked dishes.";
  if (g.inventory.count(itemId) < 1) return "You do not have that.";
  return undefined;
}

export interface CakeResult {
  quality: Quality;
  /** Friendship points gained per person who tasted it (after the heart cap). */
  gains: Record<string, number>;
}

/**
 * Hand in one cooked dish: takes it, and gives every attendee the quality's
 * points. Returns undefined (nothing changed) when it cannot be handed in.
 */
export function handInCake(
  g: GameState,
  itemId: string,
): CakeResult | undefined {
  if (cakeProblem(g, itemId) !== undefined) return undefined;
  const f = FESTIVALS.find((x) => x.id === "cake-day")!;
  const layout = festivalLayout(f);
  const { quality } = splitQuality(itemId);
  g.inventory.remove(itemId, 1);
  g.festivalsJoined.push(cakeKey(g.day.clock.day));
  const gains: Record<string, number> = {};
  for (const id of layout ? attendees(layout) : [])
    gains[id] = g.friendship.award(id, CAKE_POINTS[quality]);
  return { quality, gains };
}
