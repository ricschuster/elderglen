import { describe, expect, it } from "vitest";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import { FISH, bite } from "../src/core/fishing";
import { itemById } from "../src/core/items";
import {
  MARKET_FISH,
  MARKET_PIER,
  PEARL,
  PIER_LINES,
  buyPermit,
  claimHotDrink,
  floatLantern,
  floatProblem,
  hasLuck,
  hasPermit,
  isPierCast,
  isPierTile,
  luckRare,
  permitProblem,
  pierBite,
  pierCastProblem,
  pierRunning,
  rollPearl,
} from "../src/core/marketpier";
import { newGame, type GameState } from "../src/core/save";
import { deserialize, serialize } from "../src/core/save";

const winter = SEASONS.indexOf("winter") * DAYS_PER_SEASON;
const marketDay = winter + 16;

const at = (day: number, minutes: number): GameState => {
  const g = newGame();
  g.day.clock.day = day;
  g.day.clock.minutes = minutes;
  g.money = 5000;
  return g;
};
const T = (h: number, m = 0) => h * 60 + m;
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[Math.min(i++, v.length - 1)]!;
};

describe("market pier permit", () => {
  it("runs only on the market evenings, from 17:00 to 23:00", () => {
    expect(pierRunning(marketDay, T(16, 59))).toBe(false);
    expect(pierRunning(marketDay, T(17))).toBe(true);
    expect(pierRunning(marketDay, T(22, 59))).toBe(true);
    expect(pierRunning(marketDay, T(23))).toBe(false);
    expect(pierRunning(winter + 15, T(20))).toBe(false);
    expect(pierRunning(winter + 19, T(20))).toBe(false);
    expect(pierRunning(winter + 18, T(20))).toBe(true);
  });

  it("sells one permit for the evening and takes the money", () => {
    const g = at(marketDay, T(18));
    expect(permitProblem(g)).toBeUndefined();
    expect(buyPermit(g)).toBe(true);
    expect(g.money).toBe(5000 - MARKET_PIER.permitPrice);
    expect(hasPermit(g)).toBe(true);
    expect(permitProblem(g)).toBe(PIER_LINES.have);
    expect(buyPermit(g)).toBe(false);
    expect(g.money).toBe(5000 - MARKET_PIER.permitPrice);
  });

  it("refuses with a line when shut, closed or too poor", () => {
    expect(permitProblem(at(winter + 5, T(18)))).toBe(PIER_LINES.shut);
    expect(permitProblem(at(marketDay, T(16)))).toBe(PIER_LINES.shut);
    expect(permitProblem(at(marketDay, T(23)))).toBe(PIER_LINES.closed);
    const poor = at(marketDay, T(18));
    poor.money = 999;
    expect(permitProblem(poor)).toBe(PIER_LINES.poor);
    expect(buyPermit(poor)).toBe(false);
  });

  it("refuses a cast from a pier tile without a permit, and after closing", () => {
    const g = at(marketDay, T(19));
    expect(isPierTile(63, 65)).toBe(true);
    expect(isPierTile(63, 64)).toBe(false);
    expect(isPierTile(62, 66)).toBe(false);
    expect(pierCastProblem(g, 63, 66)).toBe(PIER_LINES.noPermit);
    // Fishing elsewhere is unchanged.
    expect(pierCastProblem(g, 64, 66)).toBeUndefined();
    buyPermit(g);
    expect(pierCastProblem(g, 63, 66)).toBeUndefined();
    expect(isPierCast(g, 63, 66)).toBe(true);
    expect(isPierCast(g, 64, 66)).toBe(false);
    g.day.clock.minutes = T(23);
    expect(pierCastProblem(g, 63, 66)).toBe(PIER_LINES.closed);
    expect(isPierCast(g, 63, 66)).toBe(false);
  });

  it("does not gate the bank on other days, and the permit lapses next evening", () => {
    expect(pierCastProblem(at(winter + 5, T(19)), 63, 66)).toBeUndefined();
    const g = at(marketDay, T(19));
    buyPermit(g);
    g.day.clock.day = marketDay + 1;
    expect(hasPermit(g)).toBe(false);
    expect(pierCastProblem(g, 63, 66)).toBe(PIER_LINES.noPermit);
  });
});

