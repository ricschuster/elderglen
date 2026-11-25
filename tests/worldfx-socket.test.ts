// Guest copies follow the host's result, not their own dice (note 53, "Guest copies follow the host's result").
// A real host and two guests over WebSockets: the host's random numbers are fixed to values the guests' own
// `Math.random` would almost never give, so a guest that re-ran the rules would drift. Every action leaves each
// copy equal to the host's world and to the sender's record, the same day, with no new `farm` message.
import { afterEach, describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { farmMapOf } from "../src/core/farmtypes";
import { savePlayer } from "../src/core/players";
import { seeded } from "../src/core/rng";
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

async function stand(c: GuestClient, tx: number, ty: number) {
  const ts = maps.get("farm").tileSize;
  c.sendPos((tx + 0.5) * ts, (ty + 1) * ts - 2, "farm", 1);
  await new Promise((r) => setTimeout(r, 60));
}

const byKey = (list: { x: number; y: number }[]) =>
  JSON.stringify(
    [...list].sort((a, b) => a.x - b.x || a.y - b.y || (a < b ? -1 : 1)),
  );

/** The parts of a world the actions change, as text, for an equality check between the host and a copy. */
function worldText(g: GameState): string {
  return JSON.stringify([
    byKey(g.trees.save()),
    byKey(g.rocks.save()),
    byKey(g.weeds.save()),
    byKey(g.twigs.save()),
    byKey(g.machines.save()),
    byKey(g.forage.save()),
    JSON.stringify(
      Object.entries(g.farm.save()).sort(([a], [b]) => (a < b ? -1 : 1)),
    ),
    byKey(g.ground.save()),
  ]);
}

const recordText = (g: GameState, id: string) =>
  JSON.stringify(savePlayer(g.players.get(id)));

async function room(setup: (g: GameState) => void) {
  const g = newGame("standard", "separate");
  g.day.clock.day = 30;
  setup(g);
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
    // The guests keep their own dice: nothing seeded, nothing fixed.
    copy.rng = undefined;
    c.onMessage = (m) => applyServerMsg(copy, m);
    copies.set(c.id, copy);
  }
  const farms = () =>
    [ann, bo].reduce(
      (n, c) => n + c.log.filter((m) => m.t === "farm").length,
      0,
    );
  return { g, ann, bo, copies, farms };
}

describe("guest copies follow the host's result", () => {
  it("chop, break, till and harvest leave every copy equal to the host's, with no night resend", async () => {
    const { g, ann, bo, copies, farms } = await room((h) => {
      // A ripe parsnip for the harvest.
      h.farm.till(40, 40);
      h.farm.plant(40, 40, "parsnip", "spring");
      for (let i = 0; i < 8; i++) {
        h.farm.water(40, 40);
        h.farm.endDay("spring");
      }
    });
    const tree = g.trees.save().find((t) => !t.stump)!;
    const rock = g.rocks.save()[0]!;
    expect(tree).toBeDefined();
    expect(rock).toBeDefined();
    // Four free tillable tiles in a row, for the hoe.
    const fm = farmMapOf(g);
    let row: { x: number; y: number } | undefined;
    for (let y = 0; y < fm.height && !row; y++)
      for (let x = 0; x < fm.width - 4 && !row; x++)
        if (
          [0, 1, 2, 3].every(
            (i) =>
              fm.isTillable(x + i, y) &&
              !g.trees.at(x + i, y) &&
              !g.rocks.at(x + i, y) &&
              !g.farm.plotAt(x + i, y),
          )
        )
          row = { x, y };
    expect(row).toBeDefined();
    const sentFarms = farms();
    const day = g.day.clock.day;
    const sameAsHost = async (what: string) => {
      // The ground piles come with the map state a tick later; wait for everything to settle.
      await until(
        () =>
          [ann, bo].every(
            (c) =>
              worldText(copies.get(c.id)!) === worldText(g) &&
              recordText(copies.get(c.id)!, c.id) === recordText(g, c.id),
          ),
        3000,
      ).catch(() => {
        for (const c of [ann, bo])
          expect(worldText(copies.get(c.id)!), `${what}: world`).toBe(
            worldText(g),
          );
        for (const c of [ann, bo])
          expect(recordText(copies.get(c.id)!, c.id), `${what}: record`).toBe(
            recordText(g, c.id),
          );
      });
    };

    // Tilling: the host's roll turns up clay every time; a guest rolling for itself would not.
    g.rng = () => 0.001;
    await stand(ann, row!.x + 1, row!.y + 1);
    for (let i = 0; i < 4; i++)
      expect(
        await ask(ann, { kind: "till", x: row!.x + i, y: row!.y }),
      ).toBeUndefined();
    expect(g.players.get(ann.id).inventory.count("clay")).toBe(4);
    await sameAsHost("till");
    expect(copies.get(bo.id)!.farm.plotAt(row!.x + 1, row!.y)).toBeDefined();
    expect(
      copies.get(ann.id)!.players.get(ann.id).inventory.count("clay"),
    ).toBe(4);

    // Chopping a tree and breaking a rock: wood, stone and what falls are the host's.
    g.rng = seeded(11);
    await stand(bo, tree.x, tree.y + 1);
    for (let i = 0; i < 25 && g.trees.at(tree.x, tree.y)?.stump === false; i++)
      await ask(bo, { kind: "axe", x: tree.x, y: tree.y });
    await sameAsHost("axe");
    await stand(ann, rock.x, rock.y + 1);
    for (let i = 0; i < 25 && g.rocks.at(rock.x, rock.y); i++)
      await ask(ann, { kind: "pickaxe", x: rock.x, y: rock.y });
    await sameAsHost("pickaxe");
    expect(g.rocks.at(rock.x, rock.y)).toBeUndefined();
    expect(copies.get(bo.id)!.rocks.at(rock.x, rock.y)).toBeUndefined();

    // Harvest: the crop's quality is the host's roll.
    g.rng = () => 0.0001;
    await stand(bo, 40, 41);
    expect(await ask(bo, { kind: "harvest", x: 40, y: 40 })).toBeUndefined();
    expect(g.players.get(bo.id).skills.xpOf("farming")).toBeGreaterThan(0);
    await sameAsHost("harvest");
    expect(copies.get(ann.id)!.farm.plotAt(40, 40)?.crop).toBeUndefined();

    // Nothing above waited for a night: the same day, and no farm message after the guests joined.
    expect(g.day.clock.day).toBe(day);
    expect(copies.get(ann.id)!.day.clock.day).toBe(day);
    expect(farms()).toBe(sentFarms);
  });

  it("the host's own changes on the farm reach the guests within a moment", async () => {
    const { g, ann, copies } = await room(() => undefined);
    g.farm.till(20, 20);
    g.trees.save();
    await until(() => !!copies.get(ann.id)!.farm.plotAt(20, 20));
    expect(copies.get(ann.id)!.farm.plotAt(20, 20)?.tilled).toBe(true);
  });
});
