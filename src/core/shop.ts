import { SEASONS, type Season } from "./calendar";
import { CROPS } from "./crops";
import { FRUIT_TREES, saplingId } from "./fruittrees";
import { itemById, seedId } from "./items";
import { RODS } from "./fishing";
import type { Inventory } from "./inventory";

export interface Wallet {
  money: number;
}

/** Sell n of an item. Returns the money earned, or 0 if it cannot be sold. */
export function sell(
  inv: Inventory,
  wallet: Wallet,
  id: string,
  n = 1,
  multiplier = 1,
): number {
  const def = itemById(id);
  if (!def || def.keep || !inv.remove(id, n)) return 0;
  const earned = Math.floor(def.sellPrice * multiplier) * n;
  wallet.money += earned;
  return earned;
}

/** Buy n of an item. Returns false if unbuyable, too dear, or no room. */
export function buy(
  inv: Inventory,
  wallet: Wallet,
  id: string,
  n = 1,
): boolean {
  const def = itemById(id);
  if (!def || def.buyPrice === undefined || n <= 0) return false;
  const cost = def.buyPrice * n;
  if (wallet.money < cost || !inv.add(id, n)) return false;
  wallet.money -= cost;
  return true;
}

/** Sell every unit of an item. Returns the money earned. */
export function sellAll(
  inv: Inventory,
  wallet: Wallet,
  id: string,
  multiplier = 1,
): number {
  return sell(inv, wallet, id, inv.count(id), multiplier);
}

/** Cheapest first, then by name, so a shelf reads in a steady order. */
export function byPrice(ids: string[]): string[] {
  const def = (id: string) => itemById(id);
  return [...ids].sort(
    (a, b) =>
      (def(a)?.buyPrice ?? 0) - (def(b)?.buyPrice ?? 0) ||
      (def(a)?.name ?? a).localeCompare(def(b)?.name ?? b),
  );
}

/** A to Z by name, for the lists of what the player holds. */
export function byName(ids: string[]): string[] {
  return [...ids].sort((a, b) =>
    (itemById(a)?.name ?? a).localeCompare(itemById(b)?.name ?? b),
  );
}

/** Seeds on sale in a season: those of crops that grow in it, cheapest first. */
export function seedStock(season: Season): string[] {
  return byPrice(
    CROPS.filter((c) => c.seasons.includes(season)).map((c) => seedId(c.id)),
  );
}

/** Saplings on sale: every tree, all year, as Stardew's Pierre does. Cheapest first. */
export function saplingStock(): string[] {
  return byPrice(
    FRUIT_TREES.filter((t) =>
      (SEASONS as readonly string[]).includes(t.season),
    ).map((t) => saplingId(t.id)),
  );
}

/**
 * Rods on sale, cheapest first. A stand in for the fisher at the River delta
 * (note 21), who does not exist yet: the general store sells them until she does.
 */
export const rodStock = (): string[] => byPrice(RODS.map((r) => r.id));

import { fertilizerStock as allFertilizer } from "./fertilizer";

/** Fertilizer on sale, cheapest first. */
export const fertilizerStock = (day: number): string[] =>
  byPrice(allFertilizer(day));
