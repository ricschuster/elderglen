import { describe, expect, it } from "vitest";
import { mapFiles } from "../src/content/maps";
import {
  DECOR,
  ROOMS,
  applyDecor,
  buyDecor,
  decorProblem,
  roomAt,
  roomTiles,
} from "../src/core/decor";
import { itemById } from "../src/core/items";
import { deserialize, newGame, serialize } from "../src/core/save";

describe("decor data", () => {
  it("has unique items that cannot be sold, two wallpapers and two floors", () => {
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(DECOR.length);
    expect(DECOR.filter((d) => d.kind === "wallpaper")).toHaveLength(2);
    expect(DECOR.filter((d) => d.kind === "floor")).toHaveLength(2);
    for (const d of DECOR) expect(itemById(d.id)?.keep, d.id).toBe(true);
  });

  it("gives every built room floor and wall tiles", () => {
    for (const r of ROOMS) {
      const t = roomTiles(mapFiles.house!, r.tier === 0 ? 0 : r.tier, r);
      expect(t.floor.length, r.id).toBeGreaterThan(10);
      expect(t.wall.length, r.id).toBeGreaterThan(10);
    }
  });

  it("has no room overlapping another", () => {
    for (const a of ROOMS)
      for (const b of ROOMS)
        if (a !== b)
          expect(
            a.x < b.x + b.w &&
              b.x < a.x + a.w &&
              a.y < b.y + b.h &&
              b.y < a.y + a.h,
            `${a.id} ${b.id}`,
          ).toBe(false);
  });
});

describe("buying and applying", () => {
  it("buys into the pack and refuses without money", () => {
    const g = newGame();
    g.money = 100;
    expect(decorProblem(g, "floor-planks")).toMatch(/100g more/);
    g.money = 500;
    expect(buyDecor(g, "floor-planks")).toBe(true);
    expect(g.money).toBe(300);
    expect(g.inventory.count("floor-planks")).toBe(1);
  });

  it("covers the room under the faced tile and uses the item up", () => {
    const g = newGame();
    g.inventory.add("wallpaper-moss");
    expect(roomAt(0, 15, 15)?.id).toBe("start");
    expect(applyDecor(g, "house", 15, 15, "wallpaper-moss").ok).toBe(true);
    expect(g.decor.get("start").wallpaper).toBe("wallpaper-moss");
    expect(g.inventory.count("wallpaper-moss")).toBe(0);
  });

  it("replaces an old floor and keeps the wallpaper", () => {
    const g = newGame();
    g.inventory.add("wallpaper-moss");
    g.inventory.add("floor-planks");
    g.inventory.add("floor-slate");
    for (const id of ["wallpaper-moss", "floor-planks", "floor-slate"])
      applyDecor(g, "house", 15, 15, id);
    expect(g.decor.get("start")).toEqual({
      wallpaper: "wallpaper-moss",
      floor: "floor-slate",
    });
  });

  it("refuses outside a built room, outside the house and without the item", () => {
    const g = newGame();
    g.inventory.add("floor-slate");
    expect(applyDecor(g, "house", 3, 15, "floor-slate").ok).toBe(false);
    expect(applyDecor(g, "farm", 15, 15, "floor-slate").ok).toBe(false);
    expect(applyDecor(g, "house", 15, 15, "floor-planks").ok).toBe(false);
    g.houseTier = 1;
    expect(applyDecor(g, "house", 3, 15, "floor-slate").ok).toBe(true);
    expect(g.decor.get("kitchen").floor).toBe("floor-slate");
  });
});

describe("saving", () => {
  it("round trips and loads old saves without the field", () => {
    const g = newGame();
    g.inventory.add("floor-slate");
    applyDecor(g, "house", 15, 15, "floor-slate");
    const back = deserialize(serialize(g));
    expect(back?.decor.get("start").floor).toBe("floor-slate");
    const raw = JSON.parse(serialize(g));
    delete raw.decor;
    expect(deserialize(JSON.stringify(raw))?.decor.get("start")).toEqual({});
  });

  it("drops unknown rooms and items", () => {
    const raw = JSON.parse(serialize(newGame()));
    raw.decor = { ghost: { floor: "floor-slate" }, start: { floor: "nope" } };
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.decor.save()).toEqual({});
  });
});
