import { describe, expect, it } from "vitest";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { startGame } from "../src/core/toolbar";
import { useHeld, reasonText } from "../src/core/tools";
import type { Held } from "../src/core/toolbar";
import {
  CAN_CAPACITY,
  canCapacity,
  canFraction,
  canWaterLine,
} from "../src/core/canwater";
import { deserialize, serialize } from "../src/core/save";

const map = (): FarmMap => {
  const json: TiledMapJson = {
    width: 3,
    height: 1,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      { name: "collision", type: "tilelayer", data: [0, 0, 0] },
      { name: "soil", type: "tilelayer", data: [1, 1, 0] },
      {
        name: "objects",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  };
  return FarmMap.fromTiled(json);
};

const hoe: Held = { kind: "tool", tool: "hoe" };
const can: Held = { kind: "tool", tool: "can" };

describe("water in the can", () => {
  it("starts full and has a capacity per tier", () => {
    const g = startGame();
    expect(g.canWater).toBe(40);
    expect(canCapacity(g)).toBe(40);
    g.toolTiers.can = 4;
    expect(canCapacity(g)).toBe(CAN_CAPACITY[4]);
  });

  it("spends one per watered tile and fails with no energy when empty", () => {
    const g = startGame();
    const m = map();
    useHeld(g, m, hoe, 0, 0);
    useHeld(g, m, hoe, 1, 0);
    expect(useHeld(g, m, can, 0, 0).ok).toBe(true);
    expect(g.canWater).toBe(39);
    expect(canFraction(g)).toBeCloseTo(39 / 40);
    g.canWater = 0;
    const energy = g.day.energy.current;
    const r = useHeld(g, m, can, 1, 0);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(reasonText(r.reason)).toBe("The can is empty. Fill it at water.");
    expect(g.day.energy.current).toBe(energy);
  });

  it("refills at a water tile", () => {
    const g = startGame();
    g.canWater = 3;
    const wet = { isWater: () => true } as unknown as FarmMap;
    expect(useHeld(g, wet, can, 0, 0).ok).toBe(true);
    expect(g.canWater).toBe(40);
    expect(canWaterLine(g)).toBe("Water: 40/40");
  });

  it("saves, and an old save starts full", () => {
    const g = startGame();
    g.canWater = 7;
    const text = serialize(g);
    expect(deserialize(text)?.canWater).toBe(7);
    const old = JSON.parse(text) as Record<string, unknown>;
    delete old.canWater;
    expect(deserialize(JSON.stringify(old))?.canWater).toBe(40);
  });
});
