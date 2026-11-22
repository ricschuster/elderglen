// Sweep: opens every festival and every heart event in the real game, through
// the farmState dev hook, in parallel browser pages. Per item it checks that
// the run has no console or page error, no stuck scene, can be left, and (for
// heart events) gives its reward and does not repeat. Problems found are
// FINDINGS (a table and playtest-out/sweep.json), not script errors.
//
// Run: npm run dev (any port), then `BASE_URL=http://localhost:5173/ npm run playtest:sweep`.
// Env: WORKERS (default 6), ONLY (a substring filter on item ids), KIND
// (festival or event), BRANCHES=1 to also run each heart event once per choice
// answer (default: one run per event, which halves the time).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { launch, Bot, log, sleepMs, OUT, GAME_URL } from "./lib.mjs";

// A page reloading while a request is in flight can reset the connection inside lib.mjs's route hook.
process.on("unhandledRejection", (e) => {
  if (!/ECONNRESET|route\.|Target page|closed/i.test(String(e?.message ?? e)))
    console.error("unhandled", e);
});

const WORKERS = Math.max(1, Number(process.env.WORKERS) || 6);
const ONLY = process.env.ONLY ?? "";
const KIND = process.env.KIND ?? "";
const BRANCHES = process.env.BRANCHES === "1";
const SHOT_EVERY = 4; // one heart event in this many gets a screenshot (plus all with a branch label of "first")
const T0 = Date.now();
fs.mkdirSync(`${OUT}/shots`, { recursive: true });

// ---------------------------------------------------------------- data
const probe = await launch({ fresh: true });
const data = await probe.p.evaluate(async () => {
  const fest = await import("/src/core/festivals.ts");
  const ev = await import("/src/core/heartevents.ts");
  const vil = await import("/src/core/villagers.ts");
  const stg = (await import("/src/content/heart-event-stages.json")).default;
  const bun = await import("/src/core/bundles.ts");
  return {
    festivals: fest.FESTIVALS,
    events: ev.HEART_EVENTS.map((e) => ({
      ...e,
      place_: vil.resolvePlace(e.place),
      stage_: stg.places[e.place],
    })),
    rooms: bun.ROOMS.map((r) => r.id),
  };
});
await probe.b.close();
log(`${data.festivals.length} festivals, ${data.events.length} heart events`);

/** The first real entry of a map (a patch needs one that exists). */
function entryOf(map) {
  const f = fileURLToPath(
    new URL(`../../src/content/maps/${map}.json`, import.meta.url),
  );
  const m = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const l of m.layers)
    for (const o of l.objects ?? [])
      if ((o.class ?? o.type) === "entry" && !o.name.includes("_start_"))
        return o.name;
  return "door";
}

const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const sample = (n) => n % SHOT_EVERY === 0;

// ---------------------------------------------------------------- items
/** @type {{kind:string,id:string,label:string,run:(w:any)=>Promise<void>}[]} */
const items = [];

for (const f of data.festivals) {
  items.push({ kind: "festival", id: f.id, label: f.id, f, year: 1 });
  if (f.evenYear)
    items.push({
      kind: "festival",
      id: `${f.id}@even`,
      label: `${f.id} (even year)`,
      f,
      year: 2,
    });
  if (f.placeUpgrade)
    items.push({
      kind: "festival",
      id: `${f.id}@hall`,
      label: `${f.id} (hall restored)`,
      f,
      year: 1,
      hall: true,
    });
}

let n = 0;
for (const e of data.events) {
  const idx = n++;
  const chooses = e.scene
    .map((c, i) => [c, i])
    .filter(([c]) => c.cmd === "choose");
  items.push({
    kind: "event",
    id: e.id,
    label: e.id,
    e,
    pick: {},
    shot: sample(idx),
  });
  if (BRANCHES)
    for (const [c, i] of chooses)
      for (let k = 1; k < c.answers.length; k++)
        items.push({
          kind: "event",
          id: `${e.id}#${i}.${k}`,
          label: `${e.id} (choice ${i} answer ${k + 1})`,
          e,
          pick: { [i]: k },
          shot: false,
        });
}

