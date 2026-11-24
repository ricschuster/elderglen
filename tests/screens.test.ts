import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { farmTypeById } from "../src/core/farmtypes";
import {
  MARKET_OPENS,
  marketEvening,
  marketHolds,
  marketStock,
  stallOf,
} from "../src/core/nightmarket";
import { ELDERFRUIT } from "../src/core/items";
import { GameRoomWorld } from "../src/core/roomworld";
import { Room } from "../src/core/room";
import { ensureTools, isToolId } from "../src/core/toolitems";
import { LOCAL_PLAYER } from "../src/core/players";
import { newGame } from "../src/core/save";
import { Inventory } from "../src/core/inventory";
import { applyServerMsg } from "../src/net/guestapply";
import { LOCKED_LINE, type ScreenRef } from "../src/core/screens";

const FARM = farmTypeById("standard").map;

function find(map: string, kind: string) {
  const s = maps.get(map).services.find((v) => v.kind === kind);
  if (!s) throw new Error(`no ${kind} on ${map}`);
  return { s, ts: maps.get(map).tileSize };
}

function mk(wallet: "shared" | "separate" = "separate") {
  const g = newGame("standard", wallet);
  // eslint-disable-next-line prefer-const
  let room!: Room;
  const world = new GameRoomWorld(g, {
    random: () => 0.5,
    where: (id) => room.position(id),
  });
  room = new Room(world);
  const ids = [room.join("Ann")!, room.join("Bo")!];
  for (const id of ids) {
    g.players.get(id).inventory.load(new Inventory().save());
    room.drain(id);
  }
  let seq = 1;
  /** Send an intent as `id`; the refusal reason, or undefined when the host applied it. */
  const send = (id: string, intent: Parameters<Room["hostIntent"]>[0]) => {
    room.drain(id);
    const n = seq++;
    room.receive(id, { t: "intent", seq: n, intent });
    const out = room.drain(id);
    const rej = out.find((m) => m.t === "rejected" && m.seq === n);
    return rej?.t === "rejected" ? rej.reason : undefined;
  };
  const stand = (id: string, map: string, tx: number, ty: number) => {
    const ts = maps.ids.includes(map) ? maps.get(map).tileSize : 16;
    room.receive(id, {
      t: "pos",
      x: (tx + 0.5) * ts,
      y: (ty + 1) * ts - 2,
      map,
      ts: 0,
    });
  };
  return { g, world, room, ids, send, stand, ann: ids[0]!, bo: ids[1]! };
}

const shopRef = (): ScreenRef => {
  const { s } = find("general-store", "shop");
  return { kind: "shop", map: "general-store", x: s.x, y: s.y };
};
const binRef = (): ScreenRef => {
  const { s } = find(FARM, "bin");
  return { kind: "bin", map: FARM, x: s.x, y: s.y, ore: false };
};

describe("opening a screen (note 108)", () => {
  it("refuses an open from too far away and a bad ref", () => {
    const t = mk();
    const r = shopRef();
    t.stand(t.ann, "general-store", r.x + 9, r.y);
    expect(t.send(t.ann, { kind: "open", screen: r })).toBe("too far away");
    t.stand(t.ann, FARM, r.x, r.y);
    expect(t.send(t.ann, { kind: "open", screen: r })).toBe("too far away");
    t.stand(t.ann, "general-store", r.x, r.y + 1);
    expect(t.send(t.ann, { kind: "open", screen: r })).toBeUndefined();
    expect(t.send(t.ann, { kind: "open", screen: { kind: "shop" } })).toBe(
      "bad open",
    );
    expect(
      t.send(t.ann, { kind: "open", screen: { ...r, x: r.x + 1, y: r.y + 3 } }),
    ).toBe("no service there");
  });

  it("takes a chest lock for one player, frees it on close, leave and drop", () => {
    const t = mk();
    t.g.chests.add(FARM, 5, 5, "chest");
    const ref: ScreenRef = { kind: "chest", map: FARM, x: 5, y: 5 };
    t.stand(t.ann, FARM, 5, 6);
    t.stand(t.bo, FARM, 6, 5);
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBeUndefined();
    expect(t.send(t.bo, { kind: "open", screen: ref })).toBe(LOCKED_LINE);
    // Opening it again is fine for the holder.
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBeUndefined();
    t.send(t.ann, { kind: "close" });
    expect(t.send(t.bo, { kind: "open", screen: ref })).toBeUndefined();
    t.room.disconnect(t.bo);
    expect(t.world.screens.current(t.bo)).toBeUndefined();
    t.stand(t.ann, FARM, 5, 6);
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBeUndefined();
    t.room.receive(t.ann, { t: "leave" });
    expect(t.world.screens.holder(t.g, ref)).toBeUndefined();
  });

  it("locks the host out of a chest a guest is using, and the guest out of the host's", () => {
    const t = mk();
    t.g.chests.add(FARM, 5, 5, "chest");
    const ref: ScreenRef = { kind: "chest", map: FARM, x: 5, y: 5 };
    t.stand(t.ann, FARM, 5, 6);
    t.send(t.ann, { kind: "open", screen: ref });
    t.stand(LOCAL_PLAYER, FARM, 5, 4);
    expect(t.room.hostIntent({ kind: "open", screen: ref })).toBe(LOCKED_LINE);
    t.send(t.ann, { kind: "close" });
    expect(t.room.hostIntent({ kind: "open", screen: ref })).toBeUndefined();
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBe(LOCKED_LINE);
  });
});

