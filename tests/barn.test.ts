import { describe, expect, it } from "vitest";
import {
  BARN_BUILD_DAYS,
  BARN_CAPACITIES,
  BARN_COST,
  BARN_SITES,
  BARN_SLOTS,
  BARN_UPGRADES,
  COOP_SLOTS,
  GROW_DAYS,
  HATCHES,
  INCUBATE_DAYS,
  MOONWOOL_FRIENDSHIP,
  SPECIES,
  advanceBuilding,
  advanceCoop,
  animalProblem,
  animalReportLines,
  animalSlots,
  animalsIn,
  barnBlocks,
  barnProblem,
  barnUpgradeProblem,
  barnVisibleTier,
  buyAnimal,
  capacityOf,
  collect,
  coopProblem,
  endDay,
  feedAll,
  incubatorProblem,
  letOut,
  letOutProblem,
  loadAnimals,
  orderBarn,
  orderBarnUpgrade,
  orderCoop,
  putEgg,
  speciesOf,
  type Animal,
} from "../src/core/animals";
import { maps, mapFiles } from "../src/content/maps";
import { FarmMap } from "../src/core/map";
import { reportLines } from "../src/core/report";
import { deserialize, newGame, serialize } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { itemById } from "../src/core/items";
import { withQuality } from "../src/core/quality";

/** A barn at a tier, with money and materials. */
function barnGame(tier = 1) {
  const g = newGame();
  g.animals.barnBuilt = true;
  g.animals.barnTier = tier;
  g.money = 200000;
  g.inventory.add("wood", 2000);
  g.inventory.add("stone", 2000);
  return g;
}

/** Make an animal an adult in a good mood, friend and fed. */
function adult(g: ReturnType<typeof newGame>, a: Animal, friendship = 0) {
  a.age = GROW_DAYS;
  a.friendship = friendship;
  a.mood = 200;
  a.petted = true;
  a.fresh = false;
  g.animals.hay = 99;
  feedAll(g);
}

describe("barn building", () => {
  it("costs money, wood and stone, builds in three days and opens overnight", () => {
    const g = newGame();
    g.money = BARN_COST.coin - 1;
    expect(barnProblem(g)).toMatch(/more/);
    g.money = 99999;
    g.inventory.add("wood", BARN_COST.wood);
    g.inventory.add("stone", BARN_COST.stone);
    expect(orderBarn(g)).toBe(true);
    expect(g.money).toBe(99999 - BARN_COST.coin);
    expect(g.animals.barnBuilt).toBe(false);
    for (let i = 1; i < BARN_BUILD_DAYS; i++)
      expect(advanceBuilding(g)).toBeUndefined();
    expect(advanceBuilding(g)).toBe("barn");
    expect(g.animals.barnBuilt).toBe(true);
    expect(g.animals.coopBuilt).toBe(false);
  });

  it("is one job at a time with the coop and the house", () => {
    const g = barnGame();
    g.animals.coopBuilt = true;
    expect(orderBarnUpgrade(g)).toBe(true);
    expect(coopProblem(g)).toMatch(/already/);
    expect(orderCoop(g)).toBe(false);
    expect(barnUpgradeProblem(g)).toMatch(/already working on your barn/);
    // The coop's own advance only reports a coop.
    const h = barnGame();
    h.animals.build = { daysLeft: 1, tier: 2, building: "barn" };
    expect(advanceCoop(h)).toBe(false);
    expect(h.animals.barnTier).toBe(2);
    const k = newGame();
    k.houseBuild = { tier: 1, daysLeft: 2 };
    expect(barnProblem(k)).toMatch(/house/);
  });

  it("upgrades to big and deluxe, never past it, with a footprint that stays", () => {
    const g = barnGame();
    expect(orderBarnUpgrade(g)).toBe(true);
    expect(g.money).toBe(200000 - BARN_UPGRADES[2]!.coin);
    expect(g.animals.barnTier).toBe(1);
    for (let i = 0; i < BARN_BUILD_DAYS; i++) advanceBuilding(g);
    expect(g.animals.barnTier).toBe(2);
    expect(orderBarnUpgrade(g)).toBe(true);
    for (let i = 0; i < BARN_BUILD_DAYS; i++) advanceBuilding(g);
    expect(g.animals.barnTier).toBe(3);
    expect(barnUpgradeProblem(g)).toMatch(/as big/);
    expect(BARN_SITES.farm).toBeDefined();
    expect([1, 2, 3].map((t) => capacityOf("barn", t))).toEqual([4, 8, 12]);
    expect(BARN_CAPACITIES).toEqual([0, 4, 8, 12]);
  });

  it("lands on the sleep that ends its last day, with a report line", () => {
    const g = newGame();
    g.animals.build = { daysLeft: 1, tier: 1, building: "barn" };
    const r = sleep(g, [], () => 0.5);
    expect(r.barnFinished).toBe(true);
    expect(r.coopFinished).toBe(false);
    expect(g.animals.barnBuilt).toBe(true);
    expect(reportLines(r).join(" ")).toMatch(/finished your barn/);
  });

  it("blocks its footprint except the door, and both farms have the site", () => {
    const g = barnGame();
    for (const id of Object.keys(BARN_SITES)) {
      const s = BARN_SITES[id]!;
      const exit = maps.get(id).exits.find((e) => e.id === "barn")!;
      expect({ x: exit.x, y: exit.y }).toEqual({ x: s.x + 3, y: s.y + 3 });
      expect(maps.get(id).entry("from_barn")).toMatchObject({
        x: s.x + 3,
        y: s.y + 4,
      });
      expect(barnBlocks(g, id, s.x, s.y)).toBe(true);
      expect(barnBlocks(g, id, s.x + 3, s.y + 3)).toBe(false);
      expect(barnBlocks(newGame(), id, s.x, s.y)).toBe(false);
    }
  });
});

