import { artisanById } from "./artisan";
import { cropById } from "./crops";
import { dishById } from "./dishes";
import { dateOf } from "./calendar";
import { fruitTreeById } from "./fruittrees";
import { forageById } from "./forage";
import { itemById } from "./items";
import { SPECIES, FEATHER, MOONWOOL } from "./animals";
import { fishById } from "./fishing";
import { BARS, COAL, ORES } from "./ore";
import { QUALITIES, splitQuality } from "./quality";
import type { GameState } from "./save";

/**
 * The Harvest Showing's display (`docs/design/66_fall_winter_festivals_and_farm_cave.md`).
 * The player sets up to nine goods on a table and the judge scores them. The
 * shape and the value bands are Stardew's, the other weights are ours.
 * Goods are never taken from the pack, so nothing is lost.
 */
export const TABLE_SIZE = 9;
export const BASE_POINTS = 14;
/** Points for each item shown, taken off at the end: 2 an item, minus 9. */
export const ITEM_POINTS = 2;
export const ITEM_OFFSET = 9;
export const GROUP_POINTS = 5;
export const MAX_GROUP_POINTS = 30;

/**
 * Value points by sell price band and quality (Stardew's Grange table, saved
 * Stardew Valley Fair page, SC-53). Each row is a band that starts at `from`
 * gold of actual sell price; the points are for normal, silver and gold. We
 * have no iridium quality, so that column is dropped and the most an item can
 * earn is 6 (Stardew's is 8).
 */
export const VALUE_BANDS: { from: number; points: [number, number, number] }[] =
  [
    { from: 0, points: [1, 2, 3] },
    { from: 20, points: [2, 3, 4] },
    { from: 90, points: [3, 4, 5] },
    { from: 200, points: [4, 5, 6] },
    { from: 300, points: [5, 6, 6] },
    { from: 400, points: [6, 6, 6] },
  ];
/** Most value points one item can earn. */
export const MAX_ITEM_VALUE = 6;

/** The groups of goods that count: eight, so six of them fill the group mark. */
export const SHOW_GROUPS = [
  "artisan",
  "dish",
  "forage",
  "fruit",
  "vegetable",
  "mineral",
  "fish",
  "animal",
] as const;
export type ShowGroup = (typeof SHOW_GROUPS)[number];

/**
 * Animal products: what the species make, plus feathers and moonwool. Roe and
 * aged roe are not (Stardew does not count roe or dinosaur egg either).
 */
const isAnimalGood = (id: string) =>
  id === FEATHER ||
  id === MOONWOOL ||
  Object.values(SPECIES).some((s) => s.item === id);

/** Which group a good is in, or undefined if it cannot be shown. */
export function groupOf(id: string): ShowGroup | undefined {
  const { base } = splitQuality(id);
  if (artisanById(base)) return "artisan";
  if (dishById(base)) return "dish";
  if (fishById(base)) return "fish";
  if (isAnimalGood(base)) return "animal";
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

/** Value points for one good: its price band and quality in `VALUE_BANDS`, 0 if unlisted. */
export function valuePoints(id: string): number {
  const def = itemById(id);
  if (!def) return 0;
  const q = QUALITIES.indexOf(splitQuality(id).quality);
  let row = VALUE_BANDS[0]!;
  for (const b of VALUE_BANDS) if (def.sellPrice >= b.from) row = b;
  return row.points[q] ?? 0;
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

/**
 * Thresholds and prizes (note 66): 1,000, 500, 250 and 50 show tokens. The top
 * score is 107, and the places sit at 72, 60 and 48 percent of it (Stardew's
 * 90, 75 and 60 of 125, scaled), rounded: 77, 64 and 51.
 */
export const PLACES: Place[] = [
  { place: 1, min: 77, tokens: 1000 },
  { place: 2, min: 64, tokens: 500 },
  { place: 3, min: 51, tokens: 250 },
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
