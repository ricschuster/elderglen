import { describe, expect, it } from "vitest";
import { contents, pickUpChest, putIn, pushChest } from "../src/core/chests";
import {
  acceptOrder,
  dropOrder,
  endDayOrders,
  handInTally,
  orderById,
  ORDERS_OPEN_DAY,
  orderChest,
  ordersReportLines,
  type HandInPlace,
} from "../src/core/orders";
import { deserialize, newGame, serialize } from "../src/core/save";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import innMap from "../src/content/maps/inn.json";
import fisherHut from "../src/content/maps/fisher-hut.json";
import smithy from "../src/content/maps/smithy.json";

type Game = ReturnType<typeof newGame>;

/** A day on which the board posts the order, so it can be taken the proper way. */
function dayFor(id: string): number {
  const g = newGame();
  g.orders.opened = true;
  for (let d = ORDERS_OPEN_DAY; d < 400; d++)
    if (g.orders.board(d).some((o) => o.id === id)) return d;
  throw new Error(`${id} is never posted`);
}

function placeOf(id: string): HandInPlace {
  const ask = orderById(id)!.ask;
  if (ask.kind !== "hand-in") throw new Error("not a hand-in");
  return ask.place;
}

function taken(id: string): { g: Game; day: number; place: HandInPlace } {
  const g = newGame();
  g.orders.opened = true;
  const day = dayFor(id);
  g.day.clock.day = day;
  expect(acceptOrder(g, id, day)).toBe("ok");
  return { g, day, place: placeOf(id) };
}

const chestOf = (g: Game, p: HandInPlace) => g.chests.get(p.map, p.x, p.y)!;
const fill = (g: Game, p: HandInPlace, id: string, n: number) => {
  g.inventory.add(id, n);
  putIn(g, chestOf(g, p), id, n);
};

