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
