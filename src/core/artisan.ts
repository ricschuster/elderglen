import { CROPS, cropById } from "./crops";
import { FORAGE, forageById } from "./forage";
import { FRUIT_TREES, fruitTreeById } from "./fruittrees";
import dyeData from "../content/dyes.json";
import { splitQuality } from "./quality";

/**
 * Artisan goods (`docs/design/24_processing_and_cooking.md`): jam, pickles,
 * wine, juice, honey and mead. A good is made from one input, so each input has
 * its own item, such as `melon-jam`, and the bundles take any of a category.
 * Prices follow note 07: jam and pickles 2 x base + 50, wine 3 x base, juice
 * 2.25 x base, wild honey 100g, mead 300g. Input quality is ignored. Pure data.
 */
export type ArtisanKind = "jam" | "pickles" | "wine" | "juice" | "dried";
export type ArtisanCategory =
  | ArtisanKind
  | "honey"
  | "mead"
  | "beer"
  | "tea"
  | "cheese"
  | "mayonnaise"
  | "cloth"
  | "oil"
  | "dye";

export interface ArtisanDef {
  id: string;
  name: string;
  category: ArtisanCategory;
  sellPrice: number;
  /** Energy restored when eaten. Dried goods are food (3 times the input's). */
  energy?: number;
}

export const HONEY = "honey";
export const MEAD = "mead";
export const BEER = "beer";
export const PALE_ALE = "pale-ale";
export const GREEN_TEA = "green-tea";

/** Words for each category, for bundle lists. */
export const CATEGORY_NAMES: Record<ArtisanCategory, string> = {
  jam: "Any jam",
  pickles: "Any pickles",
  wine: "Any wine",
  juice: "Any juice",
  honey: "Honey",
  mead: "Mead",
  beer: "Any beer",
  tea: "Green tea",
  dried: "Any dried goods",
  cheese: "Any cheese",
  mayonnaise: "Any mayonnaise",
  cloth: "Cloth",
  oil: "Any oil",
  dye: "Any dye",
};

/** Price rule per kind, from the base price of the input. */
const PRICE: Record<ArtisanKind, (base: number) => number> = {
  jam: (b) => 2 * b + 50,
  pickles: (b) => 2 * b + 50,
  wine: (b) => 3 * b,
  juice: (b) => Math.floor(2.25 * b),
  dried: (b) => Math.floor(7.5 * b) + 25,
};

const KIND_WORD: Record<ArtisanKind, string> = {
  jam: "jam",
  pickles: "pickles",
  wine: "wine",
  juice: "juice",
  dried: "dried",
};

export const artisanId = (input: string, kind: ArtisanKind) =>
  `${input}-${kind}`;

/** Whether an input is a fruit or a vegetable. Undefined for goods that cannot be processed. */
export function produceOf(id: string): "fruit" | "vegetable" | undefined {
  const base = splitQuality(id).base;
  const crop = cropById(base);
  if (crop)
    return crop.produce === "none" || crop.produce === "flower"
      ? undefined
      : (crop.produce ?? "vegetable");
  if (fruitTreeById(base)) return "fruit";
  return forageById(base)?.produce;
}

/** The sell price of a raw input at normal quality. */
function basePrice(id: string): number {
  return (
    cropById(id)?.sellPrice ??
    fruitTreeById(id)?.sellPrice ??
    forageById(id)?.sellPrice ??
    0
  );
}

function nameOf(id: string): string {
  return (
    cropById(id)?.name ?? fruitTreeById(id)?.name ?? forageById(id)?.name ?? id
  );
}

/** Energy of a raw input at normal quality. */
function baseEnergy(id: string): number | undefined {
  return (
    cropById(id)?.energy ?? fruitTreeById(id)?.energy ?? forageById(id)?.energy
  );
}

/** An edible mushroom, which the dehydrator dries. */
export const isMushroom = (id: string): boolean =>
  forageById(splitQuality(id).base)?.mushroom === true;

const defs = new Map<string, ArtisanDef>();
const inputs = [
  ...CROPS.filter((c) => c.produce !== "none" && c.produce !== "flower").map(
    (c) => c.id,
  ),
  ...FRUIT_TREES.map((t) => t.id),
  ...FORAGE.filter((f) => f.produce).map((f) => f.id),
];
for (const input of [
  ...inputs,
  ...FORAGE.filter((f) => f.mushroom).map((f) => f.id),
]) {
  const fruit = produceOf(input) === "fruit";
  const kinds: ArtisanKind[] = fruit
    ? ["jam", "wine", "dried"]
    : isMushroom(input)
      ? ["dried"]
      : ["pickles", "juice"];
  for (const kind of kinds) {
    const id = artisanId(input, kind);
    const energy = baseEnergy(input);
    defs.set(id, {
      id,
      name:
        kind === "dried"
          ? `Dried ${nameOf(input).toLowerCase()}`
          : `${nameOf(input)} ${KIND_WORD[kind]}`,
      category: kind,
      sellPrice: PRICE[kind](basePrice(input)),
      energy: kind === "dried" && energy !== undefined ? 3 * energy : undefined,
    });
  }
}
/**
 * Flower honey (note 91): a bee house with a flower crop in reach makes that
 * flower's honey, `<flower>-honey`. Prices are the nearest Stardew values in
 * note 07, placeholders. Plain honey stays 100g.
 */
