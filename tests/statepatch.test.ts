import { describe, expect, it } from "vitest";
import { newGame } from "../src/core/save";
import { dateOf } from "../src/core/calendar";
import { HEART } from "../src/core/friendship";
import { applyStatePatch } from "../src/core/statepatch";
import { hasFlag } from "../src/core/worldflags";
import { ROOMS } from "../src/core/bundles";
import { LEVEL_XP } from "../src/core/skills";
import { VILLAGERS } from "../src/core/villagers";

describe("applyStatePatch", () => {
  it("sets the day, from a number or a season", () => {
    const g = newGame();
    expect(applyStatePatch(g, { day: 40 }).problems).toEqual([]);
    expect(g.day.clock.day).toBe(40);
    expect(dateOf(40).season).toBe("summer");
    applyStatePatch(g, { season: "fall", dayOfSeason: 3 });
    expect(g.day.clock.day).toBe(2 * 28 + 3);
    expect(applyStatePatch(g, { day: 0 }).problems).toHaveLength(1);
  });

  it("sets money exactly and adds items", () => {
    const g = newGame();
    const r = applyStatePatch(g, {
      money: 12345,
      items: { wood: 50, nonsense: 1 },
    });
    expect(g.money).toBe(12345);
    expect(g.inventory.count("wood")).toBe(50);
    expect(r.problems).toEqual(["item nonsense: unknown"]);
  });

  it("raises skills by XP and never lowers them", () => {
    const g = newGame();
    applyStatePatch(g, { skills: { farming: 5, mining: 2 } });
    expect(g.skills.level("farming")).toBe(5);
    expect(g.skills.xpOf("farming")).toBe(LEVEL_XP[4]);
    expect(g.skills.level("mining")).toBe(2);
    applyStatePatch(g, { skills: { farming: 2 } });
    expect(g.skills.level("farming")).toBe(5);
    expect(
      applyStatePatch(g, { skills: { farming: 11 } }).problems,
    ).toHaveLength(1);
  });

  it("finishes hall rooms through hand-ins, opening later rooms in order", () => {
    const g = newGame();
    const first = ROOMS[0]!.id;
    const r = applyStatePatch(g, { hallRooms: [first] });
    expect(r.problems).toEqual([]);
    expect(g.hall.roomComplete(first)).toBe(true);
    expect(g.money).toBe(500);
    // A room that is still locked stays a problem, not a forced fill.
    const locked = ROOMS.find((x) => x.id !== first && !g.hall.roomOpen(x.id));
    if (locked && g.hall.bundlesIn(locked.id).length > 0) {
      const r2 = applyStatePatch(g, { hallRooms: [locked.id] });
      expect(r2.problems.length).toBeGreaterThan(0);
      expect(g.hall.roomComplete(locked.id)).toBe(false);
    }
    expect(applyStatePatch(g, { hallRooms: ["nope"] }).problems).toEqual([
      "unknown room nope",
    ]);
  });

  it("raises flags and friendship hearts", () => {
    const g = newGame();
    const who = VILLAGERS[0]!.id;
    const r = applyStatePatch(g, {
      flags: ["secret-log-cleared"],
      hearts: { [who]: 4, ghost: 2 },
    });
    expect(hasFlag(g, "secret-log-cleared")).toBe(true);
    expect(g.friendship.hearts(who)).toBe(4);
    expect(g.friendship.points(who)).toBe(4 * HEART);
    expect(g.friendship.met(who)).toBe(true);
    expect(r.problems).toEqual(["unknown villager ghost"]);
  });
});
