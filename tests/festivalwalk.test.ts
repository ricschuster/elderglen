import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import {
  FESTIVALS,
  festivalGate,
  festivalGateHolds,
  festivalSignLine,
  walkIntoFestival,
} from "../src/core/festivals";
import { newGame } from "../src/core/save";

describe("the plain walk to festival maps (note 82 decision 11)", () => {
  const dayOf = (id: string): number => {
    const f = FESTIVALS.find((x) => x.id === id)!;
    return SEASONS.indexOf(f.season) * DAYS_PER_SEASON + f.day;
  };
  const SHOWING = dayOf("harvest-showing");

  it("opens the green gate only on the Showing day, and the hedge gate on Hollow Eve", () => {
    expect(festivalGateHolds(SHOWING)).toEqual(["festival-gate-green"]);
    expect(festivalGateHolds(1)).toEqual([]);
    expect(festivalGateHolds(dayOf("hollow-eve"))).toEqual([
      "festival-gate-hedge",
    ]);
  });

  it("has Hearthwell exits to the green and the hedge, gated, to a real entry", () => {
    const hw = maps.get("hearthwell")!;
    for (const [id, map] of [
      ["to_green", "green"],
      ["to_hedge", "hedge"],
    ] as const) {
      const e = hw.exits.find((x) => x.id === id)!;
      expect(e.map).toBe(map);
      expect(e.requires).toBe(festivalGate(map));
      expect(maps.get(map)!.entry(e.entry)).toBeDefined();
    }
  });

  it("joins the festival on arrival, and not before it opens", () => {
    const g = newGame();
    expect(walkIntoFestival(g, "farm")).toBeUndefined();
    expect(g.festivalsJoined).toEqual([]);
    g.day.clock.day = SHOWING;
    g.day.clock.minutes = 8 * 60;
    expect(walkIntoFestival(g, "green")).toBeDefined();
    g.day.clock.minutes = 13 * 60;
    expect(walkIntoFestival(g, "green")).toBeUndefined();
    expect(g.festivalsJoined).toHaveLength(1);
  });

  it("tells the sign reader where and when", () => {
    expect(festivalSignLine(SHOWING, 8 * 60)).toMatch(/green.*Walk there/);
    expect(festivalSignLine(SHOWING, 23 * 60)).toMatch(/over/);
    expect(festivalSignLine(1, 8 * 60)).toMatch(/quiet/);
  });
});
