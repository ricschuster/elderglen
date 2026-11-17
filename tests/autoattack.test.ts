import { describe, expect, it } from "vitest";
import {
  autoSwings,
  autoWeaponSlot,
  mayAutoEquip,
} from "../src/core/autoattack";
import { startGame } from "../src/core/toolbar";

describe("auto-attack equip", () => {
  it("picks nothing with no weapon, the highest slot otherwise", () => {
    const g = startGame();
    expect(autoWeaponSlot(g, undefined)).toBeUndefined();
    g.inventory.add("hazel-switch", 1);
    g.inventory.add("rolling-pin", 1);
    const hi = autoWeaponSlot(g, undefined)!;
    expect(g.inventory.slot(hi)?.id).toBe("rolling-pin");
  });
  it("prefers the last used weapon", () => {
    const g = startGame();
    g.inventory.add("hazel-switch", 1);
    g.inventory.add("rolling-pin", 1);
    const s = autoWeaponSlot(g, "hazel-switch")!;
    expect(g.inventory.slot(s)?.id).toBe("hazel-switch");
  });
  it("skips slingshots and swings only non-sling weapons", () => {
    expect(autoSwings("hazel-switch")).toBe(true);
    expect(autoSwings("pocket-sling")).toBe(false);
    expect(autoSwings("nonsense")).toBe(false);
  });
  it("equips over a tool, not over an item in hand", () => {
    const g = startGame();
    g.inventory.add("hazel-switch", 1);
    expect(mayAutoEquip(g, 35)).toBe(true);
    const sw = autoWeaponSlot(g, undefined)!;
    expect(mayAutoEquip(g, sw)).toBe(false);
  });
});
