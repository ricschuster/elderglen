import { describe, expect, it } from "vitest";
import { newGame, serialize, deserialize } from "../src/core/save";
import { LOCAL_PLAYER, Players } from "../src/core/players";

describe("world and players split", () => {
  it("a new game has one player, the local one", () => {
    const g = newGame();
    expect(g.players.ids).toEqual([LOCAL_PLAYER]);
    expect(g.players.localId).toBe(LOCAL_PLAYER);
  });

  it("the flat fields are views onto the local record", () => {
    const g = newGame();
    g.money = 123;
    expect(g.players.local.money).toBe(123);
    g.players.local.canWater = 7;
    expect(g.canWater).toBe(7);
    expect(g.inventory).toBe(g.players.local.inventory);
    expect(g.skills).toBe(g.players.local.skills);
    expect(g.toolTiers).toBe(g.players.local.toolTiers);
    g.toolTiers.hoe = 2;
    expect(g.players.local.toolTiers.hoe).toBe(2);
  });

  it("energy is the day's in single player", () => {
    const g = newGame();
    expect(g.players.local.energy).toBe(g.day.energy);
    g.day.energy.spend(10);
    expect(g.players.local.energy.current).toBe(g.day.energy.current);
  });

  it("records are separate per player id", () => {
    const p = new Players(500);
    const b = p.add("p2", 50);
    expect(p.count).toBe(2);
    b.inventory.add("turnip", 3);
    expect(p.local.inventory.count("turnip")).toBe(0);
    expect(b.money).toBe(50);
    b.energy.spend(20);
    expect(p.local.energy.current).toBe(p.local.energy.max);
    expect(() => p.add("p2", 0)).toThrow();
    expect(() => p.get("nope")).toThrow();
    expect(p.remove(LOCAL_PLAYER)).toBe(false);
    expect(p.remove("p2")).toBe(true);
  });

  it("a save round trip keeps the local record", () => {
    const g = newGame();
    g.money = 777;
    g.toolTiers.axe = 1;
    const back = deserialize(serialize(g));
    expect(back).not.toBeNull();
    expect(back!.money).toBe(777);
    expect(back!.players.local.money).toBe(777);
    expect(back!.players.local.toolTiers.axe).toBe(1);
  });

  it("a record stays small", () => {
    const p = new Players(500).local;
    const size = JSON.stringify({
      m: p.money,
      i: p.inventory.save(),
      s: p.skills.save(),
      t: p.toolTiers,
      c: p.canWater,
      e: p.energy,
    }).length;
    expect(size).toBeLessThan(1500);
  });
});
