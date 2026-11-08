import fs from "node:fs";
import { launch, Bot, log, sleepMs, finding, findings, OUT } from "./lib.mjs";
import { fileURLToPath } from "node:url";

const crops = JSON.parse(
  fs.readFileSync(
    fileURLToPath(new URL("../../src/content/crops.json", import.meta.url)),
    "utf8",
  ),
);
const cropDef = Object.fromEntries(crops.map((c) => [c.id, c]));
// Toolbar slots: hoe, can, axe, pickaxe, then the backpack.
const HAND = 4;
const FIRST_SLOT = 4;
const MAX_DAY = Number(process.env.MAX_DAY ?? 84);

const seasonOf = (d) =>
  Math.floor((d - 1) / 28) % 2 === 0 ? "spring" : "summer";
const dos = (d) => ((d - 1) % 28) + 1;

// ---- farm layout: two rows of 11 plots either side of an aisle at y=12.
const A = Array.from({ length: 11 }, (_, i) => ({ x: 14 + i, y: 11 }));
const B = Array.from({ length: 11 }, (_, i) => ({ x: 14 + i, y: 13 }));
const PERSONA = process.argv[2] ?? process.env.PERSONA ?? "expert";
process.env.PERSONA = PERSONA;
// `from` is the earliest day of the season the player gets round to a slot.
const sl = (cells, crop, from = 1) => cells.map((s) => ({ ...s, crop, from }));
const PROFILE = {
  // Optimiser: knows every bundle, plans each crop, forages every day, never wastes a trip.
  expert: {
    spring: [
      ...sl(A, "parsnip"),
      ...sl(B.slice(0, 4), "parsnip"),
      ...sl(B.slice(4, 7), "potato"),
      ...sl(B.slice(7, 10), "cauliflower"),
    ],
    summer: [
      ...sl(B.slice(0, 2), "melon"),
      ...sl(B.slice(2, 4), "tomato"),
      ...sl(A.slice(0, 6), "radish"),
    ],
    play: 1,
    forage: 1,
    hallEvery: 1,
    shopEvery: 1,
    waterForget: 0,
    reserve: true,
    replantUntil: 27,
    overdoDay: 0,
  },
  // Intermediate: knows the bundles, farms a modest patch, forages most days, batches trips, sometimes forgets to water.
  intermediate: {
    spring: [
      ...sl(A.slice(0, 12), "parsnip"),
      ...sl(B.slice(0, 2), "potato", 2),
      ...sl(B.slice(2, 4), "cauliflower", 2),
    ],
    summer: [
      ...sl(B.slice(0, 2), "melon", 2),
      ...sl(B.slice(2, 4), "tomato", 3),
      ...sl(A.slice(0, 6), "radish", 2),
    ],
    play: 1,
    forage: 0.6,
    hallEvery: 3,
    shopEvery: 3,
    waterForget: 0.1,
    reserve: true,
    replantUntil: 20,
    overdoDay: 0,
  },
  // Casual: plays about 3 days in 4, plants a handful, sells everything, hands in when they remember,
  // forgets to water, and once goes overboard until the energy runs out.
  casual: {
    spring: [
      ...sl(A.slice(0, 6), "parsnip"),
      ...sl(B.slice(0, 2), "potato", 4),
      ...sl(B.slice(2, 3), "cauliflower", 9),
    ],
    summer: [
      ...sl(A.slice(0, 4), "radish", 3),
      ...sl(B.slice(0, 1), "melon", 5),
      ...sl(B.slice(1, 3), "tomato", 7),
    ],
    play: 0.75,
    forage: 0.35,
    hallEvery: 6,
    shopEvery: 4,
    waterForget: 0.3,
    reserve: false,
    replantUntil: 16,
    overdoDay: 3,
  },
}[PERSONA];
let seed = [...PERSONA].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
function rnd() {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let z = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
  return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
}
const chance = (p) => rnd() < p;
const PRIORITY = [
  "potato",
  "cauliflower",
  "melon",
  "tomato",
  "radish",
  "parsnip",
];
const plantable = (crop, day) =>
  dos(day) + cropDef[crop].growDays <= 27 && dos(day) <= PROFILE.replantUntil;

let bot, page, errs;
const t0 = Date.now();

