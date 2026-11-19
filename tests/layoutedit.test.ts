import { describe, expect, it } from "vitest";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mapFiles } from "../src/content/maps";
import {
  SAVE_ROUTE,
  addObject,
  deleteObject,
  moveObject,
  pasteObject,
  renameObject,
  saveProblems,
  setObjectProperty,
  textHash,
} from "../src/core/layoutedit";
import { MapRegistry } from "../src/core/maps";
import { LayoutStore } from "../src/layout/devserver";
import { formatMap } from "../src/layout/mapformat";
import type { TiledMapJson } from "../src/core/map";

const dir = "src/content/maps";
const objectLayer = (j: TiledMapJson) =>
  j.layers.findIndex((l) => l.type === "objectgroup");

describe("file fidelity", () => {
  it("loads and saves every committed map unchanged", async () => {
    const names = readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(names.length).toBeGreaterThan(30);
    const bad: string[] = [];
    for (const f of names) {
      const text = readFileSync(`${dir}/${f}`, "utf8");
      if ((await formatMap(".", JSON.parse(text), text)) !== text) bad.push(f);
    }
    expect(bad).toEqual([]);
  }, 60_000);

  it("an edit changes only that object in the file text", async () => {
    const j = mapFiles["hall"]!;
    const tiledText = readFileSync(`${dir}/hall.json`, "utf8");
    const li = objectLayer(j);
    const moved = moveObject(j, { layer: li, index: 0 }, 1, 0);
    const a = (await formatMap(".", j, tiledText)).split("\n");
    const b = (await formatMap(".", moved, tiledText)).split("\n");
    expect(b.length).toBe(a.length);
    expect(a.filter((line, i) => line !== b[i]).length).toBe(1);
  });

  it("hashes text, so an outside change is noticed", () => {
    expect(textHash("a")).not.toBe(textHash("b"));
    expect(textHash("a")).toBe(textHash("a"));
  });
});

describe("object edits", () => {
  const j = mapFiles["hall"]!;
  const li = objectLayer(j);
  const first = j.layers[li]!.objects![0]!;

  it("moves, renames, sets properties and deletes without touching the input", () => {
    const before = JSON.stringify(j);
    const moved = moveObject(j, { layer: li, index: 0 }, 2, -1);
    expect(moved.layers[li]!.objects![0]!.x).toBe(first.x + 32);
    expect(moved.layers[li]!.objects![0]!.y).toBe(first.y - 16);
    const renamed = renameObject(j, { layer: li, index: 0 }, "other");
    expect(renamed.layers[li]!.objects![0]!.name).toBe("other");
    const withProp = setObjectProperty(
      j,
      { layer: li, index: 0 },
      "requires",
      "x",
    );
    expect(
      withProp.layers[li]!.objects![0]!.properties!.find(
        (p) => p.name === "requires",
      )?.value,
    ).toBe("x");
    const gone = setObjectProperty(
      withProp,
      { layer: li, index: 0 },
      "requires",
      "",
    );
    expect(gone.layers[li]!.objects![0]!.properties).toEqual(first.properties);
    const del = deleteObject(j, { layer: li, index: 0 });
    expect(del.layers[li]!.objects!.length).toBe(
      j.layers[li]!.objects!.length - 1,
    );
    expect(JSON.stringify(j)).toBe(before);
  });

  it("adds an object with a fresh id and pastes a copy", () => {
    const added = addObject(j, li, "forage", "f1", 5, 6);
    const o = added.layers[li]!.objects!.at(-1)! as unknown as {
      id: number;
      x: number;
    };
    expect(o.id).toBeGreaterThan(95);
    expect(o.x).toBe(5 * 16 + 8);
    const pasted = pasteObject(added, li, first, 9, 9);
    const p = pasted.layers[li]!.objects!.at(-1)! as unknown as {
      id: number;
      x: number;
    };
    expect(p.id).toBeGreaterThan(o.id);
    expect(Math.floor(p.x / 16)).toBe(9);
  });
});

