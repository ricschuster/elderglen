import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { cropById } from "../src/core/crops";
import { known, recipeById } from "../src/core/crafting";
import { collect, smelt } from "../src/core/furnace";
import {
  GARDEN_POT,
  actOnPot,
  potInUse,
  placeGardenPot,
  potAt,
  potLook,
  potsOf,
} from "../src/core/gardenpot";
import { GREENHOUSE_MAP } from "../src/core/greenhouse";
import { itemById } from "../src/core/items";
import { openLetter, queueMail } from "../src/core/mail";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { REFINED_CRYSTAL } from "../src/core/ore";
import { mayPlaceOn } from "../src/core/placeables";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { TEA_LEAF, TEA_SAPLING } from "../src/core/teabush";
import { act, useHeld } from "../src/core/tools";

const held = (id: string) => ({ kind: "item", id, count: 1 }) as never;
const tool = (t: string) => ({ kind: "tool", tool: t }) as never;

function soilMap(): FarmMap {
  const layer = (name: string, data: number[]) => ({
    name,
    type: "tilelayer",
    data,
  });
  const json: TiledMapJson = {
    width: 12,
    height: 12,
    tilewidth: 16,
    tileheight: 16,
    layers: [
      layer("collision", new Array(144).fill(0)),
      layer("soil", new Array(144).fill(1)),
      {
        name: "markers",
        type: "objectgroup",
        objects: [{ name: "start", class: "entry", x: 0, y: 0 }],
      },
    ],
  };
  return FarmMap.fromTiled(json);
}

describe("refined crystal", () => {
  it("is smelted from one quartz crystal and one coal in 90 minutes", () => {
    const g = newGame();
    g.furnace.gifted = true;
    expect(smelt(g, REFINED_CRYSTAL)).toBe("not enough ore");
    g.inventory.add("quartz-crystal", 1);
    expect(smelt(g, REFINED_CRYSTAL)).toBe("not enough coal");
    g.inventory.add("coal", 1);
    expect(smelt(g, REFINED_CRYSTAL)).toBeUndefined();
    expect(g.inventory.count("quartz-crystal")).toBe(0);
    g.day.act(0, 90);
    expect(collect(g)).toEqual({ ok: true, bar: REFINED_CRYSTAL });
    expect(itemById(REFINED_CRYSTAL)?.name).toBe("Refined crystal");
  });
});

describe("garden pot recipe", () => {
  it("costs clay 1, stone 10 and a refined crystal, taught by Alder once the Larder is restored", () => {
    const r = recipeById(GARDEN_POT)!;
    expect(r.ingredients).toEqual([
      { item: "clay", count: 1 },
      { item: "stone", count: 10 },
      { item: REFINED_CRYSTAL, count: 1 },
    ]);
    expect(itemById(GARDEN_POT)).toBeDefined();
    const g = newGame();
    expect(known(g, r)).toBe(false);
    expect(queueMail(g, 2)).not.toContain("alder-garden-pot");
    g.hall.roomComplete = (room: string) => room === "larder";
    expect(queueMail(g, 2)).toContain("alder-garden-pot");
    g.mail.deliver(2);
    const opened = openLetter(g, "alder-garden-pot");
    expect(opened.ok).toBe(true);
    expect(known(g, r)).toBe(true);
  });
});

