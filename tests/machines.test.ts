import { describe, expect, it } from "vitest";
import { ARTISAN_GOODS, categoryOf } from "../src/core/artisan";
import { Hall, normalizeBundle, ROOMS } from "../src/core/bundles";
import { craft, knownRecipes } from "../src/core/crafting";
import { COAL, COAL_PER_BAR, ORE_PER_BAR, ORES } from "../src/core/ore";
import { itemById } from "../src/core/items";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import {
  machineMinutes,
  handOnMachine,
  jobDone,
  loadMachine,
  placeMachine,
  statusText,
  waitText,
} from "../src/core/machines";
import { MINUTES_PER_DAY, processFor } from "../src/core/processing";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { LEVEL_XP } from "../src/core/skills";
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

const never = () => 0.99;

function withMachine(id: string) {
  const g = newGame();
  const map = soilMap();
  g.inventory.add(id);
  expect(placeMachine(g, map, 3, 3, id).ok).toBe(true);
  return { g, map };
}

/** Pass n whole days, with the clock back at the morning each time. */
function pass(g: ReturnType<typeof newGame>, map: FarmMap, days: number) {
  for (let i = 0; i < days; i++) sleep(g, [], never, map);
}

describe("artisan goods", () => {
  it("price as the tuning note says", () => {
    expect(itemById("melon-jam")?.sellPrice).toBe(2 * 250 + 50);
    expect(itemById("parsnip-pickles")?.sellPrice).toBe(2 * 35 + 50);
    expect(itemById("melon-wine")?.sellPrice).toBe(750);
    expect(itemById("parsnip-juice")?.sellPrice).toBe(Math.floor(2.25 * 35));
    expect(itemById("honey")?.sellPrice).toBe(100);
    expect(itemById("mead")?.sellPrice).toBe(300);
  });

  it("have unique ids and categories", () => {
    const ids = ARTISAN_GOODS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(categoryOf("grape-wine@gold")).toBe("wine");
    expect(categoryOf("parsnip")).toBeUndefined();
  });
});

describe("machine rules", () => {
  it("send fruit and vegetables to the right goods", () => {
    expect(processFor("preserves-jar", "melon")?.output).toBe("melon-jam");
    expect(processFor("preserves-jar", "parsnip")?.output).toBe(
      "parsnip-pickles",
    );
    expect(processFor("preserves-jar", "daffodil")).toBeUndefined();
    expect(processFor("preserves-jar", "melon-jam")).toBeUndefined();
    expect(processFor("keg", "melon")?.minutes).toBe(10000);
    expect(processFor("keg", "parsnip")?.output).toBe("parsnip-juice");
    expect(processFor("keg", "honey")?.output).toBe("mead");
  });

  it("make 1 to 3 seeds, and coal from 10 wood", () => {
    expect(processFor("seed-maker", "melon", () => 0)?.count).toBe(1);
    expect(processFor("seed-maker", "melon", never)?.count).toBe(3);
    expect(processFor("seed-maker", "melon")?.output).toBe("melon-seed");
    expect(processFor("seed-maker", "leek")).toBeUndefined();
    const kiln = processFor("charcoal-kiln", "wood");
    expect(kiln?.use).toBe(10);
    expect(kiln?.output).toBe("coal");
    expect(processFor("charcoal-kiln", "stone")).toBeUndefined();
  });
});

