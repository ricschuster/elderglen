// People pages for the wiki (note 100, "People"). Reads game data only.

const AREAS = {
  hw: ["Hearthwell", "hearthwell"],
  forest: ["The Forest", "forest"],
  mtn: ["The Mountain", "mountain"],
  quarry: ["The Quarry", "quarry"],
  mines: ["The Mines", null],
  delta: ["River Delta", "delta"],
  beach: ["The Beach", "delta"],
};
const AGE = {
  child: "Child",
  "young-adult": "Young adult",
  adult: "Adult",
  elder: "Elder",
};
const SEASONS = ["spring", "summer", "fall", "winter"];
const TASTES = [
  ["loves", "Loves"],
  ["likes", "Likes"],
  ["dislikes", "Dislikes"],
  ["hates", "Hates"],
];

export function buildPeople(c) {
  const {
    d,
    esc,
    cap,
    link,
    ico,
    shot,
    status,
    prose,
    infobox,
    add,
    errors,
    internal,
  } = c;
  const nice = (s) => cap(s.replace(/-/g, " "));
  const people = d.villagers.villagers;
  const tastes = d.friendship.people;
  const candidates = new Set(d.friendship.candidates);
  const eventsBy = new Map();
  for (const e of d.heartEvents.events) {
    if (!eventsBy.has(e.villager)) eventsBy.set(e.villager, []);
    eventsBy.get(e.villager).push(e);
  }

  const areaLink = (key) => {
    const a = AREAS[key];
    if (!a) {
      errors.push(`people: unknown area ${key}`);
      return esc(key);
    }
    return a[1] ? `<a href="@places/${a[1]}.html">${esc(a[0])}</a>` : esc(a[0]);
  };
  /** "hw:store/counter" to "General store, counter" with the area link. */
  const spotText = (ref) => {
    const [area, rest] = ref.split(":");
    if (area === "road") return `On the road to ${areaLink(rest)}`;
    const [sub, spot] = rest.split("/");
    const info = d.villagers.places[`${area}:${sub}`];
    const place = nice(info?.interior ?? sub);
    return `${esc(place)}${spot ? `, ${esc(spot.replace(/-/g, " "))}` : ""} (${areaLink(area)})`;
  };
  const clock = (t) => {
    const [h, m] = t.split(":").map(Number);
    return `${h % 24}:${String(m).padStart(2, "0")}${h >= 24 ? " (after midnight)" : ""}`;
  };
  const stopText = (from, s) => {
    const m = /^(\d+:\d+) (\S+?)(?: \((\w+)\))?$/.exec(s);
    if (!m) {
      errors.push(`${from}: bad stop "${s}"`);
      return esc(s);
    }
    return `<strong>${clock(m[1])}</strong> ${spotText(m[2])}${m[3] ? `, ${esc(m[3])}` : ""}`;
  };
  const stops = (from, list) =>
    `<ul>${list.map((s) => `<li>${stopText(from, s)}</li>`).join("")}</ul>`;
  const giftItem = (from, id) =>
    id.startsWith("#")
      ? `any ${esc(id.slice(1).replace(/-/g, " "))}`
      : d.items.has(id)
        ? link(from, id)
        : `${esc(nice(id))} (not an item yet)`;

  const rows = [];
  for (const p of people) {
    const from = `person ${p.id}`;
    const t = d.text.people[p.id];
    const giftsShown = internal || t?.giftsDraft === false;
    const tl = tastes[p.id];
    if (!tl) errors.push(`${from}: no gift tastes`);
    const shop = p.shop ? d.villagers.places[`hw:${p.shop}`]?.interior : null;
    const evs = eventsBy.get(p.id) ?? [];

    let gifts = "";
    if (tl && giftsShown) {
      const u = d.friendship.universal;
      const every = [
        ["loves", u.loves],
        ["dislikes", u.dislikes],
        ["hates", u.hates],
      ]
        .filter(([, l]) => l?.length)
        .map(
          ([k, l]) =>
            `<li><strong>Everyone ${esc(k)}:</strong> ${l.map((i) => giftItem(from, i)).join(", ")}</li>`,
        )
        .join("");
      gifts = `<h2>Gifts</h2>${internal && t?.giftsDraft !== false ? '<p class="badge placeholder">Gift lists are a draft, hidden on the public pages</p>' : ""}<ul>${TASTES.map(
        ([k, label]) =>
          tl[k]?.length
            ? `<li><strong>${label}:</strong> ${tl[k].map((i) => giftItem(from, i)).join(", ")}</li>`
            : "",
      ).join("")}${every}</ul>`;
    }

    const routes = `<h2>Daily route</h2>${stops(from, p.route)}<p>Bedtime ${esc(clock(p.bed))}.</p>
<h3>On rainy days</h3>${stops(from, p.rain)}${p.weekday
      .map(
        (w) =>
          `<h3>${esc(w.days.join(", "))}, ${esc(clock(w.from))} to ${esc(clock(w.until))}</h3>${stops(from, w.stops)}`,
      )
      .join("")}${p.season
      .map(
        (s) =>
          `<h3>${esc(cap(s.season))}, ${esc(clock(s.from))} to ${esc(clock(s.until))}</h3>${stops(from, s.stops)}`,
      )
      .join(
        "",
      )}<p class="prose">Times and spots may change while the valley is being tested.</p>`;

    const events = internal
      ? `<h2>Heart events (internal view only)</h2><ul>${evs
          .map((e) => {
            const gives = e.scene
              .filter((s) => s.cmd === "give")
              .map((s) => link(from, s.item, s.count))
              .join(", ");
            return `<li>${e.hearts} hearts, ${spotText(e.place)}, ${esc(clock(e.window.from))} to ${esc(clock(e.window.until))}${gives ? `, gives ${gives}` : ""}</li>`;
          })
          .join("")}</ul>`
      : "";

    const body = `<h1>${esc(p.name)}</h1>${status("people", p.id)}
${infobox([
  d.shots.has(`people/${p.id}`)
    ? ["Picture", shot(`people/${p.id}`, p.name, "portrait", 96, 96)]
    : null,
  ["Role", esc(p.role)],
  p.knownAs ? ["Also known as", esc(p.knownAs)] : null,
  ["Age", AGE[p.ageBand] ?? esc(p.ageBand)],
  ["Birthday", `${cap(p.birthday.season)} ${p.birthday.day}`],
  ["Lives at", spotText(p.home)],
  shop ? ["Works at", esc(nice(shop))] : null,
  ["Can be courted", candidates.has(p.id) ? "Yes" : "No"],
])}
${prose("people", p.id)}${gifts}${routes}${events}`;
    add(
      `people/${p.id}.html`,
      p.name,
      body,
      "Person",
      `${p.role} ${p.knownAs ?? ""}`,
    );
    rows.push(p);
  }

  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  const birthdays = SEASONS.map(
    (s) =>
      `<h2>${cap(s)} birthdays</h2><ul>${rows
        .filter((p) => p.birthday.season === s)
        .sort((a, b) => a.birthday.day - b.birthday.day)
        .map(
          (p) =>
            `<li>${p.birthday.day}: <a href="@people/${p.id}.html">${esc(p.name)}</a></li>`,
        )
        .join("")}</ul>`,
  ).join("");
  add(
    "people/index.html",
    "People",
    `<h1>People</h1><p>${rows.length} named people in the home valley, ${candidates.size} of them can be courted.</p>
<table class="sortable"><thead><tr><th>Name</th><th>Role</th><th>Lives in</th><th>Birthday</th><th>Courted</th></tr></thead><tbody>${sorted
      .map(
        (p) =>
          `<tr><td>${shot(`people/${p.id}`, "", "ico", 32, 32)}<a href="@people/${p.id}.html">${esc(p.name)}</a></td><td>${esc(p.role)}</td><td>${areaLink(p.home.split(":")[0])}</td><td>${cap(p.birthday.season)} ${p.birthday.day}</td><td>${candidates.has(p.id) ? "Yes" : "No"}</td></tr>`,
      )
      .join("")}</tbody></table>${birthdays}`,
    null,
  );
}
