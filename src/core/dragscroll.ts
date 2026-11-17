/**
 * Touch drag helpers shared by the scrolling lists (Menu, journal, pack).
 * Pure maths, no Phaser: a press only counts as a drag once it has moved past
 * a small threshold, and a drag then scrolls a list by whole rows.
 */

/** Pixels a press may wander and still count as a tap. */
export const DRAG_THRESHOLD = 8;

/** True once a press has moved far enough to be a drag, not a tap. */
export function isDrag(
  dx: number,
  dy: number,
  threshold = DRAG_THRESHOLD,
): boolean {
  return Math.hypot(dx, dy) > threshold;
}

/**
 * The first visible row after dragging a list by `dy` pixels (finger moving
 * up is a negative dy and scrolls down), from the row that was first at the
 * start of the drag. Clamped so the window stays inside the list.
 */
export function dragFirst(
  startFirst: number,
  dy: number,
  rowH: number,
  total: number,
  visible: number,
): number {
  const max = Math.max(0, total - visible);
  const next = Math.round(startFirst - dy / rowH);
  return Math.max(0, Math.min(max, next));
}
