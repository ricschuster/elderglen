import { describe, expect, it } from "vitest";
import {
  BOUQUET,
  TOKEN,
  buyToken,
  courtGift,
  finishWedding,
  sellerProblem,
  weddingEvent,
  weddingMorning,
} from "../src/core/courtship";
import { festivalDayToday } from "../src/core/festivals";
import { HEART } from "../src/core/friendship";
import { dueEvents, eventById, type HeartEvent } from "../src/core/heartevents";
import { houseSpouse } from "../src/core/house";
import { meet } from "../src/core/townfolk";
import {
  newGame,
  deserialize,
  serialize,
  type GameState,
} from "../src/core/save";
import { TOKEN_PRICE } from "../src/core/marriage";
import { VILLAGERS } from "../src/core/villagers";
import { holdsOf } from "../src/core/worldflags";

const CANDIDATES = VILLAGERS.filter((v) => v.candidate).map((v) => v.id);

/** A game with `id` met and at `hearts`, on a day that is not a festival. */
function setup(id: string, hearts: number, bouquetFirst = false): GameState {
  const g = newGame();
  g.friendship.meet(id);
  g.friendship.award(id, hearts * HEART);
  if (bouquetFirst) g.inventory.add(BOUQUET, 1);
  return g;
}

const quietDay = (): number => {
  for (let d = 5; d < 200; d++)
    if (![0, 1, 2, 3, 4].some((n) => festivalDayToday(d + n))) return d;
  throw new Error("no quiet day");
};

describe("the bouquet", () => {
  it("starts courting at 8 hearts and lifts the cap", () => {
    const g = setup("bramwell", 8, true);
    const r = courtGift(g, "bramwell", BOUQUET)!;
    expect(r.consumed).toBe(true);
    expect(g.marriage.stage).toBe("courting");
    expect(g.marriage.spouse).toBe("bramwell");
    expect(g.friendship.hasBouquet("bramwell")).toBe(true);
    expect(g.inventory.count(BOUQUET)).toBe(0);
    g.friendship.award("bramwell", 5 * HEART);
    expect(g.friendship.hearts("bramwell")).toBe(10);
  });

  it("is kept when the heart is below 8, for a friend, or while courting another", () => {
    const low = setup("bramwell", 7, true);
    expect(courtGift(low, "bramwell", BOUQUET)!.consumed).toBe(false);
    expect(low.marriage.stage).toBe("none");
    const friend = setup("odette", 8, true);
    expect(courtGift(friend, "odette", BOUQUET)!.consumed).toBe(false);
    const two = setup("bramwell", 8, true);
    two.friendship.meet("aurelle");
    two.friendship.award("aurelle", 8 * HEART);
    courtGift(two, "bramwell", BOUQUET);
    two.inventory.add(BOUQUET, 1);
    expect(courtGift(two, "aurelle", BOUQUET)!.consumed).toBe(false);
    expect(two.marriage.spouse).toBe("bramwell");
  });

  it("is an ordinary item to meet() only through courtGift", () => {
    const g = setup("bramwell", 8, true);
    const r = meet(g, "bramwell", BOUQUET);
    expect(r.consumed).toBe(BOUQUET);
    expect(g.marriage.stage).toBe("courting");
  });
});

describe("the rain peddler and the token", () => {
  it("sells only on rain days, within hours, once at a time", () => {
    const g = newGame();
    g.money = 6000;
    g.weather = "sunny";
    expect(sellerProblem(g)).not.toBe("");
    expect(buyToken(g)).toBe(false);
    g.weather = "rainy";
    g.day.clock.minutes = 8 * 60;
    expect(sellerProblem(g)).not.toBe("");
    g.day.clock.minutes = 10 * 60;
    expect(sellerProblem(g)).toBe("");
    expect(buyToken(g)).toBe(true);
    expect(g.money).toBe(6000 - TOKEN_PRICE);
    expect(buyToken(g)).toBe(false);
    g.weather = "stormy";
    expect(sellerProblem(g)).toBe("");
  });

  it("proposes only to the courted at 10 hearts", () => {
    const g = setup("bramwell", 8, true);
    courtGift(g, "bramwell", BOUQUET);
    g.friendship.award("bramwell", 1 * HEART);
    g.inventory.add(TOKEN, 1);
    expect(courtGift(g, "bramwell", TOKEN)!.consumed).toBe(false);
    g.friendship.award("bramwell", 5 * HEART);
    expect(g.friendship.hearts("bramwell")).toBe(10);
    const day = g.day.clock.day;
    expect(courtGift(g, "bramwell", TOKEN)!.consumed).toBe(true);
    expect(g.marriage.stage).toBe("engaged");
    expect(g.marriage.weddingDay).toBe(day + 3);
  });

  it("is refused for someone who is not being courted", () => {
    const g = setup("aurelle", 10);
    g.inventory.add(TOKEN, 1);
    expect(courtGift(g, "aurelle", TOKEN)!.consumed).toBe(false);
  });
});

