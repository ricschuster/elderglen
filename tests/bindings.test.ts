import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  actionFor,
  chooseProfile,
  defaultBindings,
  defaultSettings,
  deserializeSettings,
  isReserved,
  keyLabel,
  loadSettings,
  rebind,
  resetAction,
  resetAll,
  saveSettings,
  serializeSettings,
  swapBinding,
  type SettingsStore,
} from "../src/core/bindings";

describe("defaults", () => {
  it("gives every action a unique, unreserved key", () => {
    const keys = Object.values(defaultBindings());
    expect(new Set(keys).size).toBe(ACTIONS.length);
    expect(keys.some(isReserved)).toBe(false);
  });

  it("uses Stardew's keys", () => {
    const b = defaultBindings();
    expect(b.use).toBe("KeyC");
    expect(b.action).toBe("KeyX");
    expect(b.nextSlot).toBe("Tab");
    expect(b.slot12).toBe("Equal");
  });
});

describe("rebind", () => {
  it("binds a free key", () => {
    const r = rebind(defaultBindings(), "use", "KeyV");
    expect(r.kind === "ok" && r.bindings.use).toBe("KeyV");
  });

  it("reports a conflict without changing anything", () => {
    const r = rebind(defaultBindings(), "use", "KeyX");
    expect(r).toEqual({ kind: "conflict", with: "action" });
  });

  it("swaps on request", () => {
    const b = swapBinding(defaultBindings(), "use", "action");
    expect(b.use).toBe("KeyX");
    expect(b.action).toBe("KeyC");
  });

  it("refuses reserved keys and unknown actions", () => {
    expect(rebind(defaultBindings(), "use", "Escape").kind).toBe("reserved");
    expect(rebind(defaultBindings(), "use", "F5").kind).toBe("reserved");
    expect(rebind(defaultBindings(), "use", "ArrowUp").kind).toBe("reserved");
    expect(rebind(defaultBindings(), "nope", "KeyV").kind).toBe("unknown");
  });

  it("allows the same key it already has", () => {
    expect(rebind(defaultBindings(), "use", "KeyC").kind).toBe("ok");
  });
});

describe("reset", () => {
  it("resets one action", () => {
    const r = rebind(defaultBindings(), "use", "KeyV");
    if (r.kind !== "ok") throw new Error("expected ok");
    expect(resetAction(r.bindings, "use").use).toBe("KeyC");
  });

  it("swaps when the default key is taken, keeping keys unique", () => {
    let b = defaultBindings();
    const r = rebind(b, "use", "KeyV");
    if (r.kind !== "ok") throw new Error("expected ok");
    b = { ...r.bindings, action: "KeyC" };
    const fixed = resetAction(b, "use");
    expect(fixed.use).toBe("KeyC");
    expect(new Set(Object.values(fixed)).size).toBe(ACTIONS.length);
  });

  it("resets all", () => {
    expect(resetAll()).toEqual(defaultBindings());
  });
});

describe("actionFor", () => {
  it("finds the action of a key", () => {
    expect(actionFor(defaultBindings(), "KeyK")).toBe("skills");
    expect(actionFor(defaultBindings(), "KeyQ")).toBeUndefined();
  });
});

describe("profile choice", () => {
  it("is touch for a coarse pointer and desktop otherwise", () => {
    expect(chooseProfile(true)).toBe("touch");
    expect(chooseProfile(false)).toBe("desktop");
    expect(defaultSettings(true).profile).toBe("touch");
  });
});

describe("settings record", () => {
  it("round trips", () => {
    const s = defaultSettings();
    s.profile = "touch";
    s.touchScheme = "stick";
    const r = rebind(s.bindings, "use", "KeyV");
    if (r.kind !== "ok") throw new Error("expected ok");
    s.bindings = r.bindings;
    expect(deserializeSettings(serializeSettings(s))).toEqual(s);
  });

  it("gives defaults for a missing or bad record", () => {
    expect(deserializeSettings(null, true).profile).toBe("touch");
    expect(deserializeSettings("not json")).toEqual(defaultSettings());
    expect(deserializeSettings("[]")).toEqual(defaultSettings());
    expect(deserializeSettings('{"version":99}')).toEqual(defaultSettings());
  });

  it("repairs field by field", () => {
    const text = JSON.stringify({
      version: 1,
      profile: "gamepad",
      touchScheme: "stick",
      bindings: { use: "KeyV", eat: 7 },
    });
    const s = deserializeSettings(text);
    expect(s.profile).toBe("desktop");
    expect(s.touchScheme).toBe("stick");
    expect(s.bindings.use).toBe("KeyV");
    expect(s.bindings.eat).toBe("KeyF");
  });

  it("drops bindings with a duplicate or reserved key", () => {
    const dup = JSON.stringify({ version: 1, bindings: { use: "KeyX" } });
    expect(deserializeSettings(dup).bindings).toEqual(defaultBindings());
    const res = JSON.stringify({ version: 1, bindings: { use: "Escape" } });
    expect(deserializeSettings(res).bindings).toEqual(defaultBindings());
  });

  it("loads and saves through a store", () => {
    let text: string | null = null;
    const store: SettingsStore = {
      read: () => text,
      write: (t) => (text = t),
    };
    expect(loadSettings(store)).toEqual(defaultSettings());
    const s = { ...defaultSettings(), touchScheme: "stick" as const };
    saveSettings(store, s);
    expect(loadSettings(store)).toEqual(s);
  });
});

describe("keyLabel", () => {
  it("names common keys", () => {
    expect(keyLabel("KeyC")).toBe("C");
    expect(keyLabel("Digit0")).toBe("0");
    expect(keyLabel("Equal")).toBe("=");
    expect(keyLabel("ShiftLeft")).toBe("Left Shift");
    expect(keyLabel("Tab")).toBe("Tab");
  });
});

describe("view settings", () => {
  it("defaults to 100 percent and round trips", () => {
    const s = defaultSettings();
    expect(s.worldZoom).toBe(100);
    expect(s.uiSize).toBe(100);
    s.worldZoom = 175;
    s.uiSize = 80;
    expect(deserializeSettings(serializeSettings(s))).toEqual(s);
  });

  it("clamps out of range values and keeps older records working", () => {
    const text = JSON.stringify({ version: 1, worldZoom: 900, uiSize: 1 });
    const s = deserializeSettings(text);
    expect(s.worldZoom).toBe(200);
    expect(s.uiSize).toBe(75);
    const old = deserializeSettings(JSON.stringify({ version: 1 }));
    expect(old.worldZoom).toBe(100);
    expect(old.uiSize).toBe(100);
  });
});
