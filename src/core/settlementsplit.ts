import { LOCAL_PLAYER, type PlayerId } from "./players";

/** Placeholder label for a player id: "You" is not known here, so "Player N" from the id. */
export function playerLabel(id: PlayerId): string {
  if (id === LOCAL_PLAYER) return "Host";
  const n = /^p(\d+)$/.exec(id);
  return n ? `Player ${n[1]}` : id;
}

/**
 * The per-player split of a bin settlement (note 28). Empty when fewer than two
 * players have proceeds, so single-player output is unchanged.
 */
export function settlementSplit(byPlayer: Record<PlayerId, number>): string[] {
  const paid = Object.entries(byPlayer).filter(([, n]) => n > 0);
  if (paid.length < 2) return [];
  return paid
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([id, n]) => `${playerLabel(id)} ${n}g`);
}

/** The split on one line, or an empty string. */
export function settlementSplitText(
  byPlayer: Record<PlayerId, number>,
): string {
  return settlementSplit(byPlayer).join(", ");
}

/** Proceeds per shipper of the lines still in the bin (same shape as Settlement.byPlayer). */
export function pendingByPlayer(
  lines: readonly { count: number; unit: number; by?: PlayerId }[],
): Record<PlayerId, number> {
  const out: Record<PlayerId, number> = {};
  for (const l of lines) {
    const who = l.by ?? LOCAL_PLAYER;
    out[who] = (out[who] ?? 0) + l.count * l.unit;
  }
  return out;
}
