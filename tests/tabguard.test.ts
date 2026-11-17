import { describe, expect, it } from "vitest";
import {
  STALE_MS,
  TAB_ID_KEY,
  TAB_LOCK_KEY,
  TabGuard,
  isNativeApp,
  stableTabId,
} from "../src/core/tabguard";
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

  it("a reloaded tab keeps its id and reclaims its own lock", () => {
    const kv = memory();
    const session = memory();
    let n = 0;
    const make = () => `id${n++}`;
    const first = new TabGuard(kv, stableTabId(session, make), () => 0);
    first.check();
    // Play here instead: take the lock, then the page reloads with a new object.
    first.takeOver();
    const again = new TabGuard(kv, stableTabId(session, make), () => 1000);
    expect(session.get(TAB_ID_KEY)).toBe("id0");
    expect(again.check()).toBe(false);
  });

  it("without a kept id (a new tab) a fresh lock still blocks", () => {
    const kv = memory();
    let n = 0;
    const make = () => `id${n++}`;
    new TabGuard(kv, stableTabId(memory(), make), () => 0).check();
    const other = new TabGuard(kv, stableTabId(memory(), make), () => 1000);
    expect(other.check()).toBe(true);
  });

  it("the installed app is told apart from a browser", () => {
    expect(isNativeApp(undefined)).toBe(false);
    expect(isNativeApp({})).toBe(false);
    expect(isNativeApp({ Capacitor: { isNativePlatform: () => false } })).toBe(
      false,
    );
    expect(isNativeApp({ Capacitor: { isNativePlatform: () => true } })).toBe(
      true,
    );
  });
});
