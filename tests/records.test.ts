import { describe, expect, it } from "vitest";
import {
  ResumeGate,
  clearSlot,
  loadSlot,
  restartDay,
  saveNight,
  saveResume,
  type RecordStore,
  type SlotStores,
} from "../src/core/records";
import { deserialize, newGame, serialize } from "../src/core/save";
import {
  deleteSlot,
  prevKey,
  resumeKey,
  resumeLine,
  slotInfo,
  slotKey,
  slotNote,
  slotStores,
  type KeyValue,
} from "../src/core/slots";
import { respawnAreaForage } from "../src/core/areas";
import { ARTIFACT_AREAS } from "../src/core/artifacts";
import { enterArea, leaveArea } from "../src/core/areas";
import { DEFAULT_FARM_TYPE, farmTypeById } from "../src/core/farmtypes";
import { maps } from "../src/content/maps";

function memory(start: Record<string, string> = {}) {
  const data = new Map(Object.entries(start));
  const refuse = new Set<string>();
  const kv: KeyValue & { data: Map<string, string>; refuse: Set<string> } = {
    data,
    refuse,
    get: (k) => data.get(k) ?? null,
    set: (k, v) => {
      if (refuse.has(k)) return false;
      data.set(k, v);
      return true;
    },
    remove: (k) => void data.delete(k),
  };
  return kv;
}

/** A game on a given day, with some gold so records can be told apart. */
function gameOn(day: number, money: number, minutes?: number) {
  const g = newGame();
  g.day.restore(day, 300, minutes);
  g.money = money;
  return g;
}

describe("night and resume records", () => {
  it("round-trips a night then a resume, and plays the resume", () => {
    const kv = memory();
    const s = slotStores(kv, 1);
    expect(saveNight(s, gameOn(3, 100)).ok).toBe(true);
    expect(saveResume(s, gameOn(3, 250, 14 * 60 + 40)).ok).toBe(true);
    const slot = loadSlot(s);
    expect(slot.status).toBe("used");
    if (slot.status !== "used") return;
    expect(slot.night?.money).toBe(100);
    expect(slot.resume?.money).toBe(250);
    expect(slot.play.money).toBe(250);
    expect(slot.play.day.clock.minutes).toBe(14 * 60 + 40);
    expect(slot.note).toBeUndefined();
    expect(kv.data.has(slotKey(1))).toBe(true);
    expect(kv.data.has(resumeKey(1))).toBe(true);
  });

  it("is empty with no records and broken when neither reads", () => {
    const kv = memory();
    expect(loadSlot(slotStores(kv, 1)).status).toBe("empty");
    kv.data.set(slotKey(1), "not json");
    kv.data.set(resumeKey(1), "{");
    expect(loadSlot(slotStores(kv, 1)).status).toBe("broken");
    expect(slotInfo(kv, 1).status).toBe("broken");
  });

  it("a resume is valid only if its day is the night's day", () => {
    const kv = memory();
    const s = slotStores(kv, 1);
    saveNight(s, gameOn(3, 100));
    saveResume(s, gameOn(3, 250));
    // Sleeping advanced the night to day 4 but the kill came before the clear.
    s.night.write(serialize(gameOn(4, 100), undefined));
    const slot = loadSlot(s);
    if (slot.status !== "used") throw new Error("not used");
    expect(slot.resume).toBeUndefined();
    expect(slot.play.day.clock.day).toBe(4);
    expect(slot.play.money).toBe(100);
    // A resume from a later day than the night is rejected too.
    s.resume.write(serialize(gameOn(9, 1)));
    const later = loadSlot(s);
    expect(later.status === "used" && later.resume).toBeUndefined();
    expect(later.status === "used" && later.note).toBeUndefined();
  });

  it("a resume with no night record is valid on its own", () => {
    const s = slotStores(memory(), 1);
    saveResume(s, gameOn(5, 77));
    const slot = loadSlot(s);
    expect(slot.status === "used" && slot.play.money).toBe(77);
    expect(slot.status === "used" && slot.night).toBeUndefined();
  });

  it("an unreadable resume plays the night and says so", () => {
    const kv = memory();
    const s = slotStores(kv, 1);
    saveNight(s, gameOn(3, 100));
    kv.data.set(resumeKey(1), '{"version":3,"da');
    const slot = loadSlot(s);
    if (slot.status !== "used") throw new Error("not used");
    expect(slot.play.money).toBe(100);
    expect(slot.resume).toBeUndefined();
    expect(slot.note).toBe("resume-unreadable");
    expect(slotNote(slot.note)).toMatch(/Continuing from the morning/);
  });

  it("an unreadable night plays the resume, and Restart is not offered", () => {
    const kv = memory();
    const s = slotStores(kv, 1);
    saveNight(s, gameOn(3, 100));
    saveResume(s, gameOn(3, 250));
    kv.data.set(slotKey(1), "garbage");
    const slot = loadSlot(s);
    if (slot.status !== "used") throw new Error("not used");
    expect(slot.play.money).toBe(250);
    expect(slot.note).toBe("night-unreadable");
    expect(restartDay(s)).toBeUndefined();
    // The resume record is left alone.
    expect(kv.data.has(resumeKey(1))).toBe(true);
  });

  it("a record from a newer build is refused as newer, not a crash", () => {
    const kv = memory();
    const raw = JSON.parse(serialize(newGame()));
    raw.version = 99;
    kv.data.set(slotKey(1), JSON.stringify(raw));
    expect(loadSlot(slotStores(kv, 1)).status).toBe("newer");
  });
});

