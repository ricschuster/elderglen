import { SLOT_COUNT, type Inventory } from "./inventory";
import type { WalletMode } from "./players";
import { seedId } from "./items";
import { farmTypeById } from "./farmtypes";
import { maps } from "../content/maps";
import { START_GRASS } from "./grass";
import { grassFree } from "./sleep";
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

/** The tools and starting seeds every new player begins with (the host, and each guest on joining). */
export function giveStartKit(inv: Inventory, farmType: string): void {
  ensureTools(inv);
  const seeds = farmTypeById(farmType).startSeeds;
  inv.add(seedId(seeds.crop), seeds.count);
}

/** A new game on a farm type, with its starting seeds in the backpack. */
export function startGame(
  farmType?: string,
  random: () => number = Math.random,
  walletMode?: WalletMode,
): GameState {
  const g = newGame(farmType, walletMode);
  giveStartKit(g.inventory, g.farmType);
  const map = maps.get(farmTypeById(g.farmType).map);
  g.grass.scatter(
    START_GRASS,
    random,
    (x, y) => grassFree(g, map, x, y),
    () => map.tillableTiles(),
  );
  return g;
}