describe("shops", () => {
  it("needs the shop open, then buys and sells from the sender's own purse", () => {
    const t = mk();
    const r = shopRef();
    t.g.players.get(t.ann).money = 500;
    t.g.players.get(t.bo).money = 500;
    expect(t.send(t.ann, { kind: "buy", id: "parsnip-seed", n: 1 })).toBe(
      "open the screen first",
    );
    t.stand(t.ann, "general-store", r.x, r.y + 1);
    t.send(t.ann, { kind: "open", screen: r });
    const before = t.g.players.get(t.ann).money;
    const season = ["parsnip-seed", "bean-seed", "potato-seed"];
    const id = season.find((s) => !t.send(t.ann, { kind: "buy", id: s, n: 1 }));
    expect(id).toBeDefined();
    expect(t.g.players.get(t.ann).money).toBeLessThan(before);
    expect(t.g.players.get(t.bo).money).toBe(500);
    expect(t.send(t.ann, { kind: "buy", id: "iron-ore", n: 1 })).toBe(
      "That is not on sale here.",
    );
    expect(t.send(t.ann, { kind: "buy", id: id!, n: 100000 })).toBeDefined();
    t.g.players.get(t.ann).inventory.add("parsnip", 2);
    const gold = t.g.players.get(t.ann).money;
    expect(
      t.send(t.ann, { kind: "sell", id: "parsnip", n: 2 }),
    ).toBeUndefined();
    expect(t.g.players.get(t.ann).money).toBeGreaterThan(gold);
  });

  it("refuses an action from a player who walked away", () => {
    const t = mk();
    const r = shopRef();
    t.g.players.get(t.ann).inventory.add("parsnip", 1);
    t.stand(t.ann, "general-store", r.x, r.y + 1);
    t.send(t.ann, { kind: "open", screen: r });
    t.stand(t.ann, "general-store", r.x + 9, r.y + 1);
    expect(t.send(t.ann, { kind: "sell", id: "parsnip", n: 1 })).toBe(
      "too far away",
    );
  });

  it("shares a one-off stock: after one player buys the hermit's elderfruit it is gone for all", () => {
    const t = mk();
    const { s } = find("hermit-tower", "hermit");
    const ref: ScreenRef = {
      kind: "shop",
      map: "hermit-tower",
      x: s.x,
      y: s.y,
      stock: "hermit",
    };
    for (const id of t.ids) {
      t.g.players.get(id).money = 50000;
      t.stand(id, "hermit-tower", s.x, s.y + 1);
      expect(t.send(id, { kind: "open", screen: ref })).toBeUndefined();
    }
    expect(
      t.send(t.ann, { kind: "buy", id: ELDERFRUIT, n: 1, stock: "hermit" }),
    ).toBeUndefined();
    expect(t.g.players.get(t.ann).money).toBe(30000);
    expect(
      t.send(t.bo, { kind: "buy", id: ELDERFRUIT, n: 1, stock: "hermit" }),
    ).toBe("That is not on sale here.");
    expect(t.g.players.get(t.bo).money).toBe(50000);
    // A buy that names another counter than the open one is turned away.
    expect(t.send(t.bo, { kind: "buy", id: "parsnip-seed", n: 1 })).toBe(
      "not the screen you opened",
    );
  });

  it("carries the stock field to a guest's copy so both farms agree", () => {
    const t = mk();
    const copy = newGame("standard", "separate");
    copy.players.add(t.ann, 0);
    copy.players.get(t.ann).money = 50000;
    expect(
      applyServerMsg(copy, {
        t: "applied",
        seq: 1,
        by: t.ann,
        intent: { kind: "buy", id: ELDERFRUIT, n: 1, stock: "hermit" },
      }),
    ).toBe(true);
    expect(copy.players.get(t.ann).money).toBe(30000);
  });
});

