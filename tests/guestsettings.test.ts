// A guest's Assist and "no creatures" settings go to the host and apply to that guest only (note 109, "As built").
import { afterEach, describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { newCreature } from "../src/core/creatures";
import { LOCAL_PLAYER } from "../src/core/players";
import { decodeClient, encode, type ServerMsg } from "../src/core/protocol";
import { Room } from "../src/core/room";
import { floorOf } from "../src/core/roommaps";
import { GameRoomWorld } from "../src/core/roomworld";
import type { Standing } from "../src/core/screens";
import { newGame } from "../src/core/save";
import { GuestClient } from "../src/net/client";
import { NodeHost } from "../src/net/host-node";

const ON = { assist: true, noCreatures: false };
const OFF = { assist: false, noCreatures: false };
const QUIET = { assist: false, noCreatures: true };

function mk() {
  const g = newGame("standard", "separate");
  g.day.clock.day = 30;
  const pos = new Map<string, Standing>();
  const w = new GameRoomWorld(g, {
    random: () => 0.5,
    where: (id) => pos.get(id),
  });
  const room = new Room(w);
  const ann = room.join("Ann", undefined, ON)!;
  const bo = room.join("Bo", undefined, OFF)!;
  const stand = (id: string, tx: number, ty: number) => {
    const ts = maps.get("farm").tileSize;
    pos.set(id, { x: (tx + 0.5) * ts, y: (ty + 1) * ts - 2, map: "mine-5" });
  };
  return { g, w, room, ann, bo, stand };
}

function fightOne(settingsFor: Record<string, typeof ON>) {
  const t = mk();
  for (const [id, s] of Object.entries(settingsFor))
    t.w.setGuestSettings(id === "ann" ? t.ann : t.bo, s);
  const floor = floorOf(t.g, 5);
  // Both guests stand on the floor; the creature stands on Ann.
  t.stand(t.ann, 10, 8);
  t.stand(t.bo, 30, 8);
  const c = newCreature(900, "pebbleback", 10 * 16, 9 * 16 - 3);
  floor.creatures = [c];
  for (let i = 0; i < 40; i++) t.w.step(100);
  const health = (id: string) => {
    const h = t.g.players.get(id).combat.health;
    return h.max - h.current;
  };
  return { ...t, floor, lost: health };
}

describe("per guest settings", () => {
  it("are stored on the guest's own record at join, and the host and others are untouched", () => {
    const { g, ann, bo } = mk();
    expect(g.players.get(ann).combat.assist).toBe(true);
    expect(g.players.get(bo).combat.assist).toBe(false);
    expect(g.players.get(LOCAL_PLAYER).combat.assist).toBe(false);
    expect(g.players.get(LOCAL_PLAYER).combat.noCreatures).toBe(false);
  });

  it("a guest with Assist on takes less from a hit; the host and another guest do not get it", () => {
    const plain = fightOne({ ann: OFF });
    const assisted = fightOne({ ann: ON });
    expect(plain.lost(plain.ann)).toBeGreaterThan(0);
    expect(assisted.lost(assisted.ann)).toBeGreaterThan(0);
    expect(assisted.lost(assisted.ann)).toBeLessThan(plain.lost(plain.ann));
    // Bo and the host are not hit, and Ann's Assist did not touch their records.
    expect(assisted.g.players.get(assisted.bo).combat.assist).toBe(false);
    expect(assisted.g.players.get(LOCAL_PLAYER).combat.assist).toBe(false);
    // Bo with Assist on while Ann has it off: Ann still takes the full hit.
    const other = fightOne({ ann: OFF, bo: ON });
    expect(other.lost(other.ann)).toBe(plain.lost(plain.ann));
  });

  it("a guest with no creatures is not hurt and is sent none; another guest still is", () => {
    const { g, w, ann, bo, floor, stand } = (() => {
      const t = mk();
      const floor = floorOf(t.g, 5);
      floor.creatures = [newCreature(900, "pebbleback", 10 * 16, 9 * 16 - 3)];
      t.stand(t.ann, 10, 8);
      t.stand(t.bo, 12, 8);
      return { ...t, floor };
    })();
    void stand;
    w.setGuestSettings(ann, QUIET);
    const seen: Record<string, ServerMsg[]> = { [ann]: [], [bo]: [] };
    for (let i = 0; i < 40; i++) {
      w.step(100);
      for (const n of w.takeNotices())
        for (const to of n.to ?? []) seen[to]?.push(n.msg);
    }
    const h = g.players.get(ann).combat.health;
    expect(h.current).toBe(h.max);
    const rows = (id: string) =>
      seen[id]!.filter((m) => m.t === "creatures").map((m) => m.rows.length);
    expect(rows(ann).every((n) => n === 0)).toBe(true);
    expect(rows(ann).length).toBeGreaterThan(0);
    expect(rows(bo).every((n) => n === 1)).toBe(true);
    expect(floor.creatures.length).toBe(1);
    const bh = g.players.get(bo).combat.health;
    expect(bh.current).toBeLessThan(bh.max);
  });

  it("change when the guest changes them, and never for the host through a message", () => {
    const { g, room, ann } = mk();
    room.receive(ann, { t: "settings", settings: QUIET });
    expect(g.players.get(ann).combat.assist).toBe(false);
    expect(g.players.get(ann).combat.noCreatures).toBe(true);
    room.receive(ann, { t: "settings", settings: ON });
    expect(g.players.get(ann).combat.assist).toBe(true);
    expect(g.players.get(ann).combat.noCreatures).toBe(false);
    room.receive(LOCAL_PLAYER, { t: "settings", settings: ON });
    expect(g.players.get(LOCAL_PLAYER).combat.assist).toBe(false);
  });

  it("are sent again when a guest who left comes back", () => {
    const { g, room, ann } = mk();
    room.disconnect(ann);
    room.receive(ann, { t: "settings", settings: QUIET }); // a dropped guest is not heard
    expect(g.players.get(ann).combat.noCreatures).toBe(false);
    expect(room.join("Ann", ann, QUIET)).toBe(ann);
    expect(g.players.get(ann).combat.assist).toBe(false);
    expect(g.players.get(ann).combat.noCreatures).toBe(true);
  });

  it("a join without settings leaves the record as it was", () => {
    const { g, room, ann } = mk();
    room.disconnect(ann);
    room.join("Ann", ann);
    expect(g.players.get(ann).combat.assist).toBe(true);
  });
});

describe("settings messages", () => {
  it("round trip, and malformed ones are dropped", () => {
    const m = { t: "settings", settings: ON } as const;
    expect(decodeClient(encode(m))).toEqual(m);
    expect(
      decodeClient('{"t":"settings","settings":{"assist":1}}'),
    ).toBeUndefined();
    expect(decodeClient('{"t":"settings"}')).toBeUndefined();
    expect(
      decodeClient('{"t":"join","name":"A","settings":{"assist":true}}'),
    ).toBeUndefined();
    expect(
      decodeClient(encode({ t: "join", name: "A", settings: QUIET })),
    ).toBeTruthy();
  });
});

describe("over a socket", () => {
  const hosts: NodeHost[] = [];
  const guests: GuestClient[] = [];
  afterEach(async () => {
    guests.splice(0).forEach((c) => c.close());
    await Promise.all(hosts.splice(0).map((h) => h.close()));
  });
  const until = async (cond: () => boolean) => {
    const t0 = performance.now();
    while (!cond()) {
      if (performance.now() - t0 > 4000) throw new Error("timed out");
      await new Promise((r) => setTimeout(r, 5));
    }
  };

  it("the join carries them, a change updates them, a rejoin sends them again", async () => {
    const g = newGame("standard", "separate");
    const world = new GameRoomWorld(g, { random: () => 0.5 });
    const host = await NodeHost.start({ world, tickHz: 50 });
    hosts.push(host);
    const url = `ws://127.0.0.1:${host.port}`;
    const a = await GuestClient.connect(url, { name: "Ann", settings: ON });
    guests.push(a);
    const rec = () => g.players.get(a.id).combat;
    expect(rec().assist).toBe(true);
    a.sendSettings(QUIET);
    await until(() => rec().noCreatures);
    expect(rec().assist).toBe(false);
    expect(g.players.get(LOCAL_PLAYER).combat.noCreatures).toBe(false);
    const id = a.id;
    a.leave();
    await until(() => !host.room.connectedIds.includes(id));
    const b = await GuestClient.connect(url, {
      name: "Ann",
      rejoinId: id,
      settings: ON,
    });
    guests.push(b);
    expect(b.id).toBe(id);
    expect(g.players.get(id).combat.assist).toBe(true);
    expect(g.players.get(id).combat.noCreatures).toBe(false);
  });
});
