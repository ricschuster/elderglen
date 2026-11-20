import {
  conditionsOf,
  maxTierOf,
  TREE_KINDS,
  WATER_KINDS,
  type TiledMapJson,
} from "../core/map";
import {
  BRUSHES,
  applyBrush,
  rectOf,
  type Brush,
  type Face,
} from "../core/layoutbrush";
import { ROCK_KINDS } from "../core/rocks";
import { MapRegistry } from "../core/maps";
import {
  CLASS_DEFAULTS,
  DRAFT_ROUTE,
  READ_ROUTE,
  SAVE_ROUTE,
  addObject,
  deleteObject,
  moveObject,
  pasteObject,
  renameObject,
  requiresChoices,
  setObjectProperty,
  type ObjectRef,
} from "../core/layoutedit";
import {
  CLASS_COLOURS,
  TILE_LAYERS,
  classColour,
  drawableTileLayers,
  groupProblems,
  isPlaceholder,
  mapKind,
  placedObjects,
  problemMapId,
  problemPlace,
  registryProblems,
  tileColour,
  viewBoxAt,
  type PlacedObject,
} from "../core/layoutview";
import {
  layoutWarnings,
  walkTime,
  type WalkTime,
} from "../core/layoutwarnings";
import {
  allPairs,
  besideBy,
  overlayBy,
  pairText,
  pairView,
  parsePairProblem,
  type PairView,
  type Placement,
} from "../core/layoutpair";
import {
  DRAFT_FILE_ROUTE,
  DRAFT_LIST_ROUTE,
  draftInfo,
  draftLabel,
  parseDraft,
} from "../core/layoutdraft";
import { mapFiles } from "../content/maps";

/**
 * The layout page (`docs/design/87_layout_page.md`): slice 1 the viewer, slice 2
 * object edit and save. Dev server only: `layout.html` is not a build input and
 * the save route exists under `vite serve` only. Placeholder look.
 */

const TILE = 16;

const state = {
  id: Object.keys(mapFiles).sort()[0] ?? "farm",
  zoom: 3,
  grid: true,
  layers: new Set<string>(TILE_LAYERS),
  objects: true,
  viewBox: true,
  tier: 0,
  holds: new Set<string>(),
  reachFrom: "",
  filter: "all",
  mouse: { x: 0, y: 0 },
  mark: undefined as { x: number; y: number } | undefined,
  sel: undefined as ObjectRef | undefined,
  drag: undefined as { x: number; y: number } | undefined,
  status: "",
  addClass: "forage",
  brush: "" as Brush | "",
  face: "s" as Face,
  interior: false,
  waterKind: "river",
  eraseLayer: "collision",
  timing: false,
  timePoints: [] as { x: number; y: number }[],
  paint: undefined as { x: number; y: number } | undefined,
  /** Slice 5: the map editor, the pair view, or the read-only draft viewer. */
  view: "map" as "map" | "pair" | "draft",
  pair: undefined as { from: string; exit: string } | undefined,
  draft: {
    paths: [] as string[],
    path: "",
    json: undefined as TiledMapJson | undefined,
    error: "",
    compare: "",
    mode: "alone" as "alone" | "beside" | "overlay",
    ox: 0,
    oy: 0,
  },
};

/** Working copies: the page edits these, never the imported files. */
const work: Record<string, TiledMapJson> = structuredClone(mapFiles);
/** File hash per map as opened, for the stale-file guard. */
const hashes: Record<string, string> = {};
const dirty = new Set<string>();
const history: Record<string, { undo: TiledMapJson[]; redo: TiledMapJson[] }> =
  {};
let clipboard: PlacedObject["raw"] | undefined;

const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>("canvas");
const ctx = canvas.getContext("2d")!;

let problems: string[] = [];
let byMap = groupProblems(problems);
let warnings: string[] = [];
let reg: MapRegistry | undefined;
const json = (): TiledMapJson => work[state.id]!;

/** Re-run the real checks on the working copies. Debounced: reading every map is not instant. */
let timer: ReturnType<typeof setTimeout> | undefined;
function recompute(now = false): void {
  clearTimeout(timer);
  const run = () => {
    problems = registryProblems(work);
    warnings = [];
    byMap = groupProblems(problems);
    try {
      reg = MapRegistry.fromTiled(work);
    } catch {
      reg = undefined;
    }
    if (reg) warnings = layoutWarnings(reg, work);
    renderList();
    renderProblems();
    draw();
  };
  if (now) run();
  else timer = setTimeout(run, 250);
}

