import { afterEach, describe, expect, it } from "vitest";
import {
  encodeAnnounce,
  parseAnnounce,
  type Announcement,
} from "../src/net/announce";
import { RoomHost } from "../src/net/roomhost";
import { NodePipe } from "../src/net/pipe-node";
import { GuestClient } from "../src/net/client";
import { SocketTransport } from "../src/net/sockettransport";
import type { RoomWorld } from "../src/core/room";
import type { GameEntry } from "../src/net/lobby";

const a: Announcement = {
  id: "abc123",
  name: "Our farm",
  port: 8787,
  players: 2,
  maxPlayers: 8,
};

describe("announcements", () => {
  it("round trips, taking the host address from the sender", () => {
    expect(parseAnnounce(encodeAnnounce(a), "192.168.1.70", 5)).toEqual({
      ...a,
      host: "192.168.1.70",
      version: 1,
      seen: 5,
    });
  });

  it("ignores anything that is not ours or is malformed", () => {
    for (const t of [
      "",
      "hello",
      "[]",
      "null",
      JSON.stringify({ app: "stardew", id: "x" }),
      JSON.stringify({ app: "elderglen", v: 1, ...a, port: 0 }),
      JSON.stringify({ app: "elderglen", v: 1, ...a, port: 70000 }),
      JSON.stringify({ app: "elderglen", v: 1, ...a, players: -1 }),
      JSON.stringify({ app: "elderglen", v: 1, ...a, name: 5 }),
      JSON.stringify({ app: "elderglen", ...a }),
      encodeAnnounce({ ...a, name: "x".repeat(600) }),
    ])
      expect(parseAnnounce(t, "10.0.0.1", 0), t.slice(0, 30)).toBeUndefined();
  });

  it("clips a long name", () => {
    const g = parseAnnounce(
      encodeAnnounce({ ...a, name: "n".repeat(100) }),
      "1.1.1.1",
      0,
    );
    expect(g?.name.length).toBe(40);
  });
});

class World implements RoomWorld {
  day() {
    return 1;
  }
  snapshot() {
    return "farm";
  }
  apply() {
    return undefined;
  }
}

const hosts: RoomHost[] = [];
const guests: GuestClient[] = [];
const stops: (() => void)[] = [];
afterEach(async () => {
  stops.splice(0).forEach((s) => s());
  guests.splice(0).forEach((g) => g.close());
  await Promise.all(hosts.splice(0).map((h) => h.close()));
});

async function until(cond: () => boolean, ms = 4000) {
  const t0 = performance.now();
  while (!cond()) {
    if (performance.now() - t0 > ms) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("discovery over UDP (loopback)", () => {
  it("a listener sees a host, its player count, and loses it when it stops", async () => {
    const discoveryPort = 20000 + Math.floor(Math.random() * 20000);
    const o = { discoveryPort, broadcastAddress: "127.0.0.1" };
    const host = await RoomHost.start({
      world: new World(),
      pipe: new NodePipe(o),
      announceName: "Loopback farm",
      tickHz: 20,
    });
    hosts.push(host);

    const t = new SocketTransport(undefined, "Guest", new NodePipe(o));
    expect(t.canDiscover).toBe(true);
    let seen: GameEntry[] = [];
    stops.push(t.discover((g) => (seen = g)));
    await until(() => seen.length === 1);
    expect(seen[0]).toMatchObject({
      name: "Loopback farm",
      host: "127.0.0.1",
      port: host.port,
      players: 1,
      maxPlayers: 8,
      version: 1,
    });

    // A join is announced at once, not after the next interval.
    guests.push(
      await GuestClient.connect(`ws://127.0.0.1:${host.port}`, { name: "g" }),
    );
    await until(() => seen[0]?.players === 2, 1500);

    await host.close();
    await until(() => seen.length === 0, 9000);
  }, 20000);

  it("cannot discover without a pipe that listens", () => {
    expect(new SocketTransport().canDiscover).toBe(false);
  });
});

describe("a listed game stays listed while it keeps announcing", () => {
  it("hands over fresh seen times, and drops the game after it stops", async () => {
    const { vi } = await import("vitest");
    vi.useFakeTimers();
    try {
      let send: ((text: string, from: string) => void) | undefined;
      const pipe = {
        discover(cb: (text: string, from: string) => void) {
          send = cb;
          return () => {};
        },
      } as unknown as NodePipe;
      const t = new SocketTransport(undefined, "Guest", pipe);
      let last: GameEntry[] = [];
      const stop = t.discover((g) => (last = g));
      const text = encodeAnnounce(a);
      for (let i = 0; i < 6; i++) {
        send?.(text, "10.0.0.9");
        vi.advanceTimersByTime(2000);
      }
      // 12 s in, announcing every 2 s: still listed, seen within the stale window.
      expect(last).toHaveLength(1);
      expect(Date.now() - last[0]!.seen).toBeLessThanOrEqual(2000);
      // The host goes quiet: gone after the stale window.
      vi.advanceTimersByTime(8000);
      expect(last).toHaveLength(0);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
