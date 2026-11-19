import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mapFiles } from "../src/content/maps";
import { KNOWN_PAIR_GAPS, MapRegistry, PAIR_LIMIT } from "../src/core/maps";
import {
  allPairs,
  besideBy,
  overlayBy,
  pairText,
  pairView,
  parsePairProblem,
} from "../src/core/layoutpair";
import {
  DRAFTS_DIR,
  draftInfo,
  draftLabel,
  isDraftPath,
  parseDraft,
} from "../src/core/layoutdraft";
import { LayoutStore } from "../src/layout/devserver";
import { moveObject } from "../src/core/layoutedit";

const reg = MapRegistry.fromTiled(mapFiles);

describe("pair view", () => {
  it("agrees with the pair check on every committed pair", () => {
    const bad = allPairs(reg).filter((p) => p.status === "over");
    expect(bad.map(pairText)).toEqual([]);
    expect(reg.pairProblems()).toEqual([]);
  });

  it("shows each known gap with its tile distance", () => {
    for (const key of KNOWN_PAIR_GAPS) {
      const [id, exit] = key.split(":") as [string, string];
      const v = pairView(reg, id, exit)!;
      expect(v.status).toBe("known-gap");
      expect(v.gap).toBeGreaterThan(PAIR_LIMIT);
      expect(pairText(v)).toContain(`${v.gap} tiles`);
    }
  });

  it("lists the worst gap first and covers every exit", () => {
    const all = allPairs(reg);
    const n = reg.ids.reduce((s, id) => s + reg.get(id).exits.length, 0);
    expect(all).toHaveLength(n);
    const gaps = all.map((p) => p.gap ?? -1);
    expect(gaps).toEqual([...gaps].sort((a, b) => b - a));
  });

  it("reports an entry moved far from the exit back, and parses the problem line", () => {
    const files = structuredClone(mapFiles);
    const forest = files["forest"]!;
    const [li, oi] = (() => {
      for (let l = 0; l < forest.layers.length; l++) {
        const i = forest.layers[l]!.objects?.findIndex(
          (o) => o.class === "entry" && o.name === "from_farm",
        );
        if (i !== undefined && i >= 0) return [l, i];
      }
      throw new Error("no entry");
    })();
    files["forest"] = moveObject(forest, { layer: li, index: oi }, 0, -9);
    const bad = MapRegistry.fromTiled(files);
    const lines = bad.pairProblems();
    expect(lines.length).toBeGreaterThan(0);
    const p = parsePairProblem(lines[0]!)!;
    const v = pairView(bad, p.map, p.exit)!;
    expect(v.status).toBe("over");
    expect(v.gap).toBeGreaterThan(PAIR_LIMIT);
    expect(v.nearest).toBeDefined();
  });

  it("parses only pair problem lines", () => {
    expect(
      parsePairProblem(
        'farm: exit "to_forest" leads to entry "from_farm" on "forest", 9 tiles from its exit back (limit 4)',
      ),
    ).toEqual({ map: "farm", exit: "to_forest" });
    expect(parsePairProblem('farm: no entry "x"')).toBeUndefined();
  });

  it("places two maps beside or over each other", () => {
    const a = { width: 10, height: 8 };
    const b = { width: 6, height: 12 };
    expect(besideBy(a, b, 2)).toEqual({
      width: 18,
      height: 12,
      a: { x: 0, y: 0 },
      b: { x: 12, y: 0 },
    });
    expect(overlayBy(a, b, { x: 2, y: 1 })).toMatchObject({
      width: 10,
      height: 13,
      a: { x: 0, y: 0 },
      b: { x: 2, y: 1 },
    });
    expect(overlayBy(a, b, { x: -3, y: 0 })).toMatchObject({
      width: 13,
      a: { x: 3, y: 0 },
      b: { x: 0, y: 0 },
    });
  });
});

describe("draft viewer", () => {
  const store = new LayoutStore(".");
  it("lists the drafts and reads one as a map", () => {
    const list = store.listDrafts();
    expect(list).toContain(`${DRAFTS_DIR}/interiors-draft/inn.tmj`);
    expect(list).toContain(`${DRAFTS_DIR}/farm-draft/farm-draft.tmj`);
    expect(list.every(isDraftPath)).toBe(true);
    const inn = parseDraft(
      store.readDraftFile(list.find((p) => p.endsWith("/inn.tmj"))!),
    );
    expect(inn.width).toBe(44);
    expect(draftInfo(inn)).toContain("44 by 32");
    expect(draftLabel(`${DRAFTS_DIR}/interiors-draft/inn.tmj`)).toBe(
      "interiors-draft/inn",
    );
  });

  it("parses every draft in the folder", () => {
    for (const p of store.listDrafts())
      expect(() => parseDraft(store.readDraftFile(p))).not.toThrow();
  });

  it("refuses paths outside the drafts folder", () => {
    for (const p of [
      "package.json",
      "src/content/maps/farm.json",
      `${DRAFTS_DIR}/../../../package.json`,
      `${DRAFTS_DIR}/interiors-draft/tiles.png`,
      "/etc/passwd",
    ]) {
      expect(isDraftPath(p)).toBe(false);
      expect(() => store.readDraftFile(p)).toThrow();
    }
  });

  it("rejects text that is not a Tiled map and finds no drafts in an empty root", () => {
    expect(() => parseDraft("nope")).toThrow("not JSON");
    expect(() => parseDraft("{}")).toThrow("not a Tiled map");
    const root = mkdtempSync(join(tmpdir(), "draft-"));
    expect(new LayoutStore(root).listDrafts()).toEqual([]);
    mkdirSync(join(root, DRAFTS_DIR), { recursive: true });
    writeFileSync(join(root, DRAFTS_DIR, "a.tmj"), "{}");
    expect(new LayoutStore(root).listDrafts()).toEqual([`${DRAFTS_DIR}/a.tmj`]);
  });
});
