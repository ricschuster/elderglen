import { dateOf } from "./calendar";

/**
 * Crop fertilizers (`docs/design/31_farm_growth.md`). Three lines as in
 * Stardew, first two tiers of quality and retaining and one speed tier. One
 * fertilizer per tilled tile, until the season ends. Pure rules.
 *
 * Quality levels and the speed bonus are from the saved Fertilizer page. The
 * retaining chances (33 and 66 percent) are from memory (SC-47).
 */
export type FertilizerLine = "quality" | "retaining" | "speed";

export interface FertilizerDef {
  id: string;
  name: string;
  line: FertilizerLine;
  /** Quality line: the soil quality level in the crop grade formula. */
  qualityLevel?: number;
  /** Retaining line: chance the soil is still watered next morning. */
  keepWet?: number;
  /** Speed line: extra growth per watered day, added to other bonuses. */
  growthBonus?: number;
  sellPrice: number;
  buyPrice: number;
  /** The shop sells it from this day (spring 15 of year 1 is day 15). */
  shopFromDay?: number;
  /** The shop sells it from this year of play. */
  shopFromYear?: number;
}

export const FERTILIZERS: readonly FertilizerDef[] = [
  {
    id: "basic-fertilizer",
    name: "Basic fertilizer",
    line: "quality",
    qualityLevel: 1,
    sellPrice: 2,
    buyPrice: 100,
    shopFromDay: 15,
  },
  {
    id: "quality-fertilizer",
    name: "Quality fertilizer",
    line: "quality",
    qualityLevel: 2,
    sellPrice: 10,
    buyPrice: 150,
    shopFromYear: 2,
  },
  {
    id: "speed-fertilizer",
    name: "Speed fertilizer",
    line: "speed",
    growthBonus: 0.1,
    sellPrice: 20,
    buyPrice: 100,
    shopFromDay: 15,
  },
  {
    id: "basic-retaining-soil",
    name: "Basic retaining soil",
    line: "retaining",
    keepWet: 0.33,
    sellPrice: 4,
    buyPrice: 100,
    shopFromDay: 15,
  },
  {
    id: "quality-retaining-soil",
    name: "Quality retaining soil",
    line: "retaining",
    keepWet: 0.66,
    sellPrice: 5,
    buyPrice: 150,
    shopFromYear: 2,
  },
];

export function fertilizerById(
  id: string | undefined,
): FertilizerDef | undefined {
  return FERTILIZERS.find((f) => f.id === id);
}

/** The soil quality level a plot's fertilizer adds, 0 for none. */
export function qualityLevelOf(id: string | undefined): number {
  return fertilizerById(id)?.qualityLevel ?? 0;
}

/** Fertilizer on sale on a day, as item ids. */
export function fertilizersOnSale(day: number): string[] {
  const { year } = dateOf(day);
  return FERTILIZERS.filter(
    (f) => day >= (f.shopFromDay ?? 0) && year >= (f.shopFromYear ?? 1),
  ).map((f) => f.id);
}
