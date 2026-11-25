// Furniture and decor in any house, placed by any player standing in it (note 110, owner 2026-11-25).
import { describe, expect, it } from "vitest";
import { decorKey, DECOR, roomAt } from "../src/core/decor";
import { applyHomePlace } from "../src/core/homeplace";
import { GameRoomWorld } from "../src/core/roomworld";
import { Room } from "../src/core/room";
import { LOCAL_PLAYER } from "../src/core/players";
import { newGame } from "../src/core/save";
import { deserialize, serialize } from "../src/core/save";

const CHAIR = "oak-chair";
const TILE = { x: 38, y: 31 };
const TILE2 = { x: 37, y: 31 };

function hosted() {
  const g = newGame("standard", "separate");
  const room = new Room(new GameRoomWorld(g, { random: () => 0.5 }));
  const ann = room.join("Ann")!;
  const bo = room.join("Bo")!;
  for (const id of [LOCAL_PLAYER, ann, bo])
    g.players.get(id).inventory.add(CHAIR);
  return { g, ann, bo };
}

const place = (map: string, t = TILE, item = CHAIR) => ({
  kind: "home-place",
  map,
  ...t,
  item,
});
const pick = (map: string, t = TILE) => ({ kind: "home-pickup", map, ...t });

describe("furniture and decor for any player in any house", () => {
  it("a guest places in their own cabin and in the farmhouse, from their own pack", () => {
    const { g, ann } = hosted();
    const pack = g.players.get(ann).inventory;
    expect(applyHomePlace(g, ann, place("house@p2"))).toBeUndefined();
    expect(g.furniture.at("house@p2", TILE.x, TILE.y)).toBe(CHAIR);
    expect(pack.count(CHAIR)).toBe(0);
    pack.add(CHAIR);
    expect(applyHomePlace(g, ann, place("house"))).toBeUndefined();
    expect(g.furniture.at("house", TILE.x, TILE.y)).toBe(CHAIR);
    expect(g.inventory.count(CHAIR)).toBe(1);
  });

  it("the host places one in a guest's cabin, and another player lifts it into their own pack", () => {
    const { g, ann, bo } = hosted();
    expect(applyHomePlace(g, LOCAL_PLAYER, place("house@p2"))).toBeUndefined();
    expect(g.furniture.at("house@p2", TILE.x, TILE.y)).toBe(CHAIR);
    const before = g.players.get(bo).inventory.count(CHAIR);
    expect(applyHomePlace(g, bo, pick("house@p2"))).toBeUndefined();
    expect(g.furniture.at("house@p2", TILE.x, TILE.y)).toBeUndefined();
    expect(g.players.get(bo).inventory.count(CHAIR)).toBe(before + 1);
    expect(g.players.get(ann).inventory.count(CHAIR)).toBe(1);
    expect(g.inventory.count(CHAIR)).toBe(0);
  });

  it("refuses what the host's own rules refuse", () => {
    const { g, ann } = hosted();
    expect(applyHomePlace(g, ann, place("house@p2"))).toBeUndefined();
    const pack = g.players.get(ann).inventory;
    pack.add(CHAIR);
    expect(applyHomePlace(g, ann, place("house@p2"))).toBe("cannot place here");
    expect(applyHomePlace(g, ann, place("house@p2", { x: 0, y: 0 }))).toBe(
      "cannot place here",
    );
    expect(applyHomePlace(g, ann, place("house@p2", TILE2, "no-such"))).toBe(
      "That cannot be placed.",
    );
    pack.remove(CHAIR);
    expect(applyHomePlace(g, ann, place("house@p2", TILE2))).toBe(
      "no furniture",
    );
    expect(applyHomePlace(g, ann, place("farm"))).toBe(
      "There is no home here.",
    );
    expect(applyHomePlace(g, ann, place("house@p9"))).toBe(
      "There is no home here.",
    );
    expect(applyHomePlace(g, ann, place("house@p2", { x: 1.5, y: 1 }))).toBe(
      "bad home-place",
    );
    expect(applyHomePlace(g, ann, pick("house@p2", TILE2))).toBe(
      "nothing to act on",
    );
  });

  it("a full pack leaves the piece standing", () => {
    const { g, ann, bo } = hosted();
    applyHomePlace(g, ann, place("house@p2"));
    const pack = g.players.get(bo).inventory;
    while (pack.room(CHAIR) > 0) pack.add(CHAIR);
    expect(applyHomePlace(g, bo, pick("house@p2"))).toBe("backpack full");
    expect(g.furniture.at("house@p2", TILE.x, TILE.y)).toBe(CHAIR);
  });

  it("nothing lands in the wrong instance", () => {
    const { g, ann, bo } = hosted();
    applyHomePlace(g, ann, place("house@p2"));
    expect(g.furniture.at("house", TILE.x, TILE.y)).toBeUndefined();
    expect(g.furniture.at("house@p3", TILE.x, TILE.y)).toBeUndefined();
    expect(applyHomePlace(g, bo, pick("house"))).toBe("nothing to act on");
    expect(applyHomePlace(g, bo, pick("house@p3"))).toBe("nothing to act on");
    expect(g.furniture.at("house@p2", TILE.x, TILE.y)).toBe(CHAIR);
  });

  it("papers one cabin without touching the farmhouse or another cabin, and round trips", () => {
    const { g, ann, bo } = hosted();
    const paper = DECOR.find((d) => d.kind === "wallpaper")!;
    g.players.get(bo).inventory.add(paper.id);
    const room = roomAt(0, TILE.x, TILE.y)!;
    expect(room).toBeDefined();
    expect(
      applyHomePlace(g, bo, place("house@p2", TILE, paper.id)),
    ).toBeUndefined();
    expect(g.decor.get(decorKey("house@p2", room.id)).wallpaper).toBe(paper.id);
    expect(g.decor.get(decorKey("house", room.id)).wallpaper).toBeUndefined();
    expect(
      g.decor.get(decorKey("house@p3", room.id)).wallpaper,
    ).toBeUndefined();
    expect(g.players.get(bo).inventory.count(paper.id)).toBe(0);
    expect(g.players.get(ann).inventory.count(paper.id)).toBe(0);
    const back = deserialize(serialize(g))!;
    expect(back.decor.get(decorKey("house@p2", room.id)).wallpaper).toBe(
      paper.id,
    );
    expect(back.decor.get(room.id).wallpaper).toBeUndefined();
  });

  it("the host judges standing: only in the home the sender is in, within reach", () => {
    const g = newGame("standard", "separate");
    const stand = new Map<string, { x: number; y: number; map: string }>();
    const world = new GameRoomWorld(g, {
      random: () => 0.5,
      where: (id) => stand.get(id),
    });
    const room = new Room(world);
    const ann = room.join("Ann")!;
    g.players.get(ann).inventory.add(CHAIR);
    const px = (TILE.x + 0.5) * 16;
    const py = (TILE.y + 1) * 16 - 2;
    stand.set(ann, { x: px, y: py, map: "farm" });
    expect(world.apply(ann, place("house@p2"))).toBe("Too far away.");
    stand.set(ann, { x: px, y: py, map: "house" });
    expect(world.apply(ann, place("house@p2"))).toBe("Too far away.");
    stand.set(ann, { x: px + 16 * 8, y: py, map: "house@p2" });
    expect(world.apply(ann, place("house@p2"))).toBe("Too far away.");
    stand.set(ann, { x: px, y: py, map: "house@p2" });
    expect(world.apply(ann, place("house@p2"))).toBeUndefined();
    expect(g.furniture.at("house@p2", TILE.x, TILE.y)).toBe(CHAIR);
    expect(world.apply(ann, pick("house@p2"))).toBeUndefined();
    expect(g.players.get(ann).inventory.count(CHAIR)).toBe(1);
  });
});
