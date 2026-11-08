import { describe, expect, it } from "vitest";
import {
  baseZoom,
  cameraBounds,
  clampPercent,
  cornerScroll,
  hudScale,
  menuZoom,
  stepPercent,
  worldZoom,
  UI_MAX,
  UI_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
} from "../src/core/view";

describe("percent settings", () => {
  it("rounds to 5 percent steps and clamps to the range", () => {
    expect(clampPercent(102, ZOOM_MIN, ZOOM_MAX)).toBe(100);
    expect(clampPercent(10, ZOOM_MIN, ZOOM_MAX)).toBe(75);
    expect(clampPercent(999, ZOOM_MIN, ZOOM_MAX)).toBe(200);
    expect(clampPercent(999, UI_MIN, UI_MAX)).toBe(150);
  });
  it("falls back to 100 on bad input", () => {
    expect(clampPercent("big", ZOOM_MIN, ZOOM_MAX)).toBe(100);
    expect(clampPercent(NaN, UI_MIN, UI_MAX)).toBe(100);
  });
  it("steps and stops at the ends", () => {
    expect(stepPercent(100, 1, ZOOM_MIN, ZOOM_MAX)).toBe(105);
    expect(stepPercent(75, -1, ZOOM_MIN, ZOOM_MAX)).toBe(75);
    expect(stepPercent(150, 1, UI_MIN, UI_MAX)).toBe(150);
  });
});

describe("world zoom", () => {
  it("is 2 on the default window and on any bigger one", () => {
    expect(baseZoom(1920, 1080)).toBe(2);
    expect(baseZoom(3440, 1440)).toBe(2);
  });
  it("shrinks on a window too small for 30 by 17 tiles", () => {
    expect(baseZoom(480, 800)).toBe(1);
    expect(baseZoom(960, 272)).toBe(1);
  });
  it("shows at least 30 by 17 tiles at 100 percent", () => {
    for (const [w, h] of [
      [960, 540],
      [1000, 1000],
      [600, 400],
    ] as const) {
      const z = worldZoom(100, w, h);
      expect(w / z / 16).toBeGreaterThanOrEqual(30 - 1e-9);
      expect(h / z / 16).toBeGreaterThanOrEqual(17 - 1e-9);
    }
  });
  it("scales with the percent at both caps", () => {
    expect(worldZoom(75, 1920, 1080)).toBeCloseTo(1.5);
    expect(worldZoom(200, 1920, 1080)).toBeCloseTo(4);
  });
});

describe("HUD and menu scale", () => {
  it("lifts a touch HUD to 100 percent", () => {
    expect(hudScale(75, true)).toBe(1);
    expect(hudScale(75, false)).toBe(0.75);
    expect(hudScale(150, true)).toBe(1.5);
  });
  it("shrinks the HUD until its toolbar fits the window", () => {
    expect(hudScale(150, false, 1920, 870)).toBe(1.5);
    expect(hudScale(150, true, 900, 900)).toBe(1);
    expect(hudScale(100, true, 640, 880)).toBeCloseTo(640 / 880);
  });
  it("keeps the menu box inside the window", () => {
    expect(menuZoom(150, 1920, 1080)).toBe(1.5);
    expect(menuZoom(150, 960, 540)).toBe(1);
    expect(menuZoom(100, 480, 540)).toBe(0.5);
    expect(menuZoom(75, 1920, 1080)).toBe(0.75);
  });
});

describe("camera bounds", () => {
  it("scrolls inside a map bigger than the view", () => {
    expect(cameraBounds(1000, 800, 400, 300)).toEqual({
      x: 0,
      y: 0,
      w: 1000,
      h: 800,
    });
  });
  it("centres a map smaller than the view, with black round it", () => {
    expect(cameraBounds(200, 100, 400, 300)).toEqual({
      x: -100,
      y: -100,
      w: 400,
      h: 300,
    });
  });
  it("centres on one axis only for a wide window", () => {
    const b = cameraBounds(1000, 100, 400, 300);
    expect(b.x).toBe(0);
    expect(b.y).toBe(-100);
  });
});

describe("corner scroll", () => {
  it("is zero at zoom 1 and puts the corner at the origin otherwise", () => {
    expect(cornerScroll(960, 540, 1)).toEqual({ x: 0, y: 0 });
    const s = cornerScroll(960, 540, 2);
    // Visible left = scroll + w/2 - w/(2 zoom).
    expect(s.x + 480 - 960 / 4).toBeCloseTo(0);
    expect(s.y + 270 - 540 / 4).toBeCloseTo(0);
  });
});
