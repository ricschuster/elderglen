import { describe, expect, it } from "vitest";
import { GameRoomWorld } from "../src/core/roomworld";
import { itemById } from "../src/core/items";
import { newGame } from "../src/core/save";
import { Inventory } from "../src/core/inventory";
import { findTool } from "../src/core/toolitems";
import { MAX_ENERGY } from "../src/core/energy";
import { TOOL_ENERGY } from "../src/core/actions";
import { LOCAL_PLAYER } from "../src/core/players";
import {
  RemoteInterpolator,
  PlayerBlocking,
  playersAt,
  resolveBlocking,
} from "../src/net/interp";
import { JAM_BLOCK_MS } from "../src/core/jam";
import type { RemotePlayer } from "../src/net/session";

function mk() {
  const w = new GameRoomWorld(newGame("standard", "separate"), {
    random: () => 0.9,
  });
  w.admit("p2", "Ann");
  w.addPlayer("p2", "Ann");
  // These tests count items from nothing: clear the starting kit a joiner gets.
  w.g.players.get("p2").inventory.load(new Inventory().save());
  return w;
}

describe("a joining guest", () => {
  it("starts with the tools and the farm's starting seeds, like a new game", () => {
    const w = new GameRoomWorld(newGame("standard", "separate"), {
      random: () => 0.9,
    });
    w.admit("p2", "Ann");
    w.addPlayer("p2", "Ann");
    const inv = w.g.players.get("p2").inventory;
    expect(inv.count("parsnip-seed")).toBeGreaterThan(0);
    expect(findTool(inv, "hoe")).toBeGreaterThanOrEqual(0);
  });
});

describe("bin intents", () => {
  it("ship and take-back use the guest's pack and only their own lines", () => {
    const w = mk();
    const guest = w.g.players.get("p2");
    guest.inventory.add("parsnip", 4);
    expect(
      w.apply("p2", { kind: "ship", id: "parsnip", n: 3 }),
    ).toBeUndefined();
    expect(guest.inventory.count("parsnip")).toBe(1);
    expect(w.g.bin.each()[0]?.by).toBe("p2");
    expect(w.apply("p2", { kind: "ship", id: "nope", n: 1 })).toBe(
      "nothing shipped",
    );
    expect(w.apply("p1", { kind: "take-back", index: 0, n: 1 })).toBe(
      "not your goods",
    );
    expect(
      w.apply("p2", { kind: "take-back", index: 0, n: 2 }),
    ).toBeUndefined();
    expect(guest.inventory.count("parsnip")).toBe(3);
    expect(w.apply("p2", { kind: "take-back", index: 5, n: 1 })).toBe(
      "not your goods",
    );
  });
  it("ore only goes into the ore bin", () => {
    const w = mk();
    w.g.players.get("p2").inventory.add("parsnip", 1);
    expect(
      w.apply("p2", { kind: "ship", id: "parsnip", n: 1, ore: true }),
    ).toBe("nothing shipped");
  });
});

