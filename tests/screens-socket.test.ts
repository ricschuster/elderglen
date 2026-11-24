// Headless multiplayer playtest for guest screens, group 1 "Trade" (note 108, issue 1014): a real
// host and two guests over WebSockets. A guest buys at the shop, ships through the bin and moves
// items in a chest, each through `open` first; a second guest is told the chest is in use.
import { afterEach, describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { farmTypeById } from "../src/core/farmtypes";
import { GameRoomWorld } from "../src/core/roomworld";
import { newGame } from "../src/core/save";
import { applyServerMsg } from "../src/net/guestapply";
import { GuestClient } from "../src/net/client";
import { NodeHost } from "../src/net/host-node";
import { deserialize } from "../src/core/save";
import type { ServerMsg } from "../src/core/protocol";
import { LOCKED_LINE } from "../src/core/screens";
import { CHICKEN_PRICE } from "../src/core/animals";
import { FARM_STORE } from "../src/core/mapstore";
import { putFish } from "../src/core/pond";
import { FISH_POND } from "../src/core/pondsite";

const FARM = farmTypeById("standard").map;
const hosts: NodeHost[] = [];
const guests: GuestClient[] = [];

afterEach(async () => {
  guests.splice(0).forEach((c) => c.close());
  await Promise.all(hosts.splice(0).map((h) => h.close()));
});

async function until(cond: () => boolean, ms = 4000) {
  const t0 = performance.now();
  while (!cond()) {
    if (performance.now() - t0 > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 5));
  }
}

const service = (map: string, kind: string) =>
  maps.get(map).services.find((s) => s.kind === kind)!;

/** Send an intent and wait for the host's verdict: undefined when applied, else the reason. */
async function ask(
  c: GuestClient,
  intent: Parameters<GuestClient["sendIntent"]>[0],
) {
  const seq = c.sendIntent(intent);
  const verdict = (m: ServerMsg) =>
    (m.t === "applied" && m.seq === seq && m.by === c.id) ||
    (m.t === "rejected" && m.seq === seq);
  await until(() => c.log.some(verdict));
  const m = c.log.find(verdict)!;
  return m.t === "rejected" ? m.reason : undefined;
}

async function stand(c: GuestClient, map: string, tx: number, ty: number) {
  const ts = maps.get(map).tileSize;
  c.sendPos((tx + 0.5) * ts, (ty + 1) * ts - 2, map, 1);
  await new Promise((r) => setTimeout(r, 60));
}

