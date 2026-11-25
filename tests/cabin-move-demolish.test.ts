// Moving and demolishing a cabin from the carpenter's screen, and the lost and found box (note 110).
import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { cabinBlockers } from "../src/core/cabinmove";
import { cabinRect } from "../src/core/cabins";
import { farmMapOf, farmTypeById } from "../src/core/farmtypes";
import { homeMapId } from "../src/core/homes";
import { Inventory } from "../src/core/inventory";
import { collectLost, lostItemsFor } from "../src/core/lostfound";
import { LOCAL_PLAYER } from "../src/core/players";
import { Room } from "../src/core/room";
import { GameRoomWorld } from "../src/core/roomworld";
import { deserialize, newGame, serialize } from "../src/core/save";
import type { ScreenRef } from "../src/core/screens";
import { ensureTools, isToolId, toolItemId } from "../src/core/toolitems";

function mk() {
  const g = newGame("standard", "separate");
  g.day.clock.minutes = 12 * 60;
  // eslint-disable-next-line prefer-const
  let room!: Room;
  const world = new GameRoomWorld(g, {
    random: () => 0.5,
    where: (id) => room.position(id),
  });
  room = new Room(world);
  const ann = room.join("Ann")!;
  const bo = room.join("Bo")!;
  for (const id of [ann, bo]) {
    g.players.get(id).inventory.load(new Inventory().save());
    room.drain(id);
  }
  let seq = 1;
  const send = (id: string, intent: Parameters<Room["hostIntent"]>[0]) => {
    room.drain(id);
    const n = seq++;
    room.receive(id, { t: "intent", seq: n, intent });
    const rej = room.drain(id).find((m) => m.t === "rejected" && m.seq === n);
    return rej?.t === "rejected" ? rej.reason : undefined;
  };
  const stand = (id: string, map: string, tx: number, ty: number) => {
    const ts = maps.ids.includes(map) ? maps.get(map).tileSize : 16;
    room.receive(id, {
      t: "pos",
      x: (tx + 0.5) * ts,
      y: (ty + 1) * ts - 2,
      map,
      ts: 0,
    });
  };
  const carpenter = (): ScreenRef => {
    const s = maps.get("sawmill").services.find((v) => v.kind === "carpenter")!;
    return { kind: "carpenter", map: "sawmill", x: s.x, y: s.y };
  };
  const openCarpenter = (id: string) => {
    const ref = carpenter();
    stand(id, ref.map, ref.x, ref.y + 1);
    return send(id, { kind: "open", screen: ref });
  };
  return { g, room, world, ann, bo, send, stand, openCarpenter };
}

/** A site where cabin `id` may stand, other than where it is. */
function freeSite(g: ReturnType<typeof mk>["g"], id: number) {
  const map = farmMapOf(g);
  const mapId = farmTypeById(g.farmType).map;
  const here = g.cabins!.cabins.find((c) => c.id === id);
  for (let y = 2; y < map.height - 5; y++)
    for (let x = 2; x < map.width - 6; x++)
      if (
        (x !== here?.x || y !== here?.y) &&
        cabinBlockers(g, map, mapId, id, x, y).length === 0
      )
        return { x, y };
  throw new Error("no free site");
}

describe("moving a cabin", () => {
  it("lets any player move any cabin, keeping its home instance", () => {
    const t = mk();
    const { g } = t;
    const annCabin = t.world.cabinOf(t.ann)!;
    const home = homeMapId(t.ann);
    g.chests.add(home, 10, 10, "chest")!.items.add("wood", 5);
    g.furniture.add(home, 11, 11, "wooden-stool");
    annCabin.tier = 1;
    annCabin.renos = ["x"];
    const site = freeSite(g, annCabin.id);
    expect(t.openCarpenter(t.bo)).toBeUndefined();
    // Bo moves Ann's cabin (the build rule does not apply to cabins).
    expect(
      t.send(t.bo, { kind: "carp-cabin-move", id: annCabin.id, ...site }),
    ).toBeUndefined();
    const moved = g.cabins!.cabins.find((c) => c.id === annCabin.id)!;
    expect({ x: moved.x, y: moved.y }).toEqual(site);
    expect(moved.ownerKey).toBe(t.ann);
    expect(moved.tier).toBe(1);
    expect(moved.renos).toEqual(["x"]);
    expect(g.chests.get(home, 10, 10)?.items.count("wood")).toBe(5);
    expect(g.furniture.at(home, 11, 11)).toBe("wooden-stool");
    expect(cabinRect(moved).x).toBe(site.x);
  });

  it("refuses a site that is blocked or on another cabin, and needs the carpenter open", () => {
    const t = mk();
    const a = t.world.cabinOf(t.ann)!;
    const b = t.world.cabinOf(t.bo)!;
    expect(
      t.send(t.ann, { kind: "carp-cabin-move", id: a.id, x: 3, y: 3 }),
    ).toBe("open the screen first");
    expect(t.openCarpenter(t.ann)).toBeUndefined();
    expect(
      t.send(t.ann, { kind: "carp-cabin-move", id: a.id, x: b.x + 1, y: b.y }),
    ).toBeTruthy();
    expect(t.world.cabinOf(t.ann)).toMatchObject({ x: a.x, y: a.y });
  });
});

