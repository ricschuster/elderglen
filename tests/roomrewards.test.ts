import { describe, expect, it } from "vitest";
import { fillBundle } from "./hall-helpers";
import { maps } from "../src/content/maps";
import { BUNDLES, Hall, ROOMS } from "../src/core/bundles";
import { farmMapOf } from "../src/core/farmtypes";
import { CART_KIND } from "../src/core/map";
import { MINES_OPEN_DAY } from "../src/core/mines";
import { reportLines } from "../src/core/report";
import {
  CART_IDLE_LINE,
  CART_ROOM,
  CART_STOPS,
  CARTS_RUNNING,
  GUESTS_PAID,
  GUESTS_ROOM,
  HERB_GOODS,
  HERB_ROOM,
  buyFromHerbStall,
  cartArrival,
  cartDestinations,
  cartNews,
  cartServiceId,
  cartsRunning,
  herbPrice,
  herbStallProblem,
  herbStock,
  payGuestsBoard,
  stopOfService,
  weekOf,
} from "../src/core/roomrewards";
import { newGame } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { itemById } from "../src/core/items";
import { hasFlag } from "../src/core/worldflags";

/** A game whose rooms all open at once, so a test need not finish others first. */
function game() {
  const g = newGame();
  g.hall = new Hall(
    BUNDLES,
    {},
    ROOMS.map((r) => ({ ...r, opensAfter: 0 })),
  );
  return g;
}

function finish(g: ReturnType<typeof newGame>, room: string) {
  for (const b of g.hall.bundlesIn(room)) fillBundle(g.hall, g.inventory, g, b);
}

const night = (g: ReturnType<typeof newGame>) =>
  sleep(g, farmMapOf(g).forageSpots, Math.random, farmMapOf(g));

describe("the Guests' Board reward", () => {
  it("is the friendship boost in the data, not the old hat boost", () => {
    expect(ROOMS.find((r) => r.id === GUESTS_ROOM)!.unlock).toBe(
      "friendship-boost",
    );
  });

  it("pays +500 once to everyone met who is not a candidate", () => {
    const g = game();
    g.friendship.meet("odette");
    g.friendship.meet("aurelle");
    expect(payGuestsBoard(g)).toEqual([]);
    finish(g, GUESTS_ROOM);
    expect(g.hall.roomComplete(GUESTS_ROOM)).toBe(true);
    expect(payGuestsBoard(g)).toEqual(["odette"]);
    expect(g.friendship.points("odette")).toBe(500);
    expect(g.friendship.points("aurelle")).toBe(0);
    expect(hasFlag(g, GUESTS_PAID)).toBe(true);
    expect(payGuestsBoard(g)).toEqual([]);
    expect(g.friendship.points("odette")).toBe(500);
  });

  it("is caught up overnight for a room finished without the hall scene", () => {
    const g = game();
    g.friendship.meet("odette");
    finish(g, GUESTS_ROOM);
    const r = night(g);
    expect(r.guestsBonus).toEqual(["odette"]);
    expect(reportLines(r).join(" ")).toContain("Guests' Board");
    expect(night(g).guestsBonus).toEqual([]);
  });
});

