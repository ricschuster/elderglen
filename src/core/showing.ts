import { artisanById } from "./artisan";
import { cropById } from "./crops";
import { dateOf } from "./calendar";
import { fruitTreeById } from "./fruittrees";
import { forageById } from "./forage";
import { itemById } from "./items";
import { BARS, COAL, ORES } from "./ore";
import { QUALITIES, splitQuality } from "./quality";
import type { GameState } from "./save";

/**
 * The Harvest Showing's display (`docs/design/66_fall_winter_festivals_and_farm_cave.md`).
 * The player sets up to nine goods on a table and the judge scores them. The
 * shape is Stardew's, the weights are ours and every number is a placeholder.
 * Goods are never taken from the pack, so nothing is lost.
 */
export const TABLE_SIZE = 9;
export const BASE_POINTS = 14;
/** Points for each item shown, taken off at the end: 2 an item, minus 9. */
export const ITEM_POINTS = 2;
export const ITEM_OFFSET = 9;
export const GROUP_POINTS = 5;
export const MAX_GROUP_POINTS = 30;
/** Most value points one item can earn: quality (0 to 2) plus price (up to 3). */
export const MAX_ITEM_VALUE = 5;
export const MAX_PRICE_POINTS = 3;

/** The groups of goods that count, six in slice 1. Fish and animal goods join later. */
export const SHOW_GROUPS = [
  "artisan",
  "dish",
  "forage",
  "fruit",
  "vegetable",
  "mineral",
] as const;
export type ShowGroup = (typeof SHOW_GROUPS)[number];

/** Which group a good is in, or undefined if it cannot be shown. */
export function groupOf(id: string): ShowGroup | undefined {
  const { base } = splitQuality(id);
  if (artisanById(base)) return "artisan";
  if (forageById(base)) return "forage";
  if (fruitTreeById(base)) return "fruit";
  const crop = cropById(base);
  if (crop) return crop.produce === "fruit" ? "fruit" : "vegetable";
  if (
    ORES.some((o) => o.id === base) ||
    BARS.some((b) => b.id === base) ||
    base === COAL
  )
    return "mineral";
  return undefined;
}

/** Value points for one good: quality 0 to 2, plus 1 for each 100g of price up to 3. */
export function valuePoints(id: string): number {
  const def = itemById(id);
  if (!def) return 0;
  const q = QUALITIES.indexOf(splitQuality(id).quality);
  return Math.min(
    q + Math.min(Math.floor(def.sellPrice / 100), MAX_PRICE_POINTS),
    MAX_ITEM_VALUE,
  );
}

export interface ShowScore {
  items: number;
  categories: number;
  value: number;
  total: number;
}

/** Score a table of goods. Goods that cannot be shown count for nothing. */
export function scoreTable(ids: string[]): ShowScore {
  const shown = ids.slice(0, TABLE_SIZE);
  const groups = new Set(
    shown.map(groupOf).filter((g): g is ShowGroup => g !== undefined),
  );
  const items = ITEM_POINTS * shown.length - ITEM_OFFSET;
  const categories = Math.min(groups.size * GROUP_POINTS, MAX_GROUP_POINTS);
  const value = shown.reduce((n, id) => n + valuePoints(id), 0);
  return {
    items,
    categories,
    value,
    total: BASE_POINTS + items + categories + value,
  };
}

export interface Place {
  place: 1 | 2 | 3 | 4;
  /** Points needed. */
  min: number;
  tokens: number;
}

/** Placeholder thresholds and prizes (note 66): 1,000, 500, 250 and 50 show tokens. */
export const PLACES: Place[] = [
  { place: 1, min: 85, tokens: 1000 },
  { place: 2, min: 70, tokens: 500 },
  { place: 3, min: 55, tokens: 250 },
  { place: 4, min: -Infinity, tokens: 50 },
];

export const placeOf = (points: number): Place =>
  PLACES.find((p) => points >= p.min) as Place;

/** The hat for first place. */
export const ROSETTE_HAT = "rosette-hat";

/** The item for first place, once a year (note 14). A universal gift love. */
export const PRIZE_MELON = "blue-ribbon-melon";

/** Show tokens held this year. They do not carry between years. */
export function showTokens(g: GameState): number {
  return g.showTokens.year === dateOf(g.day.clock.day).year
    ? g.showTokens.count
    : 0;
}

export function spendTokens(g: GameState, n: number): boolean {
  if (showTokens(g) < n) return false;
  g.showTokens.count -= n;
  return true;
}

const judgedKey = (day: number) => `harvest-showing-judged:${dateOf(day).year}`;

/** True once this year's judging is done. */
export const judgedThisYear = (g: GameState) =>
  g.festivalsJoined.includes(judgedKey(g.day.clock.day));

/** Why a table cannot be judged now, or undefined if it can. */
export function judgeProblem(g: GameState, ids: string[]): string | undefined {
  if (judgedThisYear(g)) return "The judge has already scored your table.";
  if (ids.length === 0) return "Put something on the table first.";
  if (ids.length > TABLE_SIZE) return "The table holds nine goods.";
  const need = new Map<string, number>();
  for (const id of ids) {
    if (!groupOf(id)) return `${itemById(id)?.name ?? id} cannot be shown.`;
    need.set(id, (need.get(id) ?? 0) + 1);
  }
  for (const [id, n] of need)
    if (g.inventory.count(id) < n) return "You do not have all of those.";
  return undefined;
}

export interface Judged {
  score: ShowScore;
  place: Place;
}

/**
 * Judge the table. Pays show tokens for the place, once a year, and gives the
 * Rosette Hat and a Blue Ribbon Melon for first place. Returns undefined (nothing changed) if the
 * table cannot be judged.
 */
export function judge(g: GameState, ids: string[]): Judged | undefined {
  if (judgeProblem(g, ids) !== undefined) return undefined;
  const score = scoreTable(ids);
  const place = placeOf(score.total);
  const year = dateOf(g.day.clock.day).year;
  g.festivalsJoined.push(judgedKey(g.day.clock.day));
  g.showTokens = { year, count: showTokens(g) + place.tokens };
  if (place.place === 1) {
    g.wardrobe.add(ROSETTE_HAT);
    g.inventory.add(PRIZE_MELON);
  }
  return { score, place };
}
