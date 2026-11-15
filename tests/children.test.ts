import "../src/core/save";
import { describe, expect, it } from "vitest";
import {
  ARRIVAL_DAYS,
  ASK_AFTER_WEDDING_DAYS,
  ASK_GAP_DAYS,
  CHILD_HEART_CAP,
  NURSERY_TIER,
  answerAsk,
  childAskDue,
  childMorning,
  childVillager,
  childWhere,
  childrenOn,
  stageOf,
  talkToChild,
} from "../src/core/children";
import {
  divorceMorning,
  divorceReportLines,
  fileDivorce,
} from "../src/core/divorce";
import { HEART, TALK_POINTS } from "../src/core/friendship";
import { DIVORCE_FEE, MAX_CHILDREN } from "../src/core/marriage";
import { reportLines } from "../src/core/report";
import {
  deserialize,
  newGame,
  serialize,
  type GameState,
} from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { meet, villagersOn } from "../src/core/townfolk";
import { resolvePlace } from "../src/core/villagers";

/** Married to Bramwell since day 3, with the nursery, on day 20. */
function family(): GameState {
  const g = newGame();
  const id = "bramwell";
  g.friendship.meet(id);
  g.friendship.setSpouse(id);
  g.friendship.award(id, 12 * HEART);
  g.friendship.giveBouquet(id);
  g.marriage.court(id, 99999);
  g.marriage.engage(id, 99999, 0);
  g.marriage.marry(3);
  g.houseTier = NURSERY_TIER;
  g.day.clock.day = 20;
  return g;
}

describe("the ask", () => {
  it("needs a marriage, the nursery, time since the wedding and a free bed", () => {
    expect(childAskDue(newGame())).toBe(false);
    const g = family();
    expect(childAskDue(g)).toBe(true);
    g.houseTier = NURSERY_TIER - 1;
    expect(childAskDue(g)).toBe(false);
    g.houseTier = NURSERY_TIER;
    g.day.clock.day = 3 + ASK_AFTER_WEDDING_DAYS - 1;
    expect(childAskDue(g)).toBe(false);
    g.day.clock.day = 3 + ASK_AFTER_WEDDING_DAYS;
    expect(childAskDue(g)).toBe(true);
  });

  it("a not now only waits, and is never pressed", () => {
    const g = family();
    expect(answerAsk(g, false, "Bramwell")).not.toBe("");
    expect(g.marriage.childDue).toBe(0);
    expect(childAskDue(g)).toBe(false);
    g.day.clock.day += ASK_GAP_DAYS - 1;
    expect(childAskDue(g)).toBe(false);
    g.day.clock.day += 1;
    expect(childAskDue(g)).toBe(true);
    // No ask, no answer.
    g.marriage.askDay = g.day.clock.day;
    expect(answerAsk(g, true, "Bramwell")).toBe("");
  });

  it("a yes brings a child after a few days, then stops at the limit", () => {
    const g = family();
    answerAsk(g, true, "Bramwell");
    expect(g.marriage.childDue).toBe(20 + ARRIVAL_DAYS);
    expect(childAskDue(g)).toBe(false);
    g.day.clock.day = 20 + ARRIVAL_DAYS - 1;
    expect(childMorning(g)).toBeUndefined();
    g.day.clock.day = 20 + ARRIVAL_DAYS;
    expect(childMorning(g)?.name).toBe("Wren");
    expect(g.marriage.children).toBe(1);
    for (let i = 1; i < MAX_CHILDREN; i++) g.marriage.addChild(g.day.clock.day);
    g.day.clock.day += 30;
    expect(childAskDue(g)).toBe(false);
    expect(MAX_CHILDREN).toBe(2);
  });

  it("is put from sleep() and the arrival reaches the report", () => {
    const g = family();
    g.day.clock.day = 19;
    const r = sleep(g, [], () => 0.99);
    expect(r.childAsk).toBe(true);
    answerAsk(g, true, "Bramwell");
    g.day.clock.day = g.marriage.childDue - 1;
    const r2 = sleep(g, [], () => 0.99);
    expect(r2.child?.name).toBe("Wren");
    expect(r2.childAsk).toBeUndefined();
    expect(reportLines(r2).join("\n")).toMatch(/Wren/);
  });
});

