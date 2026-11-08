// Builds docs/valley-map.html, an overview map of the valley, from docs/valley-map.json.
//   node scripts/valley-map/build.mjs          write the page
//   node scripts/valley-map/build.mjs --check  validate and fail if the page is stale
// Design reference only. See docs/design/56_valley_map.md.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dataPath = join(root, "docs/valley-map.json");
const outPath = join(root, "docs/valley-map.html");
const designDir = join(root, "docs/design");

const TONES = {
  deep: ["#7fa07a", "#5d7f5c"],
  wood: ["#a8c58f", "#7fa06b"],
  rock: ["#c3b7a6", "#9a8c79"],
  stone: ["#b4b4b0", "#8a8a86"],
  field: ["#d5dd9a", "#adb86f"],
  town: ["#e6d3a8", "#c2a96f"],
  ghost: ["#e4e0d6", "#b9b3a3"],
  marsh: ["#b9cfae", "#8aa782"],
  sand: ["#f0e0b0", "#d2bc7c"],
};

export function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function countPeople(data) {
  let people = 0;
  let candidates = 0;
  for (const v of data.views) {
    for (const f of v.features) {
      for (const p of f.people ?? []) {
        people += 1;
        if (p.c) candidates += 1;
      }
    }
  }
  return { people, candidates };
}

export function validate(data) {
  const errors = [];
  const viewIds = new Set(data.views.map((v) => v.id));
  if (viewIds.size !== data.views.length) errors.push("duplicate view id");
  const names = new Set();
  for (const v of data.views) {
    const regionIds = new Set(v.regions.map((r) => r.id));
    if (regionIds.size !== v.regions.length)
      errors.push(`${v.id}: duplicate region id`);
    for (const r of v.regions) {
      if (!TONES[r.tone]) errors.push(`${v.id}/${r.id}: bad tone ${r.tone}`);
      if (!r.rect || r.rect.length !== 4)
        errors.push(`${v.id}/${r.id}: rect needs four numbers`);
    }
    for (const [a, b, kind] of v.roads ?? []) {
      if (!regionIds.has(a) || !regionIds.has(b))
        errors.push(`${v.id}: road ${a}-${b} names an unknown region`);
      if (!["road", "ferry"].includes(kind))
        errors.push(`${v.id}: bad road kind ${kind}`);
    }
    for (const f of v.features) {
      const key = `${v.id}/${f.name}`;
      if (names.has(key)) errors.push(`${key}: duplicate feature`);
      names.add(key);
      if (!data.kinds[f.kind]) errors.push(`${key}: bad kind ${f.kind}`);
      if (f.x < 0 || f.x > v.w || f.y < 0 || f.y > v.h)
        errors.push(`${key}: outside the view`);
      if (f.kind === "water" && !(f.rx > 0 && f.ry > 0))
        errors.push(`${key}: water needs rx and ry`);
      if (f.view && !viewIds.has(f.view))
        errors.push(`${key}: unknown view ${f.view}`);
      if (f.ref && !existsSync(join(designDir, f.ref)))
        errors.push(`${key}: missing note ${f.ref}`);
    }
  }
  const { people, candidates } = countPeople(data);
  if (people !== data.expectedPeople)
    errors.push(
      `people: ${people} on the map, note 20 says ${data.expectedPeople}`,
    );
  if (candidates !== data.expectedCandidates)
    errors.push(
      `candidates: ${candidates} on the map, note 20 says ${data.expectedCandidates}`,
    );
  return errors;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n1 = (n) => Math.round(n * 10) / 10;

// A closed, smooth blob that stays inside its rectangle.
export function blobPath([x, y, w, h], seed) {
  const r = rng(seed);
  const j = () => (r() - 0.5) * 2 * Math.min(18, w / 14, h / 14);
  const ix = 16;
  const pts = [
    [x + ix, y + ix],
    [x + w / 3, y + 4],
    [x + (2 * w) / 3, y + 4],
    [x + w - ix, y + ix],
    [x + w - 4, y + h / 3],
    [x + w - 4, y + (2 * h) / 3],
    [x + w - ix, y + h - ix],
    [x + (2 * w) / 3, y + h - 4],
    [x + w / 3, y + h - 4],
    [x + ix, y + h - ix],
    [x + 4, y + (2 * h) / 3],
    [x + 4, y + h / 3],
  ].map(([px, py]) => [px + j(), py + j()]);
  return closedSmooth(pts);
}

function closedSmooth(pts) {
  const n = pts.length;
  let d = `M${n1(pts[0][0])} ${n1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n1(c1[0])} ${n1(c1[1])} ${n1(c2[0])} ${n1(c2[1])} ${n1(p2[0])} ${n1(p2[1])}`;
  }
  return d + "Z";
}

