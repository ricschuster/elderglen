import type { GameState } from "./save";
import { hasFlag, setFlag } from "./worldflags";

/**
 * The tide pool footbridge on the River delta's Beach (note 75, owner
 * 2026-11-08). It starts broken. The player hands in 300 wood at the ruined
 * tiles, once, for good, and the world flag mends it: the delta's conditional
 * layers swap the ruined art for the mended art and open the way to the pools.
 * The 300 is a placeholder for note 07. Free of Phaser and the DOM.
 */
export const TIDE_BRIDGE_FLAG = "tide-bridge-mended";
export const TIDE_BRIDGE_WOOD = 300;

/** Whether the footbridge has been mended. */
export function tideBridgeMended(g: Pick<GameState, "flags">): boolean {
  return hasFlag(g, TIDE_BRIDGE_FLAG);
}

export type MendResult =
  { ok: true } | { ok: false; reason: "already mended" | "not enough wood" };

/** Hand in the wood and mend the bridge. Nothing is taken if the wood is short. */
export function mendTideBridge(g: GameState): MendResult {
  if (tideBridgeMended(g)) return { ok: false, reason: "already mended" };
  if (!g.inventory.remove("wood", TIDE_BRIDGE_WOOD))
    return { ok: false, reason: "not enough wood" };
  setFlag(g, TIDE_BRIDGE_FLAG);
  return { ok: true };
}
