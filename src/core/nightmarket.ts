import data from "../content/night-market.json";
import { dateOf, type Season } from "./calendar";
import { clockText } from "./clock";
import {
  entryProblem,
  festivalToday,
  takeEntry,
  type CounterEntry,
} from "./festivals";
import { itemById } from "./items";
import type { GameState } from "./save";
import { seedStock } from "./shop";
import { traderPrice } from "./trader";
import { seeded } from "./rng";
import { parseTime } from "./villagers";

/**
 * The Winter Night Market's four stalls (note 14, "Night Market attractions").
 * It is an evening festival: three evenings, Winter 16 to 18, open 17:00 to
 * 24:00, shops keep their hours. The pier, its permit and the lantern float are
 * built elsewhere. Pure rules; content is `src/content/night-market.json`, and
 * every price is a placeholder.
 */
export type Stall = "lantern" | "curio" | "trader" | "hatmaker";
export const STALLS: readonly Stall[] = [
  "lantern",
  "curio",
  "trader",
  "hatmaker",
];

export const MARKET_FESTIVAL = data.festival;
/** The map condition that dresses the square with the stalls. */
export const MARKET_HOLD = data.hold;
export const MARKET_OPENS = parseTime(data.opens);
export const MARKET_CLOSES = parseTime(data.closes);
export const HAT_PRICE = data.hatmaker.price;
export const HAT_CYCLE: readonly string[] = data.hatmaker.hats;

export const isStall = (id: string): id is Stall =>
  (STALLS as readonly string[]).includes(id);

/**
 * The stall a `market-stall` service id names. Service names are unique on a
 * map, so a stall's second counter tile is `lantern-2`; both name one stall.
 */
export function stallOf(id: string): Stall | undefined {
  const base = id.replace(/-2$/, "");
  return isStall(base) ? base : undefined;
}

/** The stall's name, for the panel. */
export const stallName = (s: Stall): string => data[s].name;

/** Which evening of the market a game day is, 1 to 3, or 0 on any other day. */
export function marketEvening(day: number): number {
  const f = festivalToday(day);
  if (!f || f.id !== MARKET_FESTIVAL) return 0;
  return dateOf(day).dayOfSeason - f.day + 1;
}

/** The map conditions to hold so the stalls stand on the square: all three days, all day. */
export const marketHolds = (day: number): string[] =>
  marketEvening(day) > 0 ? [MARKET_HOLD] : [];

/** True from opening to midnight on a market evening. */
export const marketOpen = (day: number, minutes: number): boolean =>
  marketEvening(day) > 0 && minutes >= MARKET_OPENS && minutes < MARKET_CLOSES;

/** The hat sold on an evening of a year: nine hats over three years, three each. */
export function hatOf(evening: number, year: number): string {
  const i = (((Math.max(1, year) - 1) % 3) * 3 + (evening - 1)) % 9;
  return HAT_CYCLE[i]!;
}

function curioStock(evening: number): CounterEntry[] {
  const e = (
    data.curio.evenings as Record<
      string,
      { fireplace?: boolean; seeds?: boolean; extra?: CounterEntry[] }
    >
  )[String(evening)];
  if (!e) return [];
  const out: CounterEntry[] = [];
  if (e.seeds)
    for (const id of seedStock(data.curio.seedSeason as Season)) {
      const price = itemById(id)?.buyPrice;
      if (price !== undefined) out.push({ item: id, price });
    }
  if (e.fireplace) out.push({ ...data.curio.fireplace });
  out.push(...(e.extra ?? []).map((x) => ({ ...x })));
  return out;
}

/** The road trader's evening goods: 4 to 6 winter goods, seeded by the day, at the trader's markup. */
function traderStock(day: number): CounterEntry[] {
  const t = data.trader;
  const random = seeded(day * 6007 + 211);
  const pool = t.goods.filter((id) => itemById(id));
  const n = Math.min(
    pool.length,
    t.minItems + Math.floor(random() * (t.maxItems - t.minItems + 1)),
  );
  const picked: string[] = [];
  while (picked.length < n)
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  return picked
    .sort((a, b) => traderPrice(a) - traderPrice(b) || a.localeCompare(b))
    .map((item) => ({ item, price: traderPrice(item) }));
}

/** What a stall sells on a game day. Empty on a day that is not a market evening. */
export function marketStock(stall: Stall, day: number): CounterEntry[] {
  const evening = marketEvening(day);
  if (evening === 0) return [];
  switch (stall) {
    case "lantern":
      return data.lantern.stock.map((e) => ({ ...e }));
    case "curio":
      return curioStock(evening);
    case "trader":
      return traderStock(day);
    case "hatmaker":
      return [{ hat: hatOf(evening, dateOf(day).year), price: HAT_PRICE }];
  }
}

const same = (a: CounterEntry, b: CounterEntry): boolean =>
  a.item === b.item && a.hat === b.hat && a.price === b.price;

/** Why the stalls cannot be used now, or "" when the market is open. */
export function marketClosedLine(day: number, minutes: number): string {
  if (marketEvening(day) === 0)
    return "The stall stands empty. The market comes in Winter.";
  if (minutes < MARKET_OPENS)
    return `The stall is still being set out. The market opens at ${clockText(MARKET_OPENS)}.`;
  if (minutes >= MARKET_CLOSES) return "The stall has packed up for the night.";
  return "";
}

/**
 * Why the player cannot buy this line from a stall now, or undefined if they
 * can. A stall needs the market open and the player on the map, not the
 * festival's joined key.
 */
export function marketProblem(
  g: GameState,
  stall: Stall,
  e: CounterEntry,
): string | undefined {
  const day = g.day.clock.day;
  const closed = marketClosedLine(day, g.day.clock.minutes);
  if (closed) return closed;
  if (!marketStock(stall, day).some((s) => same(s, e)))
    return "That is not on sale here.";
  return entryProblem(g, e);
}

/** Buy a line from a stall. Returns false (nothing changed) if it cannot be bought. */
export function buyAtStall(
  g: GameState,
  stall: Stall,
  e: CounterEntry,
): boolean {
  if (marketProblem(g, stall, e) !== undefined) return false;
  return takeEntry(g, e);
}
