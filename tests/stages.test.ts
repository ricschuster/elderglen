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
import { socialRows } from "../src/core/menupages";
import { pendingChoice } from "../src/core/professions";
import { maps } from "../src/content/maps";
import { START } from "../src/core/maps";
import { pondAt, pondBlockers, pondUse, stateOf } from "../src/core/pond";

describe("stage setup", () => {
  it("marks the orders intro seen and meets the roster for marriage stages", () => {
    const r = buildStage("married-child", () => 0)!;
    expect(r.state.orders.opened).toBe(true);
    expect(socialRows(r.state).every((x) => x.met)).toBe(true);
  });

  it("leaves no profession prompt pending at day 100", () => {
    const r = buildStage("late-game-100", () => 0)!;
    expect(pendingChoice(r.state.skills)).toBeUndefined();
  });

  it("starts the mines and market stages on their own maps", () => {
    expect(buildStage("mines-30", () => 0)!.map).toBe("mine-30");
    const m = buildStage("night-market-evening-1", () => 0)!;
    expect(m.map).toBe("hearthwell");
    expect(m.entry).toBe("from_cart-square");
  });
});

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
    // A married stage is past its wedding day, so the spouse keeps the married route today.
    for (const id of ["married", "married-child", "married-two-children"]) {
      const s = g(id);
      expect(s.marriage.weddingDay).toBeLessThan(s.day.clock.day);
    }
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

describe("the pond stage", () => {
  it("builds a stocked pond on a clear spot that can be played", () => {
    const r = buildStage("farm-pond-stocked", never)!;
    expect(r.problems).toEqual([]);
    expect(r.map).toBeUndefined();
    const fresh = buildStage("new-game", never)!.state;
    const farm = maps.get(START.map);
    const p = pondAt(r.state, 50, 18)!;
    expect(p).toBeTruthy();
    // The spot is free on the farm without the pond.
    expect(pondBlockers(fresh, farm, "farm", p.x, p.y)).toEqual([]);
    const s = stateOf(pondAt(r.state, p.x, p.y)!);
    expect(s.building).toBe(0);
    expect(s.species).toBe("carp");
    expect(s.count).toBe(2);
    expect(r.state.inventory.count("carp")).toBe(3);
    expect(pondUse(r.state, p, "carp").ok).toBe(true);
    expect(stateOf(pondAt(r.state, p.x, p.y)!).count).toBe(3);
  });

  it("rejects a species that cannot live in a pond", () => {
    const g = newGame();
    expect(
      applyStatePatch(g, { pond: { x: 50, y: 18, species: "stone", count: 1 } })
        .problems,
    ).toHaveLength(1);
  });
});

describe("the pond product and quest stages", () => {
  it("farm-pond-product leaves roe waiting that an empty hand takes", () => {
    const r = buildStage("farm-pond-product", never)!;
    expect(r.problems).toEqual([]);
    const p = pondAt(r.state, 50, 18)!;
    expect(stateOf(p).out).toEqual({ item: "carp-roe", count: 2 });
    expect(pondUse(r.state, p, undefined).ok).toBe(true);
    expect(r.state.inventory.count("carp-roe")).toBe(2);
    expect(stateOf(pondAt(r.state, 50, 18)!).out).toBeUndefined();
  });

  it("farm-pond-quest has an open quest the pack can fill by hand", () => {
    const r = buildStage("farm-pond-quest", never)!;
    expect(r.problems).toEqual([]);
    const p = pondAt(r.state, 50, 18)!;
    const before = stateOf(p);
    expect(before.quest).toEqual({ item: "copper-ore", need: 3, given: 0 });
    expect(r.state.inventory.count("copper-ore")).toBe(3);
    for (let i = 0; i < 3; i++) pondUse(r.state, p, "copper-ore");
    const after = stateOf(pondAt(r.state, 50, 18)!);
    expect(after.quest).toBeUndefined();
    expect(after.capLevel).toBe(before.capLevel + 1);
    expect(r.state.inventory.count("copper-ore")).toBe(0);
  });

  it("rejects a product or quest with no fish, or a bad item or count", () => {
    const bad = (pond: Record<string, unknown>) =>
      applyStatePatch(newGame(), {
        pond: { x: 50, y: 18, ...pond },
      } as never).problems;
    const out = { item: "carp-roe", count: 1 };
    expect(bad({ out })).toHaveLength(1);
    expect(bad({ quest: { item: "copper-ore", need: 3 } })).toHaveLength(1);
    expect(
      bad({ species: "carp", count: 1, out: { item: "nope", count: 1 } }),
    ).toHaveLength(1);
    expect(
      bad({ species: "carp", count: 1, out: { item: "carp-roe", count: 0 } }),
    ).toHaveLength(1);
    expect(
      bad({
        species: "carp",
        count: 1,
        quest: { item: "copper-ore", need: 0 },
      }),
    ).toHaveLength(1);
  });
});