describe("goods hand-in", () => {
  it("stands a bound chest at the named place when the order is taken", () => {
    const { g, place } = taken("pantry-stock");
    const c = chestOf(g, place);
    expect(c.order).toBe("pantry-stock");
    expect(c.closed).toBeUndefined();
    expect(orderChest(g, orderById("pantry-stock")!)).toBe(c);
  });

  it("refuses when something already stands on the place", () => {
    const g = newGame();
    g.orders.opened = true;
    const day = dayFor("pantry-stock");
    const p = placeOf("pantry-stock");
    g.chests.add(p.map, p.x, p.y, "chest");
    expect(acceptOrder(g, "pantry-stock", day)).toBe("place taken");
    expect(g.orders.isActive("pantry-stock")).toBe(false);
  });

  it("cannot be lifted or pushed while bound", () => {
    const { g, place } = taken("pantry-stock");
    const m = FarmMap.fromTiled(innMap as unknown as TiledMapJson);
    expect(pickUpChest(g, place.map, place.x, place.y)).toEqual({
      ok: false,
      reason: "chest bound to an order",
    });
    expect(pushChest(g, m, place.map, place.x, place.y, 1, 0).ok).toBe(false);
  });

  it("pays and takes the goods when the count is met overnight", () => {
    const { g, day, place } = taken("pantry-stock");
    fill(g, place, "egg", 25);
    const gold = g.money;
    const news = endDayOrders(g, [], day + 1);
    expect(news.done.map((d) => d.title)).toEqual(["Pantry Stock"]);
    expect(g.money).toBe(gold + orderById("pantry-stock")!.gold);
    expect(g.orders.isActive("pantry-stock")).toBe(false);
    // 24 were taken, one is left, so the chest stays closed for it.
    const c = chestOf(g, place);
    expect(c.closed).toBe(true);
    expect(contents(c)).toEqual([{ id: "egg", count: 1 }]);
    expect(g.orders.owed).toEqual([{ id: "mayonnaise-machine", count: 1 }]);
  });

  it("removes the chest when nothing is left over", () => {
    const { g, day, place } = taken("pantry-stock");
    fill(g, place, "egg", 24);
    endDayOrders(g, [], day + 1);
    expect(g.chests.get(place.map, place.x, place.y)).toBeUndefined();
  });

  it("does not pay while the count is short", () => {
    const { g, day, place } = taken("pantry-stock");
    fill(g, place, "egg", 23);
    expect(endDayOrders(g, [], day + 1).done).toEqual([]);
    expect(g.orders.isActive("pantry-stock")).toBe(true);
    expect(contents(chestOf(g, place))).toEqual([{ id: "egg", count: 23 }]);
  });

  it("counts a leek of any quality, and is posted in spring only", () => {
    const def = orderById("spring-leeks")!;
    expect(def.notSeasons).toEqual(["summer", "fall", "winter"]);
    const { g, place } = taken("spring-leeks");
    fill(g, place, "leek", 6);
    fill(g, place, "leek@gold", 6);
    expect(handInTally(def, chestOf(g, place)).progress).toBe(12);
  });

  it("Barrel Batch wants twelve of one keg drink, not a mix", () => {
    const def = orderById("barrel-batch")!;
    const { g, day, place } = taken("barrel-batch");
    fill(g, place, "parsnip-juice", 6);
    fill(g, place, "potato-juice", 6);
    fill(g, place, "honey", 12);
    expect(handInTally(def, chestOf(g, place)).progress).toBe(6);
    expect(endDayOrders(g, [], day + 1).done).toEqual([]);
    fill(g, place, "parsnip-juice", 6);
    expect(endDayOrders(g, [], day + 2).done).toHaveLength(1);
    const left = contents(chestOf(g, place));
    expect(left).toContainEqual({ id: "potato-juice", count: 6 });
    expect(left).toContainEqual({ id: "honey", count: 12 });
    expect(left.find((s) => s.id === "parsnip-juice")).toBeUndefined();
  });

  it("Crystal Gift wants five different gems", () => {
    const def = orderById("crystal-gift")!;
    const { g, day, place } = taken("crystal-gift");
    fill(g, place, "gem-low-a", 4);
    fill(g, place, "gem-low-b", 1);
    fill(g, place, "gem-mid-a", 1);
    fill(g, place, "gem-mid-b", 1);
    expect(handInTally(def, chestOf(g, place)).progress).toBe(4);
    expect(endDayOrders(g, [], day + 1).done).toEqual([]);
    fill(g, place, "gem-high-a", 1);
    expect(endDayOrders(g, [], day + 2).done).toHaveLength(1);
    expect(contents(chestOf(g, place))).toEqual([
      { id: "gem-low-a", count: 3 },
    ]);
  });

  it("lapse keeps the goods to take back, and the chest goes once empty", () => {
    const { g, day, place } = taken("crystal-gift");
    fill(g, place, "gem-low-a", 2);
    const due = day + orderById("crystal-gift")!.windowDays;
    const news = endDayOrders(g, [], due + 1);
    expect(news.lapsed).toEqual(["Crystal Gift"]);
    expect(ordersReportLines(news)[0]).toContain("taken back");
    const c = chestOf(g, place);
    expect(c.closed).toBe(true);
    expect(orderChest(g, orderById("crystal-gift")!)).toBeUndefined();
    c.items.remove("gem-low-a", 2);
    endDayOrders(g, [], due + 2);
    expect(g.chests.get(place.map, place.x, place.y)).toBeUndefined();
  });

  it("dropping an order closes its chest at no cost", () => {
    const { g, place } = taken("pantry-stock");
    fill(g, place, "egg", 3);
    expect(dropOrder(g, "pantry-stock")).toBe(true);
    expect(chestOf(g, place).closed).toBe(true);
    expect(contents(chestOf(g, place))).toEqual([{ id: "egg", count: 3 }]);
  });

  it("keeps the binding through a save", () => {
    const { g, place } = taken("pantry-stock");
    fill(g, place, "egg", 5);
    const back = deserialize(serialize(g))!;
    const c = back.chests.get(place.map, place.x, place.y)!;
    expect(c.order).toBe("pantry-stock");
    expect(contents(c)).toEqual([{ id: "egg", count: 5 }]);
    dropOrder(back, "pantry-stock");
    const again = deserialize(serialize(back))!;
    expect(again.chests.get(place.map, place.x, place.y)!.closed).toBe(true);
  });

  it("every named place is open floor on its map", () => {
    const maps: Record<string, unknown> = {
      inn: innMap,
      "fisher-hut": fisherHut,
      smithy,
    };
    for (const id of [
      "spring-leeks",
      "barrel-batch",
      "pantry-stock",
      "crystal-gift",
    ]) {
      const p = placeOf(id);
      const m = FarmMap.fromTiled(maps[p.map] as TiledMapJson);
      expect(m.isBlocked(p.x, p.y), id).toBe(false);
    }
  });
});
