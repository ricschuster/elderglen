import { describe, expect, it } from "vitest";
import { clearWeed } from "../src/core/actions";
import {
  CHICKEN_PRICE,
  COOP_BUILD_DAYS,
  COOP_CAPACITY,
  COOP_COST,
  COOP_SITES,
  GROW_DAYS,
  SILO_CAPACITY,
  addHay,
  advanceCoop,
  animalReportLines,
  bringIn,
  buyChick,
  buyHay,
  chickProblem,
  collect,
  coopBlocks,
  endDay,
  feedAll,
  hearts,
  letOut,
  letOutProblem,
  orderCoop,
  pet,
  rename,
} from "../src/core/animals";
import {
  COOP_SLOTS,
  COOP_UPGRADES,
  FEATHER,
  FEATHER_FRIENDSHIP,
  SPECIES,
  animalProblem,
  buyAnimal,
  coopCapacity,
  coopUpgradeProblem,
  coopVisibleTier,
  orderCoopUpgrade,
} from "../src/core/animals";
import { FarmMap } from "../src/core/map";
import { mapFiles } from "../src/content/maps";
import { animalQuality } from "../src/core/quality";
import { deserialize, newGame, serialize } from "../src/core/save";
import { maps } from "../src/content/maps";
import { orderProblem as houseProblem } from "../src/core/house";
import { sleep } from "../src/core/sleep";
import { reportLines } from "../src/core/report";

/** A game with a built coop and money. */
function coopGame() {
  const g = newGame();
  g.animals.coopBuilt = true;
  g.money = 10000;
  return g;
}

function withChick() {
  const g = coopGame();
  const a = buyChick(g, "Pip")!;
  return { g, a };
}

/** Grow a chick to adult by feeding it through the nights. */
function grow(g: ReturnType<typeof newGame>) {
  for (let i = 0; i <= GROW_DAYS; i++) {
    addHay(g, 5);
    feedAll(g);
    pet(g, g.animals.animals[0]!.id);
    endDay(g, () => 0);
  }
}

describe("coop building", () => {
  it("needs money, wood and stone, then builds in days", () => {
    const g = newGame();
    g.money = COOP_COST.coin;
    expect(orderCoop(g)).toBe(false);
    g.inventory.add("wood", COOP_COST.wood);
    g.inventory.add("stone", COOP_COST.stone);
    expect(orderCoop(g)).toBe(true);
    expect(g.money).toBe(0);
    expect(g.inventory.count("wood")).toBe(0);
    for (let i = 1; i < COOP_BUILD_DAYS; i++)
      expect(advanceCoop(g)).toBe(false);
    expect(advanceCoop(g)).toBe(true);
    expect(g.animals.coopBuilt).toBe(true);
  });

  it("is one order at a time with the house", () => {
    const g = newGame();
    g.money = 999999;
    g.inventory.add("wood", 999);
    g.inventory.add("stone", 999);
    orderCoop(g);
    expect(houseProblem(g)).toMatch(/coop/);
    expect(orderCoop(g)).toBe(false);
  });

  it("blocks the footprint except the door, and both farm maps have the site", () => {
    const g = coopGame();
    for (const id of Object.keys(COOP_SITES)) {
      const s = COOP_SITES[id]!;
      const exit = maps.get(id).exits.find((e) => e.id === "coop")!;
      expect({ x: exit.x, y: exit.y }).toEqual({ x: s.x + 1, y: s.y + 2 });
      expect(maps.get(id).entry("from_coop")).toMatchObject({
        x: s.x + 1,
        y: s.y + 3,
      });
      expect(coopBlocks(g, id, s.x, s.y)).toBe(true);
      expect(coopBlocks(g, id, s.x + 1, s.y + 2)).toBe(false);
      expect(coopBlocks(newGame(), id, s.x, s.y)).toBe(false);
    }
  });

  it("has an interior that joins the farm and a bench", () => {
    const coop = maps.get("coop");
    expect(coop.width).toBe(22);
    expect(coop.height).toBe(8);
    expect(coop.exits[0]).toMatchObject({ map: "farm", entry: "from_coop" });
    expect(coop.exits[0]!.x).toBe(1);
    expect(coop.services.some((s) => s.kind === "coop-bench")).toBe(true);
    expect(maps.problems()).toEqual([]);
  });
});

