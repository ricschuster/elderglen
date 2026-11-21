import { DEBUG_TOOLS } from "../core/debugtools";
import type { Body, Facing } from "../core/movement";

/**
 * Dev builds only: `?speed=N` runs the world N times faster (walking, the
 * clock tick and the axe repeat) so scripted playtests finish sooner. It is 1
 * in production. Walking takes N sub-steps a frame, so a step stays small
 * enough not to cross a tile.
 */
export const DEV_SPEED = DEBUG_TOOLS
  ? Math.min(
      8,
      Math.max(
        1,
        Math.round(Number(new URLSearchParams(location.search).get("speed"))) ||
          1,
      ),
    )
  : 1;

/** World pixels per second. */
export const SPEED = 80;
/** Pixels walked between footstep sounds (note 107). */
export const STEP_PX = 26;
/** The player's feet box, in world pixels. */
export const PLAYER: Body = { hw: 5, h: 6 };

/** Real milliseconds per 10 game minutes (Stardew pace). */
export const TICK_MS = 7000;
export const TICK_MINUTES = 10;

/** A creature's feet box, in world pixels. */
export const CREATURE_BODY: Body = { hw: 5, h: 5 };

/** The tile step a push takes for each way the farmer faces. */
export const PUSH: Record<Facing, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