describe("sleeping and the night write", () => {
  it("clears the resume and keeps the old night as the previous one", () => {
    const kv = memory();
    const s = slotStores(kv, 1);
    saveNight(s, gameOn(3, 100));
    saveResume(s, gameOn(3, 250));
    const old = kv.data.get(slotKey(1));
    saveNight(s, gameOn(4, 300));
    expect(kv.data.has(resumeKey(1))).toBe(false);
    expect(kv.data.get(prevKey(1))).toBe(old);
    expect(deserialize(kv.data.get(slotKey(1))!)?.money).toBe(300);
    // Two nights on, the previous record is the night before the latest.
    saveNight(s, gameOn(5, 400));
    expect(deserialize(kv.data.get(prevKey(1))!)?.money).toBe(300);
  });

  it("the first night write has no previous record", () => {
    const kv = memory();
    saveNight(slotStores(kv, 1), gameOn(1, 5));
    expect(kv.data.has(prevKey(1))).toBe(false);
  });

  it("a refused night write leaves the old resume and night alone", () => {
    const kv = memory();
    const s = slotStores(kv, 1);
    saveNight(s, gameOn(3, 100));
    saveResume(s, gameOn(3, 250));
    kv.refuse.add(slotKey(1));
    const r = saveNight(s, gameOn(4, 300));
    expect(r).toEqual({ ok: false, reason: "refused" });
    expect(kv.data.has(resumeKey(1))).toBe(true);
    expect(deserialize(kv.data.get(slotKey(1))!)?.day.clock.day).toBe(3);
  });

  it("a refused resume write reports it and breaks nothing", () => {
    const kv = memory();
    const s = slotStores(kv, 1);
    saveNight(s, gameOn(3, 100));
    kv.refuse.add(resumeKey(1));
    expect(saveResume(s, gameOn(3, 250))).toEqual({
      ok: false,
      reason: "refused",
    });
    const slot = loadSlot(s);
    expect(slot.status === "used" && slot.play.money).toBe(100);
  });

  it("a new game written over a used slot drops its resume", () => {
    const kv = memory();
    const s = slotStores(kv, 1);
    saveNight(s, gameOn(8, 900));
    saveResume(s, gameOn(8, 950));
    saveNight(s, newGame());
    const slot = loadSlot(s);
    expect(slot.status === "used" && slot.resume).toBeUndefined();
    expect(slot.status === "used" && slot.play.day.clock.day).toBe(1);
  });

  it("deleting a slot removes all three records and only that slot", () => {
    const kv = memory();
    for (const n of [1, 2]) {
      const s = slotStores(kv, n);
      saveNight(s, gameOn(3, 1));
      saveNight(s, gameOn(4, 2));
      saveResume(s, gameOn(4, 3));
    }
    deleteSlot(kv, 1);
    for (const k of [slotKey(1), resumeKey(1), prevKey(1)])
      expect(kv.data.has(k)).toBe(false);
    expect(slotInfo(kv, 2).status).toBe("used");
    expect(kv.data.has(prevKey(2))).toBe(true);
  });

  it("clearSlot empties a store set", () => {
    const kv = memory();
    const s = slotStores(kv, 3);
    saveNight(s, gameOn(2, 1));
    clearSlot(s);
    expect(loadSlot(s).status).toBe("empty");
  });
});

