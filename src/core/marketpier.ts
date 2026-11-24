import data from "../content/market-pier.json";
import { dateOf } from "./calendar";
import { FESTIVALS, festivalToday } from "./festivals";
import { RARITY_WEIGHT, type Bite, type FishDef } from "./fishing";
import type { GameState } from "./save";

/**
 * The Winter Night Market pier (note 14, attractions 5 and 6, and note 21): a
 * paid permit to fish off the lit pier on the river arm, four market-only fish
 * and a pearl, floating a lantern for a small luck buff, and the road trader's
 * free hot drink. Pure rules; the scenes ask and show. Every number is a
 * placeholder in `src/content/market-pier.json`.
 *
 * State is day-keyed world flags (`worldflags.ts`), so no save change: the
 * permit, the float, the luck and the drink each belong to one market evening
 * and lapse on their own when the day number moves on.
 */
export const MARKET_PIER = data;
export const MARKET_FESTIVAL = data.festival;
export const PIER_KEEPER_KIND = "market-pier";
export const PIER_FLOAT_KIND = "market-float";
export const PIER_LINES = data.lines;

/** The market-only fish, kept out of `fish.json` (as the Frostfin is) so no bundle, tracker list or other water offers them. */
export const MARKET_FISH: FishDef[] = data.fish.map((f) => ({
  id: f.id,
  name: f.name,
  water: "river",
  seasons: ["winter"],
  time: "night",
  rarity: f.rarity as FishDef["rarity"],
  behaviour: f.behaviour as FishDef["behaviour"],
  difficulty: f.difficulty,
  sellPrice: f.sellPrice,
  length: f.length as [number, number],
}));

export const PEARL = data.pearl;

const marketFestival = () => FESTIVALS.find((f) => f.id === MARKET_FESTIVAL)!;

/** True on the three market days (Winter 16 to 18). */
export const isMarketDay = (day: number): boolean =>
  festivalToday(day)?.id === MARKET_FESTIVAL;

/** The evening the pier is running: a market day, from the opening (17:00) up to the pier's close (23:00). */
export const pierRunning = (day: number, minutes: number): boolean =>
  isMarketDay(day) &&
  minutes >= marketFestival().opens &&
  minutes < data.closesAt;

/** The minute the ordinary river fish are drawn at from the pier: the night odds (17:00 to 23:00). */
export const PIER_NIGHT_MINUTES = data.nightMinute;

/** True on a pier plank tile (the bank strip x 63, y 65 to 69, note 14 layout). */
export function isPierTile(x: number, y: number): boolean {
  const [lo, hi] = data.pier.y;
  return x === data.pier.x && y >= lo! && y <= hi!;
}

// ---- day-keyed keys (per player: each player's own permit, float, luck and drink, note 111 rule 9)

const hasFlag = (g: Pick<GameState, "festivalsJoined">, k: string): boolean =>
  g.festivalsJoined.includes(k);
const setFlag = (g: Pick<GameState, "festivalsJoined">, k: string): void => {
  if (!hasFlag(g, k)) g.festivalsJoined.push(k);
};

const permitKey = (day: number) => `market-permit:${day}`;
const floatKey = (day: number) => `market-float:${day}`;
const luckKey = (day: number) => `market-luck:${day}`;
const drinkKey = (day: number) => `market-drink:${day}`;
const pearlKey = (day: number) => `market-pearl:${dateOf(day).year}`;

export const hasPermit = (g: GameState): boolean =>
  hasFlag(g, permitKey(g.day.clock.day));

/** Why a permit cannot be bought now, or undefined if it can. */
export function permitProblem(g: GameState): string | undefined {
  const { day, minutes } = g.day.clock;
  if (!isMarketDay(day) || minutes < marketFestival().opens)
    return data.lines.shut;
  if (minutes >= data.closesAt) return data.lines.closed;
  if (hasPermit(g)) return data.lines.have;
  if (g.money < data.permitPrice) return data.lines.poor;
  return undefined;
}

/** Buy the evening's permit. Returns false (nothing changed) when it cannot be bought. */
export function buyPermit(g: GameState): boolean {
  if (permitProblem(g) !== undefined) return false;
  g.money -= data.permitPrice;
  setFlag(g, permitKey(g.day.clock.day));
  return true;
}

/**
 * Why a cast from this tile is refused, or undefined if it may go ahead. Only a
 * plank tile of the pier on a market evening is gated; fishing anywhere else is
 * unchanged.
 */
