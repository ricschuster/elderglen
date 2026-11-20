import { afterEach, describe, expect, it } from "vitest";
import { NodeHost } from "../src/net/host-node";
import { GuestClient, JoinFailed } from "../src/net/client";
import { GameRoomWorld } from "../src/core/roomworld";
import { DAY_END } from "../src/core/dayend";
import { itemById } from "../src/core/items";
import { deserialize, newGame, type GameState } from "../src/core/save";
import type { WalletMode } from "../src/core/players";
import type { ServerMsg } from "../src/core/protocol";
import type { CabinOrigin } from "../src/core/cabins";

const PRICE = itemById("parsnip")!.sellPrice;
const hosts: NodeHost[] = [];
const guests: GuestClient[] = [];

async function setup(
  wallet: WalletMode,
  origin: CabinOrigin = "multiplayer-start",
) {
  const g: GameState = newGame("standard", wallet);
  const world = new GameRoomWorld(g, { origin, random: () => 0.5 });
  const host = await NodeHost.start({ world, tickHz: 50 });
  hosts.push(host);
  return { g, world, host, url: `ws://127.0.0.1:${host.port}` };
}
async function join(url: string, name: string, rejoinId?: string) {
  const c = await GuestClient.connect(url, { name, rejoinId });
  guests.push(c);
  return c;
}
async function until(cond: () => boolean, ms = 4000) {
  const t0 = performance.now();
  while (!cond()) {
    if (performance.now() - t0 > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 5));
  }
}
const seen = (c: GuestClient, t: ServerMsg["t"]) =>
  c.log.filter((m) => m.t === t).length;

afterEach(async () => {
  guests.splice(0).forEach((c) => c.close());
  await Promise.all(hosts.splice(0).map((h) => h.close()));
});