describe("the shipping bin", () => {
  it("needs the bin open and the right bin, and credits the shipper", () => {
    const t = mk();
    const r = binRef();
    t.g.players.get(t.ann).inventory.add("parsnip", 4);
    expect(t.send(t.ann, { kind: "ship", id: "parsnip", n: 1 })).toBe(
      "open the screen first",
    );
    t.stand(t.ann, FARM, r.x, r.y + 1);
    expect(t.send(t.ann, { kind: "open", screen: r })).toBeUndefined();
    expect(
      t.send(t.ann, { kind: "ship", id: "parsnip", n: 3 }),
    ).toBeUndefined();
    expect(t.g.bin.each()[0]?.by).toBe(t.ann);
    expect(
      t.send(t.ann, { kind: "ship", id: "parsnip", n: 1, ore: true }),
    ).toBe("not this bin");
    expect(t.send(t.bo, { kind: "take-back", index: 0, n: 1 })).toBe(
      "open the screen first",
    );
  });
});

describe("chests", () => {
  const ref: ScreenRef = { kind: "chest", map: FARM, x: 5, y: 5 };
  const chest = { map: FARM, x: 5, y: 5 };

  function withChest() {
    const t = mk();
    t.g.chests.add(FARM, 5, 5, "chest");
    t.stand(t.ann, FARM, 5, 6);
    t.stand(t.bo, FARM, 6, 5);
    t.send(t.ann, { kind: "open", screen: ref });
    return t;
  }

  it("moves stacks between the pack and the chest as the host judges them", () => {
    const t = withChest();
    const pack = t.g.players.get(t.ann).inventory;
    pack.add("parsnip", 7);
    const slot = pack.save().findIndex((s) => s?.id === "parsnip");
    expect(
      t.send(t.ann, {
        kind: "chest-move",
        chest,
        from: "pack",
        slot,
        to: "chest",
        toSlot: 2,
        half: false,
      }),
    ).toBeUndefined();
    expect(t.g.chests.get(FARM, 5, 5)!.items.slot(2)).toEqual({
      id: "parsnip",
      count: 7,
    });
    expect(pack.count("parsnip")).toBe(0);
    expect(
      t.send(t.ann, {
        kind: "chest-send",
        chest,
        side: "chest",
        slot: 2,
        most: 3,
      }),
    ).toBeUndefined();
    expect(pack.count("parsnip")).toBe(3);
    expect(t.send(t.ann, { kind: "chest-fill", chest })).toBeUndefined();
    expect(t.g.chests.get(FARM, 5, 5)!.items.slot(2)?.count).toBe(7);
    expect(t.send(t.ann, { kind: "chest-sort", chest })).toBeUndefined();
    expect(
      t.send(t.ann, { kind: "chest-colour", chest, colour: 3 }),
    ).toBeUndefined();
    expect(t.g.chests.get(FARM, 5, 5)!.colour).toBe(3);
  });

  it("refuses bad moves, tools, another chest, a locked-out player and a walk-away", () => {
    const t = withChest();
    t.g.chests.add(FARM, 9, 9, "chest");
    const pack = t.g.players.get(t.ann).inventory;
    ensureTools(pack);
    const tool = pack.save().findIndex((s) => s && isToolId(s.id));
    expect(
      t.send(t.ann, {
        kind: "chest-move",
        chest,
        from: "pack",
        slot: tool,
        to: "chest",
        toSlot: 0,
      }),
    ).toBe("That will not go there.");
    expect(
      t.send(t.ann, {
        kind: "chest-move",
        chest,
        from: "nowhere",
        slot: 0,
        to: "chest",
        toSlot: 0,
      }),
    ).toBe("bad chest-move");
    expect(
      t.send(t.ann, {
        kind: "chest-send",
        chest: { map: FARM, x: 9, y: 9 },
        side: "pack",
        slot: 0,
      }),
    ).toBe("not the screen you opened");
    expect(t.send(t.bo, { kind: "chest-sort", chest })).toBe(
      "open the screen first",
    );
    expect(t.send(t.ann, { kind: "chest-colour", chest, colour: 99 })).toBe(
      "bad colour",
    );
    t.stand(t.ann, FARM, 30, 30);
    expect(t.send(t.ann, { kind: "chest-sort", chest })).toBe("too far away");
  });

  it("a second player's move shows on a guest copy through applied", () => {
    const t = withChest();
    const copy = newGame("standard", "separate");
    copy.players.add(t.ann, 0);
    copy.chests.add(FARM, 5, 5, "chest");
    copy.players.get(t.ann).inventory.add("parsnip", 2);
    expect(
      applyServerMsg(copy, {
        t: "applied",
        seq: 1,
        by: t.ann,
        intent: {
          kind: "chest-send",
          chest,
          side: "pack",
          slot: copy.players
            .get(t.ann)
            .inventory.save()
            .findIndex((s) => s?.id === "parsnip"),
        },
      }),
    ).toBe(true);
    expect(copy.chests.get(FARM, 5, 5)!.items.slot(0)?.id).toBe("parsnip");
  });
});

