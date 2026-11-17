import gemData from "../content/gems.json";

/**
 * Gem nodes (`docs/design/69_geodes_and_minerals.md`, "Artifact spots and gem
 * nodes"). A gem node is a rock that takes a geode node's swings and drops one
 * gem. Six gems in three bands, the Glimmerstone rarest and deep only. Mining
 * level does not change the odds. Ids, prices and shares are placeholders. Pure rules.
 */
export interface GemDef {
  id: string;
  name: string;
  sellPrice: number;
  /** The first mine floor it can drop from. */
  minFloor: number;
  /** Mining experience for breaking the node. */
  xp: number;
  color: string;
  light: string;
}

export const GEMS = gemData.gems as GemDef[];
export const GLIMMERSTONE = gemData.glimmerstone;
/** The shrine's Diamond (`docs/design/83_grandpa_shrine.md`): a separate gem just below the Glimmerstone. Name and price are placeholders. */
export const DIAMOND = gemData.diamond;
/** Every gem item, the Diamond then the Glimmerstone last, so `items.ts` can list them. */
export const GEM_ITEMS: GemDef[] = [
  ...GEMS,
  { ...DIAMOND, minFloor: DIAMOND.fromFloor },
  { ...GLIMMERSTONE, minFloor: GLIMMERSTONE.fromFloor },
];
/** Share of Quarry rocks that are gem nodes (placeholder). */
export const QUARRY_GEM_SHARE = gemData.quarryShare;

const bandOf = (floor: number): number =>
  floor <= 40 ? 0 : floor <= 80 ? 1 : 2;

/** Share of a floor's rocks that are gem nodes, by band (placeholder). */
export function gemShare(floor: number): number {
  return gemData.shareByBand[bandOf(floor)]!;
}

/** The gem a node gives: the Glimmerstone rarely from floor 100, else one of the gems open at that depth. */
export function gemDrop(
  floor: number | undefined,
  random: () => number,
): string {
  if (floor !== undefined && floor >= GLIMMERSTONE.fromFloor)
    if (random() < GLIMMERSTONE.chance) return GLIMMERSTONE.id;
  const open = GEMS.filter((g) => g.minFloor <= (floor ?? 1));
  return open[Math.floor(random() * open.length)]!.id;
}

/** Mining experience for a node that gave this gem. */
export function gemXp(id: string): number {
  return GEM_ITEMS.find((g) => g.id === id)?.xp ?? GEMS[0]!.xp;
}

/**
 * Share of a floor's rocks that are Diamond nodes, in place of a stone (note 83,
 * decision 23): none above floor 50, 0.20 percent at floor 50, plus 0.0016 percent
 * a floor after it (0.28 percent at floor 100). Pure.
 */
export function diamondShare(floor: number): number {
  return floor < DIAMOND.fromFloor
    ? 0
    : DIAMOND.nodeShare +
        DIAMOND.nodeSharePerFloor * (floor - DIAMOND.fromFloor);
}

/**
 * Whether a beaten monster leaves a Diamond: 0.05 percent, and only once the
 * player has been below the bottom floor of the Ember Deeps (`deepest` is the
 * deepest floor reached). The Ember Deeps have no boss, so the bottom floor is
 * the gate (note 22, note 83 decision 23).
 */
export function monsterDiamond(deepest: number, random: () => number): boolean {
  return (
    deepest >= DIAMOND.monsterAfterFloor && random() < DIAMOND.monsterChance
  );
}