describe("buying and care", () => {
  it("sells a young chick only with a coop, room and money", () => {
    expect(chickProblem(newGame())).toMatch(/coop/);
    const g = coopGame();
    g.money = CHICKEN_PRICE - 1;
    expect(buyChick(g, "x")).toBeUndefined();
    g.money = 100000;
    for (let i = 0; i < COOP_CAPACITY; i++)
      expect(buyChick(g, "")).toBeDefined();
    expect(chickProblem(g)).toMatch(/full/);
    expect(g.animals.animals[0]!.name).not.toBe("");
  });

  it("names and renames", () => {
    const { g, a } = withChick();
    expect(a.name).toBe("Pip");
    expect(rename(g, a.id, "  Dot  ")).toBe(true);
    expect(a.name).toBe("Dot");
    expect(rename(g, a.id, "   ")).toBe(false);
  });

  it("feeds from the silo and reports a short silo", () => {
    const { g } = withChick();
    buyChick(g, "B");
    addHay(g, 1);
    expect(feedAll(g)).toEqual({ fed: 1, short: 1 });
    expect(g.animals.hay).toBe(0);
    expect(feedAll(g)).toEqual({ fed: 0, short: 1 });
  });

  it("fills the silo from cut weeds only once a coop stands, and holds a cap", () => {
    const g = newGame();
    g.weeds.add(1, 1);
    clearWeed(g, 1, 1, "hoe", () => 0.99);
    expect(g.animals.hay).toBe(0);
    g.animals.coopBuilt = true;
    g.weeds.add(2, 2);
    clearWeed(g, 2, 2, "hoe", () => 0.99);
    expect(g.animals.hay).toBeGreaterThan(0);
    addHay(g, 9999);
    expect(g.animals.hay).toBe(SILO_CAPACITY);
    g.money = 9999;
    expect(buyHay(g, 10)).toBe(0);
  });

  it("buys backstop hay with money", () => {
    const g = coopGame();
    g.money = 120;
    expect(buyHay(g, 10)).toBe(2);
    expect(g.money).toBe(20);
    expect(g.animals.hay).toBe(2);
  });

  it("pets once a day for friendship and mood", () => {
    const { g, a } = withChick();
    expect(pet(g, a.id)).toBe(true);
    expect(a.friendship).toBe(15);
    expect(a.mood).toBeGreaterThan(128);
    expect(pet(g, a.id)).toBe(false);
  });

  it("lets out onto grass on a clear day, never in rain or winter", () => {
    const { g, a } = withChick();
    expect(letOut(g, a.id)).toBe(true);
    expect(a.fed).toBe(true);
    expect(a.mood).toBe(255);
    expect(bringIn(g, a.id)).toBe(true);
    g.weather = "rainy";
    expect(letOutProblem(g, a.id)).toMatch(/wet/);
    g.weather = "sunny";
    g.day.clock.day = 85;
    expect(letOutProblem(g, a.id)).toMatch(/winter/);
  });
});

