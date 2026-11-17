import toolText from "../content/tool-text.json";
import { chestById } from "./chestdefs";
import { itemById } from "./items";
import { splitQuality } from "./quality";
import { TIER_NAMES } from "./upgrades";

/** What a hover or long-press tooltip shows (note 103, decision 4). */
export interface ItemTip {
  name: string;
  /** The coloured type line: Tool, Seed, Food, Item. */
  kind: string;
  text: string;
}

/** Colours for the type line, by kind. */
export const KIND_COLOURS: Record<string, string> = {
  Tool: "#9fd4ff",
  Seed: "#a8e08a",
  Food: "#ffcf7a",
  Item: "#d8d8d8",
  Chest: "#e0b070",
  Friend: "#ffe9a0",
  Dating: "#ffb0c0",
  Engaged: "#ffb0c0",
  Spouse: "#ff8aa0",
};

const TOOLS = toolText as Record<string, { name: string; text: string }>;

/**
 * The tip for an item id (maybe with a quality suffix) or a `tool:<name>` id.
 * `tier` is the tool's upgrade tier, used only for tools. Unknown ids still
 * get a tip, so a hover never shows nothing.
 */
export function itemTip(id: string, tier = 0, extra?: string): ItemTip {
  const { base, quality } = splitQuality(id);
  if (base.startsWith("tool:")) {
    const tool = base.slice(5);
    const t = TOOLS[tool];
    const name = t?.name ?? tool;
    const tierName = tier > 0 ? TIER_NAMES[tier] : undefined;
    return {
      name: tierName ? `${tierName} ${name.toLowerCase()}` : name,
      kind: "Tool",
      text: [t?.text ?? "A tool.", extra].filter(Boolean).join("\n"),
    };
  }
  const def = itemById(base);
  const name = def?.name ?? base;
  const suffix = quality === "normal" ? "" : ` (${quality})`;
  const described = (def as { description?: string } | undefined)?.description;
  if (base.endsWith("-seed") && def)
    return {
      name: name + suffix,
      kind: "Seed",
      text: described ?? "Plant it in tilled soil.",
    };
  if (def?.energy !== undefined && def.energy > 0)
    return {
      name: name + suffix,
      kind: "Food",
      text: described ?? `Eat it to gain ${def.energy} energy.`,
    };
  return {
    name: name + suffix,
    kind: "Item",
    text:
      described ??
      (def?.keep ? "Not for sale." : def ? `Sells for ${def.sellPrice}g.` : ""),
  };
}

/**
 * The tip for a placed chest: its name, how full it is, and what its contents
 * would sell for (the chest itself is never for sale). Pure over the stacks.
 */
export function chestTip(
  name: string,
  stacks: readonly ({ id: string; count: number } | null | undefined)[],
): ItemTip {
  let used = 0;
  let items = 0;
  let worth = 0;
  for (const s of stacks) {
    if (!s) continue;
    used++;
    items += s.count;
    const def = itemById(splitQuality(s.id).base);
    if (def && !def.keep) worth += def.sellPrice * s.count;
  }
  return {
    name,
    kind: "Item",
    text:
      used === 0
        ? `Empty. ${stacks.length} slots. Not for sale.`
        : `${items} items in ${used} of ${stacks.length} slots.\nContents sell for about ${worth}g.\nNot for sale.`,
  };
}

/** The parts of a placed chest a tip needs (kept structural so this file stays light). */
export interface ChestLike {
  id: string;
  items: {
    size: number;
    slot(i: number): { id: string; count: number } | undefined;
  };
  order?: string;
  closed?: boolean;
}

/** How many of the fullest item names a chest tip lists. */
const CHEST_TIP_ITEMS = 3;

/**
 * The tip for a chest standing in the world: its name, how full it is and what
 * most of it is. Hovered (desktop) or long-pressed (touch) on the farm.
 */
export function placedChestTip(chest: ChestLike): ItemTip {
  const def = chestById(chest.id);
  const totals = new Map<string, number>();
  let used = 0;
  for (let i = 0; i < chest.items.size; i++) {
    const s = chest.items.slot(i);
    if (!s) continue;
    used++;
    const base = splitQuality(s.id).base;
    totals.set(base, (totals.get(base) ?? 0) + s.count);
  }
  const lines = [`${used} of ${chest.items.size} slots used.`];
  if (used === 0) lines[0] = `Empty (${chest.items.size} slots).`;
  else {
    const top = [...totals.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, CHEST_TIP_ITEMS)
      .map(([id, n]) => `${itemById(id)?.name ?? id} x${n}`);
    const more = totals.size - top.length;
    lines.push(top.join(", ") + (more > 0 ? `, and ${more} more` : ""));
  }
  if (chest.order)
    lines.push(chest.closed ? "Its order has ended." : "Bound to an order.");
  return { name: def?.name ?? "Chest", kind: "Chest", text: lines.join("\n") };
}
