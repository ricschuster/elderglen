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
import { deserialize, newGame, serialize } from "../src/core/save";
import { endDayOrders } from "../src/core/orders";
import { requestFor } from "../src/core/quests";
import { Inventory } from "../src/core/inventory";
import { applyServerMsg } from "../src/net/guestapply";
import { LOCKED_LINE, type ScreenRef } from "../src/core/screens";
import { CHICKEN_PRICE, HAY_PRICE, type Animal } from "../src/core/animals";
import { applyScreenIntent } from "../src/core/screenintents";
import { FARM_STORE } from "../src/core/mapstore";
import { pondAt, putFish } from "../src/core/pond";
import { FISH_POND } from "../src/core/pondsite";
import { HOME_LINE } from "../src/core/restintents";
import { stationStock } from "../src/core/furniture";
import { DECOR } from "../src/core/decor";
import { setFlag } from "../src/core/worldflags";
import { TAILORING_OPEN, POT_COLOURS } from "../src/core/tailoring";
import { FORGED } from "../src/core/combat";
import { BOMBS } from "../src/core/bombs";
import { GEODE, CRACK_FEE } from "../src/core/geodes";
import { GALLERY_IDS } from "../src/core/gallery";
import { DIAMOND } from "../src/core/gems";

/** A grown chicken that is hungry and not petted. */
const mkAnimal = (id: number): Animal => ({
  id,
  species: "chicken",
  name: `Hen${id}`,
  age: 10,
  friendship: 0,
  mood: 128,
  fed: false,
  petted: false,
  outside: false,
  fresh: false,
  grazed: false,
  lay: 0,
});

const FARM = farmTypeById("standard").map;

function find(map: string, kind: string) {
  const s = maps.get(map).services.find((v) => v.kind === kind);
  if (!s) throw new Error(`no ${kind} on ${map}`);
  return { s, ts: maps.get(map).tileSize };
}

