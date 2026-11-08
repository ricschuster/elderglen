import { describe, expect, it } from "vitest";
import { forage as forageAt } from "../src/core/actions";
import { checkAchievements } from "../src/core/achievements";
import { dateOf } from "../src/core/calendar";
import { FORAGE } from "../src/core/forage";
import { itemById } from "../src/core/items";
import { deliverAll, openLetter } from "../src/core/mail";
import {
  DELIVERY_MULTIPLIER,
  FIRST_REQUEST_DAY,
  REQUEST_POOLS,
  Quests,
  endDayQuests,
  noteGathered,
  requestFor,
  turnIn,
  type Quest,
} from "../src/core/quests";
import { deserialize, newGame, serialize } from "../src/core/save";

const dash = String.fromCharCode(0x2014);

/** The first day from `from` that posts a request of a type. */
function dayWith(type: Quest["type"], from = FIRST_REQUEST_DAY): number {
  for (let d = from; d < from + 400; d++)
    if (requestFor(d)?.type === type) return d;
  throw new Error("no such day");
}

describe("request content", () => {
  it("names real items and has sane ranges and no em dashes", () => {
    expect(JSON.stringify(REQUEST_POOLS)).not.toContain(dash);
    for (const pools of Object.values(REQUEST_POOLS))
      for (const s of pools) {
        expect(s.min).toBeGreaterThanOrEqual(1);
        expect(s.max).toBeGreaterThanOrEqual(s.min);
        if (s.from === "items")
          for (const id of s.ids ?? []) expect(itemById(id), id).toBeDefined();
      }
  });
});

describe("the daily draw", () => {
  it("never posts on day 1 and is the same on every call", () => {
    expect(requestFor(1)).toBeUndefined();
    for (let d = 2; d < 120; d++) expect(requestFor(d)).toEqual(requestFor(d));
  });

  it("posts on most days but not all, with 2 days to finish", () => {
    const days = Array.from({ length: 200 }, (_, i) => requestFor(i + 2));
    const posted = days.filter((q) => q !== undefined) as Quest[];
    expect(posted.length).toBeGreaterThan(100);
    expect(posted.length).toBeLessThan(200);
    for (const q of posted) expect(q.deadline).toBe(q.posted + 1);
  });

  it("only asks for what the season offers", () => {
    for (let d = 2; d < 400; d++) {
      const q = requestFor(d);
      if (!q) continue;
      const { season } = dateOf(d);
      const f = FORAGE.find((x) => x.id === q.want.item);
      if (f) {
        expect(f.seasons, `${d} ${f.id}`).toContain(season);
        expect(f.rare).toBeFalsy();
      }
      expect(q.want.count).toBeGreaterThanOrEqual(1);
    }
  });

  it("pays a delivery three times the normal sell price", () => {
    const d = dayWith("delivery");
    const q = requestFor(d)!;
    expect(q.reward.gold).toBe(
      itemById(q.want.item)!.sellPrice * q.want.count * DELIVERY_MULTIPLIER,
    );
  });
});

