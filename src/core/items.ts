import bombData from "../content/bombs.json";
import { ALL_CROPS, cropById } from "./crops";
import {
  MAHOGANY_SEED,
  MAHOGANY_SEED_NAME,
  MAHOGANY_SEED_PRICE,
} from "./mahogany";
import {
  BOOTS,
  RINGS,
  bootsById,
  isCombo,
  ringById,
  tailoredParts,
} from "./equipment";
import { FERTILIZERS } from "./fertilizer";
import { FORAGE } from "./forage";
import {
  BARS,
  COAL,
  COAL_BUY_PRICE,
  COAL_SELL_PRICE,
  ORES,
  QUARTZ,
  QUARTZ_SELL_PRICE,
  STONE,
  STONE_SELL_PRICE,
} from "./ore";
import { SPRINKLERS } from "./sprinklers";
import { FRUIT_TREES, saplingId } from "./fruittrees";
import {
  TEA_LEAF,
  TEA_LEAF_ENERGY,
  TEA_LEAF_SELL_PRICE,
  TEA_SAPLING,
  TEA_SAPLING_SELL_PRICE,
} from "./teabush";
import decorData from "../content/decor.json";
import creatureGoods from "../content/creature-goods.json";
import iceFishing from "../content/ice-fishing.json";
import lanternFloat from "../content/lantern-float.json";
import weaponData from "../content/weapons.json";
import furnitureData from "../content/furniture.json";
import { ARTISAN_GOODS } from "./artisan";
import { MACHINES } from "./processing";
import { HEAVY_TAPPER_DEF, TAP_GOODS, TAPPER, TAPPER_DEF } from "./tapper";
import { DISHES } from "./dishes";
import { CHESTS } from "./chestdefs";
import { GEODE_ITEMS } from "./geodes";
import { GEM_ITEMS } from "./gems";
import artifactData from "../content/artifacts.json";

/** The found old things, read from data here so this list has no cycle with `artifacts.ts`. */
const ARTIFACTS = artifactData.artifacts;
import { FISH, RODS } from "./fishing";
import { WATER_FINDS } from "./waterfinds";
import {
  POND_SPECIES,
  agedRoeOf,
  agedRoePrice,
  roeOf,
  roePrice,
} from "./pondspecies";
import { BAITS, LURES, TRINKETS } from "./tackle";
import { JUNK, POT_ITEM, POT_NAME, POT_PRICE, SHELLFISH } from "./pots";
import { ENERGY_MULTIPLIER, QUALITY_MULTIPLIER, splitQuality } from "./quality";

/** Item ids: a crop's produce uses the crop id, its seed uses `<id>-seed`. */
export const seedId = (cropId: string) => `${cropId}-seed`;

export interface ItemDef {
  id: string;
  name: string;
  sellPrice: number;
  buyPrice?: number;
  /** Cannot be sold or shipped (furniture). */
  keep?: boolean;
  /** Energy restored when eaten, at normal quality. Absent if not food. */
  energy?: number;
  /** The dev menu's picker heading. Not used by the game rules. */
  group?: string;
}

const items = new Map<string, ItemDef>();
for (const c of ALL_CROPS) {
  // A rare crop is kept for its hand-in and its seed is a gift, never on sale (the ember berry, note 39).
  items.set(c.id, {
    id: c.id,
    name: c.name,
    sellPrice: c.rare ? 0 : c.sellPrice,
    energy: c.energy,
    ...(c.rare ? { keep: true } : {}),
  });
  items.set(seedId(c.id), {
    id: seedId(c.id),
    name: c.seedName ?? `${c.name} seeds`,
    sellPrice: c.rare ? 0 : Math.floor(c.seedPrice / 2),
    ...(c.rare ? { keep: true } : { buyPrice: c.seedPrice }),
  });
}

for (const f of FORAGE) {
  items.set(f.id, {
    id: f.id,
    name: f.name,
    sellPrice: f.sellPrice,
    energy: f.energy,
  });
}

