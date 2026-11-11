import {
  artisanId,
  CHEESE,
  CLOTH,
  dyeOf,
  DUCK_MAYONNAISE,
  GOAT_CHEESE,
  HONEY,
  MAYONNAISE,
  OIL,
  TRUFFLE_OIL,
  isMushroom,
  MEAD,
  produceOf,
  type ArtisanKind,
} from "./artisan";
import { JUNK } from "./pots";
import { cropById } from "./crops";
import { BARS, COAL, coalFor, ORE_PER_BAR } from "./ore";
import { splitQuality, type Quality } from "./quality";

/**
 * Machine rules (`docs/design/24_processing_and_cooking.md`): what each
 * machine takes, makes and how long it runs. Times are Stardew's minutes in
 * machine time, 1,600 a day (1,200 awake and 400 overnight, note 07). Pure
 * data and rules; the placed machines and their jobs are in `machines.ts`.
 */
export interface MachineDef {
  id: string;
  name: string;
  /** Ours, placeholders. Sprinklers sell for 100 and 450. */
  sellPrice: number;
  /** True for a machine that makes goods with no input (the bee house). */
  auto?: boolean;
  /** True for a machine that stands only in the cellar (the cask, `cask.ts`). */
  cellar?: boolean;
}

export const MACHINES: readonly MachineDef[] = [
  { id: "charcoal-kiln", name: "Charcoal kiln", sellPrice: 100 },
  { id: "preserves-jar", name: "Preserves jar", sellPrice: 150 },
  { id: "bee-house", name: "Bee house", sellPrice: 200, auto: true },
  { id: "keg", name: "Keg", sellPrice: 250 },
  { id: "seed-maker", name: "Seed maker", sellPrice: 200 },
  { id: "dehydrator", name: "Dehydrator", sellPrice: 300 },
  /** Animal-goods machines (note 24, slice 4). Sell prices are ours, placeholders. */
  { id: "cheese-press", name: "Cheese press", sellPrice: 200 },
  { id: "mayonnaise-machine", name: "Mayonnaise machine", sellPrice: 200 },
  { id: "loom", name: "Loom", sellPrice: 250 },
  { id: "oil-maker", name: "Oil maker", sellPrice: 300 },
  /** The dye vat (note 24, bundle 23) and the cask (cellar only). Sell prices are ours, placeholders. */
  { id: "dye-vat", name: "Dye vat", sellPrice: 250 },
  { id: "cask", name: "Cask", sellPrice: 200, cellar: true },
  /** A crafted furnace, for more batches at once. The first is the smith's gift (`furnace.ts`). */
  { id: "furnace", name: "Furnace", sellPrice: 150 },
  /** Turns the rod's and the pots' trash into useful goods (note 21). Sell price is ours, a placeholder. */
  { id: "recycler", name: "Recycler", sellPrice: 200 },
];

export const machineById = (id: string | undefined): MachineDef | undefined =>
  MACHINES.find((m) => m.id === id);

/** Machine minutes in one day: 1,200 awake and 400 overnight. */
export const MINUTES_PER_DAY = 1600;

/** Wood for one coal in the kiln. */
export const WOOD_PER_COAL = 10;
/** Days a bee house takes to make one honey. */
export const BEE_DAYS = 4;
export const BEE_MINUTES = BEE_DAYS * MINUTES_PER_DAY;

/** One batch: what goes in, what comes out and how long it takes. */
export interface Process {
  /** The input item, quality removed. */
  input: string;
  /** How many of the input are used up. */
  use: number;
  output: string;
  count: number;
  minutes: number;
  /** A second input that is used up too, such as the coal in a furnace. */
  also?: { item: string; use: number };
}

const barOfOre = (ore: string) => BARS.find((b) => b.ore === ore);

const JAR: Record<"fruit" | "vegetable", ArtisanKind> = {
  fruit: "jam",
  vegetable: "pickles",
};
const KEG: Record<"fruit" | "vegetable", ArtisanKind> = {
  fruit: "wine",
  vegetable: "juice",
};
/** Jar 4,000 minutes. Keg wine 10,000, juice 6,000, mead 600. */
const JAR_MINUTES = 4000;
const KEG_MINUTES = { wine: 10000, juice: 6000 } as const;
const MEAD_MINUTES = 600;
const KILN_MINUTES = 30;
const SEED_MINUTES = 20;
/** Stardew's minutes: cheese 200, mayonnaise 180, loom 240 (note 24 says about 3 to 4 hours). */
const CHEESE_MINUTES = 200;
const MAYO_MINUTES = 180;
const LOOM_MINUTES = 240;
/** Oil maker: truffle 360, corn 1,000 (the note says 1 hour to 2 days). */
const OIL_MINUTES = { truffle: 360, corn: 1000 } as const;
/** Chance of 2 cloth from one wool, by its quality (ours, placeholder, note 07). */
export const CLOTH_DOUBLE_CHANCE: Record<Quality, number> = {
  normal: 0,
  silver: 0.25,
  gold: 0.5,
};
const CHEESE_OF: Record<string, string> = {
  milk: CHEESE,
  "goat-milk": GOAT_CHEESE,
};
const MAYO_OF: Record<string, string> = {
  egg: MAYONNAISE,
  "duck-egg": DUCK_MAYONNAISE,
};