const post = async (route: string, body: unknown): Promise<Response> =>
  fetch(route, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

/** Open a map's file: record its hash, offer an unsaved draft. */
async function open(id: string): Promise<void> {
  const r = await fetch(`${READ_ROUTE}?id=${id}`);
  if (!r.ok) return;
  const f = (await r.json()) as { hash: string; draft?: string };
  hashes[id] = f.hash;
  if (
    f.draft &&
    !dirty.has(id) &&
    confirm(`Restore the unsaved draft of ${id}?`)
  ) {
    work[id] = JSON.parse(f.draft) as TiledMapJson;
    dirty.add(id);
    recompute(true);
  }
}

const hist = (id = state.id) => (history[id] ??= { undo: [], redo: [] });

/** Apply an edit: keep the old map for undo, mark it unsaved, keep a draft. */
function commit(next: TiledMapJson): void {
  const h = hist();
  h.undo.push(json());
  h.redo = [];
  work[state.id] = next;
  dirty.add(state.id);
  void post(DRAFT_ROUTE, { id: state.id, json: next });
  renderSide();
  recompute();
  draw();
}

function undo(redo = false): void {
  const h = hist();
  const prev = (redo ? h.redo : h.undo).pop();
  if (!prev) return;
  (redo ? h.undo : h.redo).push(json());
  work[state.id] = prev;
  dirty.add(state.id);
  void post(DRAFT_ROUTE, { id: state.id, json: prev });
  renderSide();
  recompute();
}

async function save(): Promise<void> {
  const id = state.id;
  const r = await post(SAVE_ROUTE, {
    id,
    json: work[id],
    baseHash: hashes[id],
  });
  const res = (await r.json()) as {
    ok: boolean;
    hash?: string;
    error?: string;
    problems?: string[];
  };
  if (res.ok) {
    hashes[id] = res.hash!;
    dirty.delete(id);
    state.status = `saved ${id}`;
  } else if (r.status === 409) {
    state.status = res.error ?? "stale";
    if (confirm(`${res.error}\nReload ${id} from disk and drop your edits?`))
      await reload(id);
  } else {
    state.status = `refused: ${(res.problems ?? [res.error ?? "error"]).join(" | ")}`;
  }
  renderSide();
  renderList();
}

/** Re-read a map from disk, dropping edits. */
async function reload(id: string): Promise<void> {
  const r = await fetch(`${READ_ROUTE}?id=${id}`);
  if (!r.ok) return;
  const f = (await r.json()) as { text: string; hash: string };
  work[id] = JSON.parse(f.text) as TiledMapJson;
  hashes[id] = f.hash;
  dirty.delete(id);
  history[id] = { undo: [], redo: [] };
  void post(DRAFT_ROUTE, { id, json: null });
  state.sel = undefined;
  renderSide();
  recompute(true);
}

/** Window focus: pick up an edit made in Tiled when there is nothing unsaved. */
window.addEventListener("focus", () => {
  const id = state.id;
  if (dirty.has(id)) return;
  void fetch(`${READ_ROUTE}?id=${id}`)
    .then((r) => r.json())
    .then((f: { hash: string }) => {
      if (f.hash !== hashes[id]) void reload(id);
    });
});

function renderList(): void {
  const box = el("maps");
  box.innerHTML = "";
  const sel = document.createElement("select");
  for (const f of ["all", "outdoor", "interior", "festival"])
    sel.add(new Option(f, f, false, f === state.filter));
  sel.onchange = () => {
    state.filter = sel.value;
    renderList();
  };
  box.append(sel);
  const note = document.createElement("div");
  note.textContent = `${problems.length} problems in all`;
  box.append(note);
  for (const id of Object.keys(work).sort()) {
    const j = work[id]!;
    if (state.filter !== "all" && mapKind(id, j) !== state.filter) continue;
    const n = byMap.get(id)?.length ?? 0;
    const row = document.createElement("div");
    if (id === state.id) row.className = "sel";
    // Layout done is kept in the notes, not in the file, so the page shows
    // only the art flag (a map with `placeholder: true` is not art done).
    row.textContent = `${id} [${mapKind(id, j)[0]}] ${isPlaceholder(j) ? "" : "art "}${n > 0 ? `(${n})` : ""}${dirty.has(id) ? " *" : ""}`;
    if (n > 0) row.classList.add("bad");
    row.onclick = () => select(id);
    box.append(row);
  }
}

function select(id: string): void {
  state.id = id;
  state.tier = 0;
  state.holds = new Set();
  state.reachFrom = "";
  state.mark = undefined;
  state.sel = undefined;
  renderAll();
  void open(id);
}

function selectedObject(): PlacedObject | undefined {
  const s = state.sel;
  if (!s) return undefined;
  return placedObjects(json(), maxTierOf(json()), state.holds).find(
    (o) => o.layerIndex === s.layer && o.index === s.index,
  );
}

/** The values a property may take, when the contract limits them. */
function choicesFor(o: PlacedObject, prop: string): string[] | undefined {
  if (prop === "map") return Object.keys(work).sort();
  if (prop === "entry" && o.cls === "exit") {
    const target = work[String(o.properties["map"] ?? "")];
    return target
      ? placedObjects(target, maxTierOf(target))
          .filter((p) => p.cls === "entry")
          .map((p) => p.name)
      : [];
  }
  if (prop === "requires") return requiresChoices(work);
  if (prop === "kind" && o.cls === "water") return [...WATER_KINDS];
  if (prop === "kind" && o.cls === "tree") return [...TREE_KINDS];
  if (prop === "kind" && o.cls === "rock") return [...ROCK_KINDS];
  return undefined;
}

function renderInspector(side: HTMLElement): void {
  const o = selectedObject();
  const h = document.createElement("b");
  h.textContent = o
    ? `selected: ${o.cls} at ${o.x},${o.y}`
    : "nothing selected";
  side.append(document.createElement("hr"), h);
  if (!o) return;
  const ref = { layer: o.layerIndex, index: o.index };
  if (o.cls === "exit") {
    const b = document.createElement("button");
    b.textContent = "open pair view";
    b.onclick = () => openPair(state.id, o.name);
    side.append(b);
  }
  const row = (label: string, input: HTMLElement) => {
    const l = document.createElement("label");
    l.append(`${label} `, input);
    side.append(l);
  };
  const name = document.createElement("input");
  name.value = o.name;
  name.onchange = () => commit(renameObject(json(), ref, name.value));
  row("name", name);
  const names = new Set([
    ...Object.keys(CLASS_DEFAULTS[o.cls]?.props ?? {}),
    ...Object.keys(o.properties),
    "requires",
  ]);
  for (const prop of names) {
    const current = o.properties[prop];
    const text = current === undefined ? "" : String(current);
    const choices = choicesFor(o, prop);
    let input: HTMLInputElement | HTMLSelectElement;
    if (choices) {
      const sel = document.createElement("select");
      sel.add(new Option("(none)", "", false, text === ""));
      for (const c of choices) sel.add(new Option(c, c, false, c === text));
      // Keep a value the contract does not list, so it shows as a problem.
      if (text !== "" && !choices.includes(text))
        sel.add(new Option(`${text} (not allowed)`, text, true, true));
      input = sel;
    } else {
      input = document.createElement("input");
      input.value = text;
    }
    input.onchange = () =>
      commit(setObjectProperty(json(), ref, prop, input.value));
    row(prop, input);
  }
}

function renderSide(): void {
  const j = json();
  const side = el("side");
  side.innerHTML = "";
  const check = (label: string, on: boolean, set: (v: boolean) => void) => {
    const l = document.createElement("label");
    const c = document.createElement("input");
    c.type = "checkbox";
    c.checked = on;
    c.onchange = () => {
      set(c.checked);
      draw();
    };
    l.append(c, ` ${label}`);
    side.append(l);
  };
  const title = (t: string) => {
    const h = document.createElement("b");
    h.textContent = t;
    side.append(h);
  };
  const modes = document.createElement("div");
  for (const m of ["map", "pair", "draft"] as const) {
    const b = document.createElement("button");
    b.textContent = m === "map" ? "map" : m === "pair" ? "pair view" : "drafts";
    b.disabled = state.view === m;
    b.onclick = () => setView(m);
    modes.append(b);
  }
  side.append(modes);
  if (state.view === "pair") return renderPairSide(side);
  if (state.view === "draft") return renderDraftSide(side);
  title(
    `${state.id} ${j.width}x${j.height}${dirty.has(state.id) ? " (unsaved)" : ""}`,
  );
  const bar = document.createElement("div");
  const button = (label: string, fn: () => void) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = fn;
    bar.append(b);
  };
  button("save", () => void save());
  button("undo", () => undo());
  button("redo", () => undo(true));
  side.append(bar);
  if (state.status) {
    const s = document.createElement("div");
    s.textContent = state.status;
    side.append(s);
  }
  const add = document.createElement("div");
  const cls = document.createElement("select");
  for (const c of Object.keys(CLASS_DEFAULTS))
    cls.add(new Option(c, c, false, c === state.addClass));
  cls.onchange = () => (state.addClass = cls.value);
  const addButton = document.createElement("button");
  addButton.textContent = "add at mouse";
  addButton.onclick = () => addAtMouse();
  add.append(cls, addButton);
  side.append(add);
  const pal = document.createElement("div");
  pal.append("brush ");
  const brushSel = document.createElement("select");
  brushSel.add(new Option("none (select)", "", false, state.brush === ""));
  for (const b of BRUSHES)
    brushSel.add(new Option(b, b, false, b === state.brush));
  brushSel.onchange = () => {
    state.brush = brushSel.value as Brush | "";
    renderSide();
  };
  pal.append(brushSel);
  const choose = (opts: string[], now: string, set: (v: string) => void) => {
    const s = document.createElement("select");
    for (const o of opts) s.add(new Option(o, o, false, o === now));
    s.onchange = () => set(s.value);
    pal.append(s);
  };
  if (state.brush === "water")
    choose(
      ["river", "lake", "sea", "farm-pond", "mine-pool"],
      state.waterKind,
      (v) => (state.waterKind = v),
    );
  if (state.brush === "building") {
    choose(["n", "s", "e", "w"], state.face, (v) => (state.face = v as Face));
    const l = document.createElement("label");
    const c = document.createElement("input");
    c.type = "checkbox";
    c.checked = state.interior;
    c.onchange = () => (state.interior = c.checked);
    l.append(c, " interior");
    pal.append(l);
  }
  if (state.brush === "erase")
    choose(
      ["collision", "ground", "objects", "above", "paths", "soil"],
      state.eraseLayer,
      (v) => (state.eraseLayer = v),
    );
  side.append(pal);
  const zoom = document.createElement("label");
  zoom.append("zoom ");
  const z = document.createElement("input");
  z.type = "range";
  z.min = "1";
  z.max = "8";
  z.value = String(state.zoom);
  z.oninput = () => {
    state.zoom = Number(z.value);
    draw();
  };
  zoom.append(z);
  side.append(zoom);
  check("grid", state.grid, (v) => (state.grid = v));
  check("view box 30x17", state.viewBox, (v) => (state.viewBox = v));
  check("objects", state.objects, (v) => (state.objects = v));
  title("layers");
  for (const l of TILE_LAYERS)
    check(
      l,
      state.layers.has(l),
      (v) => void (v ? state.layers.add(l) : state.layers.delete(l)),
    );
  const top = maxTierOf(j);
  if (top > 0) {
    title("tier");
    const t = document.createElement("select");
    for (let i = 0; i <= top; i++)
      t.add(new Option(`-t${i}`, String(i), false, i === state.tier));
    t.onchange = () => {
      state.tier = Number(t.value);
      renderSide();
      draw();
    };
    side.append(t);
  }
  const conds = conditionsOf(j);
  if (conds.length > 0) {
    title("conditions");
    const all = document.createElement("button");
    all.textContent = "all true";
    all.onclick = () => {
      state.holds = new Set(conds);
      renderSide();
      draw();
    };
    const none = document.createElement("button");
    none.textContent = "all false";
    none.onclick = () => {
      state.holds = new Set();
      renderSide();
      draw();
    };
    side.append(all, none);
    for (const c of conds)
      check(
        c,
        state.holds.has(c),
        (v) => void (v ? state.holds.add(c) : state.holds.delete(c)),
      );
  }
  check("walk time (click two tiles)", state.timing, (v) => {
    state.timing = v;
    state.timePoints = [];
    renderSide();
  });
  if (state.timing) {
    const t = document.createElement("div");
    t.textContent = timeText();
    side.append(t);
  }
  title("reach from entry");
  const r = document.createElement("select");
  r.add(new Option("(off)", "", false, state.reachFrom === ""));
  for (const o of placedObjects(j, state.tier, state.holds))
    if (o.cls === "entry")
      r.add(new Option(o.name, o.name, false, o.name === state.reachFrom));
  r.onchange = () => {
    state.reachFrom = r.value;
    draw();
  };
  side.append(r);
  renderInspector(side);
  title("legend");
  for (const [c, colour] of Object.entries(CLASS_COLOURS)) {
    const d = document.createElement("div");
    d.textContent = c;
    d.style.color = colour;
    side.append(d);
  }
  const info = document.createElement("div");
  info.id = "info";
  side.append(info);
}