describe("barn species", () => {
  it("sorts into coop and barn", () => {
    expect(speciesOf("coop")).toEqual(["chicken", "duck", "rabbit"]);
    expect(speciesOf("barn")).toEqual(["cow", "goat", "sheep", "pig"]);
  });

  it("opens species by tier and holds 4, 8 and 12 apart from the coop", () => {
    const g = barnGame();
    expect(animalProblem(g, "goat")).toMatch(/big barn/);
    expect(animalProblem(g, "sheep")).toMatch(/deluxe barn/);
    expect(animalProblem(g, "pig")).toMatch(/deluxe barn/);
    g.animals.coopBuilt = true;
    for (let i = 0; i < 4; i++) expect(buyAnimal(g, "cow", "")).toBeDefined();
    expect(animalProblem(g, "cow")).toMatch(/barn is full/);
    // The coop still has room.
    expect(animalProblem(g, "chicken")).toBeUndefined();
    expect(animalProblem(newGame(), "cow")).toMatch(/barn first/);
    g.animals.barnTier = 3;
    expect(animalProblem(g, "pig")).toBeUndefined();
  });

  it("stands each building's animals on their own slots", () => {
    const g = barnGame(2);
    g.animals.coopBuilt = true;
    buyAnimal(g, "chicken", "a");
    buyAnimal(g, "cow", "b");
    buyAnimal(g, "goat", "c");
    expect(animalSlots(g, "coop").map((s) => s.animal.name)).toEqual(["a"]);
    expect(
      animalSlots(g, "barn").map((s) => [s.animal.name, s.x, s.y]),
    ).toEqual([
      ["b", BARN_SLOTS[0]!.x, BARN_SLOTS[0]!.y],
      ["c", BARN_SLOTS[1]!.x, BARN_SLOTS[1]!.y],
    ]);
    expect(COOP_SLOTS[0]).toBeDefined();
    expect(animalsIn(g, "barn")).toHaveLength(2);
  });

  it("feeds one building at a time", () => {
    const g = barnGame();
    g.animals.coopBuilt = true;
    g.animals.hay = 10;
    buyAnimal(g, "chicken", "a");
    buyAnimal(g, "cow", "b");
    expect(feedAll(g, "barn")).toEqual({ fed: 1, short: 0 });
    expect(g.animals.animals[0]!.fed).toBe(false);
    expect(g.animals.animals[1]!.fed).toBe(true);
  });

  it("makes milk every day and goat milk every second", () => {
    const g = barnGame(2);
    const cow = buyAnimal(g, "cow", "Moo")!;
    const goat = buyAnimal(g, "goat", "Nan")!;
    for (const a of [cow, goat]) adult(g, a);
    endDay(g, () => 0);
    expect(cow.product).toBeDefined();
    expect(goat.product).toBeUndefined();
    expect(collect(g, cow.id)).toMatchObject({
      item: expect.stringMatching(/^milk/),
    });
    for (const a of [cow, goat]) {
      a.petted = true;
      a.fed = true;
    }
    const news = endDay(g, () => 0);
    expect(goat.product).toBeDefined();
    expect(news.barn).toBe(2);
    expect(news.eggs).toBe(0);
    expect(collect(g, goat.id)).toMatchObject({
      item: expect.stringMatching(/^goat-milk/),
    });
    expect(itemById("milk")!.sellPrice).toBeGreaterThan(0);
  });

  it("an unfed cow makes nothing", () => {
    const g = barnGame();
    const cow = buyAnimal(g, "cow", "Moo")!;
    adult(g, cow);
    cow.fed = false;
    endDay(g, () => 0);
    expect(cow.product).toBeUndefined();
  });

  it("sheep make wool every third fed night", () => {
    const g = barnGame(3);
    const sheep = buyAnimal(g, "sheep", "Fleece")!;
    adult(g, sheep);
    for (let i = 0; i < 2; i++) {
      endDay(g, () => 0.99);
      expect(sheep.product).toBeUndefined();
      sheep.petted = true;
      sheep.fed = true;
    }
    endDay(g, () => 0.99);
    expect(sheep.product).toBeDefined();
    expect(sheep.bonus).toBeUndefined();
    expect(collect(g, sheep.id)).toEqual({
      item: expect.stringMatching(/^wool/),
    });
  });

  it("leaves Moonwool beside the wool at 8 hearts, fed and in a good mood", () => {
    const g = barnGame(3);
    const lucky = buyAnimal(g, "sheep", "Lucky")!;
    const young = buyAnimal(g, "sheep", "Young")!;
    const sad = buyAnimal(g, "sheep", "Sad")!;
    for (const a of [lucky, young, sad]) {
      adult(
        g,
        a,
        a === young ? MOONWOOL_FRIENDSHIP - 100 : MOONWOOL_FRIENDSHIP,
      );
      a.lay = 2;
    }
    sad.mood = 60;
    sad.friendship = MOONWOOL_FRIENDSHIP;
    // Every roll is 0.01: under the 5 percent chance.
    endDay(g, () => 0.01);
    expect(lucky.bonus).toBeDefined();
    expect(lucky.product).toBeDefined();
    expect(young.bonus).toBeUndefined();
    // A mood under 70 may still make wool, but never Moonwool.
    expect(sad.product).toBeDefined();
    expect(sad.bonus).toBeUndefined();
    const r = collect(g, lucky.id);
    expect(r).toMatchObject({ also: expect.stringMatching(/^moonwool/) });
    expect(lucky.bonus).toBeUndefined();
    expect(itemById("moonwool")!.sellPrice).toBeGreaterThan(
      itemById("wool")!.sellPrice,
    );
  });

  it("a full pack keeps the Moonwool for later", () => {
    const g = barnGame(3);
    const s = buyAnimal(g, "sheep", "Lucky")!;
    adult(g, s, 1000);
    s.lay = 2;
    endDay(g, () => 0.01);
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add("sap", 999);
    expect(collect(g, s.id)).toMatchObject({
      problem: expect.stringMatching(/full/),
    });
    expect(s.product).toBeDefined();
    expect(s.bonus).toBeDefined();
  });

  it("a pig digs a truffle only on a day it was let out", () => {
    const g = barnGame(3);
    const pig = buyAnimal(g, "pig", "Snout")!;
    adult(g, pig);
    endDay(g, () => 0);
    expect(pig.product).toBeUndefined();
    // Let out, then brought in before night: a truffle.
    pig.petted = true;
    expect(letOut(g, pig.id)).toBe(true);
    pig.outside = false;
    endDay(g, () => 0);
    expect(pig.product).toBeDefined();
    expect(collect(g, pig.id)).toMatchObject({
      item: expect.stringMatching(/^truffle/),
    });
    expect(pig.grazed).toBe(false);
  });

  it("a pig left out overnight finds nothing, and none go out in rain or winter", () => {
    const g = barnGame(3);
    const pig = buyAnimal(g, "pig", "Snout")!;
    adult(g, pig);
    pig.petted = true;
    letOut(g, pig.id);
    endDay(g, () => 0);
    expect(pig.product).toBeUndefined();
    g.weather = "rainy";
    expect(letOutProblem(g, pig.id)).toMatch(/wet/);
    g.weather = "sunny";
    g.day.clock.day = 85;
    expect(letOutProblem(g, pig.id)).toMatch(/winter/);
  });

  it("the deluxe barn's auto-feeder feeds the barn only from the silo", () => {
    const g = barnGame(3);
    g.animals.coopBuilt = true;
    g.animals.hay = 1;
    const cow = buyAnimal(g, "cow", "A")!;
    const goat = buyAnimal(g, "goat", "B")!;
    cow.fresh = false;
    goat.fresh = false;
    cow.petted = goat.petted = true;
    const news = endDay(g, () => 0);
    expect(g.animals.hay).toBe(0);
    expect(news.unfed).toBe(1);
    // A big barn has no feeder.
    const h = barnGame(2);
    h.animals.hay = 5;
    const c = buyAnimal(h, "cow", "A")!;
    c.fresh = false;
    c.petted = true;
    expect(endDay(h, () => 0).unfed).toBe(1);
    expect(h.animals.hay).toBe(5);
  });

  it("reports barn products in the morning", () => {
    const news = {
      eggs: 0,
      barn: 2,
      unfed: 0,
      outside: 0,
      grown: [],
      hatched: [],
      hatchWaiting: false,
    };
    expect(animalReportLines(news, false, false).join(" ")).toMatch(
      /2 things waiting in the barn/,
    );
    expect(animalReportLines(news, false, true)[0]).toMatch(
      /finished your barn/,
    );
  });
});

