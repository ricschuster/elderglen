/**
 * Draw order in the world (note 99). Flat things lie on the ground, standing things sort
 * by where their feet are, so a figure can walk behind a tree and in front of the next.
 */
export const DEPTH = {
  /** The painted map layers, in layer order. */
  map: 0,
  /** Flat marks on the ground: dug soil, placeholder washes, the aim square. */
  decal: 5,
  /** Standing things start here: see `sortDepth`. */
  sorted: 10,
  /** Always over the figures: canopies and roofs that nobody can stand in front of. */
  above: 800,
  /** Swings, sparks and floating numbers. */
  fx: 900,
  /** The dusk wash, and the light rings over it. */
  night: 1000,
  glow: 1001,
} as const;

/**
 * The depth of a standing thing whose feet are at world pixel `footY`. Maps are far
 * shorter than 6,000 px, so this stays under `DEPTH.above`.
 */
export const sortDepth = (footY: number): number => DEPTH.sorted + footY / 8;

/** The depth of something standing on tile row `y` (16 px tiles), a little behind a figure on the same row. */
export const tileDepth = (y: number, tileSize = 16): number =>
  sortDepth((y + 1) * tileSize - 4);
