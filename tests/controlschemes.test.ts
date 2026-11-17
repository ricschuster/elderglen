import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCHEME,
  SCHEMES,
  hasButtons,
  migrateScheme,
  partsFor,
} from "../src/core/controlschemes";
import { defaultSettings, deserializeSettings } from "../src/core/bindings";

describe("control schemes", () => {
  it("lists Stardew's nine and defaults to tap-to-move and auto-attack", () => {
    expect(SCHEMES).toHaveLength(9);
    expect(new Set(SCHEMES.map((s) => s.id)).size).toBe(9);
    expect(DEFAULT_SCHEME).toBe("tapAuto");
    expect(defaultSettings().touchScheme).toBe("tapAuto");
  });
  it("migrates the old two-way setting", () => {
    expect(migrateScheme("tap")).toBe("tapAuto");
    expect(migrateScheme("stick")).toBe("stickButtons");
    expect(migrateScheme("nonsense")).toBe("tapAuto");
    expect(migrateScheme(undefined)).toBe("tapAuto");
    const s = deserializeSettings(
      JSON.stringify({ version: 1, touchScheme: "stick" }),
    );
    expect(s.touchScheme).toBe("stickButtons");
  });
  it("tap-to-move and auto-attack shows nothing but attacks by itself", () => {
    const p = partsFor("tapAuto", true);
    expect(p).toMatchObject({ tap: true, stick: "none", useButton: false });
    expect(p.autoAttack).toBe(true);
    expect(partsFor("tapAuto", false).autoAttack).toBe(false);
  });
  it("the attack joystick shows only with a weapon", () => {
    expect(partsFor("tapAim", true).aimStick).toBe(true);
    expect(partsFor("tapAim", false).aimStick).toBe(false);
  });
  it("invisible schemes: two buttons or one", () => {
    const two = partsFor("invisTwo", false);
    expect(two).toMatchObject({
      stick: "invisible",
      useButton: true,
      actionButton: true,
      tap: false,
    });
    const one = partsFor("invisOne", false);
    expect(one).toMatchObject({ useButton: true, actionButton: false });
  });
  it("the weapon schemes show their parts only with a weapon", () => {
    const a = partsFor("tapStickButtonsWeapon", false);
    expect(a).toMatchObject({ stick: "none", useButton: false });
    expect(partsFor("tapStickButtonsWeapon", true)).toMatchObject({
      stick: "visible",
      useButton: true,
      actionButton: true,
    });
    expect(partsFor("tapStickWeaponButtons", false)).toMatchObject({
      stick: "visible",
      useButton: false,
    });
    expect(partsFor("tapStickWeaponButtons", true).useButton).toBe(true);
  });
  it("the stick-only and button schemes", () => {
    expect(partsFor("tapStick", false)).toMatchObject({
      tap: true,
      stick: "visible",
      useButton: false,
    });
    expect(partsFor("tapStickButtons", false)).toMatchObject({
      tap: true,
      stick: "visible",
      useButton: true,
      actionButton: true,
    });
    expect(partsFor("stickButtons", false)).toMatchObject({
      tap: false,
      stick: "visible",
      useButton: true,
    });
    expect(hasButtons("tapStick")).toBe(false);
    expect(hasButtons("stickButtons")).toBe(true);
  });
});
