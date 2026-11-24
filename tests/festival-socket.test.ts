// Headless multiplayer playtest for festivals with several players (note 111): a real host and two guests over
// WebSockets. The gate (all in first, waiting lines, the clock, leave together), the shared Harvest Showing
// display with its lock and per-player prizes, a seed hunt winner, the ice contest winners, the cake table where
// the worst dish sets it, and per-player rewards (lantern keepsake, maze chest, feast draw).
import { afterEach, describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { DAYS_PER_SEASON, SEASONS } from "../src/core/calendar";
import { LOCAL_PLAYER } from "../src/core/players";
import type { FestivalView, ServerMsg } from "../src/core/protocol";
import { festivalLayout, RIVALS } from "../src/core/festivalroutes";
import { FESTIVALS } from "../src/core/festivals";
import { packetTiles } from "../src/core/seedhunt";
import { FISH } from "../src/core/fishing";
import { KEEPSAKE, LANTERN } from "../src/core/lanterns";
import { GameRoomWorld } from "../src/core/roomworld";
import { newGame, type GameState } from "../src/core/save";
import { sharedResult } from "../src/core/showing";
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

const tile = (map: string) =>
  maps.ids.includes(map) ? maps.get(map).tileSize : 16;

async function stand(c: GuestClient, map: string, tx: number, ty: number) {
  const ts = tile(map);
  c.sendPos((tx + 0.5) * ts, (ty + 1) * ts - 2, map, 1);
  await new Promise((r) => setTimeout(r, 60));
}

/** The calendar day of a festival in year 1. */
const dayOfFestival = (id: string): number => {
  const f = FESTIVALS.find((x) => x.id === id)!;
  return SEASONS.indexOf(f.season) * DAYS_PER_SEASON + f.day;
};

/** The latest festival view a guest was sent. */
const viewOf = (c: GuestClient): FestivalView | undefined =>
  [...c.log].reverse().find((m) => m.t === "festival")?.view;

const linesOf = (c: GuestClient): string[] =>
  c.log.flatMap((m) => (m.t === "fline" ? [m.text] : []));

async function room(festival: string, minutes = 13 * 60) {
  const g = newGame("standard", "separate");
  g.day.clock.day = dayOfFestival(festival);
  g.day.clock.minutes = minutes;
  const hosted: { host?: NodeHost } = {};
  const world = new GameRoomWorld(g, {
    random: () => 0.5,
    where: (id) => hosted.host?.room.position(id),
  });
  const host = await NodeHost.start({ world, tickHz: 50, hostName: "Host" });
  hosted.host = host;
  hosts.push(host);
  const url = `ws://127.0.0.1:${host.port}`;
  const ann = await GuestClient.connect(url, { name: "Ann" });
  const bo = await GuestClient.connect(url, { name: "Bo" });
  guests.push(ann, bo);
  const hostStand = (map: string, tx: number, ty: number) => {
    const ts = tile(map);
    host.room.receive(LOCAL_PLAYER, {
      t: "pos",
      x: (tx + 0.5) * ts,
      y: (ty + 1) * ts - 2,
      map,
      ts: 0,
    });
  };
  const hostDo = (intent: Parameters<typeof host.room.hostIntent>[0]) =>
    host.room.hostIntent(intent);
  return { g, world, host, ann, bo, hostStand, hostDo };
}

const give = (g: GameState, id: string, item: string, n = 1) =>
  g.players.get(id).inventory.add(item, n);

describe("festival gate, shared display and leaving, over real sockets", () => {
  it("waits for every player, stops the clock when all are in, and leaves together", async () => {
    const { g, world, ann, bo, hostStand, hostDo } =
      await room("harvest-showing");
    hostStand("farm", 1, 1);
    expect(world.festival.clockHeld()).toBe(false);
    // Ann goes in first: she waits and the clock still runs.
    expect(await ask(ann, { kind: "festival-enter" })).toBeUndefined();
    await until(() => viewOf(ann)?.line === "Waiting for Host and Bo.");
    expect(world.festival.clockHeld()).toBe(false);
    // She cannot buy or leave yet.
    expect(await ask(ann, { kind: "festival-leave" })).toBe(
      "The others have not all come in yet.",
    );
    expect(await ask(bo, { kind: "festival-enter" })).toBeUndefined();
    await until(() => viewOf(bo)?.line === "Waiting for Host.");
    expect(hostDo({ kind: "festival-enter" })).toBeUndefined();
    await until(() => viewOf(ann)?.ahead === true);
    expect(world.festival.clockHeld()).toBe(true);
    // Leave together: the first to choose waits.
    expect(await ask(ann, { kind: "festival-leave" })).toBeUndefined();
    await until(() => viewOf(ann)?.line === "Waiting for the others to leave.");
    expect(await ask(bo, { kind: "festival-leave" })).toBeUndefined();
    expect(viewOf(bo)?.ended).toBe(false);
    expect(hostDo({ kind: "festival-leave" })).toBeUndefined();
    await until(() => viewOf(ann)?.ended === true);
    expect(world.festival.clockHeld()).toBe(false);
    expect(g.day.clock.minutes).toBe(22 * 60);
  });

  it("a dropped guest does not hold the festival up", async () => {
    const { ann, bo, world, hostDo } = await room("harvest-showing");
    expect(await ask(ann, { kind: "festival-enter" })).toBeUndefined();
    expect(hostDo({ kind: "festival-enter" })).toBeUndefined();
    await until(() => viewOf(ann)?.line === "Waiting for Bo.");
    bo.close();
    await until(() => viewOf(ann)?.ahead === true);
    expect(world.festival.clockHeld()).toBe(true);
  });

  it("is turned away before opening, and the Night Market has no gate", async () => {
    const early = await room("harvest-showing", 11 * 60);
    expect(await ask(early.ann, { kind: "festival-enter" })).toMatch(
      /has not started/,
    );
    const market = await room("night-market", 18 * 60);
    expect(await ask(market.ann, { kind: "festival-enter" })).toBe(
      "There is no festival today.",
    );
    expect(market.world.festival.clockHeld()).toBe(false);
  });

  it("one shared display: one player at a time, one judging, each collects their own prize", async () => {
    const { g, ann, bo, hostStand, hostDo } = await room("harvest-showing");
    const fish = FISH[0]!.id;
    give(g, ann.id, fish, 2);
    give(g, bo.id, fish, 1);
    hostStand("green", 17, 12);
    await stand(ann, "green", 16, 9);
    await stand(bo, "green", 17, 9);
    await ask(ann, { kind: "festival-enter" });
    await ask(bo, { kind: "festival-enter" });
    hostDo({ kind: "festival-enter" });
    await until(() => viewOf(ann)?.ahead === true);
    const table = { kind: "showing", map: "green", x: 16, y: 8 };
    const judge = { kind: "showing", map: "green", x: 19, y: 8 };
    // Ann has the table; Bo is told it is in use, at either of its two tiles.
    expect(await ask(ann, { kind: "open", screen: table })).toBeUndefined();
    expect(await ask(bo, { kind: "open", screen: judge })).toBe(
      "Someone is using the table.",
    );
    // Bo may not set it, and Ann cannot set goods she does not hold.
    expect(await ask(bo, { kind: "showing-set", ids: [fish] })).toBe(
      "Open the table first.",
    );
    expect(await ask(ann, { kind: "showing-set", ids: [fish, "nope"] })).toBe(
      undefined,
    );
    expect(await ask(ann, { kind: "showing-judge" })).toMatch(
      /cannot be shown/,
    );
    expect(await ask(ann, { kind: "showing-set", ids: [fish, fish] })).toBe(
      undefined,
    );
    await until(() => viewOf(bo)?.showing?.table.length === 2);
    expect(viewOf(bo)?.showing?.holder).toBe(ann.id);
    expect(await ask(ann, { kind: "showing-judge" })).toBeUndefined();
    const r = sharedResult(g)!;
    await until(() => viewOf(bo)?.showing?.result?.place === r.place.place);
    // Judged once: a second try is refused, and nobody has been paid yet.
    expect(await ask(ann, { kind: "showing-judge" })).toBe(
      "The judge has already scored the table.",
    );
    expect(g.players.get(ann.id).showTokens.count).toBe(0);
    // Bo collects with the same placing without ever holding the table.
    expect(await ask(bo, { kind: "showing-collect" })).toBeUndefined();
    expect(g.players.get(bo.id).showTokens.count).toBe(r.place.tokens);
    expect(g.players.get(ann.id).showTokens.count).toBe(0);
    expect(await ask(bo, { kind: "showing-collect" })).toBe(
      "You have collected your prize from the judge.",
    );
    expect(await ask(ann, { kind: "showing-collect" })).toBeUndefined();
    expect(g.players.get(ann.id).showTokens.count).toBe(r.place.tokens);
    expect(hostDo({ kind: "showing-collect" })).toBeUndefined();
    expect(g.showTokens.count).toBe(r.place.tokens);
    // Ann puts the table down: Bo can open it now.
    await ask(ann, { kind: "close" });
    expect(await ask(bo, { kind: "open", screen: judge })).toBeUndefined();
  });
});

describe("main events with several players, over real sockets", () => {
  it("the seed hunt: a lower target and the top player alone wins; the festival ends", async () => {
    const { g, world, ann, bo, hostStand, hostDo } =
      await room("seedswap-fair");
    const f = FESTIVALS.find((x) => x.id === "seedswap-fair")!;
    const layout = festivalLayout(f)!;
    const [px, py] = [74, 20];
    hostStand("forest", px, py);
    await stand(ann, "forest", px + 1, py);
    await stand(bo, "forest", px + 2, py);
    await ask(ann, { kind: "festival-enter" });
    await ask(bo, { kind: "festival-enter" });
    hostDo({ kind: "festival-enter" });
    await until(() => viewOf(ann)?.ahead === true);
    expect(await ask(ann, { kind: "hunt-start" })).toBeUndefined();
    await until(() => viewOf(bo)?.hunt !== undefined);
    // Three players: the target is 6.
    expect(viewOf(bo)!.hunt!.target).toBe(6);
    expect(await ask(bo, { kind: "hunt-start" })).toBe("The hunt is on.");
    const tiles = packetTiles(layout.hunt!, g.day.clock.day);
    // Ann takes seven packets, Bo takes six: both reach the target, Ann has the most.
    for (const t of tiles.slice(0, 7)) await stand(ann, "forest", t[0], t[1]);
    for (const t of tiles.slice(7, 13)) await stand(bo, "forest", t[0], t[1]);
    await until(
      () =>
        viewOf(ann)?.hunt?.counts[ann.id] === 7 &&
        viewOf(ann)?.hunt?.counts[bo.id] === 6,
    );
    // Run the clock out; it is a short wait for the test.
    const left = (world.festival as unknown as { hunt: { left: number } }).hunt;
    left.left = 0.05;
    await until(() => viewOf(ann)?.ended === true);
    expect(linesOf(ann).join(" ")).toMatch(/You win the hunt/);
    expect(linesOf(bo).join(" ")).toMatch(/Ann wins the hunt/);
    expect(g.players.get(ann.id).inventory.count("ember-berry-seed")).toBe(1);
    expect(g.players.get(bo.id).inventory.count("ember-berry-seed")).toBe(0);
    expect(g.day.clock.minutes).toBe(f.ends);
    void RIVALS;
  });

  it("the ice contest: every winner is rewarded, guest catches count, and judging all ends it", async () => {
    const { g, world, ann, bo, hostStand, hostDo } = await room("frostday");
    hostStand("forest", 40, 20);
    await stand(ann, "forest", 41, 20);
    await stand(bo, "forest", 42, 20);
    await ask(ann, { kind: "festival-enter" });
    await ask(bo, { kind: "festival-enter" });
    hostDo({ kind: "festival-enter" });
    await until(() => viewOf(ann)?.ahead === true);
    for (let i = 0; i < 5; i++) world.festival.iceCatch(ann.id);
    for (let i = 0; i < 5; i++) world.festival.iceCatch(bo.id);
    world.festival.iceCatch(LOCAL_PLAYER);
    await until(() => viewOf(bo)?.ice?.entries[bo.id]?.caught === 5);
    expect(await ask(ann, { kind: "ice-judge" })).toBeUndefined();
    await until(() => linesOf(ann).some((l) => /win the contest/.test(l)));
    expect(g.players.get(ann.id).inventory.count("frostfin")).toBe(1);
    expect(viewOf(ann)?.ended).toBe(false);
    expect(await ask(bo, { kind: "ice-judge" })).toBeUndefined();
    await until(() => g.players.get(bo.id).inventory.count("frostfin") === 1);
    expect(world.festival.iceWinnerIds().sort()).toEqual(
      [ann.id, bo.id].sort(),
    );
    // The host has one fish and has not asked to be judged, so they are told to keep fishing.
    expect(hostDo({ kind: "ice-judge" })).toBeUndefined();
    expect(viewOf(ann)?.ended).toBe(false);
    // Past the judging time the host's short count loses and everyone is judged: the contest ends the festival.
    g.day.clock.minutes = 17 * 60 + 10;
    expect(hostDo({ kind: "ice-judge" })).toBeUndefined();
    await until(() => viewOf(ann)?.ended === true);
  });

  it("the cake table: the worst dish sets it for everyone", async () => {
    const { g, ann, bo, hostStand, hostDo } = await room("cake-day");
    hostStand("hearthwell", 20, 62);
    await stand(ann, "hearthwell", 21, 62);
    await stand(bo, "hearthwell", 22, 62);
    await ask(ann, { kind: "festival-enter" });
    await ask(bo, { kind: "festival-enter" });
    hostDo({ kind: "festival-enter" });
    await until(() => viewOf(ann)?.ahead === true);
    const dish = "fried-egg";
    give(g, ann.id, `${dish}@gold`);
    give(g, bo.id, `${dish}@silver`);
    g.inventory.add(`${dish}@gold`, 1);
    expect(await ask(ann, { kind: "cake-give", item: `${dish}@gold` })).toBe(
      undefined,
    );
    expect(g.players.get(ann.id).inventory.count(`${dish}@gold`)).toBe(0);
    expect(await ask(ann, { kind: "cake-give", item: dish })).toMatch(
      /already|do not have/,
    );
    expect(await ask(bo, { kind: "cake-give", item: `${dish}@silver` })).toBe(
      undefined,
    );
    expect(viewOf(ann)?.cake?.tasted).toBeUndefined();
    expect(hostDo({ kind: "cake-give", item: `${dish}@gold` })).toBeUndefined();
    await until(() => viewOf(ann)?.cake?.tasted === "silver");
    expect(linesOf(ann).join(" ")).toMatch(
      /Everyone tastes the cake \(silver\)/,
    );
    expect(await ask(bo, { kind: "cake-give", item: dish })).toBe(
      "The cake has been tasted already.",
    );
  });

  it("a player with no dish makes it the poor one when the table is tasted", async () => {
    const { g, ann, bo, hostStand, hostDo } = await room("cake-day");
    hostStand("hearthwell", 20, 62);
    await stand(ann, "hearthwell", 21, 62);
    await stand(bo, "hearthwell", 22, 62);
    await ask(ann, { kind: "festival-enter" });
    await ask(bo, { kind: "festival-enter" });
    hostDo({ kind: "festival-enter" });
    await until(() => viewOf(ann)?.ahead === true);
    give(g, ann.id, "fried-egg@gold");
    expect(await ask(bo, { kind: "cake-taste" })).toBe(
      "Put a dish on the table first.",
    );
    await ask(ann, { kind: "cake-give", item: "fried-egg@gold" });
    expect(await ask(bo, { kind: "cake-taste" })).toBeUndefined();
    await until(() => viewOf(ann)?.cake?.tasted === "normal");
  });
});

describe("per-player rewards, over real sockets", () => {
  it("each player floats their own lantern and gets the keepsake once", async () => {
    const { g, ann, bo, hostStand, hostDo } = await room(
      "lamplight-evening",
      18 * 60,
    );
    hostStand("delta", 70, 30);
    await stand(ann, "delta", 71, 30);
    await stand(bo, "delta", 72, 30);
    await ask(ann, { kind: "festival-enter" });
    await ask(bo, { kind: "festival-enter" });
    hostDo({ kind: "festival-enter" });
    await until(() => viewOf(ann)?.ahead === true);
    g.players.get(ann.id).money = 500;
    g.players.get(bo.id).money = 500;
    expect(await ask(ann, { kind: "lantern-buy" })).toBeUndefined();
    expect(await ask(ann, { kind: "lantern-launch" })).toBeUndefined();
    expect(g.players.get(ann.id).inventory.count(KEEPSAKE.id)).toBe(1);
    // Bo has not floated one: the keepsake and the year's launch are still theirs.
    expect(g.players.get(bo.id).inventory.count(KEEPSAKE.id)).toBe(0);
    expect(await ask(bo, { kind: "lantern-launch" })).toMatch(/Buy a lantern/);
    expect(await ask(ann, { kind: "lantern-buy" })).toBe(
      "You have already floated your lantern.",
    );
    expect(await ask(bo, { kind: "lantern-buy" })).toBeUndefined();
    expect(await ask(bo, { kind: "lantern-launch" })).toBeUndefined();
    expect(g.players.get(bo.id).inventory.count(KEEPSAKE.id)).toBe(1);
    expect(g.players.get(ann.id).money).toBe(500 - LANTERN.price);
    // The host's own record is untouched.
    expect(g.inventory.count(KEEPSAKE.id)).toBe(0);
  });

  it("each player opens the maze chest once for themselves", async () => {
    const { g, ann, bo, hostDo } = await room("hollow-eve", 21 * 60);
    await ask(ann, { kind: "festival-enter" });
    await ask(bo, { kind: "festival-enter" });
    hostDo({ kind: "festival-enter" });
    await until(() => viewOf(ann)?.ahead === true);
    expect(await ask(ann, { kind: "maze-chest" })).toBeUndefined();
    expect(await ask(bo, { kind: "maze-chest" })).toBeUndefined();
    await until(() => linesOf(bo).some((l) => /chest holds/.test(l)));
    expect(linesOf(ann).join(" ")).toMatch(/chest holds/);
    expect(await ask(ann, { kind: "maze-chest" })).toBeUndefined();
    await until(() => /empty/.test(linesOf(ann).at(-1) ?? ""));
    expect(g.players.get(ann.id).festivalsJoined.length).toBeGreaterThan(1);
    expect(
      g.festivalsJoined.some((k) => k.startsWith("hollow-eve-chest")),
    ).toBe(false);
  });

  it("the host's own festival record is its own: a guest going in does not mark it", async () => {
    const { g, ann } = await room("harvest-showing");
    await ask(ann, { kind: "festival-enter" });
    expect(g.players.get(ann.id).festivalsJoined).toContain(
      "harvest-showing:1",
    );
    expect(g.festivalsJoined).not.toContain("harvest-showing:1");
  });
});
