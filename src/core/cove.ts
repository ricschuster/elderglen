import type { Hall } from "./bundles";
import { dateOf } from "./calendar";
import type { GameState } from "./save";
import { hasFlag, setFlag } from "./worldflags";

/**
 * The Lake cove and the ferry (`docs/design/76_lake_cove.md`, issue #644). The
 * ferry on the delta is ruined until the Water room is finished at the hall, as
 * the Quarry bridge waits on the Foragers' Shelf. The gate is read from the
 * hall and has no saved flag of its own. Nobody keeps the ferry: it is a door.
 * Free of Phaser and the DOM.
 */
export const COVE_MAP = "cove";

/** The room whose bundles mend the ferry. */
export const COVE_ROOM = "water-room";

/** The gate on the delta's ferry exit and the conditional ferry art. */
export const COVE_OPEN = "cove-open";

/** Raised once the morning report has told the player the ferry is mended. */
export const COVE_TOLD = "cove-told";

/** True once every Water room bundle is handed in, so the ferry is mended. */
export function ferryMended(g: { hall: Hall }): boolean {
  return g.hall.roomComplete(COVE_ROOM);
}

/** The conditions the ferry gives for gated exits and layers. */
export function coveHolds(g: { hall: Hall }): string[] {
  return ferryMended(g) ? [COVE_OPEN] : [];
}

/**
 * The morning report's ferry line: true once, on the first night after the
 * ferry is mended, then never again (a world flag remembers it was told).
 */
export function ferryNews(g: GameState): boolean {
  if (!ferryMended(g) || hasFlag(g, COVE_TOLD)) return false;
  setFlag(g, COVE_TOLD);
  return true;
}

/** What the ruined ferry says when tried, as the Quarry bridge does. */
export const FERRY_LINE =
  "The ferry is a wreck. Finish the Water room bundles at the village hall to repair it.";

// ---- the hidden treasure spot (note 76, decision 8)

/** The service kind of the treasure tile on the cove's shore. */
export const COVE_TREASURE = "cove-treasure";

/**
 * One chest a season, never random: a seasonal pick from pools of existing
 * notes (geodes, a lure, bait). Placeholders for note 07. No unique item, so
 * no bundle or completion tracker can need it.
 */
export const TREASURE: Record<string, { id: string; count: number }> = {
  spring: { id: "geode", count: 3 },
  summer: { id: "fine-bait", count: 10 },
  fall: { id: "moth-lure", count: 1 },
  winter: { id: "frozen-geode", count: 2 },
};

/** The world flag that records this season's chest as taken. */
export function treasureFlag(day: number): string {
  const d = dateOf(day);
  return `cove-chest-${d.year}-${d.season}`;
}

/** This season's chest for a day. */
export function treasureOf(day: number): { id: string; count: number } {
  return TREASURE[dateOf(day).season]!;
}

export type TreasureResult =
  | { ok: true; id: string; count: number }
  | { ok: false; reason: "taken" | "backpack full" };

/**
 * Open the chest. Once a season: the flag goes up only when the goods fit, so a
 * full backpack leaves the chest for later.
 */
export function takeTreasure(g: GameState): TreasureResult {
  const day = g.day.clock.day;
  if (hasFlag(g, treasureFlag(day))) return { ok: false, reason: "taken" };
  const t = treasureOf(day);
  if (!g.inventory.add(t.id, t.count))
    return { ok: false, reason: "backpack full" };
  setFlag(g, treasureFlag(day));
  return { ok: true, ...t };
}
