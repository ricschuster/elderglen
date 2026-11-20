import { describe, expect, it } from "vitest";
import { newGame, SAVE_VERSION, serialize } from "../src/core/save";
import { slotKey, slotStores, type KeyValue } from "../src/core/slots";
import { saveNight } from "../src/core/records";
import { DEFAULT_HOST_OPTIONS } from "../src/net/hostoptions";
import {
  firstEmptySlot,
  hostChoices,
  hostableSlots,
  planHost,
} from "../src/net/hostworld";
import { startHostSession } from "../src/net/session";
import { NodePipe } from "../src/net/pipe-node";
import { LOCAL_PLAYER } from "../src/core/players";

function memory(): KeyValue {
  const data = new Map<string, string>();
  return {
    get: (k) => data.get(k) ?? null,
    set: (k, v) => (data.set(k, v), true),
    remove: (k) => void data.delete(k),
  };
}

describe("planHost", () => {
  it("hosts a slot's saved state and keeps its wallet mode", () => {
    const kv = memory();
    const g = newGame(undefined, "separate");
    g.money = 4321;
    saveNight(slotStores(kv, 2), g);
    const plan = planHost(kv, { kind: "slot", slot: 2 }, DEFAULT_HOST_OPTIONS);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.slot).toBe(2);
    expect(plan.isNew).toBe(false);
    expect(plan.state.players.walletMode).toBe("separate");
    expect(plan.state.money).toBe(4321);
  });

  it("refuses a corrupt save, a newer save and an empty slot", () => {
    const kv = memory();
    kv.set(slotKey(1), "{not json");
    kv.set(slotKey(2), JSON.stringify({ version: SAVE_VERSION + 1 }));
    const bad = (slot: number) =>
      planHost(kv, { kind: "slot", slot }, DEFAULT_HOST_OPTIONS);
    expect(bad(1)).toMatchObject({ ok: false });
    const newer = bad(2);
    expect(newer.ok === false && newer.message).toMatch(/newer version/);
    expect(bad(3)).toMatchObject({ ok: false });
    // Nothing was overwritten.
    expect(kv.get(slotKey(2))).toContain(String(SAVE_VERSION + 1));
  });

  it("starts a new farm with the chosen wallet mode in the first empty slot", () => {
    const kv = memory();
    saveNight(slotStores(kv, 1), newGame());
    const plan = planHost(kv, { kind: "new" }, { walletMode: "separate" });
    expect(plan.ok && plan.slot).toBe(2);
    expect(plan.ok && plan.isNew).toBe(true);
    expect(plan.ok && plan.state.players.walletMode).toBe("separate");
  });

  it("refuses a new farm when every slot is used", () => {
    const kv = memory();
    for (let n = 1; n <= 20; n++) kv.set(slotKey(n), serialize(newGame()));
    expect(firstEmptySlot(kv)).toBeUndefined();
    expect(planHost(kv, { kind: "new" }, DEFAULT_HOST_OPTIONS).ok).toBe(false);
  });

  it("lists a new farm then the used slots", () => {
    const kv = memory();
    saveNight(slotStores(kv, 3), newGame());
    expect(hostableSlots(kv)).toEqual([3]);
    expect(hostChoices(kv)).toEqual([
      { kind: "new" },
      { kind: "slot", slot: 3 },
    ]);
  });

  it("hosts the played state itself, so the room judges what the host plays", async () => {
    const kv = memory();
    const g = newGame();
    g.money = 777;
    saveNight(slotStores(kv, 1), g);
    const plan = planHost(kv, { kind: "slot", slot: 1 }, DEFAULT_HOST_OPTIONS);
    if (!plan.ok) throw new Error("plan");
    const session = await startHostSession(plan.state, {
      makePipe: () => new NodePipe(),
      announceName: plan.announceName,
    });
    try {
      expect(session.world.g).toBe(plan.state);
      expect(session.localId).toBe(LOCAL_PLAYER);
    } finally {
      session.close();
    }
  });
});
