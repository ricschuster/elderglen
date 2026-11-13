// Builds the wiki (note 100) from the game's data files.
//   node scripts/wiki/build.mjs            write docs/wiki (the public view)
//   node scripts/wiki/build.mjs --internal write docs/wiki-internal (git-ignored, adds status)
//   node scripts/wiki/build.mjs --check    fail if docs/wiki is stale or a link is dangling
// Pure: the same data gives the same bytes. Reads JSON only, never TypeScript.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const content = (n) => read(`src/content/${n}.json`);

const WATERS = {
  river: "River",
  "forest-lake": "Forest lake",
  "mountain-lake": "Mountain lake",
  "marsh-lake": "Delta marsh lake",
  sea: "Sea (the Beach)",
  cove: "Lake cove",
};
const SEASONS = ["spring", "summer", "fall", "winter"];
const TIMES = {
  dawn: "Dawn",
  day: "Daytime",
  dusk: "Dusk",
  night: "Night",
  rain: "Rain",
  any: "Any time",
};
const RARITY = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legend: "Legend",
};
const BEHAVIOUR = {
  mixed: "Mixed",
  dart: "Darting",
  sinker: "Sinking",
  smooth: "Smooth",
};
/** What a finished hall room opens, in player words. Unknown ids fail the check. */
const UNLOCKS = {
  "herb-stall": "The herb stall",
  greenhouse: "The greenhouse",
  "lake-cove": "The lake cove",
  carts: "The travelling carts",
  "friendship-boost": "A boost to every friendship",
  bridge: "The bridge to the next region",
};
/** Hand-in slots that take a kind of good rather than one item. */
const KINDS = { jam: "Any jam", pickles: "Any pickles", dye: "Any dye" };

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function load() {
  const items = new Map(content("item-table").map((i) => [i.id, i]));
  const fish = content("fish");
  const bundles = content("bundles");
  const rooms = content("rooms");
  const pond = content("pond");
  const recipes = content("recipes");
  const dishes = content("dishes");
  const textDir = join(root, "docs/wiki-text");
  const text = {};
  for (const cat of ["fish", "bundles", "rooms", "items"]) {
    const f = join(textDir, `${cat}.json`);
    text[cat] = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
  }
  const images = new Set(
    existsSync(join(root, "docs/wiki/img"))
      ? readdirSync(join(root, "docs/wiki/img")).map((f) =>
          f.replace(/\.png$/, ""),
        )
      : [],
  );
  return { items, fish, bundles, rooms, pond, recipes, dishes, text, images };
}

/** The ids a bundle slot accepts. */
function slotIds(slot) {
  if (typeof slot === "string") return [slot];
  return slot.anyOf ?? [slot.id];
}

