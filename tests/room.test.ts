import { describe, expect, it } from "vitest";
import { Room, type RoomWorld } from "../src/core/room";
import { decodeClient, encode } from "../src/core/protocol";
import { JamTracker } from "../src/core/jam";
import type { Intent } from "../src/core/protocol";

class FakeWorld implements RoomWorld {
  dayNo = 1;
  log: string[] = [];
  snaps = 0;
  day() {
    return this.dayNo;
  }
  snapshot() {
    this.snaps++;
    return `farm-day-${this.dayNo}`;
  }
  apply(by: string, i: Intent) {
    if (i.kind === "bad") return "no";
    this.log.push(`${by}:${i.kind}`);
    return undefined;
  }
  addPlayer(id: string) {
    this.log.push(`add ${id}`);
  }
}

const pos = (x: number, y: number, extra = {}) =>
  ({ t: "pos", x, y, map: "farm", ts: 1, ...extra }) as const;

describe("Room", () => {
  it("joins guests with a full farm, hello and a joined notice", () => {
    const w = new FakeWorld();
    const r = new Room(w);
    const a = r.join("Ann")!;
    expect(a).toBe("p2");
    const out = r.drain(a);
    expect(out.map((m) => m.t)).toEqual(["hello", "farm"]);
    const b = r.join("Bo")!;
    expect(b).toBe("p3");
    expect(r.drain(a).map((m) => m.t)).toEqual(["joined"]);
    expect(w.log).toEqual(["add p2", "add p3"]);
    expect(w.snaps).toBe(2);
  });

  it("refuses a ninth player", () => {
    const r = new Room(new FakeWorld());
    for (let i = 0; i < 7; i++) expect(r.join("g")).toBeDefined();
    expect(r.join("late")).toBeUndefined();
  });

  it("sends positions every tick and never the farm", () => {
    const w = new FakeWorld();
    const r = new Room(w);
    const a = r.join("Ann")!;
    r.drain(a);
    r.receive(a, pos(3, 4));
    const before = w.snaps;
    for (let i = 0; i < 5; i++) r.tick(100);
    const out = r.drain(a);
    expect(out).toHaveLength(5);
    expect(out.every((m) => m.t === "snap")).toBe(true);
    const last = out[4];
    if (last?.t !== "snap") throw new Error();
    expect(last.p.p2?.slice(0, 2)).toEqual([3, 4]);
    expect(w.snaps).toBe(before);
  });

  it("applies an intent, tells everyone, and rejects a bad one to the sender only", () => {
    const w = new FakeWorld();
    const r = new Room(w);
    const a = r.join("Ann")!;
    const b = r.join("Bo")!;
    r.drain(a);
    r.drain(b);
    r.receive(a, { t: "intent", seq: 7, intent: { kind: "till" } });
    const applied = {
      t: "applied",
      seq: 7,
      by: "p2",
      intent: { kind: "till" },
    };
    expect(r.drain(b)).toEqual([applied]);
    r.drain(a);
    r.receive(a, { t: "intent", seq: 8, intent: { kind: "bad" } });
    expect(r.drain(a)).toEqual([{ t: "rejected", seq: 8, reason: "no" }]);
    expect(r.drain(b)).toEqual([]);
    expect(w.log).toContain("p2:till");
  });

  it("applies the host's own intent", () => {
    const w = new FakeWorld();
    const r = new Room(w);
    const a = r.join("Ann")!;
    r.drain(a);
    expect(r.hostIntent({ kind: "water" })).toBeUndefined();
    expect(r.hostIntent({ kind: "bad" })).toBe("no");
    expect(r.drain(a)).toHaveLength(1);
  });

  it("sends a day marker to present guests and the farm to an away one", () => {
    const w = new FakeWorld();
    const r = new Room(w);
    const a = r.join("Ann")!;
    const b = r.join("Bo")!;
    r.receive(b, { t: "away", away: true });
    r.drain(a);
    r.drain(b);
    w.dayNo = 2;
    r.tick(100);
    expect(r.drain(a).map((m) => m.t)).toEqual(["day", "snap"]);
    const bo = r.drain(b);
    expect(bo.map((m) => m.t)).toEqual(["farm", "snap"]);
    expect(bo[0]).toMatchObject({ farm: "farm-day-2", day: 2 });
  });

  it("rejoins as the same player after a day change with a fresh farm", () => {
    const w = new FakeWorld();
    const r = new Room(w);
    const a = r.join("Ann")!;
    r.drain(a);
    r.disconnect(a);
    expect(r.connectedIds).toEqual(["p1"]);
    w.dayNo = 3;
    r.tick(100);
    expect(r.join("Ann", "p9")).toBeDefined();
    const back = r.join("Ann", a)!;
    expect(back).toBe(a);
    const out = r.drain(a);
    expect(out[1]).toMatchObject({ t: "farm", day: 3, farm: "farm-day-3" });
    expect(r.ids.filter((i) => i === a)).toHaveLength(1);
    expect(r.join("Dup", a)).toBeUndefined();
  });

  it("passes the jam rule through in positions, dropping unknown ids", () => {
    const w = new FakeWorld();
    const r = new Room(w);
    const a = r.join("Ann")!;
    const b = r.join("Bo")!;
    const jam = new JamTracker();
    jam.tick(600, [b]);
    expect(jam.isPassing(b)).toBe(true);
    const pass = [b, "p99", a].filter(
      (id) => id === b || id === "p99" || id === a,
    );
    r.receive(a, pos(1, 1, { pass }));
    r.drain(b);
    r.tick(100);
    const snap = r.drain(b)[0];
    if (snap?.t !== "snap") throw new Error();
    expect(snap.p[a]?.[5]).toEqual([b]);
  });

  it("decodes messages and rejects malformed ones", () => {
    expect(decodeClient(encode(pos(1, 2)))).toMatchObject({ t: "pos" });
    expect(decodeClient("nope")).toBeUndefined();
    expect(decodeClient('{"t":"pos","x":"a"}')).toBeUndefined();
    expect(decodeClient('{"t":"intent","seq":1,"intent":{}}')).toBeUndefined();
  });
});
