export interface Vec {
  x: number;
  y: number;
}

export type Facing = "up" | "down" | "left" | "right";

/** The player's feet box: `hw` is half the width, `h` the height. */
export interface Body {
  hw: number;
  h: number;
}

const EPS = 0.001;

/** A unit-or-shorter direction from four held keys. */
export function keyVector(
  left: boolean,
  right: boolean,
  up: boolean,
  down: boolean,
): Vec {
  const x = Number(right) - Number(left);
  const y = Number(down) - Number(up);
  const len = Math.hypot(x, y);
  return len === 0 ? { x: 0, y: 0 } : { x: x / len, y: y / len };
}

/**
 * A direction from a touch drag: `dx`, `dy` is how far the finger moved from
 * where it first touched. Short drags do nothing, and the length of the vector
 * grows from 0 to 1 between `deadzone` and `radius`.
 */
export function stickVector(
  dx: number,
  dy: number,
  deadzone = 6,
  radius = 40,
): Vec {
  const len = Math.hypot(dx, dy);
  if (len <= deadzone) return { x: 0, y: 0 };
  const strength = Math.min(1, (len - deadzone) / (radius - deadzone));
  return { x: (dx / len) * strength, y: (dy / len) * strength };
}

/** Which way the player faces: the stronger axis of the move, else unchanged. */
export function facingFrom(move: Vec, current: Facing): Facing {
  if (move.x === 0 && move.y === 0) return current;
  if (Math.abs(move.x) > Math.abs(move.y)) return move.x > 0 ? "right" : "left";
  return move.y > 0 ? "down" : "up";
}

/** The tile step for each way the farmer faces. */
export const FACING_STEP: Record<Facing, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** The tile the player is standing in, by the middle of the feet box. */
export function tileOf(pos: Vec, body: Body, tileSize: number): Vec {
  return {
    x: Math.floor(pos.x / tileSize),
    y: Math.floor((pos.y - body.h / 2) / tileSize),
  };
}

/** The tile in front of the player, where a tool would land. */
export function facingTile(
  pos: Vec,
  body: Body,
  facing: Facing,
  tileSize: number,
): Vec {
  const here = tileOf(pos, body, tileSize);
  return {
    x: here.x + FACING_STEP[facing].x,
    y: here.y + FACING_STEP[facing].y,
  };
}

/** True if the feet box at `pos` overlaps a blocked tile. */
function hits(
  pos: Vec,
  body: Body,
  tileSize: number,
  blocked: (x: number, y: number) => boolean,
): boolean {
  const x0 = Math.floor((pos.x - body.hw) / tileSize);
  const x1 = Math.floor((pos.x + body.hw - EPS) / tileSize);
  const y0 = Math.floor((pos.y - body.h) / tileSize);
  const y1 = Math.floor((pos.y - EPS) / tileSize);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (blocked(x, y)) return true;
  return false;
}

/**
 * Move a feet box by `delta` through a tile grid, one axis at a time so it
 * slides along walls. Long moves are split so nothing passes through a tile.
 * `pos` is the middle of the bottom edge of the box.
 */
export function move(
  pos: Vec,
  delta: Vec,
  body: Body,
  tileSize: number,
  blocked: (x: number, y: number) => boolean,
): Vec {
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(delta.x), Math.abs(delta.y)) / (tileSize / 2)),
  );
  let { x, y } = pos;
  for (let i = 0; i < steps; i++) {
    const dx = delta.x / steps;
    let nx = x + dx;
    if (hits({ x: nx, y }, body, tileSize, blocked)) {
      // Stop flush against the wall instead of short of it.
      const edge =
        dx > 0
          ? (Math.floor((x + body.hw) / tileSize) + 1) * tileSize -
            body.hw -
            EPS
          : Math.floor((x - body.hw) / tileSize) * tileSize + body.hw + EPS;
      nx = dx > 0 ? Math.max(x, edge) : Math.min(x, edge);
      if (hits({ x: nx, y }, body, tileSize, blocked)) nx = x;
    }
    x = nx;

    const dy = delta.y / steps;
    let ny = y + dy;
    if (hits({ x, y: ny }, body, tileSize, blocked)) {
      const edge =
        dy > 0
          ? (Math.floor(y / tileSize) + 1) * tileSize - EPS
          : Math.floor((y - body.h) / tileSize) * tileSize + body.h + EPS;
      ny = dy > 0 ? Math.max(y, edge) : Math.min(y, edge);
      if (hits({ x, y: ny }, body, tileSize, blocked)) ny = y;
    }
    y = ny;
  }
  return { x, y };
}