export function openSmooth(pts) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n1(c1[0])} ${n1(c1[1])} ${n1(c2[0])} ${n1(c2[1])} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const centre = ([x, y, w, h]) => [x + w / 2, y + h / 2];

function glyph(f) {
  const { x, y } = f;
  switch (f.kind) {
    case "building":
      return `<path d="M${x - 14} ${y + 10}V${y - 4}L${x} ${y - 16}L${x + 14} ${y - 4}V${y + 10}Z" class="bld"/><rect x="${x - 3}" y="${y + 1}" width="6" height="9" class="door"/>`;
    case "town":
      return `<circle cx="${x}" cy="${y}" r="26" class="townring"/><path d="M${x - 20} ${y + 12}V${y - 2}L${x - 8} ${y - 12}L${x + 4} ${y - 2}V${y + 12}Z" class="bld"/><path d="M${x + 2} ${y + 12}V${y + 2}L${x + 12} ${y - 6}L${x + 22} ${y + 2}V${y + 12}Z" class="bld"/>`;
    case "gate":
      return `<circle cx="${x}" cy="${y}" r="11" class="gate"/><path d="M${x - 5} ${y + 5}V${y - 1}A5 5 0 0 1 ${x + 5} ${y - 1}V${y + 5}" class="gatearch"/>`;
    case "landmark":
      return `<path d="M${x} ${y - 12}L${x + 11} ${y}L${x} ${y + 12}L${x - 11} ${y}Z" class="lm"/>`;
    default:
      return "";
  }
}

function featureSvg(f, i, viewId) {
  const people = f.people ?? [];
  const data = {
    name: f.name,
    kind: f.kind,
    note: f.note ?? "",
    ref: f.ref ?? "",
    view: f.view ?? "",
    people,
  };
  const attrs = `class="feat k-${f.kind}" tabindex="0" data-f='${esc(JSON.stringify(data))}' data-view="${viewId}" data-i="${i}"`;
  if (f.kind === "water") {
    return `<g ${attrs}><ellipse cx="${f.x}" cy="${f.y}" rx="${f.rx}" ry="${f.ry}" class="pond"/><text x="${f.x}" y="${f.y + 4}" class="wlabel">${esc(f.name)}</text></g>`;
  }
  const dy = f.kind === "town" ? 46 : 30;
  let t = `<text x="${f.x}" y="${f.y + dy}" class="label">${esc(f.name)}</text>`;
  people.forEach((p, k) => {
    t += `<text x="${f.x}" y="${f.y + dy + 15 + k * 14}" class="person">${p.c ? "&#9829; " : ""}${esc(p.n)}<tspan class="race"> ${esc(p.r)}</tspan></text>`;
  });
  return `<g ${attrs}><rect x="${f.x - 80}" y="${f.y - 28}" width="160" height="${dy + 22 + people.length * 14}" fill="transparent"/>${glyph(f)}${t}</g>`;
}

