// Jam rule (note 53, Q5) against the real Room under simulated latency, on a manual clock.
// No sockets and no real timers: a message queue delivers each message after a one-way delay
// plus jitter, so the runs are deterministic and fast.
import { describe, expect, it } from "vitest";
import { JamTracker } from "../src/core/jam";
import { Room, type RoomWorld } from "../src/core/room";
import type { ClientMsg, PosRow, ServerMsg } from "../src/core/protocol";

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

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Queued {
  at: number;
  seq: number;
  run: () => void;
}

/** Manual clock and a delayed delivery queue. FIFO per link is not forced, so jitter can reorder. */
class Net {
  now = 0;
  private q: Queued[] = [];
  private n = 0;
  constructor(
    private readonly oneWayMs: number,
    private readonly jitterMs: number,
    private readonly rand: () => number,
  ) {}
  send(run: () => void) {
    const d = this.oneWayMs + this.rand() * this.jitterMs;
    this.q.push({ at: this.now + d, seq: this.n++, run });
  }
  advanceTo(t: number) {
    this.now = t;
    this.q.sort((a, b) => a.at - b.at || a.seq - b.seq);
    while (this.q.length && this.q[0]!.at <= t) this.q.shift()!.run();
  }
}

const BODY = 0.8;
// Tiles a second. A slow shuffle in a doorway: at a full walk the two would pass through each
// other before the other's stale position arrived, which is not a jam at all.
const SPEED = 1;
const FRAME = 16; // guest frame, ms
const TICK = 100; // host snapshot, 10 Hz

interface Guest {
  id: string;
  x: number;
  dir: number;
  jam: JamTracker;
  /** Latest positions this guest has been told of (ignores stale ones by ts order). */
  seen: Record<string, PosRow>;
}

function runScenario(oneWay: number, jitter: number, seed: number) {
  const room = new Room(new World(), "Host", 9);
  const net = new Net(oneWay, jitter, rng(seed));
  const mk = (name: string, x: number, dir: number): Guest => ({
    id: room.join(name)!,
    x,
    dir,
    jam: new JamTracker(),
    seen: {},
  });
  const A = mk("Ann", 0, 1);
  const B = mk("Bo", 3, -1);
  const guests = [A, B];
  const deliver = (g: Guest, msgs: ServerMsg[]) => {
    for (const m of msgs)
      if (m.t === "snap")
        net.send(() => {
          // jitter can reorder: keep the row with the newest ts
          for (const [id, row] of Object.entries(m.p)) {
            const old = g.seen[id];
            if (!old || row[2] >= old[2]) g.seen[id] = row;
          }
        });
  };
  let firstBlock = -1;
  let crossedAt = -1;
  let sawPass = false;
  let hostSawPassRow = false;
  let nextTick = TICK;
  let frame = 0;
  for (let t = FRAME; t <= 6000 && crossedAt < 0; t += FRAME) {
    net.advanceTo(t);
    // host ticks at 10 Hz and sends the snapshot to each guest after the one-way delay
    while (nextTick <= t) {
      room.tick(TICK);
      for (const g of guests) deliver(g, room.drain(g.id));
      nextTick += TICK;
    }
    frame++;
    for (const [me, other] of [
      [A, B],
      [B, A],
    ] as const) {
      const otherX = me.seen[other.id]?.[0];
      const next = me.x + me.dir * SPEED * (FRAME / 1000);
      const blockedBy =
        otherX !== undefined &&
        !me.jam.isPassing(other.id) &&
        Math.abs(next - otherX) < BODY &&
        Math.abs(next - otherX) < Math.abs(me.x - otherX)
          ? [other.id]
          : [];
      if (blockedBy.length && firstBlock < 0) firstBlock = t;
      me.jam.tick(FRAME, blockedBy);
      if (!blockedBy.length) me.x = next;
      const pass = me.jam.isPassing(other.id) ? [other.id] : [];
      if (pass.length) sawPass = true;
      const msg: ClientMsg = {
        t: "pos",
        x: me.x,
        y: 0,
        map: "farm",
        dir: 0,
        pass,
        ts: t,
      };
      // guests send a position every 3rd frame (about 20 Hz)
      if (frame % 3 === 0) net.send(() => room.receive(me.id, msg));
    }
    const pa = room.position(A.id);
    const pb = room.position(B.id);
    if (pa && pb && pa.x > pb.x + BODY * 0.5 && A.x > B.x + BODY) crossedAt = t;
    const row = room.positions()[A.id];
    if (row?.[5].includes(B.id)) hostSawPassRow = true;
  }
  return {
    room,
    A,
    B,
    firstBlock,
    crossedAt,
    sawPass,
    hostSawPassRow,
  };
}

describe("jam rule with latency (fake clock, real Room)", () => {
  const cases: [string, number, number][] = [
    ["60 ms one way, no jitter", 60, 0],
    ["100 ms one way, 40 ms jitter", 100, 40],
    ["150 ms one way, 60 ms jitter", 150, 60],
  ];
  for (const [label, oneWay, jitter] of cases) {
    it(`frees two blockers within 1.5 s: ${label}`, () => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const r = runScenario(oneWay, jitter, seed);
        expect(r.firstBlock, `seed ${seed} blocked`).toBeGreaterThan(0);
        expect(r.crossedAt, `seed ${seed} crossed`).toBeGreaterThan(0);
        expect(r.crossedAt - r.firstBlock, `seed ${seed}`).toBeLessThan(1500);
        expect(r.sawPass).toBe(true);
        // the host accepted and rebroadcasts the passing positions with the pass ids
        expect(r.hostSawPassRow).toBe(true);
        expect(r.room.position(r.A.id)!.x).toBeGreaterThan(
          r.room.position(r.B.id)!.x,
        );
      }
    });
  }
});

describe("host with 8 guests under load (real Room, no sockets)", () => {
  it("ticks 9 players for 60 s of game time well inside the 100 ms tick budget", () => {
    const room = new Room(new World(), "Host", 9);
    const ids = Array.from({ length: 8 }, (_, i) => room.join(`G${i}`)!);
    expect(room.connectedIds).toHaveLength(9);
    let worst = 0;
    let total = 0;
    const ticks = 600; // 60 s at 10 Hz
    for (let n = 0; n < ticks; n++) {
      for (const id of ids)
        for (let k = 0; k < 2; k++)
          // 20 Hz position sends
          room.receive(id, {
            t: "pos",
            x: n * 0.1,
            y: k,
            map: "farm",
            dir: n % 4,
            pass: [],
            ts: n * 100,
          });
      const t0 = performance.now();
      room.tick(100);
      for (const id of ids) {
        const out = room.drain(id);
        // each guest gets one snap with all 9 players
        const snap = out.find((m) => m.t === "snap");
        expect(
          Object.keys(snap && snap.t === "snap" ? snap.p : {}),
        ).toHaveLength(9);
      }
      const dt = performance.now() - t0;
      total += dt;
      worst = Math.max(worst, dt);
    }
    // the budget is 100 ms per tick; real cost is a fraction of a millisecond, the limits leave room for a loaded CI machine
    expect(worst).toBeLessThan(100);
    expect(total / ticks).toBeLessThan(25);
  });
});