function mk(wallet: "shared" | "separate" = "separate") {
  const g = newGame("standard", wallet);
  // Midday, so the shops keep their doors open.
  g.day.clock.minutes = 12 * 60;
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

  it("keeps the shop's hours on the host: no open before opening, no buy after closing", () => {
    const t = mk();
    const r = shopRef();
    t.g.players.get(t.ann).money = 500;
    t.stand(t.ann, "general-store", r.x, r.y + 1);
    t.g.day.clock.minutes = 6 * 60;
    expect(t.send(t.ann, { kind: "open", screen: r })).toMatch(/opens at/);
    t.g.day.clock.minutes = 12 * 60;
    expect(t.send(t.ann, { kind: "open", screen: r })).toBeUndefined();
    t.g.day.clock.minutes = 23 * 60;
    expect(t.send(t.ann, { kind: "buy", id: "parsnip-seed", n: 1 })).toMatch(
      /shut/,
    );
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

describe("animals and ponds (note 108, group 3)", () => {
  /** A service of this kind on a map, at any building tier. */
  const serviceRef = (map: string, kind: string): ScreenRef => {
    for (let tier = maps.maxTier(map); tier >= 0; tier--) {
      const s = maps
        .getWith(map, new Set(), tier)
        .services.find((v) => v.kind === kind);
      if (s) return { kind, map, x: s.x, y: s.y };
    }
    throw new Error(`no ${kind} on ${map}`);
  };
  const farm = (t: ReturnType<typeof mk>) => {
    t.g.animals.coopBuilt = true;
    t.g.animals.barnBuilt = true;
    t.g.animals.silo = true;
  };
  const openAt = (t: ReturnType<typeof mk>, id: string, ref: ScreenRef) => {
    t.stand(id, ref.map, ref.x, ref.y + 1);
    return t.send(id, { kind: "open", screen: ref });
  };
  const bought = (t: ReturnType<typeof mk>, who: string) => {
    const keeper = serviceRef("forest-farmstead", "keeper");
    expect(openAt(t, who, keeper)).toBeUndefined();
  };

  it("buys a young animal at the keeper from the sender's purse; it goes to the shared coop", () => {
    const t = mk();
    farm(t);
    t.g.players.get(t.ann).money = 1000;
    const buy = { kind: "keeper-buy", what: "animal", species: "chicken" };
    expect(t.send(t.ann, { ...buy, name: "Pip" })).toBe(
      "open the screen first",
    );
    bought(t, t.ann);
    expect(t.send(t.ann, { ...buy, name: "Pip" })).toBeUndefined();
    expect(t.g.players.get(t.ann).money).toBe(1000 - CHICKEN_PRICE);
    expect(t.g.players.get(t.bo).money).toBe(t.g.players.get(t.bo).money);
    const a = t.g.animals.animals.at(-1)!;
    expect(a.name).toBe("Pip");
    // Not enough gold left, a bad species, and a walk away.
    expect(t.send(t.ann, { ...buy, name: "Two" })).toMatch(/more/);
    expect(t.send(t.ann, { ...buy, species: "dragon" })).toBe("bad keeper-buy");
    t.stand(t.ann, "forest-farmstead", 0, 0);
    expect(t.send(t.ann, { ...buy, name: "Far" })).toBe("too far away");
  });

  it("refuses an animal when the building is missing, and sells hay, a heater and decor to the sender's pack", () => {
    const t = mk();
    t.g.players.get(t.bo).money = 5000;
    bought(t, t.bo);
    expect(
      t.send(t.bo, { kind: "keeper-buy", what: "animal", species: "chicken" }),
    ).toBe("You need a coop first.");
    farm(t);
    expect(
      t.send(t.bo, { kind: "keeper-buy", what: "hay", n: 10 }),
    ).toBeUndefined();
    expect(t.g.players.get(t.bo).inventory.count("hay")).toBe(10);
    expect(t.g.players.get(t.bo).money).toBe(5000 - 10 * HAY_PRICE);
    expect(t.g.inventory.count("hay")).toBe(0);
    expect(
      t.send(t.bo, { kind: "keeper-buy", what: "heater" }),
    ).toBeUndefined();
    expect(t.g.players.get(t.bo).inventory.count("coop-heater")).toBe(1);
    expect(t.send(t.bo, { kind: "keeper-buy", what: "nope" })).toBe(
      "bad keeper-buy",
    );
  });

  it("feeds from the silo, then the feeder's pack; the hopper takes the feeder's hay", () => {
    const t = mk();
    farm(t);
    for (let i = 0; i < 3; i++) t.g.animals.animals.push(mkAnimal(i + 1));
    t.g.animals.hay = 1;
    t.g.players.get(t.ann).inventory.add("hay", 5);
    const ref = serviceRef("coop", "coop-bench");
    const feed = { kind: "bench-feed", building: "coop" };
    expect(t.send(t.ann, feed)).toBe("open the screen first");
    expect(openAt(t, t.ann, ref)).toBeUndefined();
    // The wrong building for this bench.
    expect(t.send(t.ann, { ...feed, building: "barn" })).toBe(
      "not the screen you opened",
    );
    expect(t.send(t.ann, feed)).toBeUndefined();
    expect(t.g.animals.animals.every((a) => a.fed)).toBe(true);
    expect(t.g.animals.hay).toBe(0);
    expect(t.g.players.get(t.ann).inventory.count("hay")).toBe(3);
    expect(t.send(t.ann, feed)).toBe("Everyone has eaten.");
    expect(
      t.send(t.ann, { kind: "bench-fill", building: "coop" }),
    ).toBeUndefined();
    expect(t.g.animals.hay).toBe(3);
    expect(t.g.players.get(t.ann).inventory.count("hay")).toBe(0);
    expect(t.send(t.ann, { kind: "bench-fill", building: "coop" })).toBe(
      "No hay to tip in, or the silo is full.",
    );
  });

  it("lets anyone pet once a day, and the product goes to whoever collects", () => {
    const t = mk();
    farm(t);
    const an = mkAnimal(1);
    an.product = "normal";
    t.g.animals.animals.push(an);
    const ref = serviceRef("coop", "coop-bench");
    expect(openAt(t, t.ann, ref)).toBeUndefined();
    expect(openAt(t, t.bo, ref)).toBeUndefined();
    const at = { building: "coop", animal: 1 };
    expect(t.send(t.ann, { kind: "animal-pet", ...at })).toBeUndefined();
    expect(t.send(t.bo, { kind: "animal-pet", ...at })).toBe(
      "Already petted today.",
    );
    expect(t.send(t.bo, { kind: "animal-take", ...at })).toBeUndefined();
    expect(t.g.players.get(t.bo).inventory.count("egg")).toBe(1);
    expect(t.g.players.get(t.ann).inventory.count("egg")).toBe(0);
    expect(t.send(t.ann, { kind: "animal-take", ...at })).toBe(
      "Nothing to take there.",
    );
    // A full pack keeps the product.
    an.product = "normal";
    const full = t.g.players.get(t.ann).inventory;
    while (full.add("stone"));
    expect(t.send(t.ann, { kind: "animal-take", ...at })).toBe(
      "Your pack is full.",
    );
    expect(an.product).toBe("normal");
    // No such animal, one from the other building, and the name.
    expect(
      t.send(t.ann, { kind: "animal-pet", building: "coop", animal: 99 }),
    ).toBe("No such animal.");
    expect(
      t.send(t.ann, { kind: "animal-pet", building: "barn", animal: 1 }),
    ).toBe("not the screen you opened");
    expect(
      t.send(t.bo, { kind: "animal-name", ...at, name: "Dot" }),
    ).toBeUndefined();
    expect(an.name).toBe("Dot");
  });

  it("lets an animal out and in", () => {
    const t = mk();
    farm(t);
    t.g.animals.animals.push(mkAnimal(1));
    t.g.weather = "sunny";
    expect(openAt(t, t.ann, serviceRef("coop", "coop-bench"))).toBeUndefined();
    const at = { building: "coop", animal: 1 };
    expect(t.send(t.ann, { kind: "animal-in", ...at })).toBe(
      "It is not outside.",
    );
    expect(t.send(t.ann, { kind: "animal-out", ...at })).toBeUndefined();
    expect(t.g.animals.animals[0]!.outside).toBe(true);
    expect(t.send(t.ann, { kind: "animal-out", ...at })).toBe(
      "Hen1 is already out.",
    );
    expect(t.send(t.ann, { kind: "animal-in", ...at })).toBeUndefined();
    expect(t.g.animals.animals[0]!.outside).toBe(false);
  });

  it("opens a pond for one player at a time and empties it into the sender's pack", () => {
    const t = mk();
    expect(
      t.g.placed.add(FARM_STORE, {
        x: 20,
        y: 20,
        id: FISH_POND,
        state: { building: 0, count: 0, capLevel: 0 },
      }),
    ).toBe(true);
    const pond = pondAt(t.g, 20, 20)!;
    t.g.inventory.add("carp");
    expect(putFish(t.g, 20, 20, "carp").ok).toBe(true);
    const ref: ScreenRef = { kind: "pond", map: FARM, x: 20, y: 20 };
    // Reach is the pond's whole edge: the far side counts.
    t.stand(t.ann, FARM, 24, 22);
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBeUndefined();
    t.stand(t.bo, FARM, 19, 22);
    expect(t.send(t.bo, { kind: "open", screen: ref })).toBe(
      "Someone is using the pond.",
    );
    const empty = { kind: "pond-empty", pond: { x: 20, y: 20 } };
    expect(t.send(t.bo, empty)).toBe("open the screen first");
    expect(t.send(t.ann, { ...empty, pond: { x: 21, y: 20 } })).toBe(
      "not the screen you opened",
    );
    expect(pond).toBeDefined();
    expect(t.send(t.ann, empty)).toBeUndefined();
    expect(t.g.players.get(t.ann).inventory.count("carp")).toBe(1);
    expect(t.send(t.ann, empty)).toBe("There is no fish to take.");
    t.stand(t.ann, FARM, 30, 30);
    expect(t.send(t.ann, empty)).toBe("too far away");
    t.send(t.ann, { kind: "close" });
    expect(t.send(t.bo, { kind: "open", screen: ref })).toBeUndefined();
    expect(
      t.send(t.bo, {
        kind: "open",
        screen: { kind: "pond", map: FARM, x: 21, y: 20 },
      }),
    ).toBe("no pond there");
  });

  it("puts a held fish in and takes a waiting product through pond-use, as the sender", () => {
    const t = mk();
    t.g.placed.add(FARM_STORE, {
      x: 20,
      y: 20,
      id: FISH_POND,
      state: { building: 0, count: 0, capLevel: 0 },
    });
    t.g.players.get(t.bo).inventory.add("carp", 2);
    // Too far, then close.
    t.stand(t.bo, FARM, 30, 30);
    expect(t.send(t.bo, { kind: "pond-use", x: 21, y: 21, item: "carp" })).toBe(
      "too far away",
    );
    t.stand(t.bo, FARM, 19, 21);
    expect(
      t.send(t.bo, { kind: "pond-use", x: 20, y: 21, item: "carp" }),
    ).toBeUndefined();
    expect(pondAt(t.g, 20, 20)!.state).toMatchObject({ count: 1 });
    expect(t.g.players.get(t.bo).inventory.count("carp")).toBe(1);
    expect(t.g.inventory.count("carp")).toBe(0);
    // Nothing to do with no fish held and nothing waiting; no pond on a bare tile.
    expect(t.send(t.bo, { kind: "pond-use", x: 20, y: 21 })).toBe(
      "The pond has nothing to take or give.",
    );
    expect(t.send(t.bo, { kind: "pond-use", x: 5, y: 5 })).toBe("too far away");
    t.stand(t.bo, FARM, 5, 6);
    expect(t.send(t.bo, { kind: "pond-use", x: 5, y: 5 })).toBe("no pond here");
    // A waiting product goes to the taker.
    const p = pondAt(t.g, 20, 20)!;
    p.state = { ...p.state, out: { item: "carp", count: 1 } };
    t.stand(t.ann, FARM, 19, 21);
    expect(t.send(t.ann, { kind: "pond-use", x: 20, y: 21 })).toBeUndefined();
    expect(t.g.players.get(t.ann).inventory.count("carp")).toBe(1);
  });

  it("works in single player: the same intents run on the host's own state", () => {
    const g = newGame("standard");
    g.animals.coopBuilt = true;
    g.money = 5000;
    expect(
      applyScreenIntent(g, LOCAL_PLAYER, {
        kind: "keeper-buy",
        what: "animal",
        species: "chicken",
        name: "Solo",
      }),
    ).toBeUndefined();
    expect(g.animals.animals[0]!.name).toBe("Solo");
    expect(
      applyScreenIntent(g, LOCAL_PLAYER, {
        kind: "animal-pet",
        building: "coop",
        animal: 1,
      }),
    ).toBeUndefined();
  });
});

describe("the hall: bundles, orders and the request board (note 108, group 4)", () => {
  const hallRef = (room: string): ScreenRef => {
    const s = maps.get("hall").services.find((v) => v.id === room)!;
    return { kind: "hall", map: "hall", x: s.x, y: s.y, room };
  };
  const boardRef = (kind: "orders" | "requests"): ScreenRef => {
    const s = maps.get("hearthwell").services.find((v) => v.kind === kind)!;
    return { kind, map: "hearthwell", x: s.x, y: s.y };
  };
  const openAt = (t: ReturnType<typeof mk>, id: string, ref: ScreenRef) => {
    t.stand(id, ref.map, ref.x, ref.y + 1);
    return t.send(id, { kind: "open", screen: ref });
  };
  const ROOM = "foragers-shelf";
  /** Mark a bundle finished without a reward (test setup). */
  const finish = (g: ReturnType<typeof mk>["g"], id: string) => {
    const def = g.hall.bundles.find((b) => b.id === id)!;
    const given = (
      g.hall as unknown as { given: Map<string, Map<string, number>> }
    ).given;
    given.set(id, new Map(def.items.map((i) => [i.id, i.count] as const)));
  };
  const give = (bundle: string, item: string, room = ROOM) =>
    ({ kind: "bundle-give", room, bundle, item }) as const;

  it("hands in from the sender's pack, and the finisher alone gets the reward", () => {
    const t = mk();
    const { g } = t;
    const ann = g.players.get(t.ann);
    const bo = g.players.get(t.bo);
    for (const id of ["daffodil", "leek", "dandelion", "horseradish"]) {
      ann.inventory.add(id);
      bo.inventory.add(id);
    }
    // Not at the scroll, or not the screen you opened.
    expect(t.send(t.ann, give("spring-foraging", "daffodil"))).toBe(
      "open the screen first",
    );
    expect(openAt(t, t.ann, hallRef("larder"))).toBeUndefined();
    expect(t.send(t.ann, give("spring-foraging", "daffodil"))).toBe(
      "not the screen you opened",
    );
    expect(openAt(t, t.ann, hallRef(ROOM))).toBeUndefined();
    expect(openAt(t, t.bo, hallRef(ROOM))).toBeUndefined();
    // A bundle of another room is refused through this room's scroll.
    expect(t.send(t.ann, give("spring-crops", "parsnip"))).toBe(
      "not in this room",
    );
    // Ann gives two, Bo gives one, Ann a good she does not have.
    expect(t.send(t.ann, give("spring-foraging", "daffodil"))).toBeUndefined();
    expect(t.send(t.ann, give("spring-foraging", "leek"))).toBeUndefined();
    expect(t.send(t.bo, give("spring-foraging", "dandelion"))).toBeUndefined();
    expect(t.send(t.ann, give("spring-foraging", "salmonberry"))).toBe(
      "You do not have one.",
    );
    expect(t.send(t.bo, give("spring-foraging", "daffodil"))).toBe(
      "Already handed in.",
    );
    expect(ann.inventory.count("daffodil")).toBe(0);
    expect(bo.inventory.count("dandelion")).toBe(0);
    expect(g.hall.complete("spring-foraging")).toBe(false);
    // Bo hands in the last good: the seeds go to Bo only.
    expect(
      t.send(t.bo, give("spring-foraging", "horseradish")),
    ).toBeUndefined();
    expect(g.hall.complete("spring-foraging")).toBe(true);
    expect(bo.inventory.count("parsnip-seed")).toBe(15);
    expect(ann.inventory.count("parsnip-seed")).toBe(0);
    expect(t.send(t.ann, give("spring-foraging", "horseradish"))).toBe(
      "That bundle is already done.",
    );
  });

  it("pays a bundle's gold to the finisher's own purse", () => {
    const t = mk("separate");
    const { g } = t;
    finish(g, "spring-foraging"); // opens the Larder
    const def = g.hall.bundles.find((b) => b.id === "spring-crops")!;
    expect(g.hall.roomOpen(def.room)).toBe(true);
    const ann = g.players.get(t.ann);
    const bo = g.players.get(t.bo);
    for (const s of def.items) bo.inventory.add(s.id, s.count);
    expect(openAt(t, t.bo, hallRef(def.room))).toBeUndefined();
    const was = [g.players.get(LOCAL_PLAYER).money, ann.money, bo.money];
    for (const s of def.items)
      for (let i = 0; i < s.count; i++)
        expect(t.send(t.bo, give(def.id, s.id, def.room))).toBeUndefined();
    expect(g.hall.complete(def.id)).toBe(true);
    expect(bo.money).toBe(was[2]! + def.reward.money!);
    expect(ann.money).toBe(was[1]);
    expect(g.players.get(LOCAL_PLAYER).money).toBe(was[0]);
  });

  it("refuses a room that is not open yet", () => {
    const t = mk();
    t.g.players.get(t.ann).inventory.add("parsnip");
    expect(openAt(t, t.ann, hallRef("hearth"))).toBeUndefined();
    expect(t.send(t.ann, give("hearth-bundle", "parsnip", "hearth"))).toBe(
      "There is no such bundle.",
    );
    const def = t.g.hall.bundlesIn("hearth")[0]!;
    t.g.players.get(t.ann).inventory.add(def.items[0]!.id);
    expect(t.send(t.ann, give(def.id, def.items[0]!.id, "hearth"))).toBe(
      "That room is not open yet.",
    );
  });

  it("takes a hat from a finished bundle's set", () => {
    const t = mk();
    const def = t.g.hall.bundles.find((b) => b.reward.hats)!;
    const hats = def.reward.hats!;
    expect(openAt(t, t.ann, hallRef(def.room))).toBeUndefined();
    const hat = { kind: "bundle-hat", room: def.room, bundle: def.id } as const;
    expect(t.send(t.ann, { ...hat, hat: hats.from[0]! })).toBe(
      "You cannot take that hat.",
    );
    finish(t.g, def.id);
    expect(t.send(t.ann, { ...hat, hat: hats.from[0]! })).toBeUndefined();
    expect(t.g.wardrobe.has(hats.from[0]!)).toBe(true);
    expect(t.send(t.ann, { ...hat, hat: "no-such-hat" })).toBe(
      "You cannot take that hat.",
    );
  });

  const BOARD_DAY = 70;
  /** A day on which the orders board posts an order that needs no chest. */
  function orderDay(t: ReturnType<typeof mk>) {
    t.g.orders.opened = true;
    for (let d = BOARD_DAY; d < BOARD_DAY + 200; d++) {
      const def = t.g.orders.board(d).find((o) => o.ask.kind !== "hand-in");
      if (def) {
        t.g.day.clock.day = d;
        return { day: d, def };
      }
    }
    throw new Error("no order");
  }

  it("takes and drops a shared order, one a week, and pays every player at night", () => {
    const t = mk("separate");
    const { g } = t;
    const { day, def } = orderDay(t);
    expect(t.send(t.ann, { kind: "order-take", id: def.id })).toBe(
      "open the screen first",
    );
    expect(openAt(t, t.ann, boardRef("orders"))).toBeUndefined();
    expect(openAt(t, t.bo, boardRef("orders"))).toBeUndefined();
    expect(t.send(t.ann, { kind: "order-take", id: "nope" })).toBe(
      "That order is gone.",
    );
    expect(t.send(t.ann, { kind: "order-take", id: def.id })).toBeUndefined();
    expect(g.orders.isActive(def.id)).toBe(true);
    // The board is one board: Bo sees it taken, and cannot take another this week.
    const other = g.orders.board(day)[0];
    if (other) {
      expect(t.send(t.bo, { kind: "order-take", id: other.id })).toBe(
        "You have taken an order this week. Another is open next week.",
      );
    }
    // Anyone may drop it.
    expect(t.send(t.bo, { kind: "order-drop", id: def.id })).toBeUndefined();
    expect(t.send(t.bo, { kind: "order-drop", id: def.id })).toBe(
      "That order is not taken.",
    );
    // A filled order pays every purse, and a first reward is owed to each player.
    g.orders.active.push({
      id: def.id,
      accepted: day,
      due: day + def.windowDays,
      progress: { all: 9999, parsnip: 9999 },
    });
    const purse = (id: string) => g.players.get(id).money;
    const was = [LOCAL_PLAYER, t.ann, t.bo].map(purse);
    const news = endDayOrders(g, [], day + 1);
    expect(news.done.length).toBe(1);
    [LOCAL_PLAYER, t.ann, t.bo].forEach((id, i) =>
      expect(purse(id)).toBe(was[i]! + def.gold),
    );
    if (def.firstReward.item) {
      const item = def.firstReward.item;
      expect(g.orders.owed.map((o) => o.to).sort()).toEqual(
        [LOCAL_PLAYER, t.ann, t.bo].sort(),
      );
      // Each collects their own, once.
      expect(t.send(t.ann, { kind: "order-collect" })).toBeUndefined();
      expect(g.players.get(t.ann).inventory.count(item.id)).toBe(item.count);
      expect(t.send(t.ann, { kind: "order-collect" })).toBe(
        "Nothing to collect, or your backpack is full.",
      );
      expect(t.send(t.bo, { kind: "order-collect" })).toBeUndefined();
      expect(g.players.get(t.bo).inventory.count(item.id)).toBe(item.count);
      expect(g.orders.owed.length).toBe(1);
    }
  });

  it("pays a shared wallet once for a filled order", () => {
    const t = mk("shared");
    const { g } = t;
    const { day, def } = orderDay(t);
    g.orders.active.push({
      id: def.id,
      accepted: day,
      due: day + def.windowDays,
      progress: { all: 9999, parsnip: 9999 },
    });
    const was = g.players.get(LOCAL_PLAYER).money;
    endDayOrders(g, [], day + 1);
    expect(g.players.get(LOCAL_PLAYER).money).toBe(was + def.gold);
  });

  /** A day on which the board posts a delivery request. */
  function requestDay(t: ReturnType<typeof mk>) {
    for (let d = 2; d < 200; d++) {
      const q = requestFor(d);
      if (q?.type === "delivery") {
        t.g.day.clock.day = d;
        return { day: d, q };
      }
    }
    throw new Error("no request");
  }

  it("accepts, hands in and cancels board requests; a hand-in pays every player", () => {
    const t = mk("separate");
    const { g } = t;
    const { q } = requestDay(t);
    expect(t.send(t.ann, { kind: "request-accept", id: q.id })).toBe(
      "open the screen first",
    );
    expect(openAt(t, t.ann, boardRef("requests"))).toBeUndefined();
    expect(openAt(t, t.bo, boardRef("requests"))).toBeUndefined();
    expect(t.send(t.ann, { kind: "request-accept", id: "board-1" })).toBe(
      "That request is gone.",
    );
    expect(t.send(t.bo, { kind: "request-accept", id: q.id })).toBeUndefined();
    // Taken once: the same offer is gone for the other player.
    expect(t.send(t.ann, { kind: "request-accept", id: q.id })).toBe(
      "That request is gone.",
    );
    // Ann holds the goods; Bo does not.
    expect(t.send(t.bo, { kind: "request-turnin", id: q.id })).toBe(
      "You do not have enough to hand in.",
    );
    g.players.get(t.ann).inventory.add(q.want.item, q.want.count);
    const purse = (id: string) => g.players.get(id).money;
    const was = [LOCAL_PLAYER, t.ann, t.bo].map(purse);
    expect(t.send(t.ann, { kind: "request-turnin", id: q.id })).toBeUndefined();
    expect(g.players.get(t.ann).inventory.count(q.want.item)).toBe(0);
    [LOCAL_PLAYER, t.ann, t.bo].forEach((id, i) =>
      expect(purse(id)).toBe(was[i]! + q.reward.gold),
    );
    expect(t.send(t.ann, { kind: "request-turnin", id: q.id })).toBe(
      "No such request.",
    );
    // A finished request cannot be cancelled; a fresh one can.
    expect(t.send(t.bo, { kind: "request-cancel", id: q.id })).toBe(
      "No such request.",
    );
  });

  it("cancels an open request, and walking away from the board refuses it", () => {
    const t = mk();
    const { q } = requestDay(t);
    expect(openAt(t, t.ann, boardRef("requests"))).toBeUndefined();
    expect(t.send(t.ann, { kind: "request-accept", id: q.id })).toBeUndefined();
    t.stand(t.ann, "hearthwell", 1, 1);
    expect(t.send(t.ann, { kind: "request-cancel", id: q.id })).toBe(
      "too far away",
    );
    const r = boardRef("requests");
    t.stand(t.ann, "hearthwell", r.x, r.y + 1);
    expect(t.send(t.ann, { kind: "request-cancel", id: q.id })).toBeUndefined();
    expect(t.g.quests.open().length).toBe(0);
  });

  it("shows a guest copy the same board through applied", () => {
    const t = mk();
    const { q } = requestDay(t);
    const copy = deserialize(serialize(t.g))!;
    t.room.drain(t.ann);
    expect(openAt(t, t.ann, boardRef("requests"))).toBeUndefined();
    t.room.drain(t.bo);
    expect(t.send(t.ann, { kind: "request-accept", id: q.id })).toBeUndefined();
    for (const m of t.room.drain(t.bo)) applyServerMsg(copy, m);
    expect(copy.quests.open().map((o) => o.id)).toEqual([q.id]);
  });

  it("works in single player: the same intents run on the host's own state", () => {
    const g = newGame("standard");
    const { q } = (() => {
      for (let d = 2; d < 200; d++) {
        const r = requestFor(d);
        if (r?.type === "delivery") {
          g.day.clock.day = d;
          return { q: r };
        }
      }
      throw new Error("none");
    })();
    expect(
      applyScreenIntent(g, LOCAL_PLAYER, { kind: "request-accept", id: q.id }),
    ).toBeUndefined();
    g.inventory.add(q.want.item, q.want.count);
    const was = g.money;
    expect(
      applyScreenIntent(g, LOCAL_PLAYER, { kind: "request-turnin", id: q.id }),
    ).toBeUndefined();
    expect(g.money).toBe(was + q.reward.gold);
  });
});

describe("the rest: carpenter, tailor, smiths, gallery, shrine (note 108, group 5)", () => {
  const refAt = (map: string, kind: string, svcKind = kind): ScreenRef => {
    const { s } = find(map, svcKind);
    return { kind, map, x: s.x, y: s.y };
  };
  const openAt = (t: ReturnType<typeof mk>, id: string, ref: ScreenRef) => {
    t.stand(id, ref.map, ref.x, ref.y + 1);
    return t.send(id, { kind: "open", screen: ref });
  };
  const carpenter = () => refAt("sawmill", "carpenter");
  const coop = { kind: "carp-build", building: "coop", x: 52, y: 20 } as const;

  /** Give a player what a coop costs. */
  const fundCoop = (t: ReturnType<typeof mk>, id: string) => {
    const p = t.g.players.get(id);
    p.money = 5000;
    p.inventory.add("wood", 300);
    p.inventory.add("stone", 100);
  };
  /** Finish the carpenter's coop job at once (test setup). */
  const finishCoop = (g: ReturnType<typeof mk>["g"]) => {
    g.animals.build = undefined;
    g.animals.coopBuilt = true;
  };

  it("lets a guest order a building with their own money and records the owner", () => {
    const t = mk("separate");
    const { g } = t;
    fundCoop(t, t.ann);
    expect(t.send(t.ann, coop)).toBe("open the screen first");
    expect(openAt(t, t.ann, carpenter())).toBeUndefined();
    expect(t.send(t.ann, coop)).toBeUndefined();
    expect(g.players.get(t.ann).money).toBe(1000);
    expect(g.players.get(t.ann).inventory.count("wood")).toBe(0);
    expect(g.animals.build?.building).toBe("coop");
    expect(g.buildOwners?.coop).toBe(t.ann);
    // Too far away after walking off.
    t.stand(t.ann, "sawmill", 0, 0);
    expect(t.send(t.ann, { kind: "carp-silo" })).toBe("too far away");
  });

  it("refuses an order the guest cannot afford, and a spot that is blocked", () => {
    const t = mk("separate");
    openAt(t, t.ann, carpenter());
    expect(t.send(t.ann, coop)).toMatch(/need/i);
    fundCoop(t, t.ann);
    expect(t.send(t.ann, { ...coop, x: 0, y: 0 })).toMatch(
      /way|blocked|in the way|water|no good|off/i,
    );
    expect(t.g.players.get(t.ann).money).toBe(5000);
  });

  it("buys furniture and a covering from the sender's own purse", () => {
    const t = mk("separate");
    const g = t.g;
    openAt(t, t.ann, carpenter());
    const f = stationStock()[0]!;
    expect(t.send(t.ann, { kind: "carp-furniture", id: f.id })).toMatch(
      /need/i,
    );
    g.players.get(t.ann).money = f.price + 10;
    expect(t.send(t.ann, { kind: "carp-furniture", id: f.id })).toBeUndefined();
    expect(g.players.get(t.ann).money).toBe(10);
    expect(g.players.get(t.ann).inventory.count(f.id)).toBe(1);
    expect(g.players.get(t.bo).inventory.count(f.id)).toBe(0);
    const d = DECOR[0]!;
    g.players.get(t.ann).money = d.price;
    expect(t.send(t.ann, { kind: "carp-decor", id: d.id })).toBeUndefined();
    expect(t.send(t.ann, { kind: "carp-decor", id: "nope" })).toMatch(
      /not sell/,
    );
  });

  it("upgrades a home only for its occupant: a guest is refused, the host may", () => {
    const t = mk("separate");
    openAt(t, t.ann, carpenter());
    expect(t.send(t.ann, { kind: "carp-house" })).toBe(HOME_LINE);
    expect(t.send(t.ann, { kind: "carp-reno", id: "x" })).toBe(HOME_LINE);
    const host = t.g.players.get(LOCAL_PLAYER);
    host.money = 100000;
    host.inventory.add("wood", 1000);
    expect(t.room.hostIntent({ kind: "carp-house" })).toBeUndefined();
    expect(t.g.houseBuild?.tier).toBe(1);
  });

  it("moves and removes by the host's setting: own only by default, off, all", () => {
    const t = mk("separate");
    const { g } = t;
    fundCoop(t, t.ann);
    openAt(t, t.ann, carpenter());
    openAt(t, t.bo, carpenter());
    expect(t.send(t.ann, coop)).toBeUndefined();
    finishCoop(g);
    const move = { kind: "carp-move", building: "coop", x: 52, y: 20 };
    const remove = { kind: "carp-remove", building: "coop" };
    // Default: own only.
    expect(t.send(t.bo, remove)).toBe(
      "You can only change a building you ordered.",
    );
    expect(t.send(t.bo, move)).toBe(
      "You can only change a building you ordered.",
    );
    expect(t.send(t.ann, move)).toBeUndefined();
    // Off: nobody but the host; a guest cannot set it.
    expect(t.send(t.ann, { kind: "build-rule", rule: "off" })).toBe(
      "host only",
    );
    expect(
      t.room.hostIntent({ kind: "build-rule", rule: "off" }),
    ).toBeUndefined();
    expect(t.send(t.ann, remove)).toMatch(
      /turned moving and removing buildings off/,
    );
    // All: another guest may take it down; the refund goes to them.
    expect(
      t.room.hostIntent({ kind: "build-rule", rule: "all" }),
    ).toBeUndefined();
    const before = g.players.get(t.bo).money;
    expect(t.send(t.bo, remove)).toBeUndefined();
    expect(g.players.get(t.bo).money).toBeGreaterThan(before);
    expect(g.animals.coopBuilt).toBe(false);
    expect(g.buildOwners?.coop).toBeUndefined();
    // A bad rule is refused.
    expect(t.room.hostIntent({ kind: "build-rule", rule: "x" })).toBe(
      "bad build-rule",
    );
  });

  it("treats a building made before owners as the host's, and the host always may", () => {
    const t = mk("separate");
    const { g } = t;
    finishCoop(g);
    openAt(t, t.ann, carpenter());
    expect(t.send(t.ann, { kind: "carp-remove", building: "coop" })).toBe(
      "You can only change a building you ordered.",
    );
    expect(
      t.room.hostIntent({ kind: "build-rule", rule: "off" }),
    ).toBeUndefined();
    expect(
      t.room.hostIntent({ kind: "carp-remove", building: "coop" }),
    ).toBeUndefined();
  });

  it("round-trips owners, the rule and per-guest orders through a save", () => {
    const t = mk("separate");
    t.g.buildOwners = { coop: t.ann };
    t.g.buildRule = "all";
    t.g.galleryClaimedBy = { [t.ann]: ["a"] };
    t.g.toolOrdersBy = { [t.bo]: { tool: "hoe", tier: 1, readyDay: 4 } };
    const back = deserialize(serialize(t.g))!;
    expect(back.buildOwners).toEqual({ coop: t.ann });
    expect(back.buildRule).toBe("all");
    expect(back.galleryClaimedBy).toEqual({ [t.ann]: ["a"] });
    expect(back.toolOrdersBy?.[t.bo]?.readyDay).toBe(4);
  });

  it("sews at the machine from the sender's pack, and refuses at the wrong pots", () => {
    const t = mk();
    const { g } = t;
    setFlag(g, TAILORING_OPEN);
    const sew = refAt("hatter", "tailor", "sewing-machine");
    const ref = { ...sew, stock: "sew" };
    const ann = g.players.get(t.ann);
    ann.inventory.add("cloth");
    ann.inventory.add("wool");
    expect(t.send(t.ann, { kind: "tailor-sew", item: "wool" })).toBe(
      "open the screen first",
    );
    expect(openAt(t, t.ann, { ...sew, stock: "dye" })).toBe("no service there");
    expect(openAt(t, t.ann, ref)).toBeUndefined();
    expect(t.send(t.ann, { kind: "tailor-dye", kind2: 1 })).toBe(
      "not the screen you opened",
    );
    expect(t.send(t.ann, { kind: "tailor-sew", item: "wool" })).toBeUndefined();
    expect(ann.inventory.count("wool")).toBe(0);
    expect(g.wardrobe.hasPiece("shirt", "plain-shirt")).toBe(true);
    expect(t.send(t.ann, { kind: "tailor-sew", item: "wool" })).toMatch(
      /cloth|none/,
    );
  });

  it("dyes a worn piece at the pots, from the sender's pack", () => {
    const t = mk();
    const { g } = t;
    setFlag(g, TAILORING_OPEN);
    g.wardrobe.addPiece("shirt", "plain-shirt");
    g.wardrobe.wearPiece("shirt", "plain-shirt");
    const pots = refAt("hatter", "tailor", "dye-pots");
    expect(openAt(t, t.ann, { ...pots, stock: "dye" })).toBeUndefined();
    const dye = {
      kind: "tailor-dye",
      piece: "shirt",
      id: "plain-shirt",
      pots: POT_COLOURS.map(() => "nothing"),
      tint: { h: 200, s: 0.5, v: 0.9 },
    };
    expect(t.send(t.ann, { ...dye, piece: "cape" })).toBe("bad tailor-dye");
    expect(t.send(t.ann, dye)).toMatch(/item|pot|have/i);
    expect(
      t.send(t.ann, {
        kind: "tailor-undye",
        piece: "shirt",
        id: "plain-shirt",
      }),
    ).toBe("It is not dyed.");
    // The sewing screen is not the pots.
    expect(
      openAt(t, t.ann, {
        ...refAt("hatter", "tailor", "sewing-machine"),
        stock: "sew",
      }),
    ).toBeUndefined();
    expect(t.send(t.ann, dye)).toBe("not the screen you opened");
  });

  it("buys and sells ore at the smith and the smithy, from the sender's purse", () => {
    const t = mk("separate");
    const { g } = t;
    const ann = g.players.get(t.ann);
    ann.money = 1000;
    const forge = refAt("forge", "smith");
    const smithy = refAt("smithy", "smithy");
    const buy = { kind: "smith-buy", what: "ore", id: "iron-ore", n: 5 };
    expect(t.send(t.ann, buy)).toBe("open the screen first");
    expect(openAt(t, t.ann, forge)).toBeUndefined();
    expect(t.send(t.ann, buy)).toBeUndefined();
    expect(ann.money).toBe(750);
    expect(ann.inventory.count("iron-ore")).toBe(5);
    expect(
      t.send(t.ann, { kind: "smith-buy", what: "ore", id: "iron-ore", n: 3 }),
    ).toBe("She does not sell that.");
    expect(
      t.send(t.ann, { kind: "smith-sell", id: "iron-ore", all: true }),
    ).toBeUndefined();
    expect(ann.inventory.count("iron-ore")).toBe(0);
    expect(t.send(t.ann, { kind: "smith-sell", id: "iron-ore" })).toMatch(
      /none/,
    );
    // The smithy takes ore too, but not the dwarf's weapons.
    expect(openAt(t, t.ann, smithy)).toBeUndefined();
    expect(t.send(t.ann, buy)).toBeUndefined();
    expect(
      t.send(t.ann, { kind: "smith-buy", what: "weapon", id: FORGED[0]!.id }),
    ).toBe("open the screen first");
    // Bo's purse and pack are untouched.
    expect(g.players.get(t.bo).inventory.count("iron-ore")).toBe(0);
  });

  it("buys a bomb and hands over the first copper at the smith", () => {
    const t = mk("separate");
    const { g } = t;
    const ann = g.players.get(t.ann);
    ann.money = 5000;
    openAt(t, t.ann, refAt("forge", "smith"));
    expect(
      t.send(t.ann, { kind: "smith-buy", what: "bomb", id: BOMBS[0]!.id }),
    ).toBeUndefined();
    expect(ann.inventory.count(BOMBS[0]!.id)).toBe(1);
    expect(t.send(t.ann, { kind: "smith-copper" })).toBe(
      "You have no copper ore.",
    );
    ann.inventory.add("copper-ore");
    expect(t.send(t.ann, { kind: "smith-copper" })).toBeUndefined();
    expect(g.mines.copperHandedIn).toBe(true);
  });

  it("keeps each player's tool at the smithy apart, and cracks a geode the same on every copy", () => {
    const t = mk("separate");
    const { g } = t;
    const smithy = refAt("smithy", "smithy");
    for (const id of [t.ann, t.bo]) {
      const p = g.players.get(id);
      p.money = 5000;
      p.inventory.add("copper-bar", 5);
      openAt(t, id, smithy);
    }
    expect(t.send(t.ann, { kind: "smithy-tool", tool: "hoe" })).toBeUndefined();
    expect(t.send(t.ann, { kind: "smithy-tool", tool: "axe" })).toBe(
      "She is still working on another tool.",
    );
    expect(t.send(t.bo, { kind: "smithy-tool", tool: "axe" })).toBeUndefined();
    expect(g.toolOrder).toBeUndefined();
    expect(g.toolOrdersBy?.[t.ann]?.tool).toBe("hoe");
    expect(g.toolOrdersBy?.[t.bo]?.tool).toBe("axe");
    expect(t.send(t.ann, { kind: "smithy-collect" })).toBe(
      "Nothing to collect.",
    );
    g.day.clock.day += 2;
    expect(t.send(t.ann, { kind: "smithy-collect" })).toBeUndefined();
    expect(g.players.get(t.ann).toolTiers.hoe).toBe(1);
    expect(g.players.get(t.bo).toolTiers.axe).toBe(0);
    expect(g.toolOrdersBy?.[t.ann]).toBeUndefined();
    expect(g.toolOrdersBy?.[t.bo]?.tool).toBe("axe");
    // A geode.
    const ann = g.players.get(t.ann);
    ann.money = 1000;
    ann.inventory.add(GEODE, 2);
    expect(
      t.send(t.ann, { kind: "smithy-crack", geode: GEODE }),
    ).toBeUndefined();
    expect(ann.inventory.count(GEODE)).toBe(1);
    expect(ann.money).toBe(1000 - CRACK_FEE);
    expect(t.send(t.ann, { kind: "smithy-crack", geode: "wood" })).toBe(
      "bad smithy-crack",
    );
  });

  it("donates from the sender's pack to the shared shelf, and each player collects their own reward", () => {
    const t = mk("separate");
    const { g } = t;
    const ref = refAt("library", "gallery", "counter-library");
    const ids = GALLERY_IDS.slice(0, 6);
    for (const id of ids) g.players.get(t.ann).inventory.add(id);
    expect(t.send(t.ann, { kind: "gallery-donate", item: ids[0] })).toBe(
      "open the screen first",
    );
    expect(openAt(t, t.ann, ref)).toBeUndefined();
    expect(openAt(t, t.bo, ref)).toBeUndefined();
    expect(t.send(t.bo, { kind: "gallery-donate", item: ids[0] })).toBe(
      "You do not have one.",
    );
    for (const id of ids.slice(0, 5))
      expect(
        t.send(t.ann, { kind: "gallery-donate", item: id }),
      ).toBeUndefined();
    expect(t.send(t.ann, { kind: "gallery-donate", item: ids[0] })).toBe(
      "The gallery has one of those already.",
    );
    expect(g.gallery?.length).toBe(5);
    expect(g.players.get(t.ann).inventory.count(ids[0]!)).toBe(0);
    // Move a piece on the shelf.
    expect(
      t.send(t.bo, { kind: "gallery-place", item: ids[0], slot: 9 }),
    ).toBeUndefined();
    // Both may collect the seeds, each once.
    expect(t.send(t.ann, { kind: "gallery-claim" })).toBeUndefined();
    expect(g.players.get(t.ann).inventory.count("parsnip-seed")).toBe(5);
    expect(t.send(t.ann, { kind: "gallery-claim" })).toMatch(/No reward/);
    expect(t.send(t.bo, { kind: "gallery-claim" })).toBeUndefined();
    expect(g.players.get(t.bo).inventory.count("parsnip-seed")).toBe(5);
    expect(g.galleryClaimedBy?.[t.ann]?.length).toBe(1);
    expect(g.galleryClaimedBy?.[t.bo]?.length).toBe(1);
  });

  it("sets a Diamond and uses the open statue at the shrine, one shared score", () => {
    const t = mk("separate");
    const { g } = t;
    const ref = refAt(FARM, "shrine");
    const ann = g.players.get(t.ann);
    expect(t.send(t.ann, { kind: "shrine-act" })).toBe("open the screen first");
    expect(openAt(t, t.ann, ref)).toBeUndefined();
    expect(t.send(t.ann, { kind: "shrine-act", diamond: true })).toBe(
      "You have no Diamond.",
    );
    ann.inventory.add(DIAMOND.id);
    expect(
      t.send(t.ann, { kind: "shrine-act", diamond: true }),
    ).toBeUndefined();
    expect(ann.inventory.count(DIAMOND.id)).toBe(0);
    expect(g.shrine.candles).toBeGreaterThanOrEqual(1);
    // The statue.
    expect(t.send(t.ann, { kind: "shrine-act" })).toBeDefined();
    g.shrine.candles = 4;
    expect(t.send(t.ann, { kind: "shrine-act" })).toBeUndefined();
    expect(ann.inventory.count("hearthsilver-ore")).toBeGreaterThan(0);
    expect(g.shrine.statueDay).toBe(g.day.clock.day);
    expect(openAt(t, t.bo, ref)).toBeUndefined();
    expect(t.send(t.bo, { kind: "shrine-act" })).toMatch(/quiet/);
  });

  it("shows a guest copy the same carpenter order through applied", () => {
    const t = mk("separate");
    fundCoop(t, t.ann);
    const copy = deserialize(serialize(t.g))!;
    copy.players.localId = t.bo;
    openAt(t, t.ann, carpenter());
    t.room.drain(t.bo);
    expect(t.send(t.ann, coop)).toBeUndefined();
    for (const m of t.room.drain(t.bo)) applyServerMsg(copy, m);
    expect(copy.animals.build?.building).toBe("coop");
    expect(copy.buildOwners?.coop).toBe(t.ann);
    expect(copy.players.get(t.ann).money).toBe(1000);
  });

  it("works in single player: the same intents run on the host's own state", () => {
    const g = newGame("standard");
    g.money = 5000;
    g.inventory.add("wood", 300);
    g.inventory.add("stone", 100);
    expect(applyScreenIntent(g, LOCAL_PLAYER, coop)).toBeUndefined();
    expect(g.animals.build?.building).toBe("coop");
    expect(g.buildOwners).toBeUndefined();
    g.mines.copperHandedIn = false;
    g.inventory.add("copper-ore");
    expect(
      applyScreenIntent(g, LOCAL_PLAYER, { kind: "smith-copper" }),
    ).toBeUndefined();
  });
});
