import { describe, expect, it } from "vitest";
import { SummitCall } from "../src/core/summit";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { reportLines } from "../src/core/report";
import { festivalToday } from "../src/core/festivals";

function night(g: ReturnType<typeof newGame>) {
  return sleep(g, [], () => 0.5);
}

describe("SummitCall", () => {
  it("calls nobody until armed", () => {
    const s = new SummitCall();
    expect(s.callToday(false)).toBe(false);
    expect(s.scenePending).toBe(false);
  });

  it("calls once, on the first free morning, and leaves the scene pending", () => {
    const s = new SummitCall();
    s.arm();
    expect(s.callToday(true)).toBe(false);
    expect(s.isArmed).toBe(true);
    expect(s.callToday(false)).toBe(true);
    expect(s.scenePending).toBe(true);
    expect(s.callToday(false)).toBe(false);
  });

  it("arming again changes nothing while pending or after the scene", () => {
    const s = new SummitCall();
    s.arm();
    s.callToday(false);
    s.arm();
    expect(s.isArmed).toBe(false);
    s.finish();
    s.arm();
    expect(s.isArmed).toBe(false);
    expect(s.seen).toBe(true);
    expect(s.scenePending).toBe(false);
  });

  it("round-trips, and tolerates a missing save", () => {
    const s = new SummitCall();
    s.arm();
    s.callToday(false);
    const t = new SummitCall();
    t.load(JSON.parse(JSON.stringify(s.save())));
    expect(t.scenePending).toBe(true);
    const u = new SummitCall();
    u.load(undefined);
    expect(u.save()).toEqual({
      armed: false,
      scenePending: false,
      seen: false,
    });
  });
});

describe("the steward's morning call", () => {
  it("does not call before the summit", () => {
    const g = newGame();
    const r = night(g);
    expect(r.summitCall).toBe(false);
    expect(g.summit.scenePending).toBe(false);
  });

  it("calls the morning after the achievement, once, and survives save and load", () => {
    const g = newGame();
    g.achievements.award("summit");
    const r = night(g);
    expect(r.summitCall).toBe(true);
    expect(reportLines(r).join(" ")).toContain("steward");
    expect(g.summit.scenePending).toBe(true);
    const back = deserialize(serialize(g));
    expect(back?.summit.scenePending).toBe(true);
    expect(night(g).summitCall).toBe(false);
    g.summit.finish();
    expect(deserialize(serialize(g))?.summit.seen).toBe(true);
  });

  it("waits out a festival morning", () => {
    const g = newGame();
    g.achievements.award("summit");
    // Run nights until the morning that begins on a festival day.
    for (let i = 0; i < 120 && !festivalToday(g.day.clock.day + 1); i++)
      g.day.clock.day += 1;
    expect(festivalToday(g.day.clock.day + 1)).toBeDefined();
    const r = night(g);
    expect(festivalToday(g.day.clock.day)).toBeDefined();
    expect(r.summitCall).toBe(false);
    expect(g.summit.isArmed).toBe(true);
    expect(night(g).summitCall).toBe(true);
  });
});
