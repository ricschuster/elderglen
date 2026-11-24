import data from "../content/cake-day.json";
import { dateOf } from "./calendar";
import { dishById } from "./dishes";
import { FESTIVALS, festivalDayToday } from "./festivals";
import { attendees, festivalLayout } from "./festivalroutes";
import type { PlayerId } from "./players";
import { QUALITIES, splitQuality, type Quality } from "./quality";
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

/** The dishes in the pack that can go on the table, one entry per item id. */
export function cakeDishes(g: GameState): string[] {
  const ids: string[] = [];
  for (let i = 0; i < g.inventory.size; i++) {
    const id = g.inventory.slot(i)?.id;
    if (id && !ids.includes(id) && cakeProblem(g, id) === undefined)
      ids.push(id);
  }
  return ids;
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
  const { quality } = splitQuality(itemId);
  g.inventory.remove(itemId, 1);
  g.festivalsJoined.push(cakeKey(g.day.clock.day));
  return { quality, gains: tasteGains(g, quality) };
}

/** Give every attendee the quality's points as the acting player (after the heart cap), per person. */
function tasteGains(g: GameState, quality: Quality): Record<string, number> {
  const f = FESTIVALS.find((x) => x.id === "cake-day")!;
  const layout = festivalLayout(f);
  const gains: Record<string, number> = {};
  for (const id of layout ? attendees(layout) : [])
    gains[id] = g.friendship.award(id, CAKE_POINTS[quality]);
  return gains;
}

// ---- several players (note 111 decision 7): everyone adds a dish, the worst sets it

/** The result when a present player has not handed in a dish: the poor one (the lowest quality). */
export const POOR_DISH: Quality = QUALITIES[0];

/** The lowest of some qualities (the poor one for none). */
export function lowestQuality(qs: Quality[]): Quality {
  let low = QUALITIES.length - 1;
  for (const q of qs) low = Math.min(low, QUALITIES.indexOf(q));
  return qs.length === 0 ? POOR_DISH : QUALITIES[low]!;
}

/** The dishes on the table today, by player, kept on the host. Never saved. */
export interface CakeTable {
  day: number;
  dishes: Record<PlayerId, Quality>;
  /** Set once everyone has tasted. */
  tasted?: { quality: Quality; missing: PlayerId[] };
}

export const newCakeTable = (day: number): CakeTable => ({ day, dishes: {} });

/**
 * Put the acting player's dish on the shared table: takes it from their pack and notes its quality. Returns a
 * refusal (nothing changed), or undefined.
 */
export function giveDish(
  g: GameState,
  table: CakeTable,
  by: PlayerId,
  itemId: string,
): string | undefined {
  if (table.tasted) return "The cake has been tasted already.";
  const why = cakeProblem(g, itemId);
  if (why !== undefined) return why;
  const { quality } = splitQuality(itemId);
  g.inventory.remove(itemId, 1);
  g.festivalsJoined.push(cakeKey(g.day.clock.day));
  table.dishes[by] = quality;
  return undefined;
}

/** The players present who have not put a dish on the table. */
export const dishesMissing = (table: CakeTable, present: PlayerId[]) =>
  present.filter((p) => table.dishes[p] === undefined);

/**
 * The result of tasting with these players present: the lowest dish sets it, or the poor one if a present
 * player has none. Undefined when no present player has given a dish.
 */
export function tasteResult(
  table: CakeTable,
  present: PlayerId[],
): { quality: Quality; missing: PlayerId[] } | undefined {
  const given = present.filter((p) => table.dishes[p] !== undefined);
  if (given.length === 0) return undefined;
  const missing = dishesMissing(table, present);
  return {
    quality:
      missing.length > 0
        ? POOR_DISH
        : lowestQuality(given.map((p) => table.dishes[p]!)),
    missing,
  };
}

/** Friendship for the acting player with every attendee from a tasted table, once their own mark is down. */
export function awardTaste(
  g: GameState,
  quality: Quality,
): Record<string, number> {
  const key = cakeKey(g.day.clock.day);
  if (!g.festivalsJoined.includes(key)) g.festivalsJoined.push(key);
  return tasteGains(g, quality);
}