export function pierCastProblem(
  g: GameState,
  x: number,
  y: number,
): string | undefined {
  const { day, minutes } = g.day.clock;
  if (!isPierTile(x, y) || !isMarketDay(day)) return undefined;
  if (minutes < marketFestival().opens) return undefined;
  if (minutes >= data.closesAt) return data.lines.closed;
  return hasPermit(g) ? undefined : data.lines.noPermit;
}

/** True when a cast from this tile fishes the pier (a permit is held and the pier is open). */
export const isPierCast = (g: GameState, x: number, y: number): boolean =>
  isPierTile(x, y) &&
  pierRunning(g.day.clock.day, g.day.clock.minutes) &&
  hasPermit(g);

// ---- luck

/** True while a floated lantern's luck holds: until the morning. */
export const hasLuck = (g: GameState): boolean =>
  hasFlag(g, luckKey(g.day.clock.day));

/**
 * The luck buff's multiplier on the rare-bite weight (placeholder: there is no
 * wider luck system yet; it is read by the fishing bite roll only).
 */
export const luckRare = (g: GameState): number =>
  hasLuck(g) ? data.luckRare : 1;

/** Why a lantern cannot be floated now, or undefined if it can. */
export function floatProblem(g: GameState): string | undefined {
  const { day, minutes } = g.day.clock;
  if (!isMarketDay(day) || minutes < marketFestival().opens)
    return data.lines.shut;
  if (minutes >= data.closesAt) return data.lines.closed;
  if (hasFlag(g, floatKey(day))) return data.lines.floatDone;
  if (g.money < data.float.price) return "You cannot afford a lantern.";
  return undefined;
}

/** Float a lantern: pay, and hold a small luck buff until morning. Returns the keeper's line, or undefined when it cannot be done. */
export function floatLantern(g: GameState): string | undefined {
  if (floatProblem(g) !== undefined) return undefined;
  const day = g.day.clock.day;
  g.money -= data.float.price;
  setFlag(g, floatKey(day));
  setFlag(g, luckKey(day));
  return data.lines.floated;
}

// ---- the drink

/** Why the road trader's drink cannot be had now, or undefined if it can. */
export function drinkProblem(g: GameState): string | undefined {
  const { day, minutes } = g.day.clock;
  if (!isMarketDay(day) || minutes < marketFestival().opens)
    return data.lines.shut;
  if (hasFlag(g, drinkKey(day))) return data.lines.drinkDone;
  return undefined;
}

/**
 * The road trader's free hot drink, once an evening: a small energy buff. The
 * stall's scene calls this. Returns the line to show, whether or not the drink
 * was given (`given` says which).
 */
export function claimHotDrink(g: GameState): { given: boolean; line: string } {
  const problem = drinkProblem(g);
  if (problem) return { given: false, line: problem };
  g.day.energy.restore(data.drink.energy);
  setFlag(g, drinkKey(g.day.clock.day));
  return { given: true, line: data.lines.drink };
}

// ---- the bite

/**
 * At the pier a market fish sometimes bites in place of an ordinary fish,
 * weighted by rarity (a luck buff lifts the rare ones). Never on the tutorial
 * cast or in place of trash and finds.
 */
export function pierBite(
  b: Bite,
  tutorial: boolean,
  random: () => number,
  rareLift = 1,
): Bite {
  if (tutorial || b.kind !== "fish") return b;
  if (random() >= data.marketFishChance) return b;
  const weight = (f: FishDef) =>
    RARITY_WEIGHT[f.rarity] * (f.rarity === "rare" ? rareLift : 1);
  const total = MARKET_FISH.reduce((n, f) => n + weight(f), 0);
  let pick = random() * total;
  for (const f of MARKET_FISH) {
    pick -= weight(f);
    if (pick < 0) return { kind: "fish", fish: f };
  }
  return { kind: "fish", fish: MARKET_FISH[MARKET_FISH.length - 1]! };
}

/**
 * About 1 in 200 pier catches also turns up a pearl, a rare find. Puts it in the
 * pack, or at the player's feet if the pack is full. Returns true if found.
 */
export function rollPearl(
  g: GameState,
  at: { x: number; y: number },
  random: () => number,
): boolean {
  // One pearl for each player (note 111 rule 9), whatever the roll.
  const key = pearlKey(g.day.clock.day);
  if (hasFlag(g, key) || random() >= data.pearlChance) return false;
  setFlag(g, key);
  if (!g.inventory.add(PEARL.id)) g.ground.drop(at.x, at.y, PEARL.id, 1);
  return true;
}
