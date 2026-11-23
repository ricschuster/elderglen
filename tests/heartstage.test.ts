import { describe, expect, it } from "vitest";
import { HEART_EVENTS, PLAYER, type Cmd } from "../src/core/heartevents";
import { weddingEvent } from "../src/core/courtship";
import { areaRect, markTile, pathTiles, stageNames } from "../src/core/map";
import { inArea, placesAt } from "../src/core/eventrun";
import { presenceOverlaps } from "../src/core/heartevents";
import { resolvePlace } from "../src/core/villagers";
import { mapFiles, maps } from "../src/content/maps";
import stages from "../src/content/heart-event-stages.json";
import villagers from "../src/content/villagers.json";

/**
 * Build step 1 of note 62 ("Stage, motion, trigger and replay"): every mark and path a heart
 * event scene names must exist on the event's own map, and each must sit on a walkable tile.
 * Scenes name the map's own marks and paths directly (build step 2); `heart-event-stages.json`
 * only says which map each place plays on. The wedding scene is built from the id, so it is
 * checked here too.
 */
const table = stages.places as Record<string, { map: string; area: string }>;
const PLACES = villagers.places as Record<string, { interior?: string }>;
const AREAS = villagers.areas as Record<string, { map: string | null }>;

const mapOfPlace = (place: string): string | undefined =>
  PLACES[place]?.interior ?? AREAS[place.split(":")[0]!]?.map ?? undefined;

const isPerson = (id: string): boolean =>
  id === PLAYER || villagers.villagers.some((v) => v.id === id);

