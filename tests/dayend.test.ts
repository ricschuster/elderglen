import { describe, expect, it } from "vitest";
import {
  DAY_END,
  DayEndTracker,
  evaluateDayEnd,
  needsFullSnapshot,
} from "../src/core/dayend";
import { Room, type RoomWorld } from "../src/core/room";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe("evaluateDayEnd", () => {
  it("waits while anyone connected is awake", () => {
    const d = evaluateDayEnd(
      [
        { id: "p1", presence: "asleep" },
        { id: "p2", presence: "awake" },
      ],
      false,
    );
    expect(d.end).toBe(false);
    expect(d.waiting).toEqual(["p2"]);
  });
  it("ends when all connected are asleep, for 2 to 8 players", () => {
    for (let n = 2; n <= 8; n++) {
      const d = evaluateDayEnd(
        ids(n).map((id) => ({ id, presence: "asleep" as const })),
        false,
      );
      expect(d).toMatchObject({ end: true, reason: "all-asleep" });
    }
  });
  it("a dropped guest never blocks", () => {
    const d = evaluateDayEnd(
      [
        { id: "p1", presence: "asleep" },
        { id: "p2", presence: "dropped" },
      ],
      false,
    );
    expect(d.end).toBe(true);
    expect(d.dropped).toEqual(["p2"]);
  });
  it("at the limit the awake pass out", () => {
    const d = evaluateDayEnd(
      [
        { id: "p1", presence: "asleep" },
        { id: "p2", presence: "awake" },
        { id: "p3", presence: "awake" },
        { id: "p4", presence: "dropped" },
      ],
      true,
    );
    expect(d).toMatchObject({ end: true, reason: "limit" });
    expect(d.passOut).toEqual(["p2", "p3"]);
  });
});

describe("DayEndTracker", () => {
  it("settles, ends once, then resets with dropped staying dropped", () => {
    let ended = 0;
    const t = new DayEndTracker(["p1", "p2", "p3"], () => ended++);
    t.setAsleep("p1");
    t.setAsleep("p2");
    t.drop("p3");
    expect(t.check(100, false)).toBeUndefined();
    const d = t.check(DAY_END.settleMs, false);
    expect(d?.reason).toBe("all-asleep");
    expect(ended).toBe(1);
    expect(t.presence("p1")).toBe("awake");
    expect(t.presence("p3")).toBe("dropped");
  });
  it("waking cancels the settle", () => {
    const t = new DayEndTracker(["p1", "p2"]);
    t.setAsleep("p1");
    t.setAsleep("p2");
    t.check(1000, false);
    t.wake("p2");
    expect(t.check(DAY_END.settleMs, false)).toBeUndefined();
  });
  it("the host cannot be dropped; limit ends at once", () => {
    const t = new DayEndTracker(["p1", "p2"]);
    t.drop("p1");
    expect(t.presence("p1")).toBe("awake");
    expect(t.check(0, true)?.passOut).toEqual(["p1", "p2"]);
  });
  it("a rejoining guest is awake and blocks again", () => {
    const t = new DayEndTracker(["p1", "p2"]);
    t.drop("p2");
    t.setAsleep("p1");
    expect(t.rejoin("p2")).toBe(true);
    expect(t.decision().waiting).toEqual(["p2"]);
    expect(t.rejoin("p9")).toBe(false);
  });
  it("flags a lone holdout", () => {
    const t = new DayEndTracker(["p1", "p2"]);
    t.setAsleep("p1");
    t.check(DAY_END.nagAfterMs, false);
    expect(t.loneHoldout).toBe(true);
  });
});

describe("Room hook and rejoin", () => {
  it("calls the drop and rejoin hooks and sends a full farm if the day changed", () => {
    let day = 3;
    const t = new DayEndTracker(["p1"]);
    const world: RoomWorld = {
      day: () => day,
      snapshot: () => "FARM",
      apply: () => undefined,
      addPlayer: (id) => t.add(id),
      playerDropped: (id) => t.drop(id),
      playerRejoined: (id) => t.rejoin(id),
    };
    const room = new Room(world);
    const g = room.join("Guest")!;
    room.drain(g);
    t.setAsleep("p1");
    room.disconnect(g);
    expect(t.presence(g)).toBe("dropped");
    expect(t.check(DAY_END.settleMs, false)?.end).toBe(true);
    day = 4;
    room.tick(10);
    expect(needsFullSnapshot(3, day)).toBe(true);
    expect(room.join("Guest", g)).toBe(g);
    expect(t.presence(g)).toBe("awake");
    const out = room.drain(g);
    expect(out.find((m) => m.t === "farm")).toMatchObject({ day: 4 });
  });
});
