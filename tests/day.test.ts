import { describe, expect, it } from "vitest";
import { DAY_END } from "../src/core/clock";
import { Day, PASS_OUT_MONEY_CAP } from "../src/core/day";
import { HALF_MORNING } from "../src/core/energyrules";
import { MAX_ENERGY } from "../src/core/energy";

describe("Day", () => {
  it("spends energy and time on an action", () => {
    const d = new Day();
    expect(d.act(10, 30)).toBe(false);
    expect(d.energy.current).toBe(MAX_ENERGY - 10);
    expect(d.clock.format()).toBe("6:30 am");
  });

  it("is not over at 0 energy: exhausted, and tools still work", () => {
    const d = new Day();
    expect(d.act(MAX_ENERGY, 10)).toBe(false);
    expect(d.energy.exhausted).toBe(true);
    expect(d.act(10, 0)).toBe(false);
    expect(d.energy.current).toBe(-10);
  });

  it("is over when energy reaches -15, and goes no lower", () => {
    const d = new Day();
    expect(d.act(MAX_ENERGY + 40, 10)).toBe(true);
    expect(d.energy.current).toBe(-15);
  });

  it("is over when time runs out", () => {
    const d = new Day();
    expect(d.act(1, DAY_END)).toBe(true);
  });

  it("sleeping early is free and gives a full morning", () => {
    const d = new Day();
    d.act(60, 600);
    expect(d.end(500)).toEqual({ passedOut: false });
    expect(d.clock.day).toBe(2);
    expect(d.clock.format()).toBe("6:00 am");
    expect(d.energy.current).toBe(MAX_ENERGY);
  });

  it("passing out from energy costs a share of money and half energy", () => {
    const d = new Day();
    d.act(MAX_ENERGY + 15, 60);
    expect(d.end(500)).toEqual({
      passedOut: true,
      reason: "energy",
      moneyLost: 50,
    });
    expect(d.clock.day).toBe(2);
    expect(d.clock.format()).toBe("6:00 am");
    expect(d.energy.current).toBe(MAX_ENERGY * HALF_MORNING);
  });

  it("passing out at 2:00 am reports the reason and wakes at half", () => {
    const d = new Day();
    d.act(1, DAY_END);
    expect(d.end(500)).toMatchObject({ passedOut: true, reason: "time" });
    expect(d.clock.format()).toBe("6:00 am");
    expect(d.energy.current).toBe(Math.round(MAX_ENERGY * HALF_MORNING));
  });

  it("caps the money lost and never goes below zero", () => {
    const d = new Day();
    d.act(MAX_ENERGY + 15, 0);
    expect(d.end(1_000_000)).toMatchObject({ moneyLost: PASS_OUT_MONEY_CAP });
    d.act(MAX_ENERGY + 15, 0);
    expect(d.end(-5)).toMatchObject({ moneyLost: 0 });
  });

  it("passing out inside the farmhouse costs no money but still gives half", () => {
    const d = new Day();
    d.act(MAX_ENERGY + 15, 0);
    expect(d.end(500, true)).toMatchObject({ passedOut: true, moneyLost: 0 });
    expect(d.energy.current).toBe(MAX_ENERGY * HALF_MORNING);
  });

  it("a bedtime after midnight costs energy but not money", () => {
    const d = new Day();
    d.act(0, 18 * 60 + 30); // 6:00 am + 18.5 hours = 12:30 am
    expect(d.clock.minutes).toBe(24 * 60 + 30);
    expect(d.end(500)).toEqual({ passedOut: false });
    expect(d.energy.current).toBe(Math.round(MAX_ENERGY * 0.96));
  });

  it("exhaustion halves the morning even after eating", () => {
    const d = new Day();
    d.act(MAX_ENERGY, 0);
    d.energy.restore(100);
    expect(d.end(500)).toEqual({ passedOut: false });
    expect(d.energy.current).toBe(MAX_ENERGY * HALF_MORNING);
    expect(d.energy.wasExhausted).toBe(false);
  });

  it("a level-up day gives a full morning over exhaustion and late sleep", () => {
    const d = new Day();
    d.act(MAX_ENERGY + 15, 0);
    expect(d.end(500, false, true)).toMatchObject({ passedOut: true });
    expect(d.energy.current).toBe(MAX_ENERGY);
    const e = new Day();
    e.act(0, 19 * 60 + 40);
    e.end(0, false, true);
    expect(e.energy.current).toBe(MAX_ENERGY);
  });
});