describe("the Hearth room carts", () => {
  it("name four stops whose maps and entries exist", () => {
    expect(CART_STOPS.map((s) => s.id)).toEqual([
      "square",
      "hall",
      "farm",
      "mine",
    ]);
    const g = newGame();
    for (const s of CART_STOPS) {
      const { map, entry } = cartArrival(g, s);
      expect(maps.get(map).entries.some((e) => e.name === entry)).toBe(true);
    }
  });

  it("have a cart service on every stop's map, and on both farm maps", () => {
    for (const s of CART_STOPS) {
      const ids = s.id === "farm" ? ["farm", "farm-woodland"] : [s.map];
      for (const id of ids) {
        const svc = maps
          .get(id)
          .services.find((v) => v.id === cartServiceId(s.id));
        expect(svc?.kind, `${id} ${s.id}`).toBe(CART_KIND);
      }
    }
    expect(stopOfService("cart-mine")?.name).toBe("Mine mouth");
    expect(stopOfService("bin")).toBeUndefined();
    expect(maps.problems()).toEqual([]);
  });

  it("list the mine mouth only once the mines open", () => {
    expect(
      cartDestinations("farm", MINES_OPEN_DAY - 1).map((s) => s.id),
    ).toEqual(["square", "hall"]);
    expect(cartDestinations("farm", MINES_OPEN_DAY).map((s) => s.id)).toContain(
      "mine",
    );
  });

  it("put the mine stop beside the mine door", () => {
    const m = maps.get("mountain");
    const door = m.exits.find((e) => e.map === "mine")!;
    const svc = m.services.find((v) => v.id === "cart-mine")!;
    expect(Math.abs(svc.x - door.x) + Math.abs(svc.y - door.y)).toBeLessThan(
      6 * 16,
    );
  });

  it("offer every other stop, free", () => {
    expect(cartDestinations("farm").map((s) => s.id)).toEqual([
      "square",
      "hall",
      "mine",
    ]);
  });

  it("start the morning after the Hearth room is finished, and the report says so once", () => {
    const g = game();
    expect(cartsRunning(g)).toBe(false);
    expect(cartNews(g)).toBe(false);
    finish(g, CART_ROOM);
    expect(cartsRunning(g)).toBe(false);
    const r = night(g);
    expect(r.cartsRunning).toBe(true);
    expect(reportLines(r).join(" ")).toContain("carts are running");
    expect(cartsRunning(g)).toBe(true);
    expect(hasFlag(g, CARTS_RUNNING)).toBe(true);
    expect(night(g).cartsRunning).toBe(false);
  });

  it("say the cart is empty before then", () => {
    expect(CART_IDLE_LINE).toContain("Hearth room");
  });
});

describe("the herb stall", () => {
  it("opens when the Foragers' Shelf is finished", () => {
    const g = game();
    expect(herbStallProblem(g)).not.toBe("");
    finish(g, HERB_ROOM);
    expect(herbStallProblem(g)).toBe("");
  });

  it("keeps one stock all week and changes it the next", () => {
    expect(herbStock(1)).toEqual(herbStock(7));
    expect(weekOf(8)).toBe(1);
    const stocks = new Set(
      Array.from({ length: 12 }, (_, w) => herbStock(w * 7 + 1).join(",")),
    );
    expect(stocks.size).toBeGreaterThan(1);
    for (let w = 0; w < 12; w++) {
      const s = herbStock(w * 7 + 1);
      expect(s.length).toBeGreaterThanOrEqual(3);
      expect(s.length).toBeLessThanOrEqual(5);
      for (const id of s) expect(HERB_GOODS).toContain(id);
    }
  });

  it("lists only real items, priced from their sell value", () => {
    for (const id of HERB_GOODS) {
      expect(itemById(id), id).toBeDefined();
      expect(herbPrice(id)).toBe(Math.floor(itemById(id)!.sellPrice * 1.5));
    }
  });

  it("sells stock for gold once open, and nothing off the list", () => {
    const g = game();
    const id = herbStock(g.day.clock.day)[0]!;
    g.money = 10_000;
    expect(buyFromHerbStall(g, id)).toBe(false);
    finish(g, HERB_ROOM);
    g.money = 10_000;
    const before = g.inventory.count(id);
    expect(buyFromHerbStall(g, id, 2)).toBe(true);
    expect(g.inventory.count(id)).toBe(before + 2);
    expect(g.money).toBe(10_000 - herbPrice(id) * 2);
    const off = HERB_GOODS.find(
      (h) => !herbStock(g.day.clock.day).includes(h),
    )!;
    expect(buyFromHerbStall(g, off)).toBe(false);
    g.money = 0;
    expect(buyFromHerbStall(g, id)).toBe(false);
  });

  it("has a stall service in the hall", () => {
    expect(
      maps.get("hall").services.find((s) => s.id === "herb-stall")?.kind,
    ).toBe("herb-stall");
  });
});
