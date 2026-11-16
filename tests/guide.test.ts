import { describe, expect, it } from "vitest";
import {
  guideCategories,
  keeperlessShops,
  shopHoursLines,
} from "../src/core/guide";
import { clockText } from "../src/core/clock";
import { SHOPS } from "../src/core/villagers";
import { deserialize, newGame, serialize } from "../src/core/save";
import { VILLAGERS } from "../src/core/villagers";
import { tasteListOf } from "../src/core/friendship";

const cat = (g: ReturnType<typeof newGame>, id: string) =>
  guideCategories(g).find((c) => c.id === id)!;

describe("the Guide (note 101)", () => {
  it("lists nothing in a new game except nobody met", () => {
    const g = newGame();
    for (const c of guideCategories(g))
      if (!["items", "recipes", "bundles"].includes(c.id))
        expect(c.entries).toEqual([]);
  });

  it("shows a crop as seen with a seed, known once the produce is held", () => {
    const g = newGame();
    g.inventory.add("parsnip-seed", 1);
    let e = cat(g, "crops").entries.find((x) => x.id === "parsnip")!;
    expect(e.state).toBe("seen");
    expect(e.lines.join(" ")).not.toMatch(/days|Sells/);
    g.inventory.add("parsnip", 1);
    e = cat(g, "crops").entries.find((x) => x.id === "parsnip")!;
    expect(e.state).toBe("known");
    expect(e.lines.join(" ")).toMatch(/Takes \d+ days/);
  });

  it("remembers an item after it leaves the pack", () => {
    const g = newGame();
    g.inventory.add("parsnip", 1);
    guideCategories(g);
    g.inventory.remove("parsnip", 1);
    expect(cat(g, "crops").entries.some((x) => x.id === "parsnip")).toBe(true);
  });

  it("lists a fish only once caught", () => {
    const g = newGame();
    expect(cat(g, "fish").entries).toEqual([]);
    g.fishing.note("reedling", 20);
    const e = cat(g, "fish").entries;
    expect(e.map((x) => x.id)).toEqual(["reedling"]);
    expect(e[0]!.lines.join(" ")).toContain("Longest caught: 20 cm");
  });

  it("lists a person once met and shows only the tastes learned by gifting", () => {
    const g = newGame();
    const v = VILLAGERS[0]!;
    expect(cat(g, "people").entries).toEqual([]);
    g.friendship.meet(v.id);
    let e = cat(g, "people").entries.find((x) => x.id === v.id)!;
    expect(e.lines.some((l) => /^(Loves|Likes|Dislikes|Hates)/.test(l))).toBe(
      false,
    );
    const loved = tasteListOf(v.id).loves.find((id) => !id.includes(":"));
    if (loved) {
      g.inventory.add(loved, 1);
      g.friendship.gift(v.id, loved, 1);
      e = cat(g, "people").entries.find((x) => x.id === v.id)!;
      const text = e.lines.join("\n");
      expect(text).toMatch(/Loves:/);
      // The other loved items are not given away.
      for (const other of tasteListOf(v.id).loves)
        if (other !== loved && !other.includes(":"))
          expect(text).not.toContain(`: ${other}`);
    }
  });

  it("survives a save and load, and an old save loads empty", () => {
    const g = newGame();
    g.inventory.add("parsnip", 1);
    const back = deserialize(serialize(g));
    expect(cat(back!, "crops").entries.some((x) => x.id === "parsnip")).toBe(
      true,
    );
    const raw = JSON.parse(serialize(newGame()));
    delete raw.guide;
    expect(() => deserialize(JSON.stringify(raw))).not.toThrow();
  });

  it("lists a recipe once learned and shows its source only once made", () => {
    const g = newGame();
    const r = cat(g, "recipes").entries[0];
    expect(r).toBeDefined();
    expect(r!.state).toBe("seen");
    expect(r!.lines.join(" ")).not.toMatch(/Learned|level/);
  });

  it("lists places only once visited, and keeps them in the save", () => {
    const g = newGame();
    expect(cat(g, "places").entries).toEqual([]);
    g.guide.visit("forest");
    g.guide.visit("not-a-listed-map");
    expect(cat(g, "places").entries.map((e) => e.id)).toEqual(["forest"]);
    const back = deserialize(serialize(g))!;
    expect(cat(back, "places").entries.map((e) => e.id)).toEqual(["forest"]);
  });

  it("lists bundles only for rooms that have opened", () => {
    const g = newGame();
    const ids = cat(g, "bundles").entries.map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids).not.toContain("last-seat");
  });

  it("shows shop hours on a card only after a visit during them", () => {
    const g = newGame();
    const v = VILLAGERS.find((x) => x.shop)!;
    g.friendship.meet(v.id);
    const card = () => cat(g, "people").entries.find((e) => e.id === v.id)!;
    expect(card().lines.join(" ")).not.toMatch(/Open \d/);
    g.guide.visitShop(v.shop!);
    const lines = card().lines;
    expect(lines.some((l) => l.startsWith("Open "))).toBe(true);
    const back = deserialize(serialize(g))!;
    expect(back.guide.shopSeen(v.shop!)).toBe(true);
  });

  it("lists the hours of a shop with no keeper under Places once seen", () => {
    const g = newGame();
    const shop = SHOPS.find((s) => !VILLAGERS.some((v) => v.shop === s.id));
    if (!shop) return;
    expect(keeperlessShops(g)).toHaveLength(0);
    g.guide.visitShop(shop.id);
    const e = cat(g, "places").entries.find((x) => x.id === `shop-${shop.id}`)!;
    expect(e.name).toBe(shop.name);
    expect(e.lines[0]).toContain(clockText(shop.open));
  });

  it("reads hours and the closed day from the shop data", () => {
    const shop = SHOPS.find((s) => s.closedDay)!;
    const text = shopHoursLines(shop).join(" ");
    expect(text).toContain(clockText(shop.open));
    expect(text).toContain(clockText(shop.close));
    expect(text).toMatch(/Shut on \w+days/);
    expect(shopHoursLines({ ...shop, closedDay: null }).join(" ")).toContain(
      "every day",
    );
  });
});
