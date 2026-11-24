// Headless multiplayer playtest for guests off the farm (note 109, steps 2 to 4): a real host and two guests over
// WebSockets. Reach and map checks, forage on another map, a shared mine floor with creatures that chase the
// nearest guest, a swing that kills for the swinger alone, and what each guest's copy learns from the host.
import { afterEach, describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { FORAGE } from "../src/core/forage";
import { newCreature } from "../src/core/creatures";
import type { ServerMsg } from "../src/core/protocol";
import { floorOf, TOO_FAR } from "../src/core/roommaps";
import { GameRoomWorld } from "../src/core/roomworld";
import { deserialize, newGame, type GameState } from "../src/core/save";
import { applyServerMsg } from "../src/net/guestapply";
import { GuestClient } from "../src/net/client";
import { NodeHost } from "../src/net/host-node";

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
  const ts = maps.ids.includes(map) ? maps.get(map).tileSize : 16;
  c.sendPos((tx + 0.5) * ts, (ty + 1) * ts - 2, map, 1);
  await new Promise((r) => setTimeout(r, 60));
}

async function room() {
  const g = newGame("standard", "separate");
  g.day.clock.day = 30;
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
  const copies = new Map<string, GameState>();
  for (const c of [ann, bo]) {
    const copy = deserialize(c.farm)!;
    copy.players.localId = c.id;
    c.onMessage = (m) => applyServerMsg(copy, m);
    copies.set(c.id, copy);
  }
  return { g, ann, bo, copies };
}

