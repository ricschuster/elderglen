import { describe, expect, it } from "vitest";
import data from "../src/content/friendship.json";
import { itemById } from "../src/core/items";
import { newGame, serialize, deserialize } from "../src/core/save";
import {
  Friendship,
  HEART,
  giftPoints,
  hasOwnList,
  heartCap,
  isBirthday,
  listedEntries,
  tagsOf,
  tasteOf,
  weekOf,
} from "../src/core/friendship";
import { VILLAGERS } from "../src/core/villagers";

// Day 1 is Mon spring 1. Tilda (carpenter) has a fall 4 birthday: day 56 + 4 = 60.
const TILDA_BDAY = 2 * 28 + 4;
const met = (id = "odette") => {
  const f = new Friendship();
  f.meet(id);
  return f;
};

describe("taste", () => {
  it("uses the personal item list first", () => {
    expect(tasteOf("tilda", "copper-bar")).toBe("love");
    expect(tasteOf("tilda", "tomato")).toBe("like");
    expect(tasteOf("tilda", "dandelion")).toBe("hate");
    expect(tasteOf("odette", "grape")).toBe("neutral");
  });
  it("uses personal tags, then universal tags", () => {
    expect(tasteOf("odette", "carrot")).toBe("neutral");
    expect(tasteOf("odette", "kale")).toBe("like"); // all vegetables
    expect(tasteOf("odette", "melon-jam")).toBe("love"); // #jam
    expect(tasteOf("odette", "hazelnut")).toBe("dislike"); // all forage
    expect(tasteOf("tilda", "melon-wine")).toBe("dislike");
    expect(tasteOf("aurelle", "mead")).toBe("dislike"); // all alcohol
    expect(tasteOf("aurelle", "melon-wine")).toBe("dislike");
    expect(tasteOf("hattie", "cheese")).toBe("love");
    expect(tasteOf("hattie", "goat-cheese")).toBe("like");
  });
  it("falls to universal categories, then neutral", () => {
    expect(tasteOf("dunmar", "tomato")).toBe("like");
    expect(tasteOf("dunmar", "melon-jam")).toBe("like");
    expect(tasteOf("dunmar", "fried-egg")).toBe("like");
    expect(tasteOf("dunmar", "daffodil")).toBe("like");
    expect(tasteOf("dunmar", "river-garnet")).toBe("like");
    expect(tasteOf("dunmar", "milk")).toBe("neutral");
    expect(tasteOf("dunmar", "perch")).toBe("neutral");
  });
  it("applies the universal loves and hates, with named items beating personal tags", () => {
    expect(tasteOf("odette", "truffle-oil")).toBe("love");
    expect(tasteOf("dunmar", "hearthwell-carp")).toBe("love");
    expect(tasteOf("dunmar", "carp")).toBe("hate");
    expect(tasteOf("dunmar", "plain-bait")).toBe("hate");
    expect(tasteOf("dunmar", "gloop-jelly")).toBe("hate");
    expect(tasteOf("dunmar", "old-boot")).toBe("hate");
    expect(tasteOf("dunmar", "copper-ore")).toBe("hate");
    expect(tasteOf("dunmar", "oil")).toBe("dislike");
    expect(tasteOf("aurelle", "truffle-oil")).toBe("love");
  });
  it("ignores quality in the lookup", () => {
    expect(tasteOf("tilda", "tomato@gold")).toBe("like");
    expect(tagsOf("kale@silver")).toContain("vegetable");
  });
  it("scores gifts, quality lifting love and like only", () => {
    expect(giftPoints("love")).toBe(80);
    expect(giftPoints("like")).toBe(45);
    expect(giftPoints("neutral")).toBe(20);
    expect(giftPoints("dislike")).toBe(-20);
    expect(giftPoints("hate")).toBe(-40);
    expect(giftPoints("like", "silver")).toBe(49);
    expect(giftPoints("like", "gold")).toBe(56);
    expect(giftPoints("love", "gold")).toBe(100);
    expect(giftPoints("neutral", "gold")).toBe(20);
    expect(giftPoints("hate", "gold")).toBe(-40);
    // A normal love still beats a top quality like.
    expect(giftPoints("love")).toBeGreaterThan(giftPoints("like", "gold"));
  });
});

