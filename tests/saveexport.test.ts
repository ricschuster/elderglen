import { describe, expect, it } from "vitest";
import { saveNight, saveResume } from "../src/core/records";
import {
  MAX_IMPORT_BYTES,
  applyImport,
  exportSlot,
  parseImport,
} from "../src/core/saveexport";
import { newGame, serialize, SAVE_VERSION } from "../src/core/save";
import { prevKey, resumeKey, slotKey, slotStores } from "../src/core/slots";
import type { KeyValue } from "../src/core/slots";

function memory() {
  const data = new Map<string, string>();
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

function gameOn(day: number, money: number) {
  const g = newGame();
  g.day.restore(day, 300);
  g.money = money;
  return g;
}

function filled() {
  const kv = memory();
  const s = slotStores(kv, 2);
  saveNight(s, gameOn(3, 100));
  saveResume(s, gameOn(3, 250), { map: "farm", x: 2, y: 2 });
  return { kv, s };
}

describe("export", () => {
  it("holds both records, named by slot and day", () => {
    const { s } = filled();
    const r = exportSlot(s, 2, 1788000000000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.filename).toBe("elderglen-slot-2-day-3.json");
    const file = JSON.parse(r.text);
    expect(file).toMatchObject({
      format: "elderglen-export",
      exportVersion: 1,
      game: SAVE_VERSION,
      exportedAt: 1788000000000,
    });
    expect(file.night.money).toBe(100);
    expect(file.resume.money).toBe(250);
  });

  it("leaves out a resume that is stale or unreadable", () => {
    const { kv, s } = filled();
    kv.data.set(resumeKey(2), serialize(gameOn(2, 1)));
    const r = exportSlot(s, 2, 0);
    expect(r.ok && JSON.parse(r.text).resume).toBeUndefined();
  });

  it("refuses an empty slot or one with an unreadable night", () => {
    const kv = memory();
    expect(exportSlot(slotStores(kv, 1), 1, 0).ok).toBe(false);
    const { kv: kv2, s } = filled();
    kv2.data.set(slotKey(2), "garbage");
    expect(exportSlot(s, 2, 0).ok).toBe(false);
  });
});

describe("import", () => {
  it("round-trips an export into another slot", () => {
    const { s } = filled();
    const exp = exportSlot(s, 2, 0);
    if (!exp.ok) throw new Error("export failed");
    const parsed = parseImport(exp.text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.droppedResume).toBe(false);
    const kv = memory();
    const target = slotStores(kv, 4);
    expect(applyImport(target, parsed)).toBe(true);
    expect(parsed.game.money).toBe(100);
    expect(kv.data.has(resumeKey(4))).toBe(true);
  });

  it("rejects each bad file with its message", () => {
    const good = JSON.parse(
      (() => {
        const r = exportSlot(filled().s, 2, 0);
        if (!r.ok) throw new Error("x");
        return r.text;
      })(),
    );
    const msg = (t: string) => {
      const r = parseImport(t);
      return r.ok ? "ok" : r.message;
    };
    expect(msg("")).toBe("That file is not an Elderglen save.");
    expect(msg("{")).toBe("That file is not an Elderglen save.");
    expect(msg("[]")).toBe("That file is not an Elderglen save.");
    expect(msg("null")).toBe("That file is not an Elderglen save.");
    expect(msg(JSON.stringify({ ...good, format: "other" }))).toBe(
      "That file is not an Elderglen save.",
    );
    expect(msg(JSON.stringify({ ...good, exportVersion: 2 }))).toBe(
      "That file is from a newer version of the game.",
    );
    expect(msg(JSON.stringify({ ...good, game: SAVE_VERSION + 1 }))).toBe(
      "That file is from a newer version of the game.",
    );
    expect(msg(JSON.stringify({ ...good, night: { version: 3 } }))).toBe(
      "That save could not be read.",
    );
    expect(msg(JSON.stringify({ ...good, night: null }))).toBe(
      "That save could not be read.",
    );
    expect(parseImport("{}", MAX_IMPORT_BYTES + 1).ok).toBe(false);
  });

  it("drops a bad or other-day resume and still imports the night", () => {
    const { s } = filled();
    const exp = exportSlot(s, 2, 0);
    if (!exp.ok) throw new Error("export failed");
    const file = JSON.parse(exp.text);
    for (const resume of [
      { version: 3 },
      JSON.parse(serialize(gameOn(9, 1))),
    ]) {
      const r = parseImport(JSON.stringify({ ...file, resume }));
      expect(r.ok && r.droppedResume).toBe(true);
      expect(r.ok && r.resume).toBeUndefined();
    }
  });

  it("writes clear, night, resume, so a refusal never half-applies", () => {
    const { s } = filled();
    const exp = exportSlot(s, 2, 0);
    if (!exp.ok) throw new Error("export failed");
    const parsed = parseImport(exp.text);
    if (!parsed.ok) throw new Error("parse failed");

    // The target holds an older game with its own resume.
    const kv = memory();
    const t = slotStores(kv, 1);
    saveNight(t, gameOn(1, 5));
    saveResume(t, gameOn(1, 6));
    const oldNight = kv.data.get(slotKey(1));

    // Night refused: the old night stays, the resume is already cleared.
    kv.refuse.add(slotKey(1));
    expect(applyImport(t, parsed)).toBe(false);
    expect(kv.data.get(slotKey(1))).toBe(oldNight);
    expect(kv.data.has(resumeKey(1))).toBe(false);
    kv.refuse.clear();

    // Resume refused: the new night is in, with no resume. Still coherent.
    kv.refuse.add(resumeKey(1));
    expect(applyImport(t, parsed)).toBe(false);
    expect(kv.data.get(slotKey(1))).toBe(parsed.night);
    expect(kv.data.has(resumeKey(1))).toBe(false);
    // The replaced night is kept as the previous record.
    expect(kv.data.get(prevKey(1))).toBe(oldNight);
  });

  it("fails the read-back check when the store alters what it kept", () => {
    const { s } = filled();
    const exp = exportSlot(s, 2, 0);
    if (!exp.ok) throw new Error("export failed");
    const parsed = parseImport(exp.text);
    if (!parsed.ok) throw new Error("parse failed");
    const lying = {
      read: () => "something else",
      write: () => true,
      clear: () => undefined,
    };
    expect(
      applyImport({ night: lying, resume: lying, prev: lying }, parsed),
    ).toBe(false);
  });
});