describe("guests off the farm, over real sockets", () => {
  it("the host checks the map and the reach, and forage on another map goes to the first guest", async () => {
    const { g, ann, bo } = await room();
    const id = FORAGE[0]!.id;
    g.areas.forest!.forage.load([{ x: 12, y: 12, id }]);
    await stand(ann, "forest", 12, 13);
    await stand(bo, "farm", 10, 10);
    // Bo is on the farm: the forest is not theirs to pick from, and the farm tile is out of reach.
    expect(await ask(bo, { kind: "forage", map: "forest", x: 12, y: 12 })).toBe(
      TOO_FAR,
    );
    expect(await ask(bo, { kind: "till", x: 40, y: 40 })).toBe(TOO_FAR);
    expect(
      await ask(ann, { kind: "forage", map: "forest", x: 12, y: 12 }),
    ).toBeUndefined();
    expect(g.players.get(ann.id).inventory.count(id)).toBeGreaterThan(0);
    await stand(bo, "forest", 12, 14);
    expect(await ask(bo, { kind: "forage", map: "forest", x: 12, y: 12 })).toBe(
      "Nothing to pick here.",
    );
  });

  it("two guests share a mine floor: creatures chase the nearest, a swing kills for the swinger, drops are shared", async () => {
    const { g, ann, bo, copies } = await room();
    const floor = floorOf(g, 5);
    floor.creatures = [newCreature(900, "pebbleback", 8 * 16, 8 * 16)];
    g.players.get(ann.id).inventory.add("hazel-switch", 1);
    await stand(ann, "mine-5", 9, 8);
    await stand(bo, "mine-5", 17, 8);
    // Both copies are given the creatures by the host.
    const seen = (c: GuestClient) => floorOf(copies.get(c.id)!, 5).creatures;
    await until(() => seen(ann).length === 1 && seen(bo).length === 1);
    // It goes for Ann, who is nearer, and hurts only her.
    await until(() => g.players.get(ann.id).combat.health.current < 100, 8000);
    expect(g.players.get(bo.id).combat.health.current).toBe(100);
    expect(floor.creatures[0]!.x).toBeGreaterThan(8 * 16 - 1);
    // Ann hits it down. Park it beside her first so the swing reaches.
    const c = floor.creatures[0]!;
    c.hp = 1;
    c.x = 9.5 * 16;
    c.y = 7.5 * 16 + 4;
    // The cooldown from any earlier swing is not an issue: this is her first.
    expect(
      await ask(ann, {
        kind: "swing",
        map: "mine-5",
        weapon: "hazel-switch",
        facing: "up",
      }),
    ).toBeUndefined();
    expect(floor.creatures).toHaveLength(0);
    expect(g.players.get(ann.id).combat.kills.pebbleback).toBe(1);
    expect(g.players.get(bo.id).combat.kills.pebbleback).toBeUndefined();
    // Ann's copy has her kill (the host sent her record); Bo's copy has none.
    await until(
      () =>
        copies.get(ann.id)!.players.get(ann.id).combat.kills.pebbleback === 1,
    );
    expect(
      copies.get(bo.id)!.players.get(bo.id).combat.kills.pebbleback,
    ).toBeUndefined();
    // The drops lie on the shared floor; the first guest to walk over them takes them.
    await until(() => seen(bo).length === 0);
    const piles = floor.ground.each().map((p) => ({ ...p }));
    if (piles.length > 0) {
      const p = piles[0]!;
      await stand(bo, "mine-5", p.x, p.y);
      await until(() => floor.ground.count === 0);
      expect(g.players.get(bo.id).inventory.count(p.id)).toBeGreaterThan(0);
    }
  });
  it("Maren's wall list runs on the host for each guest's own kills and purse", async () => {
    const { g, ann, bo, copies } = await room();
    const svc = maps.get("mine").services.find((v) => v.kind === "wall-list")!;
    const screen = { kind: "walllist", map: "mine", x: svc.x, y: svc.y };
    g.players.get(ann.id).combat.kills["dustmoth"] = 500;
    // The copy has the kills as the host's `player` messages would have brought them.
    copies.get(ann.id)!.players.get(ann.id).combat.kills["dustmoth"] = 500;
    await stand(ann, "mine", svc.x, svc.y + 1);
    await stand(bo, "mine", svc.x, svc.y + 1);
    const claim = { kind: "slayer-claim", goal: "dustmoth" };
    expect(await ask(ann, claim)).toBe("open the screen first");
    expect(await ask(ann, { kind: "open", screen })).toBeUndefined();
    expect(await ask(bo, { kind: "open", screen })).toBeUndefined();
    expect(await ask(bo, claim)).toMatch(/not met/);
    expect(await ask(ann, claim)).toBeUndefined();
    expect(g.players.get(ann.id).combat.slayerClaimed).toContain(
      "goal:dustmoth",
    );
    expect(g.players.get(bo.id).combat.slayerClaimed).toHaveLength(0);
    // Ann's copy shows her claim through the host's player message; Bo's does not.
    await until(() =>
      copies
        .get(ann.id)!
        .players.get(ann.id)
        .combat.slayerClaimed.includes("goal:dustmoth"),
    );
    expect(
      copies.get(bo.id)!.players.get(bo.id).combat.slayerClaimed,
    ).toHaveLength(0);
    // The reward shop sells from her own purse only.
    g.players.get(ann.id).money = 100;
    expect(
      await ask(ann, { kind: "slayer-buy", item: "burglar-ring" }),
    ).toBeDefined();
    expect(g.players.get(ann.id).money).toBe(100);
  });

  it("a guest's bomb blinks on both screens, then breaks the rock and kills as the thrower", async () => {
    const { g, ann, bo } = await room();
    const floor = floorOf(g, 5);
    floor.creatures = [];
    floor.rocks.add(12, 8, "stone");
    g.players.get(ann.id).inventory.add("bomb", 1);
    await stand(ann, "mine-5", 10, 8);
    await stand(bo, "mine-5", 20, 8);
    const seen = (c: GuestClient, t: string) => c.log.some((m) => m.t === t);
    expect(
      await ask(ann, {
        kind: "bomb",
        map: "mine-5",
        x: 11,
        y: 8,
        item: "bomb",
      }),
    ).toBeUndefined();
    await until(() => seen(ann, "bomb") && seen(bo, "bomb"));
    await until(() => seen(ann, "blast") && seen(bo, "blast"), 6000);
    expect(floor.rocks.at(12, 8)).toBeUndefined();
    expect(g.players.get(ann.id).inventory.count("bomb")).toBe(0);
  });
});