for (const f of FERTILIZERS) {
  items.set(f.id, {
    id: f.id,
    name: f.name,
    sellPrice: f.sellPrice,
    buyPrice: f.buyPrice,
  });
}

for (const t of FRUIT_TREES) {
  items.set(t.id, {
    id: t.id,
    name: t.name,
    sellPrice: t.sellPrice,
    energy: t.energy,
  });
  items.set(saplingId(t.id), {
    id: saplingId(t.id),
    name: `${t.name} sapling`,
    sellPrice: Math.floor(t.saplingPrice / 2),
    buyPrice: t.saplingPrice,
  });
}

for (const s of SPRINKLERS)
  items.set(s.id, { id: s.id, name: s.name, sellPrice: s.sellPrice });

for (const a of ARTISAN_GOODS)
  items.set(a.id, {
    id: a.id,
    name: a.name,
    sellPrice: a.sellPrice,
    energy: a.energy,
  });
/** Cooked dishes (note 24). Names, energy and prices are placeholders, see `dishes.json`. */
for (const d of DISHES)
  items.set(d.id, {
    id: d.id,
    name: d.name,
    sellPrice: d.sellPrice,
    energy: d.energy,
  });
for (const m of MACHINES)
  items.set(m.id, { id: m.id, name: m.name, sellPrice: m.sellPrice });

/** Chests are items too. They cannot be sold, so a full chest is never lost to the bin. */
for (const c of CHESTS)
  items.set(c.id, { id: c.id, name: c.name, sellPrice: 0, keep: true });

/** Furniture pieces are items, so they ride in the backpack. They cannot be sold (`10_customisation.md`). */
for (const f of furnitureData)
  items.set(f.id, { id: f.id, name: f.name, sellPrice: 0, keep: true });

/** Wallpaper and flooring ride in the backpack and cannot be sold (note 10). */
for (const d of decorData)
  items.set(d.id, { id: d.id, name: d.name, sellPrice: 0, keep: true });

/** Tree goods (`docs/design/36_gathering_trees_sap_fiber.md`). Wood and sap sell as Stardew's do. */
items.set("wood", { id: "wood", name: "Wood", sellPrice: 2 });
items.set("sap", { id: "sap", name: "Sap", sellPrice: 2 });
/** The tapper and what it gives (note 92). Prices are placeholders, see `tapper.json`. */
items.set(TAPPER, { ...TAPPER_DEF });
items.set(HEAVY_TAPPER_DEF.id, { ...HEAVY_TAPPER_DEF });
for (const g of TAP_GOODS)
  if (g.item !== "sap")
    items.set(g.item, { id: g.item, name: g.name, sellPrice: g.sellPrice });
/** Hardwood comes from large stumps (`docs/design/43_wood_source.md`). Sells for 15g, as the saved Hardwood page. */
export const HARDWOOD = "hardwood";
items.set(HARDWOOD, { id: HARDWOOD, name: "Hardwood", sellPrice: 15 });
/** Fiber comes from weeds and sells for 1g, as Stardew's (`29_weeds.md`). It is always normal quality. */
items.set("fiber", { id: "fiber", name: "Fiber", sellPrice: 1 });
/** Clay turns up when soil is tilled (note 23). Stardew's clay sells for 20g. */
items.set("clay", { id: "clay", name: "Clay", sellPrice: 20 });
/** Hay feeds animals and cannot be sold back (note 23). */
items.set("hay", { id: "hay", name: "Hay", sellPrice: 0, keep: true });
/** Eggs from the coop (note 23). Sell price and energy are from memory, placeholders. */
items.set("egg", { id: "egg", name: "Egg", sellPrice: 50, energy: 50 });
/** Duck and rabbit goods (note 23, slice 2). Prices are placeholders, ours. */
items.set("duck-egg", {
  id: "duck-egg",
  name: "Duck egg",
  sellPrice: 95,
  energy: 75,
});
items.set("feather", { id: "feather", name: "Duck feather", sellPrice: 250 });
items.set("wool", { id: "wool", name: "Wool", sellPrice: 340 });
/** Barn goods (note 23, slice 3). Prices are placeholders, ours. Moonwool is never bought and not a bundle item. */
items.set("milk", { id: "milk", name: "Milk", sellPrice: 125 });
items.set("goat-milk", { id: "goat-milk", name: "Goat milk", sellPrice: 225 });
items.set("truffle", { id: "truffle", name: "Truffle", sellPrice: 625 });
items.set("moonwool", { id: "moonwool", name: "Moonwool", sellPrice: 1200 });
/** The Harvest Showing first prize, once a year (notes 14 and 66). Never bought. The name is a placeholder. */
items.set("blue-ribbon-melon", {
  id: "blue-ribbon-melon",
  name: "Blue Ribbon Melon",
  sellPrice: 1500,
});
/** The water finds (note 93). Seaweed is already a forage item. */
for (const f of WATER_FINDS)
  if (!items.has(f.id))
    items.set(f.id, { id: f.id, name: f.name, sellPrice: f.sellPrice });