describe("the night", () => {
  it("a new chick needs nothing the first night, then grows only if fed", () => {
    const { g, a } = withChick();
    const news = endDay(g, () => 0);
    expect(news.unfed).toBe(0);
    expect(a.age).toBe(1);
    expect(a.friendship).toBe(0);
    endDay(g, () => 0);
    expect(a.age).toBe(1);
    expect(a.friendship).toBe(0);
  });

  it("an unfed animal makes nothing and loses friendship and mood", () => {
    const { g, a } = withChick();
    grow(g);
    a.product = undefined;
    a.friendship = 100;
    a.mood = 200;
    pet(g, a.id);
    const news = endDay(g, () => 0);
    expect(a.product).toBeUndefined();
    expect(news.unfed).toBe(1);
    expect(a.mood).toBe(Math.max(200 + 32 - 100, 0));
    expect(a.friendship).toBe(100 + 15 - 20);
  });

  it("neglect costs only potential: no animal dies, leaves or costs gold (tone rules, #135)", () => {
    const { g } = withChick();
    grow(g);
    const gold = g.money;
    for (let i = 0; i < 60; i++) endDay(g, () => 0.5);
    expect(g.animals.animals).toHaveLength(1);
    expect(g.money).toBe(gold);
    const a = g.animals.animals[0]!;
    expect(a.mood).toBeGreaterThanOrEqual(0);
    expect(a.friendship).toBeGreaterThanOrEqual(0);
  });

  it("a grown, fed, petted hen lays an egg a day, which waits until collected", () => {
    const { g, a } = withChick();
    grow(g);
    expect(a.product).toBeDefined();
    const first = a.product;
    addHay(g, 1);
    feedAll(g);
    endDay(g, () => 0);
    expect(a.product).toBe(first);
    const r = collect(g, a.id);
    expect("item" in r && r.item.startsWith("egg")).toBe(true);
    expect(a.product).toBeUndefined();
    expect(collect(g, a.id)).toEqual({ problem: "Nothing to take there." });
  });

  it("collecting needs pack room", () => {
    const { g, a } = withChick();
    grow(g);
    for (let i = 0; i < g.inventory.size; i++) g.inventory.add(`junk${i}`);
    const full = collect(g, a.id);
    expect("problem" in full).toBe(true);
    expect(a.product).toBeDefined();
  });

  it("low mood lays only some of the time", () => {
    const { g, a } = withChick();
    grow(g);
    a.product = undefined;
    a.mood = 35;
    a.petted = true;
    a.fed = true;
    endDay(g, () => 0.9);
    expect(a.product).toBeUndefined();
    a.mood = 35;
    a.petted = true;
    a.fed = true;
    endDay(g, () => 0.1);
    expect(a.product).toBeDefined();
  });

  it("outside at night costs mood and the egg only, nothing else", () => {
    const { g, a } = withChick();
    grow(g);
    a.product = undefined;
    a.friendship = 500;
    letOut(g, a.id);
    pet(g, a.id);
    const before = a.friendship;
    const news = endDay(g, () => 0);
    expect(news.outside).toBe(1);
    expect(a.product).toBeUndefined();
    expect(a.friendship).toBe(before);
    expect(a.mood).toBeLessThan(255);
    expect(a.mood).toBeGreaterThan(0);
    expect(a.outside).toBe(false);
    expect(g.animals.animals).toHaveLength(1);
  });

  it("friendship and mood stay in range", () => {
    const { g, a } = withChick();
    a.friendship = 5;
    a.mood = 5;
    for (let i = 0; i < 3; i++) endDay(g, () => 0);
    expect(a.friendship).toBe(0);
    expect(a.mood).toBe(0);
    a.friendship = 1000;
    for (let i = 0; i < 5; i++) {
      pet(g, a.id);
      a.petted = false;
    }
    expect(a.friendship).toBe(1000);
    expect(hearts(a)).toBe(5);
  });

  it("quality follows friendship and mood, normal below 150 mood", () => {
    expect(animalQuality(1000, 255)).toBe("gold");
    expect(animalQuality(700, 200)).toBe("silver");
    expect(animalQuality(1000, 140)).toBe("normal");
    expect(animalQuality(0, 255)).toBe("normal");
  });

  it("runs in the day end and shows in the morning report", () => {
    const { g } = withChick();
    g.animals.animals[0]!.age = GROW_DAYS;
    addHay(g, 1);
    feedAll(g);
    const r = sleep(g, [], () => 0);
    expect(r.animals.eggs).toBe(1);
    expect(reportLines(r).join(" ")).toMatch(/waiting in the coop/);
    expect(animalReportLines(r.animals, true)[0]).toMatch(/finished your coop/);
  });

  it("the coop lands on the sleep that ends its last day", () => {
    const g = newGame();
    g.animals.build = { daysLeft: 1, tier: 1, building: "coop" };
    const r = sleep(g, [], () => 0.5);
    expect(r.coopFinished).toBe(true);
    expect(g.animals.coopBuilt).toBe(true);
  });
});

describe("saves", () => {
  it("round trip animals", () => {
    const { g, a } = withChick();
    grow(g);
    a.name = "Hazel";
    addHay(g, 7);
    const back = deserialize(serialize(g))!;
    expect(back.animals).toEqual(g.animals);
    expect(back.animals.animals[0]!.name).toBe("Hazel");
  });

  it("old saves load with no coop", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.animals;
    const g = deserialize(JSON.stringify(raw))!;
    expect(g.animals).toEqual({
      coopBuilt: false,
      tier: 1,
      barnBuilt: false,
      barnTier: 1,
      build: undefined,
      incubator: undefined,
      animals: [],
      hay: 0,
      nextId: 1,
    });
  });

  it("repairs bad animal fields", () => {
    const raw = JSON.parse(serialize(coopGame()));
    raw.animals = {
      coopBuilt: true,
      hay: 99999,
      animals: [
        { species: "dragon" },
        { species: "chicken", name: "", friendship: 5000, mood: -4, age: "x" },
      ],
    };
    const g = deserialize(JSON.stringify(raw))!;
    expect(g.animals.hay).toBe(SILO_CAPACITY);
    expect(g.animals.animals).toHaveLength(1);
    const a = g.animals.animals[0]!;
    expect(a.friendship).toBe(1000);
    expect(a.mood).toBe(0);
    expect(a.name).not.toBe("");
  });
});

