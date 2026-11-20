/**
 * Placeholder look of a melee swing (tablet play, 2026-11-20): an arc that
 * sweeps in front of the player. Pure numbers, free of Phaser; the scene draws
 * it. Slings are ranged and have no arc.
 */
import type { WeaponFamily } from "./combat";

export interface SwingArc {
  /** Angle the sweep starts at, in radians (0 is right, clockwise on screen). */
  from: number;
  /** Angle the sweep ends at. */
  to: number;
  /** How long the arc stays on screen, in milliseconds. */
  ms: number;
  /** Line width of the arc in pixels. */
  width: number;
  /** Colour of the arc. */
  color: number;
}

const FACE_ANGLE = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

/** The arc for a weapon family facing a direction, or undefined for a ranged weapon. */
export function swingArc(
  family: WeaponFamily,
  facing: "up" | "down" | "left" | "right",
): SwingArc | undefined {
  if (family === "sling") return undefined;
  const c = FACE_ANGLE[facing];
  // A blade is a quick narrow slash; a club is a slower, wider, heavier sweep.
  const half = family === "blade" ? Math.PI / 3 : (Math.PI * 2) / 3;
  return {
    from: c - half,
    to: c + half,
    ms: family === "blade" ? 180 : 240,
    width: family === "blade" ? 3 : 6,
    color: family === "blade" ? 0xffffff : 0xffd9a0,
  };
}
