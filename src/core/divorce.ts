import { HOUSE_MAP, DIVORCE_CHEST_TILE, spouseRoomArea } from "./house";
import { DIVORCE_FEE, exFlag, exSpouses } from "./marriage";
import type { GameState } from "./save";
import { villagerById } from "./villagers";
import { hasFlag, setFlag } from "./worldflags";

/**
 * Divorce (note 12, slice 4, #937; notes 84 and 85). Pure rules. Only the
 * player starts it, at the hall ledger. It costs `DIVORCE_FEE` (50,000g, paid
 * when filed, handed back if cancelled) and takes effect the next morning
 * unless the player cancels before the day ends (Stardew: until the office
 * closes). Friendship stays at the old hearts: no anger, no reset (ours, not
 * Stardew's). The text is placeholder.
 */

/** The chest that holds the spouse room's furniture and chests after a divorce (note 85). */
export const DIVORCE_CHEST = "chest";

const nameOf = (id: string): string => villagerById(id)?.name ?? id;

export const isEx = (g: Pick<GameState, "flags">, id: string): boolean =>
  hasFlag(g, exFlag(id));

/** Former spouses, in the order the flags were raised. */
export const exesOf = (g: Pick<GameState, "flags">): string[] => exSpouses(g);

/**
 * A former spouse does not come to a later wedding (note 84, Stardew checked).
 * The wedding scene is built from the id with no guest list yet, so a guest
 * list filters through this when one exists.
 */
export const attendsWedding = (
  g: Pick<GameState, "flags">,
  id: string,
): boolean => !isEx(g, id);

/** Why the ledger cannot be filed now, in words, or "" when it can. */
export function divorceProblem(
  g: Pick<GameState, "marriage" | "money">,
): string {
  if (!g.marriage.married) return "There is nothing to file. You are not wed.";
  if (g.marriage.divorcing) return "The divorce is already filed.";
  if (g.money < DIVORCE_FEE)
    return `The fee is ${DIVORCE_FEE}g. You need ${DIVORCE_FEE - g.money}g more.`;
  return "";
}

/** File the divorce: pay the fee now, take effect next morning. False if it cannot. */
export function fileDivorce(g: GameState): boolean {
  if (divorceProblem(g)) return false;
  g.money -= DIVORCE_FEE;
  g.marriage.divorcing = true;
  return true;
}

/** Withdraw a filed divorce before the day ends. The fee is handed back. False if none is filed. */
export function cancelDivorce(g: GameState): boolean {
  if (!g.marriage.married || !g.marriage.divorcing) return false;
  g.marriage.divorcing = false;
  g.money += DIVORCE_FEE;
  return true;
}

/**
 * Move every piece of furniture and every chest the player put in the spouse
 * room into the divorce chest, which shows in the bedroom (note 85). A chest's
 * contents go in too. What does not fit goes to the backpack, then (furniture)
 * the stash a house upgrade uses. A chest that cannot be emptied stays where it
 * is, with what is left in it. Returns how many things moved.
 */
export function clearSpouseRoom(g: GameState): number {
  const area = spouseRoomArea();
  const { x: cx, y: cy } = DIVORCE_CHEST_TILE;
  const box =
    g.chests.get(HOUSE_MAP, cx, cy) ??
    g.chests.add(HOUSE_MAP, cx, cy, DIVORCE_CHEST)!;
  const store = (id: string, n: number): number => {
    const toBox = Math.min(n, box.items.room(id));
    if (toBox > 0) box.items.add(id, toBox);
    const toPack = Math.min(n - toBox, g.inventory.room(id));
    if (toPack > 0) g.inventory.add(id, toPack);
    return n - toBox - toPack;
  };
  let moved = 0;
  for (const f of [...g.furniture.each(HOUSE_MAP)]) {
    if (!area.has(`${f.x},${f.y}`)) continue;
    g.furniture.remove(HOUSE_MAP, f.x, f.y);
    if (store(f.id, 1) > 0) g.furniture.stash.push(f.id);
    moved += 1;
  }
  for (const c of [...g.chests.each(HOUSE_MAP)]) {
    if (!area.has(`${c.x},${c.y}`) || (c.x === cx && c.y === cy)) continue;
    for (let i = 0; i < c.items.size; i++) {
      const slot = c.items.slot(i);
      if (!slot) continue;
      const left = store(slot.id, slot.count);
      c.items.remove(slot.id, slot.count - left);
    }
    const empty = c.items.save().every((s) => s === null);
    if (!empty || store(c.id, 1) > 0) continue;
    g.chests.remove(HOUSE_MAP, c.x, c.y);
    moved += 1;
  }
  return moved;
}

/** What the divorce did, for the morning report. */
export interface DivorceNews {
  /** The former spouse's name. */
  name: string;
  /** Hearts kept, whole. */
  hearts: number;
  /** Children at the time. Slice 5 decides what happens to them: today they are dropped with the marriage. */
  children: number;
}

/**
 * The morning a filed divorce takes effect. The marriage ends, the spouse cap
 * drops, the room and the route go (every one gates on `marriage.married`),
 * the wedding is cleared, `ex-<id>` is raised and the room's furniture goes to
 * the divorce chest. Friendship points are untouched. Returns undefined when
 * no divorce is filed.
 */
export function divorceMorning(g: GameState): DivorceNews | undefined {
  const m = g.marriage;
  const id = m.spouse;
  if (!m.married || !m.divorcing || !id) return undefined;
  const children = m.children;
  m.end();
  g.friendship.setSpouse(null);
  setFlag(g, exFlag(id));
  g.friendship.setExes(exSpouses(g));
  clearSpouseRoom(g);
  return {
    name: nameOf(id),
    hearts: g.friendship.hearts(id),
    children,
  };
}

/** Report lines for the morning (placeholder text). */
export function divorceReportLines(n: DivorceNews | undefined): string[] {
  if (!n) return [];
  return [
    `PLACEHOLDER TEXT: the ledger is closed. ${n.name} has moved back to their own home, and bears you no ill will.`,
  ];
}
