import toolText from "../content/tool-text.json";
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