describe("data", () => {
  it("has a list for the first eight and a marked placeholder for the rest", () => {
    const own = VILLAGERS.filter((v) => hasOwnList(v.id));
    expect(own.map((v) => v.id).sort()).toEqual([
      "alder",
      "aurelle",
      "cordelia",
      "cuthbert",
      "dilly",
      "hattie",
      "odette",
      "tilda",
    ]);
    expect(data.defaultList._note).toMatch(/PLACEHOLDER/);
  });
  it("names only known tags, and unbuilt items from an allow list", () => {
    const tags = new Set([
      "jam",
      "pickles",
      "wine",
      "juice",
      "dried",
      "honey",
      "mead",
      "cheese",
      "mayonnaise",
      "cloth",
      "oil",
      "dye",
      "alcohol",
      "artisan",
      "dish",
      "vegetable",
      "fruit",
      "flower",
      "gem",
      "mineral",
      "forage",
      "egg",
      "milk",
      "bait",
      "monster-drop",
      "trash",
      "found",
    ]);
    const unbuilt = new Set<string>();
    for (const e of listedEntries()) {
      if (e.startsWith("#")) expect(tags.has(e.slice(1)), e).toBe(true);
      else if (!itemById(e)) unbuilt.add(e);
    }
    expect([...unbuilt].sort()).toEqual(["flower-honey", "smoked-fish"]);
  });
  it("gives every villager a birthday that isBirthday finds once a year", () => {
    for (const v of VILLAGERS) {
      const days = Array.from({ length: 112 }, (_, i) => i + 1).filter((d) =>
        isBirthday(v.id, d),
      );
      expect(days.length).toBe(1);
    }
    expect(isBirthday("tilda", TILDA_BDAY)).toBe(true);
    expect(isBirthday("tilda", TILDA_BDAY + 112)).toBe(true);
  });
});

describe("talking", () => {
  it("is +20 once a day and meets the person", () => {
    const f = new Friendship();
    expect(f.met("odette")).toBe(false);
    expect(f.talk("odette", 1)).toEqual({ ok: true, points: 20 });
    expect(f.met("odette")).toBe(true);
    expect(f.talk("odette", 1)).toEqual({ ok: false, reason: "already" });
    expect(f.talk("odette", 2)).toEqual({ ok: true, points: 20 });
    expect(f.points("odette")).toBe(40);
    expect(f.talk("nobody", 1)).toEqual({ ok: false, reason: "unknown" });
  });
  it("never decays", () => {
    const f = new Friendship();
    f.talk("odette", 1);
    f.startDay(500);
    expect(f.points("odette")).toBe(20);
  });
  it("stops at the cap and counts hearts", () => {
    const f = new Friendship();
    for (let d = 1; d <= 200; d++) f.talk("odette", d);
    expect(f.points("odette")).toBe(10 * HEART);
    expect(f.hearts("odette")).toBe(10);
  });
});

describe("gifts", () => {
  it("needs the person met", () => {
    const f = new Friendship();
    expect(f.gift("odette", "melon", 1)).toEqual({
      ok: false,
      reason: "unmet",
    });
    expect(f.gift("nobody", "melon", 1)).toEqual({
      ok: false,
      reason: "unknown",
    });
  });
  it("is one a day and two a week, the week starting Monday", () => {
    const f = met();
    expect(f.gift("odette", "melon", 1)).toMatchObject({
      ok: true,
      taste: "love",
      points: 80,
    });
    expect(f.gift("odette", "melon", 1)).toEqual({
      ok: false,
      reason: "today",
    });
    expect(f.gift("odette", "tomato", 2)).toMatchObject({
      ok: true,
      taste: "like",
    });
    expect(f.gift("odette", "tomato", 3)).toEqual({
      ok: false,
      reason: "week",
    });
    expect(f.canGift("odette", 7)).toBe(false);
    expect(f.canGift("odette", 8)).toBe(true);
    expect(weekOf(7)).toBe(0);
    expect(weekOf(8)).toBe(1);
  });
  it("pays +10 next week for two gifts, not for one", () => {
    const f = met();
    f.gift("odette", "carrot", 1);
    f.gift("odette", "carrot", 2);
    expect(f.points("odette")).toBe(40);
    f.startDay(8);
    expect(f.points("odette")).toBe(50);
    f.gift("odette", "carrot", 8);
    f.startDay(15);
    expect(f.points("odette")).toBe(70); // 50 + 20, no bonus for one gift
    f.startDay(15);
    expect(f.points("odette")).toBe(70);
  });
  it("pays the bonus lazily when no morning call happens", () => {
    const f = met();
    f.gift("odette", "carrot", 1);
    f.gift("odette", "carrot", 2);
    f.gift("odette", "carrot", 8);
    expect(f.points("odette")).toBe(40 + 10 + 20);
  });
  it("costs points for bad gifts but never below zero", () => {
    const f = met("tilda");
    f.talk("tilda", 1);
    expect(f.gift("tilda", "dandelion", 1)).toMatchObject({
      taste: "hate",
      points: -20,
    });
    expect(f.points("tilda")).toBe(0);
    f.talk("tilda", 2);
    f.talk("tilda", 3);
    expect(f.gift("tilda", "melon-jam", 3)).toMatchObject({
      taste: "dislike",
      points: -20,
    });
    expect(f.points("tilda")).toBe(20);
  });
  it("applies quality to liked gifts", () => {
    const f = met("tilda");
    expect(f.gift("tilda", "tomato@gold", 1)).toMatchObject({ points: 56 });
  });
  it("multiplies by 8 on the birthday, always allowed, not counted", () => {
    const f = met("tilda");
    f.gift("tilda", "wood", 1);
    f.gift("tilda", "wood", 2);
    expect(f.gift("tilda", "wood", 3)).toEqual({ ok: false, reason: "week" });
    const day = TILDA_BDAY; // Tue? any: a new week from day 3 so use a day in week 8
    const g = met("tilda");
    // Fill the week, then the birthday still works.
    const base = Math.floor((day - 1) / 7) * 7 + 1;
    for (let d = base; d < day && d < base + 2; d++) g.gift("tilda", "wood", d);
    const r = g.gift("tilda", "tomato", day);
    expect(r).toMatchObject({ ok: true, birthday: true, taste: "like" });
    expect(r.ok && r.points).toBe(360);
    // Another day gift is blocked, and a birthday gift did not use the week.
    expect(g.gift("tilda", "wood", day)).toEqual({
      ok: false,
      reason: "today",
    });
  });
  it("lets a hate cost 320 on a birthday", () => {
    const f = met("tilda");
    for (let d = 1; d <= 30; d++) f.talk("tilda", d);
    for (let d = 31; d <= 60; d++) f.talk("tilda", d);
    const before = f.points("tilda");
    const r = f.gift("tilda", "dandelion", TILDA_BDAY);
    expect(r.ok && r.points).toBe(-320);
    expect(f.points("tilda")).toBe(before - 320);
  });
  it("keeps a gift log, first reaction per item", () => {
    const f = met("tilda");
    f.gift("tilda", "tomato", 1);
    f.gift("tilda", "wood@gold", 2);
    expect(f.giftLog("tilda")).toEqual({ tomato: "like", wood: "love" });
  });
});

