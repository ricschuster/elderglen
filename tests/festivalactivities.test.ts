import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import { FESTIVALS } from "../src/core/festivals";
import { newGame } from "../src/core/save";
import {
  awardHuntPrize,
  finishHunt,
  huntEndLine,
  huntLine,
  huntOffer,
  huntStartProblem,
  huntWinner,
  packetTiles,
  pickUp,
  startHunt,
  tickHunt,
} from "../src/core/seedhunt";
import {
  CAKE_POINTS,
  cakeDishes,
  cakeProblem,
  handInCake,
} from "../src/core/cakeday";
import { attendees, festivalLayout } from "../src/core/festivalroutes";

const fest = (id: string) => FESTIVALS.find((f) => f.id === id)!;
const dayOf = (season: string, d: number, year = 1) =>
  (year - 1) * SEASONS.length * DAYS_PER_SEASON +
  SEASONS.indexOf(season as never) * DAYS_PER_SEASON +
  d;

describe("seed hunt", () => {
  const f = fest("seedswap-fair");
  const day = dayOf("spring", 21);

  it("uses the odd packet set in year 1 and the even set in year 2", () => {
    const h = festivalLayout(f)!.hunt!;
    expect(packetTiles(h, day)).toBe(h.odd);
    expect(packetTiles(h, dayOf("spring", 21, 2))).toBe(h.even);
  });

  it("starts from opening to 17:30 only", () => {
    expect(huntStartProblem(f, 11 * 60)).toBeDefined();
    expect(huntStartProblem(f, 12 * 60)).toBeUndefined();
    expect(huntStartProblem(f, 17 * 60 + 30)).toBeUndefined();
    expect(huntStartProblem(f, 17 * 60 + 31)).toBeDefined();
    expect(startHunt(f, day, 18 * 60)).toBeUndefined();
  });

  it("wins at 9 packets, each picked up once", () => {
    const s = startHunt(f, day, 12 * 60)!;
    const tiles = packetTiles(s.hunt, day);
    expect(pickUp(s, 0, 0)).toBe(false);
    for (let i = 0; i < 8; i++)
      expect(pickUp(s, tiles[i]![0], tiles[i]![1])).toBe(true);
    expect(pickUp(s, tiles[0]![0], tiles[0]![1])).toBe(false);
    expect(s.status).toBe("running");
    pickUp(s, tiles[8]![0], tiles[8]![1]);
    expect(s.status).toBe("won");
    expect(huntWinner(f, s)).toBe("player");
    expect(pickUp(s, tiles[9]![0], tiles[9]![1])).toBe(false);
  });

  it("loses on time and Linnet wins", () => {
    const s = startHunt(f, day, 12 * 60)!;
    tickHunt(s, 49);
    expect(s.status).toBe("running");
    tickHunt(s, 1);
    expect(s.status).toBe("lost");
    expect(huntWinner(f, s)).toBe("linnet");
  });

  it("a finished hunt ends the festival at the end time, a running one does not", () => {
    const g = newGame();
    g.day.clock.day = day;
    g.day.clock.minutes = 13 * 60;
    const s = startHunt(f, day, 13 * 60)!;
    expect(finishHunt(g, f, s)).toBe(false);
    expect(g.day.clock.minutes).toBe(13 * 60);
    tickHunt(s, 50);
    expect(finishHunt(g, f, s)).toBe(true);
    expect(g.day.clock.minutes).toBe(f.ends);
  });
});

describe("seed hunt prize", () => {
  const f = fest("seedswap-fair");
  const won = (day: number) => {
    const s = startHunt(f, day, 13 * 60)!;
    s.status = "won";
    return s;
  };
  const setup = (year: number) => {
    const g = newGame();
    g.day.clock.day = dayOf("spring", 14, year);
    return g;
  };

  it("gives nothing for a lost or running hunt", () => {
    const g = setup(1);
    const s = startHunt(f, g.day.clock.day, 13 * 60)!;
    expect(awardHuntPrize(g, s)).toBeUndefined();
    tickHunt(s, 60);
    expect(awardHuntPrize(g, s)).toBeUndefined();
    expect(g.inventory.count("ember-berry-seed")).toBe(0);
  });

  it("first win gives the hat and a packet, a later year only a packet", () => {
    const g = setup(1);
    const a = awardHuntPrize(g, won(g.day.clock.day))!;
    expect(a).toEqual({ hat: "straw-boater", packet: true });
    expect(g.wardrobe.has("straw-boater")).toBe(true);
    expect(g.inventory.count("ember-berry-seed")).toBe(1);
    expect(awardHuntPrize(g, won(g.day.clock.day))).toBeUndefined();
    g.day.clock.day = dayOf("spring", 14, 2);
    expect(awardHuntPrize(g, won(g.day.clock.day))).toEqual({ packet: true });
    expect(g.inventory.count("ember-berry-seed")).toBe(2);
  });
});

