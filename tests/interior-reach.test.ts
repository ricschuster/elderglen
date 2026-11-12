import { describe, expect, it } from "vitest";
import { mapFiles } from "../src/content/maps";
import {
  AISLE_EXCEPTIONS,
  interiorIds,
  narrowAisles,
  thinCounters,
  unreachableMarkers,
} from "./helpers/interior";

// One reachability test over every interior map (note 86, build work item 2,
// #854): every marker is reachable from the door, every counter has two player
// tiles, every public aisle is at least 2 wide (see `narrowAisles`).

/**
 * Interiors not yet rebuilt or widened to the note 86 layouts. They are skipped
 * so the gate stays green. Each later batch (#853, #855 to #860) removes its
 * maps from this set as it rebuilds them; the test then runs on them.
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
