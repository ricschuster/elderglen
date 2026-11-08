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
    expect(coop.width).toBe(11);
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
    expect(collect(g, a.id)).toEqual({ problem: "No egg there." });
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
    expect(reportLines(r).join(" ")).toMatch(/egg in the coop/);
    expect(animalReportLines(r.animals, true)[0]).toMatch(/finished your coop/);
  });

  it("the coop lands on the sleep that ends its last day", () => {
    const g = newGame();
    g.animals.build = { daysLeft: 1 };
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
      build: undefined,
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
