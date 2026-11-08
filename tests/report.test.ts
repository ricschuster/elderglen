import { describe, expect, it } from "vitest";
import { reportLines, seasonNotice } from "../src/core/report";
import type { SleepReport } from "../src/core/sleep";

const base: SleepReport = {
  passedOut: false,
  moneyLost: 0,
  weather: "sunny",
  withered: 0,
  houseFinished: false,
  coopFinished: false,
  barnFinished: false,
  siloFinished: false,
  animals: {
    eggs: 0,
    barn: 0,
    unfed: 0,
    outside: 0,
    grown: [],
    hatched: [],
    hatchWaiting: false,
  },
  furnaceGifted: false,
  toolReady: undefined,
  achievements: [],
  completion: 0,
  completionGain: 0,
  newMail: 0,
  caveOffer: false,
  shipped: { lines: [], total: 0 },
  orders: { done: [], lapsed: [] },
  requestsLapsed: [],
  stuckTrees: [],
};

describe("overnight report", () => {
  it("is calm after a normal night", () => {
    expect(reportLines(base)).toEqual(["You slept well.", "The sun is out."]);
  });

  it("explains a pass-out and what it cost", () => {
    const lines = reportLines({
      ...base,
      passedOut: true,
      reason: "energy",
      moneyLost: 40,
    });
    expect(lines[0]).toMatch(/energy/);
    expect(lines[1]).toMatch(/40g/);
  });

  it("tells a late night from an exhausted one, and a free rescue", () => {
    const lines = reportLines({ ...base, passedOut: true, reason: "time" });
    expect(lines[0]).toMatch(/late/);
    expect(lines[1]).toMatch(/nothing/);
  });

  it("mentions withered crops and rain", () => {
    expect(reportLines({ ...base, withered: 1, weather: "rainy" })).toEqual([
      "You slept well.",
      "1 crop withered when the season ended.",
      "It is raining. The rain watered your crops.",
    ]);
    expect(reportLines({ ...base, withered: 3 })[1]).toMatch(/3 crops/);
  });

  it("says when the carpenter has finished", () => {
    expect(reportLines({ ...base, houseFinished: true })[1]).toMatch(
      /carpenter has finished/,
    );
  });

  it("announces a new season only when there is one", () => {
    expect(seasonNotice(base)).toBeUndefined();
    expect(seasonNotice({ ...base, newSeason: "summer" })).toMatch(/summer/);
  });
});