async function uiText(key) {
  return page.evaluate((k) => {
    const sc = window.__game.scene.getScene(k);
    return sc.children.list
      .filter((o) => o.type === "Text")
      .map((o) => o.text)
      .join(" | ");
  }, key);
}

// ---------- planning from live state
function wanted(s) {
  const slots = PROFILE[seasonOf(s.day)];
  const out = [];
  for (const sl of slots) {
    const plot = s.plots.find((p) => p.x === sl.x && p.y === sl.y);
    if (plot?.crop) continue;
    if (!plantable(sl.crop, s.day) || dos(s.day) < sl.from) continue;
    out.push({ ...sl, hasPlot: !!plot });
  }
  return out;
}
function seedDeficit(s) {
  const need = {};
  for (const w of wanted(s)) need[w.crop] = (need[w.crop] ?? 0) + 1;
  const def = {};
  for (const c of Object.keys(need)) {
    const have = bot.count(s, `${c}-seed`);
    if (need[c] > have) def[c] = need[c] - have;
  }
  return def;
}
/**
 * Where to stand, facing up, to use each room's scroll in the hall map. Only
 * rooms with bundles are listed in play; the rest are here for completeness.
 */
const SCROLL_STAND = {
  "foragers-shelf": [4, 2],
  larder: [4, 14],
  hearth: [43, 2],
  "last-seat": [43, 14],
  "water-room": [28, 6],
  "guests-board": [35, 10],
};
/** Hand-ins the hall would accept right now: [bundleIdx, bundleId, itemId, room]. */
function giveList() {
  return page.evaluate(() => {
    const s = window.__game.registry.get("state");
    const out = [];
    s.hall.bundles.forEach((b) => {
      if (s.hall.roomStatus(b.room) !== "ready") return;
      if (s.hall.complete(b.id)) return;
      // The panel lists one room's bundles, so the index is within the room.
      const bi = s.hall.bundlesIn(b.room).indexOf(b);
      for (const { id: base } of b.items) {
        // Hand in whichever quality stack is held (ids look like `leek@gold`).
        const stack = s.inventory
          .save()
          .find((sl) => sl && sl.id.split("@")[0] === base);
        if (stack && !s.hall.problem(s.inventory, b.id, stack.id))
          out.push([bi, b.id, stack.id, b.room]);
      }
    });
    return out;
  });
}
/** How many of each item to keep: one for each bundle still waiting on it. */
function reserve() {
  if (!PROFILE.reserve) return Promise.resolve({});
  return page.evaluate(() => {
    const s = window.__game.registry.get("state");
    const need = {};
    for (const b of s.hall.bundles) {
      if (s.hall.complete(b.id)) continue;
      // One for each unit still owed, so a bundle of 50 wood keeps 50 wood.
      for (const { id, count } of b.items) {
        const owed = count - s.hall.have(b.id, id);
        if (owed > 0) need[id] = (need[id] ?? 0) + owed;
      }
    }
    return need;
  });
}

// ---------- menus
async function menuCursor(scene, field) {
  return page.evaluate(
    ([sc, f]) => window.__game.scene.getScene(sc)[f].cursor,
    [scene, field],
  );
}
/** The labels of a menu's rows, in the order the game shows them. */
const menuLabels = (scene, field) =>
  page.evaluate(
    ([sc, f]) => window.__game.scene.getScene(sc)[f].rows.map((r) => r.label),
    [scene, field],
  );
/** The row index whose label starts with the item's display name. */
async function rowOf(scene, field, name, suffix = "") {
  const labels = await menuLabels(scene, field);
  const i = labels.findIndex((l) => l === name + suffix);
  if (i < 0)
    throw new Error(
      `no row "${name}${suffix}" in ${scene}.${field}: ${labels}`,
    );
  return i;
}
const itemName = (id) => page.evaluate((i) => window.farmItemName(i), id);
async function menuTo(scene, field, idx) {
  for (let i = 0; i < 40; i++) {
    const c = await menuCursor(scene, field);
    if (c === idx) return;
    await bot.key(c < idx ? "ArrowDown" : "ArrowUp", 40);
  }
  throw new Error(`menu ${scene}.${field} would not reach ${idx}`);
}
const sceneMsg = (scene) =>
  page.evaluate((k) => window.__game.scene.getScene(k).message.text, scene);