const todo = items.filter(
  (it) => it.id.includes(ONLY) && (!KIND || it.kind === KIND),
);
log(`${todo.length} runs on ${WORKERS} workers`);

// ---------------------------------------------------------------- helpers
class Run {
  constructor(it) {
    this.it = it;
    this.fails = [];
    this.notes = [];
  }
  fail(msg) {
    this.fails.push(msg);
  }
  note(msg) {
    this.notes.push(msg);
  }
}

const TRACE = process.env.TRACE === "1";
const tr = (...a) => TRACE && log("trace", ...a);

async function fresh(w) {
  tr("fresh");
  w.errs.length = 0;
  await w.p.goto(GAME_URL + "?new");
  for (let i = 0; i < 80; i++) {
    const ok = await w.p
      .evaluate(
        () =>
          typeof window.farmState === "function" &&
          typeof window.farmDebug === "function",
      )
      .catch(() => false);
    if (ok) break;
    await sleepMs(150);
  }
  await sleepMs(400);
}

const scenes = (w) => w.bot.snap().then((s) => s.scenes);

/** Close the game's own morning screens (orders board and the like). */
async function dismiss(w) {
  for (let i = 0; i < 4; i++) {
    const open = await w.p.evaluate(() =>
      ["greencoat", "cave-choice", "orders", "profession"].filter((k) =>
        window.__game.scene.isActive(k),
      ),
    );
    if (!open.length) return;
    await w.p.keyboard.press("Escape");
    await sleepMs(500);
  }
}

async function patch(w, run, p) {
  tr("patch", JSON.stringify(p).slice(0, 120));
  const r = await w.p.evaluate((x) => window.farmState(x), p);
  if (r.problems.length) run.fail(`patch problems: ${r.problems.join("; ")}`);
  await sleepMs(900);
  await dismiss(w);
}

/**
 * Walk to a tile or the nearest one within `radius` (a square, as the game's
 * PLACE_RADIUS is) that has a route. True on arrival, "noroute" when no tile in
 * reach has a route at all, false when a walk started but did not arrive.
 */
async function walkNear(w, x, y, radius = 0) {
  const cands = [];
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++)
      cands.push([x + dx, y + dy, Math.abs(dx) + Math.abs(dy)]);
  cands.sort((a, b) => a[2] - b[2]);
  const here = await w.bot.dbg();
  for (const [cx, cy] of cands) {
    if (here.tile.x === cx && here.tile.y === cy) return true;
    const ok = await w.p.evaluate(([a, b]) => window.farmWalk(a, b), [cx, cy]);
    if (!ok) continue;
    // Time based: a long walk across Hearthwell is slow with many pages open.
    const until = Date.now() + 90000;
    for (let i = 0; Date.now() < until; i++) {
      await sleepMs(30);
      if (i % 10 === 9) await dismiss(w);
      const d = await w.bot.dbg();
      if (!d.walking) return d.tile.x === cx && d.tile.y === cy;
      if ((await scenes(w)).includes("heart-event")) return true;
    }
    return false;
  }
  return "noroute";
}

/** Stand next to a service tile, face it and press Action. */
async function actOn(w, x, y) {
  tr("actOn", x, y);
  const dirs = [
    [0, 1, "up"],
    [0, -1, "down"],
    [-1, 0, "right"],
    [1, 0, "left"],
  ];
  for (const [dx, dy, dir] of dirs) {
    const ok = await w.p.evaluate(
      ([a, b]) => window.farmWalk(a, b),
      [x + dx, y + dy],
    );
    if (!ok) continue;
    for (let i = 0; i < 600; i++) {
      await sleepMs(30);
      if (i % 10 === 9) await dismiss(w);
      if (!(await w.bot.dbg()).walking) break;
    }
    await w.bot.face(dir);
    const d = await w.bot.dbg();
    if (d.target.x !== x || d.target.y !== y) continue;
    await w.bot.key("KeyX", 500);
    return true;
  }
  return false;
}

async function serviceList(w) {
  return w.p.evaluate(() =>
    window.__game.scene
      .getScene("farm")
      .map.services.map((s) => ({ id: s.id, kind: s.kind, x: s.x, y: s.y })),
  );
}

