import { describe, expect, it } from "vitest";
import { newGame, serialize, deserialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import {
  birthdaysOn,
  heartText,
  meet,
  presentAt,
  shopNote,
  villagersOn,
} from "../src/core/townfolk";
import { HEART, POINTS } from "../src/core/friendship";

const at = (h: number, m = 0) => h * 60 + m;
// Day 1 is Mon spring 1.
const MON = 1;
const WED = 3;

describe("villagersOn", () => {
  it("puts Odette at her counter mid morning and not on another map", () => {
    const g = newGame();
    const list = villagersOn(g, "general-store", MON, at(10));
    const odette = list.find((p) => p.id === "odette");
    expect(odette).toMatchObject({ x: 5, y: 4 });
    expect(
      villagersOn(g, "healer", MON, at(10)).some((p) => p.id === "odette"),
    ).toBe(false);
  });

  it("moves her to the inn in the evening", () => {
    const g = newGame();
    expect(
      villagersOn(g, "inn", MON, at(19)).some((p) => p.id === "odette"),
    ).toBe(true);
    expect(
      villagersOn(g, "general-store", MON, at(19)).some(
        (p) => p.id === "odette",
      ),
    ).toBe(false);
  });

  it("lists nobody asleep", () => {
    const g = newGame();
    for (const m of ["general-store", "hearthwell"])
      expect(
        villagersOn(g, m, MON, at(25)).some((p) => p.id === "odette"),
      ).toBe(false);
  });

  it("finds a person by tile", () => {
    const g = newGame();
    const list = villagersOn(g, "general-store", MON, at(10));
    expect(presentAt(list, 5, 4)?.id).toBe("odette");
    expect(presentAt(list, 0, 0)).toBeUndefined();
  });
});

describe("meet", () => {
  it("the first meeting is a talk that meets them", () => {
    const g = newGame();
    const r = meet(g, "odette", undefined);
    expect(g.friendship.met("odette")).toBe(true);
    expect(g.friendship.points("odette")).toBe(20);
    expect(r.message).toContain("Odette");
    expect(r.message).toContain("(0 hearts)");
  });

  it("talks once a day then says there is nothing new", () => {
    const g = newGame();
    meet(g, "odette", undefined);
    const again = meet(g, "odette", undefined);
    expect(g.friendship.points("odette")).toBe(20);
    expect(again.message).toContain("nothing new");
  });

  it("gives the held item once met and takes it from the pack", () => {
    const g = newGame();
    g.inventory.add("copper-bar", 2);
    meet(g, "tilda", undefined);
    const r = meet(g, "tilda", "copper-bar");
    expect(r.consumed).toBe("copper-bar");
    expect(g.inventory.count("copper-bar")).toBe(1);
    expect(g.friendship.points("tilda")).toBeGreaterThan(20);
    expect(r.message).toContain("wonderful");
  });

  it("does not give a second gift the same day and keeps the item", () => {
    const g = newGame();
    g.inventory.add("copper-bar", 2);
    meet(g, "tilda", undefined);
    meet(g, "tilda", "copper-bar");
    const r = meet(g, "tilda", "copper-bar");
    expect(r.consumed).toBeUndefined();
    expect(g.inventory.count("copper-bar")).toBe(1);
  });

  it("does not take an item that is not in the pack", () => {
    const g = newGame();
    meet(g, "tilda", undefined);
    const r = meet(g, "tilda", "copper-bar");
    expect(r.consumed).toBeUndefined();
  });

  it("mentions a birthday", () => {
    const g = newGame();
    g.day.clock.day = 2 * 28 + 4; // fall 4, Tilda
    expect(meet(g, "tilda", undefined).message).toContain("birthday");
    expect(birthdaysOn(2 * 28 + 4)).toContain("Tilda");
  });
});

describe("hearts and shop notes", () => {
  it("counts hearts", () => {
    expect(heartText(0)).toBe("0 hearts");
    expect(heartText(HEART)).toBe("1 heart");
    expect(heartText(HEART * 3 + 5)).toBe("3 hearts");
  });

  it("notes a closed shop and says nothing when open", () => {
    const g = newGame();
    expect(shopNote(g, "odette", MON, at(10))).toBe("");
    expect(shopNote(g, "odette", MON, at(5))).toContain("closed");
    expect(shopNote(g, "odette", WED, at(10))).toContain("closed");
    expect(shopNote(g, "dorrie", MON, at(10))).toBe("");
  });
});

describe("morning rollover", () => {
  it("pays the weekly gift bonus when a new week starts", () => {
    const g = newGame();
    g.friendship.meet("tilda");
    g.day.clock.day = 7; // the last day of week 0
    g.friendship.gift("tilda", "copper-bar", 5);
    g.friendship.gift("tilda", "iron-bar", 6);
    const before = g.friendship.points("tilda");
    sleep(g, [], () => 0.99);
    expect(g.day.clock.day).toBe(8);
    expect(g.friendship.points("tilda")).toBe(before + POINTS.weeklyBonus);
  });

  it("loads an old save with no friendship field", () => {
    const g = newGame();
    const raw = JSON.parse(serialize(g));
    delete raw.friendship;
    const back = deserialize(JSON.stringify(raw));
    expect(back).toBeDefined();
    expect(back!.friendship.points("odette")).toBe(0);
    sleep(back!, [], () => 0.99);
  });
});

describe("villagersOn on a festival day (note 82)", () => {
  const PARADE_DAY = 10; // Spring 10
  const hmap = "hearthwell";
  it("stands everyone at their festival spot at 12:00", () => {
    const g = newGame();
    const list = villagersOn(g, hmap, PARADE_DAY, at(12));
    expect(list.length).toBeGreaterThanOrEqual(20);
    expect(list.every((p) => !p.marching)).toBe(true);
  });
  it("walks marchers during the march, in line order along the out lane", () => {
    const g = newGame();
    const list = villagersOn(g, hmap, PARADE_DAY, 14 * 60 + 5);
    const marching = list.filter((p) => p.marching);
    expect(marching.length).toBeGreaterThan(3);
    const head = list.find((p) => p.id === "cuthbert")!;
    const tail = list.find((p) => p.id === "fitch")!;
    expect(head.x).toBeLessThanOrEqual(tail.x);
  });
  it("gives the normal route on a plain day", () => {
    const g = newGame();
    expect(villagersOn(g, hmap, 3, 14 * 60 + 5).some((p) => p.marching)).toBe(
      false,
    );
  });
});