/** Build every page. Returns { pages: Map(path -> html body parts), errors, index }. */
export function build(d, { internal }) {
  const errors = [];
  const pages = new Map();
  const index = [];
  const fishById = new Map(d.fish.map((f) => [f.id, f]));
  const roomById = new Map(d.rooms.map((r) => [r.id, r]));
  const bundleById = new Map(d.bundles.map((b) => [b.id, b]));
  const referenced = new Set();

  const itemName = (id) => d.items.get(id)?.name ?? KINDS[id];
  /** Path of the page for an id (fish page, else item page). */
  const pathOf = (id) =>
    fishById.has(id) ? `fish/${id}.html` : `items/${id}.html`;
  const link = (from, id, count) => {
    const name = itemName(id);
    if (!name) {
      errors.push(`${from}: unknown item id "${id}"`);
      return esc(id);
    }
    if (KINDS[id] && !d.items.has(id)) return esc(name);
    referenced.add(id);
    const n = count && count > 1 ? ` &times; ${count}` : "";
    return `<a href="@${pathOf(id)}">${esc(name)}</a>${n}`;
  };
  const pic = (id, name) =>
    d.images.has(id)
      ? `<img class="pic" src="@img/${id}.png" alt="${esc(name)}" width="64" height="64">`
      : `<div class="pic none" role="img" aria-label="${esc(name)}">${esc(name)}</div>`;
  const rewardText = (from, r) => {
    if (r.item) return link(from, r.item.id, r.item.count);
    if (r.money) return `${r.money} coins`;
    if (r.recipe) return `The recipe for ${esc(r.recipe.replace(/-/g, " "))}`;
    if (r.hats)
      return `Your pick of ${r.hats.choose} hats from ${r.hats.from.length}: ${r.hats.from
        .map((h) => esc(h.replace(/-/g, " ")))
        .join(", ")}`;
    errors.push(`${from}: unknown reward ${JSON.stringify(r)}`);
    return "";
  };
  const status = (cat, id) => {
    if (!internal) return "";
    const t = d.text[cat][id];
    const s = t?.status ?? "built";
    const label =
      {
        built: "Built",
        decided: "Decided, not built",
        placeholder: "Placeholder",
      }[s] ?? s;
    return `<p class="badge ${esc(s)}">${esc(label)}${t?.draft ? " &middot; draft text" : ""}</p>`;
  };
  const prose = (cat, id) => {
    const t = d.text[cat][id];
    if (!t?.text) return "";
    if (t.draft && !internal) return "";
    return `<p class="prose">${esc(t.text)}</p>`;
  };
  const infobox = (rows) =>
    `<table class="info">${rows
      .filter(Boolean)
      .map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${v}</td></tr>`)
      .join("")}</table>`;
  const add = (path, title, body, cat, keywords = "") => {
    pages.set(path, { title, body });
    if (cat) index.push({ name: title, cat, path, kw: keywords });
  };

  // Where a fish is used.
  const usedBundles = new Map();
  for (const b of d.bundles)
    for (const s of b.items)
      for (const id of slotIds(s)) {
        if (!usedBundles.has(id)) usedBundles.set(id, new Set());
        usedBundles.get(id).add(b.id);
      }
  const usedRecipes = new Map();
  for (const r of [...d.recipes, ...d.dishes])
    for (const ing of r.ingredients ?? []) {
      if (!usedRecipes.has(ing.item)) usedRecipes.set(ing.item, new Set());
      usedRecipes.get(ing.item).add(r.result?.item ?? r.id);
    }
  const bundleLinks = (from, id) =>
    [...(usedBundles.get(id) ?? [])]
      .map(
        (bid) =>
          `<a href="@bundles/${bid}.html">${esc(bundleById.get(bid).name)}</a>`,
      )
      .join(", ");

  // ---- Fish pages
  for (const f of d.fish) {
    const from = `fish ${f.id}`;
    const seasons =
      f.seasons.length === 4
        ? "Any season"
        : f.seasons.map((s) => cap(s)).join(", ");
    const lateWater =
      f.water === "cove" ? " (opens when the Water room is finished)" : "";
    const sell = d.items.get(f.id)?.sellPrice;
    if (sell !== f.sellPrice)
      errors.push(
        `${from}: item table price ${sell} differs from fish.json ${f.sellPrice}`,
      );
    const sp = d.pond.species[f.id];
    const pondBits = [];
    if (sp?.goods?.length)
      pondBits.push(
        `<li>Goods: ${sp.goods
          .map((g) => `${link(from, g.item)} once the pond holds ${g.minPop}`)
          .join("; ")}.</li>`,
      );
    if (sp?.reward)
      pondBits.push(
        `<li>Capacity quest reward: ${link(from, sp.reward.item, sp.reward.count)}.</li>`,
      );
    const ub = bundleLinks(from, f.id);
    const ur = [...(usedRecipes.get(f.id) ?? [])].sort();
    const sections = [
      ub
        ? `<h2>Used in</h2><ul><li>Hall bundles: ${ub}</li>${ur.length ? `<li>Recipes: ${ur.map((r) => (d.items.has(r) ? link(from, r) : esc(r.replace(/-/g, " ")))).join(", ")}</li>` : ""}</ul>`
        : ur.length
          ? `<h2>Used in</h2><ul><li>Recipes: ${ur.map((r) => (d.items.has(r) ? link(from, r) : esc(r.replace(/-/g, " ")))).join(", ")}</li></ul>`
          : "",
      pondBits.length
        ? `<h2>In a fish pond</h2><ul>${pondBits.join("")}</ul>`
        : "",
    ].join("");
    const body = `<h1>${esc(f.name)}</h1>${status("fish", f.id)}