describe("heart event stage marks and paths", () => {
  it("every event place has a table row on the right map", () => {
    for (const e of HEART_EVENTS) {
      const row = table[e.place];
      expect(row, `${e.id}: no stage row for ${e.place}`).toBeDefined();
      expect(row!.map, e.place).toBe(mapOfPlace(e.place));
      expect(mapFiles[row!.map], row!.map).toBeDefined();
    }
  });

  it("every mark and path a scene names exists on its map", () => {
    const bad: string[] = [];
    const wedding = weddingEvent("alder", [
      "aldreth",
      "barnaby",
      "bramwell",
      "cordelia",
    ]);
    for (const e of [...HEART_EVENTS, wedding]) {
      const row = table[e.place]!;
      const json = mapFiles[row.map]!;
      for (const c of e.scene as Cmd[]) {
        if (c.cmd === "place" && !markTile(json, c.mark))
          bad.push(`${e.id}: place mark "${c.mark}" on ${row.map}`);
        if (c.cmd === "walk" && !pathTiles(json, c.path))
          bad.push(`${e.id}: walk path "${c.path}" on ${row.map}`);
        if (c.cmd === "pan" && !isPerson(c.to) && !markTile(json, c.to))
          bad.push(`${e.id}: pan target "${c.to}" on ${row.map}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("each event place has 4 to 8 marks and 2 to 4 paths", () => {
    for (const [place, row] of Object.entries(table)) {
      const names = stageNames(mapFiles[row.map]!);
      const pre = PLACES[place]?.interior
        ? ""
        : place.split(":")[1]!.replace(/-/g, "_") + "_";
      const marks = names.marks.filter((n) => n.startsWith(pre));
      const paths = names.paths.filter((n) => n.startsWith(pre));
      if (pre) {
        expect(marks.length, place).toBeGreaterThanOrEqual(4);
        expect(marks.length, place).toBeLessThanOrEqual(8);
        expect(paths.length, place).toBeGreaterThanOrEqual(2);
        expect(paths.length, place).toBeLessThanOrEqual(4);
      } else {
        expect(names.marks.length, place).toBeGreaterThanOrEqual(4);
        expect(names.marks.length, place).toBeLessThanOrEqual(8);
        expect(names.paths.length, place).toBeGreaterThanOrEqual(2);
        expect(names.paths.length, place).toBeLessThanOrEqual(4);
      }
    }
  });

  it("marks and path waypoints are walkable and joined", () => {
    const bad: string[] = [];
    for (const id of new Set(Object.values(table).map((r) => r.map))) {
      const json = mapFiles[id]!;
      const map = maps.get(id);
      const { marks, paths } = stageNames(json);
      const ok = (t: { x: number; y: number }) =>
        !map.isBlocked(t.x, t.y) &&
        !map.isWater(t.x, t.y) &&
        !map.trees.some((r) => r.stage > 1 && r.x === t.x && r.y === t.y) &&
        !map.rocks.some((r) => r.x === t.x && r.y === t.y);
      for (const n of marks) {
        const t = markTile(json, n)!;
        if (!ok(t))
          bad.push(`${id}: mark ${n} at ${t.x},${t.y} is not walkable`);
      }
      for (const n of paths) {
        const pts = pathTiles(json, n)!;
        if (pts.length < 2) bad.push(`${id}: path ${n} has no waypoints`);
        const open = map.reachable(pts[0]!);
        for (const t of pts)
          if (!ok(t) || !open.has(`${t.x},${t.y}`))
            bad.push(
              `${id}: path ${n} waypoint ${t.x},${t.y} is not reachable`,
            );
      }
    }
    expect(bad).toEqual([]);
  });
});

/** Build step 3 of note 62 (point 6): the trigger is entering an area or a building. */
describe("heart event areas", () => {
  const areaOf = (place: string) => {
    const row = table[place]!;
    return row.area === "interior"
      ? undefined
      : areaRect(mapFiles[row.map]!, row.area);
  };

  it("every event place has an area: a zone on its map, or the whole interior", () => {
    for (const e of HEART_EVENTS) {
      const row = table[e.place]!;
      expect(row.area, e.place).toBeTruthy();
      if (row.area !== "interior") {
        expect(row.area, e.place).toBe(e.place);
        expect(areaOf(e.place), `${e.place} zone`).toBeDefined();
      }
    }
  });

  it("an interior area is only used for an interior map", () => {
    for (const [place, row] of Object.entries(table)) {
      const sharing = Object.entries(table).filter(
        ([, r]) => r.map === row.map,
      );
      if (row.area === "interior") {
        expect(sharing.length, `${place} shares ${row.map}`).toBe(1);
        expect(PLACES[place]?.interior ?? "mine", place).toBeTruthy();
      } else expect(areaOf(place), place).toBeDefined();
    }
  });

  it("the area contains the place's marks and paths", () => {
    const bad: string[] = [];
    for (const [place, row] of Object.entries(table)) {
      if (row.area === "interior") continue;
      const json = mapFiles[row.map]!;
      const pre = place.split(":")[1]!.replace(/-/g, "_") + "_";
      const { marks, paths } = stageNames(json);
      const tiles = [
        ...marks
          .filter((n) => n.startsWith(pre))
          .map((n) => markTile(json, n)!),
        ...paths
          .filter((n) => n.startsWith(pre))
          .flatMap((n) => pathTiles(json, n)!),
      ];
      for (const t of tiles)
        if (!inArea(place, row.map, t.x, t.y))
          bad.push(`${place}: ${t.x},${t.y} is outside its area`);
    }
    expect(bad).toEqual([]);
  });

  it("the person's usual spot is inside the area, and the route holds them there in the window", () => {
    for (const e of HEART_EVENTS) {
      const row = table[e.place]!;
      // An interior's whole map is the area; its place tile is the door outside.
      if (row.area === "interior") continue;
      const spot = resolvePlace(e.place)!;
      expect(spot.map, e.id).toBe(row.map);
      expect(inArea(e.place, row.map, spot.x, spot.y), e.id).toBe(true);
      expect(placesAt(row.map, spot.x, spot.y), e.id).toContain(e.place);
      expect(presenceOverlaps(e), e.id).toBe(true);
    }
  });

  it("one scene in each kind of place is blocked with walk, face and pose (#1002)", () => {
    // An interior (store), the green and a path; the rest is blocked in M3d (#950).
    const blocked = ["odette-store-2", "pim-green-2", "aurelle-river-path-2"];
    for (const id of blocked) {
      const e = HEART_EVENTS.find((x) => x.id === id)!;
      expect(e, id).toBeDefined();
      const cmds = new Set<string>((e.scene as Cmd[]).map((c) => c.cmd));
      for (const c of ["walk", "face", "pose"])
        expect(cmds.has(c), `${id} ${c}`).toBe(true);
      // The walker starts from a placed mark, and the path is on the map (the test above).
      for (const c of e.scene as Cmd[]) {
        if (c.cmd === "walk")
          expect(
            pathTiles(mapFiles[table[e.place]!.map]!, c.path),
          ).toBeDefined();
      }
    }
  });
});