describe("the wedding", () => {
  const engaged = (id: string): GameState => {
    const g = setup(id, 8, true);
    g.day.clock.day = quietDay();
    courtGift(g, id, BOUQUET);
    g.friendship.award(id, 2 * HEART);
    g.inventory.add(TOKEN, 1);
    courtGift(g, id, TOKEN);
    return g;
  };

  it("goes ahead on the day, then the spouse room appears and the cap is 14", () => {
    const g = engaged("bramwell");
    expect(houseSpouse(g)).toBe(false);
    g.day.clock.day = g.marriage.weddingDay;
    g.weather = "sunny";
    expect(weddingMorning(g)).toBe("go");
    expect(finishWedding(g)).toBe(true);
    expect(g.marriage.married).toBe(true);
    expect(houseSpouse(g)).toBe(true);
    expect(holdsOf(g).has("spouse")).toBe(true);
    g.friendship.award("bramwell", 10 * HEART);
    expect(g.friendship.hearts("bramwell")).toBe(14);
    expect(g.friendship.capHearts("bramwell")).toBe(14);
  });

  it("is put off a day by rain", () => {
    const g = engaged("bramwell");
    const day = g.marriage.weddingDay;
    g.day.clock.day = day;
    g.weather = "rainy";
    expect(weddingMorning(g)).toBe("postponed");
    expect(g.marriage.weddingDay).toBe(day + 1);
    g.day.clock.day = day + 1;
    g.weather = "sunny";
    if (!festivalDayToday(day + 1)) expect(weddingMorning(g)).toBe("go");
  });

  it("keeps the points above 10 hearts across a save", () => {
    const g = engaged("bramwell");
    g.day.clock.day = g.marriage.weddingDay;
    g.weather = "sunny";
    weddingMorning(g);
    finishWedding(g);
    g.friendship.award("bramwell", 3 * HEART);
    expect(g.friendship.hearts("bramwell")).toBe(13);
    const back = deserialize(serialize(g))!;
    expect(back.friendship.hearts("bramwell")).toBe(13);
    expect(back.marriage.married).toBe(true);
  });

  it("builds a valid scene and resolves by id", () => {
    const e = weddingEvent("aurelle");
    expect(eventById(e.id)?.id).toBe("wedding-aurelle");
    expect(e.scene.some((c) => c.cmd === "say")).toBe(true);
    expect(JSON.stringify(e)).not.toContain(String.fromCharCode(0x2014));
  });
});

describe("all 14 candidates work as data", () => {
  it.each(CANDIDATES)("%s courts, engages and marries", (id) => {
    const g = setup(id, 8, true);
    g.day.clock.day = quietDay();
    expect(courtGift(g, id, BOUQUET)!.consumed).toBe(true);
    g.friendship.award(id, 2 * HEART);
    g.inventory.add(TOKEN, 1);
    expect(courtGift(g, id, TOKEN)!.consumed).toBe(true);
    g.day.clock.day = g.marriage.weddingDay;
    g.weather = "sunny";
    if (weddingMorning(g) === "go") {
      expect(finishWedding(g)).toBe(true);
      g.friendship.award(id, 10 * HEART);
      expect(g.friendship.hearts(id)).toBe(
        VILLAGERS.find((v) => v.id === id)!.heartCap,
      );
    }
  });
});

describe("heart events above 8 hearts", () => {
  it("wait for the bouquet", () => {
    const e: HeartEvent = {
      id: "t-10",
      villager: "bramwell",
      place: "hw:store",
      hearts: 10,
      scene: [{ cmd: "end" }],
    };
    const g = setup("bramwell", 8, true);
    const ctx = {
      day: quietDay(),
      weather: "sunny" as const,
      place: "hw:store",
    };
    expect(dueEvents(g, ctx, [e])).toHaveLength(0);
    courtGift(g, "bramwell", BOUQUET);
    g.friendship.award("bramwell", 2 * HEART);
    expect(dueEvents(g, ctx, [e])).toHaveLength(1);
  });
});
