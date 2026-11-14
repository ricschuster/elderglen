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
  zoneGroup,
  zoneHolds,
  zoneRects,
} from "../src/core/decor";
import { itemById } from "../src/core/items";
import { RENOVATIONS, houseHolds } from "../src/core/house";
import { deserialize, newGame, serialize } from "../src/core/save";

describe("decor data", () => {
  it("has unique items that cannot be sold, two wallpapers and two floors", () => {
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(DECOR.length);
    expect(DECOR.filter((d) => d.kind === "wallpaper")).toHaveLength(2);
    expect(DECOR.filter((d) => d.kind === "floor")).toHaveLength(2);
    for (const d of DECOR) expect(itemById(d.id)?.keep, d.id).toBe(true);
  });

  it("gives every zone floor and wall tiles with everything built", () => {
    const holds = new Set(
      houseHolds(
        3,
        true,
        RENOVATIONS.map((r) => r.id),
      ),
    );
    for (const r of ROOMS) {
      const t = roomTiles(mapFiles.house!, 3, r, holds);
      expect(t.floor.length, r.id).toBeGreaterThan(10);
      expect(t.wall.length, r.id).toBeGreaterThan(5);
    }
  });

  it("names a zone for every renovation room and the spouse room", () => {
    const ids = ROOMS.map((r) => r.id);
    for (const id of ["spouse", "south", "corner", "attic", "cubby", "dining"])
      expect(ids, id).toContain(id);
    for (const r of ROOMS)
      for (const h of [
        ...(r.when ?? []),
        ...(r.wings ?? []).flatMap((w) => w.when ?? []),
      ])
        expect(
          h === "spouse" || RENOVATIONS.some((n) => `reno-${n.id}` === h),
          h,
        ).toBe(true);
  });

  it("has no zone rectangle overlapping another with everything built", () => {
    const holds = new Set(
      houseHolds(
        3,
        true,
        RENOVATIONS.map((r) => r.id),
      ),
    );
    const rects = ROOMS.flatMap((r) =>
      zoneRects(r, 3, holds).map((rc) => ({ id: r.id, ...rc })),
    );
    for (const a of rects)
      for (const b of rects)
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

describe("renovation zones", () => {
  const g = () => {
    const s = newGame();
    s.houseTier = 2;
    return s;
  };

  it("exist only while their renovation is built", () => {
    const s = g();
    expect(roomAt(2, 28, 5, zoneHolds(s))).toBeUndefined();
    s.houseRenos = ["attic"];
    expect(roomAt(2, 28, 5, zoneHolds(s))?.id).toBe("attic");
    s.houseRenos = [];
    expect(roomAt(2, 28, 5, zoneHolds(s))).toBeUndefined();
  });

  it("need the house tier", () => {
    const s = g();
    s.houseRenos = ["cubby"];
    s.houseTier = 1;
    expect(roomAt(1, 38, 34, zoneHolds(s))).toBeUndefined();
  });

  it("covers the spouse room only while married", () => {
    const s = g();
    expect(roomAt(2, 60, 26, zoneHolds(s))).toBeUndefined();
    s.flags = ["spouse"];
    expect(roomAt(2, 60, 26, zoneHolds(s))?.id).toBe("spouse");
  });

  it("adds the corner room's wings only with the expansion", () => {
    const s = g();
    s.houseRenos = ["corner"];
    expect(roomAt(2, 60, 5, zoneHolds(s))).toBeUndefined();
    expect(roomAt(2, 60, 15, zoneHolds(s))?.id).toBe("corner");
    s.houseRenos = ["corner", "corner-big"];
    expect(roomAt(2, 60, 5, zoneHolds(s))?.id).toBe("corner");
    expect(roomAt(2, 70, 15, zoneHolds(s))?.id).toBe("corner");
  });

  it("applies a covering to a built renovation room, and refuses an unbuilt one", () => {
    const s = g();
    s.inventory.add("floor-slate");
    expect(applyDecor(s, "house", 5, 26, "floor-slate").ok).toBe(false);
    s.houseRenos = ["dining"];
    expect(applyDecor(s, "house", 5, 26, "floor-slate").ok).toBe(true);
    expect(s.decor.get("dining").floor).toBe("floor-slate");
  });

  it("joins open rooms to their neighbours", () => {
    const open = new Set(["reno-open-bedroom", "reno-dining-open"]);
    expect(zoneGroup("start")).toEqual(["start"]);
    expect(zoneGroup("start", open).sort()).toEqual(["bedroom", "start"]);
    expect(zoneGroup("dining", open).sort()).toEqual(["dining", "kitchen"]);
    const s = g();
    s.houseRenos = ["open-bedroom"];
    s.inventory.add("wallpaper-moss");
    expect(applyDecor(s, "house", 35, 26, "wallpaper-moss").ok).toBe(true);
    expect(s.decor.get("start").wallpaper).toBe("wallpaper-moss");
    expect(s.decor.get("bedroom").wallpaper).toBe("wallpaper-moss");
    expect(s.decor.get("kitchen").wallpaper).toBeUndefined();
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
    expect(roomAt(0, 35, 26)?.id).toBe("start");
    expect(applyDecor(g, "house", 35, 26, "wallpaper-moss").ok).toBe(true);
    expect(g.decor.get("start").wallpaper).toBe("wallpaper-moss");
    expect(g.inventory.count("wallpaper-moss")).toBe(0);
  });

  it("replaces an old floor and keeps the wallpaper", () => {
    const g = newGame();
    g.inventory.add("wallpaper-moss");
    g.inventory.add("floor-planks");
    g.inventory.add("floor-slate");
    for (const id of ["wallpaper-moss", "floor-planks", "floor-slate"])
      applyDecor(g, "house", 35, 26, id);
    expect(g.decor.get("start")).toEqual({
      wallpaper: "wallpaper-moss",
      floor: "floor-slate",
    });
  });

  it("refuses outside a built room, outside the house and without the item", () => {
    const g = newGame();
    g.inventory.add("floor-slate");
    expect(applyDecor(g, "house", 23, 26, "floor-slate").ok).toBe(false);
    expect(applyDecor(g, "farm", 35, 26, "floor-slate").ok).toBe(false);
    expect(applyDecor(g, "house", 35, 26, "floor-planks").ok).toBe(false);
    g.houseTier = 1;
    expect(applyDecor(g, "house", 23, 26, "floor-slate").ok).toBe(true);
    expect(g.decor.get("kitchen").floor).toBe("floor-slate");
  });
});

describe("saving", () => {
  it("round trips and loads old saves without the field", () => {
    const g = newGame();
    g.inventory.add("floor-slate");
    applyDecor(g, "house", 35, 26, "floor-slate");
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
