import type { Inventory } from "./inventory";

/**
 * The four tools (note 102). Each is an ordinary one-item stack in the pack, so
 * it can be moved, swapped and put on any toolbar slot, but it is never trashed,
 * sold, shipped, stored in a chest or lost in a defeat. Its upgrade tier lives
 * in `GameState.toolTiers`, so an upgrade never has to find the stack.
 */
export const TOOLS = ["hoe", "can", "axe", "pickaxe"] as const;
export type Tool = (typeof TOOLS)[number];

const PREFIX = "tool:";

/** The pack item id of a tool. */
export const toolItemId = (tool: Tool): string => `${PREFIX}${tool}`;

/** Which tool an item id is, if it is a tool stack. */
export function toolOfId(id: string): Tool | undefined {
  return TOOLS.find((t) => id === toolItemId(t));
}

export const isToolId = (id: string): boolean => toolOfId(id) !== undefined;

/** The first pack slot holding the tool, or -1 if it is not carried. */
export function findTool(inv: Inventory, tool: Tool): number {
  const id = toolItemId(tool);
  for (let i = 0; i < inv.size; i++) if (inv.slot(i)?.id === id) return i;
  return -1;
}

/**
 * Make sure every tool is in the pack. New games and old saves (which kept the
 * tools apart) get any missing tool in the front slots, shifting the stacks
 * behind it along into free slots. Nothing is ever dropped: with a full pack
 * the pack grows past its size for the missing tools. Returns true if it added any.
 */
export function ensureTools(inv: Inventory): boolean {
  const missing = TOOLS.filter((t) => findTool(inv, t) < 0);
  if (missing.length === 0) return false;
  const slots = [
    ...missing.map((t) => ({ id: toolItemId(t), count: 1 })),
    ...inv.save(),
  ];
  // Close up empty slots behind the tools until the stacks fit.
  for (
    let i = slots.length - 1;
    i >= missing.length && slots.length > inv.size;
    i--
  )
    if (slots[i] === null) slots.splice(i, 1);
  inv.load(slots, true);
  return true;
}
