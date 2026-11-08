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
/** The other geode kinds are items with a drop band and a contents pool each (note 69). */
export const FROZEN_GEODE = "frozen-geode";
export const MAGMA_GEODE = "magma-geode";
export const OMNI_GEODE = "omni-geode";
export const GEODE_KINDS = [GEODE, FROZEN_GEODE, MAGMA_GEODE, OMNI_GEODE];

export interface GeodeItem {
  id: string;
  name: string;
  sellPrice: number;
  /** Icon colours for the placeholder art. */
  color?: string;
  light?: string;
}

/** Items only geodes give, so `items.ts` can list them. */
export const GEODE_ITEMS: GeodeItem[] = [
  geodeData.geode,
  ...geodeData.kinds,
  ...geodeData.items,
];

interface Pool {
  kind: string;
  floors: [number, number];
  artifact: { item: string; chance: number };
  foraged: { item: string; chance: number };
  minerals: string[];
  mineralChance: number;
  ores: { item: string; minFloor: number; weight: number }[];
}

const POOLS = geodeData.pools as Pool[];
const HEARTHSILVER = "hearthsilver-ore";

/** The geode kind that drops on a mine floor: plain to 40, Frozen to 80, Magma beyond (note 69). */
export function geodeKindForFloor(floor: number): string {
  return (
    POOLS.find((p) => floor <= p.floors[1])?.kind ??
    POOLS[POOLS.length - 1]!.kind
  );
}

/** The geode a broken node gives on a mine floor: the band's kind, or rarely an Omni from floor 21 on. Pure. */
export function geodeDrop(
  floor: number | undefined,
  random: () => number,
): string {
  if (floor === undefined) return GEODE;
  if (floor >= geodeData.omni.fromFloor && random() < geodeData.omni.chance)
    return OMNI_GEODE;
  return geodeKindForFloor(floor);
}

const pickWeighted = <T>(
  list: T[],
  weight: (t: T) => number,
  random: () => number,
): T => {
  const total = list.reduce((n, t) => n + weight(t), 0);
  let roll = random() * total;
  return list.find((t) => (roll -= weight(t)) < 0) ?? list[0]!;
};

const amount = (
  a: { counts: number[]; weights: number[] },
  random: () => number,
): number => {
  const i = pickWeighted(
    a.counts.map((_, i) => i),
    (i) => a.weights[i]!,
    random,
  );
  return a.counts[i]!;
};

function crackPool(
  pool: Pool,
  deepest: number,
  random: () => number,
): { item: string; count: number } {
  if (random() < pool.artifact.chance)
    return { item: pool.artifact.item, count: 1 };
  if (random() < pool.foraged.chance)
    return { item: pool.foraged.item, count: 1 };
  for (const m of pool.minerals)
    if (random() < pool.mineralChance) return { item: m, count: 1 };
  const res = geodeData.resources;
  const r = random();
  if (r < res.stoneChance)
    return { item: "stone", count: random() < 0.5 ? 1 : 2 };
  if (r < res.stoneChance + res.clayChance) return { item: res.clay, count: 1 };
  const ores = pool.ores.filter((o) => Math.max(deepest, 1) >= o.minFloor);
  const ore = pickWeighted(ores, (o) => o.weight, random);
  const counts =
    ore.item === HEARTHSILVER
      ? geodeData.hearthsilverAmounts
      : geodeData.oreAmounts;
  return { item: ore.item, count: amount(counts, random) };
}

/**
 * What cracking a geode gives. `deepest` is the deepest mine floor reached: it
 * gates iron after floor 26 and gold after floor 76 as Stardew gates by level.
 * An Omni geode draws from every pool. Pure, given the rolls.
 */
export function crackResult(
  random: () => number,
  kind: string = GEODE,
  deepest = 0,
): { item: string; count: number } {
  const pool =
    kind === OMNI_GEODE
      ? POOLS[Math.min(POOLS.length - 1, Math.floor(random() * POOLS.length))]!
      : (POOLS.find((p) => p.kind === kind) ?? POOLS[0]!);
  return crackPool(pool, deepest, random);
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

/** The smith cracks one geode of a kind from the backpack for the fee. */
export function crackGeode(
  g: GameState,
  random: () => number = Math.random,
  kind: string = GEODE,
): Outcome & { count?: number } {
  if (g.inventory.count(kind) < 1) return fail("no geode");
  if (g.money < CRACK_FEE) return fail("not enough money");
  const before = g.inventory.save();
  g.inventory.remove(kind, 1);
  const r = crackResult(random, kind, g.mines.deepest);
  if (!g.inventory.add(r.item, r.count)) {
    g.inventory.load(before);
    return fail("backpack full");
  }
  g.money -= CRACK_FEE;
  return { ok: true, item: r.item, count: r.count };
}
