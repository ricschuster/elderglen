import { bootsById, ringById, type Equipment } from "./equipment";
import { STACK_SIZE, type Inventory } from "./inventory";
import { allItems, itemById } from "./items";
import { splitQuality } from "./quality";
import { isToolId, TOOLS, toolItemId } from "./toolitems";

/**
 * The Pack tab's rules (note 49): move, split, sort and trash. Tools are
 * ordinary stacks here (note 102): they move and swap freely, but never trash.
 * Pure functions over the backpack, free of Phaser, so the scene only draws and taps.
 */

type Stack = { id: string; count: number } | null;

function edit(inv: Inventory, change: (slots: Stack[]) => boolean): boolean {
  const slots = inv.save();
  if (!change(slots)) return false;
  inv.load(slots);
  return true;
}

const inRange = (inv: Inventory, i: number): boolean =>
  Number.isInteger(i) && i >= 0 && i < inv.size;

/**
 * Move the whole stack in `from` onto `to`. An empty slot takes it, the same
 * item merges up to the stack limit (the rest stays), and a different item
 * swaps places. Returns false if nothing changed.
 */
export function moveStack(inv: Inventory, from: number, to: number): boolean {
  if (!inRange(inv, from) || !inRange(inv, to) || from === to) return false;
  return edit(inv, (s) => {
    const a = s[from];
    if (!a) return false;
    const b = s[to];
    if (!b) {
      s[to] = a;
      s[from] = null;
    } else if (b.id === a.id) {
      const put = Math.min(a.count, STACK_SIZE - b.count);
      if (put === 0) return false;
      b.count += put;
      a.count -= put;
      if (a.count === 0) s[from] = null;
    } else {
      s[to] = a;
      s[from] = b;
    }
    return true;
  });
}

/**
 * Move half of the stack in `from` (rounded down, at least one when the stack
 * has two or more) onto `to`, which must be empty or hold the same item.
 */
export function splitStack(inv: Inventory, from: number, to: number): boolean {
  if (!inRange(inv, from) || !inRange(inv, to) || from === to) return false;
  return edit(inv, (s) => {
    const a = s[from];
    if (!a || a.count < 2) return false;
    const b = s[to];
    if (b && b.id !== a.id) return false;
    const put = Math.min(Math.floor(a.count / 2), STACK_SIZE - (b?.count ?? 0));
    if (put === 0) return false;
    s[to] = { id: a.id, count: (b?.count ?? 0) + put };
    a.count -= put;
    return true;
  });
}

/** Where an item sits in game order: the order of the item table. */
function rankOf(): Map<string, number> {
  const rank = new Map<string, number>();
  allItems().forEach((it, i) => rank.set(it.id, i));
  return rank;
}

/**
 * Auto-Sort: merge stacks of the same item, then order by game order (the item
 * table), with unknown ids last by name. Empty slots go to the end.
 */
export function sortPack(inv: Inventory): boolean {
  const before = JSON.stringify(inv.save());
  const rank = rankOf();
  const totals = new Map<string, number>();
  for (const s of inv.save())
    if (s) totals.set(s.id, (totals.get(s.id) ?? 0) + s.count);
  const ids = [...totals.keys()].sort((a, b) => {
    // The tools stay first, in their own order.
    const ta = isToolId(a) ? TOOL_ORDER.indexOf(a) : -1;
    const tb = isToolId(b) ? TOOL_ORDER.indexOf(b) : -1;
    if (ta >= 0 || tb >= 0) return (ta < 0 ? 99 : ta) - (tb < 0 ? 99 : tb);
    const ra = rank.get(splitQuality(a).base) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(splitQuality(b).base) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb || a.localeCompare(b);
  });
  const slots: Stack[] = [];
  for (const id of ids) {
    let left = totals.get(id) ?? 0;
    while (left > 0) {
      const put = Math.min(left, STACK_SIZE);
      slots.push({ id, count: put });
      left -= put;
    }
  }
  while (slots.length < inv.size) slots.push(null);
  inv.load(slots);
  return JSON.stringify(inv.save()) !== before;
}

const TOOL_ORDER = TOOLS.map(toolItemId);

/** The most a stack may be worth before trashing it asks first (gold). */
export const TRASH_CONFIRM_VALUE = 500;

/** True if a stack is worth enough, or cannot be sold, that trashing asks first. */
export function needsTrashConfirm(id: string, count: number): boolean {
  const it = itemById(splitQuality(id).base);
  if (!it) return true;
  if (it.keep) return true;
  return it.sellPrice * count >= TRASH_CONFIRM_VALUE;
}

/** Destroy the stack in a slot. A tool is never destroyed. Returns what was destroyed, if anything. */
export function trashSlot(
  inv: Inventory,
  i: number,
): { id: string; count: number } | undefined {
  if (!inRange(inv, i)) return undefined;
  const stack = inv.slot(i);
  if (!stack || isToolId(stack.id)) return undefined;
  edit(inv, (s) => ((s[i] = null), true));
  return stack;
}

/** What `wearFromPack` did: a ring or boots went on, or the item cannot be worn. */
export type WearResult = "ring" | "boots" | "none" | "full";

/**
 * Wear an item from the pack (note 37, note 49: items are worn from the pack).
 * A ring takes the first free ring slot, or slot 1 when both are taken (the old
 * ring goes back to the pack). Boots replace the boots worn.
 */
export function wearFromPack(
  eq: Equipment,
  inv: Inventory,
  id: string,
): WearResult {
  if (bootsById(id)) return eq.wearBoots(inv, id) ? "boots" : "full";
  if (!ringById(id)) return "none";
  const free = eq.worn().findIndex((r) => r === undefined);
  return eq.wear(inv, free >= 0 ? free : 0, id) ? "ring" : "full";
}

/** Take off what is worn in a slot: 0 and 1 are rings, "boots" the boots. False if empty or the pack is full. */
export function takeOff(
  eq: Equipment,
  inv: Inventory,
  slot: number | "boots",
): boolean {
  return slot === "boots" ? eq.removeBoots(inv) : eq.remove(inv, slot);
}
