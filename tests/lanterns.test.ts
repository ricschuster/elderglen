import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import { FESTIVALS } from "../src/core/festivals";
import { attendees, festivalLayout } from "../src/core/festivalroutes";
import {
  KEEPSAKE,
  LANTERN,
  LANTERN_POINTS,
  buyLantern,
  lanternBuyProblem,
  launchLantern,
  launchProblem,
} from "../src/core/lanterns";
import { itemById } from "../src/core/items";
import { newGame } from "../src/core/save";

const dayOf = (season: string, d: number, year = 1) =>
  (year - 1) * SEASONS.length * DAYS_PER_SEASON +
  SEASONS.indexOf(season as never) * DAYS_PER_SEASON +
  d;

const setup = (year = 1) => {
  const g = newGame();
  g.day.clock.day = dayOf("summer", 24, year);
  g.day.clock.minutes = 18 * 60;
  g.money = 1000;
  return g;
};

describe("lantern floating", () => {
  it("has item defs for the lantern and the keepsake", () => {
    expect(itemById(LANTERN.id)).toBeDefined();
    expect(itemById(KEEPSAKE.id)).toBeDefined();
  });

  it("sells a lantern only on the festival, while it is open, for the price", () => {
    const n = newGame();
    expect(lanternBuyProblem(n)).toBeDefined();
    const g = setup();
    g.day.clock.minutes = 16 * 60;
    expect(lanternBuyProblem(g)).toBeDefined();
    g.day.clock.minutes = 18 * 60;
    expect(buyLantern(g)).toBe(true);
    expect(g.money).toBe(1000 - LANTERN.price);
    expect(buyLantern(g)).toBe(false);
    const poor = setup();
    poor.money = 0;
    expect(lanternBuyProblem(poor)).toBe("You cannot afford a lantern.");
  });

  it("needs a lantern to launch", () => {
    expect(launchProblem(setup())).toBe("Buy a lantern at the stall first.");
    expect(launchLantern(setup())).toBeUndefined();
  });

  it("launches once a year: friendship with every attendee, keepsake only the first time", () => {
    const g = setup();
    buyLantern(g);
    const r = launchLantern(g)!;
    const who = attendees(
      festivalLayout(FESTIVALS.find((f) => f.id === "lamplight-evening")!)!,
    );
    expect(Object.keys(r.gains).sort()).toEqual([...who].sort());
    expect(g.friendship.points("hattie")).toBe(LANTERN_POINTS);
    expect(r.keepsake).toBe(true);
    expect(g.inventory.count(KEEPSAKE.id)).toBe(1);
    expect(g.inventory.count(LANTERN.id)).toBe(0);
    expect(lanternBuyProblem(g)).toBe("You have already floated your lantern.");
    g.day.clock.day = dayOf("summer", 24, 2);
    expect(buyLantern(g)).toBe(true);
    const r2 = launchLantern(g)!;
    expect(r2.keepsake).toBe(false);
    expect(g.inventory.count(KEEPSAKE.id)).toBe(1);
    expect(g.friendship.points("hattie")).toBe(LANTERN_POINTS * 2);
  });
});
