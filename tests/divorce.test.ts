import { describe, expect, it } from "vitest";
import {
  attendsWedding,
  cancelDivorce,
  divorceMorning,
  divorceProblem,
  fileDivorce,
  isEx,
  weddingGuests,
} from "../src/core/divorce";
import { weddingEvent } from "../src/core/courtship";
import { exVisitVillager, exVisitor } from "../src/core/exvisit";
import { BOUQUET, courtGift } from "../src/core/courtship";
import { HEART } from "../src/core/friendship";
import {
  DIVORCE_CHEST_HOLD,
  DIVORCE_CHEST_TILE,
  HOUSE_MAP,
  spouseRoomArea,
} from "../src/core/house";
import { DIVORCE_FEE } from "../src/core/marriage";
import {
  deserialize,
  newGame,
  serialize,
  type GameState,
} from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { spouseId } from "../src/core/spouse";
import { reportLines } from "../src/core/report";
import { maps } from "../src/content/maps";
import { VILLAGERS } from "../src/core/villagers";
import { holdsOf } from "../src/core/worldflags";

/** Married to Bramwell at 12 hearts with plenty of coin. */
function married(): GameState {
  const g = newGame();
  const id = "bramwell";
  g.friendship.meet(id);
  g.friendship.setSpouse(id);
  g.friendship.award(id, 12 * HEART);
  g.friendship.giveBouquet(id);
  g.marriage.court(id, 99999);
  g.marriage.engage(id, 99999, 0);
  g.marriage.marry(3);
  g.day.clock.day = 10;
  g.money = DIVORCE_FEE + 1000;
  return g;
}

describe("filing and cancelling", () => {
  it("costs the fee, only when married, and only once", () => {
    expect(divorceProblem(newGame())).not.toBe("");
    const g = married();
    g.money = DIVORCE_FEE - 1;
    expect(divorceProblem(g)).toMatch(/1g more/);
    expect(fileDivorce(g)).toBe(false);
    g.money = DIVORCE_FEE + 5;
    expect(fileDivorce(g)).toBe(true);
    expect(g.money).toBe(5);
    expect(g.marriage.divorcing).toBe(true);
    expect(fileDivorce(g)).toBe(false);
  });

  it("can be cancelled before the day ends, and the fee comes back", () => {
    const g = married();
    const before = g.money;
    fileDivorce(g);
    expect(cancelDivorce(g)).toBe(true);
    expect(g.money).toBe(before);
    expect(g.marriage.married).toBe(true);
    expect(cancelDivorce(g)).toBe(false);
    expect(divorceMorning(g)).toBeUndefined();
  });

  it("is saved and loaded while filed", () => {
    const g = married();
    fileDivorce(g);
    const back = deserialize(serialize(g))!;
    expect(back.marriage.divorcing).toBe(true);
    expect(back.marriage.married).toBe(true);
  });
});

describe("the morning it takes effect", () => {
  it("ends the marriage, keeps the hearts, drops the cap and sets the ex flag", () => {
    const g = married();
    fileDivorce(g);
    const news = divorceMorning(g)!;
    expect(news.name).toBe("Bramwell");
    expect(g.marriage.stage).toBe("none");
    expect(g.marriage.divorcing).toBe(false);
    expect(spouseId(g)).toBeNull();
    expect(isEx(g, "bramwell")).toBe(true);
    expect(g.friendship.points("bramwell")).toBe(12 * HEART);
    expect(g.friendship.capHearts("bramwell")).toBe(10);
    expect(holdsOf(g).has("spouse")).toBe(false);
  });

  it("does not clamp points down on a reload, and gains stop at the cap", () => {
    const g = married();
    fileDivorce(g);
    divorceMorning(g);
    const back = deserialize(serialize(g))!;
    expect(back.friendship.points("bramwell")).toBe(12 * HEART);
    expect(back.friendship.award("bramwell", 100)).toBe(0);
    expect(back.friendship.points("bramwell")).toBe(12 * HEART);
  });

  it("runs from sleep() and reaches the report", () => {
    const g = married();
    fileDivorce(g);
    const r = sleep(g, [], () => 0.99);
    expect(r.divorce?.name).toBe("Bramwell");
    expect(r.spouse).toBeUndefined();
    expect(reportLines(r).join("\n")).toMatch(/Bramwell/);
    expect(sleep(g, [], () => 0.99).divorce).toBeUndefined();
  });

  it("does nothing for an unfiled marriage", () => {
    const g = married();
    expect(divorceMorning(g)).toBeUndefined();
    expect(g.marriage.married).toBe(true);
  });
});

