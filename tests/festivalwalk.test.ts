import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import {
  FESTIVALS,
  festivalGate,
  festivalGateHolds,
  festivalSignLine,
  walkIntoFestival,
  walkIntoPlace,
  festivalPlace,
  festivalStepShut,
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

  describe("festivals held in place join on walking into their place", () => {
    const IN_PLACE = FESTIVALS.filter((f) => !f.map);
    it("covers every festival that has no map of its own", () => {
      expect(IN_PLACE.map((f) => f.id)).toEqual([
        "hat-parade",
        "seedswap-fair",
        "cake-day",
        "lamplight-evening",
        "frostday",
        "night-market",
        "midwinter-feast",
      ]);
    });

    for (const f of IN_PLACE.filter((x) => !x.evening)) {
      it(`${f.id}: joins inside its place once open, not before, not elsewhere`, () => {
        const p = festivalPlace(f, false);
        const x = p.zone.x + 1;
        const y = p.zone.y + 1;
        const g = newGame();
        g.day.clock.day = dayOf(f.id);
        g.day.clock.minutes = f.opens - 60;
        // Shut before it opens: the step is refused, and nothing is joined.
        expect(
          festivalStepShut(g.day.clock.day, g.day.clock.minutes, undefined, {
            map: p.map,
            x,
            y,
          }),
        ).toBe(true);
        expect(walkIntoPlace(g, p.map, x, y)).toBeUndefined();
        g.day.clock.minutes = f.opens + 5;
        expect(walkIntoPlace(g, "farm", x, y)).toBeUndefined();
        expect(walkIntoPlace(g, p.map, p.zone.x - 1, y)).toBeUndefined();
        expect(g.festivalsJoined).toEqual([]);
        expect(walkIntoPlace(g, p.map, x, y)?.id).toBe(f.id);
        expect(g.festivalsJoined).toHaveLength(1);
        // Only the first step joins.
        expect(walkIntoPlace(g, p.map, x, y)).toBeUndefined();
        expect(g.festivalsJoined).toHaveLength(1);
      });

      it(`${f.id}: the sign says where, and the plain place is not a festival map`, () => {
        expect(festivalSignLine(dayOf(f.id), f.opens - 60)).toMatch(
          /Walk there/,
        );
        expect(festivalSignLine(dayOf(f.id), f.opens - 60)).not.toMatch(
          /the village/,
        );
        expect(festivalGateHolds(dayOf(f.id))).toEqual([]);
      });
    }

    it("joins the Midwinter Feast in the hall only when it is restored", () => {
      const f = FESTIVALS.find((x) => x.id === "midwinter-feast")!;
      const g = newGame();
      g.day.clock.day = dayOf("midwinter-feast");
      g.day.clock.minutes = f.opens + 5;
      const hall = festivalPlace(f, true);
      expect(hall.map).toBe("hall");
      expect(
        walkIntoPlace(g, "hall", hall.zone.x, hall.zone.y),
      ).toBeUndefined();
      expect(walkIntoPlace(g, "hall", hall.zone.x, hall.zone.y, true)?.id).toBe(
        f.id,
      );
    });
  });
});
