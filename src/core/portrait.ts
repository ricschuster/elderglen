/**
 * Portrait crop and scale maths (note 102), free of Phaser. A portrait is the
 * head and shoulders of a 16x16 villager sprite scaled up by a whole number.
 */

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Head and shoulders of the 16x16 person sprite: columns 3-12, rows 0-9. */
export const PORTRAIT_CROP: CropRect = { x: 3, y: 0, w: 10, h: 10 };

/** Whole-number scale that fits the crop inside a square box (at least 1). */
export function portraitScale(boxPx: number, crop: CropRect = PORTRAIT_CROP) {
  return Math.max(1, Math.floor(boxPx / Math.max(crop.w, crop.h)));
}

/**
 * Where to put the whole sprite (top-left, scaled) so the crop is centred in
 * a box at (bx, by) of side boxPx.
 */
export function portraitOrigin(
  bx: number,
  by: number,
  boxPx: number,
  crop: CropRect = PORTRAIT_CROP,
): { x: number; y: number; scale: number } {
  const scale = portraitScale(boxPx, crop);
  const x = bx + (boxPx - crop.w * scale) / 2 - crop.x * scale;
  const y = by + (boxPx - crop.h * scale) / 2 - crop.y * scale;
  return { x, y, scale };
}
