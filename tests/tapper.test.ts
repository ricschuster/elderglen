import { describe, expect, it } from "vitest";
import { canCraft, knownRecipes, recipeById } from "../src/core/crafting";
import {
  handOnMachine,
  loadMachine,
  placeMachine,
  fillBins,
} from "../src/core/machines";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { GEODE, GEODE_KINDS } from "../src/core/geodes";
import { itemById } from "../src/core/items";
import { processFor } from "../src/core/processing";
import { deserialize, newGame, serialize } from "../src/core/save";
import {
  collectTap,
  goodOfTree,
  liftTapper,
  placeTapper,
  tapReady,
  TAPPER,
  HEAVY_TAPPER,
  cycleDays,
} from "../src/core/tapper";
import { MATURE_STAGE } from "../src/core/trees";
import { useHeld } from "../src/core/tools";

function soilMap(): FarmMap {
  const layer = (name: string, data: number[]) => ({
    name,
    type: "tilelayer",
    data,
  });
  const json: TiledMapJson = {
    width: 8,
    height: 8,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", new Array(64).fill(0)),
      layer("soil", new Array(64).fill(1)),
      {
        name: "markers",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  };
  return FarmMap.fromTiled(json);
}

function treeGame(kind?: "oak" | "maple" | "pine" | "mahogany") {
  const g = newGame();
  g.trees.add(2, 2, MATURE_STAGE);
  const t = g.trees.at(2, 2)!;
  if (kind) t.kind = kind;
  g.inventory.add(TAPPER);
  return { g, t };
}

describe("tapper", () => {
  it("gives each tree its own good on its own cycle", () => {
    const days = { oak: 7, maple: 9, pine: 5, mahogany: 1 } as const;
    for (const [kind, n] of Object.entries(days)) {
      const { g, t } = treeGame(kind as keyof typeof days);
      expect(placeTapper(g, 2, 2).ok).toBe(true);
      g.day.clock.day += n - 1;
      expect(tapReady(g, t)).toBe(false);
      g.day.clock.day += 1;
      expect(tapReady(g, t)).toBe(true);
      expect(collectTap(g, 2, 2)).toEqual({
        ok: true,
        item: goodOfTree(t).item,
      });
      expect(tapReady(g, t)).toBe(false);
      expect(g.inventory.count(goodOfTree(t).item)).toBe(1);
    }
    expect(goodOfTree({ kind: undefined }).item).toBe("oak-resin");
  });

  it("goes only on a mature, untapped, standing tree", () => {
    const { g, t } = treeGame();
    t.stage = 4;
    expect(placeTapper(g, 2, 2)).toEqual({
      ok: false,
      reason: "cannot tap this",
    });
    t.stage = MATURE_STAGE;
    t.stump = true;
    expect(placeTapper(g, 2, 2).ok).toBe(false);
    t.stump = false;
    expect(placeTapper(g, 2, 2).ok).toBe(true);
    g.inventory.add(TAPPER);
    expect(placeTapper(g, 2, 2)).toEqual({
      ok: false,
      reason: "already tapped",
    });
    expect(placeTapper(g, 3, 3).ok).toBe(false);
  });

  it("works through the held item and the hand, and the pickaxe lifts it", () => {
    const { g, t } = treeGame();
    const map = soilMap();
    const held = { kind: "item" as const, id: TAPPER, count: 1 };
    expect(useHeld(g, map, held, 2, 2).ok).toBe(true);
    g.day.clock.day += 7;
    expect(useHeld(g, map, { kind: "empty" }, 2, 2)).toBeDefined();
    const lifted = useHeld(g, map, { kind: "tool", tool: "pickaxe" }, 2, 2);
    expect(lifted.ok).toBe(true);
    expect(t.tap).toBeUndefined();
    expect(g.inventory.count(TAPPER)).toBe(1);
    expect(g.inventory.count("oak-resin")).toBe(1);
  });

  it("lifts the tapper without a good when it is not ready, and saves with the tree", () => {
    const { g } = treeGame("pine");
    placeTapper(g, 2, 2);
    const back = deserialize(serialize(g));
    expect(back?.trees.at(2, 2)?.tap).toEqual({ since: g.day.clock.day });
    expect(liftTapper(g, 2, 2).ok).toBe(true);
    expect(g.inventory.count("pine-tar")).toBe(0);
    expect(g.inventory.count(TAPPER)).toBe(1);
  });

  it("has items, and a recipe at Foraging level 4", () => {
    expect(itemById("maple-syrup")?.sellPrice).toBe(200);
    const r = recipeById("tapper")!;
    expect(r.sources).toEqual([{ kind: "level", skill: "foraging", level: 4 }]);
    expect(r.ingredients).toEqual([
      { item: "wood", count: 40 },
      { item: "copper-bar", count: 2 },
    ]);
    const g = newGame();
    expect(knownRecipes(g).some((x) => x.id === "tapper")).toBe(false);
    expect(canCraft(g, r)).toBe(false);
  });
});

describe("geode crusher", () => {
  it("cracks each geode kind for free in an hour, and nothing else", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add("geode-crusher");
    expect(placeMachine(g, map, 3, 3, "geode-crusher").ok).toBe(true);
    expect(processFor("geode-crusher", "stone")).toBeUndefined();
    for (const kind of GEODE_KINDS)
      expect(processFor("geode-crusher", kind, () => 0.5)?.minutes).toBe(60);
    g.inventory.add(GEODE);
    const money = g.money;
    expect(loadMachine(g, 3, 3, GEODE).ok).toBe(true);
    expect(g.money).toBe(money);
    expect(g.inventory.count(GEODE)).toBe(0);
  });

  it("is learned from the Cave Patrol order", () => {
    const r = recipeById("geode-crusher")!;
    expect(r.sources).toEqual([{ kind: "order", order: "cave-patrol" }]);
    expect(r.ingredients.map((i) => i.count)).toEqual([2, 50, 1]);
    expect(r.ingredients.map((i) => i.item)).toContain("gem-high-b");
    expect(itemById("gem-high-b")?.name).toBe("Diamond");
  });
});

