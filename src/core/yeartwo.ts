import yearTwoData from "../content/year-two.json";
import { DAYS_PER_SEASON, SEASONS, dateOf } from "./calendar";
import { ANIMAL_CATALOGUE, ANIMAL_CATALOGUE_PRICE, itemById } from "./items";
import type { GameState } from "./save";

/**
 * Year two rules (`docs/design/112_year_two.md`). Shop rows gated by a year of play
 * (`fromYear`), the raw material price rise on Spring 1 of year 2, and the harder set
 * that opens once the Last Seat is done. Data is `src/content/year-two.json`. Pure rules.
 */
export interface ShopGate {
  id: string;
  fromYear: number;
}

export interface RawPrice {
  id: string;
  year1: number;
  year2: number;
}

export const SHOP_GATES = yearTwoData.gates as ShopGate[];
export const RAW_PRICES = yearTwoData.raw as RawPrice[];

/** Spring 1 of year 2, counted in days from Spring 1 of year 1 (day 1). */
export const YEAR_TWO_DAY = DAYS_PER_SEASON * SEASONS.length + 1;

/** The request board's counts after the Last Seat, rounded up (note 112 rule 6). */
export const HARD_REQUEST_FACTOR = yearTwoData.requestFactor;

/** True when a shop row may be sold on a day: ungated rows always, gated ones from their year. */
export function rowOpen(id: string, day: number): boolean {
  const gate = SHOP_GATES.find((r) => r.id === id);
  return !gate || dateOf(day).year >= gate.fromYear;
}

/** The carpenter's or smith's raw good, if the price rise applies to it. */
export const rawPriceOf = (id: string): RawPrice | undefined =>
  RAW_PRICES.find((r) => r.id === id);

/**
 * What a shop asks for one of `id` on a day. Raw materials step up in year two; every
 * other good keeps its listed price. Undefined when the good is not for sale.
 */
export function buyPriceOn(id: string, day: number): number | undefined {
  const raw = rawPriceOf(id);
  if (raw) return dateOf(day).year >= 2 ? raw.year2 : raw.year1;
  return itemById(id)?.buyPrice;
}

/** The notice that comes on Spring 1 of year 2 (placeholder text). */
export const PRICE_RISE_LETTER = "price-rise-letter";

/** Why the Animal Catalogue cannot be bought now, or undefined if it can. */
export function catalogueProblem(g: GameState): string | undefined {
  if (!rowOpen(ANIMAL_CATALOGUE, g.day.clock.day))
    return "It is not in yet. Ask again next year.";
  if (g.inventory.count(ANIMAL_CATALOGUE) > 0)
    return "You carry the catalogue already.";
  if (g.money < ANIMAL_CATALOGUE_PRICE) return "You cannot afford it.";
  return undefined;
}

/** Buy the Animal Catalogue at the farmstead, once. Returns an error line, or undefined when bought. */
export function buyCatalogue(g: GameState): string | undefined {
  const why = catalogueProblem(g);
  if (why !== undefined) return why;
  if (!g.inventory.add(ANIMAL_CATALOGUE, 1)) return "Your pack is full.";
  g.money -= ANIMAL_CATALOGUE_PRICE;
  return undefined;
}

/** True once the Last Seat is done, so the harder orders and request counts open. */
export const afterLastSeat = (g: GameState): boolean => g.hall.bridgeMended;

/** A request count after the Last Seat: x1.5, rounded up. */
export const hardCount = (n: number): number =>
  Math.ceil(n * HARD_REQUEST_FACTOR);
