import { SEASONS, type Season } from "./calendar";
import { CROPS } from "./crops";
import { FRUIT_TREES, saplingId } from "./fruittrees";
import { HOMEWARD_PIN, itemById, seedId } from "./items";
import { RODS } from "./fishing";
import { POT_ITEM } from "./pots";
import { BAITS, LURES } from "./tackle";
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

/** Goods the shop sells once only, "available until purchased" (the Homeward pin). */
export const isOneOnly = (id: string): boolean => id === HOMEWARD_PIN;

/** Buy n of an item. Returns false if unbuyable, too dear, or no room. */
export function buy(
  inv: Inventory,
  wallet: Wallet,
  id: string,
  n = 1,
  /** A price that stands in for the listed one (a profession discount). */
  price?: number,
): boolean {
  const def = itemById(id);
  if (!def || def.buyPrice === undefined || n <= 0) return false;
  if (isOneOnly(id) && (n > 1 || inv.count(id) > 0)) return false;
  const cost = (price ?? def.buyPrice) * n;
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
 * Rods on sale, cheapest first. The fisher at the River delta sells them, with
 * the bait and lures (note 75), and the general store does not.
 */
export const rodStock = (): string[] => byPrice(RODS.map((r) => r.id));

/** Bait and lures on sale at the fisher, cheapest first. Salted Bait works at the sea, where she keeps her hut. */
export const tackleStock = (): string[] =>
  byPrice([...BAITS.map((b) => b.id), ...LURES.map((l) => l.id), POT_ITEM]);

/** Everything the fisher's counter sells. */
export const fisherStock = (): string[] => [...rodStock(), ...tackleStock()];

/** Thalwen's pin stall sells the Homeward pin only (note 09, #641). */
export const pinStock = (): string[] => [HOMEWARD_PIN];

import { fertilizerStock as allFertilizer } from "./fertilizer";

/** Fertilizer on sale, cheapest first. */
export const fertilizerStock = (day: number): string[] =>
  byPrice(allFertilizer(day));