${infobox([
  ["Picture", pic(f.id, f.name)],
  ["Where", esc(WATERS[f.water] ?? f.water) + lateWater],
  ["Season", esc(seasons)],
  ["Time", esc(TIMES[f.time] ?? f.time)],
  f.weather ? ["Weather", esc(cap(f.weather))] : null,
  ["Rarity", esc(RARITY[f.rarity] ?? f.rarity)],
  [
    "Bar",
    `${esc(BEHAVIOUR[f.behaviour] ?? f.behaviour)}, difficulty ${f.difficulty}`,
  ],
  ["Size", `${f.length[0]} to ${f.length[1]} cm`],
  ["Sells for", `${f.sellPrice} coins`],
])}
${prose("fish", f.id)}${sections}`;
    add(
      `fish/${f.id}.html`,
      f.name,
      body,
      "Fish",
      `${f.water} ${f.rarity} ${f.seasons.join(" ")}`,
    );
  }
  // Fish table
  const fishRows = [...d.fish]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (f) =>
        `<tr data-water="${esc(f.water)}" data-season="${f.seasons.length === 4 ? "all" : esc(f.seasons.join(" "))}"><td><a href="@fish/${f.id}.html">${esc(f.name)}</a></td><td>${esc(WATERS[f.water])}</td><td>${esc(f.seasons.length === 4 ? "Any" : f.seasons.map(cap).join(", "))}</td><td>${esc(TIMES[f.time])}</td><td>${esc(RARITY[f.rarity])}</td><td class="num">${f.sellPrice}</td></tr>`,
    )
    .join("");
  add(
    "fish/index.html",
    "Fish",
    `<h1>Fish</h1><p>${d.fish.length} fish. Click a column heading to sort.</p>
<table class="sortable"><thead><tr><th>Fish</th><th>Where</th><th>Season</th><th>Time</th><th>Rarity</th><th>Sells for</th></tr></thead><tbody>${fishRows}</tbody></table>`,
    null,
  );

  // ---- Bundle and room pages
  for (const b of d.bundles) {
    const from = `bundle ${b.id}`;
    const room = roomById.get(b.room);
    if (!room) errors.push(`${from}: unknown room ${b.room}`);
    const rows = b.items
      .map((s) => {
        if (typeof s === "string") return `<li>${link(from, s)}</li>`;
        if (s.anyOf)
          return `<li>${esc(s.name ?? s.id)}${s.count > 1 ? ` &times; ${s.count}` : ""}: any of ${s.anyOf.map((i) => link(from, i)).join(", ")}</li>`;
        return `<li>${link(from, s.id, s.count)}</li>`;
      })
      .join("");
    const need = b.required
      ? `${b.required} of ${b.items.length}`
      : `All ${b.items.length}`;
    const body = `<h1>${esc(b.name)}</h1>${status("bundles", b.id)}
${infobox([
  [
    "Room",
    room
      ? `<a href="@rooms/${room.id}.html">${esc(room.name)}</a>`
      : esc(b.room),
  ],
  ["Needs", esc(need)],
  ["Reward", rewardText(from, b.reward)],
  ["Hint", esc(b.hint)],
])}
${prose("bundles", b.id)}<h2>What the hall accepts</h2><ul>${rows}</ul>`;
    add(`bundles/${b.id}.html`, b.name, body, "Bundle", room?.name ?? "");
  }
  for (const r of d.rooms) {
    const from = `room ${r.id}`;
    if (!UNLOCKS[r.unlock])
      errors.push(`${from}: unknown unlock "${r.unlock}"`);
    const opens =
      r.opensAfter === "all"
        ? "After every bundle in the other rooms is finished"
        : r.opensAfter === 0
          ? "Open from the start"
          : `After ${r.opensAfter} bundle${r.opensAfter > 1 ? "s" : ""} in other rooms ${r.opensAfter > 1 ? "are" : "is"} finished`;
    const list = d.bundles
      .filter((b) => b.room === r.id)
      .map((b) => `<li><a href="@bundles/${b.id}.html">${esc(b.name)}</a></li>`)
      .join("");
    add(
      `rooms/${r.id}.html`,
      r.name,
      `<h1>${esc(r.name)}</h1>${status("rooms", r.id)}