/** Roe and aged roe, one item each per pond species (note 93). */
for (const s of POND_SPECIES) {
  items.set(roeOf(s.id), {
    id: roeOf(s.id),
    name: `${s.name} roe`,
    sellPrice: roePrice(s),
  });
  items.set(agedRoeOf(s.id), {
    id: agedRoeOf(s.id),
    name: `Aged ${s.name.toLowerCase()} roe`,
    sellPrice: agedRoePrice(s),
  });
}
/** Algae soup: a pond reward only, no recipe (note 93). Stats are placeholders. */
export const ALGAE_SOUP = "algae-soup";
items.set(ALGAE_SOUP, {
  id: ALGAE_SOUP,
  name: "Algae soup",
  sellPrice: 100,
  energy: 80,
});
/** Tea bush goods (note 97). Prices are placeholders, see `tea-bush.json`. */
items.set(TEA_SAPLING, {
  id: TEA_SAPLING,
  name: "Tea sapling",
  sellPrice: TEA_SAPLING_SELL_PRICE,
});
items.set(TEA_LEAF, {
  id: TEA_LEAF,
  name: "Tea leaf",
  sellPrice: TEA_LEAF_SELL_PRICE,
  energy: TEA_LEAF_ENERGY,
});
/** Beeswax from the bee house and the candle made from it (note 63, bundle 20). Prices are placeholders, ours. */
export const WAX = "wax";
export const CANDLE = "candle";
items.set(WAX, { id: WAX, name: "Beeswax", sellPrice: 40 });
items.set(CANDLE, { id: CANDLE, name: "Candle", sellPrice: 60 });
/** Mixed seeds plant a random crop that suits the season. Sell price is ours. */
items.set("mixed-seed", {
  id: "mixed-seed",
  name: "Mixed seeds",
  sellPrice: 5,
});
/** Sell price is ours, a placeholder. */
items.set("tree-seed", { id: "tree-seed", name: "Acorn", sellPrice: 5 });
/** The Maple and Pine seeds (note 36, SC-30). The Acorn keeps the old `tree-seed` id so saves stay valid. */
items.set("maple-seed", { id: "maple-seed", name: "Maple seed", sellPrice: 5 });
items.set("pine-cone", { id: "pine-cone", name: "Pine cone", sellPrice: 5 });
items.set(MAHOGANY_SEED, {
  id: MAHOGANY_SEED,
  name: MAHOGANY_SEED_NAME,
  sellPrice: MAHOGANY_SEED_PRICE,
});

/** Mining goods (`docs/design/22_mines.md`). Prices are placeholders, see `ore.ts`. */
items.set(STONE, { id: STONE, name: "Stone", sellPrice: STONE_SELL_PRICE });
items.set(COAL, {
  id: COAL,
  name: "Coal",
  sellPrice: COAL_SELL_PRICE,
  buyPrice: COAL_BUY_PRICE,
});
for (const i of GEODE_ITEMS)
  items.set(i.id, { id: i.id, name: i.name, sellPrice: i.sellPrice });
