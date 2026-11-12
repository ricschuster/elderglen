import { describe, expect, it } from "vitest";
import { mapFiles, maps } from "../src/content/maps";
import { exitLabel, serviceLabel } from "../src/core/labels";
import { HOMEWARD_PIN, HOMEWARD_PIN_PRICE, itemById } from "../src/core/items";
import { newGame } from "../src/core/save";
import { buy, isOneOnly, pinStock } from "../src/core/shop";

// Thalwen's cottage on the Beach dunes and the Homeward pin stall (note 75, note 09, #641).
const delta = maps.get("delta");
const house = maps.get("beach-elf-house");

describe("Thalwen's cottage on the Beach", () => {
  it("is a map that passes the map check", () => {
    expect(mapFiles["beach-elf-house"]).toBeDefined();
    expect(maps.problems()).toEqual([]);
  });

  it("stands on the sand of the Beach, with a door that opens both ways", () => {
    const exit = delta.exits.find((e) => e.id === "elf")!;
    expect(exit).toMatchObject({
      map: "beach-elf-house",
      entry: "door",
      x: 80,
      y: 27,
    });
    // The Beach sand runs x 66 to 85 (note 75 Built status).
    expect(exit.x).toBeGreaterThanOrEqual(66);
    expect(exit.x).toBeLessThanOrEqual(85);
    expect(delta.isBlocked(exit.x, exit.y)).toBe(false);
    expect(delta.entry("from_elf")).toMatchObject({ x: 80, y: 28 });
    expect(house.entry("door")).toBeDefined();
    expect(house.exits.find((e) => e.id === "door")).toMatchObject({
      map: "delta",
      entry: "from_elf",
    });
    expect(exitLabel("elf")).toBe("Thalwen's cottage");
  });

  it("is a solid building with its wall around the door, and the door reachable from the dunes", () => {
    for (let x = 77; x <= 83; x++)
      for (let y = 23; y <= 27; y++)
        expect(delta.isBlocked(x, y), `${x},${y}`).toBe(x !== 80 || y !== 27);
    const walkable = delta.reachable(delta.entry("from_farm")!);
    expect(walkable.has("80,28")).toBe(true);
  });

  it("has one walkable room with the pin stall counter reachable and solid", () => {
    const walkable = house.reachable(house.entry("door")!);
    const stall = house.services.find((s) => s.kind === "pin-stall")!;
    expect(new Set(house.services.map((s) => s.kind))).toEqual(
      new Set(["pin-stall"]),
    );
    expect(house.isBlocked(stall.x, stall.y)).toBe(true);
    expect(walkable.has(`${stall.x},${stall.y + 1}`)).toBe(true);
    expect(serviceLabel("pin-stall", stall.id)).toBe("Thalwen's Pin Stall");
  });

  it("keeps the half-packed trunk by the door and never blocks the way in", () => {
    // The rebuilt room (note 86, #859) packs the trunks (crate tiles) in its east corner.
    const fixtures = mapFiles["beach-elf-house"]!.layers.find(
      (l) => l.name === "fixtures",
    )!.data!;
    const door = house.entry("door")!;
    const trunk = fixtures.indexOf(12);
    expect(trunk).toBeGreaterThan(-1);
    expect(
      house.isBlocked(trunk % house.width, Math.floor(trunk / house.width)),
    ).toBe(true);
    expect(house.isBlocked(door.x, door.y)).toBe(false);
  });
});

describe("the Homeward pin", () => {
  it("is the only thing on the stall, kept, with a high placeholder price", () => {
    expect(pinStock()).toEqual([HOMEWARD_PIN]);
    const def = itemById(HOMEWARD_PIN)!;
    expect(def.keep).toBe(true);
    expect(def.buyPrice).toBe(HOMEWARD_PIN_PRICE);
    // A little under Stardew's 2,000,000g Return Scepter (saved Krobus page).
    expect(HOMEWARD_PIN_PRICE).toBeLessThan(2_000_000);
    expect(HOMEWARD_PIN_PRICE).toBeGreaterThan(1_000_000);
  });

  it("sells once, for the price, and not to a purse that is too light", () => {
    const g = newGame();
    expect(buy(g.inventory, g, HOMEWARD_PIN)).toBe(false);
    g.money = HOMEWARD_PIN_PRICE * 3;
    expect(buy(g.inventory, g, HOMEWARD_PIN, 2)).toBe(false);
    expect(buy(g.inventory, g, HOMEWARD_PIN)).toBe(true);
    expect(g.money).toBe(HOMEWARD_PIN_PRICE * 2);
    expect(g.inventory.count(HOMEWARD_PIN)).toBe(1);
    expect(buy(g.inventory, g, HOMEWARD_PIN)).toBe(false);
    expect(g.money).toBe(HOMEWARD_PIN_PRICE * 2);
    expect(isOneOnly(HOMEWARD_PIN)).toBe(true);
    expect(isOneOnly("wood")).toBe(false);
  });

  it("uses no em dash in its name", () => {
    expect(itemById(HOMEWARD_PIN)!.name).not.toContain(
      String.fromCharCode(0x2014),
    );
  });
});