describe("Restart this day", () => {
  it("drops the resume and hands back the night", () => {
    const kv = memory();
    const s = slotStores(kv, 1);
    saveNight(s, gameOn(3, 100));
    saveResume(s, gameOn(3, 250, 15 * 60));
    const night = restartDay(s);
    expect(night?.money).toBe(100);
    expect(night?.day.clock.minutes).toBe(6 * 60);
    expect(kv.data.has(resumeKey(1))).toBe(false);
    expect(restartDay(s)).toBeUndefined();
  });

  it("is not offered with no resume, or only a stale one", () => {
    const kv = memory();
    const s = slotStores(kv, 1);
    saveNight(s, gameOn(3, 100));
    expect(restartDay(s)).toBeUndefined();
    kv.data.set(resumeKey(1), serialize(gameOn(2, 1)));
    expect(restartDay(s)).toBeUndefined();
  });

  it("never touches another slot", () => {
    const kv = memory();
    for (const n of [1, 2]) {
      saveNight(slotStores(kv, n), gameOn(3, n));
      saveResume(slotStores(kv, n), gameOn(3, n * 10));
    }
    restartDay(slotStores(kv, 1));
    expect(kv.data.has(resumeKey(2))).toBe(true);
  });
});

describe("saves from before the split", () => {
  /** An old-shape record: no kind, savedAt, at or forage. */
  function oldRecord(minutes = 15 * 60) {
    const raw = JSON.parse(serialize(gameOn(6, 321, minutes)));
    delete raw.kind;
    delete raw.savedAt;
    delete raw.at;
    delete raw.forage;
    for (const a of Object.values(raw.areas ?? {}))
      delete (a as { forage?: unknown }).forage;
    return JSON.stringify(raw);
  }

  it("loads as the night record and Continue plays it", () => {
    const kv = memory({ [slotKey(1)]: oldRecord() });
    const slot = slotInfo(kv, 1);
    if (slot.status !== "used") throw new Error("not used");
    expect(slot.night?.money).toBe(321);
    expect(slot.resume).toBeUndefined();
    expect(slot.game.money).toBe(321);
    expect(slot.note).toBeUndefined();
  });

  it("an old save Exit wrote mid-day loads as the morning, Restart hidden", () => {
    const kv = memory({ [slotKey(1)]: oldRecord(16 * 60) });
    const s = slotStores(kv, 1);
    expect(restartDay(s)).toBeUndefined();
    const slot = loadSlot(s);
    // Its clock is as Exit left it: the old data allows no better.
    expect(slot.status === "used" && slot.play.day.clock.minutes).toBe(16 * 60);
  });

  it("the first resume write leaves the night key's bytes unchanged", () => {
    const text = oldRecord();
    const kv = memory({ [slotKey(1)]: text });
    const s = slotStores(kv, 1);
    const g = deserialize(text)!;
    g.money += 50;
    saveResume(s, g, { map: g.farmType ? "farm" : "farm", x: 3, y: 3 });
    expect(kv.data.get(slotKey(1))).toBe(text);
    const slot = loadSlot(s);
    expect(slot.status === "used" && slot.play.money).toBe(371);
    // Restart then goes back to that old record.
    expect(restartDay(s)?.money).toBe(321);
  });

  it("has no forage field, so it is not marked loaded", () => {
    const g = deserialize(oldRecord())!;
    expect(g.forage.loaded).toBe(false);
    expect(g.at).toBeUndefined();
  });

  it("an old cellar marker still reads", () => {
    const raw = JSON.parse(oldRecord());
    raw.resumeMap = "cellar";
    expect(deserialize(JSON.stringify(raw))!.resumeMap).toBe("cellar");
  });
});