for (const i of GEM_ITEMS)
  items.set(i.id, { id: i.id, name: i.name, sellPrice: i.sellPrice });
/** Found old things (note 69). The geode finds are already listed with the geode goods. */
for (const a of ARTIFACTS)
  if (!items.has(a.id))
    items.set(a.id, { id: a.id, name: a.name, sellPrice: a.sellPrice });
items.set(QUARTZ, {
  id: QUARTZ,
  name: "Quartz crystal",
  sellPrice: QUARTZ_SELL_PRICE,
});
for (const o of ORES) items.set(o.id, { ...o });
for (const b of BARS)
  items.set(b.id, { id: b.id, name: b.name, sellPrice: b.sellPrice });

/** Weapons are carried and kept: the trainer gives the starters, the smith dwarf sells the other tiers for coin (`weaponPrice`, note 74), and nothing buys them back. */
for (const w of weaponData)
  items.set(w.id, { id: w.id, name: w.name, sellPrice: 0, keep: true });
/** Moth dust, a Dustmoth drop and a crafting good (note 22). Sell price is a placeholder, ours. */
export const MOTH_DUST = "moth-dust";
items.set(MOTH_DUST, { id: MOTH_DUST, name: "Moth dust", sellPrice: 30 });
/** The other creature drops (note 22). Sell prices are placeholders, ours. Frost berry is food. */
for (const g of creatureGoods) items.set(g.id, { ...g });
/** Lamplight Evening lanterns (note 82, placeholders): the bought one is spent on the launch, the keepsake stays. */
items.set(lanternFloat.lantern.id, {
  id: lanternFloat.lantern.id,
  name: lanternFloat.lantern.name,
  sellPrice: 0,
  keep: true,
});
items.set(iceFishing.frostfin.id, {
  id: iceFishing.frostfin.id,
  name: iceFishing.frostfin.name,
  sellPrice: iceFishing.frostfin.sellPrice,
});
items.set(lanternFloat.keepsake.id, {
  id: lanternFloat.keepsake.id,
  name: lanternFloat.keepsake.name,
  sellPrice: 0,
  keep: true,
});

/** Fish (note 21). Prices are placeholders in the bands of note 07. */
for (const f of FISH)
  items.set(f.id, { id: f.id, name: f.name, sellPrice: f.sellPrice });
/** Rods are bought and kept: they ride in the backpack and cannot be sold back. */
for (const r of RODS)
  items.set(r.id, {
    id: r.id,
    name: r.name,
    sellPrice: 0,
    buyPrice: r.price,
    keep: true,
  });

/** Bait is bought and spent. Lures are bought, fitted and worn out. Neither sells back. */
for (const b of BAITS)
  items.set(b.id, {
    id: b.id,
    name: b.name,
    sellPrice: 0,
    buyPrice: b.price,
    keep: true,
  });
for (const l of LURES)
  items.set(l.id, {
    id: l.id,
    name: l.name,
    sellPrice: 0,
    buyPrice: l.price,
    keep: true,
  });
/**
 * The Homeward pin (note 09, #641): Thalwen sells it from her trunk, one only.
 * It is kept and cannot be sold. The price is a placeholder (note 07), a little
 * under the 2,000,000g the saved Krobus page gives for Stardew's Return Scepter.
 * It does nothing yet: the warp rings it would return from are not built.
 */
export const HOMEWARD_PIN = "homeward-pin";
export const HOMEWARD_PIN_PRICE = 1_500_000;
items.set(HOMEWARD_PIN, {
  id: HOMEWARD_PIN,
  name: "Homeward pin",
  sellPrice: 0,
  buyPrice: HOMEWARD_PIN_PRICE,
  keep: true,
});
/**
 * The glow ring is the Night Fishing reward and is worn since the ring slots
 * (note 37). The Beach warp totem waits for a use that returns the player to
 * the Beach. It is kept and does nothing yet, like the Homeward pin. Prices are placeholders (note 07).
 */
