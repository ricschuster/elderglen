import {
  conditionsOf,
  maxTierOf,
  TREE_KINDS,
  WATER_KINDS,
  type TiledMapJson,
} from "../core/map";
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
  problemPlace,
  registryProblems,
  tileColour,
  viewBoxAt,
  type PlacedObject,
} from "../core/layoutview";
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
let reg: MapRegistry | undefined;
const json = (): TiledMapJson => work[state.id]!;

/** Re-run the real checks on the working copies. Debounced: reading every map is not instant. */
let timer: ReturnType<typeof setTimeout> | undefined;
function recompute(now = false): void {
  clearTimeout(timer);
  const run = () => {
    problems = registryProblems(work);
    byMap = groupProblems(problems);
    try {
      reg = MapRegistry.fromTiled(work);
    } catch {
      reg = undefined;
    }
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
      const id = Object.keys(work).find(
        (k) => p === k || p.startsWith(`${k}:`) || p.startsWith(`${k} `),
      );
      if (id !== undefined && id !== state.id) select(id);
      state.mark = problemPlace(json(), p);
      draw();
    };
    box.append(row);
  }
}

function draw(): void {
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
  if (state.mark) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(state.mark.x * s - 2, state.mark.y * s - 2, s + 4, s + 4);
    ctx.lineWidth = 1;
  }
  if (state.viewBox) {
    const b = viewBoxAt(j, state.mouse.x, state.mouse.y);
    ctx.strokeStyle = "#ffe066";
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x * s, b.y * s, b.w * s, b.h * s);
    ctx.lineWidth = 1;
  }
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
  const t = tileAt(e);
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
  if (state.viewBox || state.drag) draw();
});

window.addEventListener("mouseup", () => {
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
  if (tag === "INPUT" || tag === "SELECT") return;
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
