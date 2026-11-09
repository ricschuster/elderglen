import { HARDWOOD } from "./items";
import { swingCost } from "./upgrades";
import { noteGathered } from "./quests";
import type { LogSpot } from "./map";
import type { GameState } from "./save";
import { hasFlag, setFlag } from "./worldflags";

/**
 * The massive log (note 71, Map contract additions; axe rules in note 44). It
 * stands solid until it is chopped once, with a steel axe or better. It gives
 * 8 Hardwood and 25 Foraging XP, then sets its world flag, which opens whatever
 * the map names as `when` that flag. Free of Phaser and the DOM.
 */
export const LOG_HARDWOOD = 8;
export const LOG_XP = 25;
/** Steel is tier 2 (`TIER_NAMES` in `upgrades.ts`). */
export const LOG_TIER = 2;
const LOG_ENERGY = 2;

/** Whether the log is gone: its flag is up. */
export function logCleared(g: Pick<GameState, "flags">, log: LogSpot): boolean {
  return hasFlag(g, log.flag);
}

export type LogResult =
  | { ok: true; levelUp?: { level: number } }
  | { ok: false; reason: "cleared" | "exhausted" | "needs a better axe" };

/**
 * Chop the log. Goods that do not fit the backpack land on the log's tile and
 * are pulled in by walking over them, so none are lost.
 */
export function chopLog(g: GameState, log: LogSpot): LogResult {
  if (logCleared(g, log)) return { ok: false, reason: "cleared" };
  if (g.day.over) return { ok: false, reason: "exhausted" };
  if (g.toolTiers.axe < LOG_TIER)
    return { ok: false, reason: "needs a better axe" };
  g.day.act(
    swingCost(LOG_ENERGY, g.toolTiers.axe, g.skills.level("foraging")),
    0,
  );
  const fits = Math.min(LOG_HARDWOOD, g.inventory.room(HARDWOOD));
  if (fits > 0 && g.inventory.add(HARDWOOD, fits))
    noteGathered(g, HARDWOOD, fits);
  if (fits < LOG_HARDWOOD)
    g.ground.drop(log.x, log.y, HARDWOOD, LOG_HARDWOOD - fits);
  const level = g.skills.gain("foraging", LOG_XP);
  setFlag(g, log.flag);
  return { ok: true, ...(level ? { levelUp: { level } } : {}) };
}
