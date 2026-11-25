import { coveHolds } from "./cove";
import { hostMarriage } from "./playerid";
import {
  DIVORCE_CHEST_HOLD,
  DIVORCE_CHEST_MAP,
  DIVORCE_CHEST_TILE,
} from "./divorcechest";
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
  // The host being married gives the farm house its spouse room and corner (note 85, note 110).
  if (g.marriage && hostMarriage(g).married) holds.add("spouse");
  // The divorce chest shows once a divorce has made it (note 85, "Divorce").
  const c = DIVORCE_CHEST_TILE;
  if (g.chests?.get(DIVORCE_CHEST_MAP, c.x, c.y)) holds.add(DIVORCE_CHEST_HOLD);
  // The rockfall below the mine mouth is cleared on the day the mines open.
  if (minesOpen(g.day.clock.day)) holds.add("mines-open");
  return holds;
}