/** A coop at a tier with money and materials. */
function tierGame(tier: number) {
  const g = coopGame();
  g.animals.tier = tier;
  g.money = 100000;
  g.inventory.add("wood", 2000);
  g.inventory.add("stone", 2000);
  return g;
}

describe("coop tiers", () => {
  it("capacity is 4, 8 and 12", () => {
    expect([1, 2, 3].map(coopCapacity)).toEqual([4, 8, 12]);
    expect(coopCapacity(9)).toBe(12);
  });

  it("an upgrade costs, takes three days, lands overnight and keeps the footprint", () => {
    const g = tierGame(1);
    expect(orderCoopUpgrade(g)).toBe(true);
    expect(g.money).toBe(100000 - COOP_UPGRADES[2]!.coin);
    expect(g.animals.tier).toBe(1);
    expect(g.animals.build).toEqual({
      daysLeft: COOP_BUILD_DAYS,
      tier: 2,
      building: "coop",
    });
    for (let i = 0; i < COOP_BUILD_DAYS - 1; i++) {
      expect(advanceCoop(g)).toBe(false);
      expect(g.animals.tier).toBe(1);
    }
    expect(advanceCoop(g)).toBe(true);
    expect(g.animals.tier).toBe(2);
    expect(g.animals.build).toBeUndefined();
    g.animals.tier = 3;
    expect(coopUpgradeProblem(g)).toMatch(/as big/);
    // The outside footprint is a constant, never per tier.
    expect(COOP_SITES.farm).toBeDefined();
  });

  it("one job at a time with the house and the coop", () => {
    const g = tierGame(1);
    g.houseBuild = { tier: 1, daysLeft: 2 };
    expect(coopUpgradeProblem(g)).toMatch(/house/);
    g.houseBuild = undefined;
    orderCoopUpgrade(g);
    expect(coopUpgradeProblem(g)).toMatch(/already/);
    expect(houseProblem(g)).toMatch(/coop/);
  });

  it("needs money and materials, and a coop", () => {
    expect(coopUpgradeProblem(newGame())).toMatch(/coop first/);
    const g = coopGame();
    expect(coopUpgradeProblem(g)).toMatch(/more/);
    expect(orderCoopUpgrade(g)).toBe(false);
  });

  it("species are gated by tier and capacity", () => {
    const g = tierGame(1);
    expect(animalProblem(g, "duck")).toMatch(/big coop/);
    expect(buyAnimal(g, "duck", "")).toBeUndefined();
    g.animals.tier = 2;
    expect(animalProblem(g, "duck")).toBeUndefined();
    expect(animalProblem(g, "rabbit")).toMatch(/deluxe/);
    for (let i = 0; i < 8; i++) buyAnimal(g, "duck", "");
    expect(g.animals.animals).toHaveLength(8);
    expect(animalProblem(g, "duck")).toMatch(/full/);
    g.animals.tier = 3;
    expect(buyAnimal(g, "rabbit", "Bun")!.species).toBe("rabbit");
    expect(g.money).toBe(
      100000 - 8 * SPECIES.duck.price - SPECIES.rabbit.price,
    );
  });

  it("a duck lays every second fed night, a rabbit every fourth", () => {
    const g = tierGame(3);
    const d = buyAnimal(g, "duck", "D")!;
    const r = buyAnimal(g, "rabbit", "R")!;
    d.age = GROW_DAYS;
    r.age = GROW_DAYS;
    const laid: [boolean, boolean][] = [];
    for (let i = 0; i < 4; i++) {
      d.product = undefined;
      r.product = undefined;
      addHay(g, 10);
      pet(g, d.id);
      pet(g, r.id);
      feedAll(g);
      d.fresh = false;
      r.fresh = false;
      endDay(g, () => 0.99);
      laid.push([d.product !== undefined, r.product !== undefined]);
    }
    expect(laid).toEqual([
      [false, false],
      [true, false],
      [false, false],
      [true, true],
    ]);
    expect(collect(g, r.id)).toEqual({ item: "wool" });
    expect(collect(g, d.id)).toEqual({ item: "duck-egg" });
  });

  it("a duck leaves a feather at high friendship only", () => {
    const g = tierGame(2);
    const d = buyAnimal(g, "duck", "D")!;
    d.age = GROW_DAYS;
    d.lay = 1;
    d.friendship = FEATHER_FRIENDSHIP;
    d.mood = 255;
    d.petted = true;
    d.fed = true;
    d.fresh = false;
    endDay(g, () => 0);
    expect(d.item).toBe(FEATHER);
    expect(collect(g, d.id)).toMatchObject({
      item: expect.stringContaining("feather"),
    });
    d.lay = 1;
    d.friendship = 100;
    d.petted = true;
    d.fed = true;
    endDay(g, () => 0);
    expect(d.item).toBeUndefined();
  });

  it("a night outside loses a duck's day", () => {
    const g = tierGame(2);
    const d = buyAnimal(g, "duck", "D")!;
    d.age = GROW_DAYS;
    d.fresh = false;
    d.lay = 1;
    d.fed = true;
    d.outside = true;
    endDay(g, () => 0);
    expect(d.product).toBeUndefined();
    expect(d.lay).toBe(0);
  });

  it("the deluxe auto-feeder feeds animals inside from the silo", () => {
    for (const [tier, ate] of [
      [2, false],
      [3, true],
    ] as const) {
      const g = tierGame(tier);
      const c = buyAnimal(g, "chicken", "C")!;
      c.age = GROW_DAYS;
      c.fresh = false;
      c.petted = true;
      addHay(g, 5);
      const news = endDay(g, () => 0);
      expect(news.unfed).toBe(ate ? 0 : 1);
      expect(g.animals.hay).toBe(ate ? 4 : 5);
    }
  });

  it("saves keep tier, build and species, and drop what the tier does not open", () => {
    const g = tierGame(3);
    buyAnimal(g, "rabbit", "Bun");
    buyAnimal(g, "duck", "Quack");
    const back = deserialize(serialize(g))!;
    expect(back.animals).toEqual(g.animals);
    const up = tierGame(1);
    orderCoopUpgrade(up);
    expect(deserialize(serialize(up))!.animals.build).toEqual({
      daysLeft: 3,
      tier: 2,
      building: "coop",
    });
    const raw = JSON.parse(serialize(tierGame(1)));
    raw.animals.animals = [
      { species: "rabbit" },
      { species: "duck" },
      { species: "chicken" },
    ];
    raw.animals.build = { daysLeft: 2, tier: 3 };
    const fixed = deserialize(JSON.stringify(raw))!;
    expect(fixed.animals.animals.map((a) => a.species)).toEqual(["chicken"]);
    expect(fixed.animals.build).toBeUndefined();
    raw.animals.tier = 99;
    expect(deserialize(JSON.stringify(raw))!.animals.tier).toBe(3);
  });

  it("an old save with a coop in the build has tier 1 and builds it", () => {
    const raw = JSON.parse(serialize(newGame()));
    raw.animals = { coopBuilt: false, build: { daysLeft: 2 }, animals: [] };
    const g = deserialize(JSON.stringify(raw))!;
    expect(g.animals.build).toEqual({
      daysLeft: 2,
      tier: 1,
      building: "coop",
    });
    expect(g.animals.tier).toBe(1);
  });
});