async function openService(standX, standY, kind, facing = "down") {
  await bot.walkTo(standX, standY);
  await bot.face(facing);
  const before = await bot.snap();
  await bot.key("KeyX", 400);
  const s = await bot.snap();
  if (!s.scenes.includes(kind))
    throw new Error(`${kind} did not open: ${s.scenes}`);
  if (
    s.money !== before.money ||
    JSON.stringify(s.inv) !== JSON.stringify(before.inv)
  )
    finding(
      `opening the ${kind} with the use key changed money or the backpack (double key event?)`,
    );
}
async function closeScreen(kind) {
  await bot.key("Escape", 350);
  let s = await bot.snap();
  if (s.scenes.includes("end")) return s;
  if (s.scenes.includes(kind)) {
    finding(`Escape did not close ${kind}`);
    await bot.key("Escape", 350);
    s = await bot.snap();
  }
  return s;
}

/**
 * Open the door in front of the bot (it stands on the tile before the door).
 * Doors open on a click or Action, not on a walk through, so face the door
 * and press Action, then wait for the next map.
 */
async function walkThrough(dir, _ms, want) {
  await bot.face(dir);
  await bot.key("KeyX", 90);
  await sleepMs(1200);
  const d = await bot.dbg();
  if (d.map !== want)
    finding(`expected map ${want} after the door, on ${d.map}`);
}

async function visitHall() {
  const list0 = await giveList();
  if (list0.length === 0) return;
  log("hall: can hand in", list0.map((g) => g[2]).join(","));
  // The hall is a walkable interior: in by the door, to a scroll, and back.
  await bot.walkTo(6, 21);
  await walkThrough("down", 1200, "hall");
  let first = true;
  const rooms = [...new Set(list0.map((g) => g[3]))];
  for (const room of rooms) {
    // Each room has its own scroll, and its panel lists only its bundles.
    const [sx, sy] = SCROLL_STAND[room];
    await openService(sx, sy, "hall", "up");
    for (let n = 0; n < 40; n++) {
      const list = (await giveList()).filter((g) => g[3] === room);
      if (list.length === 0) break;
      const [bi, bid, id] = list[0];
      const before = await bot.snap();
      await menuTo("hall", "bundleMenu", bi);
      await bot.key("ArrowRight", 40);
      const ids = [];
      for (const sl of before.inv)
        if (sl && !ids.includes(sl.id)) ids.push(sl.id);
      await menuTo("hall", "packMenu", ids.indexOf(id));
      if (first) await bot.shot(`hall-d${before.day}`);
      first = false;
      await bot.key("Enter", 120);
      await bot.key("ArrowLeft", 40);
      const after = await bot.snap();
      const msg = await sceneMsg("hall");
      const gave = bot.count(before, id) - bot.count(after, id);
      const handed = (h) =>
        Object.values(h[bid] ?? {}).reduce((sum, n) => sum + n, 0);
      const got = handed(after.hall) - handed(before.hall);
      log(`  hand in ${id} -> ${bid}: "${msg}"`);
      if (gave !== 1 || got !== 1)
        finding(
          `hand-in of ${id} to ${bid}: backpack -${gave}, bundle +${got} (expected 1 and 1)`,
        );
    }
    const closed = await closeScreen("hall");
    if (closed.scenes.includes("end")) await endScreen();
  }
  await bot.walkTo(23, 18);
  await walkThrough("down", 1200, "farm");
}

async function endScreen() {
  log("END SCREEN open:", await uiText("end"));
  await bot.shot("end-screen");
  const s = await bot.snap();
  log(
    `end screen state: day ${s.day} money ${s.money} skills ${JSON.stringify(s.skills)}`,
  );
  // Test the pointer path: click Keep playing.
  await page.mouse.click(340 + 60, 440 + 20);
  await sleepMs(500);
  const t = await bot.snap();
  if (t.scenes.includes("end")) {
    finding("clicking Keep playing at (400,460) did not close the end screen");
    await bot.key("Enter", 400);
  }
  log("after end screen scenes:", (await bot.snap()).scenes);
  return true;
}

