import { coveHolds } from "./cove";
import { greenhouseHolds } from "./greenhouse";
import { minesOpen } from "./mines";
import { quarryHolds } from "./quarry";
import type { GameState } from "./save";

/**
 * World flags: one-way facts the map conditions read, such as
 * `secret-log-cleared` (the massive log, note 71). Stored as a list on the
 * game state and saved with it.
 */
export function hasFlag(g: Pick<GameState, "flags">, flag: string): boolean {
  return g.flags?.includes(flag) === true;
}

/** Raise a flag. Raising one that is up changes nothing. */
export function setFlag(g: Pick<GameState, "flags">, flag: string): void {
  if (!hasFlag(g, flag)) g.flags = [...(g.flags ?? []), flag];
}

/**
 * Every condition that holds now, for gated exits and conditional layers: the
 * greenhouse gate and each world flag.
 */
export function holdsOf(g: GameState): Set<string> {
  const holds = new Set([
    ...greenhouseHolds(g),
    ...quarryHolds(g),
    ...coveHolds(g),
    ...(g.flags ?? []),
  ]);
  // The rockfall below the mine mouth is cleared on the day the mines open.
  if (minesOpen(g.day.clock.day)) holds.add("mines-open");
  return holds;
}