describe("caps and extras", () => {
  it("stops a candidate at 8 hearts until the bouquet", () => {
    expect(heartCap("aurelle", false)).toBe(8);
    expect(heartCap("aurelle", true)).toBe(10);
    expect(heartCap("odette", false)).toBe(10);
    const f = new Friendship();
    for (let d = 1; d <= 150; d++) f.talk("aurelle", d);
    expect(f.hearts("aurelle")).toBe(8);
    expect(f.giveBouquet("odette")).toBe(false);
    expect(f.giveBouquet("aurelle")).toBe(true);
    expect(f.giveBouquet("aurelle")).toBe(false);
    for (let d = 151; d <= 300; d++) f.talk("aurelle", d);
    expect(f.hearts("aurelle")).toBe(10);
  });
  it("needs 8 hearts for the bouquet", () => {
    const f = met("aurelle");
    expect(f.giveBouquet("aurelle")).toBe(false);
  });
  it("pays requests and the Guests' Board bonus to met non-candidates", () => {
    const f = new Friendship();
    f.meet("odette");
    f.meet("aurelle");
    expect(f.requestDone("odette")).toBe(150);
    expect(f.bundleBonus()).toEqual(["odette"]);
    expect(f.points("odette")).toBe(650);
    expect(f.met("hattie")).toBe(false);
    expect(f.points("hattie")).toBe(0);
  });
});

describe("save", () => {
  it("round-trips", () => {
    const f = met("tilda");
    f.talk("tilda", 1);
    f.gift("tilda", "tomato", 1);
    const g = new Friendship();
    g.load(JSON.parse(JSON.stringify(f.save())));
    expect(g.save()).toEqual(f.save());
    expect(g.points("tilda")).toBe(65);
    expect(g.gift("tilda", "wood", 1)).toEqual({ ok: false, reason: "today" });
  });
  it("loads defaults from nothing and drops bad rows", () => {
    const g = new Friendship();
    g.load(undefined);
    expect(g.points("tilda")).toBe(0);
    g.load({
      ghost: { points: 99 },
      tilda: { points: -5, log: { x: "wow", tomato: "like" }, bouquet: true },
      odette: { points: 99999, met: true },
      hattie: "no",
    });
    expect(g.points("tilda")).toBe(0);
    expect(g.giftLog("tilda")).toEqual({ tomato: "like" });
    expect(g.hasBouquet("tilda")).toBe(false);
    expect(g.points("odette")).toBe(2500);
  });
  it("persists in the game save and an old save loads without it", () => {
    const g = newGame();
    g.friendship.talk("tilda", 1);
    const text = serialize(g);
    expect(deserialize(text)!.friendship.points("tilda")).toBe(20);
    const old = JSON.parse(text);
    delete old.friendship;
    const loaded = deserialize(JSON.stringify(old))!;
    expect(loaded.friendship.points("tilda")).toBe(0);
    expect(loaded.friendship.met("tilda")).toBe(false);
  });
});
