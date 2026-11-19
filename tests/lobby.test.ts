import { describe, expect, it } from "vitest";
import { parseAddress } from "../src/net/address";
import {
  failMessage,
  gameLabel,
  gameStatus,
  joinStep,
  mergeAnnouncement,
  visibleGames,
  type GameEntry,
  type JoinState,
} from "../src/net/lobby";
import { FakeTransport } from "../src/net/transport";

const g = (id: string, over: Partial<GameEntry> = {}): GameEntry => ({
  id,
  name: id,
  host: "10.0.0.2",
  port: 8787,
  players: 1,
  maxPlayers: 8,
  version: 1,
  seen: 0,
  ...over,
});

describe("parseAddress", () => {
  it("takes ip, default port", () => {
    expect(parseAddress(" 192.168.1.20 ")).toEqual({
      ok: true,
      host: "192.168.1.20",
      port: 8787,
      url: "ws://192.168.1.20:8787",
    });
  });
  it("takes port, ws prefix and hostnames", () => {
    expect(parseAddress("ws://Farm.local:9000/")).toMatchObject({
      ok: true,
      host: "farm.local",
      port: 9000,
    });
  });
  it.each([
    "",
    "  ",
    "300.1.1.1",
    "1.2.3",
    "a b",
    "host:0",
    "host:70000",
    "host:x",
    "http://x.y",
    "-bad.com",
    ":80",
  ])("rejects %j", (s) => expect(parseAddress(s).ok).toBe(false));
});

describe("game list", () => {
  it("merges by id and drops stale", () => {
    let l = mergeAnnouncement([], g("a", { seen: 0 }));
    l = mergeAnnouncement(l, g("a", { seen: 5000, players: 2 }));
    l = mergeAnnouncement(l, g("b", { seen: 0 }));
    expect(l).toHaveLength(2);
    expect(visibleGames(l, 9000).map((e) => e.id)).toEqual(["a"]);
  });
  it("labels status", () => {
    expect(gameStatus(g("a", { players: 8 }), 1)).toBe("full");
    expect(gameStatus(g("a"), 2)).toBe("wrong-version");
    expect(gameLabel(g("a"), 1)).toBe("a (1 of 8 players)");
  });
});

describe("join state machine", () => {
  const idle: JoinState = { phase: "idle" };
  const ok = parseAddress("10.0.0.2");
  it("connects", () => {
    const c = joinStep(idle, { type: "start", address: ok });
    expect(c).toEqual({ phase: "connecting", target: "ws://10.0.0.2:8787" });
    expect(joinStep(c, { type: "connected" }).phase).toBe("joined");
  });
  it("fails with a message, and a bad address fails at once", () => {
    const c = joinStep(idle, { type: "start", address: ok });
    expect(joinStep(c, { type: "fail", kind: "timeout" })).toMatchObject({
      phase: "failed",
      message: failMessage("timeout"),
    });
    expect(
      joinStep(idle, { type: "start", address: parseAddress("x y") }).phase,
    ).toBe("failed");
  });
  it("cancels and ignores stray events", () => {
    const c = joinStep(idle, { type: "start", address: ok });
    expect(joinStep(c, { type: "cancel" })).toEqual(idle);
    expect(joinStep(idle, { type: "connected" })).toEqual(idle);
    expect(joinStep(c, { type: "start", address: ok })).toBe(c);
  });
});

describe("FakeTransport", () => {
  it("hosts, discovers and connects", async () => {
    const t = new FakeTransport();
    expect((await t.startHosting("Valley")).address).toContain(":");
    let seen: GameEntry[] = [];
    const stop = t.discover((x) => (seen = x));
    t.announce([g("a")]);
    expect(seen).toHaveLength(1);
    stop();
    t.announce([]);
    expect(seen).toHaveLength(1);
    const a = parseAddress("10.0.0.2");
    if (!a.ok) throw new Error("x");
    expect(await t.connect(a)).toEqual({ ok: false, kind: "unreachable" });
    t.reachable.add(a.url);
    expect(await t.connect(a)).toEqual({ ok: true });
  });
});

describe("failMessage", () => {
  it("has distinct plain texts for full, in-use and unreachable", () => {
    const m = new Set(
      (["full", "in-use", "unreachable"] as const).map(failMessage),
    );
    expect(m.size).toBe(3);
    expect(failMessage("in-use")).toContain("already in the game");
    for (const k of ["full", "in-use", "unreachable"] as const)
      expect(failMessage(k)).not.toContain("\u2014");
  });
});
