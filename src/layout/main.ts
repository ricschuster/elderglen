import { conditionsOf, maxTierOf, type TiledMapJson } from "../core/map";
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
} from "../core/layoutview";
import { mapFiles, maps } from "../content/maps";

/**
 * The layout page, slice 1: a read-only viewer (`docs/design/87_layout_page.md`).
 * Dev server only: `layout.html` is not a build input. Placeholder look.
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
};

const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = el<HTMLCanvasElement>("canvas");
const ctx = canvas.getContext("2d")!;

const problems = registryProblems(mapFiles);
const byMap = groupProblems(problems);
const json = (): TiledMapJson => mapFiles[state.id]!;

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
  for (const id of Object.keys(mapFiles).sort()) {
    const j = mapFiles[id]!;
    if (state.filter !== "all" && mapKind(id, j) !== state.filter) continue;
    const n = byMap.get(id)?.length ?? 0;
    const row = document.createElement("div");
    if (id === state.id) row.className = "sel";
    // Layout done is kept in the notes, not in the file, so the page shows
    // only the art flag (a map with `placeholder: true` is not art done).
    row.textContent = `${id} [${mapKind(id, j)[0]}] ${isPlaceholder(j) ? "" : "art "}${n > 0 ? `(${n})` : ""}`;
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
  renderAll();
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
  title(`${state.id} ${j.width}x${j.height}`);
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
  title("legend");
  for (const [cls, colour] of Object.entries(CLASS_COLOURS)) {
    const d = document.createElement("div");
    d.textContent = cls;
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
      const id = Object.keys(mapFiles).find(
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
    const map = maps.getWith(state.id, state.holds, state.tier);
    const from = map.entry(state.reachFrom);
    if (from) {
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
      ctx.strokeStyle = classColour(o.cls);
      ctx.fillStyle = classColour(o.cls);
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x * s + 1, o.y * s + 1, o.w * s - 2, o.h * s - 2);
      ctx.globalAlpha = 0.25;
      ctx.fillRect(o.x * s, o.y * s, o.w * s, o.h * s);
      ctx.globalAlpha = 1;
      if (o.cls === "exit") {
        const target = String(o.properties["map"] ?? "?");
        ctx.fillText(`${o.name} -> ${target}`, o.x * s + 2, o.y * s - 2);
      } else if (s >= 32 || o.cls === "entry" || o.cls === "service")
        ctx.fillText(o.name, o.x * s + 2, o.y * s + 10);
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

canvas.addEventListener("mousemove", (e) => {
  const s = state.zoom * TILE;
  const r = canvas.getBoundingClientRect();
  state.mouse = {
    x: Math.floor((e.clientX - r.left) / s),
    y: Math.floor((e.clientY - r.top) / s),
  };
  const info = document.getElementById("info");
  if (info) info.textContent = `tile ${state.mouse.x},${state.mouse.y}`;
  if (state.viewBox) draw();
});

function renderAll(): void {
  renderList();
  renderSide();
  renderProblems();
  draw();
}

console.info("layout page (dev only)");
renderAll();