describe("barn saves", () => {
  it("round trips the barn, its animals and a waiting Moonwool", () => {
    const g = barnGame(3);
    const s = buyAnimal(g, "sheep", "Lucky")!;
    s.product = "gold";
    s.bonus = "silver";
    s.grazed = true;
    buyAnimal(g, "pig", "Snout");
    const back = deserialize(serialize(g))!;
    expect(back.animals).toEqual(g.animals);
    expect(back.animals.barnTier).toBe(3);
  });

  it("keeps a barn build with its building and drops a stale one", () => {
    const g = barnGame(1);
    orderBarnUpgrade(g);
    expect(deserialize(serialize(g))!.animals.build).toEqual({
      daysLeft: 3,
      tier: 2,
      building: "barn",
    });
    const raw = JSON.parse(serialize(barnGame(1)));
    raw.animals.build = { daysLeft: 2, tier: 3, building: "barn" };
    expect(deserialize(JSON.stringify(raw))!.animals.build).toBeUndefined();
  });

  it("drops species the saved tier does not open, and animals of a missing barn", () => {
    const raw = JSON.parse(serialize(barnGame(1)));
    raw.animals.animals = [
      { species: "cow" },
      { species: "pig" },
      { species: "sheep" },
    ];
    const g = deserialize(JSON.stringify(raw))!;
    expect(g.animals.animals.map((a) => a.species)).toEqual(["cow"]);
    raw.animals.barnBuilt = false;
    expect(deserialize(JSON.stringify(raw))!.animals.animals).toEqual([]);
    raw.animals.barnBuilt = true;
    raw.animals.barnTier = 99;
    expect(deserialize(JSON.stringify(raw))!.animals.barnTier).toBe(3);
  });

  it("counts capacity per building on load and defaults everything safely", () => {
    const raw = JSON.parse(serialize(barnGame(1)));
    raw.animals.coopBuilt = true;
    raw.animals.animals = Array.from({ length: 9 }, () => ({ species: "cow" }));
    raw.animals.animals.push({ species: "chicken" });
    const g = deserialize(JSON.stringify(raw))!;
    expect(animalsIn(g, "barn")).toHaveLength(4);
    expect(animalsIn(g, "coop")).toHaveLength(1);
    expect(loadAnimals("junk").barnBuilt).toBe(false);
    expect(loadAnimals({ barnBuilt: "yes" }).barnTier).toBe(1);
  });
});

