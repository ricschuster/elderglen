import type { Hall } from "./bundles";
import type { GameState } from "./save";
import { hasFlag, setFlag } from "./worldflags";

/**
 * The Quarry (`docs/design/78_quarry.md`, issue #649). Its bridge on the
 * Mountain is ruined until the Foragers' Shelf is finished at the hall (owner,
 * 2026-11-08), as Stardew's Crafts Room mends its bridge. The gate is read from
 * the hall, as the greenhouse is, and has no saved flag of its own. Free of
 * Phaser and the DOM.
 */
export const QUARRY_MAP = "quarry";

/** The room whose bundles mend the bridge. */
export const QUARRY_ROOM = "foragers-shelf";

/** The gate on the Mountain's Quarry exit and the conditional bridge art. */
export const QUARRY_OPEN = "quarry-open";

/** Raised once the morning report has told the player the bridge is mended. */
export const QUARRY_TOLD = "quarry-told";

/** True once every Foragers' Shelf bundle is handed in, so the bridge is mended. */
export function quarryBridgeMended(g: { hall: Hall }): boolean {
  return g.hall.roomComplete(QUARRY_ROOM);
}

/** The conditions the Quarry bridge gives for gated exits and layers. */
export function quarryHolds(g: { hall: Hall }): string[] {
  return quarryBridgeMended(g) ? [QUARRY_OPEN] : [];
}

/**
 * The morning report's bridge line: true once, on the first night after the
 * bridge is mended, then never again (a world flag remembers it was told).
 */
export function quarryBridgeNews(g: GameState): boolean {
  if (!quarryBridgeMended(g) || hasFlag(g, QUARRY_TOLD)) return false;
  setFlag(g, QUARRY_TOLD);
  return true;
}

/** What the ruined bridge says when tried, as the greenhouse door does. */
export const QUARRY_BRIDGE_LINE =
  "The bridge is out. Finish the Foragers' Shelf bundles at the village hall to mend it.";

/** What the stonekeeper's yard post says once he has moved his camp across (note 74, note 78). */
export const YARD_EMPTY_LINE =
  "The yard is quiet. The stonekeeper has taken his camp over the mended bridge, to the Quarry.";

/** Lines for the stonekeeper at his Quarry camp, one a day (note 78: a hermit with no trade). */
export const CAMP_LINES: readonly string[] = [
  "The stonekeeper does not look up. 'Mind the loose ones. They come back every night.'",
  "The stonekeeper warms his hands at the fire. 'Good stone here. Better than a quiet life.'",
  "The stonekeeper grunts. 'Leave the flat ground clear. Set your machines there.'",
  "The stonekeeper taps the wall of his hut. 'A bridge wants stone. Someday I will build a bigger one.'",
  "The stonekeeper nods at the rubble. 'Break it, and tomorrow there is more.'",
];

/** The camp line for a day. */
export function campLine(day: number): string {
  return CAMP_LINES[Math.abs(day) % CAMP_LINES.length]!;
}
