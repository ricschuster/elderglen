import type { Outcome } from "./actions";
import { campItem, MINES_OPEN_DAY } from "./mines";
import { absorbElderfruit } from "./elderfruit";
import { ELDERFRUIT } from "./items";
import { LOCAL_PLAYER } from "./players";
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
 * Whether the acting player has taken this camp's one item. Each player opens each chest once for
 * themselves (note 109 rule 4): the host's list is the mine's, a guest's is on their combat record.
 */
function opened(g: GameState, floor: number): boolean {
  return g.players.localId === LOCAL_PLAYER
    ? g.mines.campOpenedOn(floor)
    : g.combat.campOpened.includes(floor);
}

function markOpened(g: GameState, floor: number): void {
  if (g.players.localId === LOCAL_PLAYER) g.mines.openCamp(floor);
  else if (!g.combat.campOpened.includes(floor))
    g.combat.campOpened.push(floor);
}

/**
 * Open a camp chest. The first open gives its one fixed item (`campItem`), after
 * that it is empty (owner, 2026-11-11, note 22). Floor 30 holds nothing. A full
 * backpack leaves the item for later.
 */
export function takeCampGift(g: GameState, floor = 10): Outcome {
  const item = campItem(floor);
  if (!item || opened(g, floor)) return fail("camp chest empty");
  if (!g.inventory.add(item, 1)) return fail("backpack full");
  markOpened(g, floor);
  if (item === ELDERFRUIT) absorbElderfruit(g);
  return { ok: true, item };
}

/** What a camp chest holds now: its one item, until it is taken (none on floor 30). */
export function campChestContents(
  g: GameState,
  floor = 10,
): string | undefined {
  return opened(g, floor) ? undefined : campItem(floor);
}

/**
 * A move on the camp chest screen (owner, 2026-11-20, note 22). The chest is take only:
 * the one item goes to the pack by `takeCampGift`; nothing goes from the pack in.
 */
export function campChestMove(
  g: GameState,
  floor: number,
  from: "chest" | "pack",
): Outcome {
  if (from === "pack") return fail("camp chest take only");
  return takeCampGift(g, floor);
}
