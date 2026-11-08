import type { Outcome } from "./actions";
import geodeData from "../content/geodes.json";
import type { GameState } from "./save";

/**
 * Geodes (`docs/design/22_mines.md`, "Geodes, gems and found things"). A geode
 * is dug from a node. The smith dwarf cracks it for a small fee into a stone,
 * ore, a gem or a found thing. Outcomes are data in `src/content/geodes.json`
 * and are placeholders: the gem list and the found things are unwritten, and
 * the Glimmerstone is for floors 100 to 120 only. Pure rules.
 */
export const GEODE = geodeData.geode.id;
/** What the smith charges to crack one. Stardew's is 25g, from memory. */
export const CRACK_FEE = geodeData.fee;
/** Share of rocks that are geode nodes on floors 1 to 10 (placeholder). */
export const GEODE_SHARE = 0.05;
/**
 * The other geode kinds are items with sell prices only (SC-67). Where each
 * drops and what it cracks into is unsettled, so they do not drop yet and the
 * smith cracks only the plain geode.
 */
/** Items only geodes give, so `items.ts` can list them. */
export const GEODE_ITEMS: { id: string; name: string; sellPrice: number }[] = [
  geodeData.geode,
  ...geodeData.kinds,
  ...geodeData.items,
];

interface Outcome_ {
  item: string;
  min: number;
  max: number;
  weight: number;
}

const OUTCOMES = geodeData.outcomes as Outcome_[];

/** What a geode gives, given the roll. Pure. */
export function crackResult(random: () => number): {
  item: string;
  count: number;
} {
  const total = OUTCOMES.reduce((n, o) => n + o.weight, 0);
  let roll = random() * total;
  const hit = OUTCOMES.find((o) => (roll -= o.weight) < 0) ?? OUTCOMES[0]!;
  return {
    item: hit.item,
    count: hit.min + Math.floor(random() * (hit.max - hit.min + 1)),
  };
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

/** The smith cracks one geode from the backpack for the fee. */
export function crackGeode(
  g: GameState,
  random: () => number = Math.random,
): Outcome & { count?: number } {
  if (g.inventory.count(GEODE) < 1) return fail("no geode");
  if (g.money < CRACK_FEE) return fail("not enough money");
  const before = g.inventory.save();
  g.inventory.remove(GEODE, 1);
  const r = crackResult(random);
  if (!g.inventory.add(r.item, r.count)) {
    g.inventory.load(before);
    return fail("backpack full");
  }
  g.money -= CRACK_FEE;
  return { ok: true, item: r.item, count: r.count };
}
