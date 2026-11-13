import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import {
  COUNTER_LINES,
  exitLabel,
  serviceLabel,
  standInLine,
} from "../src/core/labels";

// The Hearthwell interiors (note 77 step 3, note 58, #646): six shop-and-home
// shells, the Outpost's two maps and the three burrows.
const town = maps.get("hearthwell");
const SHOPS = {
  "general-store": "shop",
  healer: "counter-healer",
  inn: "counter-inn",
  library: "counter-library",
  smithy: "smithy",
  hatter: "counter-hatter",
} as const;
// Interiors rebuilt to their note 86 layouts keep their size here (#853, #855 to #860).
const REBUILT: Record<string, [number, number]> = {
  "general-store": [31, 31],
  sawmill: [31, 27],
  healer: [22, 23],
  smithy: [21, 26],
  library: [35, 30],
  hatter: [27, 27],
  "burrow-gardener": [30, 20],
  "burrow-retired": [32, 21],
  "burrow-young": [28, 20],
  inn: [44, 32],
  "fisher-hut": [12, 13],
  "fisher-loft": [11, 11],
};
const BURROWS = ["burrow-gardener", "burrow-retired", "burrow-young"];
const ALL = [...Object.keys(SHOPS), "outpost", "outpost-rooms", ...BURROWS];

describe("the Hearthwell interiors", () => {
  it("has eleven new maps that pass the map check", () => {
    for (const id of ALL) expect(mapFiles[id], id).toBeDefined();
    expect(maps.problems()).toEqual([]);
  });

  it("opens every lot door onto its interior's door entry, and back", () => {
    const outside = [...Object.keys(SHOPS), "outpost", ...BURROWS];
    for (const id of outside) {
      const exit = town.exits.find((e) => e.id === id)!;
      expect(exit, id).toMatchObject({ map: id, entry: "door" });
      const lot = town.regions.find((r) => r.id === `lot-${id}`)!;
      expect(exit.y).toBe(lot.y + lot.h - 1);
      expect(town.isBlocked(exit.x, exit.y)).toBe(false);
      const inside = maps.get(id);
      expect(inside.entry("door"), id).toBeDefined();
      expect(inside.exits.find((e) => e.id === "door")).toMatchObject({
        map: "hearthwell",
        entry: `from_${id}`,
      });
      expect(town.entry(`from_${id}`)).toMatchObject({
        x: exit.x,
        y: exit.y + 1,
      });
      expect(exitLabel(id), id).toBeDefined();
    }
  });

  it("makes every interior one walkable room, every exit and counter reachable from its door", () => {
    for (const id of ALL) {
      const m = maps.get(id);
      const walkable = m.reachable(m.entry("door")!);
      for (const e of m.exits) {
        const tiles: string[] = [];
        for (let y = e.y; y < e.y + e.h; y++)
          for (let x = e.x; x < e.x + e.w; x++) tiles.push(`${x},${y}`);
        expect(
          tiles.some((t) => walkable.has(t)),
          `${id} exit ${e.id}`,
        ).toBe(true);
      }
      for (const s of m.services) {
        expect(m.isBlocked(s.x, s.y), `${id} ${s.id} is a solid counter`).toBe(
          true,
        );
        const next = [
          [s.x, s.y + 1],
          [s.x, s.y - 1],
          [s.x - 1, s.y],
          [s.x + 1, s.y],
        ].some(([x, y]) => walkable.has(`${x},${y}`));
        expect(next, `${id} ${s.id} can be reached`).toBe(true);
        expect(serviceLabel(s.kind, s.id), `${id} ${s.id}`).toBeDefined();
      }
    }
  });

  it("gives each shop its counter, with the right kind", () => {
    for (const [id, kind] of Object.entries(SHOPS)) {
      const m = maps.get(id);
      // A wide counter has one service per tile it is served from (all the same kind).
      // The hatter also has the sewing machine and the dye pots (note 96).
      const extra = id === "hatter" ? ["sewing-machine", "dye-pots"] : [];
      expect([...new Set(m.services.map((s) => s.kind))], id).toEqual([
        kind,
        ...extra,
      ]);
      expect([m.width, m.height]).toEqual(REBUILT[id] ?? [14, 10]);
    }
  });

  it("moves the store and smith counters off the town's streets, as the same kinds", () => {
    expect(maps.get("general-store").services[0]!.kind).toBe("shop");
    expect(maps.get("smithy").services[0]!.kind).toBe("smithy");
    for (const k of ["shop", "smith", "smithy"])
      expect(town.services.some((s) => s.kind === k)).toBe(false);
    // The farm has no shop, Orders or Request counters (note 77, owner decisions 2026-11-09).
    for (const k of ["shop", "orders", "requests"])
      expect(maps.get("farm").services.some((s) => s.kind === k)).toBe(false);
  });

  it("joins the Outpost's post room and the steward's rooms both ways", () => {
    const post = maps.get("outpost");
    const rooms = maps.get("outpost-rooms");
    expect(post.exits.find((e) => e.id === "rooms")).toMatchObject({
      map: "outpost-rooms",
      entry: "door",
    });
    expect(rooms.exits.find((e) => e.id === "door")).toMatchObject({
      map: "outpost",
      entry: "from_rooms",
    });
    expect(post.entry("from_rooms")).toBeDefined();
    expect(rooms.services).toHaveLength(0);
    // Boards and the trader's stalls stay outside by the door (note 57).
    expect(
      town.services
        .filter((s) => s.kind.startsWith("board-") || s.kind === "orders")
        .map((s) => s.id),
    ).toEqual(["road-news", "special-orders"]);
  });

  it("makes the burrows small, each with a bed per sleeper", () => {
    const beds = (id: string) =>
      mapFiles[id]!.layers.find((l) => l.name === "fixtures")!.data!.filter(
        (t: number) => t === 10,
      ).length;
    for (const id of BURROWS) {
      const m = maps.get(id);
      expect([m.width, m.height]).toEqual(REBUILT[id]);
      expect(m.services).toHaveLength(0);
    }
    // bed tiles: a single bed is 2 by 2, the retired couple's double bed is 3 by 2
    expect(beds("burrow-gardener")).toBe(4);
    expect(beds("burrow-retired")).toBe(10);
    expect(beds("burrow-young")).toBe(8);
  });

  it("says something at the counters that have no system yet, and uses no em dash", () => {
    for (const kind of Object.keys(COUNTER_LINES)) {
      expect(standInLine(kind)).toBe(COUNTER_LINES[kind]);
      expect(COUNTER_LINES[kind]).not.toContain(String.fromCharCode(0x2014));
    }
    expect(standInLine("shop")).toBeUndefined();
    expect(standInLine("board-news")).toBeUndefined();
  });

  it("can be reached from the Farm by walking, shop and smithy included", () => {
    const seen = new Set(["farm"]);
    const queue = ["farm"];
    for (let i = 0; i < queue.length; i++)
      for (const e of maps.get(queue[i]!).exits)
        if (e.map && mapFiles[e.map] && !seen.has(e.map)) {
          seen.add(e.map);
          queue.push(e.map);
        }
    for (const id of ALL) expect(seen.has(id), id).toBe(true);
  });
});