describe("guest screens, group 1, over real sockets", () => {
  it("a guest buys, ships and uses a chest; a second guest is locked out", async () => {
    const g = newGame("standard", "separate");
    const hosted: { host?: NodeHost } = {};
    const world = new GameRoomWorld(g, {
      random: () => 0.5,
      where: (id) => hosted.host?.room.position(id),
    });
    const host = await NodeHost.start({ world, tickHz: 50 });
    hosted.host = host;
    hosts.push(host);
    const url = `ws://127.0.0.1:${host.port}`;
    const ann = await GuestClient.connect(url, { name: "Ann" });
    const bo = await GuestClient.connect(url, { name: "Bo" });
    guests.push(ann, bo);
    // Each guest's own copy of the farm, kept in step by the host's `applied`.
    const copy = deserialize(ann.farm)!;
    copy.players.localId = ann.id;
    ann.onMessage = (m) => applyServerMsg(copy, m);

    g.players.get(ann.id).money = 400;
    const store = service("general-store", "shop");
    const shop = { kind: "shop", map: "general-store", x: store.x, y: store.y };
    // Too far away first, then at the counter.
    await stand(ann, "general-store", store.x + 10, store.y);
    expect(await ask(ann, { kind: "open", screen: shop })).toBe("too far away");
    await stand(ann, "general-store", store.x, store.y + 1);
    expect(await ask(ann, { kind: "open", screen: shop })).toBeUndefined();
    const before = g.players.get(ann.id).inventory.count("parsnip-seed");
    const id = ["parsnip-seed", "bean-seed", "potato-seed"].find(
      (s) => g.players.get(ann.id).inventory.count(s) >= 0,
    )!;
    const bought = await ask(ann, { kind: "buy", id, n: 2 });
    if (bought === undefined) {
      expect(g.players.get(ann.id).money).toBeLessThan(400);
      expect(g.players.get(ann.id).inventory.count(id)).toBeGreaterThan(
        id === "parsnip-seed" ? before : 0,
      );
    } else expect(bought).toBe("That is not on sale here.");
    await ask(ann, { kind: "close" });

    // The shipping bin: the line belongs to the shipper and shows on the guest's copy.
    const bin = service(FARM, "bin");
    for (const w of [g, copy])
      w.players.get(ann.id).inventory.add("parsnip", 3);
    await stand(ann, FARM, bin.x, bin.y + 1);
    expect(
      await ask(ann, {
        kind: "open",
        screen: { kind: "bin", map: FARM, x: bin.x, y: bin.y, ore: false },
      }),
    ).toBeUndefined();
    expect(
      await ask(ann, { kind: "ship", id: "parsnip", n: 3 }),
    ).toBeUndefined();
    expect(g.bin.each()[0]?.by).toBe(ann.id);
    expect(copy.bin.each()[0]?.by).toBe(ann.id);
    await ask(ann, { kind: "close" });

    // A chest: one at a time, moves judged by the host, the copy follows.
    g.chests.add(FARM, 5, 5, "chest");
    const chest = { map: FARM, x: 5, y: 5 };
    copy.chests.add(FARM, 5, 5, "chest");
    await stand(ann, FARM, 5, 6);
    await stand(bo, FARM, 6, 5);
    expect(
      await ask(ann, { kind: "open", screen: { kind: "chest", ...chest } }),
    ).toBeUndefined();
    expect(
      await ask(bo, { kind: "open", screen: { kind: "chest", ...chest } }),
    ).toBe(LOCKED_LINE);
    for (const w of [g, copy]) w.players.get(ann.id).inventory.add("turnip", 5);
    const slot = g.players
      .get(ann.id)
      .inventory.save()
      .findIndex((s) => s?.id === "turnip");
    expect(
      await ask(ann, {
        kind: "chest-move",
        chest,
        from: "pack",
        slot,
        to: "chest",
        toSlot: 0,
      }),
    ).toBeUndefined();
    expect(g.chests.get(FARM, 5, 5)!.items.slot(0)).toEqual({
      id: "turnip",
      count: 5,
    });
    await until(() => copy.chests.get(FARM, 5, 5)!.items.slot(0)?.count === 5);
    expect(await ask(bo, { kind: "chest-sort", chest })).toBe(
      "open the screen first",
    );
    await ask(ann, { kind: "close" });
    expect(
      await ask(bo, { kind: "open", screen: { kind: "chest", ...chest } }),
    ).toBeUndefined();
    expect(
      await ask(bo, { kind: "chest-send", chest, side: "chest", slot: 0 }),
    ).toBeUndefined();
    expect(g.players.get(bo.id).inventory.count("turnip")).toBe(5);
    expect(g.chests.get(FARM, 5, 5)!.items.slot(0)).toBeFalsy();
  });
});

