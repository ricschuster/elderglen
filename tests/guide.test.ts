import { describe, expect, it } from "vitest";
import { guideCategories } from "../src/core/guide";
import { deserialize, newGame, serialize } from "../src/core/save";
import { VILLAGERS } from "../src/core/villagers";
import { tasteListOf } from "../src/core/friendship";

const cat = (g: ReturnType<typeof newGame>, id: string) =>
  guideCategories(g).find((c) => c.id === id)!;

describe("the Guide (note 101)", () => {
  it("lists nothing in a new game except nobody met", () => {
    const g = newGame();
    for (const c of guideCategories(g))
      if (c.id !== "items") expect(c.entries).toEqual([]);
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
});
