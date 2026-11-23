import { trackerArrows } from "../core/tracker";
import type { FarmScene } from "./FarmScene";

// The Tracker profession's forage arrows (note 07), drawn on the UI camera.

const COLOUR = 0xf2e08a;

/** Draw small arrows at the screen edge toward forage that is off screen. Clears when not a Tracker. */
export function drawTracker(farm: FarmScene): void {
  const gfx = farm.trackerGfx;
  gfx.clear();
  if (!farm.state.skills.has("tracker") || !farm.outdoorWorld) return;
  const cam = farm.cameras.main;
  const ts = farm.map.tileSize;
  const wv = cam.worldView;
  const arrows = trackerArrows(farm.state.forage.each(), {
    left: wv.x / ts,
    top: wv.y / ts,
    right: wv.right / ts,
    bottom: wv.bottom / ts,
  });
  const ui = farm.uiCamera.worldView;
  const size = 9;
  for (const a of arrows) {
    const px = ui.x + a.edgeX * ui.width;
    const py = ui.y + a.edgeY * ui.height;
    const c = Math.cos(a.angle);
    const s = Math.sin(a.angle);
    const pt = (f: number, side: number) => ({
      x: px + c * f - s * side,
      y: py + s * f + c * side,
    });
    const tip = pt(size, 0);
    const l = pt(-size * 0.6, size * 0.7);
    const r = pt(-size * 0.6, -size * 0.7);
    gfx.fillStyle(COLOUR, 0.9);
    gfx.lineStyle(1, 0x3a2d12, 0.9);
    gfx.fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
    gfx.strokeTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
  }
}