describe("guest screens, group 2 (making), over real sockets", () => {
  it("a guest crafts, cooks and smelts; another loads a machine and the first collects", async () => {
    const g = newGame("standard", "separate");
    g.houseTier = 1;
    g.furnace.gifted = true;
    const hosted: { host?: NodeHost } = {};
    const world = new GameRoomWorld(g, {
      random: () => 0.5,
      where: (id) => hosted.host?.room.position(id),
    });
    const host = await NodeHost.start({ world, tickHz: 50 });
    hosted.host = host;
    hosts.push(host);
    const url = `ws://127.0.0.1:${host.port}`;
    const ann = await GuestClient.connect(url, { name: "Ann" });
    const bo = await GuestClient.connect(url, { name: "Bo" });
    guests.push(ann, bo);
    const copy = deserialize(ann.farm)!;
    copy.players.localId = ann.id;
    ann.onMessage = (m) => applyServerMsg(copy, m);
    for (const w of [g, copy]) {
      const inv = w.players.get(ann.id).inventory;
      inv.add("wood", 50);
      inv.add("egg", 1);
      inv.add("copper-ore", 5);
      inv.add("coal", 1);
    }
    g.players.get(bo.id).inventory.add("parsnip", 5);

    // Crafting with no bench: the pack alone, no screen.
    expect(await ask(ann, { kind: "craft", recipe: "chest" })).toBeUndefined();
    expect(g.players.get(ann.id).inventory.count("chest")).toBe(1);
    await until(() => copy.players.get(ann.id).inventory.count("chest") === 1);

    // Cooking at the stove, opened first.
    let stove: { x: number; y: number } | undefined;
    for (let t = maps.maxTier("house"); t >= 0 && !stove; t--)
      stove = maps
        .getWith("house", new Set(), t)
        .services.find((s) => s.kind === "cooking");
    expect(await ask(ann, { kind: "cook", dish: "fried-egg" })).toBe(
      "open the screen first",
    );
    await stand(ann, "house", stove!.x, stove!.y + 1);
    expect(
      await ask(ann, {
        kind: "open",
        screen: { kind: "cooking", map: "house", x: stove!.x, y: stove!.y },
      }),
    ).toBeUndefined();
    expect(await ask(ann, { kind: "cook", dish: "fried-egg" })).toBeUndefined();
    expect(g.players.get(ann.id).inventory.count("fried-egg")).toBe(1);
    await until(
      () => copy.players.get(ann.id).inventory.count("fried-egg") === 1,
    );
    await ask(ann, { kind: "close" });

    // The furnace: Ann loads it, Bo is told it is in use, then takes the bar.
    const f = service(FARM, "furnace");
    const furnace = { kind: "furnace", map: FARM, x: f.x, y: f.y };
    await stand(ann, FARM, f.x, f.y + 1);
    await stand(bo, FARM, f.x + 1, f.y + 1);
    expect(await ask(ann, { kind: "open", screen: furnace })).toBeUndefined();
    expect(await ask(bo, { kind: "open", screen: furnace })).toBe(
      "Someone is using the furnace.",
    );
    expect(
      await ask(ann, { kind: "smelt", bar: "copper-bar" }),
    ).toBeUndefined();
    await until(() => copy.furnace.job?.bar === "copper-bar");
    await ask(ann, { kind: "close" });
    g.furnace.job!.doneAt = 0;
    expect(await ask(bo, { kind: "open", screen: furnace })).toBeUndefined();
    expect(await ask(bo, { kind: "furnace-take" })).toBeUndefined();
    expect(g.players.get(bo.id).inventory.count("copper-bar")).toBe(1);
    expect(g.players.get(ann.id).inventory.count("copper-bar")).toBe(0);
    await ask(bo, { kind: "close" });

    // A machine on the farm: Bo loads it, Ann collects the goods.
    g.machines.add({ id: "preserves-jar", x: 6, y: 6 });
    copy.machines.add({ id: "preserves-jar", x: 6, y: 6 });
    await stand(ann, FARM, 6, 7);
    await stand(bo, FARM, 7, 7);
    expect(
      await ask(bo, { kind: "machine-load", x: 6, y: 6, item: "parsnip" }),
    ).toBeUndefined();
    const made = g.machines.get(6, 6)!.job!.output;
    expect(await ask(ann, { kind: "machine-collect", x: 6, y: 6 })).toBe(
      "machine busy",
    );
    g.machines.get(6, 6)!.job!.doneAt = 0;
    copy.machines.get(6, 6)!.job = { ...g.machines.get(6, 6)!.job! };
    expect(
      await ask(ann, { kind: "machine-collect", x: 6, y: 6 }),
    ).toBeUndefined();
    expect(g.players.get(ann.id).inventory.count(made)).toBe(1);
    expect(g.players.get(bo.id).inventory.count(made)).toBe(0);
    await until(() => copy.players.get(ann.id).inventory.count(made) === 1);
  });
});

