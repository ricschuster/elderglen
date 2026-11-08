import standIn from "../content/carpenter-standin.json";
import { HARDWOOD } from "./items";
import type { GameState } from "./save";

/**
 * TEMPORARY stand-in: the carpenter sells Hardwood while real supply is gated
 * (note 43). Content is `src/content/carpenter-standin.json`. Remove it when
 * logs, the Secret Woods, Mahogany or Mines hardwood exist (PRIORITIES.md).
 * Pure rules, no Phaser.
 */
export const HARDWOOD_STANDIN_ENABLED: boolean = standIn.hardwood.enabled;
export const HARDWOOD_STANDIN_PRICE: number = standIn.hardwood.price;

/** Why one Hardwood cannot be bought now, or undefined if it can. */
export function hardwoodProblem(g: GameState): string | undefined {
  if (!HARDWOOD_STANDIN_ENABLED)
    return "The carpenter has no hardwood to sell.";
  if (g.money < HARDWOOD_STANDIN_PRICE)
    return `Hardwood costs ${HARDWOOD_STANDIN_PRICE}g.`;
  return undefined;
}

/** Buy n Hardwood. Returns how many were bought, paying only for those. */
export function buyHardwood(g: GameState, n = 1): number {
  if (!HARDWOOD_STANDIN_ENABLED || n <= 0) return 0;
  let got = 0;
  while (got < n && g.money >= HARDWOOD_STANDIN_PRICE) {
    if (!g.inventory.add(HARDWOOD, 1)) break;
    g.money -= HARDWOOD_STANDIN_PRICE;
    got++;
  }
  return got;
}
