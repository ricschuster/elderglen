/** Quality tiers, as in Stardew. Normal goods carry no suffix on their id. */
export const QUALITIES = ["normal", "silver", "gold", "hearthsilver"] as const;
export type Quality = (typeof QUALITIES)[number];

/** Sell price multiplier per tier. From memory. */
export const QUALITY_MULTIPLIER: Record<Quality, number> = {
  normal: 1,
  silver: 1.25,
  gold: 1.5,
  // Placeholder (note 07): twice the base price, Stardew's top grade from memory, unchecked.
  hearthsilver: 2,
};

/** Energy multiplier when eaten, per tier. From memory. */
export const ENERGY_MULTIPLIER: Record<Quality, number> = {
  normal: 1,
  silver: 1.4,
  gold: 1.8,
  // Placeholder (note 07): above gold's 1.8.
  hearthsilver: 2.2,
};

/** Icon tint per tier. Hearthsilver is a warm rose, apart from silver's blue and gold's yellow (placeholder). */
export const QUALITY_TINT: Record<Quality, number> = {
  normal: 0xffffff,
  silver: 0xc8d8ff,
  gold: 0xffd860,
  hearthsilver: 0xf09ab8,
};

/** Placeholder (note 07): the top-grade roll for crops needs farming level 8 and fertilised soil. */
export const HEARTHSILVER_CROP_LEVEL = 8;
/** Placeholder (note 07): the top-grade roll for forage starts at foraging level 10. */
export const HEARTHSILVER_FORAGE_LEVEL = 10;
/** Placeholder (note 07): chance of the top grade once its gate is met, taken from the roll before gold. */
export const HEARTHSILVER_CHANCE = 0.03;

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
  // Top grade (placeholder): high farming level and fertilised soil, a small slice of the roll.
  if (
    level >= HEARTHSILVER_CROP_LEVEL &&
    soil > 0 &&
    roll < HEARTHSILVER_CHANCE
  )
    return "hearthsilver";
  const gold = (0.2 * level) / 10 + (0.2 * soil * (level + 2)) / 12 + 0.01;
  if (roll < gold) return "gold";
  if (roll < gold * 2) return "silver";
  return "normal";
}

/** Forage quality from foraging level: gold at level / 30, silver at level / 15. From memory. */
export function forageQuality(level: number, roll: number): Quality {
  if (level >= HEARTHSILVER_FORAGE_LEVEL && roll < HEARTHSILVER_CHANCE)
    return "hearthsilver";
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
