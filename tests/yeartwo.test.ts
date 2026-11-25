import { describe, expect, it } from "vitest";
import { plant, till } from "../src/core/actions";
import { MIXED_SEED } from "../src/core/weeds";
import { dateOf } from "../src/core/calendar";
import { requestFor } from "../src/core/quests";
import { offerIds } from "../src/core/shopoffers";
import { deliverAll, openLetter } from "../src/core/mail";
import { ORDERS, orderById, weeklyPick } from "../src/core/orders";
import { fertilizersOnSale } from "../src/core/fertilizer";
import { ANIMAL_CATALOGUE, ANIMAL_CATALOGUE_PRICE } from "../src/core/items";
import { newGame } from "../src/core/save";
import { seedStock } from "../src/core/shop";
import { endDue, sleep } from "../src/core/sleep";
import {
  RAW_PRICES,
  YEAR_TWO_DAY,
  afterLastSeat,
  buyCatalogue,
  buyPriceOn,
  hardCount,
  rowOpen,
} from "../src/core/yeartwo";
import { fillHall } from "./hall-helpers";

const HARD_IDS = [
  "deep-haul",
  "fine-harvest-2",
  "long-lines",
  "deep-patrol",
  "jewel-case",
  "timber-yard",
];
const never = () => 0.99;

