import { describe, expect, it } from "vitest";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { newGame } from "../src/core/save";
import { tapStatus, TAPPER } from "../src/core/tapper";
import { isSoilWork, tapUse } from "../src/core/tapuse";
import { MATURE_STAGE } from "../src/core/trees";
import { act, reasonText, useHeld } from "../src/core/tools";
import type { Held } from "../src/core/toolbar";

function map(): FarmMap {
  const layer = (name: string, data: number[]) => ({
    name,
    type: "tilelayer",
    data,
  });
  const json: TiledMapJson = {
    width: 4,
    height: 4,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", new Array(16).fill(0)),
      layer("soil", new Array(16).fill(1)),
      {
        name: "markers",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  };
  return FarmMap.fromTiled(json);
}

const tapper: Held = { kind: "item", id: TAPPER, count: 1 };

describe("tapper in the scene rules", () => {
  it("the tap-use rule fits a mature untapped tree only", () => {
    const g = newGame();
    const m = map();
    g.inventory.add(TAPPER);
    expect(isSoilWork(tapper)).toBe(true);
    g.trees.add(1, 1, MATURE_STAGE);
    g.trees.add(2, 2, 1);
    expect(tapUse(g, m, tapper, 1, 1)).toBe("use");
    expect(tapUse(g, m, tapper, 2, 2)).toBe("walk");
    expect(tapUse(g, m, tapper, 3, 3)).toBe("walk");
    useHeld(g, m, tapper, 1, 1);
    expect(tapUse(g, m, tapper, 1, 1)).toBe("walk");
  });

  it("Action on an unready tap fails with tap busy, and the status gives the days left", () => {
    const g = newGame();
    const m = map();
    g.trees.add(1, 1, MATURE_STAGE);
    g.inventory.add(TAPPER);
    useHeld(g, m, tapper, 1, 1);
    expect(act(g, m, 1, 1)).toEqual({ ok: false, reason: "tap busy" });
    expect(tapStatus(g, 1, 1)).toBe("Oak resin: 7 more days.");
    g.day.clock.day += 6;
    expect(tapStatus(g, 1, 1)).toBe("Oak resin: 1 more day.");
    g.day.clock.day += 1;
    expect(tapStatus(g, 1, 1)).toBe("The oak resin is ready.");
    expect(tapStatus(g, 3, 3)).toBe("");
  });

  it("has words for the tapper failures", () => {
    for (const r of [
      "no tapper",
      "already tapped",
      "cannot tap this",
      "not tapped",
    ])
      expect(reasonText(r)).not.toBe(r);
  });
});
