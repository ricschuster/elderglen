// The window sized view (note 64, ADR 0009): zoom and UI size settings, and the
// sums that turn a window size into camera zooms. No Phaser here, so the maths
// is unit tested.

/** World zoom, in percent of the default (as Stardew, SC-42). */
export const ZOOM_MIN = 75;
export const ZOOM_MAX = 200;
/** UI size, in percent (as Stardew, SC-46). */
export const UI_MIN = 75;
export const UI_MAX = 150;
export const PERCENT_STEP = 5;
export const DEFAULT_PERCENT = 100;

/** The default zoom on a window that shows at least the default view. */
export const DEFAULT_ZOOM = 2;
/** The least a window shows at default zoom, in tiles (ADR 0009). */
export const MIN_TILES_W = 30;
export const MIN_TILES_H = 17;
export const TILE_PX = 16;
/** Menus and full screens are drawn in this box, centred in the window. */
export const MENU_W = 960;
export const MENU_H = 540;
/** On a touch device the HUD never drops below this scale (note 27 targets). */
export const TOUCH_UI_FLOOR = 100;

/** Round to a step and keep inside the range. Bad input gives the default. */
export function clampPercent(v: unknown, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return DEFAULT_PERCENT;
  const stepped = Math.round(v / PERCENT_STEP) * PERCENT_STEP;
  return Math.min(max, Math.max(min, stepped));
}

/** One step up (1) or down (-1), kept inside the range. */
export function stepPercent(
  v: number,
  dir: 1 | -1,
  min: number,
  max: number,
): number {
  return clampPercent(v + dir * PERCENT_STEP, min, max);
}

/**
 * The zoom at 100 percent for a window of this size in CSS pixels: the default
 * zoom, or less on a window too small to show 30 by 17 tiles. A bigger window
 * keeps the same zoom and so shows more world.
 */
export function baseZoom(w: number, h: number): number {
  const fit = Math.min(
    w / (MIN_TILES_W * TILE_PX),
    h / (MIN_TILES_H * TILE_PX),
  );
  return Math.max(0.25, Math.min(DEFAULT_ZOOM, fit));
}

/** The world camera zoom for the player's zoom percent. */
export function worldZoom(percent: number, w: number, h: number): number {
  return (baseZoom(w, h) * clampPercent(percent, ZOOM_MIN, ZOOM_MAX)) / 100;
}

/**
 * The HUD scale: the UI size, lifted to the touch floor on a touch device, and
 * then cut down if the HUD's widest row (`contentW` units) would not fit the
 * window. Fitting wins over the floor, since a clipped toolbar cannot be used.
 */
export function hudScale(
  percent: number,
  touch: boolean,
  windowW = Infinity,
  contentW = 0,
): number {
  const p = clampPercent(percent, UI_MIN, UI_MAX);
  const scale = (touch ? Math.max(p, TOUCH_UI_FLOOR) : p) / 100;
  return contentW > 0 ? Math.min(scale, windowW / contentW) : scale;
}

/**
 * The zoom for a menu's 960 by 540 box: the UI size, but never so big that the
 * box leaves the window.
 */
export function menuZoom(percent: number, w: number, h: number): number {
  const fit = Math.min(w / MENU_W, h / MENU_H);
  return Math.min(clampPercent(percent, UI_MIN, UI_MAX) / 100, fit);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Camera bounds in world pixels. A map bigger than the view scrolls inside
 * itself. A map smaller than the view is centred, and the rest is black.
 */
export function cameraBounds(
  mapW: number,
  mapH: number,
  viewW: number,
  viewH: number,
): Rect {
  return {
    x: Math.min(0, (mapW - viewW) / 2),
    y: Math.min(0, (mapH - viewH) / 2),
    w: Math.max(mapW, viewW),
    h: Math.max(mapH, viewH),
  };
}

/**
 * The scroll that puts a zoomed camera's top left corner at world (0, 0), so a
 * HUD can lay out in a window of (w / zoom) by (h / zoom) units from the edges.
 */
export function cornerScroll(
  w: number,
  h: number,
  zoom: number,
): { x: number; y: number } {
  return { x: w / (2 * zoom) - w / 2, y: h / (2 * zoom) - h / 2 };
}
