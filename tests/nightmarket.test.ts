import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { DAYS_PER_SEASON, SEASONS, type Season } from "../src/core/calendar";
import { FESTIVALS } from "../src/core/festivals";
import {
  LAYOUTS,
  attendees,
  festivalHolds,
  villagerNow,
} from "../src/core/festivalroutes";
import { counterName } from "../src/core/festivals";
import { furnitureById } from "../src/core/furniture";
import { hatById } from "../src/core/hats";
import { itemById } from "../src/core/items";
import {
  HAT_CYCLE,
  HAT_PRICE,
  MARKET_HOLD,
  STALLS,
  buyAtStall,
  hatOf,
  isStall,
  stallOf,
  marketClosedLine,
  marketEvening,
  marketHolds,
  marketOpen,
  marketProblem,
  marketStock,
} from "../src/core/nightmarket";
import { newGame } from "../src/core/save";
import { traderPrice } from "../src/core/trader";
import { dayContext, villagerById } from "../src/core/villagers";

const dayOf = (season: Season, d: number, year = 1) =>
  (year - 1) * SEASONS.length * DAYS_PER_SEASON +
  SEASONS.indexOf(season) * DAYS_PER_SEASON +
  d;
const market = (evening: number, year = 1) =>
  dayOf("winter", 15 + evening, year);
const EVENING = 18 * 60;

const at = (day: number, minutes: number, money = 100000) => {
  const g = newGame();
  g.day.clock.day = day;
  g.day.clock.minutes = minutes;
  g.money = money;
  return g;
};

describe("the Winter Night Market days", () => {
  it("counts the evenings, 1 to 3, and nothing else", () => {
    expect(marketEvening(dayOf("winter", 15))).toBe(0);
    expect([16, 17, 18].map((d) => marketEvening(dayOf("winter", d)))).toEqual([
      1, 2, 3,
    ]);
    expect(marketEvening(dayOf("winter", 19))).toBe(0);
    expect(marketEvening(dayOf("fall", 17))).toBe(0);
    expect(marketEvening(market(2, 3))).toBe(2);
  });

  it("is open from 17:00 to midnight on the three days only", () => {
    const d = market(1);
    expect(marketOpen(d, 16 * 60 + 59)).toBe(false);
    expect(marketOpen(d, 17 * 60)).toBe(true);
    expect(marketOpen(d, 23 * 60 + 59)).toBe(true);
    expect(marketOpen(d, 24 * 60)).toBe(false);
    expect(marketOpen(dayOf("winter", 19), EVENING)).toBe(false);
    expect(marketClosedLine(d, 12 * 60)).toMatch(/opens at 5:00 pm/);
    expect(marketClosedLine(d, 25 * 60)).toMatch(/packed up/);
    expect(marketClosedLine(d, EVENING)).toBe("");
    expect(marketClosedLine(dayOf("winter", 20), EVENING)).not.toBe("");
  });

  it("holds the stalls all three days, all day, and leaves the festival holds alone", () => {
    expect(marketHolds(market(1))).toEqual([MARKET_HOLD]);
    expect(marketHolds(market(3))).toEqual(["festival-night-market"]);
    expect(marketHolds(dayOf("winter", 19))).toEqual([]);
    expect(festivalHolds(market(1))).toEqual([]);
  });
});

