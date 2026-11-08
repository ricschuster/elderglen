import { SLOT_COUNT } from "./inventory";
import { seedId } from "./items";
import { farmTypeById } from "./farmtypes";
import { newGame, type GameState } from "./save";

/** Tools that are always carried and never run out. */
export const TOOLS = ["hoe", "can", "axe", "pickaxe"] as const;
export type Tool = (typeof TOOLS)[number];

/** One row of the toolbar: the tools, then twelve backpack slots. */
export const TOOLBAR_SIZE = TOOLS.length + SLOT_COUNT;

/** Everything that can be selected: the tools and every backpack slot. */
export function toolbarSize(g: GameState): number {
  return TOOLS.length + g.inventory.size;
}

/** Which row of backpack slots a selection is in (0 for the tools). */
export function rowOf(index: number): number {
  return index < TOOLS.length
    ? 0
    : Math.floor((index - TOOLS.length) / SLOT_COUNT);
}

/** The first slot of the next backpack row, wrapping (Stardew's Tab). */
export function nextRow(g: GameState, index: number): number {
  const rows = Math.ceil(g.inventory.size / SLOT_COUNT);
  return TOOLS.length + ((rowOf(index) + 1) % rows) * SLOT_COUNT;
}

/** What the player is holding. An item is a backpack stack: seeds, produce or forage. */
export type Held =
  | { kind: "tool"; tool: Tool }
  | { kind: "item"; id: string; count: number }
  | { kind: "empty" };

/** What sits at a toolbar index. Out of range reads as empty. */
export function heldAt(g: GameState, index: number): Held {
  const tool = TOOLS[index];
  if (tool) return { kind: "tool", tool };
  const stack = g.inventory.slot(index - TOOLS.length);
  return stack ? { kind: "item", ...stack } : { kind: "empty" };
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
  const seeds = farmTypeById(g.farmType).startSeeds;
  g.inventory.add(seedId(seeds.crop), seeds.count);
  return g;
}