function timeText(): string {
  const [a, b] = state.timePoints;
  if (!a) return "click the first tile";
  if (!b) return `from ${a.x},${a.y}: click the second tile`;
  const map = reg?.getWith(state.id, state.holds, state.tier);
  const w: WalkTime | undefined = map ? walkTime(map, a, b) : undefined;
  return w
    ? `${a.x},${a.y} to ${b.x},${b.y}: ${w.tiles} tiles, ${w.foot.toFixed(1)} s on foot, ${w.horse.toFixed(1)} s on the horse`
    : `${a.x},${a.y} to ${b.x},${b.y}: no walk between them`;
}

function renderProblems(): void {
  const box = el("problems");
  box.innerHTML = "";
  const list = byMap.get(state.id) ?? [];
  const head = document.createElement("b");
  head.textContent = `${list.length} problems on ${state.id}`;
  box.append(head);
  for (const p of problems) {
    const row = document.createElement("div");
    row.textContent = p;
    row.onclick = () => {
      const pair = parsePairProblem(p);
      if (pair) {
        openPair(pair.map, pair.exit);
        return;
      }
      state.view = "map";
      const id = Object.keys(work).find(
        (k) => p === k || p.startsWith(`${k}:`) || p.startsWith(`${k} `),
      );
      if (id !== undefined && id !== state.id) select(id);
      state.mark = problemPlace(json(), p);
      draw();
    };
    box.append(row);
  }
  const wh = document.createElement("b");
  wh.textContent = `${warnings.length} layout warnings (never block a save)`;
  box.append(wh);
  for (const w of warnings) {
    const row = document.createElement("div");
    row.style.color = "#ffd27a";
    row.textContent = w;
    row.onclick = () => {
      const id = problemMapId(w);
      if (id !== state.id && work[id]) select(id);
      state.mark = problemPlace(json(), w);
      draw();
    };
    box.append(row);
  }
}

