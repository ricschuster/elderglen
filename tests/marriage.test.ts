import { describe, expect, it } from "vitest";
import {
  deserialize,
  newGame,
  serialize,
  SAVE_VERSION,
} from "../src/core/save";
import {
  COURT_HEARTS,
  MAX_CHILDREN,
  Marriage,
  PROPOSE_HEARTS,
  WEDDING_DELAY_DAYS,
} from "../src/core/marriage";
import { HEART } from "../src/core/friendship";
import { VILLAGERS } from "../src/core/villagers";

const court = (m: Marriage) => m.court("bramwell", COURT_HEARTS * HEART);

describe("candidates", () => {
  it("are 14 villager rows, 9 women and 5 men by note 20", () => {
    const c = VILLAGERS.filter((v) => v.candidate);
    expect(c).toHaveLength(14);
    expect(c.every((v) => v.heartCap > 10)).toBe(true);
    expect(VILLAGERS.find((v) => v.id === "odette")?.candidate).toBe(false);
  });
});

describe("stages", () => {
  it("runs none, courting, engaged, married", () => {
    const m = new Marriage();
    expect(court(m)).toBe(true);
    expect(m.stage).toBe("courting");
    expect(m.engage("bramwell", PROPOSE_HEARTS * HEART, 10)).toBe(true);
    expect(m.weddingDay).toBe(10 + WEDDING_DELAY_DAYS);
    expect(m.weddingToday(13)).toBe(true);
    expect(m.marry(12)).toBe(false);
    expect(m.marry(13)).toBe(true);
    expect(m.married).toBe(true);
    expect(m.isPartner("bramwell")).toBe(true);
  });

  it("refuses non-candidates, low hearts and a second partner", () => {
    const m = new Marriage();
    expect(m.court("odette", 99999)).toBe(false);
    expect(m.court("bramwell", COURT_HEARTS * HEART - 1)).toBe(false);
    court(m);
    expect(m.court("aurelle", 99999)).toBe(false);
    expect(m.engage("aurelle", 99999, 1)).toBe(false);
    expect(m.engage("bramwell", PROPOSE_HEARTS * HEART - 1, 1)).toBe(false);
    expect(m.marry(99)).toBe(false);
  });

  it("allows children only when married, up to the limit", () => {
    const m = new Marriage();
    expect(m.addChild()).toBeUndefined();
    court(m);
    m.engage("bramwell", 99999, 1);
    m.marry(4);
    for (let i = 0; i < MAX_CHILDREN; i++) expect(m.addChild()).toBeDefined();
    expect(m.addChild()).toBeUndefined();
  });

  it("ends cleanly and can start again", () => {
    const m = new Marriage();
    expect(m.end()).toBe(false);
    court(m);
    expect(m.end()).toBe(true);
    expect(m.save()).toEqual({
      stage: "none",
      spouse: null,
      weddingDay: 0,
      children: 0,
      kissDay: 0,
    });
    expect(m.court("aurelle", 99999)).toBe(true);
  });
});

describe("save", () => {
  it("round trips marriage state", () => {
    const g = newGame();
    court(g.marriage);
    g.marriage.engage("bramwell", 99999, 5);
    g.marriage.marry(8);
    g.marriage.addChild();
    const back = deserialize(serialize(g))!;
    expect(back.marriage.save()).toEqual({
      stage: "married",
      spouse: "bramwell",
      weddingDay: 8,
      children: 1,
      kids: [{ id: "child-1", name: "Wren", born: 0, points: 0, talkDay: 0 }],
      kissDay: 0,
    });
  });

  it("loads a version 2 save with no marriage as unmarried", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.marriage;
    raw.version = 2;
    const g = deserialize(JSON.stringify(raw))!;
    expect(g).toBeDefined();
    expect(g.marriage.stage).toBe("none");
    expect(g.marriage.spouse).toBeNull();
    expect(g.marriage.children).toBe(0);
    expect(SAVE_VERSION).toBe(3);
  });

  it("rejects versions outside the supported range and bad marriage data", () => {
    const raw = JSON.parse(serialize(newGame()));
    expect(deserialize(JSON.stringify({ ...raw, version: 1 }))).toBeUndefined();
    expect(deserialize(JSON.stringify({ ...raw, version: 4 }))).toBeUndefined();
    const bad = deserialize(
      JSON.stringify({
        ...raw,
        marriage: { stage: "married", spouse: "odette", children: 9 },
      }),
    )!;
    expect(bad.marriage.stage).toBe("none");
  });
});
