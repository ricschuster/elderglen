// What each counter sells and how a purchase runs, shared by the shop screen (single player and
// host) and the host's judging of a guest's `buy` intent (note 108, group 1). Free of Phaser and
// the DOM. Everything acts as the local player (`asPlayer` sets who that is).
import { BOUQUET, TOKEN, buyToken, sellerStock, tokenPrice } from "./courtship";
import {
  HERMIT_ELDERFRUIT_PRICE,
  SOURCE_FLAGS,
  buyElderfruit,
  hermitStock,
} from "./elderfruit";
import { itemById } from "./items";
import { potPrice } from "./professions";
import { POT_ITEM } from "./pots";
import { buyFromHerbStall, herbPrice, herbStock } from "./roomrewards";
import type { GameState } from "./save";
import {
  buy,
  fertilizerStock,
  fisherStock,
  isOneOnly,
  pinStock,
  saplingStock,
  seedStock,
} from "./shop";
import { dateOf } from "./calendar";
import { buyFromTrader, traderPrice, traderStock } from "./trader";

/** The special counters a shop screen can show; absent is the general store. */
export type ShopStock =
  "fisher" | "pin" | "trader" | "hermit" | "herb" | "rain";

export const SHOP_STOCKS: readonly string[] = [
  "fisher",
  "pin",
  "trader",
  "hermit",
  "herb",
  "rain",
];

export const isShopStock = (v: unknown): v is ShopStock =>
  typeof v === "string" && SHOP_STOCKS.includes(v);

/** The price of one: the listed price, less the Trapper's pot discount. */
export function unitPrice(g: GameState, id: string): number {
  const base = itemById(id)?.buyPrice ?? 0;
  return id === POT_ITEM ? potPrice(g.skills, base) : base;
}

/** The ids a counter offers today, in shelf order. */
export function offerIds(g: GameState, stock?: ShopStock): string[] {
  const day = g.day.clock.day;
  switch (stock) {
    case "herb":
      return herbStock(day);
    case "rain":
      return sellerStock();
    case "trader":
      return traderStock(day);
    case "hermit":
      return hermitStock(g);
    case "pin":
      return pinStock();
    case "fisher":
      return fisherStock();
    default:
      return [
        ...seedStock(dateOf(day).season, day),
        ...saplingStock(),
        ...fertilizerStock(day),
        BOUQUET,
      ];
  }
}

/** What the counter asks for one of `id`. */
export function offerPrice(
  g: GameState,
  stock: ShopStock | undefined,
  id: string,
): number {
  switch (stock) {
    case "herb":
      return herbPrice(id);
    case "rain":
      return tokenPrice();
    case "trader":
      return traderPrice(id);
    case "hermit":
      return HERMIT_ELDERFRUIT_PRICE;
    default:
      return unitPrice(g, id);
  }
}

/** Why a purchase was refused, in words for the player. */
export function buyRefusal(g: GameState, id: string, n: number): string {
  const price = unitPrice(g, id);
  if (isOneOnly(id) && (n > 1 || g.inventory.count(id) > 0))
    return "She only has the one, and you carry it already.";
  if (id === TOKEN && g.inventory.count(id) > 0)
    return "You carry one already. Give it to someone first.";
  if (g.money < price * n) return "Not enough money.";
  return "Your backpack is full.";
}

/**
 * Buy `n` of `id` at a counter, for the local player. Returns a refusal in words, or undefined
 * once bought. A one-off stock (the hermit's elderfruit, a market line with `once`) is a world
 * flag, so once one player has it the counter is bare for everyone (note 108 rule 5).
 */
export function shopBuy(
  g: GameState,
  stock: ShopStock | undefined,
  id: string,
  n: number,
): string | undefined {
  if (!offerIds(g, stock).includes(id)) return "That is not on sale here.";
  const price = offerPrice(g, stock, id);
  if (stock === "hermit") return buyElderfruit(g, SOURCE_FLAGS.hermit, price);
  const ok =
    stock === "herb"
      ? buyFromHerbStall(g, id, n)
      : stock === "rain"
        ? n === 1 && buyToken(g)
        : stock === "trader"
          ? buyFromTrader(g, id, n)
          : buy(g.inventory, g, id, n, price);
  return ok ? undefined : buyRefusal(g, id, n);
}
