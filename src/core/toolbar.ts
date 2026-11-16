import { SLOT_COUNT } from "./inventory";
import { seedId } from "./items";
import { farmTypeById } from "./farmtypes";
import { newGame, type GameState } from "./save";
import { ensureTools, toolOfId, type Tool } from "./toolitems";

export { TOOLS, findTool, type Tool } from "./toolitems";

/** One row of the toolbar: twelve backpack slots, tools included (note 102). */
export const TOOLBAR_SIZE = SLOT_COUNT;

/** Everything that can be selected: every backpack slot. */
export function toolbarSize(g: GameState): number {
  return g.inventory.size;
}

/** Which row of backpack slots a selection is in. */
export function rowOf(index: number): number {
  return Math.floor(index / SLOT_COUNT);
}

/** The first slot of the next backpack row, wrapping (Stardew's Tab). */
export function nextRow(g: GameState, index: number): number {
  const rows = Math.ceil(g.inventory.size / SLOT_COUNT);
  return ((rowOf(index) + 1) % rows) * SLOT_COUNT;
}

/** What the player is holding. An item is a backpack stack: seeds, produce or forage. */
export type Held =
  | { kind: "tool"; tool: Tool }
  | { kind: "item"; id: string; count: number }
  | { kind: "empty" };

/** What sits at a toolbar index. Out of range reads as empty. */
export function heldAt(g: GameState, index: number): Held {
  const stack = g.inventory.slot(index);
  if (!stack) return { kind: "empty" };
  const tool = toolOfId(stack.id);
  return tool ? { kind: "tool", tool } : { kind: "item", ...stack };
}

/** Step the selection by one, wrapping at both ends. */
export function cycle(
  index: number,
  step: 1 | -1,
  size = TOOLBAR_SIZE,
): number {
  return (index + step + size) % size;
}

/** A new game on a farm type, with its starting seeds in the backpack. */
export function startGame(farmType?: string): GameState {
  const g = newGame(farmType);
  ensureTools(g.inventory);
  const seeds = farmTypeById(g.farmType).startSeeds;
  g.inventory.add(seedId(seeds.crop), seeds.count);
  return g;
}
