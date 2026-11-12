import cartData from "../content/carts.json";
import herbData from "../content/herb-stall.json";
import type { Hall } from "./bundles";
import { WEEKDAYS } from "./calendar";
import { resolveMapId } from "./farmtypes";
import { itemById } from "./items";
import { minesOpen } from "./mines";
import type { GameState } from "./save";
import { seeded } from "./trader";
import { hasFlag, setFlag } from "./worldflags";

/**
 * What finishing a hall room gives, where the reward is a service and not an
 * item (`docs/design/16_bundles.md`, "Room rewards that did nothing", #871).
 * The hall records a finished room; each reward reads it here. Free of Phaser
 * and the DOM.
 */

// ---- the Hearth room: carts

export const CART_ROOM = "hearth";

/** Raised on the first night after the Hearth room is finished, so the carts run from the next morning. */
export const CARTS_RUNNING = "carts-running";

export interface CartStop {
  id: string;
  name: string;
  /** The map the stop is on. The farm's resolves to the farm type's own map. */
  map: string;
  /** The entry a rider steps off at. */
  entry: string;
  /** The stop is listed only once this holds. Only `mines-open` is known (the mine mouth). */
  requires?: "mines-open";
}

export const CART_STOPS = cartData.stops as CartStop[];

/** The service tile name of a stop on its map. */
export const cartServiceId = (stopId: string): string => `cart-${stopId}`;

/** True once the carts run: the morning after the Hearth room is done. */
export function cartsRunning(g: Pick<GameState, "flags">): boolean {
  return hasFlag(g, CARTS_RUNNING);
}

/**
 * The night's cart news: true once, on the first night after the Hearth room
 * is finished, then never again (Stardew's minecart opens the next day).
 */
export function cartNews(g: GameState): boolean {
  if (!g.hall.roomComplete(CART_ROOM) || hasFlag(g, CARTS_RUNNING))
    return false;
  setFlag(g, CARTS_RUNNING);
  return true;
}

/** The stop a cart service tile belongs to, from the tile's name. */
export function stopOfService(serviceId: string): CartStop | undefined {
  return CART_STOPS.find((s) => cartServiceId(s.id) === serviceId);
}

/**
 * The stops a rider can go to from a stop: every other one, except the mine mouth until the
 * mines open (owner, 2026-11-12). `day` is the game day; left out, every stop is listed.
 */
export function cartDestinations(
  fromStopId: string,
  day: number = Number.POSITIVE_INFINITY,
): CartStop[] {
  return CART_STOPS.filter(
    (s) =>
      s.id !== fromStopId && (s.requires !== "mines-open" || minesOpen(day)),
  );
}

/** The map and entry a rider arrives at, the farm resolved to this game's farm map. */
export function cartArrival(
  g: Pick<GameState, "farmType">,
  stop: CartStop,
): { map: string; entry: string } {
  return { map: resolveMapId(stop.map, g.farmType), entry: stop.entry };
}

/** What the cart says before the carts run. */
export const CART_IDLE_LINE =
  "An empty cart waits here, shafts up. Finish the Hearth room bundles at the village hall and it will run.";

// ---- the Foragers' Shelf: the herb stall

export const HERB_ROOM = "foragers-shelf";

export const HERB_MARKUP = herbData.markup;
export const HERB_GOODS: readonly string[] = herbData.goods;

/** True once the Foragers' Shelf is finished. Old Greencoat sets the stall up. */
export const herbStallOpen = (g: { hall: Hall }): boolean =>
  g.hall.roomComplete(HERB_ROOM);

/** The week of a day, counted from 0. */
export const weekOf = (day: number): number =>
  Math.floor((day - 1) / WEEKDAYS.length);

/** What the stall asks for one: 1.5 times sell value, rounded down. */
export const herbPrice = (id: string): number =>
  Math.floor((itemById(id)?.sellPrice ?? 0) * HERB_MARKUP);

/** The stall's goods for the week a day falls in: 3 to 5 of the list, the same all week. */
export function herbStock(day: number): string[] {
  const random = seeded(weekOf(day) * 6571 + 17);
  const pool = HERB_GOODS.filter((id) => itemById(id));
  const n = Math.min(
    pool.length,
    herbData.minItems +
      Math.floor(random() * (herbData.maxItems - herbData.minItems + 1)),
  );
  const picked: string[] = [];
  while (picked.length < n)
    picked.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  return picked.sort(
    (a, b) => herbPrice(a) - herbPrice(b) || a.localeCompare(b),
  );
}

/** Why the stall cannot be used, or "" when it can. */
export function herbStallProblem(g: { hall: Hall }): string {
  return herbStallOpen(g)
    ? ""
    : "A bare table. Finish the Foragers' Shelf bundles and Old Greencoat will set up a stall here.";
}

/** Buy n of a good from the stall. False when it is not on offer this week, too dear, or the pack is full. */
export function buyFromHerbStall(g: GameState, id: string, n = 1): boolean {
  if (herbStallProblem(g) || n <= 0) return false;
  if (!herbStock(g.day.clock.day).includes(id)) return false;
  const cost = herbPrice(id) * n;
  if (g.money < cost || !g.inventory.add(id, n)) return false;
  g.money -= cost;
  return true;
}

// ---- the Guests' Board: friendship

export const GUESTS_ROOM = "guests-board";

/** Raised once the Guests' Board bonus is paid, so it is paid once. */
export const GUESTS_PAID = "guests-board-paid";

/**
 * Pay the Guests' Board reward once its room is finished: +500 friendship with
 * everyone met who is not a candidate (note 61). Returns the ids that gained.
 * Empty when the room is not done or the bonus was paid already.
 */
export function payGuestsBoard(g: GameState): string[] {
  if (!g.hall.roomComplete(GUESTS_ROOM) || hasFlag(g, GUESTS_PAID)) return [];
  setFlag(g, GUESTS_PAID);
  return g.friendship.bundleBonus();
}