describe("worm bin", () => {
  it("makes 4 to 5 bait each morning, holds 50, and gives it up by hand", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add("worm-bin");
    expect(placeMachine(g, map, 3, 3, "worm-bin").ok).toBe(true);
    expect(loadMachine(g, 3, 3, "plain-bait")).toEqual({
      ok: false,
      reason: "takes nothing",
    });
    fillBins(g, () => 0);
    expect(g.machines.get(3, 3)?.job?.count).toBe(4);
    fillBins(g, () => 0.99);
    expect(g.machines.get(3, 3)?.job?.count).toBe(9);
    expect(handOnMachine(g, 3, 3).ok).toBe(true);
    expect(g.inventory.count("plain-bait")).toBe(9);
    expect(g.machines.get(3, 3)?.job?.count).toBe(0);
    for (let i = 0; i < 20; i++) fillBins(g, () => 0.99);
    expect(g.machines.get(3, 3)?.job?.count).toBe(50);
    // Empty bin: the hand lifts it.
    handOnMachine(g, 3, 3);
    g.machines.get(3, 3)!.job!.count = 0;
    expect(handOnMachine(g, 3, 3).ok).toBe(true);
    expect(g.machines.get(3, 3)).toBeUndefined();
    expect(g.inventory.count("worm-bin")).toBe(1);
  });

  it("is learned at Fishing level 4", () => {
    const r = recipeById("worm-bin")!;
    expect(r.sources).toEqual([{ kind: "level", skill: "fishing", level: 4 }]);
    expect(itemById("plain-bait")?.sellPrice).toBe(0);
  });

  it("a Heavy Tapper runs the short cycles and comes back as itself", () => {
    const days = { oak: 3, maple: 4, pine: 2, mahogany: 1 } as const;
    for (const kind of ["oak", "maple", "pine", "mahogany"] as const) {
      const { g, t } = treeGame(kind);
      g.inventory.add(HEAVY_TAPPER);
      expect(placeTapper(g, 2, 2, HEAVY_TAPPER).ok).toBe(true);
      expect(t.tap?.heavy).toBe(true);
      expect(g.inventory.count(HEAVY_TAPPER)).toBe(0);
      expect(cycleDays(t)).toBe(days[kind]);
      g.day.clock.day += days[kind] - 1;
      expect(tapReady(g, t)).toBe(false);
      g.day.clock.day += 1;
      expect(tapReady(g, t)).toBe(true);
    }
    const { g } = treeGame("oak");
    g.inventory.add(HEAVY_TAPPER);
    placeTapper(g, 2, 2, HEAVY_TAPPER);
    const back = deserialize(serialize(g));
    expect(back?.trees.at(2, 2)?.tap?.heavy).toBe(true);
    expect(liftTapper(g, 2, 2).ok).toBe(true);
    expect(g.inventory.count(HEAVY_TAPPER)).toBe(1);
    expect(g.inventory.count(TAPPER)).toBe(1);
  });

  it("has a Heavy Tapper recipe at Foraging level 8", () => {
    expect(itemById(HEAVY_TAPPER)?.name).toBe("Heavy tapper");
    expect(recipeById("heavy-tapper")?.sources).toEqual([
      { kind: "level", skill: "foraging", level: 8 },
    ]);
  });
});
