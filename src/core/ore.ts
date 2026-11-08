/**
 * Mining goods (`docs/design/22_mines.md`, "Ore, coal and bars"). Data only:
 * stone, coal, three ores and their bars, plus the Hearthsilver bar (its ore
 * is a geode good, `geodes.json`). Sell prices are Stardew's as remembered (ore 5, 10 and 25, coal 15,
 * bars 60, 120 and 250) and the smith's prices are the decided 2.5 times a
 * bar's value split over its five ore (placeholders, note 07).
 */

export interface OreDef {
  id: string;
  name: string;
  sellPrice: number;
  /** What the smith dwarf charges. */
  buyPrice: number;
}

export interface BarDef {
  id: string;
  name: string;
  ore: string;
  sellPrice: number;
  /** Game minutes in the furnace: 30 minutes, 2 hours and 5 hours (Stardew). */
  minutes: number;
  /** Coal for one bar, if not COAL_PER_BAR (Hearthsilver takes 2, note 22). */
  coal?: number;
}

/** Ore needed for one bar. */
export const ORE_PER_BAR = 5;
/** Coal needed for one bar. */
export const COAL_PER_BAR = 1;

export const STONE = "stone";
export const COAL = "coal";
export const COPPER_ORE = "copper-ore";
export const IRON_ORE = "iron-ore";
export const GOLD_ORE = "gold-ore";
/** Dug from floor 100 down; its item is defined with the geode goods (`geodes.json`). */
export const HEARTHSILVER_ORE = "hearthsilver-ore";
/** The quartz crystal stands in for refined quartz and earth crystals in recipes (note 34). */
export const QUARTZ = "quartz-crystal";
/** Stardew's quartz sells for 25g (from memory). */
export const QUARTZ_SELL_PRICE = 25;

/** Stone sells for 2g. Ours, a placeholder. */
export const STONE_SELL_PRICE = 2;
/** Coal sells for 15g and the smith sells it for 50g. */
export const COAL_SELL_PRICE = 15;
export const COAL_BUY_PRICE = 50;

export const ORES: OreDef[] = [
  { id: "copper-ore", name: "Copper ore", sellPrice: 5, buyPrice: 25 },
  { id: "iron-ore", name: "Iron ore", sellPrice: 10, buyPrice: 50 },
  { id: "gold-ore", name: "Gold ore", sellPrice: 25, buyPrice: 100 },
];

export const BARS: BarDef[] = [
  {
    id: "copper-bar",
    name: "Copper bar",
    ore: "copper-ore",
    sellPrice: 60,
    minutes: 30,
  },
  {
    id: "iron-bar",
    name: "Iron bar",
    ore: "iron-ore",
    sellPrice: 120,
    minutes: 120,
  },
  {
    id: "gold-bar",
    name: "Gold bar",
    ore: "gold-ore",
    sellPrice: 250,
    minutes: 300,
  },
  // Placeholders (note 07): 8 hours, 2 coal, sells for 1000g.
  {
    id: "hearthsilver-bar",
    name: "Hearthsilver bar",
    ore: HEARTHSILVER_ORE,
    sellPrice: 1000,
    minutes: 480,
    coal: 2,
  },
];

/** Coal one bar takes. */
export const coalFor = (bar: BarDef): number => bar.coal ?? COAL_PER_BAR;

export const barById = (id: string): BarDef | undefined =>
  BARS.find((b) => b.id === id);

/** True for a raw ore, the only goods the mine hall's bin takes (note 22). Bars, stone and coal are not ore. */
export const isOre = (id: string): boolean => ORES.some((o) => o.id === id);