describe("market fish", () => {
  it("are kept out of fish.json but are items", () => {
    expect(MARKET_FISH.map((f) => f.id)).toEqual([
      "lamp-minnow",
      "frostveil",
      "midnight-gar",
      "hush-lantern",
    ]);
    for (const f of MARKET_FISH) {
      expect(FISH.some((x) => x.id === f.id)).toBe(false);
      expect(itemById(f.id)?.sellPrice).toBe(f.sellPrice);
    }
    expect(itemById(PEARL.id)?.name).toBe("Pearl");
  });

  it("replace a fish bite only, never the tutorial or other bites", () => {
    const fish = { kind: "fish" as const, fish: FISH[0]! };
    const hit = pierBite(fish, false, seq(0, 0));
    expect(hit.kind === "fish" && hit.fish.id).toBe("lamp-minnow");
    expect(pierBite(fish, true, seq(0, 0))).toBe(fish);
    expect(pierBite(fish, false, seq(0.99, 0))).toBe(fish);
    const trash = { kind: "trash" as const, item: "old-boot" };
    expect(pierBite(trash, false, seq(0, 0))).toBe(trash);
  });

  it("are weighted by rarity and the luck lifts the rare ones", () => {
    const fish = { kind: "fish" as const, fish: FISH[0]! };
    const share = (lift: number) => {
      let rare = 0;
      let n = 0;
      for (let i = 0; i < 2000; i++) {
        const r = pierBite(fish, false, seq(0, (i + 0.5) / 2000), lift);
        if (r.kind === "fish") {
          n += 1;
          if (r.fish.rarity === "rare") rare += 1;
        }
      }
      return rare / n;
    };
    const plain = share(1);
    expect(plain).toBeCloseTo(2 / 11, 1);
    expect(share(2)).toBeGreaterThan(plain);
  });

  it("the river fish still bite at night odds", () => {
    const b = bite(
      "river",
      {
        season: "winter",
        minutes: MARKET_PIER.nightMinute,
        raining: false,
        rod: "reed-pole",
        waterRoomDone: false,
        legendsTaken: [],
      },
      () => 0.5,
    );
    expect(b.kind).not.toBe("none");
  });

  it("each catch counts for the collection and survives a save", () => {
    const g = at(marketDay, T(19));
    g.fishing.note("frostveil", 40);
    const back = deserialize(serialize(g));
    expect(back?.fishing.has("frostveil")).toBe(true);
    expect(back?.fishing.record("frostveil")?.longest).toBe(40);
  });
});

describe("pearl", () => {
  it("turns up about 1 in 200 and lands in the pack", () => {
    const g = at(marketDay, T(19));
    expect(rollPearl(g, { x: 63, y: 66 }, () => 0.5)).toBe(false);
    expect(g.inventory.count(PEARL.id)).toBe(0);
    expect(MARKET_PIER.pearlChance).toBe(0.005);
    expect(rollPearl(g, { x: 63, y: 66 }, () => 0.004)).toBe(true);
    expect(g.inventory.count(PEARL.id)).toBe(1);
  });
});

describe("lantern float", () => {
  it("costs 50g, once a night, and brings luck until morning", () => {
    const g = at(marketDay, T(20));
    expect(luckRare(g)).toBe(1);
    expect(floatProblem(g)).toBeUndefined();
    expect(floatLantern(g)).toBe(PIER_LINES.floated);
    expect(g.money).toBe(5000 - MARKET_PIER.float.price);
    expect(hasLuck(g)).toBe(true);
    expect(luckRare(g)).toBe(MARKET_PIER.luckRare);
    expect(floatProblem(g)).toBe(PIER_LINES.floatDone);
    expect(floatLantern(g)).toBeUndefined();
    g.day.clock.day += 1;
    expect(hasLuck(g)).toBe(false);
  });

  it("is refused when shut, closed or too poor", () => {
    expect(floatProblem(at(winter + 3, T(20)))).toBe(PIER_LINES.shut);
    expect(floatProblem(at(marketDay, T(23, 30)))).toBe(PIER_LINES.closed);
    const g = at(marketDay, T(20));
    g.money = 10;
    expect(floatProblem(g)).toBeDefined();
    expect(floatLantern(g)).toBeUndefined();
  });
});

describe("hot drink", () => {
  it("restores a little energy once an evening", () => {
    const g = at(marketDay, T(19));
    g.day.energy.current = 50;
    const first = claimHotDrink(g);
    expect(first.given).toBe(true);
    expect(g.day.energy.current).toBe(50 + MARKET_PIER.drink.energy);
    const again = claimHotDrink(g);
    expect(again.given).toBe(false);
    expect(g.day.energy.current).toBe(50 + MARKET_PIER.drink.energy);
    g.day.clock.day += 1;
    expect(claimHotDrink(g).given).toBe(true);
    g.day.clock.day = winter + 19;
    expect(claimHotDrink(g).given).toBe(false);
  });

  it("is not given off the market evenings or before opening", () => {
    expect(claimHotDrink(at(winter + 3, T(19))).given).toBe(false);
    expect(claimHotDrink(at(marketDay, T(12))).given).toBe(false);
  });
});

describe("saves", () => {
  it("keep the permit, the luck and the drink flags", () => {
    const g = at(marketDay, T(19));
    buyPermit(g);
    floatLantern(g);
    claimHotDrink(g);
    const back = deserialize(serialize(g))!;
    expect(hasPermit(back)).toBe(true);
    expect(hasLuck(back)).toBe(true);
    expect(claimHotDrink(back).given).toBe(false);
  });
});
