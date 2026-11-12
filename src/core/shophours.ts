import { clockText } from "./clock";
import { festivalDayToday } from "./festivals";
import type { GameState } from "./save";
import { SHOPS, dayContext, shopState, type ShopState } from "./villagers";

/**
 * Shop hours and festival closures at the counters and doors (note 79 "Shop
 * hours", note 77). The hours data and `shopState` already existed; this ties
 * them to the map's counters and shop doors. Pure rules, no Phaser.
 */

/** Counter service kind on a map, to the shop whose hours it keeps. */
const COUNTERS: Record<string, string> = {
  "general-store:shop": "store",
  "smithy:smithy": "smithy",
  "forge:smith": "forge",
  "sawmill:carpenter": "sawmill",
  "hatter:counter-hatter": "hatter",
  "library:counter-library": "library",
  "healer:counter-healer": "healer",
  "inn:counter-inn": "inn",
  "outpost:counter-outpost": "outpost",
  "forest-farmstead:keeper": "farmstead",
  "fisher-hut:fisher-shop": "delta-fisher",
  "beach-elf-house:pin-stall": "beach-stall",
};

/** A Hearthwell lot's exit id to the shop whose door hours it keeps. */
const DOORS: Record<string, string> = {
  "general-store": "store",
  smithy: "smithy",
  sawmill: "sawmill",
  hatter: "hatter",
  library: "library",
  healer: "healer",
  inn: "inn",
  outpost: "outpost",
};

/** The shop whose hours a counter keeps, if any. */
export const counterShopId = (
  mapId: string,
  kind: string,
): string | undefined => COUNTERS[`${mapId}:${kind}`];

function stateOf(g: GameState, shopId: string): ShopState | undefined {
  const shop = SHOPS.find((s) => s.id === shopId);
  if (!shop) return undefined;
  const clock = g.day.clock;
  const ctx = dayContext(clock.day, g.weather);
  const f = festivalDayToday(clock.day);
  const festival = !!f && clock.minutes >= f.opens && clock.minutes < f.closes;
  return shopState(shop, ctx.weekday, g.weather, clock.minutes, {
    hallDone: g.hall.bridgeMended,
    festival,
  });
}

const shutLine = (g: GameState, shopId: string, state: ShopState): string => {
  const shop = SHOPS.find((s) => s.id === shopId)!;
  const name = shop.name.toLowerCase();
  const clock = g.day.clock;
  const f = festivalDayToday(clock.day);
  if (f && clock.minutes >= f.opens && clock.minutes < f.closes)
    return `The ${name} is shut for the ${f.name}.`;
  if (state === "door")
    return `The ${name} counter is shut. Only the door is open.`;
  if (dayContext(clock.day, g.weather).weekday === shop.closedDay)
    return `The ${name} is shut today.`;
  if (clock.minutes < shop.open)
    return `The ${name} opens at ${clockText(shop.open)}.`;
  return `The ${name} is shut for the day.`;
};

/** Why a counter cannot be used now ("" when it can, or when it keeps no hours). */
export function counterShutLine(
  g: GameState,
  mapId: string,
  kind: string,
): string {
  const id = counterShopId(mapId, kind);
  if (!id) return "";
  const state = stateOf(g, id);
  return !state || state === "open" ? "" : shutLine(g, id, state);
}

/** Why a Hearthwell shop door cannot be opened now ("" when it can). */
export function doorShutLine(g: GameState, exitId: string): string {
  const id = DOORS[exitId];
  if (!id) return "";
  const state = stateOf(g, id);
  return !state || state !== "closed" ? "" : shutLine(g, id, state);
}