export const GLOW_RING = "glow-ring";
export const WARP_TOTEM_BEACH = "warp-totem-beach";
/** Camp chest items (note 22): the floor 100 elderfruit (note 39) and the floor 120 key to the ring 2 deep dig. Kept, they do nothing yet. */
export const ELDERFRUIT = "elderfruit";
export const DEEPMARK_KEY = "deepmark-key";
/** The battery pack (a struck lightning rod makes one, note 34) and the rod itself, which is stood on the farm (note 89) and so is kept. */
items.set("battery-pack", {
  id: "battery-pack",
  name: "Battery pack",
  sellPrice: 500,
});
items.set("lightning-rod", {
  id: "lightning-rod",
  name: "Lightning rod",
  sellPrice: 0,
  keep: true,
});
/** Placeable lights (note 89): stood on a tile, they glow. Not sold, so a placed set is never a shop run. */
for (const [id, name] of [
  ["torch", "Torch"],
  ["campfire", "Campfire"],
  ["wood-brazier", "Wood brazier"],
  ["stone-brazier", "Stone brazier"],
  ["wood-lamp-post", "Wood lamp-post"],
  ["iron-lamp-post", "Iron lamp-post"],
] as const)
  items.set(id, { id, name, sellPrice: 0, keep: true });
/** Farm decoration (note 89, the seventh placeable kind): carried, stood on the farm, kept. Sold by the keeper (`farmdecor.ts`). */
for (const [id, name] of [
  ["ornamental-hay-bale", "Ornamental hay bale"],
  ["doghouse", "Doghouse"],
  ["dark-doghouse", "Dark doghouse"],
  ["cat-tree", "Cat tree"],
  ["dark-cat-tree", "Dark cat tree"],
  ["bird-house", "Bird house"],
] as const)
  items.set(id, { id, name, sellPrice: 0, keep: true });
/** Bombs (note 89): bought at the Forge, lit on a tile, used up. Prices from `bombs.json`. */
for (const b of bombData)
  items.set(b.id, {
    id: b.id,
    name: b.name,
    sellPrice: 0,
    buyPrice: b.price,
    keep: true,
  });
export const LIFE_ELIXIR = "life-elixir";
export const MINERS_TREAT = "miners-treat";
export const OIL_OF_GARLIC = "oil-of-garlic";

export const LIFE_ELIXIR_PRICE = 2000;
export const MINERS_TREAT_PRICE = 1000;
export const OIL_OF_GARLIC_PRICE = 3000;
/** Energy a Miner's Treat gives (placeholder). */
export const MINERS_TREAT_ENERGY = 100;
/** The Forge's small goods (note 89): bought, drunk or eaten, used up. Prices are Stardew's, placeholders. */
for (const [id, name, buyPrice, energy] of [
  [LIFE_ELIXIR, "Life Elixir", LIFE_ELIXIR_PRICE, undefined],
  [MINERS_TREAT, "Miner's Treat", MINERS_TREAT_PRICE, MINERS_TREAT_ENERGY],
  [OIL_OF_GARLIC, "Oil of Garlic", OIL_OF_GARLIC_PRICE, undefined],
] as const)
  items.set(id, {
    id,
    name,
    sellPrice: 0,
    buyPrice,
    keep: true,
    ...(energy !== undefined ? { energy } : {}),
  });
items.set(ELDERFRUIT, {
  id: ELDERFRUIT,
  name: "Elderfruit",
  sellPrice: 0,
  keep: true,
});
items.set(DEEPMARK_KEY, {
  id: DEEPMARK_KEY,
  name: "Deepmark key",
  sellPrice: 0,
  keep: true,
});
/** Rings are worn in the two ring slots (`equipment.ts`, note 37). */
for (const r of RINGS)
  items.set(r.id, { id: r.id, name: r.name, sellPrice: 0, keep: true });
