import { describe, expect, it } from "vitest";
import { gatherMoss } from "../src/core/actions";
import { deserialize, serialize } from "../src/core/save";
import { startGame } from "../src/core/toolbar";
import { MOSS_CHANCE, Trees } from "../src/core/trees";

const never = () => 0.99;
const always = () => 0;

function mossy() {
  const g = startGame();
  g.trees = new Trees([{ x: 2, y: 0, stage: 5 }]);
  g.trees.at(2, 0)!.moss = true;
  return g;
}

describe("tree moss (note 34)", () => {
  it("grows overnight on a mature tree outside winter", () => {
    const t = new Trees([
      { x: 1, y: 0, stage: 5 },
      { x: 5, y: 0, stage: 3 },
    ]);
    t.endDay("summer", always, () => false);
    expect(t.at(1, 0)?.moss).toBe(true);
    expect(t.at(5, 0)?.moss).toBeUndefined();
    const u = new Trees([{ x: 1, y: 0, stage: 5 }]);
    u.endDay(
      "summer",
      () => MOSS_CHANCE + 0.01,
      () => false,
    );
    expect(u.at(1, 0)?.moss).toBeUndefined();
  });

  it("does not grow in winter and is gone once winter comes", () => {
    const t = new Trees([{ x: 1, y: 0, stage: 5 }]);
    t.at(1, 0)!.moss = true;
    t.endDay("winter", always, () => false);
    expect(t.at(1, 0)?.moss).toBeUndefined();
    t.endDay("winter", always, () => false);
    expect(t.at(1, 0)?.moss).toBeUndefined();
  });

  it("is gathered for 1 to 2 moss without chopping", () => {
    const g = mossy();
    expect(gatherMoss(g, 2, 0, always).ok).toBe(true);
    expect(g.inventory.count("moss")).toBe(1);
    expect(g.trees.at(2, 0)?.moss).toBeUndefined();
    expect(g.trees.at(2, 0)?.stump).toBe(false);
    g.trees.at(2, 0)!.moss = true;
    gatherMoss(g, 2, 0, never);
    expect(g.inventory.count("moss")).toBe(3);
  });

  it("gives nothing from a bare tree, a stump or a seedling", () => {
    const g = mossy();
    g.trees.at(2, 0)!.moss = undefined;
    expect(gatherMoss(g, 2, 0).ok).toBe(false);
    g.trees.at(2, 0)!.moss = true;
    g.trees.at(2, 0)!.stump = true;
    expect(gatherMoss(g, 2, 0).ok).toBe(false);
    g.trees.at(2, 0)!.stump = false;
    g.trees.at(2, 0)!.stage = 3;
    expect(gatherMoss(g, 2, 0).ok).toBe(false);
  });

  it("is refused when the backpack is full and keeps the moss", () => {
    const g = mossy();
    while (g.inventory.room("moss") > 0) g.inventory.add("moss", 1);
    expect(gatherMoss(g, 2, 0, never).ok).toBe(false);
    expect(g.trees.at(2, 0)?.moss).toBe(true);
  });

  it("an old save without the field loads with bare trees", () => {
    const g = mossy();
    g.trees.at(2, 0)!.moss = undefined;
    const back = deserialize(serialize(g))!;
    expect(back.trees.at(2, 0)?.moss).toBeUndefined();
    const h = mossy();
    const again = deserialize(serialize(h))!;
    expect(again.trees.at(2, 0)?.moss).toBe(true);
  });
});
