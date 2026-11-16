import { describe, expect, it } from "vitest";
import {
  deserialize,
  loadGame,
  newGame,
  saveGame,
  serialize,
  type SaveStore,
} from "../src/core/save";
import { startGame } from "../src/core/toolbar";
import { DAY_START } from "../src/core/clock";

function played() {
  const g = startGame();
  g.farm.till(1, 2);
  g.farm.plant(1, 2, "parsnip", "spring");
  g.farm.water(1, 2);
  g.farm.endDay("spring");
  g.inventory.add("parsnip", 3);
  g.inventory.add("leek");
  g.inventory.add("daffodil");
  g.money = 1234;
  g.skills.gain("farming", 150);
  g.hall.handIn(g.inventory, g, "spring-foraging", "daffodil");
  g.day.act(100, 60);
  g.day.end(g.money);
  g.day.energy.current = 200;
  return g;
}

describe("save and load", () => {
  it("round-trips a played game", () => {
    const g = played();
    const back = deserialize(serialize(g));
    expect(back).toBeDefined();
    expect(back!.day.clock.day).toBe(2);
    expect(back!.day.clock.minutes).toBe(DAY_START);
    expect(back!.day.energy.current).toBe(200);
    expect(back!.money).toBe(1234);
    expect(back!.inventory.count("parsnip")).toBe(3);
    expect(back!.inventory.count("leek")).toBe(1);
    expect(back!.farm.plotAt(1, 2)?.crop).toEqual({
      id: "parsnip",
      daysGrown: 1,
      harvests: 0,
    });
    expect(back!.skills.level("farming")).toBe(1);
    expect(back!.hall.handedIn("spring-foraging")).toEqual(["daffodil"]);
    expect(serialize(back!)).toBe(serialize(g));
  });

  it("does not share state with the saved game", () => {
    const g = played();
    const text = serialize(g);
    g.farm.till(9, 9);
    expect(deserialize(text)!.farm.plotAt(9, 9)).toBeUndefined();
  });

  it("rejects bad input without throwing", () => {
    const good = JSON.parse(serialize(newGame()));
    const bad = [
      "",
      "not json",
      "null",
      "[]",
      JSON.stringify({ ...good, version: 99 }),
      JSON.stringify({ ...good, day: 0 }),
      JSON.stringify({ ...good, money: -1 }),
      JSON.stringify({ ...good, energy: "full" }),
      JSON.stringify({ ...good, inventory: [{ id: 5, count: 1 }] }),
      JSON.stringify({ ...good, skills: { farming: 1 } }),
      JSON.stringify({ ...good, hall: { x: "nope" } }),
      JSON.stringify({ ...good, farm: null }),
    ];
    for (const text of bad) expect(deserialize(text), text).toBeUndefined();
  });

  it("works through a store, and an empty store loads nothing", () => {
    let held: string | null = null;
    const store: SaveStore = { read: () => held, write: (t) => (held = t) };
    expect(loadGame(store)).toBeUndefined();
    saveGame(store, played());
    expect(loadGame(store)?.money).toBe(1234);
  });

  it("remembers that the end screen was shown", () => {
    const g = played();
    g.endSeen = true;
    expect(deserialize(serialize(g))!.endSeen).toBe(true);
    expect(deserialize(serialize(played()))!.endSeen).toBe(false);
  });
});

describe("saving the clock", () => {
  it("resumes at the saved time of day", () => {
    const g = newGame();
    g.day.clock.advance(150);
    const back = deserialize(serialize(g))!;
    expect(back.day.clock.minutes).toBe(g.day.clock.minutes);
  });

  it("a save without a time starts in the morning", () => {
    const raw = JSON.parse(serialize(newGame()));
    delete raw.minutes;
    expect(deserialize(JSON.stringify(raw))!.day.clock.minutes).toBe(6 * 60);
  });
});