for (const b of BOOTS)
  items.set(b.id, { id: b.id, name: b.name, sellPrice: 0, keep: true });
items.set(WARP_TOTEM_BEACH, {
  id: WARP_TOTEM_BEACH,
  name: "Beach warp totem",
  sellPrice: 0,
  keep: true,
});
/**
 * Last Seat and Fodder rewards (note 63, issue #603): the coop heater, placed in a
 * coop or barn to stop the winter mood loss (`hasHeater` in animals.ts), and Old
 * Greencoat's letter to the elves, a story item that does nothing yet.
 */
export const COOP_HEATER = "coop-heater";
export const CRYSTALARIUM = "crystalarium";
export const ELF_LETTER = "elf-letter";
/** The heater is sold at the Forest farmstead for Stardew's 2,000g (note 89, SC-149). Bundle 25 still gives the first. */
export const HEATER_PRICE = 2000;
items.set(COOP_HEATER, {
  id: COOP_HEATER,
  name: "Coop heater",
  sellPrice: 0,
  buyPrice: HEATER_PRICE,
  keep: true,
});
items.set(ELF_LETTER, {
  id: ELF_LETTER,
  name: "Letter to the elves",
  sellPrice: 0,
  keep: true,
});
/** The shellfish pot is bought and kept (note 21). Its catches and junk sell as set in `pots.json`. */
items.set(POT_ITEM, {
  id: POT_ITEM,
  name: POT_NAME,
  sellPrice: 0,
  buyPrice: POT_PRICE,
  keep: true,
});
for (const s of SHELLFISH)
  items.set(s.id, { id: s.id, name: s.name, sellPrice: s.sellPrice });
for (const j of JUNK)
  items.set(j.id, { id: j.id, name: j.name, sellPrice: j.sellPrice });
/** Trinkets from the Magpie Hook: sellable, giftable curios (note 21). */
for (const t of TRINKETS)
  items.set(t.id, { id: t.id, name: t.name, sellPrice: t.sellPrice });