describe("barn interior growth", () => {
  const json = mapFiles["barn"]!;
  const at = (t: number) => FarmMap.fromTiled(json, barnVisibleTier(t));
  const walkable = (m: FarmMap) => {
    const out = new Set<string>();
    for (let y = 0; y < m.height; y++)
      for (let x = 0; x < m.width; x++)
        if (!m.isBlocked(x, y)) out.add(`${x},${y}`);
    return out;
  };

  it("is 17, 21 and 24 wide with depth 13 and clamps the camera", () => {
    expect(json.height).toBe(13);
    expect([1, 2, 3].map((t) => at(t).bounds)).toEqual([
      { x: 0, y: 0, w: 17, h: 13 },
      { x: 0, y: 0, w: 21, h: 13 },
      { x: 0, y: 0, w: 24, h: 13 },
    ]);
    expect(maps.problems()).toEqual([]);
  });

  it("puts the door at x 8, 10 and 12 and leads to the farm", () => {
    [8, 10, 12].forEach((x, i) => {
      const m = at(i + 1);
      expect(m.entry("door")).toMatchObject({ x, y: 11 });
      const exits = m.exits.filter((e) => e.id === "door");
      expect(exits).toHaveLength(1);
      expect(exits[0]).toMatchObject({
        x,
        y: 12,
        map: "farm",
        entry: "from_barn",
      });
      expect(m.isBlocked(x, 12)).toBe(false);
    });
    // An old door tile closes when the barn grows.
    expect(at(2).isBlocked(8, 12)).toBe(true);
    expect(at(3).isBlocked(10, 12)).toBe(true);
  });

  it("unbuilt space is void and a tier only adds walkable tiles", () => {
    const [a, b, c] = [1, 2, 3].map((t) => walkable(at(t)));
    expect(a!.has("18,5")).toBe(false);
    expect(b!.has("18,5")).toBe(true);
    expect(b!.has("21,5")).toBe(false);
    expect(c!.has("21,5")).toBe(true);
    for (const t of a!) if (!t.endsWith(",12")) expect(b!.has(t)).toBe(true);
    for (const t of b!) if (!t.endsWith(",12")) expect(c!.has(t)).toBe(true);
  });

  it("builds the stall wing in the bottom left at every tier", () => {
    for (const t of [1, 2, 3]) {
      const m = at(t);
      expect(m.isBlocked(2, 10)).toBe(false);
      expect(m.isBlocked(2, 9)).toBe(true);
      expect(m.isBlocked(4, 11)).toBe(true);
      expect(m.isBlocked(4, 10)).toBe(false);
    }
  });

  it("has the bench, and every slot is walkable and off the door lanes", () => {
    for (const t of [1, 2, 3]) {
      const m = at(t);
      expect(m.services.filter((s) => s.kind === "barn-bench")).toHaveLength(6);
      BARN_SLOTS.slice(0, capacityOf("barn", t)).forEach((s) => {
        expect(m.isBlocked(s.x, s.y)).toBe(false);
        expect([8, 10, 12]).not.toContain(s.x);
      });
    }
  });

  it("every species hatches only from its egg", () => {
    expect(Object.keys(HATCHES)).toEqual(["egg", "duck-egg"]);
    expect(SPECIES.cow.building).toBe("barn");
  });
});