describe("machines on the farm", () => {
  it("run a batch overnight and give it up when done", () => {
    const { g, map } = withMachine("preserves-jar");
    g.inventory.add("melon@silver");
    const held = { kind: "item", id: "melon@silver", count: 1 } as const;
    const r = useHeld(g, map, held, 3, 3);
    expect(r.ok).toBe(true);
    expect(g.inventory.count("melon@silver")).toBe(0);
    const hand = { kind: "tool", tool: "hand" } as const;
    pass(g, map, 2);
    expect(jobDone(g, g.machines.get(3, 3)!)).toBe(false);
    pass(g, map, 1);
    expect(jobDone(g, g.machines.get(3, 3)!)).toBe(true);
    expect(useHeld(g, map, hand, 3, 3).ok).toBe(true);
    expect(g.inventory.count("melon-jam")).toBe(1);
    expect(g.machines.get(3, 3)?.job).toBeUndefined();
  });

  it("count 1,600 machine minutes a day", () => {
    const g = newGame();
    const a = machineMinutes(g);
    sleep(g, [], never);
    expect(machineMinutes(g) - a).toBe(MINUTES_PER_DAY);
  });

  it("take one input at a time and refuse the wrong goods", () => {
    const { g } = withMachine("keg");
    g.inventory.add("daffodil");
    expect(loadMachine(g, 3, 3, "daffodil")).toEqual({
      ok: false,
      reason: "machine will not take that",
    });
    g.inventory.add("tomato", 2);
    expect(loadMachine(g, 3, 3, "tomato").ok).toBe(true);
    expect(g.inventory.count("tomato")).toBe(1);
    expect(loadMachine(g, 3, 3, "tomato")).toEqual({
      ok: false,
      reason: "machine busy",
    });
  });

  it("need 10 wood for the kiln", () => {
    const { g } = withMachine("charcoal-kiln");
    g.inventory.add("wood", 9);
    expect(loadMachine(g, 3, 3, "wood")).toEqual({
      ok: false,
      reason: "not enough input",
    });
    g.inventory.add("wood", 1);
    expect(loadMachine(g, 3, 3, "wood").ok).toBe(true);
    expect(g.inventory.count("wood")).toBe(0);
  });

  it("a working machine is picked up and gives its input back", () => {
    const { g } = withMachine("keg");
    g.inventory.add("tomato");
    loadMachine(g, 3, 3, "tomato");
    expect(g.inventory.count("tomato")).toBe(0);
    expect(handOnMachine(g, 3, 3).ok).toBe(true);
    expect(g.machines.count).toBe(0);
    expect(g.inventory.count("keg")).toBe(1);
    expect(g.inventory.count("tomato")).toBe(1);
  });

  it("gives back both inputs of a two input machine", () => {
    const { g } = withMachine("furnace");
    const ore = ORES[0]!.id;
    g.inventory.add(ore, ORE_PER_BAR);
    g.inventory.add(COAL, COAL_PER_BAR);
    expect(loadMachine(g, 3, 3, ore).ok).toBe(true);
    expect(g.inventory.count(ore)).toBe(0);
    expect(g.inventory.count(COAL)).toBe(0);
    expect(handOnMachine(g, 3, 3).ok).toBe(true);
    expect(g.inventory.count(ore)).toBe(ORE_PER_BAR);
    expect(g.inventory.count(COAL)).toBe(COAL_PER_BAR);
  });

  it("keeps the batch and the machine when the backpack cannot hold them", () => {
    const { g } = withMachine("charcoal-kiln");
    g.inventory.add("wood", 10);
    loadMachine(g, 3, 3, "wood");
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`filler${i}`);
    expect(handOnMachine(g, 3, 3)).toEqual({
      ok: false,
      reason: "backpack full",
    });
    expect(g.machines.count).toBe(1);
    expect(g.machines.get(3, 3)?.job).toBeDefined();
    expect(g.inventory.count("wood")).toBe(0);
  });

  it("an idle machine is picked up by hand", () => {
    const { g, map } = withMachine("keg");
    g.inventory.add("tomato");
    loadMachine(g, 3, 3, "tomato");
    pass(g, map, 7);
    expect(handOnMachine(g, 3, 3).ok).toBe(true);
    expect(handOnMachine(g, 3, 3).ok).toBe(true);
    expect(g.machines.count).toBe(0);
    expect(g.inventory.count("keg")).toBe(1);
  });

  it("a bee house makes honey every four days, and rests in winter", () => {
    const { g, map } = withMachine("bee-house");
    pass(g, map, 3);
    expect(jobDone(g, g.machines.get(3, 3)!)).toBe(false);
    pass(g, map, 1);
    expect(jobDone(g, g.machines.get(3, 3)!)).toBe(true);
    expect(handOnMachine(g, 3, 3).ok).toBe(true);
    expect(g.inventory.count("honey")).toBe(1);
    expect(g.machines.get(3, 3)?.job).toBeDefined();
  });

  it("a bee house keeps its timer in winter but makes no honey", () => {
    const { g, map } = withMachine("bee-house");
    const m = g.machines.get(3, 3)!;
    const before = m.job!.doneAt;
    // Spring is 28 days, so day 29 starts summer; use the winter dates directly.
    g.day.clock.day = 28 * 3 + 1;
    expect(machineMinutes(g)).toBeGreaterThan(before);
    expect(jobDone(g, m)).toBe(false);
    expect(statusText(g, 3, 3)).toBe("The bees rest until spring.");
    expect(m.job!.doneAt).toBe(before);
    g.day.clock.day = 28 * 4 + 1;
    expect(jobDone(g, m)).toBe(true);
    expect(map).toBeDefined();
  });

  it("block digging and sprinklers on their tile", () => {
    const { g, map } = withMachine("keg");
    g.inventory.add("sprinkler");
    const held = { kind: "item", id: "sprinkler", count: 1 } as const;
    expect(useHeld(g, map, held, 3, 3).ok).toBe(false);
    const hoe = { kind: "tool", tool: "hoe" } as const;
    expect(useHeld(g, map, hoe, 3, 3).ok).toBe(false);
    g.inventory.add("keg");
    expect(placeMachine(g, map, 3, 3, "keg").ok).toBe(false);
  });

  it("say how long is left", () => {
    expect(waitText(30)).toBe("under an hour");
    expect(waitText(180)).toBe("about 3 hours");
    expect(waitText(3200)).toBe("about 2 days");
  });

  it("are saved with the game, and an old save loads with none", () => {
    const { g } = withMachine("keg");
    g.inventory.add("tomato");
    loadMachine(g, 3, 3, "tomato");
    const back = deserialize(serialize(g))!;
    expect(back.machines.at(3, 3)).toBe("keg");
    expect(back.machines.get(3, 3)?.job).toEqual(g.machines.get(3, 3)?.job);
    const raw = JSON.parse(serialize(newGame()));
    delete raw.machines;
    expect(deserialize(JSON.stringify(raw))!.machines.count).toBe(0);
    raw.machines = [{ x: 1, y: 1, id: "nope" }, { x: "a" }];
    expect(deserialize(JSON.stringify(raw))!.machines.count).toBe(0);
  });
});