/** Heading each item for the dev menu's picker, in the order the groups list. */
const GROUPS: [string, string[]][] = [
  ["Crops", ALL_CROPS.map((c) => c.id)],
  [
    "Seeds and saplings",
    [
      ...ALL_CROPS.map((c) => seedId(c.id)),
      ...FRUIT_TREES.map((t) => saplingId(t.id)),
      TEA_SAPLING,
      "mixed-seed",
      "tree-seed",
      "maple-seed",
      "pine-cone",
      MAHOGANY_SEED,
    ],
  ],
  ["Fruit", FRUIT_TREES.map((t) => t.id)],
  ["Forage", [...FORAGE.map((f) => f.id), TEA_LEAF]],
  ["Fertilizer", FERTILIZERS.map((f) => f.id)],
  [
    "Machines, sprinklers and chests",
    [...SPRINKLERS, ...MACHINES, ...CHESTS].map((m) => m.id),
  ],
  ["Artisan goods", ARTISAN_GOODS.map((a) => a.id)],
  ["Dishes", [...DISHES.map((d) => d.id), ALGAE_SOUP]],
  [
    "Animal goods",
    [
      "egg",
      "duck-egg",
      "feather",
      "wool",
      "milk",
      "goat-milk",
      "truffle",
      "moonwool",
      "blue-ribbon-melon",
    ],
  ],
  ["Furniture", furnitureData.map((f) => f.id)],
  ["Wallpaper and flooring", decorData.map((d) => d.id)],
  [
    "Mining",
    [
      STONE,
      COAL,
      QUARTZ,
      ...GEODE_ITEMS.map((i) => i.id),
      ...GEM_ITEMS.map((i) => i.id),
      ...ARTIFACTS.map((a) => a.id).filter(
        (id) => !GEODE_ITEMS.some((g) => g.id === id),
      ),
      ...ORES.map((o) => o.id),
      ...BARS.map((b) => b.id),
      "battery-pack",
      "lightning-rod",
      "torch",
      "campfire",
      "wood-brazier",
      "stone-brazier",
      "ornamental-hay-bale",
      "doghouse",
      "dark-doghouse",
      "cat-tree",
      "dark-cat-tree",
      "bird-house",
      ...bombData.map((b) => b.id),
      LIFE_ELIXIR,
      MINERS_TREAT,
      OIL_OF_GARLIC,
      "wood-lamp-post",
      "iron-lamp-post",
      ELDERFRUIT,
      DEEPMARK_KEY,
    ],
  ],
  [
    "Weapons and creature drops",
    [
      ...weaponData.map((w) => w.id),
      MOTH_DUST,
      ...creatureGoods.map((g) => g.id),
    ],
  ],
  [
    "Fish and rods",
    [
      ...FISH,
      ...RODS,
      ...BAITS,
      ...LURES,
      ...TRINKETS,
      ...SHELLFISH,
      ...JUNK,
      ...WATER_FINDS,
      ...POND_SPECIES.flatMap((s) => [
        { id: roeOf(s.id) },
        { id: agedRoeOf(s.id) },
      ]),
      { id: POT_ITEM },
      { id: iceFishing.frostfin.id },
    ].map((f) => f.id),
  ],
  [
    "Keepsakes",
    [
      HOMEWARD_PIN,
      WARP_TOTEM_BEACH,
      COOP_HEATER,
      ELF_LETTER,
      lanternFloat.lantern.id,
      lanternFloat.keepsake.id,
    ],
  ],
  ["Rings", RINGS.map((r) => r.id)],
  ["Boots", BOOTS.map((b) => b.id)],
  [
    "Wood and fibre",
    [
      "wood",
      "hardwood",
      "sap",
      "fiber",
      "clay",
      "hay",
      WAX,
      CANDLE,
      TAPPER,
      HEAVY_TAPPER_DEF.id,
      ...TAP_GOODS.map((g) => g.item).filter((i) => i !== "sap"),
    ],
  ],
];
for (const [group, ids] of GROUPS)
  for (const id of ids) {
    const def = items.get(id);
    if (def) def.group = group;
  }

/** The picker headings, in order, with "Other" for anything not listed. */
export const ITEM_GROUPS: readonly string[] = [
  ...GROUPS.map(([g]) => g),
  "Other",
];

/** Every base item (normal quality), for the dev menu's picker. */
export function allItems(): ItemDef[] {
  return [...items.values()];
}

const QUALITY_NAME = { silver: "Silver", gold: "Gold" } as const;

/** An item by id. A good with a quality suffix sells for more, per tier. */
export function itemById(id: string): ItemDef | undefined {
  const { base, quality } = splitQuality(id);
  let def = items.get(base);
  if (!def) {
    // A combined ring (note 95) is made, not listed.
    const ring = isCombo(base) ? ringById(base) : undefined;
    if (ring) def = { id: ring.id, name: ring.name, sellPrice: 0, keep: true };
  }
  if (!def) {
    // A custom-tailored pair of boots (note 96) is made, not listed.
    const boots = tailoredParts(base) ? bootsById(base) : undefined;
    if (boots)
      def = { id: boots.id, name: boots.name, sellPrice: 0, keep: true };
  }
  if (!def || quality === "normal") return def;
  return {
    id,
    name: `${QUALITY_NAME[quality]} ${def.name.toLowerCase()}`,
    sellPrice: Math.floor(def.sellPrice * QUALITY_MULTIPLIER[quality]),
    energy:
      def.energy === undefined
        ? undefined
        : Math.floor(def.energy * ENERGY_MULTIPLIER[quality]),
  };
}

/** The crop a seed item plants, if any. */
export function cropOfSeed(id: string): string | undefined {
  const cropId = id.endsWith("-seed") ? id.slice(0, -5) : undefined;
  return cropId && cropById(cropId) ? cropId : undefined;
}