describe("incubator", () => {
  function bigCoop() {
    const g = newGame();
    g.animals.coopBuilt = true;
    g.animals.tier = 2;
    g.money = 10000;
    return g;
  }

  it("needs the big coop and an egg", () => {
    const g = newGame();
    g.animals.coopBuilt = true;
    g.inventory.add("egg", 1);
    expect(incubatorProblem(g, "egg")).toMatch(/big coop/);
    const h = bigCoop();
    expect(incubatorProblem(h, "egg")).toMatch(/no such egg/);
    expect(incubatorProblem(h, "wool")).toMatch(/Only eggs/);
  });

  it("takes an egg of any quality, hatches after the nights into a young chicken", () => {
    const g = bigCoop();
    g.inventory.add(withQuality("egg", "silver"), 1);
    expect(putEgg(g, "egg")).toBe(true);
    expect(g.inventory.count(withQuality("egg", "silver"))).toBe(0);
    expect(g.animals.incubator).toEqual({
      egg: "egg",
      daysLeft: INCUBATE_DAYS,
    });
    expect(incubatorProblem(g, "egg")).toMatch(/already full/);
    for (let i = 0; i < INCUBATE_DAYS - 1; i++) {
      expect(endDay(g, () => 0).hatched).toEqual([]);
    }
    const news = endDay(g, () => 0);
    expect(news.hatched).toHaveLength(1);
    expect(g.animals.incubator).toBeUndefined();
    const chick = g.animals.animals[0]!;
    expect(chick.species).toBe("chicken");
    expect(chick.age).toBe(0);
    expect(chick.fresh).toBe(true);
    expect(animalReportLines(news, false)[0]).toMatch(/hatched in the coop/);
  });

  it("hatches a duck from a duck egg", () => {
    const g = bigCoop();
    g.inventory.add("duck-egg", 1);
    putEgg(g, "duck-egg");
    for (let i = 0; i < INCUBATE_DAYS; i++) endDay(g, () => 0);
    expect(g.animals.animals[0]!.species).toBe("duck");
  });

  it("will not start with a full coop, and waits if it fills while hatching", () => {
    const g = bigCoop();
    g.inventory.add("egg", 2);
    putEgg(g, "egg");
    for (let i = 0; i < 8; i++) buyAnimal(g, "chicken", "");
    for (let i = 0; i < INCUBATE_DAYS; i++) endDay(g, () => 0);
    expect(g.animals.animals).toHaveLength(8);
    expect(g.animals.incubator).toEqual({ egg: "egg", daysLeft: 0 });
    const news = endDay(g, () => 0);
    expect(news.hatchWaiting).toBe(true);
    expect(animalReportLines(news, false).join(" ")).toMatch(/coop is full/);
    // Another egg is refused while the full coop has no room.
    expect(incubatorProblem(g, "egg")).toMatch(/already full|full/);
  });

  it("saves the incubator and drops it without the big coop", () => {
    const g = bigCoop();
    g.inventory.add("egg", 1);
    putEgg(g, "egg");
    expect(deserialize(serialize(g))!.animals.incubator).toEqual(
      g.animals.incubator,
    );
    const raw = JSON.parse(serialize(g));
    raw.animals.tier = 1;
    expect(deserialize(JSON.stringify(raw))!.animals.incubator).toBeUndefined();
    raw.animals.tier = 2;
    raw.animals.incubator = { egg: "wool", daysLeft: 3 };
    expect(deserialize(JSON.stringify(raw))!.animals.incubator).toBeUndefined();
    raw.animals.incubator = { egg: "egg", daysLeft: 999 };
    expect(deserialize(JSON.stringify(raw))!.animals.incubator!.daysLeft).toBe(
      INCUBATE_DAYS,
    );
  });
});
