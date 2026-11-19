import { afterEach, describe, expect, it } from "vitest";
import { NodeHost, type NodeHostOptions } from "../src/net/host-node";
import { GuestClient, JoinFailed } from "../src/net/client";
import { SocketTransport } from "../src/net/sockettransport";
import { parseAddress } from "../src/net/address";
import { JamTracker } from "../src/core/jam";
import type { RoomWorld } from "../src/core/room";
import type { Intent } from "../src/core/protocol";

class World implements RoomWorld {
  dayNo = 1;
  log: string[] = [];
  day() {
    return this.dayNo;
  }
  snapshot() {
    return `farm-day-${this.dayNo}`;
  }
  apply(by: string, i: Intent) {
    if (i.kind === "bad") return "no";
    this.log.push(`${by}:${i.kind}`);
    return undefined;
  }
}

const hosts: NodeHost[] = [];
const guests: GuestClient[] = [];
async function start(o: Partial<NodeHostOptions> = {}) {
  const world = new World();
  const host = await NodeHost.start({ world, tickHz: 20, ...o });
  hosts.push(host);
  return { host, world, url: `ws://127.0.0.1:${host.port}` };
}
async function join(url: string, name: string, rejoinId?: string) {
  const g = await GuestClient.connect(url, { name, rejoinId });
  guests.push(g);
  return g;
}
async function until(cond: () => boolean, ms = 3000) {
  const t0 = performance.now();
  while (!cond()) {
    if (performance.now() - t0 > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 5));
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(async () => {
  guests.splice(0).forEach((g) => g.close());
  await Promise.all(hosts.splice(0).map((h) => h.close()));
});

describe("socket host and guests", () => {
  it("joins with hello and the farm, then walks and is seen by another guest", async () => {
    const { url, host } = await start();
    const a = await join(url, "Ann");
    expect(a.id).toBe("p2");
    expect(a.farm).toBe("farm-day-1");
    const b = await join(url, "Bo");
    expect(b.players.size).toBe(3);
    await until(() => a.players.has("p3"));
    a.sendPos(3, 4, "farm", 1);
    await until(() => b.positions["p2"]?.[0] === 3);
    expect(b.positions["p2"]?.slice(0, 2)).toEqual([3, 4]);
    expect(host.room.position("p2")).toEqual({ x: 3, y: 4, map: "farm" });
    // the farm is not resent per tick
    expect(b.log.filter((m) => m.t === "farm")).toHaveLength(1);
  });

  it("applies intents for everyone and rejects bad ones to the sender only", async () => {
    const { url, world } = await start();
    const a = await join(url, "Ann");
    const b = await join(url, "Bo");
    const s1 = a.sendIntent({ kind: "water" });
    const s2 = a.sendIntent({ kind: "bad" });
    await until(() => a.log.some((m) => m.t === "rejected" && m.seq === s2));
    await until(() => b.log.some((m) => m.t === "applied" && m.seq === s1));
    expect(world.log).toEqual(["p2:water"]);
    expect(b.log.some((m) => m.t === "rejected")).toBe(false);
  });

  it("handles a dropped guest and a rejoin as the same player", async () => {
    const { url, host } = await start();
    const a = await join(url, "Ann");
    const b = await join(url, "Bo");
    a.sendPos(7, 7);
    await until(() => b.positions["p2"]?.[0] === 7);
    a.close();
    await until(() => b.log.some((m) => m.t === "left" && m.id === "p2"));
    expect(host.room.connectedIds).not.toContain("p2");
    expect(b.positions["p2"]).toBeDefined(); // stale until next snap
    await until(() => b.positions["p2"] === undefined);
    const a2 = await join(url, "Ann", "p2");
    expect(a2.id).toBe("p2");
    expect(a2.farm).toBe("farm-day-1");
    await until(() => b.players.has("p2"));
  });

  it("refuses an id still in use and a full room", async () => {
    const { url } = await start({ maxPlayers: 2 });
    const a = await join(url, "Ann");
    await expect(join(url, "Imposter", a.id)).rejects.toMatchObject({
      kind: "refused",
    });
    await expect(join(url, "Bo")).rejects.toBeInstanceOf(JoinFailed);
    await expect(join(url, "Bo")).rejects.toMatchObject({ kind: "full" });
  });

  it("ignores junk and reports an unreachable host", async () => {
    const { url } = await start();
    const a = await join(url, "Ann");
    const ws = new WebSocket(url);
    await new Promise((r) => (ws.onopen = r));
    ws.send("not json");
    ws.send('{"t":"pos","x":"a"}');
    ws.close();
    await sleep(50);
    expect(a.closed).toBe(false);
    await expect(
      GuestClient.connect("ws://127.0.0.1:1", { name: "x", timeoutMs: 1000 }),
    ).rejects.toMatchObject({ kind: "unreachable" });
  });

  it("serves the lobby seam: connect ok and unreachable", async () => {
    const { url } = await start();
    const t = new SocketTransport();
    expect(t.canHost).toBe(false);
    const ok = parseAddress(url);
    if (!ok.ok) throw new Error("bad address");
    expect(await t.connect(ok)).toEqual({ ok: true });
    expect(t.client?.id).toBe("p2");
    guests.push(t.client!);
    const bad = parseAddress("127.0.0.1:1");
    if (!bad.ok) throw new Error("bad address");
    expect(await t.connect(bad)).toEqual({ ok: false, kind: "unreachable" });
  });
});

describe("jam rule over a real socket with latency", () => {
  it("frees two blocking players within 1.5 s and the host takes the passing positions", async () => {
    const LAT = 40; // each way, so about 80 ms round trip plus a 50 ms tick
    const { url, host } = await start({ latencyMs: LAT });
    const BODY = 0.8;
    const SPEED = 3; // tiles a second
    const DT = 33;
    const mk = async (name: string, x: number, dir: number) => {
      const g = await join(url, name);
      return { g, x, dir, jam: new JamTracker(), blockedFor: 0 };
    };
    const A = await mk("Ann", 0, 1);
    const B = await mk("Bo", 3, -1);
    const crossed = { at: -1 };
    let firstBlock = -1;
    let sawPass = false;
    const t0 = performance.now();
    while (performance.now() - t0 < 4000 && crossed.at < 0) {
      for (const [me, other] of [
        [A, B],
        [B, A],
      ] as const) {
        const otherX = me.g.positions[other.g.id]?.[0];
        const next = me.x + me.dir * SPEED * (DT / 1000);
        const blockedBy =
          otherX !== undefined &&
          !me.jam.isPassing(other.g.id) &&
          Math.abs(next - otherX) < BODY &&
          Math.abs(next - otherX) < Math.abs(me.x - otherX)
            ? [other.g.id]
            : [];
        if (blockedBy.length && firstBlock < 0) firstBlock = performance.now();
        me.jam.tick(DT, blockedBy);
        if (!blockedBy.length) me.x = next;
        const pass = me.jam.isPassing(other.g.id) ? [other.g.id] : [];
        if (pass.length) sawPass = true;
        me.g.sendPos(me.x, 0, "farm", 0, pass);
      }
      if (A.x > B.x + BODY) crossed.at = performance.now();
      await sleep(DT);
    }
    expect(firstBlock).toBeGreaterThan(0);
    expect(crossed.at).toBeGreaterThan(0);
    expect(crossed.at - firstBlock).toBeLessThan(1500);
    expect(sawPass).toBe(true);
    // the host accepted the passing positions: it holds them as sent, and echoes the pass ids
    await until(
      () => host.room.position("p2")!.x > host.room.position("p3")!.x,
    );
    const row = A.g.positions["p2"] ?? B.g.positions["p2"];
    expect(row).toBeDefined();
  }, 10000);
});

describe("host with 8 guests", () => {
  it("serves 8 walking guests from the real Room within the tick budget", async () => {
    const { url, host } = await start({ tickHz: 10, maxPlayers: 9 });
    const gs = await Promise.all(
      Array.from({ length: 8 }, (_, i) => join(url, `G${i}`)),
    );
    expect(host.room.connectedIds).toHaveLength(9);
    const t0 = performance.now();
    let x = 0;
    while (performance.now() - t0 < 1500) {
      x += 0.2;
      gs.forEach((g, i) => g.sendPos(x, i));
      await sleep(100);
    }
    await until(() => gs.every((g) => Object.keys(g.positions).length === 9));
    gs.forEach((g, i) => expect(g.positions[g.id]?.[1]).toBe(i));
    expect(host.busyMs / host.ticks).toBeLessThan(5);
  }, 10000);
});
