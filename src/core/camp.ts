import type { Outcome } from "./actions";
import { campItem, MINES_OPEN_DAY } from "./mines";
import type { GameState } from "./save";

/**
 * The mine's small beats (`docs/design/22_mines.md`): Old Greencoat's news at
 * the farm door on the day the mines open, and the rest camp chest on floor 10.
 * Pure rules.
 */

/** True on the morning the mines open, until Old Greencoat has been heard. */
export function greencoatDue(g: GameState): boolean {
  return !g.mines.greeted && g.day.clock.day === MINES_OPEN_DAY;
}

/** What Old Greencoat says at the door. He gives nothing, only the news (decided, note 22). Placeholder words, the dialogue note is unwritten. */
export const GREENCOAT_LINES = [
  "Morning. The rockfall at the mine is cleared and the way is open.",
  "Take a pickaxe and some patience. Mind the dark, and come up when you tire.",
];

/** Mark the news as given. */
export function hearGreencoat(g: GameState): void {
  g.mines.greeted = true;
}

const fail = (reason: string): Outcome => ({ ok: false, reason });

/**
 * Open a camp chest. The first open gives its one fixed item (`campItem`), after
 * that it is empty (owner, 2026-11-11, note 22). Floor 30 holds nothing. A full
 * backpack leaves the item for later.
 */
export function takeCampGift(g: GameState, floor = 10): Outcome {
  const item = campItem(floor);
  if (!item || g.mines.campOpenedOn(floor)) return fail("camp chest empty");
  if (!g.inventory.add(item, 1)) return fail("backpack full");
  g.mines.openCamp(floor);
  return { ok: true, item };
}
