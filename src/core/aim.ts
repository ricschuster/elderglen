import { facingFrom, type Facing, type Vec } from "./movement";

/** How far from the farmer's tile a click still acts on the tile under the cursor. */
export const AIM_REACH = 1;

export interface Aim {
  /** The tile a use or action lands on. */
  tile: Vec;
  /** Which way the farmer turns to face it. */
  facing: Facing;
}

const STEP: Record<Facing, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Where a mouse click aims (note 46). Within `reach` tiles of the farmer
 * (Chebyshev distance, so the diagonals count) it is the cursor tile. Farther
 * out, the farmer turns toward the cursor and it is the neighbour tile on that
 * side. The cursor on the farmer's own tile keeps the current facing. A tie
 * between the axes turns vertically, as walking does.
 */
export function aimAt(
  here: Vec,
  cursor: Vec,
  current: Facing,
  reach = AIM_REACH,
): Aim {
  const dx = cursor.x - here.x;
  const dy = cursor.y - here.y;
  if (dx === 0 && dy === 0)
    return { tile: neighbour(here, current), facing: current };
  const facing = facingFrom({ x: dx, y: dy }, current);
  if (Math.max(Math.abs(dx), Math.abs(dy)) <= reach)
    return { tile: { x: cursor.x, y: cursor.y }, facing };
  return { tile: neighbour(here, facing), facing };
}

/** The neighbour tile on one side of a tile. */
function neighbour(tile: Vec, facing: Facing): Vec {
  return { x: tile.x + STEP[facing].x, y: tile.y + STEP[facing].y };
}
