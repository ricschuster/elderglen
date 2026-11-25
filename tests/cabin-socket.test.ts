// Headless multiplayer playtest of the guest's cabin (note 110): a real host and guests over WebSockets. Each guest
// starts in their own cabin by their bed, sleeps in any home and wakes there, passes out to their own home, is put
// in their cabin when dropped, owns a mailbox beside their door, and changes only their own bed and cabin.
import { afterEach, describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { cabinMailboxTile } from "../src/core/cabins";
import { bedMoveProblem } from "../src/core/homes";
import type { LetterDef } from "../src/core/mail";
import type { ServerMsg } from "../src/core/protocol";
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

async function until(cond: () => boolean, ms = 6000) {
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
  const ts = maps.ids.includes(map.split("@")[0]!)
    ? maps.get(map.split("@")[0]!).tileSize
    : 16;
  c.sendPos((tx + 0.5) * ts, (ty + 1) * ts - 2, map, 1);
  await new Promise((r) => setTimeout(r, 60));
}

const LETTER: LetterDef = {
  id: "cabin-note",
  sender: "The post",
  title: "For you",
  body: "Welcome to the valley.",
  trigger: { kind: "first-achievement" },
  attachment: { gold: 50 },
};

async function room() {
  const g = newGame("standard", "separate");
  g.day.clock.day = 30;
  g.day.clock.minutes = 12 * 60;
  const hosted: { host?: NodeHost } = {};
  const world = new GameRoomWorld(g, {
    random: () => 0.5,
    where: (id) => hosted.host?.room.position(id),
  });
  const host = await NodeHost.start({ world, tickHz: 50 });
  hosted.host = host;
  hosts.push(host);
  const url = `ws://127.0.0.1:${host.port}`;
  const join = async (name: string, id?: string) => {
    const c = await GuestClient.connect(url, { name, rejoinId: id });
    guests.push(c);
    const copy = deserialize(c.farm)!;
    copy.players.localId = c.id;
    c.onMessage = (m) => {
      if (m.t === "farm") {
        const next = deserialize(m.farm)!;
        next.players.localId = c.id;
        Object.assign(copy, next);
      } else applyServerMsg(copy, m);
    };
    return { c, copy };
  };
  return { g, world, host, url, join };
}

/** The first tile of a home a bed may go on that is not the default, for the owner `by`. */
function freeTile(g: GameState, map: string, by: string) {
  for (let y = 25; y < 36; y++)
    for (let x = 36; x < 46; x++)
      if (
        (x !== 40 || y !== 31) &&
        bedMoveProblem(g, by, map, x, y) === undefined
      )
        return { x, y };
  throw new Error("no free tile");
}

describe("the guest's cabin, over real sockets", () => {
  it("starts each guest in their own cabin by their bed, a dropped one is put there and rejoins there", async () => {
    const { g, world, host, join } = await room();
    const ann = await join("Ann");
    const bo = await join("Bo");
    expect(ann.c.start).toEqual({ map: "house@p2", x: 40, y: 31 });
    expect(bo.c.start).toEqual({ map: "house@p3", x: 40, y: 31 });
    // The cabin book rode in with the farm.
    expect(ann.copy.cabins?.cabins.map((c) => c.ownerKey)).toEqual([
      "p2",
      "p3",
    ]);
    expect(world.cabinOf("p3")?.style).toBe("log");

    await stand(ann.c, "farm", 5, 5);
    ann.c.close();
    await until(() => world.presence("p2") === "dropped");
    // Put in their cabin on the host's books, wherever they were.
    await until(() => host.room.position("p2")?.map === "house@p2");
    expect(g.cabins?.cabins).toHaveLength(2);
    const back = await join("Ann", "p2");
    expect(back.c.id).toBe("p2");
    expect(back.c.start).toEqual({ map: "house@p2", x: 40, y: 31 });
    expect(world.cabinOf("p2")?.ownerKey).toBe("p2");
  });

  it("sleeps in any home and wakes there; the owner alone moves a bed", async () => {
    const { g, world, host, join } = await room();
    const ann = await join("Ann");
    const bo = await join("Bo");
    await stand(ann.c, "house@p3", 38, 31);
    await stand(bo.c, "house@p3", 39, 31);
    const bed = freeTile(g, "house@p3", "p3");
    // A visitor cannot move the owner's bed; the owner can.
    expect(
      await ask(ann.c, { kind: "bed-move", map: "house@p3", ...bed }),
    ).toMatch(/Only the one who lives here/);
    expect(
      await ask(bo.c, { kind: "bed-move", map: "house@p3", ...bed }),
    ).toBeUndefined();
    expect(g.cabins?.beds?.p3).toEqual(bed);
    expect(bo.copy.cabins?.beds?.p3).toEqual(bed);
    // From the wrong map the move is refused.
    expect(
      await ask(bo.c, { kind: "bed-move", map: "house@p2", ...bed }),
    ).toBeDefined();

    // Ann sleeps in Bo's home, Bo in his own, the host in the farmhouse.
    expect(await ask(ann.c, { kind: "sleep" })).toBeUndefined();
    expect(await ask(bo.c, { kind: "sleep" })).toBeUndefined();
    world.apply("p1", { kind: "sleep" });
    await until(() => g.day.clock.day === 31);
    await until(
      () =>
        ann.c.log.some((m) => m.t === "wake") &&
        bo.c.log.some((m) => m.t === "wake"),
    );
    const wake = (c: GuestClient) => c.log.find((m) => m.t === "wake");
    // Ann woke in Bo's home, at Bo's moved bed.
    expect(wake(ann.c)).toEqual({ t: "wake", map: "house@p3", ...bed });
    expect(wake(bo.c)).toEqual({ t: "wake", map: "house@p3", ...bed });
    expect(host.room.position("p2")?.map).toBe("house@p3");
  });

  it("a player who passes out wakes in their own home, not where they stood", async () => {
    const { g, world, host, join } = await room();
    const ann = await join("Ann");
    const bo = await join("Bo");
    await stand(ann.c, "forest", 10, 10);
    await stand(bo.c, "house@p2", 38, 31);
    expect(await ask(bo.c, { kind: "sleep" })).toBeUndefined();
    world.apply("p1", { kind: "sleep" });
    g.day.clock.advance(24 * 60);
    await until(() => g.day.clock.day === 31);
    await until(() => ann.c.log.some((m) => m.t === "wake"));
    expect(ann.c.log.find((m) => m.t === "wake")).toEqual({
      t: "wake",
      map: "house@p2",
      x: 40,
      y: 31,
    });
    expect(host.room.position("p2")?.map).toBe("house@p2");
    // Bo slept in Ann's home, so he wakes there too, though it is not his own.
    expect(bo.c.log.find((m) => m.t === "wake")).toEqual({
      t: "wake",
      map: "house@p2",
      x: 40,
      y: 31,
    });
    expect(world.lastPassOuts.p2).toBeDefined();
  });

  it("each guest has a mailbox by their own door: letters arrive in the morning and only they can open it", async () => {
    const { g, world, join } = await room();
    const ann = await join("Ann");
    const bo = await join("Bo");
    g.players.get("p2").mail.queue(LETTER.id, 31, LETTER);
    const box = cabinMailboxTile(world.cabinOf("p2")!);
    const mine = { kind: "mailbox", map: "farm", ...box };
    // Nothing yet today: the letter is still queued.
    await stand(ann.c, "farm", box.x, box.y);
    expect(await ask(ann.c, { kind: "open", screen: mine })).toBeUndefined();
    expect(await ask(ann.c, { kind: "mail-read", id: LETTER.id })).toBe(
      "There is no such letter.",
    );
    await ask(ann.c, { kind: "close" });
    await stand(ann.c, "house@p2", 38, 31);
    await stand(bo.c, "house@p3", 38, 31);
    expect(await ask(ann.c, { kind: "sleep" })).toBeUndefined();
    expect(await ask(bo.c, { kind: "sleep" })).toBeUndefined();
    world.apply("p1", { kind: "sleep" });
    await until(() => g.day.clock.day === 31);
    expect(g.players.get("p2").mail.entry(LETTER.id)?.state).toBe("waiting");
    // Bo's mailbox is separate: he has nothing, and cannot open Ann's.
    expect(g.players.get("p3").mail.has(LETTER.id)).toBe(false);
    await stand(bo.c, "farm", box.x, box.y);
    expect(await ask(bo.c, { kind: "open", screen: mine })).toBe(
      "That is not your mailbox.",
    );
    // Reading without the screen open is refused; with it open, the gift goes to Ann alone.
    await stand(ann.c, "farm", box.x, box.y);
    expect(await ask(ann.c, { kind: "mail-read", id: LETTER.id })).toBe(
      "open the screen first",
    );
    const gold = g.players.get("p2").money;
    expect(await ask(ann.c, { kind: "open", screen: mine })).toBeUndefined();
    expect(
      await ask(ann.c, { kind: "mail-read", id: LETTER.id }),
    ).toBeUndefined();
    expect(g.players.get("p2").money).toBe(gold + 50);
    expect(g.players.get("p3").money).not.toBe(gold + 50);
    expect(ann.copy.players.get("p2").mail.entry(LETTER.id)?.state).toBe(
      "taken",
    );
  });

  it("changes the outside style and orders tiers and renovations for one's own cabin at the carpenter", async () => {
    const { g, world, join } = await room();
    const ann = await join("Ann");
    const bo = await join("Bo");
    // Without the carpenter's screen open the order is refused.
    expect(await ask(ann.c, { kind: "carp-style", style: "stone" })).toBe(
      "open the screen first",
    );
    const svc = maps
      .get("sawmill")
      .services.find((s) => s.kind === "carpenter")!;
    const ref = { kind: "carpenter", map: "sawmill", x: svc.x, y: svc.y };
    await stand(ann.c, "sawmill", svc.x, svc.y + 1);
    await stand(bo.c, "sawmill", svc.x + 1, svc.y + 1);
    expect(await ask(ann.c, { kind: "open", screen: ref })).toBeUndefined();
    expect(await ask(bo.c, { kind: "open", screen: ref })).toBeUndefined();
    expect(
      await ask(ann.c, { kind: "carp-style", style: "stone" }),
    ).toBeUndefined();
    expect(await ask(ann.c, { kind: "carp-style", style: "stone" })).toBe(
      "It already looks like that.",
    );
    expect(await ask(ann.c, { kind: "carp-style", style: "castle" })).toBe(
      "bad style",
    );
    // Only her own cabin changed, on the host's books and in both copies.
    expect(world.cabinOf("p2")?.style).toBe("stone");
    expect(world.cabinOf("p3")?.style).toBe("log");
    expect(bo.copy.cabins?.cabins.find((c) => c.ownerKey === "p2")?.style).toBe(
      "stone",
    );
    // A tier is the occupant's own order, from her purse and pack; the farmhouse is untouched.
    g.players.get("p2").money = 20000;
    g.players.get("p2").inventory.add("wood", 500);
    expect(await ask(bo.c, { kind: "carp-house" })).toMatch(/You need/);
    expect(await ask(ann.c, { kind: "carp-house" })).toBeUndefined();
    expect(world.cabinOf("p2")?.build).toEqual({ tier: 1, daysLeft: 3 });
    expect(g.houseBuild).toBeUndefined();
    expect(g.players.get("p2").money).toBe(10000);
    expect(world.cabinOf("p3")?.build).toBeUndefined();
    // The host buys a cabin and picks its look at placement.
    expect(world.buyCabin({ x: 20, y: 20 }, "plank")).toBeUndefined();
    expect(g.cabins?.cabins.at(-1)?.style).toBe("plank");
  });
});
