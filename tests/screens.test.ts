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

describe("making: crafting, cooking, the furnace and machines (note 108, group 2)", () => {
  const stoveRef = (): ScreenRef => {
    for (let tier = maps.maxTier("house"); tier >= 0; tier--) {
      const s = maps
        .getWith("house", new Set(), tier)
        .services.find((v) => v.kind === "cooking");
      if (s) return { kind: "cooking", map: "house", x: s.x, y: s.y };
    }
    throw new Error("no stove");
  };
  const furnaceRef = (): ScreenRef => {
    const { s } = find(FARM, "furnace");
    return { kind: "furnace", map: FARM, x: s.x, y: s.y };
  };
  const benchRef = (t: ReturnType<typeof mk>): ScreenRef => {
    t.g.furniture.add("house", 8, 6, "workbench");
    return { kind: "crafting", map: "house", x: 8, y: 6 };
  };

  it("crafts at a workbench from the sender's pack and the chests beside it", () => {
    const t = mk();
    const ref = benchRef(t);
    const bench = { map: "house", x: ref.x, y: ref.y };
    t.g.chests.add("house", ref.x + 1, ref.y, "chest");
    t.g.chests.get("house", ref.x + 1, ref.y)!.items.add("wood", 40);
    t.g.players.get(t.ann).inventory.add("wood", 10);
    // Not opened yet, and the wrong bench.
    expect(t.send(t.ann, { kind: "craft", recipe: "chest", bench })).toBe(
      "open the screen first",
    );
    t.stand(t.ann, "house", ref.x, ref.y + 1);
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBeUndefined();
    expect(
      t.send(t.ann, {
        kind: "craft",
        recipe: "chest",
        bench: { ...bench, x: bench.x + 3 },
      }),
    ).toBe("not the screen you opened");
    expect(t.send(t.ann, { kind: "craft", recipe: "chest", bench })).toBe(
      undefined,
    );
    expect(t.g.players.get(t.ann).inventory.count("chest")).toBe(1);
    expect(t.g.players.get(t.ann).inventory.count("wood")).toBe(0);
    expect(t.g.chests.get("house", ref.x + 1, ref.y)!.items.count("wood")).toBe(
      0,
    );
    // The host's pack is untouched, and a second craft lacks the wood.
    expect(t.g.inventory.count("chest")).toBe(0);
    expect(t.send(t.ann, { kind: "craft", recipe: "chest", bench })).toBe(
      "missing ingredients",
    );
    // A bench is not a place to craft from far away.
    t.stand(t.ann, "house", ref.x + 9, ref.y);
    expect(t.send(t.ann, { kind: "craft", recipe: "chest", bench })).toBe(
      "too far away",
    );
  });

  it("crafts from the pack alone with no bench and no screen, as the sender", () => {
    const t = mk();
    t.g.players.get(t.bo).inventory.add("wood", 50);
    expect(t.send(t.bo, { kind: "craft", recipe: "chest" })).toBeUndefined();
    expect(t.g.players.get(t.bo).inventory.count("chest")).toBe(1);
    expect(t.send(t.bo, { kind: "craft", recipe: "nope" })).toBe(
      "no such recipe",
    );
    expect(t.send(t.bo, { kind: "craft", recipe: 5 as never })).toBe(
      "bad craft",
    );
  });

  it("refuses a workbench that is not one", () => {
    const t = mk();
    t.stand(t.ann, "house", 8, 7);
    expect(
      t.send(t.ann, {
        kind: "open",
        screen: { kind: "crafting", map: "house", x: 8, y: 6 },
      }),
    ).toBe("no workbench there");
  });

  it("cooks at the stove from the sender's pack, and needs the stove open", () => {
    const t = mk();
    t.g.houseTier = 1;
    const ref = stoveRef();
    t.g.players.get(t.ann).inventory.add("egg", 2);
    expect(t.send(t.ann, { kind: "cook", dish: "fried-egg" })).toBe(
      "open the screen first",
    );
    t.stand(t.ann, "house", ref.x, ref.y + 1);
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBeUndefined();
    expect(t.send(t.ann, { kind: "cook", dish: "fried-egg" })).toBeUndefined();
    expect(t.g.players.get(t.ann).inventory.count("fried-egg")).toBe(1);
    expect(t.g.players.get(t.ann).inventory.count("egg")).toBe(1);
    expect(t.g.inventory.count("fried-egg")).toBe(0);
    // Both guests may cook at once: the stove has no lock.
    t.stand(t.bo, "house", ref.x, ref.y + 1);
    expect(t.send(t.bo, { kind: "open", screen: ref })).toBeUndefined();
    expect(t.send(t.bo, { kind: "cook", dish: "fried-egg" })).toBe(
      "missing ingredients",
    );
    expect(t.send(t.ann, { kind: "cook", dish: "nope" })).toBe(
      "no such recipe",
    );
  });

  it("refuses cooking before the house has its kitchen", () => {
    const t = mk();
    t.g.houseTier = 0;
    const ref = stoveRef();
    t.g.players.get(t.ann).inventory.add("egg", 1);
    t.stand(t.ann, "house", ref.x, ref.y + 1);
    t.send(t.ann, { kind: "open", screen: ref });
    expect(t.send(t.ann, { kind: "cook", dish: "fried-egg" })).toBe(
      "no kitchen",
    );
  });

  it("shares the furnace: one player at a time, the bar goes to whoever takes it", () => {
    const t = mk();
    t.g.furnace.gifted = true;
    const ref = furnaceRef();
    const inv = t.g.players.get(t.ann).inventory;
    inv.add("copper-ore", 5);
    inv.add("coal", 1);
    t.stand(t.ann, FARM, ref.x, ref.y + 1);
    t.stand(t.bo, FARM, ref.x + 1, ref.y + 1);
    expect(t.send(t.ann, { kind: "smelt", bar: "copper-bar" })).toBe(
      "open the screen first",
    );
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBeUndefined();
    expect(t.send(t.bo, { kind: "open", screen: ref })).toBe(
      "Someone is using the furnace.",
    );
    expect(t.send(t.ann, { kind: "smelt", bar: "copper-bar" })).toBeUndefined();
    expect(t.g.furnace.job?.bar).toBe("copper-bar");
    expect(inv.count("copper-ore")).toBe(0);
    expect(t.send(t.ann, { kind: "furnace-take" })).toBe("not done");
    t.send(t.ann, { kind: "close" });
    // Bo opens it now, and takes Ann's finished bar: the goods go to the collector.
    t.g.furnace.job!.doneAt = 0;
    expect(t.send(t.bo, { kind: "open", screen: ref })).toBeUndefined();
    expect(t.send(t.bo, { kind: "furnace-take" })).toBeUndefined();
    expect(t.g.players.get(t.bo).inventory.count("copper-bar")).toBe(1);
    expect(inv.count("copper-bar")).toBe(0);
    expect(t.g.furnace.job).toBeUndefined();
    expect(t.send(t.bo, { kind: "furnace-take" })).toBe("nothing smelting");
  });

  it("frees the furnace when its holder drops", () => {
    const t = mk();
    t.g.furnace.gifted = true;
    const ref = furnaceRef();
    t.stand(t.ann, FARM, ref.x, ref.y + 1);
    t.stand(t.bo, FARM, ref.x + 1, ref.y + 1);
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBeUndefined();
    t.room.disconnect(t.ann);
    expect(t.send(t.bo, { kind: "open", screen: ref })).toBeUndefined();
  });

  it("anyone loads a machine and whoever collects gets the goods", () => {
    const t = mk();
    const at = { x: 6, y: 6 };
    t.g.machines.add({ id: "preserves-jar", ...at });
    t.stand(t.ann, FARM, 6, 7);
    t.stand(t.bo, FARM, 7, 7);
    t.g.players.get(t.ann).inventory.add("parsnip", 5);
    expect(
      t.send(t.ann, { kind: "machine-load", ...at, item: "parsnip" }),
    ).toBeUndefined();
    expect(t.g.machines.get(6, 6)!.job).toBeDefined();
    expect(t.g.players.get(t.ann).inventory.count("parsnip")).toBeLessThan(5);
    // Busy: neither a second load nor a collect before it is done.
    expect(t.send(t.bo, { kind: "machine-load", ...at, item: "parsnip" })).toBe(
      "machine busy",
    );
    expect(t.send(t.bo, { kind: "machine-collect", ...at })).toBe(
      "machine busy",
    );
    expect(t.g.machines.get(6, 6)).toBeDefined();
    const made = t.g.machines.get(6, 6)!.job!.output;
    t.g.machines.get(6, 6)!.job!.doneAt = 0;
    expect(t.send(t.bo, { kind: "machine-collect", ...at })).toBeUndefined();
    expect(t.g.players.get(t.bo).inventory.count(made)).toBe(1);
    expect(t.g.players.get(t.ann).inventory.count(made)).toBe(0);
    expect(t.g.inventory.count(made)).toBe(0);
    expect(t.send(t.bo, { kind: "machine-collect", ...at })).toBe(
      "machine empty",
    );
  });

  it("refuses machine actions from afar, with no machine, or for a good it will not take", () => {
    const t = mk();
    const at = { x: 6, y: 6 };
    t.stand(t.ann, FARM, 6, 7);
    t.g.players.get(t.ann).inventory.add("parsnip", 5);
    expect(
      t.send(t.ann, { kind: "machine-load", ...at, item: "parsnip" }),
    ).toBe("no machine here");
    t.g.machines.add({ id: "preserves-jar", ...at });
    expect(t.send(t.ann, { kind: "machine-load", ...at, item: "wood" })).toBe(
      "machine will not take that",
    );
    t.stand(t.ann, FARM, 20, 20);
    expect(
      t.send(t.ann, { kind: "machine-load", ...at, item: "parsnip" }),
    ).toBe("too far away");
    expect(t.send(t.ann, { kind: "machine-collect", ...at })).toBe(
      "too far away",
    );
  });
});
