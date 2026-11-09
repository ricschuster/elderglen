import type { GameState } from "./save";
import { COAL, COPPER_ORE, ORES } from "./ore";

/** What the smith dwarf sells: the three ores and coal, never bars (note 22). */
export const SMITH_STOCK: string[] = [...ORES.map((o) => o.id), COAL];

/**
 * Hand the smith one copper ore, the first time of which makes her bring the
 * furnace the next morning (note 22, decision 11). Returns false with no ore.
 * Later hand-overs are refused: the ore is only a first gift.
 */
export function handOverCopper(g: GameState): boolean {
  if (g.mines.copperHandedIn || !g.inventory.remove(COPPER_ORE, 1))
    return false;
  g.mines.copperHandedIn = true;
  return true;
}

/** True when the smith has been given copper and the furnace is still owed. */
export function furnaceOwed(g: GameState): boolean {
  return g.mines.copperHandedIn && !g.furnace.gifted;
}

/** Morning job: deliver the furnace if it is owed. Returns true if it came. */
export function deliverFurnace(g: GameState): boolean {
  if (!furnaceOwed(g)) return false;
  g.furnace.gifted = true;
  return true;
}

/** What the stonekeeper dwarf says at his bench in the yard (note 74). */
export const STONEKEEPER_LINE =
  "The stonekeeper taps a block. 'The bridge east is out. Come back when the hall has mended it.'";