describe("the camp chest", () => {
  const ref: ScreenRef = {
    kind: "camp-chest",
    map: "mine-10",
    x: 3,
    y: 3,
    floor: 10,
  };

  it("gives its one gift to the first guest who takes it, then is empty for the rest", () => {
    const t = mk();
    t.stand(t.ann, "mine-10", 3, 3);
    t.stand(t.bo, "mine-10", 3, 3);
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBeUndefined();
    expect(t.send(t.bo, { kind: "open", screen: ref })).toBe(LOCKED_LINE);
    expect(t.send(t.ann, { kind: "camp-take", floor: 10 })).toBeUndefined();
    expect(t.send(t.ann, { kind: "camp-take", floor: 10 })).toBe(
      "camp chest empty",
    );
    t.send(t.ann, { kind: "close" });
    expect(t.send(t.bo, { kind: "open", screen: ref })).toBeUndefined();
    expect(t.send(t.bo, { kind: "camp-take", floor: 10 })).toBe(
      "camp chest empty",
    );
    expect(t.send(t.bo, { kind: "camp-take", floor: 20 })).toBe(
      "not the screen you opened",
    );
  });

  it("refuses a floor that has no camp chest", () => {
    const t = mk();
    t.stand(t.ann, "mine-7", 3, 3);
    expect(
      t.send(t.ann, {
        kind: "open",
        screen: { ...ref, map: "mine-7", floor: 7 },
      }),
    ).toBe("no camp chest there");
  });
});

describe("Night Market stalls", () => {
  it("buy through the host, from the sender purse only", () => {
    const t = mk();
    let day = 1;
    while (marketEvening(day) === 0) day++;
    t.g.day.clock.day = day;
    t.g.day.clock.minutes = Math.ceil((MARKET_OPENS + 30) / 10) * 10;
    const map = maps.getWith("hearthwell", new Set(marketHolds(day)));
    const svc = map.services.find(
      (s) => s.kind === "market-stall" && stallOf(s.id) === "curio",
    )!;
    const ref: ScreenRef = {
      kind: "market",
      map: "hearthwell",
      x: svc.x,
      y: svc.y,
      stock: "curio",
    };
    const lines = marketStock("curio", day);
    const line = lines.findIndex((e) => e.item && e.price > 0);
    for (const id of t.ids) {
      t.g.players.get(id).money = 99999;
      t.stand(id, "hearthwell", svc.x, svc.y + 1);
      expect(t.send(id, { kind: "open", screen: ref })).toBeUndefined();
    }
    expect(line).toBeGreaterThanOrEqual(0);
    expect(
      t.send(t.ann, { kind: "market-buy", stall: "curio", line }),
    ).toBeUndefined();
    expect(t.g.players.get(t.ann).money).toBeLessThan(99999);
    expect(t.g.players.get(t.bo).money).toBe(99999);
    expect(
      t.send(t.bo, { kind: "market-buy", stall: "lantern", line: 0 }),
    ).toBe("not the screen you opened");
  });
});