describe("GameRoomWorld over a real socket", () => {
  it("joins with a real farm snapshot and a cabin each", async () => {
    const { world, url } = await setup("shared");
    const a = await join(url, "Ann");
    const b = await join(url, "Bo");
    const farm = deserialize(a.farm)!;
    expect(farm.players.has("p2")).toBe(true);
    expect(farm.players.walletMode).toBe("shared");
    expect(world.cabinOf("p2")).toBeDefined();
    expect(world.cabinOf(b.id)!.id).not.toBe(world.cabinOf(a.id)!.id);
    expect(world.g.players.get("p2").energy).not.toBe(world.g.day.energy);
  });

  it.each([
    ["shared", true],
    ["separate", false],
  ] as const)(
    "ship proceeds go to the right wallet (%s)",
    async (mode, pooled) => {
      const { g, world, url } = await setup(mode);
      const a = await join(url, "Ann");
      const b = await join(url, "Bo");
      g.players.get(a.id).inventory.add("parsnip", 5);
      g.players.get(b.id).inventory.add("parsnip", 2);
      const sa = a.sendIntent({ kind: "ship", id: "parsnip", n: 5 });
      const sb = b.sendIntent({ kind: "ship", id: "parsnip", n: 3 });
      await until(
        () =>
          g.bin.total(a.id) > 0 &&
          g.bin.total(b.id) > 0 &&
          a.log.some((m) => m.t === "applied" && m.seq === sa) &&
          b.log.some((m) => m.t === "applied" && m.seq === sb),
      );
      expect(b.log.some((m) => m.t === "applied" && m.seq === sb)).toBe(true);
      expect(a.log.some((m) => m.t === "applied" && m.seq === sa)).toBe(true);
      expect(g.bin.total(a.id)).toBe(5 * PRICE);
      expect(g.bin.total(b.id)).toBe(2 * PRICE);
      const hostBefore = g.players.get("p1").money;
      const aBefore = g.players.get(a.id).money;
      const bBefore = g.players.get(b.id).money;
      // Everyone to bed: the host, then both guests.
      host(world).sleep();
      a.sendIntent({ kind: "sleep" });
      b.sendIntent({ kind: "sleep" });
      await until(() => g.day.clock.day === 2);
      expect(g.bin.isEmpty).toBe(true);
      if (pooled) {
        expect(g.players.get("p1").money).toBe(hostBefore + 7 * PRICE);
        expect(g.players.get(a.id).money).toBe(aBefore);
        expect(g.players.get(b.id).money).toBe(bBefore);
      } else {
        expect(g.players.get("p1").money).toBe(hostBefore);
        expect(g.players.get(a.id).money).toBe(aBefore + 5 * PRICE);
        expect(g.players.get(b.id).money).toBe(bBefore + 2 * PRICE);
      }
      await until(() => a.day === 2 && b.day === 2);
      expect(world.lastReport?.passedOut).toBe(false);
    },
  );

  it("a shared sleep waits for the last guest, and a drop does not block it", async () => {
    const { g, world, url } = await setup("shared");
    const a = await join(url, "Ann");
    const b = await join(url, "Bo");
    host(world).sleep();
    a.sendIntent({ kind: "sleep" });
    await until(() => world.presence(a.id) === "asleep");
    await new Promise((r) => setTimeout(r, DAY_END.settleMs + 200));
    expect(g.day.clock.day).toBe(1); // Bo is still up
    b.close();
    await until(() => world.presence(b.id) === "dropped");
    await until(() => g.day.clock.day === 2);
    // Bo rejoins as the same player, awake, with the full farm.
    const b2 = await join(url, "Bo", b.id);
    expect(b2.id).toBe(b.id);
    expect(world.presence(b.id)).toBe("awake");
    expect(deserialize(b2.farm)!.day.clock.day).toBe(2);
    expect(world.cabinOf(b.id)).toBeDefined();
  });

  it("passes a guest out at the day limit with the single player cost", async () => {
    const { g, world, url } = await setup("separate");
    const a = await join(url, "Ann");
    g.players.get(a.id).money = 1000;
    g.day.clock.advance(24 * 60);
    await until(() => g.day.clock.day === 2);
    expect(world.lastPassOuts[a.id]).toBe(100);
    expect(g.players.get(a.id).money).toBe(900);
  });

  it("refuses a join without a cabin in a converted game, then the host buys one", async () => {
    const { g, world, url } = await setup("shared", "converted");
    const refused: string[] = [];
    world.onCabinRefused = (n) => refused.push(n);
    const err = await join(url, "Ann").catch((e) => e);
    expect(err).toBeInstanceOf(JoinFailed);
    expect(err.kind).toBe("refused");
    expect(refused).toEqual(["Ann"]);
    expect(world.cabinOffer?.price).toBe(100);
    expect(g.players.count).toBe(1);
    const gold = g.players.get("p1").money;
    expect(world.buyCabin({ x: 5, y: 5 })).toBeUndefined();
    expect(g.players.get("p1").money).toBe(gold - 100);
    const a = await join(url, "Ann");
    expect(a.id).toBe("p2");
    expect(world.cabinOf("p2")).toBeDefined();
  });

  it("rejects bad intents and guest cabin purchases", async () => {
    const { world, url } = await setup("separate");
    const a = await join(url, "Ann");
    const s1 = a.sendIntent({ kind: "buy-cabin", x: 1, y: 1 });
    const s2 = a.sendIntent({ kind: "spend", amount: 10_000_000 });
    const s3 = a.sendIntent({ kind: "ship", id: "parsnip", n: 1 });
    const s4 = a.sendIntent({ kind: "fly" });
    await until(() => seen(a, "rejected") === 4);
    for (const s of [s1, s2, s3, s4])
      expect(a.log.some((m) => m.t === "rejected" && m.seq === s)).toBe(true);
    expect(world.g.players.balance(a.id)).toBe(500);
  });
});

function host(w: GameRoomWorld) {
  return { sleep: () => w.apply("p1", { kind: "sleep" }) };
}
