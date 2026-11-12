import forgeData from "../content/forge.json";
import { comboId, comboParts, isCombo, ringById, RINGS } from "./equipment";
import type { Inventory } from "./inventory";
import { itemById } from "./items";

/**
 * The forge (`docs/design/95_forge_enchanting.md`). Ring 1 builds only ring
 * combining and unforging: two different rings become one ring that stacks
 * both effects. The cost and currency are data (`forge.json`), so the switch to
 * a Cinder Shard equivalent at M5 is a data change. Gem forging and enchanting
 * wait for ring 2 or 3. Free of Phaser.
 */
export const FORGE_CURRENCY = forgeData.forgeCurrency;
export const COMBINE_COST = forgeData.combineCost;
export const UNFORGE_RETURN = Math.floor(
  COMBINE_COST * forgeData.unforgeReturnShare,
);

/** Why two rings cannot be combined, or undefined when they can. */
export function combineProblem(
  inv: Inventory,
  a: string,
  b: string,
): string | undefined {
  if (!ringById(a) || !ringById(b)) return "That is not a ring.";
  if (isCombo(a) || isCombo(b))
    return "A combined ring cannot be combined again.";
  if (a === b) return "Two of the same ring cannot be combined.";
  if (inv.count(a) < 1 || inv.count(b) < 1)
    return "You need both rings in your pack.";
  const cost = inv.count(FORGE_CURRENCY);
  if (cost < COMBINE_COST)
    return `You need ${COMBINE_COST} ${itemById(FORGE_CURRENCY)?.name.toLowerCase() ?? "ore"}.`;
  return undefined;
}

/**
 * Combine two different base rings into one for the ore cost. Returns the new
 * ring's id, or a reason string when it cannot. All or nothing.
 */
export function combineRings(
  inv: Inventory,
  a: string,
  b: string,
): { ok: true; id: string } | { ok: false; reason: string } {
  const reason = combineProblem(inv, a, b);
  if (reason) return { ok: false, reason };
  const id = comboId(a, b);
  inv.remove(a, 1);
  inv.remove(b, 1);
  inv.remove(FORGE_CURRENCY, COMBINE_COST);
  if (!inv.add(id, 1)) {
    // Cannot happen (two stacks freed), but never lose the rings.
    inv.add(a, 1);
    inv.add(b, 1);
    inv.add(FORGE_CURRENCY, COMBINE_COST);
    return { ok: false, reason: "Your pack is full." };
  }
  return { ok: true, id };
}

/** Split a combined ring back into its two rings, free, returning half the ore. */
export function unforgeRing(
  inv: Inventory,
  id: string,
): { ok: true } | { ok: false; reason: string } {
  const parts = comboParts(id);
  if (!parts) return { ok: false, reason: "That ring is not combined." };
  if (inv.count(id) < 1) return { ok: false, reason: "You do not have it." };
  inv.remove(id, 1);
  const back: [string, number][] = [
    [parts[0], 1],
    [parts[1], 1],
    [FORGE_CURRENCY, UNFORGE_RETURN],
  ];
  const added: [string, number][] = [];
  for (const [item, n] of back) {
    if (n > 0 && !inv.add(item, n)) {
      for (const [i, c] of added) inv.remove(i, c);
      inv.add(id, 1);
      return { ok: false, reason: "Your pack is full." };
    }
    added.push([item, n]);
  }
  return { ok: true };
}

/** The base rings in the pack, then the combined ones, for the forge menu. */
export function packRings(inv: Inventory): {
  combos: string[];
  base: string[];
} {
  const base = RINGS.filter((r) => inv.count(r.id) > 0).map((r) => r.id);
  const combos: string[] = [];
  for (let i = 0; i < inv.size; i++) {
    const s = inv.slot(i);
    if (s && isCombo(s.id) && !combos.includes(s.id)) combos.push(s.id);
  }
  return { combos, base };
}
