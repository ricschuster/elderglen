import mahoganyData from "../content/mahogany.json";

/**
 * Mahogany trees (`docs/design/36_gathering_trees_sap_fiber.md`, "Mahogany").
 * A fourth common tree, planted by the player only: no wild Mahogany stands in
 * the valley. A mature tree gives Hardwood and no wood. The numbers are data in
 * `src/content/mahogany.json`. Pure rules, free of Phaser and the DOM.
 */
export const MAHOGANY_KIND = "mahogany";

/** The seed item. It plants a Mahogany tree. */
export const MAHOGANY_SEED = "mahogany-seed";
export const MAHOGANY_SEED_NAME: string = mahoganyData.seedName;
/** Placeholder sell price (note 07). */
export const MAHOGANY_SEED_PRICE: number = mahoganyData.seedSellPrice;

/** Hardwood from a felled mature tree. As Stardew (before the Forester bonus). */
export const MAHOGANY_HARDWOOD: number = mahoganyData.hardwood;
/** Chance a night that a seed or seedling grows a stage. As Stardew: 15 percent. */
export const MAHOGANY_STAGE_CHANCE: number = mahoganyData.stageChance;
/** Stage 4 takes twice as long. */
export const MAHOGANY_YOUNG_CHANCE: number = mahoganyData.youngChance;
/** Chance that a felled tree gives its one seed back (0 to 1 seeds). */
export const MAHOGANY_SEED_CHANCE: number = mahoganyData.seedChance;
/** Chance a Secret Woods daily stump gives a seed per chop. Placeholder (ours, note 36). */
export const STUMP_SEED_CHANCE: number = mahoganyData.stumpSeedChance;

/** The map that holds the daily stumps that can drop a Mahogany Seed. */
export const STUMP_SEED_AREA = "secret-woods";

/** Whether a tree is Mahogany. */
export const isMahogany = (t: { kind?: string } | undefined) =>
  t?.kind === MAHOGANY_KIND;

/**
 * The seed each tree kind drops and is planted from (note 36, SC-30): Maple seed, Acorn (the
 * oak's, kept as the old `tree-seed` id), Pine cone and Mahogany seed. The common oak and a
 * kind-less tree give `undefined` here, and callers fall back to `tree-seed`.
 */
const KIND_SEEDS: Readonly<Record<string, string>> = {
  maple: "maple-seed",
  pine: "pine-cone",
  [MAHOGANY_KIND]: MAHOGANY_SEED,
};
export const seedOfKind = (kind: string | undefined) =>
  kind === undefined ? undefined : KIND_SEEDS[kind];

/** The tree kind a seed grows into: undefined for the Acorn (the oak), and for non-seeds. */
export const kindOfSeed = (seed: string): string | undefined =>
  Object.entries(KIND_SEEDS).find(([, s]) => s === seed)?.[0];

/** Every seed that can be planted as a tree: the Acorn and the kind seeds. */
export const TREE_SEED_IDS: readonly string[] = [
  "tree-seed",
  ...Object.values(KIND_SEEDS),
];

/** Whether a fruit tree stands on the tile or any of the eight around it. */
export function fruitTreeNear(
  fruitTrees: { at(x: number, y: number): unknown },
  x: number,
  y: number,
): boolean {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (fruitTrees.at(x + dx, y + dy)) return true;
  return false;
}
