import traderData from "../content/trader.json";
import { WEEKDAYS } from "./calendar";
import { clockText } from "./clock";
import { dayContext, parseTime, type Weekday } from "./villagers";
import { itemById } from "./items";
import type { GameState } from "./save";

/**
 * The road trader (note 57, numbers in note 07). He keeps a stall in the
 * Outpost's yard on fixed days, sells 4 to 6 things drawn from a data table by
 * the day's seed, at 1.5 times sell value, and cannot be talked to. Pure rules.
 */
export const TRADER_DAYS = traderData.visitDays as Weekday[];
export const TRADER_OPEN = parseTime(traderData.opens);
export const TRADER_CLOSE = parseTime(traderData.closes);
export const TRADER_MARKUP = traderData.markup;
export const TRADER_GOODS: readonly string[] = traderData.goods;

/** A small seeded generator, so a visit has the same stock on every reload. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** True on a day (1 based) the trader is in town. Weather does not stop him. */
export const traderHere = (day: number): boolean =>
  TRADER_DAYS.includes(dayContext(day, "sunny").weekday);

/** Days from `day` (0 means today) to the trader's next visit. */
export function daysToTrader(day: number): number {
  for (let n = 0; n < WEEKDAYS.length; n++) if (traderHere(day + n)) return n;
  return 0;
}

/** The goods on his stall on a day: 4 to 6 of the table, the same all day. Empty when he is away. */
export function traderStock(day: number): string[] {
  if (!traderHere(day)) return [];
  const random = seeded(day * 7919 + 101);
  const pool = TRADER_GOODS.filter((id) => itemById(id));
  const n = Math.min(
    pool.length,
    traderData.minItems +
      Math.floor(random() * (traderData.maxItems - traderData.minItems + 1)),
  );
  const picked: string[] = [];
  while (picked.length < n) {
    const id = pool.splice(Math.floor(random() * pool.length), 1)[0]!;
    picked.push(id);
  }
  return picked.sort(
    (a, b) => traderPrice(a) - traderPrice(b) || a.localeCompare(b),
  );
}

/** What he asks for one: 1.5 times sell value, rounded down. */
export const traderPrice = (id: string): number =>
  Math.floor((itemById(id)?.sellPrice ?? 0) * TRADER_MARKUP);

/** Why the stall cannot be used now, or "" when it can. */
export function traderProblem(day: number, minutes: number): string {
  if (!traderHere(day)) {
    const n = daysToTrader(day);
    return `The stall yard is empty. The road trader comes again in ${n} day${n === 1 ? "" : "s"}.`;
  }
  if (minutes < TRADER_OPEN)
    return `The road trader is still setting out his stall. He opens at ${clockText(TRADER_OPEN)}.`;
  if (minutes >= TRADER_CLOSE)
    return "The road trader has packed up for the night.";
  return "";
}

/** Buy n of a good from the stall. Returns false when it is not on offer, too dear, or the pack is full. */
export function buyFromTrader(g: GameState, id: string, n = 1): boolean {
  const day = g.day.clock.day;
  if (traderProblem(day, g.day.clock.minutes) || n <= 0) return false;
  if (!traderStock(day).includes(id)) return false;
  const cost = traderPrice(id) * n;
  if (g.money < cost || !g.inventory.add(id, n)) return false;
  g.money -= cost;
  return true;
}