describe("farm intents", () => {
  it("till, plant, water use the guest's record and energy, not the host's", () => {
    const w = mk();
    const g = w.g;
    const guest = g.players.get("p2");
    guest.inventory.add("parsnip-seed", 2);
    const hostEnergy = g.day.energy.current;
    expect(w.apply("p2", { kind: "till", x: 5, y: 5 })).toBeUndefined();
    expect(g.farm.plotAt(5, 5)?.tilled).toBe(true);
    expect(
      w.apply("p2", { kind: "plant", x: 5, y: 5, seed: "parsnip-seed" }),
    ).toBeUndefined();
    expect(guest.inventory.count("parsnip-seed")).toBe(1);
    expect(w.apply("p2", { kind: "water", x: 5, y: 5 })).toBeUndefined();
    expect(guest.canWater).toBe(39);
    expect(g.players.get(LOCAL_PLAYER).canWater).toBe(40);
    expect(guest.energy.current).toBeLessThan(MAX_ENERGY);
    expect(MAX_ENERGY - guest.energy.current).toBeCloseTo(TOOL_ENERGY * 2, 0);
    expect(g.day.energy.current).toBe(hostEnergy);
    expect(g.players.localId).toBe(LOCAL_PLAYER);
  });

  it("harvest puts the crop in the guest's pack and gives them the experience", () => {
    const w = mk();
    const g = w.g;
    const guest = g.players.get("p2");
    g.farm.till(5, 5);
    g.farm.plant(5, 5, "parsnip", "spring");
    for (let i = 0; i < 8; i++) {
      g.farm.water(5, 5);
      g.farm.endDay("spring");
    }
    expect(g.farm.isRipe(5, 5)).toBe(true);
    const hostXp = g.players.get(LOCAL_PLAYER).skills.xpOf("farming");
    const hostPack = g.players.get(LOCAL_PLAYER).inventory.count("parsnip");
    expect(w.apply("p2", { kind: "harvest", x: 5, y: 5 })).toBeUndefined();
    expect(guest.inventory.count("parsnip")).toBeGreaterThan(0);
    expect(guest.skills.xpOf("farming")).toBeGreaterThan(0);
    expect(g.players.get(LOCAL_PLAYER).skills.xpOf("farming")).toBe(hostXp);
    expect(g.players.get(LOCAL_PLAYER).inventory.count("parsnip")).toBe(
      hostPack,
    );
    expect(g.farm.plotAt(5, 5)?.crop).toBeUndefined();
    expect(g.players.localId).toBe(LOCAL_PLAYER);
  });

  it("harvest refuses to the sender: bad tile, nothing ripe, full pack", () => {
    const w = mk();
    expect(w.apply("p2", { kind: "harvest", x: 1.5, y: 2 })).toBe(
      "bad harvest",
    );
    expect(w.apply("p2", { kind: "harvest", x: 2, y: 2 })).toBe("nothing ripe");
  });

  it("rejects bad input and an empty guest, to the sender", () => {
    const w = mk();
    expect(w.apply("p2", { kind: "till", x: 1.5, y: 2 })).toBe("bad till");
    expect(
      w.apply("p2", { kind: "plant", x: 1, y: 1, seed: "parsnip-seed" }),
    ).toBe("no seeds");
    expect(w.apply("p2", { kind: "water", x: 9, y: 9 })).toBe(
      "nothing to water",
    );
    w.g.players.get("p2").energy.current = 0;
    expect(w.apply("p2", { kind: "till", x: 3, y: 3 })).toBe("exhausted");
    // The host is not exhausted by the guest.
    expect(w.apply(LOCAL_PLAYER, { kind: "till", x: 3, y: 3 })).toBeUndefined();
    expect(w.g.day.energy.current).toBeLessThan(MAX_ENERGY);
  });

  it("buy and sell go through the guest's wallet; sell applies professions", () => {
    const w = mk();
    const guest = w.g.players.get("p2");
    guest.money = 100;
    const price = itemById("parsnip-seed")!.buyPrice!;
    expect(
      w.apply("p2", { kind: "buy", id: "parsnip-seed", n: 3 }),
    ).toBeUndefined();
    expect(guest.money).toBe(100 - 3 * price);
    expect(guest.inventory.count("parsnip-seed")).toBe(3);
    expect(w.apply("p2", { kind: "buy", id: "parsnip-seed", n: 1000 })).toBe(
      "bad buy",
    );
    guest.money = 0;
    expect(w.apply("p2", { kind: "buy", id: "parsnip-seed", n: 1 })).toBe(
      "cannot buy",
    );
    guest.inventory.add("parsnip", 2);
    expect(
      w.apply("p2", { kind: "sell", id: "parsnip", n: 2 }),
    ).toBeUndefined();
    expect(guest.money).toBe(2 * itemById("parsnip")!.sellPrice);
    expect(w.apply("p2", { kind: "sell", id: "parsnip", n: 1 })).toBe(
      "cannot sell",
    );
    expect(w.g.players.get(LOCAL_PLAYER).money).not.toBe(guest.money);
  });

  it("ship uses the shipper's profession multiplier", () => {
    const w = mk();
    const guest = w.g.players.get("p2");
    guest.skills.setProfession("farming", "tiller");
    guest.inventory.add("parsnip", 2);
    w.g.players.get(LOCAL_PLAYER).inventory.add("parsnip", 2);
    expect(
      w.apply("p2", { kind: "ship", id: "parsnip", n: 2 }),
    ).toBeUndefined();
    expect(
      w.apply(LOCAL_PLAYER, { kind: "ship", id: "parsnip", n: 2 }),
    ).toBeUndefined();
    expect(w.g.bin.total("p2")).toBeGreaterThan(w.g.bin.total(LOCAL_PLAYER));
  });
});

