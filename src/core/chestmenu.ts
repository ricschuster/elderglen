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

/** The smallest slot pitch (px) before the chest grid scrolls instead of shrinking. */
export const MIN_PITCH = 46;

/**
 * Lay the two grids in `avail` px of height (labels and gaps already taken):
 * the pack is always whole; the chest shrinks its slots down to `MIN_PITCH`,
 * then shows only `visible` rows and scrolls the rest (a big chest is 6 rows).
 */
export function chestGridLayout(
  chestRows: number,
  packRows: number,
  avail: number,
  maxPitch = 62,
): { pitch: number; visible: number } {
  const fit = Math.floor(avail / (chestRows + packRows));
  if (fit >= MIN_PITCH)
    return { pitch: Math.min(maxPitch, fit), visible: chestRows };
  const rows = Math.max(1, Math.floor(avail / MIN_PITCH));
  return {
    pitch: MIN_PITCH,
    visible: Math.max(1, Math.min(chestRows, rows - packRows)),
  };
}

/** Keep a first-visible-row between 0 and the last row that still fills the window. */
export function clampRow(
  row: number,
  totalRows: number,
  visible: number,
): number {
  return Math.max(
    0,
    Math.min(Math.max(0, totalRows - visible), Math.round(row)),
  );
}

/** The first row after dragging a finger `dy` px up (positive) or down from `startRow`. */
export function rowFromSwipe(
  startRow: number,
  dy: number,
  pitch: number,
): number {
  return startRow + dy / pitch;
}

/** Whether slot `i` shows in a window starting at row `top` of `cols` columns. */
export function slotVisible(
  i: number,
  cols: number,
  top: number,
  visible: number,
): boolean {
  const row = Math.floor(i / cols);
  return row >= top && row < top + visible;
}