async function waitFor(w, fn, ms = 6000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleepMs(100);
  }
  return false;
}

async function shot(w, name) {
  await w.p.screenshot({ path: `${OUT}/shots/sweep-${name}.png` });
}

/** The farm scene is running (not paused) and the farmer answers a key. */
async function farmAlive(w, run, where) {
  const s = await w.p.evaluate(() => ({
    active: window.__game.scene.getScenes(true).map((x) => x.scene.key),
    paused: window.__game.scene.isPaused("farm"),
  }));
  if (s.paused || !s.active.includes("farm"))
    return run.fail(
      `${where}: the farm is ${s.paused ? "paused" : "not running"} (scenes ${s.active})`,
    );
  const extra = s.active.filter((k) => k !== "farm");
  if (extra.length) run.fail(`${where}: scene still open: ${extra}`);
  const before = (await w.bot.dbg()).pos;
  let moved = false;
  for (const k of ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"]) {
    await w.p.keyboard.down(k);
    await sleepMs(180);
    await w.p.keyboard.up(k);
    const a = (await w.bot.dbg()).pos;
    if (Math.abs(a.x - before.x) + Math.abs(a.y - before.y) > 1) {
      moved = true;
      break;
    }
  }
  if (!moved) run.fail(`${where}: the farmer does not move`);
}

function checkErrors(w, run, where) {
  for (const m of w.errs) {
    if (m.startsWith("warning:")) run.note(`${where}: ${m.slice(0, 160)}`);
    else run.fail(`${where}: console/page error: ${m.slice(0, 200)}`);
  }
  w.errs.length = 0;
}

