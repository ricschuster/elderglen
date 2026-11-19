import { depositHay, HAY, siloBlocks, siloCapacity } from "./animals";
import type { GameState } from "./save";
import { heldAt } from "./toolbar";

/**
 * Rules for what the Use button does, free of Phaser (note 106). Each function
 * returns an intent for the scene to act on: a message to show, or undefined
 * when the tile is not this rule's business.
 */

/**
 * Facing the silo: tip the held hay in, or read how full it is.
 * Returns the message, or undefined if the tile is not the silo.
 */
export function useSiloIntent(
  state: GameState,
  mapId: string,
  tx: number,
  ty: number,
  selected: number,
): string | undefined {
  if (!siloBlocks(state, mapId, tx, ty)) return undefined;
  const held = heldAt(state, selected);
  const cap = siloCapacity(state);
  if (held.kind === "item" && held.id === HAY) {
    const n = depositHay(state);
    return n > 0
      ? `${n} hay into the silo (${state.animals.hay}/${cap}).`
      : "The silo is full.";
  }
  return `The silo holds ${state.animals.hay} of ${cap} hay. Hold hay to fill it.`;
}
