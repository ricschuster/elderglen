import { describe, expect, it } from "vitest";
import { DAY_END } from "../src/core/clock";
import {
  EXHAUSTED_SPEED,
  exhaustedSpeed,
  lateSleepLoss,
  morningEnergy,
  tiredWarning,
} from "../src/core/energyrules";
import { Energy } from "../src/core/energy";

const at = (h: number, m: number) => h * 60 + m;

describe("late sleep", () => {
  it("loses nothing up to 12:10 am", () => {
    expect(lateSleepLoss(at(22, 0))).toBe(0);
    expect(lateSleepLoss(at(24, 0))).toBe(0);
    expect(lateSleepLoss(at(24, 10))).toBe(0);
  });

  it("grows by small steps, drops more at 1 am, and is half at 2 am", () => {
    expect(lateSleepLoss(at(24, 20))).toBe(2);
    expect(lateSleepLoss(at(24, 50))).toBe(8);
    expect(lateSleepLoss(at(25, 0))).toBe(20);
    expect(lateSleepLoss(at(25, 50))).toBe(45);
    expect(lateSleepLoss(DAY_END)).toBe(50);
    let last = 0;
    for (let m = at(24, 0); m <= DAY_END; m += 10) {
      expect(lateSleepLoss(m)).toBeGreaterThanOrEqual(last);
      last = lateSleepLoss(m);
    }
  });
});

describe("morning energy", () => {
  const base = {
    max: 270,
    minutes: at(21, 0),
    exhausted: false,
    levelled: false,
  };

  it("is full for an early bed", () => {
    expect(morningEnergy(base)).toBe(270);
  });
  it("follows the late sleep steps", () => {
    expect(morningEnergy({ ...base, minutes: at(25, 0) })).toBe(216);
  });
  it("is half after exhaustion, even at a normal bedtime", () => {
    expect(morningEnergy({ ...base, exhausted: true })).toBe(135);
  });
  it("is half at the floor and at 2 am", () => {
    expect(morningEnergy({ ...base, atFloor: true })).toBe(135);
    expect(morningEnergy({ ...base, minutes: DAY_END })).toBe(135);
  });
  it("is full after a level-up whatever the night was", () => {
    expect(
      morningEnergy({
        ...base,
        minutes: DAY_END,
        exhausted: true,
        levelled: true,
      }),
    ).toBe(270);
  });
});

describe("exhaustion", () => {
  it("slows the player at 0 and below only", () => {
    expect(exhaustedSpeed(1)).toBe(1);
    expect(exhaustedSpeed(0)).toBe(EXHAUSTED_SPEED);
    expect(exhaustedSpeed(-10)).toBe(EXHAUSTED_SPEED);
  });

  it("warns once as energy falls past 20, 15 and 0", () => {
    expect(tiredWarning(25, 21)).toBeUndefined();
    expect(tiredWarning(21, 19)).toMatch(/tired/);
    expect(tiredWarning(19, 18)).toBeUndefined();
    expect(tiredWarning(16, 14)).toMatch(/very tired/);
    expect(tiredWarning(2, -1)).toMatch(/exhausted/);
    expect(tiredWarning(-1, -5)).toBeUndefined();
    expect(tiredWarning(10, 40)).toBeUndefined();
  });

  it("tracks that energy hit 0 and floors at -15", () => {
    const e = new Energy();
    e.spend(269);
    expect(e.wasExhausted).toBe(false);
    e.spend(1);
    expect(e.wasExhausted).toBe(true);
    expect(e.empty).toBe(false);
    e.spend(100);
    expect(e.current).toBe(-15);
    expect(e.empty).toBe(true);
  });
});
