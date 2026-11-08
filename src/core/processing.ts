import {
  artisanId,
  HONEY,
  isMushroom,
  MEAD,
  produceOf,
  type ArtisanKind,
} from "./artisan";
import { cropById } from "./crops";
import { BARS, COAL, coalFor, ORE_PER_BAR } from "./ore";
import { splitQuality } from "./quality";

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
}

export const MACHINES: readonly MachineDef[] = [
  { id: "charcoal-kiln", name: "Charcoal kiln", sellPrice: 100 },
  { id: "preserves-jar", name: "Preserves jar", sellPrice: 150 },
  { id: "bee-house", name: "Bee house", sellPrice: 200, auto: true },
  { id: "keg", name: "Keg", sellPrice: 250 },
  { id: "seed-maker", name: "Seed maker", sellPrice: 200 },
  { id: "dehydrator", name: "Dehydrator", sellPrice: 300 },
  /** A crafted furnace, for more batches at once. The first is the smith's gift (`furnace.ts`). */
  { id: "furnace", name: "Furnace", sellPrice: 150 },
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
  const input = splitQuality(item).base;
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