describe("machine recipes and bundles", () => {
  const level = (
    g: ReturnType<typeof newGame>,
    skill: "farming" | "foraging",
    n: number,
  ) => g.skills.gain(skill, LEVEL_XP[n - 1]!);

  it("unlock by skill level", () => {
    const g = newGame();
    const names = () => knownRecipes(g).map((r) => r.id);
    // The two start chests are known from the first day.
    expect(names()).toEqual(["chest", "stone-chest"]);
    level(g, "farming", 4);
    expect(names()).toContain("preserves-jar");
    expect(names()).toContain("bee-house");
    expect(names()).not.toContain("keg");
    level(g, "foraging", 2);
    expect(names()).toContain("charcoal-kiln");
  });

  it("craft a kiln from wood and copper bars", () => {
    const g = newGame();
    level(g, "foraging", 2);
    g.inventory.add("wood", 20);
    g.inventory.add("copper-bar", 2);
    expect(craft(g, "charcoal-kiln")).toBeUndefined();
    expect(g.inventory.count("charcoal-kiln")).toBe(1);
  });

  // A small test hall with its own cut-down pools, so the tests stay quick and fixed.
  const bundles = [
    {
      id: "woodland",
      name: "Woodland",
      room: "foragers-shelf",
      hint: "",
      items: [{ id: "wood", count: 2 }],
      reward: { item: { id: "charcoal-kiln", count: 1 } },
    },
    {
      id: "artisan-goods",
      name: "Artisan Goods",
      room: "foragers-shelf",
      hint: "",
      items: ["jam", "pickles", "honey", "wine"],
      required: 3,
      reward: { item: { id: "keg", count: 1 } },
    },
  ].map(normalizeBundle);

  it("a finished bundle gives its machine and the recipe", () => {
    const g = newGame();
    g.hall = new Hall(bundles, {}, ROOMS);
    g.inventory.add("wood", 2);
    expect(g.hall.handIn(g.inventory, g, "woodland", "wood")).toBe("accepted");
    expect(knownRecipes(g).map((r) => r.id)).not.toContain("charcoal-kiln");
    expect(g.hall.handIn(g.inventory, g, "woodland", "wood")).toBe("completed");
    expect(g.inventory.count("charcoal-kiln")).toBe(1);
    expect(knownRecipes(g).map((r) => r.id)).toContain("charcoal-kiln");
  });

  it("any jam, wine or pickles fills the artisan bundle", () => {
    const g = newGame();
    g.hall = new Hall(bundles, {}, ROOMS);
    g.inventory.add("melon-jam");
    g.inventory.add("parsnip-pickles");
    g.inventory.add("grape-wine@gold");
    g.inventory.add("tomato-jam");
    expect(
      g.hall.problem(g.inventory, "artisan-goods", "melon-jam"),
    ).toBeUndefined();
    g.hall.handIn(g.inventory, g, "artisan-goods", "melon-jam");
    expect(
      g.hall.problem(g.inventory, "artisan-goods", "tomato-jam"),
    ).toBeDefined();
    g.hall.handIn(g.inventory, g, "artisan-goods", "parsnip-pickles");
    expect(
      g.hall.handIn(g.inventory, g, "artisan-goods", "grape-wine@gold"),
    ).toBe("completed");
    expect(g.inventory.count("keg")).toBe(1);
  });
});

describe("crafted furnaces", () => {
  it("are crafted at mining level 4 from 20 copper ore and 25 stone", () => {
    const g = newGame();
    g.inventory.add("copper-ore", 20);
    g.inventory.add("stone", 25);
    expect(craft(g, "furnace")).toBe("recipe not known");
    g.skills.gain("mining", LEVEL_XP[3]!);
    expect(craft(g, "furnace")).toBeUndefined();
    expect(g.inventory.count("furnace")).toBe(1);
    expect(g.inventory.count("copper-ore")).toBe(0);
  });

  it("smelt 5 ore and 1 coal into a bar, in the same time as the smith's", () => {
    const p = processFor("furnace", "iron-ore")!;
    expect(p).toMatchObject({
      use: 5,
      output: "iron-bar",
      minutes: 120,
      also: { item: "coal", use: 1 },
    });
    expect(processFor("furnace", "stone")).toBeUndefined();
    const { g } = withMachine("furnace");
    g.inventory.add("copper-ore", 5);
    expect(loadMachine(g, 3, 3, "copper-ore")).toEqual({
      ok: false,
      reason: "needs 1 coal",
    });
    expect(g.inventory.count("copper-ore")).toBe(5);
    g.inventory.add("coal", 2);
    expect(loadMachine(g, 3, 3, "copper-ore").ok).toBe(true);
    expect(g.inventory.count("copper-ore")).toBe(0);
    expect(g.inventory.count("coal")).toBe(1);
    expect(g.machines.get(3, 3)?.job?.output).toBe("copper-bar");
  });
});
