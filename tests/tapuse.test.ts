import { describe, expect, it } from "vitest";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { heldAt, startGame, TOOLS, type Held } from "../src/core/toolbar";
import { tapUse } from "../src/core/tapuse";
import { useHeld } from "../src/core/tools";

const layer = (name: string, data: number[]) => ({
  name,
  type: "tilelayer",
  data,
});

/** A 3x1 map: tillable, tillable, hard ground. */
function map(): FarmMap {
  const json: TiledMapJson = {
    width: 3,
    height: 1,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", [0, 0, 0]),
      layer("soil", [1, 1, 0]),
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
const axe: Held = { kind: "tool", tool: "axe" };

describe("tapUse", () => {
  it("the hoe fits diggable ground, not tilled or hard ground", () => {
    const g = startGame();
    const m = map();
    expect(tapUse(g, m, hoe, 0, 0)).toBe("use");
    expect(tapUse(g, m, hoe, 2, 0)).toBe("walk");
    useHeld(g, m, hoe, 0, 0);
    expect(tapUse(g, m, hoe, 0, 0)).toBe("walk");
  });

  it("the can fits tilled soil that is dry, not bare or watered ground", () => {
    const g = startGame();
    const m = map();
    expect(tapUse(g, m, can, 0, 0)).toBe("walk");
    useHeld(g, m, hoe, 0, 0);
    expect(tapUse(g, m, can, 0, 0)).toBe("use");
    useHeld(g, m, can, 0, 0);
    expect(tapUse(g, m, can, 0, 0)).toBe("walk");
  });

  it("seeds fit empty tilled soil only", () => {
    const g = startGame();
    const m = map();
    const seeds = heldAt(g, TOOLS.length);
    expect(tapUse(g, m, seeds, 0, 0)).toBe("walk");
    useHeld(g, m, hoe, 0, 0);
    expect(tapUse(g, m, seeds, 0, 0)).toBe("use");
    useHeld(g, m, seeds, 0, 0);
    expect(tapUse(g, m, seeds, 0, 0)).toBe("walk");
  });

  it("a tap that only walks costs nothing", () => {
    const g = startGame();
    const m = map();
    const before = g.day.energy.current;
    tapUse(g, m, hoe, 2, 0);
    expect(g.day.energy.current).toBe(before);
  });

  it("the axe is not judged: the scene keeps its rule", () => {
    expect(tapUse(startGame(), map(), axe, 0, 0)).toBe("other");
  });
});