describe("the child", () => {
  it("grows from baby to toddler to child", () => {
    const g = family();
    const c = g.marriage.addChild(20)!;
    expect(stageOf(c, 20)).toBe("baby");
    expect(stageOf(c, 34)).toBe("toddler");
    expect(stageOf(c, 62)).toBe("child");
  });

  it("walks the nursery and the kitchen by the clock, from data", () => {
    const g = family();
    const c = g.marriage.addChild(20)!;
    // A baby is in the crib all day.
    const crib = childWhere(g, c, 21, 12 * 60);
    expect(crib.where).toEqual(resolvePlace("farm:house/child-crib"));
    // A child eats in the kitchen at noon and plays in the nursery after.
    const day = 20 + 42;
    expect(childWhere(g, c, day, 12 * 60 + 5).place).toBe(
      "farm:house/spouse-kitchen",
    );
    expect(childWhere(g, c, day, 14 * 60).place).toBe("farm:house/nursery-1");
    expect(childWhere(g, c, day, 23 * 60).asleep).toBe(true);
    expect(childVillager(c, day).home).toBe("farm:house/child-bed-1");
    const kid2 = g.marriage.addChild(20)!;
    expect(childVillager(kid2, day).home).toBe("farm:house/child-bed-2");
  });

  it("shows in the villager list on the house map, not before the nursery", () => {
    const g = family();
    g.marriage.addChild(20);
    const day = 21;
    const here = villagersOn(g, "house", day, 12 * 60).filter((p) =>
      p.id.startsWith("child-"),
    );
    expect(here).toHaveLength(1);
    expect(
      villagersOn(g, "farm", day, 12 * 60).some((p) => p.id === "child-1"),
    ).toBe(false);
    expect(childrenOn({ ...g, houseTier: 1 }, "house", day, 12 * 60)).toEqual(
      [],
    );
  });

  it("talks once a day for a small heart gain, up to a cap", () => {
    const g = family();
    g.marriage.addChild(20);
    const first = meet(g, "child-1", undefined);
    expect(first.message).toMatch(/Wren/);
    expect(g.marriage.kids[0]!.points).toBe(TALK_POINTS);
    expect(talkToChild(g, "child-1").gained).toBe(false);
    expect(g.marriage.kids[0]!.points).toBe(TALK_POINTS);
    g.marriage.kids[0]!.points = CHILD_HEART_CAP * HEART;
    g.day.clock.day += 1;
    expect(talkToChild(g, "child-1").gained).toBe(true);
    expect(g.marriage.kids[0]!.points).toBe(CHILD_HEART_CAP * HEART);
    expect(talkToChild(g, "nobody").message).toBe("");
  });
});

describe("divorce and the save", () => {
  it("the children stay with the player after a divorce", () => {
    const g = family();
    g.marriage.addChild(20);
    g.marriage.kids[0]!.points = 3 * HEART;
    g.money = DIVORCE_FEE;
    expect(fileDivorce(g)).toBe(true);
    const news = divorceMorning(g)!;
    expect(news.children).toBe(1);
    expect(g.marriage.stage).toBe("none");
    expect(g.marriage.children).toBe(1);
    expect(g.marriage.kids[0]!.points).toBe(3 * HEART);
    expect(divorceReportLines(news).join(" ")).toMatch(/children stay/);
    const back = deserialize(serialize(g))!;
    expect(back.marriage.children).toBe(1);
    expect(back.marriage.kids[0]!.points).toBe(3 * HEART);
    // No new children without a marriage.
    expect(childAskDue(back)).toBe(false);
    // A child on the way does not arrive after a divorce.
    expect(back.marriage.childDue).toBe(0);
  });

  it("round trips the child state, and an old count loads as placeholders", () => {
    const g = family();
    g.marriage.addChild(20, "Ash");
    g.marriage.askDay = 20;
    g.marriage.childDue = 25;
    const back = deserialize(serialize(g))!;
    expect(back.marriage.kids).toEqual(g.marriage.kids);
    expect(back.marriage.askDay).toBe(20);
    expect(back.marriage.childDue).toBe(25);
    const raw = JSON.parse(serialize(family()));
    raw.marriage.children = 2;
    delete raw.marriage.kids;
    const old = deserialize(JSON.stringify(raw))!;
    expect(old.marriage.kids.map((k) => k.id)).toEqual(["child-1", "child-2"]);
    raw.marriage.children = 9;
    expect(deserialize(JSON.stringify(raw))!.marriage.children).toBe(2);
    raw.marriage.kids = [
      { id: "child-7" },
      { id: "child-1" },
      { id: "child-1" },
      5,
    ];
    expect(deserialize(JSON.stringify(raw))!.marriage.kids).toHaveLength(1);
  });
});
