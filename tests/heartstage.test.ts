import { describe, expect, it } from "vitest";
import { HEART_EVENTS, PLAYER, type Cmd } from "../src/core/heartevents";
import { weddingEvent } from "../src/core/courtship";
import { markTile, pathTiles, stageNames } from "../src/core/map";
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
const table = stages.places as Record<string, { map: string }>;
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