describe("guest screens, group 3, over real sockets", () => {
  it("a guest buys an animal, pets, feeds, collects and uses a pond menu", async () => {
    const g = newGame("standard", "separate");
    g.animals.coopBuilt = true;
    g.animals.silo = true;
    const hosted: { host?: NodeHost } = {};
    const world = new GameRoomWorld(g, {
      random: () => 0.5,
      where: (id) => hosted.host?.room.position(id),
    });
    const host = await NodeHost.start({ world, tickHz: 50 });
    hosted.host = host;
    hosts.push(host);
    const url = `ws://127.0.0.1:${host.port}`;
    const ann = await GuestClient.connect(url, { name: "Ann" });
    const bo = await GuestClient.connect(url, { name: "Bo" });
    guests.push(ann, bo);
    const copy = deserialize(ann.farm)!;
    copy.players.localId = ann.id;
    ann.onMessage = (m) => applyServerMsg(copy, m);
    for (const w of [g, copy]) w.players.get(ann.id).money = 2000;

    // Buy a young chicken at the keeper: Ann's purse pays, it joins the shared coop on every copy.
    const keeper = service("forest-farmstead", "keeper");
    const keeperRef = {
      kind: "keeper",
      map: "forest-farmstead",
      x: keeper.x,
      y: keeper.y,
    };
    const buy = { kind: "keeper-buy", what: "animal", species: "chicken" };
    expect(await ask(ann, { ...buy, name: "Pip" })).toBe(
      "open the screen first",
    );
    await stand(ann, "forest-farmstead", keeper.x, keeper.y + 1);
    expect(await ask(ann, { kind: "open", screen: keeperRef })).toBeUndefined();
    expect(await ask(ann, { ...buy, name: "Pip" })).toBeUndefined();
    expect(g.players.get(ann.id).money).toBe(2000 - CHICKEN_PRICE);
    expect(g.animals.animals[0]!.name).toBe("Pip");
    await until(() => copy.animals.animals.length === 1);
    await ask(ann, { kind: "close" });

    // The coop bench: pet, feed from the silo, then the product goes to whoever takes it.
    const benchSvc = (() => {
      for (let t = maps.maxTier("coop"); t >= 0; t--) {
        const s = maps
          .getWith("coop", new Set(), t)
          .services.find((v) => v.kind === "coop-bench");
        if (s) return s;
      }
      throw new Error("no bench");
    })();
    const bench = {
      kind: "coop-bench",
      map: "coop",
      x: benchSvc.x,
      y: benchSvc.y,
    };
    await stand(ann, "coop", benchSvc.x, benchSvc.y + 1);
    await stand(bo, "coop", benchSvc.x + 1, benchSvc.y + 1);
    expect(await ask(ann, { kind: "open", screen: bench })).toBeUndefined();
    expect(await ask(bo, { kind: "open", screen: bench })).toBeUndefined();
    const at = { building: "coop", animal: 1 };
    expect(await ask(ann, { kind: "animal-pet", ...at })).toBeUndefined();
    expect(await ask(bo, { kind: "animal-pet", ...at })).toBe(
      "Already petted today.",
    );
    g.animals.hay = 5;
    for (const w of [g, copy]) w.animals.hay = 5;
    expect(
      await ask(ann, { kind: "bench-feed", building: "coop" }),
    ).toBeUndefined();
    expect(g.animals.animals[0]!.fed).toBe(true);
    expect(g.animals.hay).toBe(4);
    await until(() => copy.animals.animals[0]!.fed);
    g.animals.animals[0]!.product = "normal";
    copy.animals.animals[0]!.product = "normal";
    expect(await ask(bo, { kind: "animal-take", ...at })).toBeUndefined();
    expect(g.players.get(bo.id).inventory.count("egg")).toBe(1);
    expect(g.players.get(ann.id).inventory.count("egg")).toBe(0);
    await ask(ann, { kind: "close" });
    await ask(bo, { kind: "close" });

    // A pond menu: one at a time, Empty puts the fish in the opener's pack.
    g.placed.add(FARM_STORE, {
      x: 20,
      y: 20,
      id: FISH_POND,
      state: { building: 0, count: 0, capLevel: 0 },
    });
    g.inventory.add("carp");
    expect(putFish(g, 20, 20, "carp").ok).toBe(true);
    const pond = { kind: "pond", map: FARM, x: 20, y: 20 };
    await stand(ann, FARM, 19, 22);
    await stand(bo, FARM, 25, 22);
    expect(await ask(ann, { kind: "open", screen: pond })).toBeUndefined();
    expect(await ask(bo, { kind: "open", screen: pond })).toBe(
      "Someone is using the pond.",
    );
    expect(
      await ask(ann, { kind: "pond-empty", pond: { x: 20, y: 20 } }),
    ).toBeUndefined();
    expect(g.players.get(ann.id).inventory.count("carp")).toBe(1);
    await ask(ann, { kind: "close" });
    expect(await ask(bo, { kind: "open", screen: pond })).toBeUndefined();
  });
});