describe("coop interior growth", () => {
  const json = mapFiles["coop"]!;
  const at = (t: number) => FarmMap.fromTiled(json, coopVisibleTier(t));
  const walkable = (m: FarmMap) => {
    const out = new Set<string>();
    for (let y = 0; y < m.height; y++)
      for (let x = 0; x < m.width; x++)
        if (!m.isBlocked(x, y)) out.add(`${x},${y}`);
    return out;
  };

  it("is 11, 15 and 22 wide with depth 8 and clamps the camera", () => {
    expect(json.height).toBe(8);
    expect([1, 2, 3].map((t) => at(t).bounds)).toEqual([
      { x: 0, y: 0, w: 11, h: 8 },
      { x: 0, y: 0, w: 15, h: 8 },
      { x: 0, y: 0, w: 22, h: 8 },
    ]);
  });

  it("unbuilt space is void and a tier only adds walkable tiles", () => {
    const [a, b, c] = [1, 2, 3].map((t) => walkable(at(t)));
    expect(a!.has("12,4")).toBe(false);
    expect(b!.has("12,4")).toBe(true);
    expect(b!.has("17,4")).toBe(false);
    expect(c!.has("17,4")).toBe(true);
    for (const t of a!) expect(b!.has(t)).toBe(true);
    for (const t of b!) expect(c!.has(t)).toBe(true);
  });

  it("the door and bench keep their tiles, and every slot is walkable at its tier", () => {
    for (const t of [1, 2, 3]) {
      const m = at(t);
      expect(m.entry("door")).toMatchObject({ x: 1, y: 6 });
      expect(m.services.filter((s) => s.kind === "coop-bench")).toHaveLength(4);
      COOP_SLOTS.slice(0, coopCapacity(t)).forEach((s) =>
        expect(m.isBlocked(s.x, s.y)).toBe(false),
      );
    }
  });
});