${infobox([
  ["Opens", esc(opens)],
  ["When finished", esc(UNLOCKS[r.unlock] ?? r.unlock)],
])}
${prose("rooms", r.id)}<h2>Bundles</h2><ul>${list}</ul>`,
      "Hall room",
    );
  }
  add(
    "bundles/index.html",
    "Bundles",
    `<h1>Hall bundles</h1><p>${d.bundles.length} bundles in ${d.rooms.length} rooms of the village hall.</p>${d.rooms
      .map(
        (r) =>
          `<h2><a href="@rooms/${r.id}.html">${esc(r.name)}</a></h2><ul>${d.bundles
            .filter((b) => b.room === r.id)
            .map(
              (b) =>
                `<li><a href="@bundles/${b.id}.html">${esc(b.name)}</a></li>`,
            )
            .join("")}</ul>`,
      )
      .join("")}`,
    null,
  );

  // ---- Item pages for everything linked above (not fish)
  const usedAsReward = new Map();
  for (const b of d.bundles)
    if (b.reward.item) {
      const id = b.reward.item.id;
      if (!usedAsReward.has(id)) usedAsReward.set(id, []);
      usedAsReward.get(id).push(b.id);
    }
  for (const id of [...referenced].sort()) {
    if (fishById.has(id)) continue;
    const it = d.items.get(id);
    if (!it) continue;
    const from = `item ${id}`;
    const ub = bundleLinks(from, id);
    const rw = (usedAsReward.get(id) ?? [])
      .map(
        (bid) =>
          `<a href="@bundles/${bid}.html">${esc(bundleById.get(bid).name)}</a>`,
      )
      .join(", ");
    const body = `<h1>${esc(it.name)}</h1>${status("items", id)}
${infobox([
  ["Picture", pic(id, it.name)],
  it.keep
    ? ["Sells for", "Cannot be sold"]
    : ["Sells for", `${it.sellPrice} coins`],
  it.buyPrice === undefined ? null : ["Buy price", `${it.buyPrice} coins`],
  it.energy === undefined ? null : ["Energy", `${it.energy}`],
])}
${prose("items", id)}${ub || rw ? `<h2>Used in</h2><ul>${ub ? `<li>Hall bundles that accept it: ${ub}</li>` : ""}${rw ? `<li>Reward for: ${rw}</li>` : ""}</ul>` : ""}`;
    add(`items/${id}.html`, it.name, body, "Item");
  }
  const itemRows = [...referenced]
    .filter((id) => !fishById.has(id) && d.items.has(id))
    .sort((a, b) => itemName(a).localeCompare(itemName(b)))
    .map(
      (id) => `<li><a href="@items/${id}.html">${esc(itemName(id))}</a></li>`,
    )
    .join("");
  add(
    "items/index.html",
    "Items",
    `<h1>Items</h1><p>Items named by a bundle or a fish page.</p><ul class="cols">${itemRows}</ul>`,
    null,
  );

  // ---- Front page
  add(
    "index.html",
    "Elderglen wiki",
    `<h1>Elderglen wiki</h1>
