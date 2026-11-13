import { describe, expect, it } from "vitest";
import { bootsById } from "../src/core/equipment";
import { itemById } from "../src/core/items";
import { deserialize, newGame, serialize } from "../src/core/save";
import { tailorBoots } from "../src/core/tailoring";

describe("boots tailoring (note 96)", () => {
  it("moves the stats of the spool pair onto the feed pair, which keeps its look", () => {
    const g = newGame();
    g.inventory.add("worn-boots", 1);
    g.inventory.add("delvers-boots", 1);
    const r = tailorBoots(g, "worn-boots", "delvers-boots");
    expect(r).toMatchObject({ ok: true, id: "worn-boots@delvers-boots" });
    const b = bootsById("worn-boots@delvers-boots")!;
    expect(b.defense).toBe(3);
    expect(b.immunity).toBe(0);
    expect(b.price).toBe(bootsById("worn-boots")!.price);
  });

  it("uses up both pairs, costs no cloth, and names the result", () => {
    const g = newGame();
    g.inventory.add("worn-boots", 1);
    g.inventory.add("warded-boots", 1);
    g.inventory.add("cloth", 3);
    const r = tailorBoots(g, "worn-boots", "warded-boots");
    expect(r.ok && r.name).toBe("Custom-tailored worn boots");
    expect(g.inventory.count("worn-boots")).toBe(0);
    expect(g.inventory.count("warded-boots")).toBe(0);
    expect(g.inventory.count("worn-boots@warded-boots")).toBe(1);
    expect(g.inventory.count("cloth")).toBe(3);
    expect(itemById("worn-boots@warded-boots")?.name).toBe(
      "Custom-tailored worn boots",
    );
  });

  it("keeps the original look and takes the newest donor's stats when tailoring again", () => {
    const g = newGame();
    g.inventory.add("worn-boots", 1);
    g.inventory.add("delvers-boots", 1);
    g.inventory.add("sturdy-boots", 1);
    tailorBoots(g, "worn-boots", "delvers-boots");
    const r = tailorBoots(g, "worn-boots@delvers-boots", "sturdy-boots");
    expect(r).toMatchObject({ ok: true, id: "worn-boots@sturdy-boots" });
    expect(bootsById("worn-boots@sturdy-boots")!.defense).toBe(2);
  });

  it("refuses the same pair, non-boots, and pairs not in the pack", () => {
    const g = newGame();
    g.inventory.add("worn-boots", 1);
    g.inventory.add("wool", 1);
    expect(tailorBoots(g, "worn-boots", "worn-boots").ok).toBe(false);
    expect(tailorBoots(g, "worn-boots", "wool").ok).toBe(false);
    expect(tailorBoots(g, "wool", "worn-boots").ok).toBe(false);
    expect(tailorBoots(g, "worn-boots", "sturdy-boots").ok).toBe(false);
    expect(g.inventory.count("worn-boots")).toBe(1);
    expect(g.inventory.count("wool")).toBe(1);
  });

  it("refuses two pairs that carry the same stats", () => {
    const g = newGame();
    g.inventory.add("worn-boots", 1);
    g.inventory.add("sturdy-boots", 1);
    tailorBoots(g, "worn-boots", "sturdy-boots");
    g.inventory.add("sturdy-boots", 1);
    expect(tailorBoots(g, "worn-boots@sturdy-boots", "sturdy-boots").ok).toBe(
      false,
    );
    expect(g.inventory.count("sturdy-boots")).toBe(1);
  });

  it("wears a tailored pair for its stats and saves and loads it", () => {
    const g = newGame();
    g.inventory.add("worn-boots", 1);
    g.inventory.add("delvers-boots", 1);
    tailorBoots(g, "worn-boots", "delvers-boots");
    expect(g.equipment.wearBoots(g.inventory, "worn-boots@delvers-boots")).toBe(
      true,
    );
    expect(g.equipment.defense()).toBe(3);
    const back = deserialize(serialize(g));
    expect(back!.equipment.wornBoots()).toBe("worn-boots@delvers-boots");
    expect(back!.equipment.defense()).toBe(3);
  });

  it("keeps a tailored pair in the pack through a save", () => {
    const g = newGame();
    g.inventory.add("worn-boots", 1);
    g.inventory.add("ember-boots", 1);
    tailorBoots(g, "worn-boots", "ember-boots");
    const back = deserialize(serialize(g));
    expect(back!.inventory.count("worn-boots@ember-boots")).toBe(1);
  });
});