describe("the player's tile", () => {
  it("is written on a resume record and read back", () => {
    const s = slotStores(memory(), 1);
    saveResume(s, gameOn(2, 1), { map: "farm", x: 4, y: 5 });
    const slot = loadSlot(s);
    expect(slot.status === "used" && slot.play.at).toEqual({
      map: "farm",
      x: 4,
      y: 5,
    });
  });

  it("is omitted when there is none, as in the mines", () => {
    const s = slotStores(memory(), 1);
    saveResume(s, gameOn(2, 1));
    const slot = loadSlot(s);
    expect(slot.status === "used" && slot.play.at).toBeUndefined();
  });

  it("a night record carries no tile", () => {
    const raw = JSON.parse(serialize(gameOn(2, 1), { kind: "night" }));
    expect(raw.at).toBeUndefined();
    expect(raw.kind).toBe("night");
    expect(typeof raw.savedAt).toBe("number");
  });

  it("a bad tile is dropped, not fatal", () => {
    const base = JSON.parse(serialize(gameOn(2, 1), { kind: "resume" }));
    for (const at of [
      { map: "nowhere", x: 1, y: 1 },
      { map: "farm", x: -1, y: 1 },
      { map: "farm", x: 1.5, y: 1 },
      { map: "farm", x: 9999, y: 1 },
      { map: 4, x: 1, y: 1 },
      "farm",
    ]) {
      const g = deserialize(JSON.stringify({ ...base, at }));
      expect(g, JSON.stringify(at)).toBeDefined();
      expect(g!.at, JSON.stringify(at)).toBeUndefined();
    }
  });
});

describe("the day's forage is stored", () => {
  const farmSpots = () =>
    maps.get(farmTypeById(DEFAULT_FARM_TYPE).map).forageSpots;

  it("is identical after save and load, farm and areas", () => {
    const g = newGame();
    g.forage.respawn("spring", farmSpots(), () => 0.9);
    respawnAreaForage(g, () => 0.9);
    const before = [...g.forage.each()];
    expect(before.length).toBeGreaterThan(0);
    const areaBefore = Object.entries(g.areas).map(([id, w]) => [
      id,
      [...w.forage.each()],
    ]);
    const back = deserialize(serialize(g))!;
    expect(back.forage.loaded).toBe(true);
    expect([...back.forage.each()]).toEqual(before);
    for (const [id, list] of areaBefore)
      expect([...back.areas[id as string]!.forage.each()]).toEqual(list);
  });

  it("is saved from the farm even while standing in an area", () => {
    const g = newGame();
    g.forage.respawn("spring", farmSpots(), Math.random);
    const farm = [...g.forage.each()];
    const area = Object.keys(g.areas)[0]!;
    enterArea(g, area);
    const back = deserialize(serialize(g))!;
    expect([...back.forage.each()]).toEqual(farm);
    leaveArea(g);
  });

  it("a load does not roll it again, a missing field does", () => {
    const g = newGame();
    g.forage.respawn("spring", farmSpots(), () => 0.5);
    respawnAreaForage(g, () => 0.5);
    const back = deserialize(serialize(g))!;
    const before = [...back.forage.each()];
    const areaBefore = Object.values(back.areas).map((w) => [
      ...w.forage.each(),
    ]);
    // `keepLoaded` leaves every stored field as it was, whatever the dice say.
    respawnAreaForage(back, () => 0.01, true);
    expect([...back.forage.each()]).toEqual(before);
    expect(Object.values(back.areas).map((w) => [...w.forage.each()])).toEqual(
      areaBefore,
    );
    // Without the flag it rolls, as at the morning.
    const raw = JSON.parse(serialize(g));
    delete raw.forage;
    const old = deserialize(JSON.stringify(raw))!;
    expect(old.forage.loaded).toBe(false);
  });

  it("an empty stored field is still a stored field", () => {
    const g = newGame();
    const back = deserialize(serialize(g))!;
    expect(back.forage.loaded).toBe(true);
    expect(back.forage.count).toBe(0);
  });

  it("skips malformed entries", () => {
    const raw = JSON.parse(serialize(newGame()));
    raw.forage = [
      { x: 1, y: 2, id: "daffodil" },
      { x: "a", y: 2, id: "leek" },
      { x: 1, y: 1.5, id: "leek" },
      { x: 3, y: 3, id: 7 },
      null,
      "x",
    ];
    const g = deserialize(JSON.stringify(raw))!;
    expect([...g.forage.each()]).toEqual([{ x: 1, y: 2, id: "daffodil" }]);
  });

  it("the night record holds the morning's forage", () => {
    const g = gameOn(2, 5);
    g.forage.respawn("spring", farmSpots(), Math.random);
    const kv = memory();
    saveNight(slotStores(kv, 1), g);
    const slot = loadSlot(slotStores(kv, 1));
    expect(slot.status === "used" && slot.play.forage.save()).toEqual(
      g.forage.save(),
    );
  });
});

