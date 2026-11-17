import { describe, expect, it } from "vitest";
import { STALE_MS, TAB_LOCK_KEY, TabGuard } from "../src/core/tabguard";
import type { KeyValue } from "../src/core/slots";

function memory(): KeyValue {
  const m = new Map<string, string>();
  return {
    get: (k) => m.get(k) ?? null,
    set: (k, v) => (m.set(k, v), true),
    remove: (k) => void m.delete(k),
  };
}

describe("two-tab guard", () => {
  it("the first tab plays, the second is blocked", () => {
    const kv = memory();
    let t = 1000;
    const a = new TabGuard(kv, "a", () => t);
    const b = new TabGuard(kv, "b", () => t);
    expect(a.check()).toBe(false);
    expect(b.check()).toBe(true);
    expect(b.blocked).toBe(true);
    t += 3000;
    expect(a.check()).toBe(false);
  });

  it("taking over blocks the first tab on its next beat", () => {
    const kv = memory();
    let t = 0;
    const a = new TabGuard(kv, "a", () => t);
    const b = new TabGuard(kv, "b", () => t);
    a.check();
    b.check();
    t += 1000;
    b.takeOver();
    expect(b.blocked).toBe(false);
    expect(a.check()).toBe(true);
    expect(b.check()).toBe(false);
  });

  it("a stale lock from a gone tab is free", () => {
    const kv = memory();
    let t = 0;
    new TabGuard(kv, "a", () => t).check();
    t += STALE_MS + 1;
    expect(new TabGuard(kv, "b", () => t).check()).toBe(false);
  });

  it("a released lock is free, and a broken one counts as none", () => {
    const kv = memory();
    const a = new TabGuard(kv, "a", () => 0);
    a.check();
    a.release();
    expect(kv.get(TAB_LOCK_KEY)).toBeNull();
    kv.set(TAB_LOCK_KEY, "{nope");
    expect(new TabGuard(kv, "b", () => 0).check()).toBe(false);
  });

  it("a blocked tab stays blocked until it takes over", () => {
    const kv = memory();
    let t = 0;
    new TabGuard(kv, "a", () => t).check();
    const b = new TabGuard(kv, "b", () => t);
    b.check();
    t += STALE_MS * 2;
    expect(b.check()).toBe(true);
  });
});
