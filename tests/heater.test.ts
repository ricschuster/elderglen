import { describe, expect, it } from "vitest";
import {
  START_MOOD,
  WINTER_COLD_MOOD,
  buyChick,
  endDay,
  feedAll,
  hasHeater,
  heaterProblem,
  loadAnimals,
  pet,
  placeHeater,
  addHay as putInSilo,
  saveAnimals,
} from "../src/core/animals";
import { COOP_HEATER } from "../src/core/items";
import { newGame } from "../src/core/save";

function chickGame(day: number) {
  const g = newGame();
  g.animals.coopBuilt = true;
  g.money = 1000;
  g.day.clock.day = day;
  const a = buyChick(g, "Pip")!;
  return { g, a };
}

/** One fed, petted night, so only the cold can change the mood. */
function night(g: ReturnType<typeof newGame>) {
  g.animals.silo = true;
  putInSilo(g, 5);
  feedAll(g);
  pet(g, g.animals.animals[0]!.id);
  endDay(g, () => 0);
}

describe("coop and barn heater", () => {
  it("winter without a heater lowers mood a little, never harms", () => {
    const winter = chickGame(85);
    const summer = chickGame(30);
    night(winter.g);
    night(summer.g);
    const w = winter.g.animals.animals[0]!;
    const s = summer.g.animals.animals[0]!;
    expect(s.mood - w.mood).toBe(-WINTER_COLD_MOOD);
    expect(w.mood).toBeGreaterThan(0);
    expect(START_MOOD).toBeGreaterThan(0);
  });

  it("a placed heater removes the loss and uses up the item", () => {
    const { g } = chickGame(85);
    expect(heaterProblem(g, "coop")).toMatch(/no heater/);
    g.inventory.add(COOP_HEATER, 1);
    expect(placeHeater(g, "coop")).toBe(true);
    expect(hasHeater(g.animals, "coop")).toBe(true);
    expect(g.inventory.count(COOP_HEATER)).toBe(0);
    expect(heaterProblem(g, "coop")).toMatch(/already/);
    const summer = chickGame(30);
    night(g);
    night(summer.g);
    expect(g.animals.animals[0]!.mood).toBe(summer.g.animals.animals[0]!.mood);
  });

  it("refuses a building that is not built and the stable", () => {
    const g = newGame();
    g.inventory.add(COOP_HEATER, 1);
    expect(placeHeater(g, "barn")).toBe(false);
    expect(placeHeater(g, "stable")).toBe(false);
  });

  it("round trips and an old save has none", () => {
    const { g } = chickGame(85);
    g.inventory.add(COOP_HEATER, 1);
    placeHeater(g, "coop");
    const back = loadAnimals(
      JSON.parse(JSON.stringify(saveAnimals(g.animals))),
    );
    expect(back.heaters).toEqual({ coop: true, barn: false });
    expect(loadAnimals({}).heaters).toEqual({ coop: false, barn: false });
  });
});
