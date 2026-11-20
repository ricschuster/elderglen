/**
 * The secret-giver reveal at the Midwinter Feast (notes 105 and 82): the giver
 * walks from their seat to a tile in front of the recipient, pauses, and walks
 * back. Pure choices only (tile, path, timing); the scene does the tweening.
 * Placeholder motion, no rule or text changes.
 */

export interface Tile {
  x: number;
  y: number;
}

export type Facing = "up" | "down" | "left" | "right";

/** The pause at the recipient, in milliseconds. */
export const REVEAL_PAUSE_MS = 1500;
/** Walking speed per tile and the clamp on one leg, in milliseconds. */
export const REVEAL_MS_PER_TILE = 250;
export const REVEAL_LEG_MIN_MS = 350;
export const REVEAL_LEG_MAX_MS = 1000;

/** Neighbour order: below the recipient first (facing up at them), then the sides, then above. */
const SIDES: { dx: number; dy: number; face: Facing }[] = [
  { dx: 0, dy: 1, face: "up" },
  { dx: -1, dy: 0, face: "right" },
  { dx: 1, dy: 0, face: "left" },
  { dx: 0, dy: -1, face: "down" },
];

/**
 * The nearest free tile next to the recipient, and the way the giver faces
 * there. Ties go to the order above. Undefined when all four sides are taken.
 */
export function standTile(
  recipient: Tile,
  seat: Tile,
  isFree: (x: number, y: number) => boolean,
): { tile: Tile; facing: Facing } | undefined {
  let best: { tile: Tile; facing: Facing; d: number } | undefined;
  for (const s of SIDES) {
    const tile = { x: recipient.x + s.dx, y: recipient.y + s.dy };
    // The giver's own seat counts as free: it may be the neighbouring tile.
    const free =
      (tile.x === seat.x && tile.y === seat.y) || isFree(tile.x, tile.y);
    if (!free) continue;
    const d = Math.abs(tile.x - seat.x) + Math.abs(tile.y - seat.y);
    if (!best || d < best.d) best = { tile, facing: s.face, d };
  }
  return best && { tile: best.tile, facing: best.facing };
}

export interface RevealLeg {
  to: Tile;
  duration: number;
}

export interface RevealPlan {
  facing: Facing;
  /** Walk out, then back to the seat (after the pause). */
  there: RevealLeg;
  pause: number;
  back: RevealLeg;
  /** Total time from start to the giver sitting again. */
  total: number;
}

const legMs = (a: Tile, b: Tile): number => {
  const tiles = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  return Math.min(
    REVEAL_LEG_MAX_MS,
    Math.max(REVEAL_LEG_MIN_MS, tiles * REVEAL_MS_PER_TILE),
  );
};

/** The whole walk, or undefined when there is nowhere to stand (then only the float shows). */
export function planReveal(
  seat: Tile,
  recipient: Tile,
  isFree: (x: number, y: number) => boolean,
): RevealPlan | undefined {
  const stand = standTile(recipient, seat, isFree);
  if (!stand) return undefined;
  const ms = legMs(seat, stand.tile);
  const there = { to: stand.tile, duration: ms };
  const back = { to: seat, duration: ms };
  return {
    facing: stand.facing,
    there,
    pause: REVEAL_PAUSE_MS,
    back,
    total: there.duration + REVEAL_PAUSE_MS + back.duration,
  };
}