function viewSvg(v) {
  const byId = Object.fromEntries(v.regions.map((r) => [r.id, r]));
  let out = `<svg class="view" id="view-${v.id}" viewBox="0 0 ${v.w} ${v.h}" role="img" aria-label="${esc(v.name)} map">`;
  out += `<rect width="${v.w}" height="${v.h}" class="sea"/>`;
  v.roads.forEach(([a, b, kind], i) => {
    const [ax, ay] = centre(byId[a].rect);
    const [bx, by] = centre(byId[b].rect);
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const off = (i % 2 ? 1 : -1) * 28;
    const cx = mx + (-dy / len) * off;
    const cy = my + (dx / len) * off;
    out += `<path d="M${n1(ax)} ${n1(ay)}Q${n1(cx)} ${n1(cy)} ${n1(bx)} ${n1(by)}" class="${kind}"/>`;
  });
  for (const r of v.regions) {
    const [fill, edge] = TONES[r.tone];
    const [lx, ly] = r.labelAt ?? [r.rect[0] + 32, r.rect[1] + 46];
    out += `<g class="region" data-region="${r.id}"><path d="${blobPath(r.rect, r.seed)}" fill="${fill}" stroke="${edge}" stroke-width="5"${r.dashed ? ' stroke-dasharray="14 10"' : ""}/>`;
    if (v.regions.length > 1) {
      out += `<text x="${lx}" y="${ly}" class="rname">${esc(r.name)}</text>`;
      (r.sub ? r.sub.split("|") : []).forEach((line, k) => {
        out += `<text x="${lx}" y="${ly + 22 + k * 18}" class="rsub">${esc(line)}</text>`;
      });
    }
    out += `</g>`;
  }
  for (const s of v.streets ?? []) {
    out += `<path d="${openSmooth(s)}" class="street"/>`;
  }
  if (v.river) {
    out += `<path d="${openSmooth(v.river)}" class="river"/>`;
    out += `<path d="${openSmooth(v.river)}" class="riverline"/>`;
  }
  for (const r of v.rivers ?? []) {
    out += `<path d="${openSmooth(r)}" class="river"/>`;
    out += `<path d="${openSmooth(r)}" class="riverline"/>`;
  }
  for (const e of v.exits ?? []) {
    out += `<text x="${e.x}" y="${e.y}" class="exit" text-anchor="${e.anchor ?? "middle"}">${esc(e.t)}</text>`;
  }
  v.features.forEach((f, i) => {
    out += featureSvg(f, i, v.id);
  });
  if (v.id === "hearthwell") {
    out += `<text x="${v.w - 40}" y="${v.h - 24}" class="rname" text-anchor="end">Hearthwell</text>`;
  }
  return out + `</svg>`;
}

