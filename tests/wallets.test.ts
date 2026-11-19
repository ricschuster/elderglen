import { describe, expect, it } from "vitest";
import {
  newGame,
  serialize,
  deserialize,
  SAVE_VERSION,
} from "../src/core/save";
import { LOCAL_PLAYER } from "../src/core/players";

function stocked(mode: "shared" | "separate") {
  const g = newGame("standard", mode);
  g.players.add("p2", 100);
  g.players.get("p1").inventory.add("parsnip", 3);
  g.players.get("p2").inventory.add("parsnip", 5);
  g.bin.ship(g.players.get("p1").inventory, "parsnip", 3, 1, "p1");
  g.bin.ship(g.players.get("p2").inventory, "parsnip", 5, 1, "p2");
  return g;
}

describe("wallet modes and bin proceeds", () => {
  it("separate wallets pay each shipper their own lines", () => {
    const g = stocked("separate");
    const unit = g.bin.each()[0]!.unit;
    const before1 = g.players.get("p1").money;
    const s = g.bin.settle(g.players);
    expect(s.byPlayer).toEqual({ p1: 3 * unit, p2: 5 * unit });
    expect(g.players.get("p1").money).toBe(before1 + 3 * unit);
    expect(g.players.get("p2").money).toBe(100 + 5 * unit);
  });

  it("a shared wallet pools into one record", () => {
    const g = stocked("shared");
    const unit = g.bin.each()[0]!.unit;
    const before = g.players.get("p1").money;
    g.bin.settle(g.players);
    expect(g.players.get("p1").money).toBe(before + 8 * unit);
    expect(g.players.get("p2").money).toBe(100);
    g.players.localId = "p2";
    expect(g.money).toBe(before + 8 * unit);
  });

  it("lines of different shippers do not merge, and totals split", () => {
    const g = stocked("separate");
    expect(g.bin.each()).toHaveLength(2);
    expect(g.bin.total("p2")).toBe(5 * g.bin.each()[0]!.unit);
  });

  it("single player is unchanged", () => {
    const g = newGame();
    g.inventory.add("parsnip", 2);
    g.bin.ship(g.inventory, "parsnip", 2);
    const m = g.money;
    const s = g.bin.settle(g.players);
    expect(g.money).toBe(m + s.total);
    expect(g.players.walletMode).toBe("shared");
  });
});

describe("save version 4", () => {
  it("round trips the mode and the players", () => {
    const g = stocked("separate");
    g.players
      .get("p2")
      .skills.load({ ...g.players.get("p2").skills.save(), farming: 4 });
    g.players.get("p2").toolTiers.hoe = 2;
    const back = deserialize(serialize(g))!;
    expect(back.players.walletMode).toBe("separate");
    expect(back.players.ids).toEqual(["p1", "p2"]);
    expect(back.players.get("p2").money).toBe(100);
    expect(back.players.get("p2").skills.save().farming).toBe(4);
    expect(back.players.get("p2").toolTiers.hoe).toBe(2);
    expect(back.bin.each()).toHaveLength(2);
    expect(
      back.bin
        .each()
        .map((l) => l.by)
        .sort(),
    ).toEqual(["p1", "p2"]);
  });

  it("loads an old flat save as player p1 with a shared wallet", () => {
    const g = newGame();
    g.money = 777;
    g.inventory.add("parsnip", 4);
    const raw = JSON.parse(serialize(g));
    delete raw.players;
    delete raw.walletMode;
    for (const v of [2, 3]) {
      raw.version = v;
      const old = deserialize(JSON.stringify(raw))!;
      expect(old).toBeDefined();
      expect(old.players.ids).toEqual([LOCAL_PLAYER]);
      expect(old.players.walletMode).toBe("shared");
      expect(old.players.get("p1").money).toBe(777);
      expect(old.players.get("p1").inventory.count("parsnip")).toBe(4);
    }
    expect(SAVE_VERSION).toBe(4);
  });

  it("skips malformed player records and bad modes", () => {
    const raw = JSON.parse(serialize(newGame()));
    raw.walletMode = "weird";
    raw.players = [null, { id: 5 }, { id: "p1" }, { id: "p3", money: "x" }];
    const g = deserialize(JSON.stringify(raw))!;
    expect(g.players.walletMode).toBe("shared");
    expect(g.players.ids).toEqual(["p1", "p3"]);
  });
});
