import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import {
  AISLE_EXCEPTIONS,
  interiorIds,
  narrowAisles,
  thinCounters,
  unreachableMarkers,
  walkable,
} from "./helpers/interior";

// One reachability test over every interior map (note 86, build work item 2,
// #854): every marker is reachable from the door, every counter has two player
// tiles, every public aisle is at least 2 wide (see `narrowAisles`).

/**
 * Interiors not yet rebuilt or widened to the note 86 layouts. They are skipped
 * so the gate stays green. Every batch (#853, #856 to #860) removed its
 * maps from this set as it rebuilt them. Only the hall is left: it has no
 * draft and its counters have one player tile each.
 */
export const PENDING = new Set<string>(["hall"]);

const all = interiorIds();

describe("the interior list", () => {
  it("finds interiors, and PENDING and the exceptions name real ones", () => {
    expect(all.length).toBeGreaterThan(0);
    for (const id of PENDING) {
      expect(mapFiles[id], `PENDING ${id}`).toBeDefined();
      expect(all, `PENDING ${id} is an interior`).toContain(id);
    }
    for (const id of Object.keys(AISLE_EXCEPTIONS))
      expect(all, `exception ${id}`).toContain(id);
  });
});

describe("PENDING stays honest", () => {
  it("lists only maps that still fail a check (remove a map once it passes)", () => {
    for (const id of PENDING) {
      const problems = [
        ...unreachableMarkers(id),
        ...thinCounters(id),
        ...narrowAisles(id),
      ];
      expect(
        problems.length,
        `${id} passes; remove it from PENDING`,
      ).toBeGreaterThan(0);
    }
  });
});

describe("every rebuilt interior is reachable from its door", () => {
  // One test over the list (not one per map) so an empty list, while every map
  // is still PENDING, is not an empty suite.
  it("has every marker reachable, every counter open and every aisle 2 wide", () => {
    for (const id of all.filter((m) => !PENDING.has(m))) {
      expect(unreachableMarkers(id), `${id} unreachable`).toEqual([]);
      expect(thinCounters(id), `${id} counters`).toEqual([]);
      expect(narrowAisles(id), `${id} aisles`).toEqual([]);
    }
  });
});

describe("every interior door is 2 wide (#855, SC-145)", () => {
  it("has a door exit of at least two walkable tiles, in every interior", () => {
    for (const id of all) {
      const m = maps.get(id);
      const exit = m.exits.find((e) => e.id === "door")!;
      expect(exit.w * exit.h, `${id} door size`).toBeGreaterThanOrEqual(2);
      const open = walkable(m);
      for (let dy = 0; dy < exit.h; dy++)
        for (let dx = 0; dx < exit.w; dx++)
          expect(
            open.has(`${exit.x + dx},${exit.y + dy}`),
            `${id} door tile ${exit.x + dx},${exit.y + dy}`,
          ).toBe(true);
    }
  });
});