describe("the resume gate", () => {
  it("skips an unchanged state and a write under two seconds after one", () => {
    const gate = new ResumeGate(2000);
    expect(gate.shouldWrite("a", 0, false)).toBe(true);
    gate.wrote("a", 0);
    expect(gate.shouldWrite("a", 5000, false)).toBe(false);
    expect(gate.shouldWrite("b", 1000, false)).toBe(false);
    expect(gate.shouldWrite("b", 2000, false)).toBe(true);
  });

  it("a forced write always goes, and a seeded state counts as written", () => {
    const gate = new ResumeGate();
    gate.seed("morning");
    expect(gate.shouldWrite("morning", 99999, false)).toBe(false);
    expect(gate.shouldWrite("morning", 99999, true)).toBe(true);
    expect(gate.shouldWrite("noon", 99999, false)).toBe(true);
  });
});

describe("the title card text", () => {
  it("shows the clock and gold of a day in progress", () => {
    const g = gameOn(3, 1240, 14 * 60 + 40);
    expect(resumeLine(g)).toBe("Day in progress, 2:40 pm, 1,240g");
  });

  it("has no note when nothing failed", () => {
    expect(slotNote(undefined)).toBeUndefined();
  });
});

/** Compile check that a plain store satisfies the record interface. */
const _store: RecordStore = {
  read: () => null,
  write: () => true,
  clear: () => undefined,
};
const _stores: SlotStores = { night: _store, resume: _store, prev: _store };
void _stores;

describe("the day's artifact spots are stored", () => {
  it("a load keeps them, a morning roll does not", () => {
    const g = newGame();
    respawnAreaForage(g, () => 0.99);
    const spots = (s: typeof g) =>
      Object.fromEntries(
        ARTIFACT_AREAS.map((id) => [id, s.areas[id]!.spots.save()]),
      );
    const before = spots(g);
    expect(Object.values(before).some((l) => l.length > 0)).toBe(true);
    const back = deserialize(serialize(g))!;
    expect(spots(back)).toEqual(before);
    respawnAreaForage(back, () => 0.01, true);
    expect(spots(back)).toEqual(before);
    // The morning roll (no keepLoaded) draws again.
    respawnAreaForage(back, () => 0.01);
    expect(spots(back)).not.toEqual(before);
  });
});

describe("a save from a newer version", () => {
  const newer = (g = newGame()) =>
    JSON.stringify({ ...JSON.parse(serialize(g)), version: 999 });

  it("is refused with its own status, not 'broken'", () => {
    const kv = memory({ [slotKey(1)]: newer() });
    expect(loadSlot(slotStores(kv, 1))).toEqual({ status: "newer" });
    expect(deserialize(newer())).toBeUndefined();
  });

  it("is never overwritten by this build", () => {
    const text = newer();
    const kv = memory({ [slotKey(1)]: text });
    const stores = slotStores(kv, 1);
    expect(saveNight(stores, newGame()).ok).toBe(false);
    expect(saveResume(stores, newGame()).ok).toBe(false);
    expect(kv.get(slotKey(1))).toBe(text);
    expect(kv.get(resumeKey(1))).toBeNull();
  });

  it("a newer resume record alone also blocks play", () => {
    const kv = memory({
      [slotKey(1)]: serialize(newGame()),
      [resumeKey(1)]: newer(),
    });
    expect(loadSlot(slotStores(kv, 1)).status).toBe("newer");
  });
});