function draw(): void {
  if (state.view === "pair") return drawPair();
  if (state.view === "draft") return drawDraft();
  const j = json();
  const s = state.zoom * TILE;
  canvas.width = j.width * s;
  canvas.height = j.height * s;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const layer of drawableTileLayers(j, state.tier, state.holds)) {
    if (!state.layers.has(layer.base)) continue;
    layer.data.forEach((id, i) => {
      if (id === 0) return;
      ctx.fillStyle = tileColour(layer.base, id);
      ctx.fillRect((i % j.width) * s, Math.floor(i / j.width) * s, s, s);
    });
  }
  const objs = placedObjects(j, state.tier, state.holds);
  if (state.reachFrom !== "") {
    const map = reg?.getWith(state.id, state.holds, state.tier);
    const from = map?.entry(state.reachFrom);
    if (map && from) {
      const seen = map.reachable(from);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      for (let y = 0; y < j.height; y++)
        for (let x = 0; x < j.width; x++)
          if (!seen.has(`${x},${y}`) && !map.isBlocked(x, y))
            ctx.fillRect(x * s, y * s, s, s);
    }
  }
  if (state.grid) {
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    for (let x = 0; x <= j.width; x++) {
      ctx.moveTo(x * s + 0.5, 0);
      ctx.lineTo(x * s + 0.5, j.height * s);
    }
    for (let y = 0; y <= j.height; y++) {
      ctx.moveTo(0, y * s + 0.5);
      ctx.lineTo(j.width * s, y * s + 0.5);
    }
    ctx.stroke();
  }
  if (state.objects) {
    ctx.font = "10px sans-serif";
    for (const o of objs) {
      const picked =
        state.sel?.layer === o.layerIndex && state.sel.index === o.index;
      const dx = picked && state.drag ? state.mouse.x - state.drag.x : 0;
      const dy = picked && state.drag ? state.mouse.y - state.drag.y : 0;
      const ox = (o.x + dx) * s;
      const oy = (o.y + dy) * s;
      ctx.strokeStyle = classColour(o.cls);
      ctx.fillStyle = classColour(o.cls);
      ctx.lineWidth = picked ? 4 : 2;
      ctx.strokeRect(ox + 1, oy + 1, o.w * s - 2, o.h * s - 2);
      ctx.globalAlpha = 0.25;
      ctx.fillRect(ox, oy, o.w * s, o.h * s);
      ctx.globalAlpha = 1;
      if (o.cls === "exit") {
        const target = String(o.properties["map"] ?? "?");
        ctx.fillText(`${o.name} -> ${target}`, ox + 2, oy - 2);
      } else if (s >= 32 || o.cls === "entry" || o.cls === "service")
        ctx.fillText(o.name, ox + 2, oy + 10);
    }
    ctx.lineWidth = 1;
  }
  if (state.timing) {
    ctx.strokeStyle = "#00e5ff";
    ctx.fillStyle = "#00e5ff";
    ctx.lineWidth = 2;
    for (const p of state.timePoints) ctx.strokeRect(p.x * s, p.y * s, s, s);
    const [a, b] = state.timePoints;
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo((a.x + 0.5) * s, (a.y + 0.5) * s);
      ctx.lineTo((b.x + 0.5) * s, (b.y + 0.5) * s);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }
  if (state.mark) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(state.mark.x * s - 2, state.mark.y * s - 2, s + 4, s + 4);
    ctx.lineWidth = 1;
  }
  if (state.paint) {
    const r = rectOf(j, state.paint, state.mouse);
    ctx.strokeStyle = "#fff";
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(r.x * s, r.y * s, r.w * s, r.h * s);
    ctx.setLineDash([]);
  }
  if (state.viewBox) {
    const b = viewBoxAt(j, state.mouse.x, state.mouse.y);
    ctx.strokeStyle = "#ffe066";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x * s, b.y * s, b.w * s, b.h * s);
    ctx.lineWidth = 1;
  }
}