describe("garden pot", () => {
  it("stands on the farm and in the greenhouse only", () => {
    expect(mayPlaceOn(GARDEN_POT, "farm")).toBe(true);
    expect(mayPlaceOn(GARDEN_POT, "greenhouse")).toBe(true);
    expect(mayPlaceOn(GARDEN_POT, "house")).toBe(false);
  });

  it("is placed on clear ground, blocks the hoe, and lifts when empty", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(GARDEN_POT, 2);
    expect(useHeld(g, map, held(GARDEN_POT), 4, 4).ok).toBe(true);
    expect(potAt(g, map, 4, 4)).toBeDefined();
    expect(placeGardenPot(g, map, 4, 4).ok).toBe(false);
    expect(g.inventory.count(GARDEN_POT)).toBe(1);
    expect(useHeld(g, map, tool("hoe"), 4, 4).ok).toBe(true);
    expect(potAt(g, map, 4, 4)).toBeUndefined();
    expect(g.inventory.count(GARDEN_POT)).toBe(2);
  });

  it("grows a crop of the season outdoors and is watered by the can, not a sprinkler", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(GARDEN_POT);
    g.inventory.add("parsnip-seed", 2);
    placeGardenPot(g, map, 4, 4);
    g.sprinklers.add(5, 4, "sprinkler");
    expect(useHeld(g, map, held("parsnip-seed"), 4, 4).ok).toBe(true);
    const grow = cropById("parsnip")!.growDays;
    // A sprinkler beside it does nothing.
    for (let i = 0; i < grow - 1; i++) sleep(g, [], () => 0.5, map);
    expect(act(g, map, 4, 4).ok).toBe(false);
    expect(
      (potAt(g, map, 4, 4)?.state as { plot: { crop: { daysGrown: number } } })
        .plot.crop.daysGrown,
    ).toBe(0);
    // Watered by the can each evening, it ripens.
    for (let i = 0; i < grow; i++) {
      expect(useHeld(g, map, tool("can"), 4, 4).ok).toBe(true);
      sleep(g, [], () => 0.5, map);
    }
    expect(act(g, map, 4, 4).ok).toBe(true);
    expect(g.inventory.count("parsnip")).toBeGreaterThan(0);
  });

  it("refuses an out of season seed outdoors but takes it in the greenhouse", () => {
    const g = newGame();
    g.day.clock.day = 3 * 28 + 5;
    g.hall.roomComplete = () => true;
    g.inventory.add(GARDEN_POT, 2);
    g.inventory.add("parsnip-seed", 2);
    const farm = soilMap();
    placeGardenPot(g, farm, 4, 4);
    expect(useHeld(g, farm, held("parsnip-seed"), 4, 4).ok).toBe(false);
    expect(g.inventory.count("parsnip-seed")).toBe(2);
    const house = maps.get(GREENHOUSE_MAP);
    let spot: { x: number; y: number } | undefined;
    for (let y = 0; y < house.height && !spot; y++)
      for (let x = 0; x < house.width; x++)
        if (placeGardenPot(g, house, x, y).ok) {
          spot = { x, y };
          break;
        }
    expect(spot).toBeDefined();
    expect(useHeld(g, house, held("parsnip-seed"), spot!.x, spot!.y).ok).toBe(
      true,
    );
    expect(g.inventory.count("parsnip-seed")).toBe(1);
  });

  it("holds a tea bush that grows and bears leaves, and will not lift while planted", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(GARDEN_POT);
    g.inventory.add(TEA_SAPLING);
    placeGardenPot(g, map, 2, 2);
    expect(useHeld(g, map, held(TEA_SAPLING), 2, 2).ok).toBe(true);
    expect(useHeld(g, map, tool("hoe"), 2, 2)).toEqual({
      ok: false,
      reason: "garden pot in use",
    });
    // Age the bush to 20 days, then sleep into day 22 of the season.
    const st = potAt(g, map, 2, 2)!.state as { tea: { age: number } };
    st.tea.age = 20;
    g.day.clock.day = 21;
    sleep(g, [], () => 0.5, map);
    expect(act(g, map, 2, 2).ok).toBe(true);
    expect(g.inventory.count(TEA_LEAF)).toBe(1);
    expect(actOnPot(g, map, 2, 2)?.ok).toBe(false);
  });

  it("survives a save and load with its contents", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(GARDEN_POT);
    g.inventory.add("parsnip-seed");
    placeGardenPot(g, map, 3, 3);
    useHeld(g, map, held("parsnip-seed"), 3, 3);
    const back = deserialize(serialize(g))!;
    const pot = potAt(back, map, 3, 3);
    expect(JSON.stringify(pot?.state)).toContain("parsnip");
  });
});

describe("garden pot drawing", () => {
  it("lists the pots on the map and says what grows in each", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(GARDEN_POT, 2);
    g.inventory.add("parsnip-seed", 1);
    placeGardenPot(g, map, 4, 4);
    placeGardenPot(g, map, 6, 4);
    expect(potsOf(g, map)).toHaveLength(2);
    expect(potLook(potAt(g, map, 4, 4)!)).toBeUndefined();
    useHeld(g, map, held("parsnip-seed"), 4, 4);
    expect(potLook(potAt(g, map, 4, 4)!)).toMatchObject({
      kind: "crop",
      id: "parsnip",
      daysGrown: 0,
      ripe: false,
    });
  });
});

describe("garden pot dig out and fertilizer", () => {
  function potted(seed = "parsnip-seed") {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(GARDEN_POT);
    g.inventory.add(seed);
    placeGardenPot(g, map, 3, 3);
    useHeld(g, map, held(seed), 3, 3);
    return { g, map };
  }

  it("digs a crop out with the hoe or pickaxe, and the pot stays", () => {
    for (const t of ["hoe", "pickaxe"]) {
      const { g, map } = potted();
      expect(useHeld(g, map, tool(t), 3, 3).ok).toBe(true);
      const pot = potAt(g, map, 3, 3)!;
      expect(pot).toBeDefined();
      expect(potInUse(pot)).toBe(false);
      expect(useHeld(g, map, tool("hoe"), 3, 3).ok).toBe(true);
      expect(potAt(g, map, 3, 3)).toBeUndefined();
    }
  });

  it("digs a tea bush out with the axe only", () => {
    const { g, map } = potted(TEA_SAPLING);
    expect(useHeld(g, map, tool("hoe"), 3, 3).ok).toBe(false);
    expect(potInUse(potAt(g, map, 3, 3)!)).toBe(true);
    expect(useHeld(g, map, tool("axe"), 3, 3).ok).toBe(true);
    expect(potInUse(potAt(g, map, 3, 3)!)).toBe(false);
  });

  it("takes fertilizer in an empty pot and a planted one", () => {
    const g = newGame();
    const map = soilMap();
    g.inventory.add(GARDEN_POT);
    g.inventory.add("basic-fertilizer", 2);
    g.inventory.add("parsnip-seed");
    placeGardenPot(g, map, 3, 3);
    expect(useHeld(g, map, held("basic-fertilizer"), 3, 3).ok).toBe(true);
    expect(useHeld(g, map, held("basic-fertilizer"), 3, 3).ok).toBe(false);
    expect(g.inventory.count("basic-fertilizer")).toBe(1);
    expect(useHeld(g, map, held("parsnip-seed"), 3, 3).ok).toBe(true);
    const back = deserialize(serialize(g))!;
    expect(JSON.stringify(potAt(back, map, 3, 3)?.state)).toContain(
      "basic-fertilizer",
    );
  });
});