async function visitShop(day) {
  const s0 = await bot.snap();
  const keep = await reserve();
  const sellIds = [];
  for (const sl of s0.inv)
    if (sl && !sellIds.includes(sl.id)) sellIds.push(sl.id);
  const sells = sellIds
    .filter((id) => !id.endsWith("-seed"))
    .map((id) => [
      id,
      bot.count(s0, id) -
        Math.min(keep[id.split("@")[0]] ?? 0, bot.count(s0, id)),
    ])
    .filter(([, n]) => n > 0);
  const def = seedDeficit(s0);
  if (sells.length === 0 && Object.keys(def).length === 0) return;
  log("shop: sell", JSON.stringify(sells), "deficit", JSON.stringify(def));
  await openService(33, 19, "shop");
  await bot.shot(`shop-d${day}`);
  // Sell first so the money funds the seeds.
  if (sells.length > 0) {
    await bot.key("ArrowRight", 40);
    for (const [id, n] of sells) {
      const cur = await bot.snap();
      const have = bot.count(cur, id);
      await menuTo(
        "shop",
        "sellMenu",
        await rowOf("shop", "sellMenu", await itemName(id), `  x${have}`),
      );
      if (n === have) await bot.key("Space", 120);
      else for (let i = 0; i < n; i++) await bot.key("Enter", 80);
      const after = await bot.snap();
      const sold = have - bot.count(after, id);
      const price = cropDef[id]?.sellPrice;
      log(
        `  sold ${sold} ${id}, money ${cur.money} -> ${after.money} ${price ? `(unit ${price})` : ""}`,
      );
      if (sold !== n) finding(`selling ${id}: wanted ${n}, sold ${sold}`);
      if (price && after.money - cur.money !== price * sold)
        finding(
          `selling ${id}: money changed by ${after.money - cur.money}, expected ${price * sold}`,
        );
    }
    await bot.key("ArrowLeft", 40);
  }
  // Buy by priority within the money we have.
  const stock = crops
    .filter((c) => c.seasons.includes(seasonOf(day)))
    .map((c) => c.id);
  for (const crop of PRIORITY) {
    let n = def[crop] ?? 0;
    if (!n || !stock.includes(crop)) continue;
    const cur = await bot.snap();
    n = Math.min(n, Math.floor(cur.money / cropDef[crop].seedPrice));
    if (n <= 0) continue;
    await menuTo(
      "shop",
      "buyMenu",
      await rowOf("shop", "buyMenu", `${cropDef[crop].name} seeds`),
    );
    let left = n;
    while (left >= 5) {
      await bot.key("Space", 100);
      left -= 5;
    }
    while (left > 0) {
      await bot.key("Enter", 80);
      left -= 1;
    }
    const after = await bot.snap();
    const got =
      bot.count(after, `${crop}-seed`) - bot.count(cur, `${crop}-seed`);
    const spent = cur.money - after.money;
    log(`  bought ${got} ${crop} seed for ${spent}g`);
    if (got !== n || spent !== n * cropDef[crop].seedPrice)
      finding(
        `buying ${n} ${crop} seed: got ${got}, spent ${spent} (expected ${n * cropDef[crop].seedPrice})`,
      );
  }
  await closeScreen("shop");
}

// ---------- farm work
async function harvestRipe() {
  const s = await bot.snap();
  const ripe = s.plots
    .filter((p) => p.ripe)
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (ripe.length === 0) return;
  log(
    `harvest ${ripe.length} ripe: ${[...new Set(ripe.map((p) => p.crop.id))].join(",")}`,
  );
  await bot.select(HAND);
  for (const p of ripe) {
    const before = await bot.snap();
    await bot.actAt(p.x, p.y, { x: p.x, y: 12 });
    const after = await bot.snap();
    if (
      bot.countBase(after, p.crop.id) !==
      bot.countBase(before, p.crop.id) + 1
    ) {
      const m = (await bot.dbg()).message;
      finding(
        `harvest at ${p.x},${p.y} (${p.crop.id}) did not add one item; message "${m}"`,
      );
    }
  }
}