function setView(v: "map" | "pair" | "draft"): void {
  state.view = v;
  if (v === "pair" && !state.pair) {
    const first = reg ? allPairs(reg)[0] : undefined;
    if (first) state.pair = { from: first.from, exit: first.exit.id };
  }
  if (v === "draft" && state.draft.paths.length === 0)
    void fetch(DRAFT_LIST_ROUTE)
      .then((r) => r.json() as Promise<string[]>)
      .then((list) => {
        state.draft.paths = list;
        renderSide();
      });
  renderSide();
  draw();
}

function openPair(from: string, exit: string): void {
  state.pair = { from, exit };
  setView("pair");
}

/** Draw a map's layers and objects at a tile offset, for the pair and draft views. */
function drawPlain(
  j: TiledMapJson,
  at: { x: number; y: number },
  alpha: number,
  holds: ReadonlySet<string> = new Set(),
): void {
  const s = state.zoom * TILE;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#101410";
  ctx.fillRect(at.x * s, at.y * s, j.width * s, j.height * s);
  for (const layer of drawableTileLayers(j, 0, holds))
    layer.data.forEach((id, i) => {
      if (id === 0) return;
      ctx.fillStyle = tileColour(layer.base, id);
      ctx.fillRect(
        (at.x + (i % j.width)) * s,
        (at.y + Math.floor(i / j.width)) * s,
        s,
        s,
      );
    });
  ctx.font = "10px sans-serif";
  for (const o of placedObjects(j, 0, holds)) {
    ctx.strokeStyle = classColour(o.cls);
    ctx.fillStyle = classColour(o.cls);
    ctx.strokeRect(
      (at.x + o.x) * s + 1,
      (at.y + o.y) * s + 1,
      o.w * s - 2,
      o.h * s - 2,
    );
    if (o.cls === "entry" || o.cls === "exit" || s >= 32)
      ctx.fillText(o.name, (at.x + o.x) * s + 2, (at.y + o.y) * s + 10);
  }
  ctx.globalAlpha = 1;
}

