import { describe, expect, it } from "vitest";
import { BUNDLES, Hall, ROOMS } from "../src/core/bundles";
import { COVE_OPEN, COVE_ROOM, coveHolds } from "../src/core/cove";
import { FISH } from "../src/core/fishing";
import { Inventory } from "../src/core/inventory";
import { itemById } from "../src/core/items";
import { SHELLFISH } from "../src/core/pots";
import { fillBundle, slotStack } from "./hall-helpers";

const water = BUNDLES.filter((b) => b.room === COVE_ROOM);
const byId = (id: string) => water.find((b) => b.id === id)!;
const rule = (id: string) => [byId(id).required, byId(id).items.length];
const fishWater = (id: string) => FISH.find((f) => f.id === id)?.water;

describe("the Water room bundles 13 to 18 (note 16, note 21)", () => {
  it("has the six bundles in order with the settled rules", () => {
    expect(water.map((b) => b.id)).toEqual([
      "stream-fish",
      "lake-fish",
      "sea-fish",
      "night-fishing",
      "specialty-fish",
      "trap-catch",
    ]);
    expect(rule("stream-fish")).toEqual([3, 5]);
    expect(rule("lake-fish")).toEqual([3, 4]);
    expect(rule("sea-fish")).toEqual([4, 6]);
    expect(rule("night-fishing")).toEqual([3, 4]);
    expect(rule("specialty-fish")).toEqual([4, 4]);
    expect(rule("trap-catch")).toEqual([5, 8]);
  });

  it("gives the settled rewards, every one a real item", () => {
    const r = (id: string) => byId(id).reward.item!;
    expect(r("stream-fish")).toEqual({ id: "plain-bait", count: 30 });
    expect(r("lake-fish")).toEqual({ id: "glint-lure", count: 1 });
    expect(r("sea-fish")).toEqual({ id: "warp-totem-beach", count: 5 });
    expect(r("night-fishing")).toEqual({ id: "glow-ring", count: 1 });
    expect(r("specialty-fish")).toEqual({ id: "fisher-stew", count: 5 });
    expect(r("trap-catch")).toEqual({ id: "shellfish-pot", count: 3 });
    for (const b of water) expect(itemById(b.reward.item!.id)).toBeDefined();
  });

  it("asks only for goods that exist, and no cove fish", () => {
    for (const b of water)
      for (const i of b.items) {
        expect(itemById(i.id)).toBeDefined();
        expect(fishWater(i.id)).not.toBe("cove");
      }
  });

  it("draws each fish bundle from the waters the note names", () => {
    const waters = (id: string) =>
      new Set(byId(id).items.map((i) => fishWater(i.id)));
    expect(waters("stream-fish")).toEqual(new Set(["river"]));
    expect(waters("lake-fish")).toEqual(
      new Set(["forest-lake", "mountain-lake", "marsh-lake"]),
    );
    expect(waters("sea-fish")).toEqual(new Set(["sea"]));
    for (const i of byId("night-fishing").items)
      expect(FISH.find((f) => f.id === i.id)!.time).toBe("night");
  });

  it("takes one rare fish of stream, lake and sea plus the Pearl Lobster", () => {
    const ids = byId("specialty-fish").items.map((i) => i.id);
    expect(ids).toEqual([
      "silverthread",
      "hermit-trout",
      "crowned-tunny",
      "pearl-lobster",
    ]);
    for (const id of ids.slice(0, 3))
      expect(FISH.find((f) => f.id === id)!.rarity).toBe("rare");
  });

  it("takes every pot shellfish, fresh and salt, for 5 of 8", () => {
    const ids = byId("trap-catch").items.map((i) => i.id);
    expect(ids.sort()).toEqual(SHELLFISH.map((s) => s.id).sort());
    expect(new Set(SHELLFISH.map((s) => s.water))).toEqual(
      new Set(["fresh", "salt"]),
    );
  });

  it("leaves a choice in every season for the fish bundles", () => {
    for (const id of ["stream-fish", "lake-fish", "sea-fish", "night-fishing"])
      for (const s of ["spring", "summer", "fall", "winter"]) {
        const open = byId(id).items.filter((i) =>
          FISH.find((f) => f.id === i.id)!.seasons.includes(s as never),
        ).length;
        // Hand-ins are kept across seasons, so one in season is all a visit needs.
        expect(open).toBeGreaterThanOrEqual(1);
      }
  });

  it("opens the cove only when all six are done", () => {
    const rooms = ROOMS.map((r) =>
      r.id === COVE_ROOM ? { ...r, opensAfter: 0 } : r,
    );
    const hall = new Hall(BUNDLES, {}, rooms);
    const inv = new Inventory();
    const wallet = { money: 0 };
    expect(hall.roomComplete(COVE_ROOM)).toBe(false);
    for (const b of water.slice(0, 5)) {
      fillBundle(hall, inv, wallet, b);
      expect(hall.complete(b.id)).toBe(true);
      expect(hall.roomComplete(COVE_ROOM)).toBe(false);
    }
    fillBundle(hall, inv, wallet, water[5]!);
    expect(hall.roomComplete(COVE_ROOM)).toBe(true);
    expect(coveHolds({ hall })).toEqual([COVE_OPEN]);
    // Every reward landed in the pack.
    expect(inv.count("plain-bait")).toBe(30);
    expect(inv.count("glow-ring")).toBe(1);
    expect(inv.count("shellfish-pot")).toBe(3);
  });

  it("hands in an item of the right slot quality", () => {
    for (const b of water)
      for (const i of b.items) expect(slotStack(i)).toBe(i.id);
  });
});