async function forageSweep(max = 99) {
  let s = await bot.snap();
  if (s.forage.length === 0) return;
  log(
    "forage visible:",
    s.forage.map((f) => `${f.id}@${f.x},${f.y}`).join(" "),
  );
  await bot.select(HAND);
  let todo = s.forage.slice(0, max);
  while (todo.length) {
    const d = await bot.dbg();
    todo.sort(
      (a, b) =>
        bot.dist(d.tile, { x: a.x, y: a.y + 1 }) -
        bot.dist(d.tile, { x: b.x, y: b.y + 1 }),
    );
    const f = todo.shift();
    const before = await bot.snap();
    await bot.actAt(f.x, f.y);
    const after = await bot.snap();
    if (bot.countBase(after, f.id) !== bot.countBase(before, f.id) + 1) {
      const m = (await bot.dbg()).message;
      finding(`forage ${f.id} at ${f.x},${f.y} not collected; message "${m}"`);
    }
  }
}

async function tillPlantWater(forgetWater = false) {
  let s = await bot.snap();
  const want = wanted(s).sort((a, b) => a.x - b.x || a.y - b.y);
  const toTill = want.filter((w) => !w.hasPlot);
  if (toTill.length) {
    log(`till ${toTill.length}`);
    await bot.select(0);
    for (const w of toTill) {
      if ((await bot.snap()).energy < 4) {
        finding("ran out of energy while tilling");
        break;
      }
      await bot.useAt(w.x, w.y, { x: w.x, y: 12 });
    }
    s = await bot.snap();
    const missing = toTill.filter(
      (w) => !s.plots.some((p) => p.x === w.x && p.y === w.y),
    );
    if (missing.length)
      finding(
        `tilling left ${missing.length} tiles undug: ${missing.map((m) => `${m.x},${m.y}`).join(" ")}`,
      );
  }
  for (const crop of PRIORITY) {
    const list = want.filter((w) => w.crop === crop);
    s = await bot.snap();
    const seedSlot = s.inv.findIndex((sl) => sl && sl.id === `${crop}-seed`);
    if (list.length === 0 || seedSlot < 0) continue;
    const n = Math.min(list.length, bot.count(s, `${crop}-seed`));
    log(`plant ${n} ${crop}`);
    await bot.select(FIRST_SLOT + seedSlot);
    for (const w of list.slice(0, n)) {
      const before = await bot.snap();
      await bot.useAt(w.x, w.y, { x: w.x, y: 12 });
      const after = await bot.snap();
      const plot = after.plots.find((p) => p.x === w.x && p.y === w.y);
      if (!plot?.crop || plot.crop.id !== crop)
        finding(
          `planting ${crop} at ${w.x},${w.y} failed; message "${(await bot.dbg()).message}"`,
        );
    }
  }
  s = await bot.snap();
  const dry = s.plots
    .filter((p) => p.crop && !p.wateredToday)
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (forgetWater && dry.length) log(`forgot to water ${dry.length} plots`);
  else if (dry.length) {
    log(`water ${dry.length} (weather ${s.weather})`);
    await bot.select(1);
    for (const p of dry) {
      if ((await bot.snap()).energy < 2) {
        finding("ran out of energy while watering");
        break;
      }
      await bot.useAt(p.x, p.y, { x: p.x, y: 12 });
    }
    s = await bot.snap();
    const left = s.plots.filter((p) => p.crop && !p.wateredToday);
    if (left.length)
      finding(`${left.length} planted plots still dry after watering`);
  }
}

// ---------- the night
async function sleepNight(prev) {
  const before = await bot.snap();
  await bot.key("z", 500);
  let s = await bot.snap();
  if (!s.scenes.includes("report"))
    throw new Error("no report after Z: " + s.scenes);
  const txt = await uiText("report");
  log(`night ${before.day} report: ${txt}`);
  if (before.day === 1 || /season|rain/i.test(txt))
    await bot.shot(`report-d${before.day}`);
  s = await bot.snap();
  // Growth check: a watered crop gains a day, a dry one does not (rain waters all).
  for (const p of before.plots) {
    if (!p.crop) continue;
    const q = s.plots.find((x) => x.x === p.x && x.y === p.y);
    const wasWet = p.wateredToday;
    if (!q) {
      finding(`plot ${p.x},${p.y} vanished overnight`);
      continue;
    }
    if (!q.crop) continue; // withered at season end
    const grew = q.crop.daysGrown - p.crop.daysGrown;
    if (wasWet && grew !== 1)
      finding(
        `day ${before.day}: watered ${p.crop.id} at ${p.x},${p.y} grew ${grew}`,
      );
    if (!wasWet && grew !== 0)
      finding(
        `day ${before.day}: dry ${p.crop.id} at ${p.x},${p.y} grew ${grew}`,
      );
  }
  await bot.key("Enter", 500);
  s = await bot.snap();
  if (s.scenes.includes("report") || !s.scenes.includes("farm"))
    finding(`report did not close: ${s.scenes}`);
  if (s.day !== before.day + 1)
    finding(`day after sleep is ${s.day}, expected ${before.day + 1}`);
  const saved = await page.evaluate(() =>
    localStorage.getItem("elderglen-save"),
  );
  fs.writeFileSync(`${OUT}/save-${PERSONA}.json`, saved ?? "");
  return s;
}