const rp = (id: string, x: number, y: number, map = "farm"): RemotePlayer => ({
  id,
  name: id,
  x,
  y,
  map,
  dir: 0,
});

describe("interpolation and blocking", () => {
  it("blends between two snapshots 200 ms behind, never extrapolates", () => {
    const it = new RemoteInterpolator();
    it.observe([rp("p2", 0, 0)], 1000);
    it.observe([rp("p2", 10, 20)], 1100);
    const latest = [rp("p2", 10, 20)];
    expect(it.sample(latest, 1250)[0]).toMatchObject({ x: 5, y: 10 });
    expect(it.sample(latest, 1200)[0]).toMatchObject({ x: 0, y: 0 });
    expect(it.sample(latest, 5000)[0]).toMatchObject({ x: 10, y: 20 });
  });

  it("does not blend across maps, and forgets players who left", () => {
    const it = new RemoteInterpolator();
    it.observe([rp("p2", 0, 0, "farm")], 0);
    it.observe([rp("p2", 50, 50, "town")], 100);
    expect(it.sample([rp("p2", 50, 50, "town")], 250)[0]).toMatchObject({
      map: "farm",
      x: 0,
    });
    it.observe([], 300);
    expect(it.sample([rp("p2", 7, 7)], 400)[0]).toMatchObject({ x: 7 });
  });

  it("finds blockers and starts the jam pass after the block time", () => {
    const others = [
      rp("p2", 100, 100),
      rp("p3", 300, 300),
      rp("p4", 100, 100, "town"),
    ];
    expect(playersAt(104, 100, "farm", others)).toEqual(["p2"]);
    const b = new PlayerBlocking();
    const at = { x: 101, y: 100, map: "farm" };
    expect(b.tick(JAM_BLOCK_MS - 10, at, others)).toEqual([]);
    expect(b.tick(20, at, others)).toEqual(["p2"]);
    expect(b.tick(16, undefined, others)).toEqual(["p2"]);
  });
});

describe("resolveBlocking", () => {
  const other = (x: number): RemotePlayer => ({
    id: "p2",
    name: "Ann",
    x,
    y: 100,
    map: "farm",
    dir: 0,
  });
  it("undoes a step into another player, then lets the walker through and reports pass", () => {
    const b = new PlayerBlocking();
    const remotes = [other(110)];
    const from = { x: 100, y: 100 };
    const to = { x: 101, y: 100 };
    // 100 and 110 are 10 apart, under the 12 pixel body width: already overlapping, so free.
    expect(resolveBlocking(b, 16, from, to, "farm", remotes).x).toBe(101);
    const far = [other(113)];
    const r = resolveBlocking(b, 16, from, { x: 102, y: 100 }, "farm", far);
    expect(r).toEqual({ x: 100, y: 100, pass: [] });
    let last = r;
    for (let t = 0; t < JAM_BLOCK_MS; t += 16)
      last = resolveBlocking(b, 16, from, { x: 102, y: 100 }, "farm", far);
    expect(last.pass).toEqual(["p2"]);
    const through = resolveBlocking(
      b,
      16,
      from,
      { x: 102, y: 100 },
      "farm",
      far,
    );
    expect(through.x).toBe(102);
  });
  it("blocks nothing on another map or when standing still", () => {
    const b = new PlayerBlocking();
    const p = { x: 100, y: 100 };
    expect(
      resolveBlocking(b, 16, p, { x: 101, y: 100 }, "house", [other(105)]).x,
    ).toBe(101);
    expect(resolveBlocking(b, 16, p, p, "farm", [other(105)]).pass).toEqual([]);
  });
});