describe("the stall stock", () => {
  it("is empty off market days", () => {
    for (const s of STALLS)
      expect(marketStock(s, dayOf("winter", 20))).toEqual([]);
  });

  it("gives the lantern stall the same eight pieces every evening, at the note's prices", () => {
    const prices = Object.fromEntries(
      marketStock("lantern", market(1)).map((e) => [e.item, e.price]),
    );
    expect(prices).toEqual({
      "snow-lamp": 220,
      "winter-wreath": 200,
      "warm-rug": 200,
      "hanging-planter": 210,
      "lantern-string": 500,
      "frost-glass-candle": 600,
      "pine-garland": 700,
      "sleigh-bench": 1000,
    });
    expect(marketStock("lantern", market(3))).toEqual(
      marketStock("lantern", market(1)),
    );
  });

  it("changes the curio stall by evening", () => {
    const names = (n: number) =>
      marketStock("curio", market(n)).map((e) => e.item!);
    expect(names(1)).toEqual(["market-fireplace"]);
    expect(marketStock("curio", market(1))[0]!.price).toBe(15000);
    const two = names(2);
    expect(two).toContain("market-fireplace");
    expect(two.length).toBeGreaterThan(3);
    for (const e of marketStock("curio", market(2)).filter(
      (x) => x.item !== "market-fireplace",
    ))
      expect(e.price, e.item).toBe(itemById(e.item!)!.buyPrice);
    const three = names(3);
    expect(three).toContain("market-fireplace");
    expect(three).toHaveLength(3);
  });

  it("sells 4 to 6 winter goods at 1.5 times sell value, seeded by the day", () => {
    const seen = new Set<string>();
    for (let e = 1; e <= 3; e++)
      for (const year of [1, 2, 3]) {
        const stock = marketStock("trader", market(e, year));
        expect(stock.length).toBeGreaterThanOrEqual(4);
        expect(stock.length).toBeLessThanOrEqual(6);
        expect(new Set(stock.map((s) => s.item)).size).toBe(stock.length);
        for (const s of stock) {
          expect(s.price).toBe(traderPrice(s.item!));
          expect(s.price).toBe(Math.floor(itemById(s.item!)!.sellPrice * 1.5));
          seen.add(s.item!);
        }
        expect(marketStock("trader", market(e, year))).toEqual(stock);
      }
    expect(seen.size).toBeGreaterThan(6);
    expect(marketStock("trader", market(1))).not.toEqual(
      marketStock("trader", market(2)),
    );
  });

  it("sells one 1,200g hat a night, nine hats over a three-year cycle", () => {
    expect(HAT_CYCLE).toHaveLength(9);
    expect(HAT_PRICE).toBe(1200);
    const worn: string[] = [];
    for (const year of [1, 2, 3])
      for (const e of [1, 2, 3]) {
        const stock = marketStock("hatmaker", market(e, year));
        expect(stock).toHaveLength(1);
        expect(stock[0]).toEqual({ hat: hatOf(e, year), price: 1200 });
        worn.push(stock[0]!.hat!);
      }
    expect(worn).toEqual([...HAT_CYCLE]);
    expect(new Set(worn).size).toBe(9);
    expect(hatOf(1, 4)).toBe(hatOf(1, 1));
    for (const id of HAT_CYCLE) expect(hatById(id), id).toBeDefined();
  });

  it("only offers real items, and keeps the market-only decor off the carpenter", () => {
    for (const s of STALLS)
      for (let e = 1; e <= 3; e++)
        for (const x of marketStock(s, market(e)))
          if (x.item) expect(itemById(x.item), x.item).toBeDefined();
    for (const id of [
      "lantern-string",
      "frost-glass-candle",
      "pine-garland",
      "sleigh-bench",
      "market-fireplace",
    ])
      expect(furnitureById(id)?.festival, id).toBe(true);
  });
});

describe("buying at a stall", () => {
  const d = market(1);

  it("needs the market open and not the joined key", () => {
    const e = marketStock("lantern", d)[0]!;
    expect(marketProblem(at(d, 12 * 60), "lantern", e)).toMatch(/opens at/);
    expect(marketProblem(at(d, 25 * 60), "lantern", e)).toMatch(/packed up/);
    const g = at(d, EVENING);
    expect(g.festivalsJoined).toEqual([]);
    expect(marketProblem(g, "lantern", e)).toBeUndefined();
    expect(buyAtStall(g, "lantern", e)).toBe(true);
    expect(g.money).toBe(100000 - e.price);
    expect(g.inventory.count(e.item!)).toBe(1);
  });

  it("is unlimited per item", () => {
    const g = at(d, EVENING);
    const e = marketStock("lantern", d)[0]!;
    expect(buyAtStall(g, "lantern", e)).toBe(true);
    expect(buyAtStall(g, "lantern", e)).toBe(true);
    expect(g.inventory.count(e.item!)).toBe(2);
  });

  it("refuses what is not on that stall, what costs too much and a full pack", () => {
    const g = at(d, EVENING);
    const lamp = marketStock("lantern", d)[0]!;
    expect(marketProblem(g, "curio", lamp)).toMatch(/not on sale/);
    expect(marketProblem(g, "lantern", { ...lamp, price: 1 })).toMatch(
      /not on sale/,
    );
    g.money = 10;
    expect(marketProblem(g, "lantern", lamp)).toMatch(/more/);
    expect(buyAtStall(g, "lantern", lamp)).toBe(false);
    expect(g.money).toBe(10);
  });

  it("sells a hat once and refuses a second", () => {
    const g = at(d, EVENING);
    const hat = marketStock("hatmaker", d)[0]!;
    expect(counterName(hat)).toBe(hatById(hat.hat!)!.name);
    expect(buyAtStall(g, "hatmaker", hat)).toBe(true);
    expect(g.wardrobe.has(hat.hat!)).toBe(true);
    expect(g.money).toBe(100000 - 1200);
    expect(marketProblem(g, "hatmaker", hat)).toMatch(/already have/);
  });

  it("sells the fireplace for 15,000g", () => {
    const g = at(d, EVENING, 20000);
    const fire = marketStock("curio", d)[0]!;
    expect(buyAtStall(g, "curio", fire)).toBe(true);
    expect(g.money).toBe(5000);
    expect(g.inventory.count("market-fireplace")).toBe(1);
  });

  it("knows the stall ids", () => {
    expect(STALLS.every(isStall)).toBe(true);
    expect(isStall("pier")).toBe(false);
  });
});

