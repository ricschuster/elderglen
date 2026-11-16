import { describe, expect, it } from "vitest";
import {
  barColour,
  barFraction,
  barLabel,
  barsInset,
  clockLines,
  eventIcon,
  goldText,
  healthBarShown,
  weatherIcon,
} from "../src/core/hudpanel";
import { VILLAGERS } from "../src/core/villagers";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";

describe("hud panel", () => {
  it("picks weather icons", () => {
    expect(weatherIcon("sunny")).toBe("sun");
    expect(weatherIcon("rainy")).toBe("rain");
    expect(weatherIcon("stormy")).toBe("storm");
    expect(weatherIcon("snowy")).toBe("snow");
  });

  it("formats the clock and gold", () => {
    expect(clockLines(1, "6:00").date).toBe("Mon. Spring 1");
    expect(goldText(1234.9)).toBe("1234g");
  });

  it("clamps bar fractions", () => {
    expect(barFraction(50, 100)).toBe(0.5);
    expect(barFraction(-5, 100)).toBe(0);
    expect(barFraction(500, 100)).toBe(1);
    expect(barFraction(5, 0)).toBe(0);
  });

  it("fades green to red", () => {
    expect(barColour(1)).toBe(0x4cc04c);
    expect(barColour(0)).toBe(0xd04040);
    expect(barColour(0.5)).toBe(0xe0c040);
    expect(barColour(2)).toBe(barColour(1));
  });

  it("shows health in the mines or when hurt", () => {
    expect(healthBarShown(false, 100, 100)).toBe(false);
    expect(healthBarShown(true, 100, 100)).toBe(true);
    expect(healthBarShown(false, 60, 100)).toBe(true);
  });

  it("labels exact values and moves for the stick", () => {
    expect(barLabel("Energy", 120.2, 270)).toBe("Energy 121/270");
    expect(barsInset(false, 52)).toBe(0);
    expect(barsInset(true, 52)).toBeGreaterThan(100);
  });

  it("flags a birthday on its day", () => {
    const v = VILLAGERS[0]!;
    const s = SEASONS.indexOf(v.birthday.season);
    const day = s * DAYS_PER_SEASON + v.birthday.day;
    expect(["birthday", "festival"]).toContain(eventIcon(day));
  });
});