<p>What is in the game, and where to find it. Start with a category or use the search box.</p>
<div class="tiles">
<a class="tile" href="@fish/index.html"><strong>Fish</strong><span>${d.fish.length} fish, by water, season and time</span></a>
<a class="tile" href="@bundles/index.html"><strong>Bundles</strong><span>${d.bundles.length} hall bundles in ${d.rooms.length} rooms</span></a>
<a class="tile" href="@items/index.html"><strong>Items</strong><span>Goods the hall and the ponds ask for</span></a>
</div>`,
    null,
  );
  return { pages, errors, index };
}

const CSS = `:root{--bg:#fbf8f1;--fg:#2b2a26;--muted:#6b675c;--line:#d9d2bf;--accent:#2f6b3a;--card:#fff}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#1d201b;--fg:#ece8dc;--muted:#a8a38f;--line:#3a3f35;--accent:#8fcf8f;--card:#262a23}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
header{border-bottom:1px solid var(--line);padding:.6rem 16px;display:flex;flex-wrap:wrap;gap:.5rem 1.2rem;align-items:center}
header a{color:var(--accent);text-decoration:none;font-weight:600}header .home{font-size:1.1rem}
header input{margin-left:auto;min-width:12rem;padding:.35rem .6rem;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--fg)}
main{max-width:52rem;margin:0 auto;padding:1rem 16px 3rem}a{color:var(--accent)}
h1{margin:.4rem 0}h2{margin-top:1.6rem;font-size:1.15rem}
table{border-collapse:collapse;width:100%}th,td{padding:.35rem .6rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
table.info{float:right;width:19rem;max-width:100%;margin:0 0 1rem 1rem;background:var(--card);border:1px solid var(--line)}
table.info th{width:6.5rem;color:var(--muted);font-weight:600}
@media(max-width:640px){table.info{float:none;width:100%;margin:0 0 1rem}}
.pic{width:64px;height:64px;image-rendering:pixelated}.pic.none{display:grid;place-items:center;border:1px dashed var(--line);color:var(--muted);font-size:.65rem;text-align:center;padding:2px;overflow:hidden;line-height:1.1}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem;margin-top:1rem}
.tile{display:block;padding:1rem;background:var(--card);border:1px solid var(--line);border-radius:8px;text-decoration:none;color:var(--fg)}.tile span{display:block;color:var(--muted)}
.num{text-align:right}th[data-sort]{cursor:pointer}ul.cols{columns:14rem}
.badge{display:inline-block;margin:0;padding:.1rem .6rem;border-radius:999px;font-size:.8rem;border:1px solid var(--line)}.prose{max-width:34rem}
#results{position:absolute;right:16px;top:3rem;background:var(--card);border:1px solid var(--line);border-radius:6px;list-style:none;margin:0;padding:.3rem;max-width:22rem;z-index:5}
#results li a{display:block;padding:.2rem .5rem;text-decoration:none}#results small{color:var(--muted)}
`;

const SEARCH_JS = `(function(){var box=document.getElementById("q"),out=document.getElementById("results"),base=document.documentElement.dataset.base;
if(box){box.addEventListener("input",function(){var q=box.value.trim().toLowerCase();if(!q){out.hidden=true;return}
var hits=(window.WIKI_INDEX||[]).filter(function(e){return(e.name+" "+e.kw).toLowerCase().indexOf(q)>=0}).slice(0,12);
out.innerHTML=hits.map(function(e){return '<li><a href="'+base+e.path+'">'+e.name.replace(/&/g,"&amp;").replace(/</g,"&lt;")+' <small>'+e.cat+'</small></a></li>'}).join("")||"<li><small>Nothing found</small></li>";out.hidden=false})}
document.querySelectorAll("table.sortable").forEach(function(t){t.querySelectorAll("th").forEach(function(th,i){th.dataset.sort=i;th.addEventListener("click",function(){
var rows=[].slice.call(t.tBodies[0].rows),dir=th.dataset.dir==="a"?-1:1;th.dataset.dir=dir===1?"a":"d";
rows.sort(function(a,b){var x=a.cells[i].textContent,y=b.cells[i].textContent,nx=parseFloat(x),ny=parseFloat(y);
return(isNaN(nx)||isNaN(ny)?x.localeCompare(y):nx-ny)*dir});rows.forEach(function(r){t.tBodies[0].appendChild(r)})})})});})();
`;

function shell(path, title, body, internal) {
  const depth = path.split("/").length - 1;
  const base = depth ? "../".repeat(depth) : "./";
  const html = body
    .replace(/href="@/g, `href="${base}`)
    .replace(/src="@/g, `src="${base}`);
  return `<!doctype html>
<html lang="en" data-base="${base}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} - Elderglen wiki</title>
<link rel="stylesheet" href="${base}wiki.css">
</head>
<body>
<header><a class="home" href="${base}index.html">Elderglen wiki</a><a href="${base}fish/index.html">Fish</a><a href="${base}bundles/index.html">Bundles</a><a href="${base}items/index.html">Items</a><input id="q" type="search" placeholder="Search" aria-label="Search the wiki" autocomplete="off"><ul id="results" hidden></ul></header>
<main>
${html}
</main>
<script src="${base}search-index.js"></script>
<script src="${base}search.js"></script>
</body>
</html>
`;
}

const PUBLIC_BANNED = [
  /placeholder/i,
  /\bdecided\b/i,
  /\bTODO\b/,
  /#\d{2,4}\b/,
];

export async function render(d, internal) {
  const { pages, errors, index } = build(d, { internal });
  const files = new Map();
  for (const [path, p] of pages)
    files.set(
      path,
      await format(shell(path, p.title, p.body, internal), { parser: "html" }),
    );
  files.set("wiki.css", await format(CSS, { parser: "css" }));
  files.set("search.js", await format(SEARCH_JS, { parser: "babel" }));
  files.set(
    "search-index.js",
    await format(
      `window.WIKI_INDEX = ${JSON.stringify(index.sort((a, b) => a.path.localeCompare(b.path)))};`,
      { parser: "babel" },
    ),
  );
  // Dangling links.
  for (const [path, html] of files) {
    if (!path.endsWith(".html")) continue;
    for (const m of html.matchAll(
      /href="((?:\.\.\/)*(?:[a-z-]+\/)?[a-z0-9-]+\.html)"/g,
    )) {
      const target = join(dirname(path), m[1]);
      if (!files.has(target.replace(/^\.\//, "")))
        errors.push(`${path}: dangling link ${m[1]}`);
    }
    if (!internal)
      for (const re of PUBLIC_BANNED)
        if (
          re.test(
            html
              .replace(/<(style|script)[\s\S]*?<\/\1>/g, "")
              .replace(/<[^>]*>/g, " "),
          )
        )
          errors.push(`${path}: public page matches ${re}`);
  }
  for (const f of d.fish)
    if (!pages.has(`fish/${f.id}.html`)) errors.push(`fish ${f.id}: no page`);
  return { files, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const internal = args.includes("--internal");
  const check = args.includes("--check");
  const d = load();
  const { files, errors } = await render(d, internal);
  if (check) {
    const out = join(root, "docs/wiki");
    for (const [path, content] of files) {
      const f = join(out, path);
      if (!existsSync(f) || readFileSync(f, "utf8") !== content)
        errors.push(`stale: docs/wiki/${path}`);
    }
    const walk = (dir) =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? walk(join(dir, e.name))
          : [relative(out, join(dir, e.name))],
      );
    if (existsSync(out))
      for (const f of walk(out))
        if (!files.has(f) && !f.startsWith("img/"))
          errors.push(`stale: docs/wiki/${f} has no source`);
    if (errors.length) {
      console.error(
        `wiki: ${errors.length} problem(s). Run npm run wiki.\n` +
          [...new Set(errors)].slice(0, 30).join("\n"),
      );
      process.exit(1);
    }
    console.log("wiki: ok");
    return;
  }
  if (errors.length) {
    console.error([...new Set(errors)].join("\n"));
    process.exit(1);
  }
  const out = join(root, internal ? "docs/wiki-internal" : "docs/wiki");
  for (const e of existsSync(out) ? readdirSync(out) : [])
    if (e !== "img") rmSync(join(out, e), { recursive: true, force: true });
  for (const [path, content] of files) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), content);
  }
  console.log(`wiki: wrote ${files.size} files to ${relative(root, out)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
