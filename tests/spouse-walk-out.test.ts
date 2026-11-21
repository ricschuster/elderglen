import { describe, expect, it } from "vitest";
import { newGame, type GameState } from "../src/core/save";
import { HEART } from "../src/core/friendship";
import { festivalDayToday } from "../src/core/festivals";
import { villagersOn } from "../src/core/townfolk";
import { dayContext } from "../src/core/villagers";

const at = (h: number, m = 0) => h * 60 + m;

const DAY = (() => {
  for (let d = 2; d < 28; d++) {
    const c = dayContext(d, "sunny");
    if (festivalDayToday(d) || c.weekday === "Wed" || c.weekday === "Fri")
      continue;
    return d;
  }
  throw new Error("no day");
})();

function marriedTo(id: string): GameState {
  const g = newGame();
  g.friendship.meet(id);
  g.friendship.setSpouse(id);
  g.friendship.award(id, 10 * HEART);
  g.friendship.giveBouquet(id);
  g.marriage.court(id, 99999);
  g.marriage.engage(id, 99999, -2);
  g.marriage.marry(1);
  g.day.clock.day = DAY;
  g.houseTier = 1;
  g.weather = "sunny";
  return g;
}

describe("the spouse leaving for work (tablet play, note 84)", () => {
  const g = marriedTo("linnet");
  const where = (t: number): string[] =>
    ["house", "farm", "hearthwell"].filter((m) =>
      villagersOn(g, m, DAY, t).some((p) => p.id === "linnet"),
    );

  it("is on a map every 10 minutes from 6:00 to 10:00, bar the moment she steps onto the road", () => {
    const gone: number[] = [];
    for (let t = at(6); t <= at(10); t += 10)
      if (where(t).length === 0) gone.push(t);
    // 8:30 is the instant the walk to the village ends at the farm's east edge.
    expect(gone.filter((t) => t !== at(8, 30))).toEqual([]);
  });

  it("is never off every map for more than a few minutes on the way out", () => {
    let off = 0;
    for (let t = at(8); t <= at(9, 10); t += 1)
      if (where(t).length === 0) off++;
    expect(off).toBeLessThanOrEqual(5);
  });

  it("walks out of the house, across the farm and into Hearthwell", () => {
    const seen = new Set<string>();
    for (let t = at(8); t <= at(9, 10); t += 1)
      for (const m of where(t)) seen.add(m);
    expect(seen).toEqual(new Set(["house", "farm", "hearthwell"]));
  });

  it("is on the farm, not in the house, shortly before she is on the road", () => {
    const names = (m: string, t: number) =>
      villagersOn(g, m, DAY, t).some((p) => p.id === "linnet");
    expect(names("farm", at(8, 27))).toBe(true);
    expect(names("house", at(8, 15))).toBe(true);
  });
});
