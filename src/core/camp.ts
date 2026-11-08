import type { Outcome } from "./actions";
import { campGift, MINES_OPEN_DAY } from "./mines";
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
 * Take the day's gift from a camp chest. It refills each morning and holds a
 * few things to take, nothing can be put in (note 22). All or nothing, so a
 * full backpack leaves it for later.
 */
export function takeCampGift(g: GameState, floor = 10): Outcome {
  const day = g.day.clock.day;
  if (g.mines.campTakenOn(floor) === day) return fail("camp chest empty");
  const before = g.inventory.save();
  const gift = campGift(day, floor);
  for (const s of gift)
    if (!g.inventory.add(s.id, s.count)) {
      g.inventory.load(before);
      return fail("backpack full");
    }
  g.mines.takeCamp(floor, day);
  return { ok: true, item: gift[0]?.id };
}
