import { CROPS, cropById } from "./crops";
import { FORAGE, forageById } from "./forage";
import { FRUIT_TREES, fruitTreeById } from "./fruittrees";
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

/** Words for each category, for bundle lists. */
export const CATEGORY_NAMES: Record<ArtisanCategory, string> = {
  jam: "Any jam",
  pickles: "Any pickles",
  wine: "Any wine",
  juice: "Any juice",
  honey: "Honey",
  mead: "Mead",
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
  if (crop) return crop.produce ?? "vegetable";
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
  ...CROPS.map((c) => c.id),
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
defs.set(HONEY, {
  id: HONEY,
  name: "Honey",
  category: "honey",
  sellPrice: 100,
});
defs.set(MEAD, { id: MEAD, name: "Mead", category: "mead", sellPrice: 300 });

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
 * Dyes (note 24, dye vat; note 63, bundle 23): one dye from each of the six
 * colour goods the Dyer's bundle asks for. Names, colours and the 120g price
 * are ours, placeholders (note 07). Tailoring and the Hearth Fire bundle will
 * use them later.
 */
const DYES: { input: string; id: string; name: string }[] = [
  { input: "daffodil", id: "yellow-dye", name: "Yellow dye" },
  { input: "sweet-pea", id: "pink-dye", name: "Pink dye" },
  { input: "red-cabbage", id: "purple-dye", name: "Purple dye" },
  { input: "cranberry", id: "red-dye", name: "Red dye" },
  { input: "bramble-berry", id: "indigo-dye", name: "Indigo dye" },
  { input: "crocus", id: "violet-dye", name: "Violet dye" },
];
export const DYE_PRICE = 120;
for (const d of DYES)
  defs.set(d.id, {
    id: d.id,
    name: d.name,
    category: "dye",
    sellPrice: DYE_PRICE,
  });

/** The dye a flower, berry or crop makes in the dye vat, if any. */
export const dyeOf = (input: string): string | undefined =>
  DYES.find((d) => d.input === splitQuality(input).base)?.id;

/** Every artisan good the game can make. */
export const ARTISAN_GOODS: readonly ArtisanDef[] = [...defs.values()];

export const artisanById = (id: string): ArtisanDef | undefined =>
  defs.get(splitQuality(id).base);

/** The category of an artisan good, if it is one. */
export const categoryOf = (id: string): ArtisanCategory | undefined =>
  artisanById(id)?.category;