// ---------------------------------------------------------------- festivals
async function runFestival(w, run) {
  const { f, year, hall } = run.it;
  const id = run.it.id.replace(/[@]/g, "-");
  await fresh(w);
  const evening = f.evening === true;
  const base = {
    season: f.season,
    dayOfSeason: f.day,
    year,
    minutes: f.opens + 10,
    weather: "sunny",
    money: 3000,
    ...(hall ? { hallRooms: data.rooms } : {}),
  };
  if (hall && base.hallRooms.length) {
    // rooms open in order, so a few passes are needed: patch it twice
    await w.p.evaluate((x) => window.farmState(x), { hallRooms: data.rooms });
    await sleepMs(300);
  }

  if (evening) {
    // The Night Market does not take over the day: look at the square at dusk.
    await patch(w, run, { ...base, map: "hearthwell", entry: "from_farm" });
    const d = await w.bot.dbg();
    if (d.map !== "hearthwell") run.fail(`wrong map ${d.map}`);
    await shot(w, `festival-${id}`);
    await farmAlive(w, run, "market square");
    const exits = await w.p.evaluate(() =>
      window.__game.scene
        .getScene("farm")
        .map.exits.map((e) => ({ id: e.id, x: e.x, y: e.y, map: e.map })),
    );
    const toFarm = exits.find((e) => e.map === "farm");
    if (!toFarm) return run.fail("no exit to the farm on the square");
    if (!(await walkNear(w, toFarm.x, toFarm.y, 0)))
      run.fail(`cannot walk to the exit ${toFarm.id}`);
    else {
      await sleepMs(300);
      await w.bot.key("KeyX", 200);
      const left = await waitFor(
        w,
        async () => (await w.bot.dbg()).map === "farm",
        5000,
      );
      if (!left) run.fail("the farm exit did not lead to the farm");
    }
    checkErrors(w, run, "night market");
    return;
  }

  // Walking in joins a festival (note 82 decision 11): there is no invitation.
  // The even-year maze is the same map with another layout, so its id is only a label.
  const builtRaw = await w.p.evaluate(
    async (a) => {
      const m = await import("/src/core/festivals.ts");
      const f = m.FESTIVALS.find((x) => x.id === a.id);
      return m.festivalMapFor(f, a.year) ?? null;
    },
    { id: f.id, year },
  );
  const built = builtRaw ? builtRaw.replace(/-even$/, "") : null;
  const place = await w.p.evaluate(
    async (a) => {
      const m = await import("/src/core/festivals.ts");
      const f = m.FESTIVALS.find((x) => x.id === a.id);
      return m.festivalPlace(f, a.hall, a.year);
    },
    { id: f.id, year, hall: !!hall },
  );

  if (built) {
    // Start in the square and walk out through the gate to the festival map.
    await patch(w, run, { ...base, map: "hearthwell", entry: "from_farm" });
    const exits = await w.p.evaluate(() =>
      window.__game.scene
        .getScene("farm")
        .map.exits.map((e) => ({ id: e.id, x: e.x, y: e.y, map: e.map })),
    );
    const gate = exits.find((e) => e.map === built);
    if (!gate) return run.fail(`no exit to ${built} on the square`);
    const got = await walkNear(w, gate.x, gate.y, 0);
    if (!got) return run.fail(`cannot walk to the ${built} gate`);
    await sleepMs(300);
    await w.bot.key("KeyX", 200);
  } else {
    // In place: stand in the festival's zone on its map and take a step.
    const z = place.zone;
    await patch(w, run, {
      ...base,
      map: place.map,
      entry: entryOf(place.map),
    });
    const cx = z.x + Math.floor(z.w / 2);
    const cy = z.y + Math.floor(z.h / 2);
    const r = await walkNear(w, cx, cy, Math.floor(Math.min(z.w, z.h) / 2));
    if (r === "noroute" || r === false) {
      run.fail(`cannot walk into the ${f.id} place on ${place.map}`);
    }
    await sleepMs(500);
  }

  const state = () =>
    w.p.evaluate((hat) => {
      const s = window.__game.registry.get("state");
      return {
        minutes: s.day.clock.minutes,
        joined: s.festivalsJoined,
        hats: hat ? s.wardrobe.has(hat) : null,
      };
    }, f.gift?.hat ?? null);

  if (built) {
    const ok = await waitFor(
      w,
      async () =>
        (await w.bot.dbg()).map === built &&
        !(await scenes(w)).includes("festival"),
      8000,
    );
    if (!ok)
      return run.fail(
        `did not arrive on the festival map ${built} (map ${(await w.bot.dbg()).map}, scenes ${await scenes(w)})`,
      );
    await sleepMs(600);
    await dismiss(w);
    await shot(w, `festival-${id}`);
    await farmAlive(w, run, `on ${built}`);
    checkErrors(w, run, `on ${built}`);
    const sv = await serviceList(w);
    // Open and close each panel the map offers.
    for (const kind of ["showing", "festival-counter"]) {
      const s = sv.find((x) => x.kind === kind);
      if (!s) continue;
      if (!(await actOn(w, s.x, s.y))) {
        run.fail(`cannot reach the ${kind} service (${s.x},${s.y})`);
        continue;
      }
      if (
        !(await waitFor(
          w,
          async () => (await scenes(w)).includes("festival"),
          3000,
        ))
      ) {
        run.fail(`the ${kind} panel did not open`);
        continue;
      }
      await sleepMs(300);
      await w.p.keyboard.press("Escape");
      if (
        !(await waitFor(
          w,
          async () => !(await scenes(w)).includes("festival"),
          3000,
        ))
      )
        run.fail(`the ${kind} panel did not close on Escape`);
      await sleepMs(300);
      checkErrors(w, run, `${kind} panel`);
    }
    // A sight, for its line.
    const sight = sv.find((x) => x.kind === "sight");
    if (sight) {
      await actOn(w, sight.x, sight.y);
      await sleepMs(200);
    }
    // Leave: the leave service, or the maze's own way out.
    const leave = sv.find((x) => x.kind === "festival-leave");
    if (leave) {
      if (!(await actOn(w, leave.x, leave.y)))
        return run.fail(
          `cannot reach the leave service (${leave.x},${leave.y})`,
        );
      if (
        !(await waitFor(
          w,
          async () => (await scenes(w)).includes("festival"),
          3000,
        ))
      )
        return run.fail("the leave question did not open");
      await w.p.keyboard.press("Enter");
    } else {
      const cart = sv.find((x) => x.kind === "hedge-cart");
      const chest = sv.find((x) => x.kind === "hedge-chest");
      if (chest) {
        if (await actOn(w, chest.x, chest.y)) await sleepMs(300);
        else
          run.note(`could not reach the hedge chest (${chest.x},${chest.y})`);
      }
      if (!cart)
        return run.fail("the festival map has no leave service and no cart");
      if (!(await actOn(w, cart.x, cart.y)))
        return run.fail(`cannot reach the hedge cart (${cart.x},${cart.y})`);
    }
    const home = await waitFor(
      w,
      async () => {
        const d = await w.bot.dbg();
        return d.map !== built && !(await scenes(w)).includes("festival");
      },
      8000,
    );
    if (!home)
      return run.fail(
        `could not leave ${built} (still on ${(await w.bot.dbg()).map})`,
      );
    await sleepMs(800);
    await dismiss(w);
    const end = await w.bot.dbg();
    run.note(`left to ${end.map}`);
    if (end.map !== "farm") run.fail(`left to ${end.map}, not the farm`);
    const st = await state();
    if (st.minutes < f.ends && f.ends < 1440)
      run.fail(`clock ${st.minutes} is before the festival end ${f.ends}`);
    if (!st.joined.some((k) => k.startsWith(f.id)))
      run.fail("the visit was not recorded");
    await farmAlive(w, run, "back on the farm");
  } else {
    // In place: it must be joined, and its counters must open.
    await dismiss(w);
    await shot(w, `festival-${id}`);
    const st = await state();
    if (!st.joined.some((k) => k.startsWith(f.id)))
      run.fail("walking into the place did not join the festival");
    if (f.gift && !st.hats)
      run.fail(`the gift hat ${f.gift.hat} was not given`);
    for (const s of (await serviceList(w)).filter(
      (x) => x.kind === "festival-counter",
    )) {
      if (s.id === "lantern-stall") {
        // Buys a lantern straight away: no panel.
        await actOn(w, s.x, s.y);
        continue;
      }
      if (!(await actOn(w, s.x, s.y))) {
        run.note(`could not reach the counter ${s.id} (${s.x},${s.y})`);
        continue;
      }
      if (
        !(await waitFor(
          w,
          async () => (await scenes(w)).includes("festival"),
          3000,
        ))
      ) {
        run.fail(`the counter ${s.id} did not open`);
        continue;
      }
      await sleepMs(300);
      await w.p.keyboard.press("Escape");
      if (
        !(await waitFor(
          w,
          async () => !(await scenes(w)).includes("festival"),
          3000,
        ))
      )
        run.fail(`the counter ${s.id} did not close on Escape`);
      checkErrors(w, run, `counter ${s.id}`);
    }
    await farmAlive(w, run, "after the festival");
  }
  checkErrors(w, run, "festival");
}

