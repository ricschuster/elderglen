import { afterEach, describe, expect, it } from "vitest";
import { DAY_START } from "../src/core/clock";
import { cabinSpawnTile } from "../src/core/cabins";
import { newGame } from "../src/core/save";
import { GuestClient } from "../src/net/client";
import { NodePipe } from "../src/net/pipe-node";
import {
  GuestSession,
  HOST_LOST_NOTICE,
  noteHostLost,
  takeLostNotice,
  POS_INTERVAL_MS,
  currentSession,
  isGuest,
  remotesFrom,
  setSession,
  startHostSession,
  type HostSession,
} from "../src/net/session";

const open: { close(): void }[] = [];
afterEach(() => {
  setSession(undefined);
  open.splice(0).forEach((o) => o.close());
});

const until = async (cond: () => boolean, ms = 3000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 10));
  }
};

async function pair(): Promise<{
  host: HostSession;
  guest: GuestSession;
  state: ReturnType<typeof newGame>;
}> {
  const state = newGame();
  const host = await startHostSession(state, {
    makePipe: () => new NodePipe(),
    announceName: "Test",
    tickHz: 50,
  });
  open.push(host);
  const client = await GuestClient.connect(`ws://localhost:${host.host.port}`, {
    name: "Ada",
  });
  open.push(client);
  return { host, guest: new GuestSession(client), state };
}

describe("remotesFrom", () => {
  it("skips the local player, names the others, sorts by id", () => {
    const rows = {
      p1: [1, 2, 0, "farm", 0, []],
      p3: [30, 40, 0, "house", 2, []],
      p2: [10, 20, 0, "farm", 1, []],
    } as Parameters<typeof remotesFrom>[0];
    const out = remotesFrom(rows, [{ id: "p2", name: "Bo" }], "p1");
    expect(out.map((r) => r.id)).toEqual(["p2", "p3"]);
    expect(out[0]).toEqual({
      id: "p2",
      name: "Bo",
      x: 10,
      y: 20,
      map: "farm",
      dir: 1,
    });
    expect(out[1]!.name).toBe("p3");
  });
});

describe("GuestSession", () => {
  it("sends its position at most every POS_INTERVAL_MS", () => {
    const sent: number[] = [];
    const client = {
      sendPos: (x: number) => sent.push(x),
    } as unknown as GuestClient;
    const s = new GuestSession(client);
    const p = { x: 1, y: 2, map: "farm", dir: 0 };
    s.reportPosition({ ...p, x: 1 }, 1000);
    s.reportPosition({ ...p, x: 2 }, 1000 + POS_INTERVAL_MS - 1);
    s.reportPosition({ ...p, x: 3 }, 1000 + POS_INTERVAL_MS);
    expect(sent).toEqual([1, 3]);
  });

  it("follows the host's day and restarts the morning", () => {
    const client = { day: 5 } as GuestClient;
    const s = new GuestSession(client);
    const clock = { day: 5, minutes: 700 };
    expect(s.followDay(clock)).toBe(false);
    expect(clock.minutes).toBe(700);
    client.day = 6;
    expect(s.followDay(clock)).toBe(true);
    expect(clock).toEqual({ day: 6, minutes: DAY_START });
  });

  it("is a guest that cannot act; a host is not", () => {
    const s = new GuestSession({} as GuestClient);
    expect(s.canAct).toBe(false);
    setSession(s);
    expect(isGuest()).toBe(true);
    s.close = () => {};
    setSession(undefined);
    expect(currentSession()).toBeUndefined();
    expect(isGuest()).toBe(false);
  });
});

