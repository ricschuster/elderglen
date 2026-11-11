import { describe, expect, it } from "vitest";
import {
  BUNDLES,
  Hall,
  LAST_ROOM,
  ROOMS,
  rewardText,
} from "../src/core/bundles";
import { Inventory } from "../src/core/inventory";
import { itemById } from "../src/core/items";
import { cropById } from "../src/core/crops";
import { fillBundle, fillHall } from "./hall-helpers";

const by = (id: string) => BUNDLES.find((b) => b.id === id)!;

describe("bundle 25, Fodder (note 63)", () => {
  it("takes hay, wheat and any mix of root crops, and gives the heater", () => {
    const hall = new Hall();
    const inv = new Inventory(80);
    const wallet = { money: 0 };
    // Open the Guests' Board: its room opens after three bundles elsewhere.
    for (const b of BUNDLES.filter((b) => b.room !== "guests-board"))
      fillBundle(hall, inv, wallet, b);
    expect(hall.roomOpen("guests-board")).toBe(true);
    inv.add("parsnip", 4);
    inv.add("potato", 3);
    inv.add("beet", 3);
    inv.add("pumpkin");
    expect(hall.problem(inv, "fodder", "parsnip")).toBeUndefined();
    expect(hall.problem(inv, "fodder", "pumpkin")).toMatch(/does not take/);
    for (const id of ["parsnip", "potato", "beet"])
      while (inv.count(id) > 0) hall.handIn(inv, wallet, "fodder", id);
    expect(hall.have("fodder", "any-root-crop")).toBe(10);
    fillBundle(hall, inv, wallet, by("fodder"));
    expect(hall.complete("fodder")).toBe(true);
    expect(inv.count("coop-heater")).toBe(1);
  });

  it("has wheat as a summer and fall grain, in the crop list", () => {
    expect(cropById("wheat")).toMatchObject({
      seasons: ["summer", "fall"],
      growDays: 4,
      seedPrice: 10,
      sellPrice: 25,
    });
  });
});

describe("the Last Seat, bundles 27 to 30", () => {
  const seat = BUNDLES.filter((b) => b.room === LAST_ROOM);

  it("has the four bundles of note 16 with rewards that exist", () => {
    expect(seat.map((b) => b.id)).toEqual([
      "harvest-feast",
      "the-catch",
      "hearth-fire",
      "long-road",
    ]);
    for (const b of seat) {
      expect(b.required, b.id).toBe(b.items.length);
      expect(itemById(b.reward.item!.id), b.id).toBeDefined();
    }
    expect(by("harvest-feast").reward.item?.id).toBe("crystalarium");
    expect(by("the-catch").reward.item?.id).toBe("magnet-ring");
    expect(by("hearth-fire").reward.item?.id).toBe("big-chest");
    expect(rewardText(by("long-road"))).toMatch(/Letter to the elves/);
  });

  it("needs gold fish in The Catch", () => {
    const hall = new Hall(
      BUNDLES,
      {},
      ROOMS.map((r) => ({ ...r, opensAfter: 0 })),
    );
    const inv = new Inventory(10);
    inv.add("salmon");
    inv.add("salmon@gold");
    expect(hall.problem(inv, "the-catch", "salmon")).toMatch(/gold/);
    expect(hall.problem(inv, "the-catch", "salmon@gold")).toBeUndefined();
    expect(hall.problem(inv, "the-catch", "carp@gold")).toMatch(/You do not/);
  });

  it("opens after 20 other bundles, and finishing it mends the bridge", () => {
    const others = BUNDLES.filter((b) => b.room !== LAST_ROOM);
    // 23 others are built; the room opens after 20 of them (a soft gate, rooms.json).
    expect(others).toHaveLength(23);
    const hall = new Hall();
    expect(hall.roomOpen(LAST_ROOM)).toBe(false);
    const inv = new Inventory(40);
    const wallet = { money: 0 };
    fillHall(hall, inv, wallet);
    expect(hall.bridgeMended).toBe(true);
    expect(inv.count("elf-letter")).toBe(1);
    expect(inv.count("magnet-ring")).toBe(1);
    expect(hall.allComplete).toBe(true);
  });

  it("loads a save made before the Last Seat existed", () => {
    const hall = new Hall(BUNDLES, { "spring-foraging": ["leek"] });
    expect(hall.bridgeMended).toBe(false);
    expect(hall.have("harvest-feast", "honey")).toBe(0);
  });
});
