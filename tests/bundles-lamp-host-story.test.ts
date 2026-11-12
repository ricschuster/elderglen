import { describe, expect, it } from "vitest";
import { BUNDLES, Hall, LAST_ROOM, ROOMS } from "../src/core/bundles";
import { known, recipeById } from "../src/core/crafting";
import { cook } from "../src/core/cooking";
import { dishById } from "../src/core/dishes";
import { hatById, Wardrobe } from "../src/core/hats";
import { Inventory } from "../src/core/inventory";
import { CANDLE, itemById, WAX } from "../src/core/items";
import { collectMachine, placeMachine } from "../src/core/machines";
import { FarmMap, type TiledMapJson } from "../src/core/map";
import { WAX_CHANCE } from "../src/core/processing";
import { newGame } from "../src/core/save";
import { sleep } from "../src/core/sleep";
import { fillBundle } from "./hall-helpers";

const by = (id: string) => BUNDLES.find((b) => b.id === id)!;
const wallet = () => ({ money: 0 });
const openRooms = ROOMS.map((r) => ({ ...r, opensAfter: 0 }));

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

function readyHive() {
  const g = newGame();
  const map = soilMap();
  g.inventory.add("bee-house");
  placeMachine(g, map, 2, 2, "bee-house");
  for (let i = 0; i < 5; i++) sleep(g, [], () => 0.99, map);
  return g;
}

describe("wax and candles", () => {
  it("gives wax from a bee house, by chance, when the honey is taken", () => {
    const g = readyHive();
    expect(collectMachine(g, 2, 2, () => WAX_CHANCE - 0.01).ok).toBe(true);
    expect(g.inventory.count("honey")).toBe(1);
    expect(g.inventory.count(WAX)).toBe(1);
  });

  it("gives no wax on a bad roll", () => {
    const g = readyHive();
    collectMachine(g, 2, 2, () => WAX_CHANCE);
    expect(g.inventory.count("honey")).toBe(1);
    expect(g.inventory.count(WAX)).toBe(0);
  });

  it("makes a candle from wax and fiber, known at farming level 3", () => {
    const r = recipeById("candle")!;
    expect(r.result).toEqual({ item: CANDLE, count: 1 });
    expect(r.ingredients.map((i) => i.item)).toEqual([WAX, "fiber"]);
    expect(itemById(WAX)).toBeDefined();
    expect(known(newGame(), r)).toBe(false);
  });
});

describe("bundle 20, Lamplighter's", () => {
  it("is 2 of 3 and gives the small glow ring", () => {
    const b = by("lamplighters");
    expect(b.room).toBe("hearth");
    expect(b.required).toBe(2);
    expect(b.items.map((i) => `${i.count} ${i.id}`)).toEqual([
      "3 oil-lamp",
      "10 oil",
      "20 candle",
    ]);
    const hall = new Hall(BUNDLES, {}, openRooms);
    const inv = new Inventory(40);
    fillBundle(hall, inv, wallet(), b);
    expect(hall.complete("lamplighters")).toBe(true);
    expect(inv.count("small-glow-ring")).toBe(1);
  });
});

describe("the Host's dishes", () => {
  it("are starter recipes learned at a skill level, with ingredients that exist", () => {
    for (const id of ["bread", "honey-cake", "herb-tea"]) {
      const d = dishById(id)!;
      expect(d.sources[0]!.kind).toBe("level");
      for (const i of d.ingredients)
        expect(itemById(i.item), i.item).toBeDefined();
      expect(itemById(id)?.sellPrice).toBe(d.sellPrice);
    }
  });

  it("is not cooked before its level is reached", () => {
    const g = newGame();
    g.houseTier = 1;
    g.inventory.add("wheat", 2);
    expect(cook(g, "bread")).toBeDefined();
    expect(g.inventory.count("bread")).toBe(0);
  });
});

describe("bundle 24, Host's", () => {
  it("takes the three dishes and lets the player choose 3 of 5 hats", () => {
    const b = by("hosts");
    expect(b.reward.hats?.choose).toBe(3);
    expect(b.reward.hats?.from).toEqual([
      "harvest-crown",
      "snow-cap",
      "holly-hat",
      "seed-wreath",
      "sun-bonnet",
    ]);
    for (const h of b.reward.hats!.from) expect(hatById(h), h).toBeDefined();
    const hall = new Hall(BUNDLES, {}, openRooms);
    const wardrobe = new Wardrobe();
    expect(hall.hatPicksLeft("hosts", wardrobe)).toBe(0);
    expect(hall.claimHat("hosts", "snow-cap", wardrobe)).toBe(false);
    fillBundle(hall, new Inventory(10), wallet(), b);
    expect(hall.complete("hosts")).toBe(true);
    expect(hall.hatPicksLeft("hosts", wardrobe)).toBe(3);
    expect(hall.claimHat("hosts", "snow-cap", wardrobe)).toBe(true);
    expect(hall.claimHat("hosts", "snow-cap", wardrobe)).toBe(false);
    expect(hall.claimHat("hosts", "parade-ribbon", wardrobe)).toBe(false);
    expect(hall.claimHat("hosts", "holly-hat", wardrobe)).toBe(true);
    expect(hall.claimHat("hosts", "sun-bonnet", wardrobe)).toBe(true);
    expect(hall.hatPicksLeft("hosts", wardrobe)).toBe(0);
    expect(hall.claimHat("hosts", "seed-wreath", wardrobe)).toBe(false);
    expect(wardrobe.list()).toEqual(["snow-cap", "holly-hat", "sun-bonnet"]);
  });
});

describe("bundle 26, Storyteller's", () => {
  it("is 3 of 5 old things and a rare herb, and gives the lantern", () => {
    const b = by("storytellers");
    expect(b.required).toBe(3);
    expect(b.items).toHaveLength(5);
    const hall = new Hall(BUNDLES, {}, openRooms);
    const inv = new Inventory(10);
    inv.add("snowcap");
    expect(hall.problem(inv, "storytellers", "snowcap")).toBeUndefined();
    hall.handIn(inv, wallet(), "storytellers", "snowcap");
    for (const id of ["old-seed-packet", "carved-bead"]) {
      inv.add(id);
      hall.handIn(inv, wallet(), "storytellers", id);
    }
    expect(hall.complete("storytellers")).toBe(true);
    expect(inv.count("green-glass-lantern")).toBe(1);
  });
});

describe("the gate", () => {
  it("opens the Last Seat only after every other bundle", () => {
    const seat = ROOMS.find((r) => r.id === LAST_ROOM)!;
    expect(seat.opensAfter).toBe("all");
    const hall = new Hall();
    const inv = new Inventory(40);
    const w = wallet();
    const others = BUNDLES.filter((b) => b.room !== LAST_ROOM);
    for (const b of others.slice(0, -1)) fillBundle(hall, inv, w, b);
    expect(hall.roomOpen(LAST_ROOM)).toBe(false);
    expect(hall.gateRemaining(LAST_ROOM)).toBe(1);
    fillBundle(hall, inv, w, others.at(-1)!);
    expect(hall.roomOpen(LAST_ROOM)).toBe(true);
  });
});