describe("host and guest session", () => {
  it("shares positions both ways and spawns the guest at their cabin", async () => {
    const { host, guest, state } = await pair();
    expect(host.role).toBe("host");
    expect(guest.localId).toBe("p2");
    expect(guest.spawnTile()).toEqual(
      cabinSpawnTile(host.world.cabinOf("p2")!),
    );
    const copy = guest.loadFarm()!;
    expect(copy.day.clock.day).toBe(state.day.clock.day);
    expect(copy.players.localId).toBe("p2");

    host.reportPosition({ x: 100, y: 200, map: "farm", dir: 3 }, 1);
    guest.reportPosition({ x: 50, y: 60, map: "house", dir: 1 }, 1000);
    await until(
      () =>
        host.remotes().length === 1 &&
        guest.remotes().some((r) => r.id === "p1" && r.x === 100),
    );
    expect(host.remotes()[0]).toMatchObject({
      id: "p2",
      name: "Ada",
      x: 50,
      y: 60,
      map: "house",
    });
    expect(guest.remotes()[0]).toMatchObject({
      id: "p1",
      x: 100,
      y: 200,
      map: "farm",
      dir: 3,
    });
  });

  it("moves the guest's clock when the host's day rolls over", async () => {
    const { guest, state } = await pair();
    const copy = guest.loadFarm()!;
    const before = copy.day.clock.day;
    state.day.clock.nextDay();
    // The night's `farm` message replaces the copy in place, so the clock follows with it.
    await until(() => copy.day.clock.day === before + 1);
  });

  it("follows the host's minutes between day changes", async () => {
    const { guest, state } = await pair();
    const copy = guest.loadFarm()!;
    state.day.clock.minutes = DAY_START + 130;
    await until(() => guest.followDay(copy.day.clock));
    expect(copy.day.clock.minutes).toBe(DAY_START + 130);
  });

  it("takes the host's minutes when the day moves, else the morning", () => {
    const client = { day: 6, minutes: 500 } as GuestClient;
    const s = new GuestSession(client);
    const clock = { day: 5, minutes: 900 };
    expect(s.followDay(clock)).toBe(true);
    expect(clock).toEqual({ day: 6, minutes: 500 });
    expect(s.followDay(clock)).toBe(false);
  });

  it("tells the guest when the host is gone, once", async () => {
    const { host, guest } = await pair();
    let n = 0;
    guest.onHostLost(() => n++);
    host.close();
    await until(() => n > 0);
    expect(guest.closed).toBe(true);
    expect(n).toBe(1);
    let late = 0;
    guest.onHostLost(() => late++);
    expect(late).toBe(1);
  });

  it("leaves a note for the Title, once", () => {
    noteHostLost();
    expect(takeLostNotice()).toBe(HOST_LOST_NOTICE);
    expect(takeLostNotice()).toBeUndefined();
  });
});

describe("guest applies the host's intents", () => {
  it("a guest's till and plant reach the host and come back once to the guest copy", async () => {
    const { host, guest, state } = await pair();
    const copy = guest.loadFarm()!;
    const rec = state.players.get(guest.localId);
    rec.inventory.add("parsnip-seed", 3);
    copy.players.get(guest.localId).inventory.add("parsnip-seed", 3);
    let changes = 0;
    guest.onChange = () => (changes += 1);
    guest.sendIntent({ kind: "till", x: 6, y: 6 });
    await until(() => changes >= 1);
    guest.sendIntent({ kind: "plant", x: 6, y: 6, seed: "parsnip-seed" });
    await until(() => changes >= 2);
    expect(state.farm.plotAt(6, 6)?.tilled).toBe(true);
    expect(copy.farm.plotAt(6, 6)?.tilled).toBe(true);
    expect(
      copy.players.get(guest.localId).inventory.count("parsnip-seed"),
    ).toBe(2);
    expect(rec.inventory.count("parsnip-seed")).toBe(2);
    expect(host.world.g).toBe(state);
  });

  it("a refused intent changes nothing and reports the reason", async () => {
    const { guest } = await pair();
    const copy = guest.loadFarm()!;
    let why = "";
    guest.onRejected = (r) => (why = r);
    guest.sendIntent({ kind: "plant", x: 7, y: 7, seed: "parsnip-seed" });
    await until(() => why !== "");
    expect(copy.farm.plotAt(7, 7)).toBeUndefined();
  });
});

describe("shared day end over the wire", () => {
  it("the guest sees who is left, wakes, sleeps, and gets a fresh farm copy", async () => {
    const { host, guest, state } = await pair();
    const copy = guest.loadFarm()!;
    const seen: string[][] = [];
    guest.onBeds = () => seen.push([...guest.beds.asleep]);
    let night = 0;
    guest.onNight = () => (night += 1);
    host.host.room.hostIntent({ kind: "sleep" });
    await until(() => guest.beds.asleep.includes("Host"));
    guest.sendIntent({ kind: "sleep" });
    await until(() => guest.beds.asleep.includes("Ada"));
    guest.sendIntent({ kind: "wake" });
    await until(() => !guest.beds.asleep.includes("Ada"));
    expect(seen.length).toBeGreaterThanOrEqual(3);
    expect(guest.beds.asleep).toEqual(["Host"]);
    state.farm.till(9, 9);
    guest.sendIntent({ kind: "sleep" });
    await until(() => night === 1);
    await until(() => copy.day.clock.day === state.day.clock.day);
    expect(state.day.clock.day).toBeGreaterThan(1);
    expect(host.world.g).toBe(state);
    expect(copy.farm.plotAt(9, 9)?.tilled).toBe(true);
  });
});