export const FLOWER_HONEY_PRICE: Readonly<Record<string, number>> = {
  tulip: 160,
  cornflower: 200,
  poppy: 380,
  zinnia: 280,
  sunflower: 260,
  dahlia: 680,
};
export const flowerHoneyId = (flower: string) => `${flower}-honey`;
for (const [flower, price] of Object.entries(FLOWER_HONEY_PRICE))
  defs.set(flowerHoneyId(flower), {
    id: flowerHoneyId(flower),
    name: `${nameOf(flower)} honey`,
    category: "honey",
    sellPrice: price,
  });
defs.set(HONEY, {
  id: HONEY,
  name: "Honey",
  category: "honey",
  sellPrice: 100,
});
defs.set(MEAD, { id: MEAD, name: "Mead", category: "mead", sellPrice: 300 });
/** Beer from wheat and pale ale from hops (note 92, prices from the saved Artisan Goods page). */
defs.set(BEER, { id: BEER, name: "Beer", category: "beer", sellPrice: 200 });
defs.set(PALE_ALE, {
  id: PALE_ALE,
  name: "Pale ale",
  category: "beer",
  sellPrice: 300,
});
/** Green tea: 1 tea leaf in the keg (note 97, owner 2026-11-13, saved Artisan Goods page, SC-173). */
defs.set(GREEN_TEA, {
  id: GREEN_TEA,
  name: "Green tea",
  category: "tea",
  sellPrice: 100,
});

/**
 * Animal goods and oil (note 24, slice 4): cheese, mayonnaise, cloth and oil.
 * Prices are ours, placeholders (note 07): about 2.4 to 3 times the raw good.
 */
export const CHEESE = "cheese";
export const GOAT_CHEESE = "goat-cheese";
export const MAYONNAISE = "mayonnaise";
export const DUCK_MAYONNAISE = "duck-mayonnaise";
export const CLOTH = "cloth";
export const TRUFFLE_OIL = "truffle-oil";
export const OIL = "oil";
for (const d of [
  { id: CHEESE, name: "Cheese", category: "cheese", sellPrice: 300 },
  { id: GOAT_CHEESE, name: "Goat cheese", category: "cheese", sellPrice: 540 },
  {
    id: MAYONNAISE,
    name: "Mayonnaise",
    category: "mayonnaise",
    sellPrice: 150,
  },
  {
    id: DUCK_MAYONNAISE,
    name: "Duck mayonnaise",
    category: "mayonnaise",
    sellPrice: 285,
  },
  { id: CLOTH, name: "Cloth", category: "cloth", sellPrice: 470 },
  { id: TRUFFLE_OIL, name: "Truffle oil", category: "oil", sellPrice: 1250 },
  { id: OIL, name: "Oil", category: "oil", sellPrice: 100 },
] satisfies ArtisanDef[])
  defs.set(d.id, d);

/**
 * Dyes (note 24, dye vat): the vat takes any plant, flower or berry in the
 * table `content/dyes.json`, one colour each, and makes that colour's dye.
 * Names, colours and the 120g price are ours, placeholders (note 07).
 */
const DYE_COLOURS = new Map<string, { id: string; name: string }>(
  dyeData.colours.map((c) => [c.id, { id: `${c.id}-dye`, name: c.name }]),
);
export const DYE_PRICE = dyeData.price;
for (const d of DYE_COLOURS.values())
  defs.set(d.id, {
    id: d.id,
    name: d.name,
    category: "dye",
    sellPrice: DYE_PRICE,
  });

/** Every plant the dye vat takes, with the colour it gives. */
export const DYE_INPUTS: Readonly<Record<string, string>> = dyeData.inputs;

/** The dye a plant, flower or berry makes in the dye vat, if any. */
export const dyeOf = (input: string): string | undefined => {
  const colour = DYE_INPUTS[splitQuality(input).base];
  return colour ? DYE_COLOURS.get(colour)?.id : undefined;
};

/** Every artisan good the game can make. */
export const ARTISAN_GOODS: readonly ArtisanDef[] = [...defs.values()];

export const artisanById = (id: string): ArtisanDef | undefined =>
  defs.get(splitQuality(id).base);

/** The category of an artisan good, if it is one. */
export const categoryOf = (id: string): ArtisanCategory | undefined =>
  artisanById(id)?.category;