// ---------------------------------------------------------------- heart events
async function runEvent(w, run) {
  const { e, pick } = run.it;
  await fresh(w);
  const place = e.place_;
  if (!place || !place.map) return run.fail(`place ${e.place} has no map`);
  const c = e.conditions ?? {};
  const stageMap = e.stage_?.map ?? place.map;
  const others = data.events
    .filter(
      (x) =>
        x.id !== e.id && (x.villager === e.villager || x.place === e.place),
    )
    .map((x) => x.id);
  // The clock only takes multiples of 10 minutes: the first such time after the window opens.
  const inWin = e.window
    ? Math.ceil((toMin(e.window.from) + 1) / 10) * 10
    : 9 * 60;
  const day = 3;
  const base = {
    season: c.season ?? "spring",
    dayOfSeason: day,
    minutes: inWin,
    weather: c.weather?.[0] ?? "sunny",
    hearts: { [e.villager]: e.hearts },
    flags: c.flags ?? [],
    eventsSeen: [...new Set([...others, ...(c.after ?? [])])],
    hallBundles: c.bundle ? [c.bundle] : [],
    // The event starts on entering its area (note 62, point 6): an interior is entered at its door,
    // an outdoor area is walked into below.
    map: stageMap,
    entry: entryOf(stageMap),
  };
  await patch(w, run, base);
  const got = await w.p.evaluate(
    (v) => window.__game.registry.get("state").friendship.hearts(v),
    e.villager,
  );
  if (got < e.hearts) run.fail(`hearts capped at ${got} (needs ${e.hearts})`);
  const dbg = await w.bot.dbg();
  if (dbg.map !== stageMap) run.fail(`on ${dbg.map}, wanted ${stageMap}`);

  const before = await w.bot.snap();

  // Trigger: step to the place (or within two tiles of it).
  let started = (await scenes(w)).includes("heart-event");
  let unreachable = false;
  if (!started) {
    const walked = await walkNear(w, place.x, place.y, 2);
    started = await waitFor(
      w,
      async () => (await scenes(w)).includes("heart-event"),
      2500,
    );
    unreachable = !started && walked === "noroute";
    if (unreachable)
      run.fail(
        `${e.place} cannot be reached: no walkable tile within 2 of its tile (${place.map} ${place.x},${place.y}), so the event can never start by walking`,
      );
  }
  if (!started) {
    if (!unreachable)
      run.fail(
        `did not start on arriving at ${e.place} (${place.map} ${place.x},${place.y}) at ${e.window?.from} (scenes ${await scenes(w)}, tile ${JSON.stringify((await w.bot.dbg()).tile)})`,
      );
    // Open it directly, so the scene and its rewards are still checked.
    await w.p.evaluate(
      (id) => window.__game.scene.getScene("farm").open("heart-event", { id }),
      e.id,
    );
    await sleepMs(500);
  }
  await sleepMs(300);
  if (run.it.shot) await shot(w, `event-${e.id}`);

  // Step through.
  const end = Date.now() + 150000;
  let last = -1;
  let stuckSince = Date.now();
  const seenChoose = [];
  while (Date.now() < end) {
    const cur = await w.p.evaluate(() => {
      const sc = window.__game.scene.getScene("heart-event");
      if (!window.__game.scene.isActive("heart-event") || !sc?.run) return null;
      const c = sc.run.current();
      return {
        pos: sc.run.position,
        cmd: c?.cmd ?? null,
        answers: c?.answers?.length ?? 0,
      };
    });
    if (!cur) break;
    if (cur.pos !== last) {
      tr("step", cur.pos, cur.cmd);
      last = cur.pos;
      stuckSince = Date.now();
    }
    if (Date.now() - stuckSince > 25000) {
      run.fail(`stuck at command ${cur.pos} (${cur.cmd}) for 25 s`);
      break;
    }
    if (cur.cmd === "choose") {
      const k = pick[cur.pos] ?? 0;
      if (!seenChoose.includes(cur.pos)) seenChoose.push(cur.pos);
      await w.p.keyboard.press(
        ["Digit1", "Digit2", "Digit3", "Digit4"][k] ?? "Digit1",
      );
      await sleepMs(120);
    } else {
      await w.p.keyboard.press("Enter");
      await sleepMs(70);
    }
  }
  if ((await scenes(w)).includes("heart-event")) {
    run.fail("the event scene did not close");
    await w.p.keyboard.press("Escape");
    await sleepMs(500);
  }
  await sleepMs(500);
  checkErrors(w, run, "event");

  // Rewards and the seen record.
  const after = await w.bot.snap();
  const res = await w.p.evaluate(
    (a) => {
      const s = window.__game.registry.get("state");
      return {
        seen: s.heartEvents.seen(a.id),
        flags: a.flags.map((f) => [f, s.heartEvents.hasFlag(f)]),
        hats: a.hats.map((h) => [h, s.wardrobe.has(h)]),
        hearts: s.friendship.hearts(a.v),
      };
    },
    {
      id: e.id,
      flags: e.scene.filter((x) => x.cmd === "setFlag").map((x) => x.flag),
      hats: e.scene.filter((x) => x.cmd === "give" && x.hat).map((x) => x.hat),
      v: e.villager,
    },
  );
  if (!res.seen) run.fail("not recorded as seen");
  for (const [f, ok] of res.flags) if (!ok) run.fail(`flag ${f} not raised`);
  for (const [h, ok] of res.hats) if (!ok) run.fail(`hat ${h} not given`);
  for (const g of e.scene.filter(
    (x) => x.cmd === "give" && (x.item || x.furniture),
  )) {
    const id = g.item ?? g.furniture;
    const want = g.item ? (g.count ?? 1) : 1;
    const gain = w.bot.countBase(after, id) - w.bot.countBase(before, id);
    if (gain < want) run.fail(`reward ${id} x${want}: pack gained ${gain}`);
  }
  await farmAlive(w, run, "after the event");

  // It must not start again: another day, back to the place.
  const dbg2 = await w.p.evaluate(
    () => window.__game.registry.get("state").day.clock.day,
  );
  await w.p.evaluate((x) => window.farmState(x), {
    day: dbg2 + 1,
    minutes: inWin,
    weather: base.weather,
    map: place.map,
    entry: entryOf(place.map),
  });
  await sleepMs(900);
  await dismiss(w);
  await walkNear(w, place.x, place.y, 2);
  await sleepMs(1200);
  if ((await scenes(w)).includes("heart-event")) {
    run.fail("the event started again the next day");
    await w.p.keyboard.press("Escape");
  }
  checkErrors(w, run, "no-repeat check");
}

