// The guest's copy of the farm follows the host (note 53, issue 976). Rule: no prediction. A guest
// sends an intent and waits for the host's `applied`, which goes to everyone, the sender included,
// so every intent (own or another player's) is applied exactly once. A `rejected` changes nothing
// locally (the scene shows the reason). Pure: no Phaser, no DOM.
import type { ServerMsg } from "../core/protocol";
import { applyFarmIntent } from "../core/roomintents";
import type { GameState } from "../core/save";

/**
 * Apply one server message to the guest's farm copy. True when the farm changed.
 * The host already accepted the intent, so a refusal here means the copies drifted (for example a
 * random roll); the copy is left as it is and the next `farm` message replaces it.
 */
export function applyServerMsg(
  g: GameState,
  m: ServerMsg,
  random: () => number = Math.random,
): boolean {
  if (m.t !== "applied") return false;
  if (!g.players.has(m.by)) return false;
  const r = applyFarmIntent(g, m.by, m.intent, random);
  return r === undefined;
}