describe("demolishing a cabin", () => {
  function stocked() {
    const t = mk();
    const { g } = t;
    const pack = g.players.get(t.ann).inventory;
    ensureTools(pack);
    pack.add("wood", 12);
    const home = homeMapId(t.ann);
    g.chests.add(home, 10, 10, "chest")!.items.add("stone", 7);
    g.furniture.add(home, 11, 11, "wooden-stool");
    return { ...t, pack, home, cabin: t.world.cabinOf(t.ann)! };
  }

  it("lets the host demolish an occupied cabin; non-tool items go to the box, tools stay", () => {
    const t = stocked();
    expect(
      t.room.hostIntent({ kind: "carp-cabin-demolish", id: t.cabin.id }),
    ).toBeUndefined();
    expect(t.world.cabinOf(t.ann)).toBeUndefined();
    expect(t.g.cabins!.cabins.some((c) => c.id === t.cabin.id)).toBe(false);
    const box = Object.fromEntries(
      lostItemsFor(t.g, t.ann).map((s) => [s.id, s.count]),
    );
    expect(box).toMatchObject({
      wood: 12,
      stone: 7,
      chest: 1,
      "wooden-stool": 1,
    });
    expect(t.pack.count("wood")).toBe(0);
    expect(t.pack.count(toolItemId("hoe"))).toBe(1);
    for (let i = 0; i < t.pack.size; i++) {
      const s = t.pack.slot(i);
      if (s) expect(isToolId(s.id)).toBe(true);
    }
    expect(t.g.chests.get(t.home, 10, 10)).toBeUndefined();
    expect(t.g.furniture.at(t.home, 11, 11)).toBeUndefined();
  });

  it("demolishes an empty cabin with nothing to store", () => {
    const t = mk();
    t.g.players.wallet(LOCAL_PLAYER).money = 500;
    const site = freeSite(t.g, 0);
    expect(t.world.buyCabin(site)).toBeUndefined();
    const empty = t.g.cabins!.cabins.find((c) => c.ownerKey === null)!;
    expect(
      t.room.hostIntent({ kind: "carp-cabin-demolish", id: empty.id }),
    ).toBeUndefined();
    expect(t.g.cabins!.cabins.some((c) => c.id === empty.id)).toBe(false);
    expect(t.g.lostFound).toBeUndefined();
  });

  it("refuses a guest, even from the carpenter's screen", () => {
    const t = stocked();
    expect(t.openCarpenter(t.bo)).toBeUndefined();
    expect(t.send(t.bo, { kind: "carp-cabin-demolish", id: t.cabin.id })).toBe(
      "Only the host can demolish a cabin.",
    );
    expect(t.openCarpenter(t.ann)).toBeUndefined();
    expect(t.send(t.ann, { kind: "carp-cabin-demolish", id: t.cabin.id })).toBe(
      "Only the host can demolish a cabin.",
    );
    expect(t.world.cabinOf(t.ann)).toBeDefined();
  });

  it("lets the occupant collect from the box, keeping what does not fit", () => {
    const t = stocked();
    t.room.hostIntent({ kind: "carp-cabin-demolish", id: t.cabin.id });
    const spot = maps
      .get("hall")
      .services.find((s) => s.kind === "lost-found")!;
    const ref: ScreenRef = {
      kind: "lostfound",
      map: "hall",
      x: spot.x,
      y: spot.y,
    };
    t.stand(t.ann, "hall", spot.x, spot.y + 1);
    expect(t.send(t.bo, { kind: "lostfound-take" })).toBe(
      "open the screen first",
    );
    expect(t.send(t.ann, { kind: "open", screen: ref })).toBeUndefined();
    // Bo has nothing waiting.
    expect(collectLost(t.g, t.bo)).toBe(
      "Nothing of yours is in the lost and found.",
    );
    expect(t.send(t.ann, { kind: "lostfound-take" })).toBeUndefined();
    expect(t.pack.count("wood")).toBe(12);
    expect(t.pack.count("stone")).toBe(7);
    expect(t.pack.count("wooden-stool")).toBe(1);
    expect(lostItemsFor(t.g, t.ann)).toEqual([]);
    expect(t.g.lostFound).toBeUndefined();
  });

  it("leaves what does not fit in the box", () => {
    const t = stocked();
    t.room.hostIntent({ kind: "carp-cabin-demolish", id: t.cabin.id });
    // Fill every free slot with distinct junk so nothing fits.
    const inv = t.pack;
    for (let i = 0; inv.add(`fill-${i}`, 1); i++);
    const line = collectLost(t.g, t.ann);
    expect(line).toBe("Make room in your pack first.");
    expect(lostItemsFor(t.g, t.ann).length).toBeGreaterThan(0);
  });

  it("saves and loads the box", () => {
    const t = stocked();
    t.room.hostIntent({ kind: "carp-cabin-demolish", id: t.cabin.id });
    const back = deserialize(serialize(t.g));
    expect(back?.lostFound?.[t.ann]).toMatchObject({ wood: 12, stone: 7 });
    expect(lostItemsFor(back!, t.ann).length).toBe(
      lostItemsFor(t.g, t.ann).length,
    );
  });
});