// ---------------------------------------------------------------- run
const results = [];
const queue = [...todo];
let finished = 0;

async function worker(i) {
  await sleepMs(i * 400);
  const w = await launch({ fresh: true });
  w.bot = new Bot(w.p, w.errs);
  while (queue.length) {
    const it = queue.shift();
    const run = new Run(it);
    const t = Date.now();
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        run.fails.length = 0;
        run.notes.length = 0;
        try {
          if (it.kind === "festival") await runFestival(w, run);
          else await runEvent(w, run);
          break;
        } catch (err) {
          if (
            attempt === 1 ||
            !/ECONNRESET|Timeout|net::/i.test(String(err.message))
          )
            throw err;
        }
      }
    } catch (err) {
      run.fail(
        `script/browser error: ${String(err.message ?? err).slice(0, 200)}`,
      );
      if (!/Target page|closed/i.test(String(err.message))) {
        // go on with the same page
      }
    }
    const rec = {
      kind: it.kind,
      id: it.id,
      label: it.label,
      status: run.fails.length ? "fail" : "pass",
      reasons: run.fails,
      notes: run.notes,
      seconds: Math.round((Date.now() - t) / 100) / 10,
    };
    results.push(rec);
    finished++;
    log(
      `[${finished}/${todo.length}] ${rec.status.toUpperCase()} ${it.id}${rec.reasons.length ? ": " + rec.reasons.join(" | ") : ""}`,
    );
  }
  await Promise.race([w.b.close().catch(() => {}), sleepMs(5000)]);
}

