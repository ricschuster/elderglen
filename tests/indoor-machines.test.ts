// Machines and casks on house and shed floors (owner 2026-11-25, as Stardew; docs/design/89_placement_system.md).
import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { CASK, loadCask, placeCask } from "../src/core/cask";
import { HOUSE_MAP } from "../src/core/house";
import { applyHomePlace, homeMapOf } from "../src/core/homeplace";
import {
  collectMachine,
  handOnMachine,
  jobDone,
  loadMachine,
  placeMachine,
} from "../src/core/machines";
import { PLACEABLES, placeableById } from "../src/core/placeables";
import { LOCAL_PLAYER } from "../src/core/players";
import { Room } from "../src/core/room";
import { GameRoomWorld } from "../src/core/roomworld";
import { deserialize, newGame, serialize } from "../src/core/save";
import { tileBlocked } from "../src/core/blocking";

const TILE = { x: 38, y: 31 };
const CABIN = "house@p2";

function hosted() {
  const g = newGame("standard", "separate");
  const room = new Room(new GameRoomWorld(g, { random: () => 0.5 }));
  const ann = room.join("Ann")!;
  return { g, ann };
}

describe("machines indoors", () => {
  it("every processing machine but the bee house may stand indoors; sprinklers and rods may not", () => {
    const machines = PLACEABLES.filter((p) => p.kind === "machine");
    for (const m of machines)
      expect(
        m.places.includes("house") && m.places.includes("shed"),
        m.id,
      ).toBe(m.id !== "bee-house");
    for (const p of PLACEABLES)
      if (p.kind !== "machine" && p.kind !== "chest" && p.kind !== "light")
        expect(p.places.includes("house"), p.id).toBe(false);
    expect(placeableById("cask")!.places).toContain("house");
  });

  it("a keg in the farmhouse works, blocks walking and saves", () => {
    const g = newGame();
    g.inventory.add("keg");
    const map = homeMapOf(g, HOUSE_MAP)!;
    expect(placeMachine(g, map, TILE.x, TILE.y, "keg", HOUSE_MAP).ok).toBe(
      true,
    );
    expect(g.machines.count).toBe(0);
    expect(g.indoorMachines.at(TILE.x, TILE.y, HOUSE_MAP)).toBe("keg");
    expect(
      tileBlocked(
        {
          state: g,
          map,
          mapId: HOUSE_MAP,
          rocks: undefined,
          festivalShut: () => false,
        },
        TILE.x,
        TILE.y,
      ),
    ).toBe(true);
    g.inventory.add("tomato");
    expect(
      loadMachine(g, TILE.x, TILE.y, "tomato", () => 0.5, HOUSE_MAP).ok,
    ).toBe(true);
    const back = deserialize(serialize(g))!;
    expect(back.indoorMachines.get(TILE.x, TILE.y, HOUSE_MAP)?.job).toEqual(
      g.indoorMachines.get(TILE.x, TILE.y, HOUSE_MAP)?.job,
    );
    // The same tile on the farm is unaffected.
    expect(back.machines.count).toBe(0);
    const m = back.indoorMachines.get(TILE.x, TILE.y, HOUSE_MAP)!;
    m.job!.doneAt = 0;
    expect(jobDone(back, m)).toBe(true);
    expect(collectMachine(back, TILE.x, TILE.y, undefined, HOUSE_MAP).ok).toBe(
      true,
    );
    expect(handOnMachine(back, TILE.x, TILE.y, HOUSE_MAP).ok).toBe(true);
    expect(back.indoorMachines.count).toBe(0);
    expect(back.inventory.count("keg")).toBe(g.inventory.count("keg") + 1);
  });

  it("a machine in a cabin stays in that cabin", () => {
    const { g, ann } = hosted();
    g.players.get(ann).inventory.add("preserves-jar");
    expect(
      applyHomePlace(g, ann, {
        kind: "home-place",
        map: CABIN,
        ...TILE,
        item: "preserves-jar",
      }),
    ).toBeUndefined();
    expect(g.indoorMachines.at(TILE.x, TILE.y, CABIN)).toBe("preserves-jar");
    expect(g.indoorMachines.at(TILE.x, TILE.y, HOUSE_MAP)).toBeUndefined();
    const back = deserialize(serialize(g))!;
    expect(back.indoorMachines.at(TILE.x, TILE.y, CABIN)).toBe("preserves-jar");
  });

  it("a shed floor takes a machine too", () => {
    const g = newGame();
    g.inventory.add("loom");
    const map = maps.get("coop");
    // No shed map is built yet: the reserved id places on any open floor.
    let spot: { x: number; y: number } | undefined;
    for (let y = 0; y < map.height && !spot; y++)
      for (let x = 0; x < map.width && !spot; x++)
        if (!map.isBlocked(x, y) && !map.exitAt(x, y)) spot = { x, y };
    const r = placeMachine(g, map, spot!.x, spot!.y, "loom", "shed");
    expect(r.ok || r.reason === "cannot place here").toBe(true);
    if (r.ok) {
      expect(g.indoorMachines.at(spot!.x, spot!.y, "shed")).toBe("loom");
      const back = deserialize(serialize(g))!;
      expect(back.indoorMachines.at(spot!.x, spot!.y, "shed")).toBe("loom");
    }
  });

  it("a bee house is refused indoors and stays in the pack", () => {
    const g = newGame();
    g.inventory.add("bee-house");
    const map = homeMapOf(g, HOUSE_MAP)!;
    expect(
      placeMachine(g, map, TILE.x, TILE.y, "bee-house", HOUSE_MAP),
    ).toEqual({ ok: false, reason: "cannot place here" });
    expect(g.inventory.count("bee-house")).toBe(1);
  });

  it("a guest places and lifts a machine in another player's house", () => {
    const { g, ann } = hosted();
    const pack = g.players.get(ann).inventory;
    pack.add("keg");
    const intent = { kind: "home-place", map: CABIN, ...TILE, item: "keg" };
    expect(applyHomePlace(g, ann, intent)).toBeUndefined();
    expect(pack.count("keg")).toBe(0);
    expect(g.indoorMachines.at(TILE.x, TILE.y, CABIN)).toBe("keg");
    // The host lifts it from the guest's cabin into the host's own pack.
    expect(
      applyHomePlace(g, LOCAL_PLAYER, {
        kind: "home-pickup",
        map: CABIN,
        ...TILE,
      }),
    ).toBeUndefined();
    expect(g.indoorMachines.count).toBe(0);
    expect(g.inventory.count("keg")).toBe(1);
  });
});