describe("the board", () => {
  it("offers today's and yesterday's request until taken, with no cap", () => {
    const d = dayWith("delivery");
    const g = newGame();
    const todays = g.quests.posted(d).map((q) => q.id);
    expect(todays).toContain(`board-${d}`);
    expect(g.quests.accept(`board-${d}`, d)).toBeDefined();
    expect(g.quests.posted(d).map((q) => q.id)).not.toContain(`board-${d}`);
    expect(g.quests.accept(`board-${d}`, d)).toBeUndefined();
    // Still on offer the next day if never taken.
    const other = newGame();
    expect(other.quests.posted(d + 1).map((q) => q.id)).toContain(`board-${d}`);
    expect(other.quests.posted(d + 2).map((q) => q.id)).not.toContain(
      `board-${d}`,
    );
  });

  it("hands in a delivery for gold, takes the goods and counts it", () => {
    const d = dayWith("delivery");
    const g = newGame();
    const q = g.quests.accept(`board-${d}`, d)!;
    expect(turnIn(g, q.id, d)).toMatchObject({ ok: false });
    g.inventory.add(q.want.item, q.want.count + 1);
    const money = g.money;
    const r = turnIn(g, q.id, d);
    expect(r).toEqual({ ok: true, gold: q.reward.gold });
    expect(g.money).toBe(money + q.reward.gold);
    expect(g.inventory.count(q.want.item)).toBe(1);
    expect(g.quests.completed).toBe(1);
    expect(g.quests.open()).toEqual([]);
    expect(turnIn(g, q.id, d)).toMatchObject({ ok: false });
  });

  it("takes the lowest quality first when handing in", () => {
    const d = dayWith("delivery");
    const g = newGame();
    const q = g.quests.accept(`board-${d}`, d)!;
    g.inventory.add(`${q.want.item}@gold`, 1);
    g.inventory.add(q.want.item, q.want.count - 1);
    expect(turnIn(g, q.id, d).ok).toBe(true);
    expect(g.inventory.count(`${q.want.item}@gold`)).toBe(0);
  });

  it("counts a gathering only from acceptance, and pays when the counter is met", () => {
    const d = dayWith("gathering");
    const g = newGame();
    const id = requestFor(d)!.want.item;
    const n = requestFor(d)!.want.count;
    g.day.clock.day = d;
    g.inventory.add(id, 500);
    noteGathered(g, id, 5);
    const q = g.quests.accept(`board-${d}`, d)!;
    expect(q.progress).toBe(0);
    expect(turnIn(g, q.id, d)).toMatchObject({ ok: false });
    noteGathered(g, `${id}@silver`, n - 1);
    noteGathered(g, "not-the-item", 99);
    expect(q.progress).toBe(n - 1);
    expect(turnIn(g, q.id, d).ok).toBe(false);
    noteGathered(g, id, 1);
    const money = g.money;
    expect(turnIn(g, q.id, d).ok).toBe(true);
    expect(g.money).toBe(money + q.reward.gold);
    // Gathering keeps the goods.
    expect(g.inventory.count(id)).toBe(500);
  });

  it("counts real forage through the action", () => {
    const g = newGame();
    const d = dayWith("gathering");
    g.day.clock.day = d;
    const q = requestFor(d)!;
    const f = FORAGE.find((x) => x.id === q.want.item);
    if (!f) return;
    g.quests.accept(q.id, d);
    g.forage.respawn(dateOf(d).season, [{ x: 1, y: 1 }], () => 0);
    const id = g.forage.itemAt(1, 1);
    if (id === q.want.item) {
      forageAt(g, 1, 1, () => 0.99);
      expect(g.quests.get(q.id)!.progress).toBe(1);
    }
  });

  it("lapses an open request after its last day and cancels at no cost", () => {
    const d = dayWith("delivery");
    const g = newGame();
    const q = g.quests.accept(`board-${d}`, d)!;
    expect(endDayQuests(g, d + 1)).toEqual([]);
    expect(q.state).toBe("open");
    const lines = endDayQuests(g, d + 2);
    expect(lines).toHaveLength(1);
    expect(q.state).toBe("lapsed");
    expect(g.quests.open()).toEqual([]);
    expect(g.quests.completed).toBe(0);
    const e = dayWith("gathering", d + 10);
    const t = g.quests.accept(`board-${e}`, e)!;
    expect(g.quests.cancel(t.id)).toBe(true);
    expect(g.quests.cancel(t.id)).toBe(false);
    expect(g.quests.posted(e).map((x) => x.id)).not.toContain(t.id);
  });
});

describe("saving", () => {
  it("round trips open requests, progress and the count", () => {
    const d = dayWith("gathering");
    const g = newGame();
    g.day.clock.day = d;
    const q = g.quests.accept(`board-${d}`, d)!;
    noteGathered(g, q.want.item, 2);
    g.quests.completed = 7;
    const back = deserialize(serialize(g))!;
    expect(back.quests.completed).toBe(7);
    expect(back.quests.open()).toEqual([{ ...q, progress: 2 }]);
  });

  it("loads an old save with no quests field, and ignores junk", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.quests;
    const old = deserialize(JSON.stringify(raw))!;
    expect(old.quests.open()).toEqual([]);
    expect(old.quests.completed).toBe(0);
    const bad = new Quests();
    bad.load({ log: [{ id: 1 }, null, "x"], completed: -3 });
    expect(bad.open()).toEqual([]);
    expect(bad.completed).toBe(0);
  });
});

describe("the errand achievements", () => {
  it("earn the hats at 10 and 40 requests and send their letters", () => {
    const g = newGame();
    g.quests.completed = 9;
    expect(checkAchievements(g)).toEqual([]);
    g.quests.completed = 10;
    expect(checkAchievements(g).map((a) => a.hat.id)).toEqual(["spotted-bow"]);
    g.quests.completed = 40;
    expect(checkAchievements(g).map((a) => a.hat.id)).toEqual(["hen-mask"]);
    expect(deliverAll(g, 5)).toBeGreaterThanOrEqual(2);
    const money = g.money;
    openLetter(g, "errand-letter-10");
    expect(g.money).toBe(money + 500);
    openLetter(g, "errand-letter-40");
    expect(g.money).toBe(money + 3000);
  });
});
