import { describe, expect, it } from "vitest";
import { clearTwig, till } from "../src/core/actions";
import { knownRecipes, recipeById, known } from "../src/core/crafting";
import {
  collectOwed,
  endDayOrders,
  ORDERS_OPEN_DAY,
  weeklyPick,
} from "../src/core/orders";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { dateOf } from "../src/core/calendar";
import { CROPS } from "../src/core/crops";
import { FarmMap, type TiledMapJson } from "../src/core/map";

function open(day = ORDERS_OPEN_DAY) {
  const g = newGame();
  g.day.clock.day = day;
  g.orders.opened = true;
  return g;
}

const ship = (id: string, count: number) => [{ id, count, unit: 1 }];

describe("Special Orders", () => {
  it("opens on Fall 2 of year one and not before", () => {
    expect(dateOf(ORDERS_OPEN_DAY)).toMatchObject({
      season: "fall",
      dayOfSeason: 2,
      year: 1,
    });
    const g = newGame();
    expect(g.orders.introDue(ORDERS_OPEN_DAY - 1)).toBe(false);
    expect(g.orders.introDue(ORDERS_OPEN_DAY)).toBe(true);
    expect(g.orders.board(ORDERS_OPEN_DAY)).toEqual([]);
    g.orders.opened = true;
    expect(g.orders.introDue(ORDERS_OPEN_DAY + 5)).toBe(false);
    expect(g.orders.board(ORDERS_OPEN_DAY).length).toBeGreaterThan(0);
  });

  it("draws the same board on a reload and one new order a week", () => {
    const g = open();
    const a = g.orders.board(ORDERS_OPEN_DAY).map((o) => o.id);
    const back = deserialize(serialize(g))!;
    expect(back.orders.board(ORDERS_OPEN_DAY).map((o) => o.id)).toEqual(a);
    expect(weeklyPick(8)).toBe(weeklyPick(8));
  });

  it("starts the clock on acceptance and allows one new order a week", () => {
    const g = open(60);
    const [first, second] = g.orders.board(60);
    expect(g.orders.accept(first!.id, 60)).toBe("ok");
    expect(g.orders.active[0]!.due).toBe(60 + first!.windowDays);
    expect(second && g.orders.accept(second.id, 61)).toBe("one a week");
    expect(g.orders.accept("nope", 61)).toBe("not posted");
    expect(g.orders.cancel(first!.id)).toBe(true);
  });

  it("pays gold at once and a unique reward the first time only", () => {
    const g = open(60);
    expect(g.orders.accept("fine-vegetables", 60)).toBe("ok");
    const news = endDayOrders(g, ship("parsnip@gold", 25), 61);
    expect(news.done).toHaveLength(1);
    expect(news.done[0]).toMatchObject({ first: true, gold: 1000 });
    expect(g.money).toBe(500 + 1000);
    expect(g.orders.active).toHaveLength(0);
    // The recipe it unlocks.
    expect(known(g, recipeById("dehydrator")!)).toBe(true);
    // Second time: gold only.
    g.orders.accept("fine-vegetables", 70);
    const again = endDayOrders(g, ship("parsnip@gold", 25), 71);
    expect(again.done[0]).toMatchObject({ first: false });
    expect(g.money).toBe(500 + 2000);
    expect(knownRecipes(g).length).toBeGreaterThan(0);
  });

  it("counts only gold vegetables for Fine Vegetables, and only after acceptance", () => {
    const g = open(60);
    g.orders.accept("fine-vegetables", 60);
    endDayOrders(g, ship("parsnip", 30), 61);
    endDayOrders(g, ship("melon@gold", 30), 61);
    expect(g.orders.active[0]!.progress.all ?? 0).toBe(0);
    endDayOrders(g, ship("parsnip@gold", 10), 61);
    expect(g.orders.active[0]!.progress.all).toBe(10);
    // Goods shipped before the order was taken do not count.
    const early = open(60);
    early.orders.accept("fine-vegetables", 60);
    endDayOrders(early, ship("parsnip@gold", 50), 60);
    expect(early.orders.active).toHaveLength(1);
  });

  it("counts one crop for Bumper Harvest, in its season", () => {
    const fall = CROPS.find((c) => c.seasons.includes("fall"))!.id;
    const spring = CROPS.find((c) => !c.seasons.includes("fall"))!.id;
    const g = open(60);
    expect(g.orders.accept("bumper-harvest", 60)).toBe("ok");
    endDayOrders(g, [...ship(spring, 60), ...ship(fall, 60)], 61);
    expect(g.orders.active).toHaveLength(1);
    expect(g.orders.active[0]!.progress[fall]).toBe(60);
    const news = endDayOrders(g, ship(fall, 40), 61);
    expect(news.done[0]!.title).toBe("Bumper Harvest");
    expect(g.orders.owed).toEqual([{ id: "big-chest", count: 1 }]);
    expect(collectOwed(g)).toHaveLength(1);
    expect(g.inventory.count("big-chest")).toBe(1);
    expect(g.orders.owed).toEqual([]);
  });

  it("lapses an order after its window at no cost, and offers it again", () => {
    const g = open(60);
    g.orders.accept("fine-vegetables", 60);
    const due = g.orders.active[0]!.due;
    expect(endDayOrders(g, [], due).lapsed).toEqual([]);
    const news = endDayOrders(g, [], due + 1);
    expect(news.lapsed).toEqual(["Fine Vegetables"]);
    expect(g.money).toBe(500);
    expect(g.orders.board(due + 1).length).toBeGreaterThan(0);
  });

  it("does nothing before the board opens, and survives a save round trip", () => {
    const g = newGame();
    expect(endDayOrders(g, ship("parsnip@gold", 99), 61).done).toEqual([]);
    const h = open(60);
    h.orders.accept("bumper-harvest", 60);
    endDayOrders(h, ship("tomato", 10), 61);
    const back = deserialize(serialize(h))!;
    expect(back.orders.save()).toEqual(h.orders.save());
  });

  it("loads an old save with no orders as a closed board", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.orders;
    delete raw.twigs;
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.orders.opened).toBe(false);
    expect(back.orders.active).toEqual([]);
    expect(back.twigs.count).toBe(0);
    raw.orders = { opened: "yes" };
    expect(deserialize(JSON.stringify(raw))!.orders.opened).toBe(false);
  });

  it("is filled through a night's sleep and reported", () => {
    const g = open(60);
    g.orders.accept("fine-vegetables", 60);
    g.bin.ship(
      (() => {
        g.inventory.add("parsnip@gold", 25);
        return g.inventory;
      })(),
      "parsnip@gold",
      25,
    );
    const r = sleep(g, [], () => 0.99);
    expect(r.orders.done.map((d) => d.title)).toEqual(["Fine Vegetables"]);
  });
});

describe("twigs", () => {
  const map = FarmMap.fromTiled({
    width: 4,
    height: 4,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      { name: "collision", type: "tilelayer", data: new Array(16).fill(0) },
      { name: "soil", type: "tilelayer", data: new Array(16).fill(1) },
      {
        name: "markers",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  } as TiledMapJson);

  it("block tilling and give 1 wood when cleared", () => {
    const g = newGame();
    g.twigs.add(1, 1);
    expect(till(g, 1, 1).ok).toBe(false);
    expect(clearTwig(g, 1, 1, "axe", map).ok).toBe(true);
    expect(g.inventory.count("wood")).toBe(1);
    expect(g.twigs.at(1, 1)).toBe(false);
    expect(clearTwig(g, 1, 1, "axe", map).ok).toBe(false);
  });
});