async function shopNeeded(day) {
  const s = await bot.snap();
  const def = seedDeficit(s);
  return Object.keys(def).some((c) => s.money >= cropDef[c].seedPrice);
}

/** Casual: tills the whole field and waters it until the energy runs out. */
async function overdo() {
  log("OVERDO: working until the energy runs out");
  const before = await bot.snap();
  await bot.select(0);
  const tiles = [];
  for (let y = 10; y <= 17; y++)
    for (let x = 14; x <= 25; x++) tiles.push({ x, y });
  let done = false;
  for (const tl of tiles) {
    const s = await bot.snap();
    if (s.scenes.includes("report")) {
      done = true;
      break;
    }
    await bot
      .useAt(tl.x, tl.y, { x: tl.x, y: tl.y < 12 ? 9 : 18 })
      .catch(() => {});
  }
  if (!done) {
    await bot.select(1);
    for (const p of (await bot.snap()).plots) {
      const s = await bot.snap();
      if (s.scenes.includes("report")) {
        done = true;
        break;
      }
      await bot.useAt(p.x, p.y).catch(() => {});
    }
  }
  const s = await bot.snap();
  if (!s.scenes.includes("report")) {
    finding("energy never ran out during overdo");
    return;
  }
  log("pass-out report:", await uiText("report"));
  await bot.shot("passout-energy");
  const lost = before.money - s.money;
  const expect = Math.min(1000, Math.floor(before.money * 0.1));
  log(
    `pass-out: money ${before.money} -> ${s.money} (lost ${lost}, 10% would be ${expect}), energy now ${s.energy}`,
  );
  if (Math.abs(lost - expect) > 1)
    finding(`pass-out from energy cost ${lost}g, expected about ${expect}g`);
  await bot.key("Enter", 500);
  const n = await bot.snap();
  log(
    `next morning: day ${n.day} energy ${n.energy} (of 270; expect 135 after running out of energy)`,
  );
  if (n.day !== before.day + 1) finding(`day after pass-out is ${n.day}`);
  if (Math.abs(n.energy - 135) > 1)
    finding(`morning energy after pass-out is ${n.energy}, expected 135`);
}

async function reloadAndContinue() {
  const before = await bot.snap();
  await page.reload();
  await sleepMs(1500);
  log("title text:", await uiText("title"));
  await bot.shot("title-continue");
  await bot.key("Enter", 1200);
  const after = await bot.snap();
  const same =
    before.day === after.day &&
    before.money === after.money &&
    JSON.stringify(before.inv) === JSON.stringify(after.inv) &&
    JSON.stringify(
      before.plots.map((p) => [p.x, p.y, p.crop?.id, p.crop?.daysGrown]),
    ) ===
      JSON.stringify(
        after.plots.map((p) => [p.x, p.y, p.crop?.id, p.crop?.daysGrown]),
      ) &&
    JSON.stringify(before.hall) === JSON.stringify(after.hall);
  log(
    `reload + Continue: scenes ${after.scenes}, state ${same ? "matches" : "DIFFERS"}`,
  );
  if (!same)
    finding(
      "state after reload and Continue differs from the state before reload",
    );
  return after;
}