function sizeCanvas(p: Placement): void {
  const s = state.zoom * TILE;
  canvas.width = p.width * s;
  canvas.height = p.height * s;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

const frame = (
  r: { x: number; y: number; w: number; h: number },
  at: { x: number; y: number },
  colour: string,
  width = 3,
): void => {
  const s = state.zoom * TILE;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.strokeRect(
    (at.x + r.x) * s - 1,
    (at.y + r.y) * s - 1,
    r.w * s + 2,
    r.h * s + 2,
  );
  ctx.lineWidth = 1;
};

function currentPair(): PairView | undefined {
  return reg && state.pair
    ? pairView(reg, state.pair.from, state.pair.exit)
    : undefined;
}

/** Two maps side by side: the exit, the entry it leads to, the exits back and the gap. */
function drawPair(): void {
  const v = currentPair();
  const a = v ? work[v.from] : undefined;
  const b = v ? work[v.to] : undefined;
  if (!v || !a) {
    sizeCanvas({ width: 4, height: 4, a: { x: 0, y: 0 }, b: { x: 0, y: 0 } });
    return;
  }
  const place = besideBy(a, b ?? { width: 0, height: 0 }, 3);
  sizeCanvas(place);
  drawPlain(a, place.a, 1);
  if (b) drawPlain(b, place.b, 1);
  const s = state.zoom * TILE;
  frame(v.exit, place.a, "#ff5c5c", 4);
  ctx.fillStyle = "#fff";
  ctx.font = "12px sans-serif";
  ctx.fillText(v.from, place.a.x * s + 4, 12);
  if (b) ctx.fillText(v.to, place.b.x * s + 4, 12);
  for (const x of v.back)
    frame(
      x,
      place.b,
      x === v.nearest ? "#ffb347" : "#ff5c5c",
      x === v.nearest ? 4 : 2,
    );
  if (v.entry) {
    frame({ ...v.entry, w: 1, h: 1 }, place.b, "#3ddc84", 4);
    if (v.nearest) {
      const n = v.nearest;
      ctx.strokeStyle = "#fff";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo((place.b.x + v.entry.x + 0.5) * s, (v.entry.y + 0.5) * s);
      ctx.lineTo((place.b.x + n.x + n.w / 2) * s, (n.y + n.h / 2) * s);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillText(
        `${v.gap} tiles (limit ${v.limit})`,
        (place.b.x + v.entry.x + 1) * s,
        (v.entry.y - 0.3) * s,
      );
    }
  }
}

function renderPairSide(side: HTMLElement): void {
  const head = document.createElement("b");
  head.textContent =
    "pair view: exit (red, left), its entry (green, right), exits back (red, nearest orange)";
  side.append(head);
  const v = currentPair();
  const t = document.createElement("div");
  t.textContent = v ? pairText(v) : "no pair chosen";
  side.append(t);
  const note = document.createElement("div");
  note.textContent =
    "The gap is the larger of the x and y tile gaps from the entry to the nearest exit back. The limit is a placeholder (note 87).";
  side.append(note);
  const zoom = document.createElement("input");
  zoom.type = "range";
  zoom.min = "1";
  zoom.max = "8";
  zoom.value = String(state.zoom);
  zoom.oninput = () => {
    state.zoom = Number(zoom.value);
    draw();
  };
  side.append("zoom ", zoom);
  for (const p of reg ? allPairs(reg) : []) {
    const row = document.createElement("div");
    row.style.cursor = "pointer";
    row.style.color =
      p.status === "over"
        ? "#ff9a9a"
        : p.status === "known-gap"
          ? "#ffd27a"
          : p.status === "ok"
            ? "#9fd69f"
            : "#999";
    if (state.pair?.from === p.from && state.pair.exit === p.exit.id)
      row.style.background = "#355";
    row.textContent = pairText(p);
    row.onclick = () => openPair(p.from, p.exit.id);
    side.append(row);
  }
}

/** The draft, alone, beside a real map, or laid over it at an offset. */
function drawDraft(): void {
  const d = state.draft;
  const dj = d.json;
  const real = d.compare !== "" ? work[d.compare] : undefined;
  if (!dj) {
    sizeCanvas({ width: 4, height: 4, a: { x: 0, y: 0 }, b: { x: 0, y: 0 } });
    return;
  }
  if (!real || d.mode === "alone") {
    sizeCanvas({
      width: dj.width,
      height: dj.height,
      a: { x: 0, y: 0 },
      b: { x: 0, y: 0 },
    });
    drawPlain(dj, { x: 0, y: 0 }, 1);
    return;
  }
  const place =
    d.mode === "beside"
      ? besideBy(real, dj, 3)
      : overlayBy(real, dj, { x: d.ox, y: d.oy });
  sizeCanvas(place);
  drawPlain(real, place.a, 1);
  drawPlain(dj, place.b, d.mode === "overlay" ? 0.6 : 1);
  frame({ x: 0, y: 0, w: dj.width, h: dj.height }, place.b, "#ffe066", 2);
}

function renderDraftSide(side: HTMLElement): void {
  const d = state.draft;
  const head = document.createElement("b");
  head.textContent = "draft viewer (read only, docs/design/drafts)";
  side.append(head);
  const choose = (
    label: string,
    opts: [string, string][],
    now: string,
    set: (v: string) => void,
  ) => {
    const l = document.createElement("label");
    const sel = document.createElement("select");
    for (const [v, text] of opts)
      sel.add(new Option(text, v, false, v === now));
    sel.onchange = () => set(sel.value);
    l.append(`${label} `, sel);
    side.append(l);
  };
  choose(
    "draft",
    [
      ["", "(choose)"],
      ...d.paths.map((p): [string, string] => [p, draftLabel(p)]),
    ],
    d.path,
    (p) => {
      d.path = p;
      d.json = undefined;
      d.error = "";
      if (p === "") return (renderSide(), draw());
      void fetch(`${DRAFT_FILE_ROUTE}?path=${encodeURIComponent(p)}`)
        .then((r) => r.json() as Promise<{ text?: string; error?: string }>)
        .then((f) => {
          try {
            d.json = parseDraft(f.text ?? "");
          } catch (e) {
            d.error = (e as Error).message;
          }
          renderSide();
          draw();
        });
    },
  );
  choose(
    "with map",
    [
      ["", "(none)"],
      ...Object.keys(work)
        .sort()
        .map((m): [string, string] => [m, m]),
    ],
    d.compare,
    (v) => {
      d.compare = v;
      draw();
    },
  );
  choose(
    "show",
    [
      ["alone", "draft alone"],
      ["beside", "beside the map"],
      ["overlay", "over the map"],
    ],
    d.mode,
    (v) => {
      d.mode = v as typeof d.mode;
      draw();
    },
  );
  for (const axis of ["ox", "oy"] as const) {
    const l = document.createElement("label");
    const n = document.createElement("input");
    n.type = "number";
    n.value = String(d[axis]);
    n.onchange = () => {
      d[axis] = Math.trunc(Number(n.value)) || 0;
      draw();
    };
    l.append(`overlay offset ${axis === "ox" ? "x" : "y"} `, n);
    side.append(l);
  }
  const info = document.createElement("div");
  info.textContent = d.error || (d.json ? draftInfo(d.json) : "");
  side.append(info);
}

const tileAt = (e: MouseEvent) => {
  const s = state.zoom * TILE;
  const r = canvas.getBoundingClientRect();
  return {
    x: Math.floor((e.clientX - r.left) / s),
    y: Math.floor((e.clientY - r.top) / s),
  };
};

/** The object layer new objects go on: the first object layer that shows. */
function targetLayer(): number {
  const j = json();
  const shown = new Set(
    placedObjects(j, maxTierOf(j), state.holds).map((o) => o.layerIndex),
  );
  const first = j.layers.findIndex(
    (l, i) => l.type === "objectgroup" && shown.has(i),
  );
  return first >= 0
    ? first
    : j.layers.findIndex((l) => l.type === "objectgroup");
}

function addAtMouse(): void {
  const layer = targetLayer();
  if (layer < 0) return;
  const n = placedObjects(json(), maxTierOf(json())).filter(
    (o) => o.cls === state.addClass,
  ).length;
  const next = addObject(
    json(),
    layer,
    state.addClass,
    `${state.addClass}_${n + 1}`,
    state.mouse.x,
    state.mouse.y,
  );
  commit(next);
  state.sel = { layer, index: next.layers[layer]!.objects!.length - 1 };
  renderSide();
}

canvas.addEventListener("mousedown", (e) => {
  if (state.view !== "map") return;
  const t = tileAt(e);
  if (state.timing) {
    state.timePoints =
      state.timePoints.length === 1 ? [state.timePoints[0]!, t] : [t];
    renderSide();
    draw();
    return;
  }
  if (state.brush !== "") {
    state.paint = t;
    state.sel = undefined;
    draw();
    return;
  }
  const hit = placedObjects(json(), state.tier, state.holds)
    .filter(
      (o) => t.x >= o.x && t.x < o.x + o.w && t.y >= o.y && t.y < o.y + o.h,
    )
    .at(-1);
  state.sel = hit ? { layer: hit.layerIndex, index: hit.index } : undefined;
  state.drag = hit ? t : undefined;
  renderSide();
  draw();
});

canvas.addEventListener("mousemove", (e) => {
  state.mouse = tileAt(e);
  const info = document.getElementById("info");
  if (info) info.textContent = `tile ${state.mouse.x},${state.mouse.y}`;
  if (state.view === "map" && (state.viewBox || state.drag || state.paint))
    draw();
});

window.addEventListener("mouseup", () => {
  if (state.view !== "map") return;
  const paint = state.paint;
  state.paint = undefined;
  if (paint && state.brush !== "") {
    try {
      const r = rectOf(json(), paint, state.mouse);
      commit(
        applyBrush(json(), state.brush, r, {
          waterKind: state.waterKind,
          face: state.face,
          interior: state.interior,
          eraseLayer: state.eraseLayer,
        }),
      );
      state.status = "";
    } catch (e) {
      state.status = (e as Error).message;
      renderSide();
    }
    return;
  }
  const drag = state.drag;
  state.drag = undefined;
  if (!drag || !state.sel) return;
  const dx = state.mouse.x - drag.x;
  const dy = state.mouse.y - drag.y;
  if (dx !== 0 || dy !== 0) commit(moveObject(json(), state.sel, dx, dy));
  else draw();
});

window.addEventListener("keydown", (e) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === "INPUT" || tag === "SELECT" || state.view !== "map") return;
  const sel = state.sel;
  const ctrl = e.ctrlKey || e.metaKey;
  const arrow: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  if (ctrl && e.key === "s") {
    e.preventDefault();
    void save();
  } else if (ctrl && e.key === "z") {
    e.preventDefault();
    undo(e.shiftKey);
  } else if (ctrl && e.key === "y") {
    e.preventDefault();
    undo(true);
  } else if (ctrl && e.key === "c") {
    clipboard = selectedObject()?.raw;
  } else if (ctrl && e.key === "v" && clipboard) {
    const layer = sel?.layer ?? targetLayer();
    if (layer < 0) return;
    const next = pasteObject(
      json(),
      layer,
      clipboard,
      state.mouse.x,
      state.mouse.y,
    );
    commit(next);
    state.sel = { layer, index: next.layers[layer]!.objects!.length - 1 };
    renderSide();
  } else if (sel && arrow[e.key]) {
    e.preventDefault();
    const [dx, dy] = arrow[e.key]!;
    commit(moveObject(json(), sel, dx, dy));
  } else if (sel && (e.key === "Delete" || e.key === "Backspace")) {
    commit(deleteObject(json(), sel));
    state.sel = undefined;
    renderSide();
  }
});

function renderAll(): void {
  renderList();
  renderSide();
  renderProblems();
  draw();
}

console.info("layout page (dev only)");
recompute(true);
renderAll();
void open(state.id);
