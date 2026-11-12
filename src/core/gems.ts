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
/** Every gem item, the Glimmerstone last, so `items.ts` can list them. */
export const GEM_ITEMS: GemDef[] = [
  ...GEMS,
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