await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));

// ---------------------------------------------------------------- report
const order = new Map(items.map((it, i) => [it.id, i]));
results.sort((a, b) => order.get(a.id) - order.get(b.id));
const seconds = Math.round((Date.now() - T0) / 1000);
fs.writeFileSync(
  `${OUT}/sweep.json`,
  JSON.stringify({ seconds, workers: WORKERS, results }, null, 1),
);
console.log("\nSWEEP RESULTS");
console.log("kind      status  id | reason");
for (const r of results)
  console.log(
    `${r.kind.padEnd(9)} ${r.status.padEnd(6)}  ${r.id}${r.reasons.length ? " | " + r.reasons.join(" | ") : ""}`,
  );
for (const kind of ["festival", "event"]) {
  const rs = results.filter((r) => r.kind === kind);
  const bad = rs.filter((r) => r.status === "fail");
  console.log(
    `${kind}: ${rs.length - bad.length} passed, ${bad.length} failed of ${rs.length}`,
  );
}
const bad = results.filter((r) => r.status === "fail");
console.log(
  `FINDINGS:\n${bad.length ? bad.map((r) => `${r.id}: ${r.reasons.join(" | ")}`).join("\n") : "none"}`,
);
console.log(`Total ${seconds} s. Written to playtest-out/sweep.json`);
process.exit(0);
