import { STACK_SIZE, type Inventory } from "./inventory";
import { isToolId } from "./toolitems";

/**
 * The chest screen's rules, as Stardew's two grids: the chest above, the
 * backpack below, a stack moved by tap or drag. Pure functions over two
 * inventories; the scene only draws and taps. Tools stay in the backpack.
 */

type Stack = { id: string; count: number } | null;

/**
 * Move a stack from `from` of `src` to `to` of `dst` (the same inventory is
 * fine). `half` moves half, rounded up, as a right click does. An empty slot
 * takes it, the same item merges up to the stack limit, and a different item
 * swaps when the whole stack moved. A tool never goes in a chest (`chestSide`).
 * Returns false if nothing changed.
 */
export function transfer(
  src: Inventory,
  from: number,
  dst: Inventory,
  to: number,
  opts: { half?: boolean; chestSide?: Inventory } = {},
): boolean {
  if (src === dst && from === to) return false;
  const a = src.slot(from);
  if (!a || to < 0 || to >= dst.size) return false;
  const chest = opts.chestSide;
  const b = dst.slot(to);
  const toolIntoChest = (id: string, into: Inventory) =>
    chest === into && isToolId(id);
  if (toolIntoChest(a.id, dst)) return false;
  const n = opts.half ? Math.ceil(a.count / 2) : a.count;
  const s = src.save();
  const d = src === dst ? s : dst.save();
  if (!b) {
    d[to] = { id: a.id, count: n };
    s[from] = n === a.count ? null : { id: a.id, count: a.count - n };
  } else if (b.id === a.id) {
    const put = Math.min(n, STACK_SIZE - b.count);
    if (put === 0) return false;
    d[to] = { id: b.id, count: b.count + put };
    s[from] = put === a.count ? null : { id: a.id, count: a.count - put };
  } else {
    if (n !== a.count || toolIntoChest(b.id, src)) return false;
    d[to] = a;
    s[from] = b;
  }
  src.load(s);
  if (src !== dst) dst.load(d);
  return true;
}

/**
 * Send a stack, or `most` of it, to the other side: merge into stacks of the
 * same item first, then the first empty slot. Right-click sends one and Shift
 * with right-click half, as Stardew's chest screen does. Returns how many moved.
 */
export function quickMove(
  src: Inventory,
  from: number,
  dst: Inventory,
  chestSide: Inventory,
  most = Infinity,
): number {
  const a = src.slot(from);
  if (!a || (chestSide === dst && isToolId(a.id))) return 0;
  const n = Math.min(a.count, most, dst.room(a.id));
  if (n <= 0) return 0;
  const s: Stack[] = src.save();
  s[from] = n === a.count ? null : { id: a.id, count: a.count - n };
  src.load(s);
  dst.add(a.id, n);
  return n;
}

/**
 * Fill Stacks: for every item already in the chest, move all of that item from
 * the backpack in, as far as it fits. Tools stay. Returns the count moved.
 */
export function fillStacks(pack: Inventory, chest: Inventory): number {
  const have = new Set(chest.save().flatMap((s) => (s ? [s.id] : [])));
  let moved = 0;
  for (const id of have) {
    if (isToolId(id)) continue;
    const n = Math.min(pack.count(id), chest.room(id));
    if (n > 0 && pack.remove(id, n) && chest.add(id, n)) moved += n;
  }
  return moved;
}

/** Smallest cell for a finger, in screen pixels (touch target guide). */
export const TOUCH_CELL = 44;

/** One entry of the touch long-press menu: the same sends as right-click, Shift and Space. */
export interface PressAction {
  label: string;
  /** How many to send; Infinity is the whole stack. */
  most: number;
}

/**
 * The long-press menu for a stack of `count`: send one (right-click), send half
 * (Shift with right-click), send the stack (Space). Entries that would repeat
 * another are left out, so a single item offers one send.
 */
export function pressActions(count: number): PressAction[] {
  if (count <= 1) return [{ label: "Send", most: Infinity }];
  const half = Math.ceil(count / 2);
  const out: PressAction[] = [{ label: "Send one", most: 1 }];
  if (half > 1 && half < count)
    out.push({ label: `Send half (${half})`, most: half });
  out.push({ label: `Send all (${count})`, most: Infinity });
  return out;
}

/**
 * How many chest rows fit on screen beside the backpack, never fewer than one
 * and never more than the chest has. `space` is the pixels left for both
 * grids and `pitch` the row height (at least `TOUCH_CELL` plus a gap).
 */
export function visibleRows(
  chestRows: number,
  packRows: number,
  space: number,
  pitch: number,
): number {
  const free = Math.floor(space / pitch) - packRows;
  return Math.max(1, Math.min(chestRows, free));
}

/** Clamp a row offset so the window of `shown` rows stays inside `total` rows. */
export function clampRowOffset(
  offset: number,
  total: number,
  shown: number,
): number {
  return Math.max(0, Math.min(offset, total - shown));
}

/** True when slot `i` lies in the window starting at row `offset`. */
export function inWindow(
  i: number,
  cols: number,
  offset: number,
  shown: number,
): boolean {
  const row = Math.floor(i / cols);
  return row >= offset && row < offset + shown;
}

/** Pixels a touch must travel before a press on the chest grid becomes a swipe. */
export const SWIPE_START_PX = 10;

/**
 * The first row shown after a vertical swipe: the grid follows the finger, so
 * dragging up by one row pitch shows the next row. `dy` is the drag distance
 * from where the touch began (negative is up); the result is clamped.
 */
export function swipeRowOffset(
  startOffset: number,
  dy: number,
  pitch: number,
  total: number,
  shown: number,
): number {
  return clampRowOffset(startOffset - Math.round(dy / pitch), total, shown);
}
