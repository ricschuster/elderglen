// Crops, forage, recipes and places for the wiki (note 100, later categories).
// Called from build() in build.mjs with its helpers. Reads game data only.

const PLACES = {
  farm: "The Farm",
  forest: "The Forest",
  "secret-woods": "Secret Woods",
  mountain: "The Mountain",
  delta: "River Delta and the Beach",
  cove: "Lake Cove",
  quarry: "The Quarry",
  hearthwell: "Hearthwell",
};
/** Places with a forage table in forage-areas.json, and where else a fish may live. */
const EXTRA_WATER = { delta: ["sea"] };
const SKILLS = {
  farming: "Farming",
  foraging: "Foraging",
  fishing: "Fishing",
  mining: "Mining",
  combat: "Combat",
};
const SEASONS = ["spring", "summer", "fall", "winter"];

export function buildMore(c) {
  const {
    d,
    esc,
    cap,
    link,
    pic,
    status,
    prose,
    infobox,
    add,
    errors,
    own,
    internal,
  } = c;
  const nice = (s) => cap(s.replace(/-/g, " "));
  const seasonText = (s) =>
    s.length === 0
      ? "None"
      : s.length === 4
        ? "Any season"
        : s.map(cap).join(", ");
  const bundleById = new Map(d.bundles.map((b) => [b.id, b]));
  const fishByWater = new Map();
  for (const f of d.fish) {
    if (!fishByWater.has(f.water)) fishByWater.set(f.water, []);
    fishByWater.get(f.water).push(f);
  }

  // ---- Recipe pages (crafting and cooking share one folder)
  const recipeRows = [
    ...d.recipes.map((r) => ({
      ...r,
      kind: "Crafting",
      name: d.items.get(r.result.item)?.name,
    })),
    ...d.dishes.map((r) => ({
      ...r,
      kind: "Cooking",
      result: { item: r.id, count: 1 },
    })),
  ];
  const seenRecipe = new Set();
  for (const r of recipeRows) {
    if (seenRecipe.has(r.id)) errors.push(`recipe ${r.id}: id used twice`);
    seenRecipe.add(r.id);
  }
  const recipeUse = new Map();
  for (const r of recipeRows)
    for (const ing of r.ingredients) {
      if (!recipeUse.has(ing.item)) recipeUse.set(ing.item, new Set());
      recipeUse.get(ing.item).add(r.id);
    }
  const recipeById = new Map(recipeRows.map((r) => [r.id, r]));
  const recipeLinks = (id) =>
    [...(recipeUse.get(id) ?? [])]
      .map((rid) => recipeById.get(rid))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => `<a href="@recipes/${r.id}.html">${esc(r.name)}</a>`)
      .join(", ");
  const orderById = new Map(d.orders.map((o) => [o.id, o]));
  const letterById = new Map(d.letters.map((l) => [l.id, l]));
  const sourceText = (from, s) => {
    if (s.kind === "start") return "Known from the start";
    if (s.kind === "level")
      return `${esc(SKILLS[s.skill] ?? s.skill)} level ${s.level}`;
    if (s.kind === "bundle") {
      const b = bundleById.get(s.bundle);
      if (!b) {
        errors.push(`${from}: unknown bundle ${s.bundle}`);
        return esc(s.bundle);
      }
      return `Reward for the <a href="@bundles/${b.id}.html">${esc(b.name)}</a> bundle`;
    }
    if (s.kind === "order") {
      const o = orderById.get(s.order);
      if (!o) errors.push(`${from}: unknown order ${s.order}`);
      return `Reward for the special order "${esc(o?.title ?? s.order)}"`;
    }
    if (s.kind === "letter") {
      const l = letterById.get(s.letter);
      if (!l) errors.push(`${from}: unknown letter ${s.letter}`);
      return `Sent in a letter from ${esc(l?.sender ?? "a neighbour")} ("${esc(l?.title ?? s.letter)}")`;
    }
    if (s.kind === "cellar") return "Found in the cellar";
    errors.push(`${from}: unknown recipe source ${JSON.stringify(s)}`);
    return "";
  };
  for (const r of recipeRows) {
    const from = `recipe ${r.id}`;
    const it = d.items.get(r.result.item);
    if (!it) errors.push(`${from}: unknown result ${r.result.item}`);
    const name = it?.name ?? r.id;
    const body = `<h1>${esc(name)}</h1>${status("recipes", r.id)}
${infobox([
  ["Kind", `${r.kind} recipe`],
  ["Makes", link(from, r.result.item, r.result.count)],
  ["Needs", r.ingredients.map((i) => link(from, i.item, i.count)).join(", ")],
  r.energy === undefined ? null : ["Energy", `${r.energy}`],
  r.sellPrice === undefined ? null : ["Sells for", `${r.sellPrice} coins`],
  ["How you learn it", r.sources.map((s) => sourceText(from, s)).join("<br>")],
])}
${prose("recipes", r.id)}`;
    add(
      `recipes/${r.id}.html`,
      name,
      body,
      "Recipe",
      `${r.kind} ${r.ingredients.map((i) => d.items.get(i.item)?.name ?? "").join(" ")}`,
    );
  }
  const rrows = (kind) =>
    recipeRows
      .filter((r) => r.kind === kind)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (r) =>
          `<tr><td><a href="@recipes/${r.id}.html">${esc(r.name)}</a></td><td>${r.ingredients.map((i) => esc((d.items.get(i.item)?.name ?? i.item) + (i.count > 1 ? ` x ${i.count}` : ""))).join(", ")}</td><td>${r.sources.map((s) => sourceText(`recipe ${r.id}`, s).replace(/<[^>]*>/g, "")).join("; ")}</td>${kind === "Cooking" ? `<td class="num">${r.energy}</td><td class="num">${r.sellPrice}</td>` : ""}</tr>`,
      )
      .join("");
  add(
    "recipes/index.html",
    "Recipes",
    `<h1>Recipes</h1><p>${recipeRows.length} recipes. Click a column heading to sort.</p>
<h2>Cooking</h2><table class="sortable"><thead><tr><th>Dish</th><th>Needs</th><th>How you learn it</th><th>Energy</th><th>Sells for</th></tr></thead><tbody>${rrows("Cooking")}</tbody></table>
<h2>Crafting</h2><table class="sortable"><thead><tr><th>Item</th><th>Needs</th><th>How you learn it</th></tr></thead><tbody>${rrows("Crafting")}</tbody></table>`,
    null,
  );

  // ---- Crops
  const cropUse = (id) => {
    const ub = c.bundleLinks(id);
    const ur = recipeLinks(id);
    return ub || ur
      ? `<h2>Used in</h2><ul>${ub ? `<li>Hall bundles: ${ub}</li>` : ""}${ur ? `<li>Recipes: ${ur}</li>` : ""}</ul>`
      : "";
  };
  for (const k of d.crops) {
    const from = `crop ${k.id}`;
    const seed = `${k.id}-seed`;
    if (!d.items.has(seed)) errors.push(`${from}: no seed item ${seed}`);
    const it = d.items.get(k.id);
    if (!it) errors.push(`${from}: no item ${k.id}`);
    const sold = k.seedPrice > 0;
    const body = `<h1>${esc(k.name)}</h1>${status("crops", k.id)}
${infobox([
  ["Picture", pic(k.id, k.name)],
  ["Grows in", esc(seasonText(k.seasons))],
  ["Time to grow", `${k.growDays} days`],
  k.regrowDays ? ["Regrows every", `${k.regrowDays} days`] : null,
  k.yield ? ["Harvest", `${k.yield} each time`] : null,
  ["Seed", link(from, seed)],
  ["Seed price", sold ? `${k.seedPrice} coins` : "Not sold in shops"],
  ["Sells for", it?.keep ? "Cannot be sold" : `${k.sellPrice} coins`],
  k.energy ? ["Energy", `${k.energy}`] : null,
])}
${prose("crops", k.id)}${cropUse(k.id)}`;
    add(
      `crops/${k.id}.html`,
      k.name,
      body,
      "Crop",
      `${k.seasons.join(" ")} ${k.regrowDays ? "regrow" : ""}`,
    );
  }
  add(
    "crops/index.html",
    "Crops",
    `<h1>Crops</h1><p>${d.crops.length} crops. Click a column heading to sort.</p>
<table class="sortable"><thead><tr><th>Crop</th><th>Season</th><th>Days to grow</th><th>Regrows</th><th>Seed price</th><th>Sells for</th></tr></thead><tbody>${[
      ...d.crops,
    ]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (k) =>
          `<tr><td><a href="@crops/${k.id}.html">${esc(k.name)}</a></td><td>${esc(k.seasons.length === 4 ? "Any" : k.seasons.map(cap).join(", "))}</td><td class="num">${k.growDays}</td><td class="num">${k.regrowDays ?? ""}</td><td class="num">${k.seedPrice || ""}</td><td class="num">${k.sellPrice || ""}</td></tr>`,
      )
      .join("")}</tbody></table>`,
    null,
  );

  // ---- Forage: which places and seasons list each item
  const foundIn = new Map();
  for (const [area, a] of Object.entries(d.forageAreas))
    for (const [table, seasons] of Object.entries(a.tables))
      for (const [season, rows] of Object.entries(seasons))
        for (const row of rows) {
          if (!foundIn.has(row.id)) foundIn.set(row.id, new Map());
          const m = foundIn.get(row.id);
          if (!m.has(area)) m.set(area, new Set());
          m.get(area).add(season);
        }
  const forageIds = new Set(d.forage.map((f) => f.id));
  for (const id of foundIn.keys())
    if (!d.items.has(id)) errors.push(`forage table names unknown item ${id}`);
  for (const f of d.forage) {
    const from = `forage ${f.id}`;
    const it = d.items.get(f.id);
    if (!it) errors.push(`${from}: no item`);
    const fi = foundIn.get(f.id);
    const where = fi
      ? [...fi]
          .map(([area, ss]) => {
            if (!PLACES[area]) errors.push(`${from}: unknown area ${area}`);
            const list = SEASONS.filter((s) => ss.has(s));
            return `<li><a href="@places/${area}.html">${esc(PLACES[area] ?? area)}</a> (${esc(list.length === 4 ? "every season" : list.map(cap).join(", "))})</li>`;
          })
          .join("")
      : "";
    const how = f.soil
      ? "Dug up from the ground"
      : f.mushroom
        ? "A mushroom"
        : null;
    const body = `<h1>${esc(f.name)}</h1>${status("forage", f.id)}
${infobox([
  ["Picture", pic(f.id, f.name)],
  [
    "Season",
    esc(f.seasons.length ? seasonText(f.seasons) : "Not tied to a season"),
  ],
  how ? ["Kind", how] : null,
  f.rare ? ["Rarity", "Rare find"] : null,
  ["Sells for", `${f.sellPrice} coins`],
  f.energy ? ["Energy", `${f.energy}`] : null,
])}
${prose("forage", f.id)}${where ? `<h2>Found in</h2><ul>${where}</ul>` : ""}${cropUse(f.id)}`;
    add(
      `forage/${f.id}.html`,
      f.name,
      body,
      "Forage",
      `${f.seasons.join(" ")}`,
    );
  }
  add(
    "forage/index.html",
    "Forage",
    `<h1>Forage</h1><p>${d.forage.length} things to gather. Click a column heading to sort.</p>
<table class="sortable"><thead><tr><th>Name</th><th>Season</th><th>Where</th><th>Sells for</th></tr></thead><tbody>${[
      ...d.forage,
    ]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => {
        const fi = foundIn.get(f.id);
        const w = fi
          ? [...fi.keys()].map((a) => PLACES[a] ?? a).join(", ")
          : "";
        return `<tr><td><a href="@forage/${f.id}.html">${esc(f.name)}</a></td><td>${esc(f.seasons.length === 0 ? "-" : f.seasons.length === 4 ? "Any" : f.seasons.map(cap).join(", "))}</td><td>${esc(w)}</td><td class="num">${f.sellPrice}</td></tr>`;
      })
      .join("")}</tbody></table>`,
    null,
  );

  // ---- Places
  const interiorsOf = (area) => {
    const key = Object.entries(d.villagers.areas).find(
      ([, v]) => v.map === area,
    )?.[0];
    if (!key) return [];
    return Object.entries(d.villagers.places)
      .filter(([k, v]) => k.startsWith(`${key}:`) && v.interior)
      .map(([, v]) => v.interior);
  };
  for (const [id, name] of Object.entries(PLACES)) {
    const from = `place ${id}`;
    const map = d.maps[id];
    if (!map) {
      errors.push(`${from}: no map file`);
      continue;
    }
    const prop = (n) => map.properties?.find((p) => p.name === n)?.value;
    const wk = prop("waterKind");
    const waters = [wk, ...(EXTRA_WATER[id] ?? [])].filter(Boolean);
    const fishHere = waters.flatMap((w) => fishByWater.get(w) ?? []);
    const fa = d.forageAreas[id];
    const forageBlock = fa
      ? SEASONS.map((s) => {
          const ids = new Set();
          for (const rows of Object.values(fa.tables))
            for (const row of rows[s] ?? []) ids.add(row.id);
          return `<li><strong>${cap(s)}:</strong> ${[...ids].map((i) => link(from, i)).join(", ")}</li>`;
        }).join("")
      : "";
    const sp = d.spawns[id];
    const rocks = sp
      ? sp.kinds
          .map(
            (k) =>
              `${esc(nice(k.kind))}${k.minLevel ? ` (Mining level ${k.minLevel})` : ""}`,
          )
          .join(", ")
      : "";
    const inside = interiorsOf(id);
    const body = `<h1>${esc(name)}</h1>${status("places", id)}
${infobox([
  ["Size", `${map.width} by ${map.height} tiles`],
  ["Riding", prop("rideable") === false ? "On foot only" : "Ride a horse here"],
  fishHere.length ? ["Fishing", `${fishHere.length} fish`] : null,
  inside.length
    ? ["Buildings", inside.map((i) => esc(nice(i))).join(", ")]
    : null,
])}
${prose("places", id)}${forageBlock ? `<h2>Forage</h2><ul>${forageBlock}</ul>` : ""}${rocks ? `<h2>What comes out of the ground</h2><p>${rocks}.</p>` : ""}${fishHere.length ? `<h2>Fish</h2><ul class="cols">${fishHere.map((f) => `<li><a href="@fish/${f.id}.html">${esc(f.name)}</a></li>`).join("")}</ul>` : ""}`;
    add(`places/${id}.html`, name, body, "Place", "");
  }
  add(
    "places/index.html",
    "Places",
    `<h1>Places</h1><p>${Object.keys(PLACES).length} places in the home valley.</p><ul>${Object.entries(
      PLACES,
    )
      .map(([id, n]) => `<li><a href="@places/${id}.html">${esc(n)}</a></li>`)
      .join("")}</ul>`,
    null,
  );
  return { own: [...forageIds] };
}
