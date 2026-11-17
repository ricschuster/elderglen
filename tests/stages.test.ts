import { describe, expect, it } from "vitest";
import {
  buildStage,
  stageList,
  stageById,
  stageSteps,
} from "../src/core/stages";
import { sleep } from "../src/core/sleep";
import { dateOf } from "../src/core/calendar";
import { FESTIVALS } from "../src/core/festivals";
import { applyStatePatch } from "../src/core/statepatch";
import { newGame } from "../src/core/save";

const spots = Array.from({ length: 40 }, (_, i) => ({ x: i, y: 5 }));
const never = () => 0;

describe("stages", () => {
  it("has unique ids and known bases", () => {
    const ids = stageList().map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of stageList())
      if (s.base) expect(stageById(s.base)).toBeTruthy();
  });

  it("covers the day before every festival", () => {
    for (const f of FESTIVALS) {
      const has = stageList().some((s) => {
        const p = stageSteps(s.id).at(-1)!;
        return (
          s.group === "Festivals" &&
          p.season === f.season &&
          (p.dayOfSeason ?? 0) >= f.day - 1 &&
          (p.dayOfSeason ?? 0) <= (f.lastDay ?? f.day)
        );
      });
      expect(has, f.id).toBe(true);
    }
  });

  it("builds an unknown name as undefined", () => {
    expect(buildStage("no-such-stage")).toBeUndefined();
  });

  for (const stage of stageList()) {
    it(`loads ${stage.id} cleanly and runs one day`, () => {
      const r = buildStage(stage.id, never)!;
      expect(r.problems).toEqual([]);
      const day = r.state.day.clock.day;
      sleep(r.state, spots, never);
      expect(r.state.day.clock.day).toBe(day + 1);
    });
  }

  it("puts the stages where they say", () => {
    const g = (id: string) => buildStage(id, never)!.state;
    expect(g("new-game").day.clock.day).toBe(1);
    expect(dateOf(g("season-fall").day.clock.day).season).toBe("fall");
    expect(g("hall-5").hall.roomComplete("guests-board")).toBe(true);
    expect(g("hall-5").hall.roomComplete("last-seat")).toBe(false);
    expect(g("hall-6").hall.roomComplete("last-seat")).toBe(true);
    expect(g("mines-60").mines.deepest).toBe(60);
    expect(g("married").marriage.married).toBe(true);
    expect(g("married-two-children").marriage.children).toBe(2);
    expect(g("engaged").marriage.stage).toBe("engaged");
    expect(g("night-market-evening-2").day.clock.format()).toBe("5:00 pm");
    expect(g("fishing-heron-rod").inventory.count("heron-rod")).toBe(1);
    const pack = g("late-game-100").inventory;
    for (let i = 0; i < pack.size; i++) expect(pack.slot(i)).toBeTruthy();
  });
});

describe("patch keys for stages", () => {
  it("rejects bad marriage, floor and tier values", () => {
    const g = newGame();
    expect(
      applyStatePatch(g, { marriage: { spouse: "nobody" } }).problems,
    ).toHaveLength(1);
    expect(applyStatePatch(g, { minesDeepest: 30 }).problems).toHaveLength(1);
    expect(applyStatePatch(g, { houseTier: 9 }).problems).toHaveLength(1);
    expect(g.marriage.stage).toBe("none");
  });

  it("does not court twice", () => {
    const g = newGame();
    applyStatePatch(g, { marriage: { spouse: "linnet", stage: "courting" } });
    expect(
      applyStatePatch(g, { marriage: { spouse: "alder" } }).problems,
    ).toHaveLength(1);
    expect(g.marriage.spouse).toBe("linnet");
  });

  it("fills the pack", () => {
    const g = newGame();
    applyStatePatch(g, { fillPack: true });
    for (let i = 0; i < g.inventory.size; i++)
      expect(g.inventory.slot(i)).toBeTruthy();
  });
});