// ---------- main
async function main() {
  const l = await launch({ fresh: true });
  page = l.p;
  errs = l.errs;
  bot = new Bot(page, errs);
  let reloaded = false;
  // The house, once, for coverage.
  await visitHouse();
  for (;;) {
    let s = await bot.snap();
    if (s.day > MAX_DAY) break;
    const t = Date.now();
    if (s.day > 2 && s.day !== PROFILE.overdoDay && !chance(PROFILE.play)) {
      log(
        `===== day ${s.day} (${seasonOf(s.day)} ${dos(s.day)}): player skips today`,
      );
      await sleepNight();
      continue;
    }
    log(
      `===== day ${s.day} (${seasonOf(s.day)} ${dos(s.day)}) ${s.weather} money ${s.money} energy ${s.energy} hall ${Object.entries(
        s.hall,
      )
        .map(([k, v]) => `${k}:${Object.keys(v).length}`)
        .join(" ")}`,
    );
    if (s.day === 8 && !reloaded) {
      reloaded = true;
      await reloadAndContinue();
    }
    try {
      await harvestRipe();
      if (chance(PROFILE.forage))
        await forageSweep(PERSONA === "casual" ? 3 : 99);
      if (s.day % PROFILE.hallEvery === 0) await visitHall();
      if (
        s.day % PROFILE.shopEvery === 0 ||
        s.day === 1 ||
        (await shopNeeded(s.day))
      )
        await visitShop(s.day);
      await tillPlantWater(chance(PROFILE.waterForget));
      if (PROFILE.hallEvery === 1) await visitHall();
      if (s.day === PROFILE.overdoDay) {
        await overdo();
        continue;
      }
    } catch (e) {
      finding(`day ${s.day} script error: ${e.message}`);
      await bot.shot(`error-d${s.day}`);
      for (let i = 0; i < 3; i++) {
        const c = await bot.snap();
        if (c.scenes.length === 1 && c.scenes[0] === "farm") break;
        await bot.key("Escape", 300);
      }
    }
    s = await bot.snap();
    log(
      `end of work: money ${s.money} energy ${s.energy} clock ${Math.floor(s.minutes / 60) % 24}:${String(s.minutes % 60).padStart(2, "0")} inv ${s.inv
        .filter(Boolean)
        .map((x) => `${x.id}x${x.count}`)
        .join(" ")}`,
    );
    log(`  day took ${((Date.now() - t) / 1000).toFixed(0)}s real`);
    // The browser bot plays crops and forage only. Woodland, Artisan Goods and
    // the Smith's need bulk gathering, machines and mining, so it stops when
    // the rest are done (the same split as UNPLAYED_BUNDLES in the headless sim).
    const hallNow = await page.evaluate(() => {
      const h = window.__game.registry.get("state").hall;
      const skipped = ["woodland", "artisan-goods", "smiths"];
      return {
        all: h.allComplete,
        done: h.bundles.filter((b) => h.complete(b.id)).length,
        total: h.bundles.length,
        played: h.bundles
          .filter((b) => !skipped.includes(b.id))
          .every((b) => h.complete(b.id)),
      };
    });
    if (s.hall && Object.keys(s.hall).length && hallNow.played) {
      log(
        `PLAYED BUNDLES COMPLETE on day ${s.day} (${hallNow.done} of ${hallNow.total} bundles, all: ${hallNow.all}) endSeen`,
        s.endSeen,
      );
      await bot.shot("all-complete");
      break;
    }
    await sleepNight();
  }
  const s = await bot.snap();
  log(
    "FINAL day",
    s.day,
    "money",
    s.money,
    "hall",
    JSON.stringify(s.hall),
    "skills",
    JSON.stringify(s.skills),
  );
  log("console errors:", JSON.stringify(errs));
  log("FINDINGS:\n" + findings.map((f, i) => `${i + 1}. ${f}`).join("\n"));
  log(`total real time ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  await l.b.close();
}

async function visitHouse() {
  log("visiting the house");
  await bot.walkTo(6, 6);
  await walkThrough("up", 0, "house");
  await bot.shot("house-inside");
  // Out again by the door at the bottom of the house map (entry tile 13,20).
  await bot.walkTo(13, 20);
  await walkThrough("down", 0, "farm");
  const d = await bot.dbg();
  log("after leaving the house: map", d.map, JSON.stringify(d.tile));
}

main().catch(async (e) => {
  console.error("FATAL", e);
  try {
    await bot.shot("fatal");
  } catch {}
  console.log(
    "FINDINGS so far:\n" + findings.map((f, i) => `${i + 1}. ${f}`).join("\n"),
  );
  process.exit(1);
});
