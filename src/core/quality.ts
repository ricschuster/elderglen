/** Quality tiers, as in Stardew. Normal goods carry no suffix on their id. */
export const QUALITIES = ["normal", "silver", "gold"] as const;
export type Quality = (typeof QUALITIES)[number];

/** Sell price multiplier per tier. From memory. */
export const QUALITY_MULTIPLIER: Record<Quality, number> = {
  normal: 1,
  silver: 1.25,
  gold: 1.5,
};

/** Energy multiplier when eaten, per tier. From memory. */
export const ENERGY_MULTIPLIER: Record<Quality, number> = {
  normal: 1,
  silver: 1.4,
  gold: 1.8,
};

const SEP = "@";

/** The item id of a good at a quality: `parsnip`, `parsnip@silver`. */
export function withQuality(baseId: string, quality: Quality): string {
  return quality === "normal" ? baseId : `${baseId}${SEP}${quality}`;
}

/** Split an item id into its base id and quality. Unknown suffixes are normal. */
export function splitQuality(id: string): { base: string; quality: Quality } {
  const at = id.indexOf(SEP);
  if (at < 0) return { base: id, quality: "normal" };
  const q = id.slice(at + 1) as Quality;
  return QUALITIES.includes(q)
    ? { base: id.slice(0, at), quality: q }
    : { base: id, quality: "normal" };
}

/**
 * Crop quality from farming level and the soil's fertilizer level, after
 * Stardew: a gold chance of 0.2 * level / 10 + 0.2 * soil * (level + 2) / 12
 * + 0.01 (matches the saved Fertilizer page's table), then silver at twice
 * that chance.
 */
export function cropQuality(level: number, roll: number, soil = 0): Quality {
  const gold = (0.2 * level) / 10 + (0.2 * soil * (level + 2)) / 12 + 0.01;
  if (roll < gold) return "gold";
  if (roll < gold * 2) return "silver";
  return "normal";
}

/** Forage quality from foraging level: gold at level / 30, silver at level / 15. From memory. */
export function forageQuality(level: number, roll: number): Quality {
  if (roll < level / 30) return "gold";
  if (roll < level / 15) return "silver";
  return "normal";
}

/**
 * Animal product quality (note 23, after Stardew): a score of friendship / 1000
 * minus (1 - mood / 225). Below 150 mood a product is always normal. Above it,
 * a score over 0.5 is silver and over 0.75 is gold. No iridium tier exists here.
 */
export function animalQuality(friendship: number, mood: number): Quality {
  if (mood < 150) return "normal";
  const score = friendship / 1000 - (1 - mood / 225);
  if (score > 0.75) return "gold";
  if (score > 0.5) return "silver";
  return "normal";
}