export function render(data) {
  const { people, candidates } = countPeople(data);
  const tabs = data.views
    .map(
      (v, i) =>
        `<button class="tab${i === 0 ? " on" : ""}" data-view="${v.id}">${esc(v.name)}</button>`,
    )
    .join("");
  const views = data.views
    .map(
      (v, i) =>
        `<div class="vwrap${i === 0 ? " on" : ""}" id="wrap-${v.id}">${viewSvg(v)}</div>`,
    )
    .join("\n");
  const legend = Object.entries(data.kinds)
    .map(
      ([k, label]) =>
        `<span class="key"><i class="sw ${k}"></i>${esc(label)}</span>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(data.title)}</title>
<style>
:root { --ink:#2e2a22; --paper:#f4ead2; --line:#cdbf9a; --accent:#2f7d6f; }
* { box-sizing: border-box; }
body { margin:0; font:15px/1.4 Georgia, "Times New Roman", serif; color:var(--ink); background:var(--paper); display:flex; flex-direction:column; height:100vh; }
header { padding:10px 18px; border-bottom:2px solid var(--line); display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
h1 { font-size:20px; margin:0 12px 0 0; }
.tab { font:inherit; padding:5px 14px; border:2px solid var(--line); background:#fff8e6; border-radius:6px; cursor:pointer; }
.tab.on { background:var(--accent); color:#fff; border-color:var(--accent); }
label.tog { margin-left:auto; user-select:none; }
main { flex:1; display:flex; min-height:0; }
.stage { flex:1; position:relative; overflow:hidden; background:#9fc3cf; touch-action:none; }
.vwrap { display:none; width:100%; height:100%; }
.vwrap.on { display:block; }
svg.view { width:100%; height:100%; cursor:grab; }
svg.view.drag { cursor:grabbing; }
.sea { fill:#a9cdd8; }
.region path { stroke-linejoin:round; }
.rname { font:700 24px Georgia, serif; letter-spacing:2px; text-transform:uppercase; fill:#2e2a22; opacity:.55; pointer-events:none; }
.rsub { font:italic 15px Georgia, serif; fill:#2e2a22; opacity:.6; pointer-events:none; }
.road { fill:none; stroke:#8a7448; stroke-width:7; stroke-dasharray:3 12; stroke-linecap:round; }
.ferry { fill:none; stroke:#3b78a0; stroke-width:6; stroke-dasharray:2 11; stroke-linecap:round; }
.street { fill:none; stroke:#b99d62; stroke-width:16; stroke-linecap:round; opacity:.8; }
.river { fill:none; stroke:#5a9fc0; stroke-width:24; stroke-linecap:round; stroke-linejoin:round; }
.riverline { fill:none; stroke:#8ec4dc; stroke-width:8; stroke-linecap:round; stroke-linejoin:round; opacity:.8; }
.exit { font:italic 17px Georgia, serif; fill:#2e2a22; paint-order:stroke; stroke:#f4ead2; stroke-width:5px; }
.feat { cursor:pointer; outline:none; }
.feat:hover .bld, .feat:focus .bld, .feat.sel .bld { fill:#fff; }
.feat.sel .label, .feat:hover .label { fill:var(--accent); }
.bld { fill:#d9684a; stroke:#5c2a1c; stroke-width:2.5; stroke-linejoin:round; }
.door { fill:#5c2a1c; }
.gate { fill:#f4ead2; stroke:#5c4a22; stroke-width:3; }
.gatearch { fill:none; stroke:#5c4a22; stroke-width:3; }
.lm { fill:#e9b949; stroke:#6b4d10; stroke-width:2.5; stroke-linejoin:round; }
.townring { fill:#fff8e6; stroke:var(--accent); stroke-width:4; }
.pond { fill:#6fb0cf; stroke:#3b78a0; stroke-width:3; opacity:.92; }
.feat.k-water:hover .pond, .feat.k-water.sel .pond { fill:#8ec4dc; }
.wlabel { font:700 13px Georgia, serif; fill:#10384f; text-anchor:middle; pointer-events:none; }
.label { font:700 15px Georgia, serif; text-anchor:middle; fill:var(--ink); paint-order:stroke; stroke:#f4ead2; stroke-width:5px; stroke-linejoin:round; }
.person { font:13px Georgia, serif; text-anchor:middle; fill:#3a3326; paint-order:stroke; stroke:#f4ead2; stroke-width:4px; stroke-linejoin:round; }
.race { fill:#7a6c4a; font-style:italic; }
body.nopeople .person { display:none; }
aside { width:320px; border-left:2px solid var(--line); padding:16px 18px; overflow:auto; background:#fbf4e1; }
aside h2 { margin:0 0 4px; font-size:20px; }
aside .kind { color:#7a6c4a; font-style:italic; margin-bottom:10px; }
aside ul { padding-left:18px; margin:8px 0; }
aside .hint { color:#6b6049; }
aside a { color:var(--accent); }
.legend { padding:8px 18px; border-top:2px solid var(--line); display:flex; flex-wrap:wrap; gap:16px; font-size:13px; background:#fbf4e1; }
.key { display:inline-flex; align-items:center; gap:6px; }
.sw { width:14px; height:14px; display:inline-block; border:2px solid #5c4a22; background:#f4ead2; }
.sw.building { background:#d9684a; border-color:#5c2a1c; }
.sw.water { background:#6fb0cf; border-color:#3b78a0; border-radius:50%; }
.sw.landmark { background:#e9b949; border-color:#6b4d10; transform:rotate(45deg) scale(.8); }
.sw.gate { border-radius:50%; }
.sw.town { background:#fff8e6; border-color:var(--accent); border-radius:50%; }
.disclaimer { color:#6b6049; font-size:12px; }
@media (max-width:760px) { main { flex-direction:column; } aside { width:auto; max-height:34vh; border-left:0; border-top:2px solid var(--line); } }
</style>
</head>
<body>
<header>
<h1>${esc(data.title)}</h1>
${tabs}
<label class="tog"><input type="checkbox" id="people" checked> Show people (${people}, ${candidates} marriage candidates &#9829;)</label>
</header>
<main>
<div class="stage">
${views}
</div>
<aside id="panel">
<h2>Click anything</h2>
<p class="hint">Drag to move, wheel or pinch to zoom, double click to reset. Click a pin for its details. Click the Hearthwell pin to open the zoomed town.</p>
<p class="disclaimer">${esc(data.note)}</p>
</aside>
</main>
<div class="legend">${legend}<span class="key">&#9829; marriage candidate</span><span class="key"><i style="display:inline-block;width:26px;border-top:4px dotted #8a7448"></i>road</span><span class="key"><i style="display:inline-block;width:26px;border-top:4px dotted #3b78a0"></i>ferry</span></div>
<script>
(function () {
  var views = {};
  document.querySelectorAll("svg.view").forEach(function (svg) {
    var vb = svg.getAttribute("viewBox").split(" ").map(Number);
    views[svg.id.replace("view-", "")] = { svg: svg, home: vb.slice(), vb: vb.slice() };
  });
  function apply(v) { v.svg.setAttribute("viewBox", v.vb.join(" ")); }
  function zoom(v, k, cx, cy) {
    var r = v.svg.getBoundingClientRect();
    var fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height;
    var w = Math.min(v.home[2], Math.max(v.home[2] / 6, v.vb[2] * k));
    var h = w * v.home[3] / v.home[2];
    v.vb = [v.vb[0] + (v.vb[2] - w) * fx, v.vb[1] + (v.vb[3] - h) * fy, w, h];
    apply(v);
  }
  Object.keys(views).forEach(function (id) {
    var v = views[id], svg = v.svg, down = null, moved = false;
    svg.addEventListener("wheel", function (e) { e.preventDefault(); zoom(v, e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
    svg.addEventListener("dblclick", function () { v.vb = v.home.slice(); apply(v); });
    var pts = {}, pinch = 0;
    svg.addEventListener("pointerdown", function (e) {
      pts[e.pointerId] = [e.clientX, e.clientY]; down = [e.clientX, e.clientY]; moved = false;
      pinch = 0;
    });
    svg.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return;
      var ids = Object.keys(pts);
      if (ids.length === 2) {
        pts[e.pointerId] = [e.clientX, e.clientY];
        var a = pts[ids[0]], b = pts[ids[1]];
        var d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) zoom(v, pinch / d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        pinch = d; moved = true; return;
      }
      var dx = e.clientX - pts[e.pointerId][0], dy = e.clientY - pts[e.pointerId][1];
      if (!moved && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5) return;
      moved = true; svg.classList.add("drag");
      var r = svg.getBoundingClientRect();
      v.vb[0] -= dx * v.vb[2] / r.width; v.vb[1] -= dy * v.vb[3] / r.height;
      pts[e.pointerId] = [e.clientX, e.clientY]; apply(v);
    });
    function up(e) { delete pts[e.pointerId]; svg.classList.remove("drag"); pinch = 0; }
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
    svg.addEventListener("click", function (e) {
      if (moved) { e.stopPropagation(); return; }
      var g = e.target.closest(".feat");
      if (g) show(g);
    });
    svg.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { var g = e.target.closest(".feat"); if (g) { e.preventDefault(); show(g); } }
    });
  });
  function switchTo(id) {
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("on", t.dataset.view === id); });
    document.querySelectorAll(".vwrap").forEach(function (w) { w.classList.toggle("on", w.id === "wrap-" + id); });
  }
  document.querySelectorAll(".tab").forEach(function (t) { t.addEventListener("click", function () { switchTo(t.dataset.view); }); });
  document.getElementById("people").addEventListener("change", function (e) { document.body.classList.toggle("nopeople", !e.target.checked); });
  var KINDS = ${JSON.stringify(data.kinds)};
  function el(tag, text, cls) { var n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; }
  function show(g) {
    document.querySelectorAll(".feat.sel").forEach(function (n) { n.classList.remove("sel"); });
    g.classList.add("sel");
    var d = JSON.parse(g.dataset.f), p = document.getElementById("panel");
    p.textContent = "";
    p.appendChild(el("h2", d.name));
    p.appendChild(el("div", KINDS[d.kind], "kind"));
    if (d.note) p.appendChild(el("p", d.note));
    if (d.people.length) {
      p.appendChild(el("strong", d.people.length === 1 ? "Person" : "People"));
      var ul = el("ul");
      d.people.forEach(function (x) { ul.appendChild(el("li", (x.c ? "\\u2665 " : "") + x.n + " (" + x.r + ")")); });
      p.appendChild(ul);
    }
    if (d.view) {
      var b = el("button", "Open the zoomed view", "tab on");
      b.addEventListener("click", function () { switchTo(d.view); });
      p.appendChild(b);
    }
    if (d.ref) {
      var a = el("a", "Design note: " + d.ref);
      a.href = "design/" + d.ref;
      p.appendChild(el("p")).appendChild(a);
    }
  }
})();
</script>
</body>
</html>
`;
}

function main() {
  const data = JSON.parse(readFileSync(dataPath, "utf8"));
  const errors = validate(data);
  if (errors.length) {
    console.error(errors.map((e) => `valley-map: ${e}`).join("\n"));
    process.exit(1);
  }
  const html = render(data);
  if (process.argv.includes("--check")) {
    if (!existsSync(outPath) || readFileSync(outPath, "utf8") !== html) {
      console.error(
        "valley-map: docs/valley-map.html is stale. Run npm run valley-map.",
      );
      process.exit(1);
    }
    console.log("valley-map: ok");
    return;
  }
  writeFileSync(outPath, html);
  console.log(`valley-map: wrote docs/valley-map.html`);
}

main();
