import type { BundleDef, Hall } from "../src/core/bundles";
import type { Inventory } from "../src/core/inventory";
import type { Wallet } from "../src/core/shop";

/** The stack id that fills a bundle slot: the good, at its minimum quality. */
export const slotStack = (item: BundleDef["items"][number]) => {
  const id = item.anyOf?.[0] ?? item.id;
  return item.minQuality === "normal" ? id : `${id}@${item.minQuality}`;
};

/**
 * Hand a bundle in full, one good at a time, conjuring each good first. Fills
 * the first `required` slots, which is all the rule asks for.
 */
export function fillBundle(
  hall: Hall,
  inv: Inventory,
  wallet: Wallet,
  bundle: BundleDef,
): void {
  for (const item of bundle.items) {
    for (let n = 0; n < item.count; n++) {
      if (hall.complete(bundle.id)) return;
      const stack = slotStack(item);
      // The rewards pile up in the pack, so the helper grows it as a player would.
      inv.grow(inv.size + 1);
      inv.add(stack);
      hall.handIn(inv, wallet, bundle.id, stack);
    }
  }
}

/** Fill every bundle in the hall, in file order so the soft gate opens as it goes. */
export function fillHall(hall: Hall, inv: Inventory, wallet: Wallet): void {
  for (const b of hall.bundles) fillBundle(hall, inv, wallet, b);
}