describe("year two rules (note 112)", () => {
  it("year two starts on Spring 1 of year 2", () => {
    expect(dateOf(YEAR_TWO_DAY)).toMatchObject({
      year: 2,
      season: "spring",
      dayOfSeason: 1,
    });
    expect(dateOf(YEAR_TWO_DAY - 1).year).toBe(1);
  });

  it("a gated row opens in its year; an ungated row is always open", () => {
    expect(rowOpen("garlic-seed", YEAR_TWO_DAY - 1)).toBe(false);
    expect(rowOpen("garlic-seed", YEAR_TWO_DAY)).toBe(true);
    expect(rowOpen("parsnip-seed", 1)).toBe(true);
  });

  it("garlic, red cabbage and artichoke seeds are sold from year two only", () => {
    const held: [string, "spring" | "summer" | "fall"][] = [
      ["garlic-seed", "spring"],
      ["red-cabbage-seed", "summer"],
      ["artichoke-seed", "fall"],
    ];
    for (const [id, season] of held) {
      expect(seedStock(season, 10)).not.toContain(id);
      expect(seedStock(season, YEAR_TWO_DAY + 10)).toContain(id);
      expect(seedStock(season)).toContain(id);
    }
    const g = newGame();
    g.day.clock.day = 5;
    expect(offerIds(g)).not.toContain("garlic-seed");
    g.day.clock.day = YEAR_TWO_DAY;
    expect(offerIds(g)).toContain("garlic-seed");
  });

  it("mixed seeds still give the held back crops in year one", () => {
    const g = newGame();
    const got = new Set<string>();
    for (let i = 0; i < 40; i++) {
      g.farm = newGame().farm;
      g.day.clock.day = 1;
      g.inventory.add(MIXED_SEED, 1);
      expect(till(g, 0, 0).ok).toBe(true);
      expect(plant(g, 0, 0, MIXED_SEED, () => i / 40)).toEqual({ ok: true });
      got.add(g.farm.plotAt(0, 0)?.crop?.id ?? "");
    }
    expect(got.has("garlic")).toBe(true);
  });

  it("deluxe speed-gro comes in year two at 150g", () => {
    expect(fertilizersOnSale(YEAR_TWO_DAY - 1)).not.toContain(
      "deluxe-speed-fertilizer",
    );
    expect(fertilizersOnSale(YEAR_TWO_DAY)).toContain(
      "deluxe-speed-fertilizer",
    );
  });

  it("raw material prices step up on Spring 1 of year 2", () => {
    const want: Record<string, [number, number]> = {
      wood: [10, 50],
      stone: [20, 100],
      "copper-ore": [25, 50],
      "iron-ore": [50, 85],
      coal: [50, 85],
      "gold-ore": [100, 190],
    };
    expect(RAW_PRICES.map((r) => r.id).sort()).toEqual(
      Object.keys(want).sort(),
    );
    for (const [id, [one, two]] of Object.entries(want)) {
      expect(buyPriceOn(id, YEAR_TWO_DAY - 1), id).toBe(one);
      expect(buyPriceOn(id, YEAR_TWO_DAY), id).toBe(two);
    }
    // Goods Stardew does not step up keep their price.
    expect(buyPriceOn("basic-fertilizer", YEAR_TWO_DAY)).toBe(100);
  });

  it("the notice letter arrives on Spring 1 of year 2, once", () => {
    const g = newGame();
    g.day.clock.day = YEAR_TWO_DAY - 1;
    deliverAll(g, g.day.clock.day);
    expect(g.mail.has("price-rise-letter")).toBe(false);
    g.day.clock.day = YEAR_TWO_DAY;
    expect(deliverAll(g, YEAR_TWO_DAY)).toBeGreaterThan(0);
    expect(g.mail.entry("price-rise-letter")?.state).toBe("waiting");
    const r = openLetter(g, "price-rise-letter");
    expect(r.ok && r.letter.body).toMatch(/raw materials/);
    deliverAll(g, YEAR_TWO_DAY + 1);
    expect(g.mail.entry("price-rise-letter")?.received).toBe(YEAR_TWO_DAY);
  });

  it("the Animal Catalogue is sold once, from year two", () => {
    const g = newGame();
    g.money = 10000;
    g.day.clock.day = YEAR_TWO_DAY - 1;
    expect(buyCatalogue(g)).toMatch(/not in yet/);
    g.day.clock.day = YEAR_TWO_DAY;
    expect(buyCatalogue(g)).toBeUndefined();
    expect(g.money).toBe(10000 - ANIMAL_CATALOGUE_PRICE);
    expect(g.inventory.count(ANIMAL_CATALOGUE)).toBe(1);
    expect(buyCatalogue(g)).toMatch(/already/);
  });

  it("the six harder orders stay off the board until the Last Seat is done", () => {
    for (const id of HARD_IDS) expect(orderById(id)?.afterLastSeat).toBe(true);
    expect(ORDERS.filter((o) => o.afterLastSeat)).toHaveLength(6);
    expect(ORDERS.filter((o) => !o.afterLastSeat)).toHaveLength(10);
    const g = newGame();
    g.orders.opened = true;
    const seen = new Set<string>();
    const seenHard = new Set<string>();
    for (let w = 8; w < 600; w++) {
      const p = weeklyPick(w);
      if (p) seen.add(p.id);
      const h = weeklyPick(w, true);
      if (h) seenHard.add(h.id);
    }
    for (const id of HARD_IDS) {
      expect(seen.has(id), id).toBe(false);
      expect(seenHard.has(id), id).toBe(true);
    }
    for (let d = 60; d < 400; d += 7) {
      for (const o of g.orders.board(d)) expect(o.afterLastSeat).toBeFalsy();
    }
    // The first ten stay on the board after the Last Seat.
    expect(
      [...seenHard].filter((id) => !HARD_IDS.includes(id)).length,
    ).toBeGreaterThan(0);
  });

  it("the harder orders ask for what the note says", () => {
    const o = (id: string) => orderById(id)!;
    expect(o("deep-haul").gold).toBe(3500);
    expect(o("deep-patrol").gold).toBe(6000);
    expect(o("deep-patrol").windowDays).toBe(7);
    expect(o("long-lines").ask).toMatchObject({
      kind: "catch-water",
      count: 40,
    });
    expect(o("fine-harvest-2").ask).toMatchObject({
      kind: "ship-quality-vegetables",
      count: 50,
      quality: "gold",
    });
    expect(o("jewel-case").ask).toMatchObject({ count: 10 });
    expect(o("timber-yard").ask).toMatchObject({ count: 100 });
  });

  it("request counts are x1.5 rounded up after the Last Seat, and the pay follows", () => {
    expect(hardCount(5)).toBe(8);
    expect(hardCount(10)).toBe(15);
    let checked = 0;
    for (let d = 2; d < 200 && checked < 30; d++) {
      const a = requestFor(d);
      const b = requestFor(d, true);
      if (!a || !b) continue;
      expect(b.want.item).toBe(a.want.item);
      expect(b.want.count).toBe(hardCount(a.want.count));
      expect(b.reward.gold).toBeGreaterThanOrEqual(a.reward.gold);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("play goes on after the ending: sleeping closes into the next morning, bridge mended", () => {
    const g = newGame();
    fillHall(g.hall, g.inventory, g);
    expect(endDue(g)).toBe(true);
    // The end screen is shown, then "Keep playing" ends the day.
    g.endSeen = true;
    const day = g.day.clock.day;
    sleep(g, [], never, undefined, true);
    expect(g.day.clock.day).toBe(day + 1);
    expect(endDue(g)).toBe(false);
    expect(g.hall.bridgeMended).toBe(true);
    expect(afterLastSeat(g)).toBe(true);
    expect(g.orders.board(g.day.clock.day, afterLastSeat(g))).toBeDefined();
  });
});
