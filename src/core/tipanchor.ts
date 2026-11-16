/** Where a world tile sits on screen, for anchoring a tooltip at it. */
export interface ScreenRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The screen box of a tile, from the camera's world view corner and zoom. */
export function tileScreenRect(
  tx: number,
  ty: number,
  tileSize: number,
  view: { x: number; y: number },
  zoom: number,
): ScreenRect {
  return {
    x: (tx * tileSize - view.x) * zoom,
    y: (ty * tileSize - view.y) * zoom,
    w: tileSize * zoom,
    h: tileSize * zoom,
  };
}

/** True when a touch has been held long enough to be a long press (not a tap). */
export function isLongPress(heldMs: number, limitMs = 450): boolean {
  return heldMs >= limitMs;
}