/** The recycler takes an hour per item (note 21). */
export const RECYCLER_MINUTES = 60;
/**
 * What a piece of trash becomes: stone, coal, iron ore, wood or cloth, by weight
 * (placeholders, note 21). The note also lists torches, but there is no torch
 * item yet, so it is left out.
 */
export const RECYCLER_OUTPUTS: readonly {
  item: string;
  count: number;
  weight: number;
}[] = [
  { item: "stone", count: 3, weight: 30 },
  { item: "wood", count: 3, weight: 25 },
  { item: COAL, count: 1, weight: 20 },
  { item: "iron-ore", count: 1, weight: 15 },
  { item: CLOTH, count: 1, weight: 10 },
];

/** The output of one recycled item, drawn by weight. */
export function recyclerRoll(random: () => number): {
  item: string;
  count: number;
} {
  const total = RECYCLER_OUTPUTS.reduce((n, o) => n + o.weight, 0);
  let pick = random() * total;
  for (const o of RECYCLER_OUTPUTS) {
    pick -= o.weight;
    if (pick < 0) return o;
  }
  return RECYCLER_OUTPUTS[RECYCLER_OUTPUTS.length - 1]!;
}

/** The dye vat makes one dye from one flower, berry or crop in a day (ours, placeholder, note 07). */
export const DYE_MINUTES = MINUTES_PER_DAY;

/** The dehydrator takes 5 of one fruit or mushroom and dries them in a day. */
export const DEHYDRATOR_USE = 5;
export const DEHYDRATOR_MINUTES = MINUTES_PER_DAY;

/**
 * The batch a machine would run on an item, or undefined if it takes none.
 * The seed maker's 1 to 3 seeds come from `random`, so the count is fixed
 * when the batch starts.
 */
export function processFor(
  machine: string,
  item: string,
  random: () => number = Math.random,
): Process | undefined {
  const { base: input, quality } = splitQuality(item);
  const one = { input, use: 1, count: 1 };
  if (machine === "charcoal-kiln")
    return input === "wood"
      ? {
          input,
          use: WOOD_PER_COAL,
          output: COAL,
          count: 1,
          minutes: KILN_MINUTES,
        }
      : undefined;
  if (machine === "seed-maker")
    return cropById(input)
      ? {
          ...one,
          output: `${input}-seed`,
          count: 1 + Math.floor(random() * 3),
          minutes: SEED_MINUTES,
        }
      : undefined;
  if (machine === "furnace") {
    const bar = barOfOre(input);
    return bar
      ? {
          input,
          use: ORE_PER_BAR,
          output: bar.id,
          count: 1,
          minutes: bar.minutes,
          also: { item: COAL, use: coalFor(bar) },
        }
      : undefined;
  }
  if (machine === "dehydrator") {
    if (produceOf(input) !== "fruit" && !isMushroom(input)) return undefined;
    return {
      input,
      use: DEHYDRATOR_USE,
      count: 1,
      output: artisanId(input, "dried"),
      minutes: DEHYDRATOR_MINUTES,
    };
  }
  if (machine === "recycler") {
    if (!JUNK.some((j) => j.id === input)) return undefined;
    const out = recyclerRoll(random);
    return {
      ...one,
      output: out.item,
      count: out.count,
      minutes: RECYCLER_MINUTES,
    };
  }
  if (machine === "dye-vat") {
    const dye = dyeOf(input);
    return dye ? { ...one, output: dye, minutes: DYE_MINUTES } : undefined;
  }
  if (machine === "cheese-press")
    return CHEESE_OF[input]
      ? { ...one, output: CHEESE_OF[input]!, minutes: CHEESE_MINUTES }
      : undefined;
  if (machine === "mayonnaise-machine")
    return MAYO_OF[input]
      ? { ...one, output: MAYO_OF[input]!, minutes: MAYO_MINUTES }
      : undefined;
  if (machine === "loom")
    return input === "wool"
      ? {
          ...one,
          output: CLOTH,
          count: random() < CLOTH_DOUBLE_CHANCE[quality] ? 2 : 1,
          minutes: LOOM_MINUTES,
        }
      : undefined;
  if (machine === "oil-maker") {
    if (input === "truffle")
      return { ...one, output: TRUFFLE_OIL, minutes: OIL_MINUTES.truffle };
    if (input === "corn")
      return { ...one, output: OIL, minutes: OIL_MINUTES.corn };
    return undefined;
  }
  if (machine === "preserves-jar") {
    const produce = produceOf(input);
    return produce
      ? {
          ...one,
          output: artisanId(input, JAR[produce]),
          minutes: JAR_MINUTES,
        }
      : undefined;
  }
  if (machine === "keg") {
    if (input === HONEY) return { ...one, output: MEAD, minutes: MEAD_MINUTES };
    const produce = produceOf(input);
    if (!produce) return undefined;
    const kind = KEG[produce];
    return {
      ...one,
      output: artisanId(input, kind),
      minutes: KEG_MINUTES[kind as "wine" | "juice"],
    };
  }
  return undefined;
}
