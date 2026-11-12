import { describe, expect, it } from "vitest";
import { maps } from "../src/content/maps";
import { RECIPES } from "../src/core/crafting";
import {
  BATTERY_PACK,
  chargeRods,
  LIGHTNING_ROD,
  packWaiting,
  pickUpRod,
  placeRod,
  rodAt,
  rodsOf,
  rollStrikes,
  takePack,
} from "../src/core/lightning";
import { START } from "../src/core/maps";
import { mayPlaceOn } from "../src/core/placeables";
import { deserialize, newGame, serialize } from "../src/core/save";

const farm = maps.get(START.map);
const [a, b] = farm.tillableTiles();

function stormGame(rods: { x: number; y: number }[]) {
  const g = newGame();
  g.inventory.add(LIGHTNING_ROD, rods.length);
  for (const r of rods) placeRod(g, farm, "farm", r.x, r.y);
  g.weather = "stormy";
  return g;
}

describe("placing the lightning rod", () => {
  it("stands on clear farm ground, lifts back, and not indoors", () => {
    const g = newGame();
    g.inventory.add(LIGHTNING_ROD, 2);
    expect(placeRod(g, farm, "farm", a!.x, a!.y).ok).toBe(true);
    expect(g.inventory.count(LIGHTNING_ROD)).toBe(1);
    expect(g.placed.get("farm", a!.x, a!.y)?.id).toBe(LIGHTNING_ROD);
    expect(placeRod(g, farm, "farm", a!.x, a!.y).ok).toBe(false);
    expect(placeRod(newGame(), farm, "farm", b!.x, b!.y).ok).toBe(false);
    expect(mayPlaceOn(LIGHTNING_ROD, "greenhouse")).toBe(false);
    expect(mayPlaceOn(LIGHTNING_ROD, "house")).toBe(false);
    expect(pickUpRod(g, a!.x, a!.y).ok).toBe(true);
    expect(g.inventory.count(LIGHTNING_ROD)).toBe(2);
    expect(rodAt(g, a!.x, a!.y)).toBeUndefined();
  });

  it("has a recipe at Foraging 6 from the note 34 ingredients", () => {
    const r = RECIPES.find((x) => x.id === LIGHTNING_ROD);
    expect(r?.ingredients.map((i) => i.item).sort()).toEqual([
      "bat-wing",
      "iron-bar",
      "quartz-crystal",
    ]);
  });
});

describe("storms and packs", () => {
  it("only strikes in a storm, and a single rod catches the first strike", () => {
    const g = stormGame([a!]);
    g.weather = "rainy";
    expect(rollStrikes(g, 840, () => 0).strikes).toBe(0);
    g.weather = "stormy";
    expect(rollStrikes(g, 100, () => 0)).toEqual({
      strikes: 10,
      caught: 1,
      hits: [{ x: a!.x, y: a!.y }],
    });
  });

  it("makes a pack the next morning that waits for Action", () => {
    const g = stormGame([a!]);
    rollStrikes(g, 10, () => 0);
    expect(packWaiting(g, a!.x, a!.y)).toBe(false);
    expect(chargeRods(g)).toBe(1);
    expect(g.inventory.count(BATTERY_PACK)).toBe(0);
    expect(packWaiting(g, a!.x, a!.y)).toBe(true);
    expect(takePack(g, a!.x, a!.y).ok).toBe(true);
    expect(g.inventory.count(BATTERY_PACK)).toBe(1);
    expect(takePack(g, a!.x, a!.y).ok).toBe(false);
  });

  it("makes only the one pack if it waits a second storm day", () => {
    const g = stormGame([a!]);
    rollStrikes(g, 10, () => 0);
    chargeRods(g);
    rollStrikes(g, 10, () => 0);
    expect(chargeRods(g)).toBe(0);
    takePack(g, a!.x, a!.y);
    expect(g.inventory.count(BATTERY_PACK)).toBe(1);
    expect(takePack(g, a!.x, a!.y).ok).toBe(false);
  });

  it("ignores a second strike on a spent rod and gives the pack back when lifted", () => {
    const g = stormGame([a!]);
    rollStrikes(g, 10, () => 0);
    expect(rollStrikes(g, 10, () => 0).caught).toBe(0);
    chargeRods(g);
    expect(pickUpRod(g, a!.x, a!.y).ok).toBe(true);
    expect(g.inventory.count(BATTERY_PACK)).toBe(1);
  });

  it("counts every rod when weighing the catch", () => {
    const g = stormGame([a!, b!]);
    rollStrikes(g, 10, () => 0);
    expect(rodsOf(g)).toHaveLength(2);
    // One of two is spent, so a second strike is caught only below 0.75.
    const seq = [0, 0.8];
    expect(rollStrikes(g, 10, () => seq.shift() ?? 0).caught).toBe(0);
  });
});

describe("saving rods", () => {
  it("round-trips a struck rod and a waiting pack through the placed list", () => {
    const g = stormGame([a!, b!]);
    rollStrikes(g, 10, () => 0);
    chargeRods(g);
    const back = deserialize(serialize(g))!;
    expect(rodsOf(back)).toHaveLength(2);
    expect(packWaiting(back, a!.x, a!.y) || packWaiting(back, b!.x, b!.y)).toBe(
      true,
    );
  });

  it("reads the older `rods` list of an old save into the store", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.placed;
    raw.rods = [
      { x: 4, y: 5, hit: true },
      { x: 6, y: 7, hit: false },
    ];
    const back = deserialize(JSON.stringify(raw))!;
    expect(rodAt(back, 4, 5)?.state).toEqual({ hit: true, pack: false });
    expect(rodAt(back, 6, 7)).toBeDefined();
    expect(chargeRods(back)).toBe(1);
    expect(packWaiting(back, 4, 5)).toBe(true);
  });
});