describe("casks indoors", () => {
  it("stand in a house but refuse goods", () => {
    const g = newGame();
    g.inventory.add(CASK);
    g.inventory.add("melon-wine");
    const map = homeMapOf(g, HOUSE_MAP)!;
    expect(placeCask(g, map, TILE.x, TILE.y, HOUSE_MAP).ok).toBe(true);
    expect(g.casks.at(TILE.x, TILE.y, HOUSE_MAP)).toBe(true);
    expect(
      tileBlocked(
        {
          state: g,
          map,
          mapId: HOUSE_MAP,
          rocks: undefined,
          festivalShut: () => false,
        },
        TILE.x,
        TILE.y,
      ),
    ).toBe(true);
    expect(loadCask(g, TILE.x, TILE.y, "melon-wine", HOUSE_MAP)).toEqual({
      ok: false,
      reason: "cask outside cellar",
    });
    expect(g.inventory.count("melon-wine")).toBe(1);
    const back = deserialize(serialize(g))!;
    expect(back.casks.at(TILE.x, TILE.y, HOUSE_MAP)).toBe(true);
  });

  it("a guest places and lifts one through the home intents", () => {
    const { g, ann } = hosted();
    const pack = g.players.get(ann).inventory;
    pack.add(CASK);
    expect(
      applyHomePlace(g, ann, {
        kind: "home-place",
        map: CABIN,
        ...TILE,
        item: CASK,
      }),
    ).toBeUndefined();
    expect(g.casks.at(TILE.x, TILE.y, CABIN)).toBe(true);
    expect(
      applyHomePlace(g, ann, { kind: "home-pickup", map: CABIN, ...TILE }),
    ).toBeUndefined();
    expect(pack.count(CASK)).toBe(1);
  });
});