describe("the square", () => {
  const holds = new Set([MARKET_HOLD]);
  const map = maps.getWith("hearthwell", holds);
  const plain = maps.getWith("hearthwell", new Set());
  const l = LAYOUTS.find((x) => x.key === "night-market")!;
  const reach = map.reachable({ x: l.starts[0]![0], y: l.starts[0]![1] });
  const stalls = {
    lantern: [66, 55],
    curio: [70, 55],
    trader: [74, 55],
    hatmaker: [78, 58],
  } as const;

  it("puts a 2 by 2 stall on the square only while the market holds", () => {
    for (const [, [x, y]] of Object.entries(stalls))
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        expect(map.isBlocked(x + dx!, y + dy!)).toBe(true);
        expect(plain.isBlocked(x + dx!, y + dy!)).toBe(false);
      }
  });

  it("has a market-stall service per stall that the player can face", () => {
    for (const [id, [x, y]] of Object.entries(stalls)) {
      const sv = map.services.filter(
        (s) => s.kind === "market-stall" && stallOf(s.id) === id,
      );
      expect(sv.length, id).toBe(2);
      expect(isStall(id)).toBe(true);
      for (const s of sv) {
        expect(s.x >= x && s.x <= x + 1 && s.y === y + 1, id).toBe(true);
        expect(reach.has(`${s.x},${s.y + 1}`), id).toBe(true);
      }
    }
    expect(plain.services.some((s) => s.kind === "market-stall")).toBe(false);
  });

  it("leaves shops and their doors open", () => {
    expect(map.exits.length).toBe(plain.exits.length);
    expect(map.problems()).toEqual([]);
  });
});

describe("the crowd", () => {
  const f = FESTIVALS.find((x) => x.id === "night-market")!;
  const l = LAYOUTS.find((x) => x.key === "night-market")!;
  const d = market(1);
  const ctx = dayContext(d, "sunny");
  const where = (id: string, t: number) =>
    villagerNow(villagerById(id)!, d, ctx, t).festival;

  it("has the 18 attendees of the spots table, and none of the area residents", () => {
    expect(attendees(l)).toHaveLength(18);
    for (const id of [
      "hester",
      "alder",
      "tilda",
      "rufus",
      "rosmarin",
      "rundahl",
    ])
      expect(attendees(l)).not.toContain(id);
    expect(l.map).toBe(f.place.map);
    expect(l.hold).toBe(MARKET_HOLD);
    expect(l.starts).toHaveLength(8);
  });

  it("stands each person at their spot inside their window only", () => {
    const m = (h: number, min = 0) => h * 60 + min;
    const spot = (id: string) => ({
      map: "hearthwell",
      x: l.spots[id]![0],
      y: l.spots[id]![1],
      state: "standing",
    });
    expect(where("cuthbert", m(17, 59))).toBeUndefined();
    expect(where("cuthbert", m(18))).toMatchObject(spot("cuthbert"));
    expect(where("cuthbert", m(21, 59))).toMatchObject(spot("cuthbert"));
    expect(where("cuthbert", m(22))).toBeUndefined();
    // Children go home at 20:00.
    for (const id of ["fitch", "pim", "wren", "toby"]) {
      expect(where(id, m(19, 59)), id).toMatchObject(spot(id));
      expect(where(id, m(20)), id).toBeUndefined();
    }
    // Hattie stays to midnight.
    expect(where("hattie", m(18))).toMatchObject(spot("hattie"));
    expect(where("hattie", m(23, 59))).toMatchObject(spot("hattie"));
    // Later arrivals.
    expect(where("bramwell", m(18, 59))).toBeUndefined();
    expect(where("bramwell", m(19))).toMatchObject(spot("bramwell"));
    expect(where("dunmar", m(19, 29))).toBeUndefined();
    expect(where("dunmar", m(19, 30))).toMatchObject(spot("dunmar"));
    expect(where("aurelle", m(21))).toBeUndefined();
    expect(where("walter", m(20, 59))).toMatchObject(spot("walter"));
    expect(where("walter", m(21))).toBeUndefined();
  });

  it("keeps the normal route outside the window and for those who stay away", () => {
    const r = villagerNow(villagerById("cuthbert")!, d, ctx, 12 * 60);
    expect(r.festival).toBeUndefined();
    expect("route" in r).toBe(true);
    expect(where("hester", 19 * 60)).toBeUndefined();
    expect(where("rosmarin", 19 * 60)).toBeUndefined();
  });

  it("does not stand there on other days", () => {
    const other = dayOf("winter", 20);
    const c2 = dayContext(other, "sunny");
    expect(
      villagerNow(villagerById("cuthbert")!, other, c2, 19 * 60).festival,
    ).toBeUndefined();
  });
});
