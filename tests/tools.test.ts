import { describe, expect, it, vi } from "vitest";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { startGame, heldAt, TOOLS } from "../src/core/toolbar";
import { NOTHING_TO_ACT_ON, act, reasonText, useHeld } from "../src/core/tools";
import type { Held } from "../src/core/toolbar";

const layer = (name: string, data: number[]) => ({
  name,
  type: "tilelayer",
  data,
});

/** A 3x1 map: tillable, tillable, hard ground. */
function mapWith(soil: boolean): FarmMap {
  const json: TiledMapJson = {
    width: 3,
    height: 1,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", [0, 0, 0]),
      ...(soil ? [layer("soil", [1, 1, 0])] : []),
      {
        name: "objects",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  };
  return FarmMap.fromTiled(json);
}

const hoe: Held = { kind: "tool", tool: "hoe" };
const can: Held = { kind: "tool", tool: "can" };

describe("useHeld", () => {
  it("runs the plant, water, harvest loop", () => {
    const g = startGame();
    const map = mapWith(true);
    const seeds = heldAt(g, TOOLS.length);
    expect(useHeld(g, map, hoe, 0, 0).ok).toBe(true);
    expect(useHeld(g, map, seeds, 0, 0).ok).toBe(true);
    expect(g.inventory.count("parsnip-seed")).toBe(14);
    for (let i = 0; i < 4; i++) {
      expect(useHeld(g, map, can, 0, 0).ok).toBe(true);
      g.farm.endDay("spring");
    }
    // Harvest quality rolls Math.random; pin it so the item is always normal.
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const got = act(g, map, 0, 0);
    vi.restoreAllMocks();
    expect(got).toMatchObject({ ok: true, item: "parsnip" });
    expect(g.inventory.count("parsnip")).toBe(1);
  });

  it("spends energy on the hoe and the can only", () => {
    const g = startGame();
    const map = mapWith(true);
    useHeld(g, map, hoe, 0, 0);
    expect(g.day.energy.current).toBe(268);
    useHeld(g, map, heldAt(g, TOOLS.length), 0, 0);
    expect(g.day.energy.current).toBe(268);
  });

  it("refuses hard ground and maps without soil", () => {
    const g = startGame();
    expect(useHeld(g, mapWith(true), hoe, 2, 0)).toEqual({
      ok: false,
      reason: "cannot dig here",
    });
    expect(useHeld(g, mapWith(false), hoe, 0, 0)).toEqual({
      ok: false,
      reason: "nothing to do here",
    });
  });

  it("picks forage with Action", () => {
    const g = startGame();
    g.forage.respawn("spring", [{ x: 1, y: 0 }], () => 0.99);
    expect(g.forage.count).toBe(1);
    const got = act(g, mapWith(true), 1, 0);
    expect(got.ok).toBe(true);
    expect(g.forage.count).toBe(0);
  });

  it("leaves picking to Action for every item", () => {
    const g = startGame();
    g.forage.respawn("spring", [{ x: 1, y: 0 }], () => 0.99);
    const item: Held = { kind: "item", id: "parsnip", count: 1 };
    expect(useHeld(g, mapWith(true), item, 1, 0)).toEqual({
      ok: false,
      reason: "nothing to do here",
    });
    expect(g.forage.count).toBe(1);
  });

  it("explains every refusal in words", () => {
    expect(reasonText("exhausted")).toBe("You are too tired.");
    expect(reasonText("odd")).toBe("odd");
  });
});

describe("act", () => {
  it("picks forage whatever is held", () => {
    const g = startGame();
    g.forage.respawn("spring", [{ x: 1, y: 0 }], () => 0.99);
    const got = act(g, mapWith(true), 1, 0);
    expect(got.ok).toBe(true);
    expect(g.forage.count).toBe(0);
  });

  it("harvests a ripe crop", () => {
    const g = startGame();
    const map = mapWith(true);
    const seeds = heldAt(g, TOOLS.length);
    useHeld(g, map, hoe, 0, 0);
    useHeld(g, map, seeds, 0, 0);
    for (let i = 0; i < 4; i++) {
      useHeld(g, map, can, 0, 0);
      g.farm.endDay("spring");
    }
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const got = act(g, map, 0, 0);
    vi.restoreAllMocks();
    expect(got).toMatchObject({ ok: true, item: "parsnip" });
    expect(g.inventory.count("parsnip")).toBe(1);
  });

  it("is quiet and free on a tile with nothing to act on", () => {
    const g = startGame();
    const map = mapWith(true);
    const before = g.day.energy.current;
    expect(act(g, map, 0, 0)).toEqual({
      ok: false,
      reason: NOTHING_TO_ACT_ON,
    });
    // A dug plot that is not ripe is also nothing to act on.
    useHeld(g, map, hoe, 1, 0);
    const spent = g.day.energy.current;
    expect(act(g, map, 1, 0)).toEqual({ ok: false, reason: NOTHING_TO_ACT_ON });
    expect(g.day.energy.current).toBe(spent);
    expect(spent).toBeLessThan(before);
    expect(reasonText(NOTHING_TO_ACT_ON)).toBe("");
  });

  it("does nothing on a map without soil", () => {
    const g = startGame();
    expect(act(g, mapWith(false), 0, 0)).toEqual({
      ok: false,
      reason: NOTHING_TO_ACT_ON,
    });
  });
});