describe("hard checks at save", () => {
  it("the committed maps pass, with the pair check included", () => {
    expect(saveProblems(mapFiles, "hall", mapFiles["hall"]!)).toEqual([]);
  });

  it("refuses a bad id and an unknown map", () => {
    expect(saveProblems(mapFiles, "../x", mapFiles["hall"]!).length).toBe(1);
    expect(saveProblems(mapFiles, "nope", mapFiles["hall"]!).length).toBe(1);
  });

  it("refuses an edit that breaks the map itself", () => {
    const j = mapFiles["hall"]!;
    const li = objectLayer(j);
    const idx = j.layers[li]!.objects!.findIndex((o) => o.class === "exit");
    const bad = setObjectProperty(
      j,
      { layer: li, index: idx },
      "map",
      "nowhere",
    );
    expect(saveProblems(mapFiles, "hall", bad).join()).toContain("nowhere");
  });

  it("catches a change that breaks another map's exit", () => {
    // Remove an entry another map leads to: the problem is reported against
    // the other map, which was not edited.
    const files = mapFiles;
    const reg = MapRegistry.fromTiled(files);
    const farm = reg.get("farm");
    const exit = farm.exits.find((e) => e.map !== "")!;
    const target = files[exit.map]!;
    const li = objectLayer(target);
    const idx = target.layers[li]!.objects!.findIndex(
      (o) => o.class === "entry" && o.name === exit.entry,
    );
    const bad = deleteObject(target, { layer: li, index: idx });
    const problems = saveProblems(files, exit.map, bad);
    expect(problems.some((p) => p.startsWith("farm"))).toBe(true);
  });

  it("the pair check fails an entry far from the exit back and passes a near one", () => {
    const reg = MapRegistry.fromTiled(mapFiles);
    expect(reg.pairProblems()).toEqual([]);
    expect(reg.pairProblems(-1).length).toBeGreaterThan(0);
  });

  it("flags an entry moved far from the exit back", () => {
    const exit = MapRegistry.fromTiled(mapFiles)
      .get("hall")
      .exits.find((e) => e.map !== "")!;
    const target = mapFiles[exit.map]!;
    const li = objectLayer(target);
    const idx = target.layers[li]!.objects!.findIndex(
      (o) => o.class === "entry" && o.name === exit.entry,
    );
    const far = moveObject(target, { layer: li, index: idx }, 0, 0);
    // Place the entry in the far corner of the target map.
    const o = far.layers[li]!.objects![idx]!;
    o.x = (target.width - 1) * 16;
    o.y = (target.height - 1) * 16;
    const reg = MapRegistry.fromTiled({ ...mapFiles, [exit.map]: far });
    expect(reg.pairProblems().join()).toContain(`exit "${exit.id}"`);
  });

  it("the save route has a fixed dev path", () => {
    expect(SAVE_ROUTE).toBe("/__layout/save");
  });
});

describe("the dev store", () => {
  const sandbox = () => {
    const root = mkdtempSync(join(tmpdir(), "layout-store-"));
    mkdirSync(join(root, "src/content"), { recursive: true });
    cpSync(dir, join(root, dir), { recursive: true });
    writeFileSync(join(root, ".prettierrc"), '{ "proseWrap": "preserve" }');
    return root;
  };
  const edit = (json: TiledMapJson, cls: string) => {
    const li = objectLayer(json);
    const idx = json.layers[li]!.objects!.findIndex((o) => o.class === cls);
    return { li, idx };
  };

  it("saves a passing edit, formatted, and only that file", async () => {
    const root = sandbox();
    const store = new LayoutStore(root);
    const { text, hash } = store.read("hall");
    const json = JSON.parse(text) as TiledMapJson;
    const { li, idx } = edit(json, "exit");
    const r = await store.save(
      "hall",
      renameObject(json, { layer: li, index: idx }, "renamed"),
      hash,
    );
    expect(r.ok).toBe(true);
    const after = readFileSync(join(root, dir, "hall.json"), "utf8");
    expect(after).toContain("renamed");
    expect(after.split("\n").length).toBe(text.split("\n").length);
    expect(existsSync(join(root, ".layout-drafts/hall.json"))).toBe(false);
  });

  it("refuses a failing map and writes nothing", async () => {
    const root = sandbox();
    const store = new LayoutStore(root);
    const { text, hash } = store.read("hall");
    const json = JSON.parse(text) as TiledMapJson;
    const { li, idx } = edit(json, "exit");
    const bad = setObjectProperty(
      json,
      { layer: li, index: idx },
      "map",
      "nowhere",
    );
    const r = await store.save("hall", bad, hash);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems?.join()).toContain("nowhere");
    expect(readFileSync(join(root, dir, "hall.json"), "utf8")).toBe(text);
  });

  it("refuses a stale hash", async () => {
    const root = sandbox();
    const store = new LayoutStore(root);
    const { text, hash } = store.read("hall");
    writeFileSync(join(root, dir, "hall.json"), text + "\n");
    const r = await store.save("hall", JSON.parse(text), hash);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });

  it("keeps and returns a draft, and refuses a bad id", () => {
    const root = sandbox();
    const store = new LayoutStore(root);
    store.draft("hall", mapFiles["hall"]!);
    expect(store.read("hall").draft).toBeDefined();
    store.draft("hall", null);
    expect(store.read("hall").draft).toBeUndefined();
    expect(() => store.read("../package")).toThrow();
  });
});