describe("the ex-spouse afterwards", () => {
  it("can be courted again, the ex mark lifted, hearts kept", () => {
    const g = married();
    fileDivorce(g);
    divorceMorning(g);
    const pts = g.friendship.points("bramwell");
    g.inventory.add(BOUQUET, 1);
    const r = courtGift(g, "bramwell", BOUQUET);
    expect(r?.consumed).toBe(true);
    expect(g.marriage.stage).toBe("courting");
    expect(isEx(g, "bramwell")).toBe(false);
    expect(g.friendship.points("bramwell")).toBe(pts);
  });

  it("an ex comes to a later wedding as a guest, the one marrying does not", () => {
    const g = married();
    fileDivorce(g);
    divorceMorning(g);
    expect(attendsWedding(g, "bramwell")).toBe(true);
    expect(attendsWedding(g, "someone-else")).toBe(false);
    expect(weddingGuests(g, "other")).toEqual(["bramwell"]);
    expect(weddingGuests(g, "bramwell")).toEqual([]);
    const ev = weddingEvent("other", weddingGuests(g, "other"));
    expect(
      ev.scene.some((c) => c.cmd === "place" && c.who === "bramwell"),
    ).toBe(true);
  });

  it("visits the children weekly, in the yard, only when there are children", () => {
    const g = married();
    g.marriage.addChild(1);
    fileDivorce(g);
    divorceMorning(g);
    expect(exVisitor(g, 14, "sunny")).toBe("bramwell");
    expect(exVisitor(g, 13, "sunny")).toBeUndefined();
    expect(exVisitor(g, 14, "rainy")).toBeUndefined();
    const row = VILLAGERS.find((v) => v.id === "bramwell")!;
    const v = exVisitVillager(g, row, 14, "sunny");
    expect(v.route.some((s) => s.place === "farm:yard" && s.time === 600)).toBe(
      true,
    );
    expect(exVisitVillager(g, row, 13, "sunny")).toBe(row);
    g.marriage.kids = [];
    expect(exVisitor(g, 14, "sunny")).toBeUndefined();
  });

  it("lets the player court someone else", () => {
    const g = married();
    fileDivorce(g);
    divorceMorning(g);
    const other = VILLAGERS.find((v) => v.candidate && v.id !== "bramwell")!.id;
    g.friendship.meet(other);
    g.friendship.award(other, 8 * HEART);
    g.inventory.add(BOUQUET, 1);
    expect(courtGift(g, other, BOUQUET)?.consumed).toBe(true);
  });
});

describe("the divorce chest", () => {
  it("stands where the map has it, and shows after a divorce even if the room is bare", () => {
    const c = maps
      .marksWith("house", new Set([DIVORCE_CHEST_HOLD]), 1)
      .fixtures.find((f) => f.kind === "chest")!;
    expect([c.x, c.y]).toEqual([DIVORCE_CHEST_TILE.x, DIVORCE_CHEST_TILE.y]);
    const g = married();
    expect(holdsOf(g).has(DIVORCE_CHEST_HOLD)).toBe(false);
    fileDivorce(g);
    divorceMorning(g);
    expect(holdsOf(g).has(DIVORCE_CHEST_HOLD)).toBe(true);
  });

  it("takes furniture and chest contents from the spouse room", () => {
    const g = married();
    const [k] = [...spouseRoomArea()];
    const [x, y] = k!.split(",").map(Number) as [number, number];
    g.furniture.add(HOUSE_MAP, x, y, "armchair");
    const [k2] = [...spouseRoomArea()].filter((t) => t !== k);
    const [x2, y2] = k2!.split(",").map(Number) as [number, number];
    g.chests.add(HOUSE_MAP, x2, y2, "chest")!.items.add("parsnip", 5);
    fileDivorce(g);
    divorceMorning(g);
    const { x: cx, y: cy } = DIVORCE_CHEST_TILE;
    const box = g.chests.get(HOUSE_MAP, cx, cy)!;
    expect(box.items.count("armchair")).toBe(1);
    expect(box.items.count("parsnip")).toBe(5);
    expect(box.items.count("chest")).toBe(1);
    expect(g.furniture.at(HOUSE_MAP, x, y)).toBeUndefined();
    expect(g.chests.get(HOUSE_MAP, x2, y2)).toBeUndefined();
  });
});