describe("cake table", () => {
  const dish = "fried-egg";
  const setup = () => {
    const g = newGame();
    g.day.clock.day = dayOf("summer", 8);
    return g;
  };

  it("needs Cake Day and a dish you hold", () => {
    const g = newGame();
    expect(cakeProblem(g, "parsnip")).toBeDefined();
    const c = setup();
    expect(cakeProblem(c, "parsnip")).toBe("The table is for cooked dishes.");
    expect(cakeProblem(c, dish)).toBe("You do not have that.");
  });

  it("gives every attendee points by quality, once a year", () => {
    const g = setup();
    g.inventory.add(`${dish}@gold`, 1);
    g.inventory.add(dish, 1);
    const r = handInCake(g, `${dish}@gold`)!;
    expect(r.quality).toBe("gold");
    const who = attendees(festivalLayout(fest("cake-day"))!);
    expect(Object.keys(r.gains).sort()).toEqual([...who].sort());
    expect(CAKE_POINTS).toEqual({ normal: 60, silver: 90, gold: 120 });
    expect(g.friendship.points("hattie")).toBe(CAKE_POINTS.gold);
    expect(g.inventory.count(`${dish}@gold`)).toBe(0);
    expect(handInCake(g, dish)).toBeUndefined();
    expect(cakeProblem(g, dish)).toBe("Your dish is already on the table.");
    g.day.clock.day = dayOf("summer", 8, 2);
    expect(cakeProblem(g, dish)).toBeUndefined();
  });
});

describe("cake table picker", () => {
  it("lists each cooked dish in the pack once, and nothing else", () => {
    const g = newGame();
    g.day.clock.day = dayOf("summer", 8);
    g.inventory.add("parsnip", 3);
    g.inventory.add("fried-egg", 1);
    g.inventory.add("fried-egg@gold", 1);
    expect(cakeDishes(g).sort()).toEqual(["fried-egg", "fried-egg@gold"]);
    g.day.clock.day = dayOf("summer", 9);
    expect(cakeDishes(g)).toEqual([]);
  });
});

describe("seed hunt scene offer", () => {
  const f = fest("seedswap-fair");
  const day = dayOf("spring", 21);

  it("starts only from Cuthbert, on the forest, in the window", () => {
    expect(
      huntOffer(f, "forest", "cuthbert", day, 13 * 60)?.state,
    ).toBeDefined();
    expect(huntOffer(f, "forest", "odette", day, 13 * 60)).toBeUndefined();
    expect(huntOffer(f, "farm", "cuthbert", day, 13 * 60)).toBeUndefined();
    expect(
      huntOffer(undefined, "forest", "cuthbert", day, 13 * 60),
    ).toBeUndefined();
    const late = huntOffer(f, "forest", "cuthbert", day, 18 * 60);
    expect(late?.state).toBeUndefined();
    expect(late?.message).toMatch(/late/);
  });

  it("words the countdown and the end", () => {
    const s = startHunt(f, day, 13 * 60)!;
    expect(huntLine(s)).toBe("Seed hunt: 50s  0/9");
    expect(huntEndLine(f, s)).toBeUndefined();
    tickHunt(s, 60);
    expect(huntEndLine(f, s)).toMatch(/Linnet wins/);
    const w = startHunt(f, day, 13 * 60)!;
    for (const t of [...w.packets]) pickUp(w, t[0], t[1]);
    expect(huntEndLine(f, w)).toMatch(/You win/);
  });
});
