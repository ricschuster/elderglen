import { CROPS, cropById } from "./crops";
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
import decorData from "../content/decor.json";
import furnitureData from "../content/furniture.json";
import { ARTISAN_GOODS } from "./artisan";
import { MACHINES } from "./processing";
import { DISHES } from "./dishes";
import { CHESTS } from "./chestdefs";
import { GEODE_ITEMS } from "./geodes";
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
for (const c of CROPS) {
  items.set(c.id, {
    id: c.id,
    name: c.name,
    sellPrice: c.sellPrice,
    energy: c.energy,
  });
  items.set(seedId(c.id), {
    id: seedId(c.id),
    name: `${c.name} seeds`,
    sellPrice: Math.floor(c.seedPrice / 2),
    buyPrice: c.seedPrice,
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
/** Fiber comes from weeds and sells for 1g, as Stardew's (`29_weeds.md`). It is always normal quality. */
items.set("fiber", { id: "fiber", name: "Fiber", sellPrice: 1 });
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
/** Mixed seeds plant a random crop that suits the season. Sell price is ours. */
items.set("mixed-seed", {
  id: "mixed-seed",
  name: "Mixed seeds",
  sellPrice: 5,
});
/** Sell price is ours, a placeholder. */
items.set("tree-seed", { id: "tree-seed", name: "Tree seed", sellPrice: 5 });

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
items.set(QUARTZ, {
  id: QUARTZ,
  name: "Quartz crystal",
  sellPrice: QUARTZ_SELL_PRICE,
});
for (const o of ORES) items.set(o.id, { ...o });
for (const b of BARS)
  items.set(b.id, { id: b.id, name: b.name, sellPrice: b.sellPrice });

/** Heading each item for the dev menu's picker, in the order the groups list. */
const GROUPS: [string, string[]][] = [
  ["Crops", CROPS.map((c) => c.id)],
  [
    "Seeds and saplings",
    [
      ...CROPS.map((c) => seedId(c.id)),
      ...FRUIT_TREES.map((t) => saplingId(t.id)),
      "mixed-seed",
      "tree-seed",
    ],
  ],
  ["Fruit", FRUIT_TREES.map((t) => t.id)],
  ["Forage", FORAGE.map((f) => f.id)],
  ["Fertilizer", FERTILIZERS.map((f) => f.id)],
  [
    "Machines, sprinklers and chests",
    [...SPRINKLERS, ...MACHINES, ...CHESTS].map((m) => m.id),
  ],
  ["Artisan goods", ARTISAN_GOODS.map((a) => a.id)],
  ["Dishes", DISHES.map((d) => d.id)],
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
      ...ORES.map((o) => o.id),
      ...BARS.map((b) => b.id),
    ],
  ],
  ["Wood and fibre", ["wood", "sap", "fiber"]],
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
  const def = items.get(base);
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
