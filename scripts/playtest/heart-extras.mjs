// Heart events, the parts the sweep does not cover (#951, PLAYCHECKS "Heart events"):
// the warning and "not now", an event waiting a day, sprite movement in a scene, a
// replay giving nothing, and how many events move anyone at all.
// Run: npm run dev, then `BASE_URL=http://localhost:5173/ node scripts/playtest/heart-extras.mjs`.
// One browser page. Exit code 1 when a check fails.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { launch, Bot, log, sleepMs, GAME_URL } from "./lib.mjs";

const w = await launch({ fresh: true });
w.bot = new Bot(w.p, w.errs);
const fails = [];
const ok = (cond, msg) => {
  log(cond ? "pass" : "FAIL", msg);
  if (!cond) fails.push(msg);
};
const scenes = () => w.bot.snap().then((s) => s.scenes);
const inEvent = async () => (await scenes()).includes("heart-event");
const wait = async (fn, ms = 6000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleepMs(100);
  }
  return false;
};
const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Step a running event to its end: Enter goes on, a choose needs a digit. */
async function stepThrough(ms, onStep) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const cur = await w.p.evaluate(() => {
      const sc = window.__game.scene.getScene("heart-event");
      if (!window.__game.scene.isActive("heart-event") || !sc?.run) return null;
      return { cmd: sc.run.current()?.cmd ?? "" };
    });
    if (cur === null) return true;
    if (onStep) await onStep();
    await w.p.keyboard.press(cur.cmd === "choose" ? "Digit1" : "Enter");
    await sleepMs(cur.cmd === "choose" ? 120 : 70);
  }
  return false;
}

const data = await w.p.evaluate(async () => {
  const ev = await import("/src/core/heartevents.ts");
  const vil = await import("/src/core/villagers.ts");
  const stg = (await import("/src/content/heart-event-stages.json")).default;
  return ev.HEART_EVENTS.map((e) => ({
    ...e,
    place_: vil.resolvePlace(e.place),
    stage_: stg.places[e.place],
  }));
});

// ---- how many events move anyone (events need movement, not text only)
const SPRITE_MOVES = ["walk", "pose"];
const nomove = data.filter(
  (e) => !e.scene.some((c) => SPRITE_MOVES.includes(c.cmd)),
);
const walkers = data.length - nomove.length;
log(
  `${data.length} events: ${walkers} move a sprite (walk or pose), ${data.filter((e) => !e.scene.some((c) => ["walk", "pan", "pose", "shake", "zoom"].includes(c.cmd))).length} have no camera move either`,
);
// Known gap until M3d: no event has walk or pose data yet, so this reports and does not fail.
log(
  `${nomove.length === 0 ? "pass" : "KNOWN GAP (M3d)"} every event moves a sprite (walk or pose): ${nomove.length} of ${data.length} do not (people are only placed, plus a pan)`,
);

/** The first real entry of a map (an interior is entered at its door; "from_farm" is not on it). */
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

async function stage(e, day, extra = {}) {
  const c = e.conditions ?? {};
  const others = data
    .filter(
      (x) =>
        x.id !== e.id && (x.villager === e.villager || x.place === e.place),
    )
    .map((x) => x.id);
  const minutes = e.window
    ? Math.ceil((toMin(e.window.from) + 1) / 10) * 10
    : 540;
  const r = await w.p.evaluate((p) => window.farmState(p), {
    season: c.season ?? "spring",
    dayOfSeason: day,
    minutes,
    weather: c.weather?.[0] ?? "sunny",
    hearts: { [e.villager]: e.hearts },
    flags: c.flags ?? [],
    eventsSeen: [...new Set([...others, ...(c.after ?? [])])],
    hallBundles: c.bundle ? [c.bundle] : [],
    map: e.stage_.map,
    entry: entryOf(e.stage_.map),
    ...extra,
  });
  if (r.problems.length) log("patch problems", r.problems.join("; "));
  await sleepMs(900);
  return minutes;
}
// An interior is entered by the staging itself (the player starts at its door); only an outdoor
// area is walked into (note 62, point 6).
async function walkTo(x, y, ev = e) {
  if (ev.stage_.area === "interior") return inEvent();
  const okW = await w.p.evaluate(([a, b]) => window.farmWalk(a, b), [x, y]);
  if (!okW) return false;
  for (let i = 0; i < 3000; i++) {
    await sleepMs(30);
    if (await inEvent()) return true;
    if (!(await w.bot.dbg()).walking) return true;
  }
  return false;
}
const seen = (id) =>
  w.p.evaluate(
    (i) => window.__game.registry.get("state").heartEvents.seen(i),
    id,
  );
const day = () =>
  w.p.evaluate(() => window.__game.registry.get("state").day.clock.day);

// ---- the warning, "not now", and waiting
const e = data.find((x) => x.id === "odette-store-2");
const mins = await stage(e, 3);
await walkTo(e.place_.x, e.place_.y);
ok(await wait(inEvent, 3000), "stepping to the place opens the event scene");
const hasWarn = await w.p.evaluate(() => {
  const sc = window.__game.scene.getScene("heart-event");
  return sc.children.list.some(
    (c) => c.type === "Text" && /Go on|Not now/.test(c.text),
  );
});
ok(hasWarn, "a warning with Go on and Not now comes first");
await w.p.keyboard.press("Digit2");
await sleepMs(600);
ok(!(await inEvent()), "Not now closes the scene");
ok(!(await seen(e.id)), "Not now does not record the event as seen");
const d0 = await w.bot.dbg();
// Step away and back the same day: it must not come again (declinedToday).
await walkTo(Math.max(1, e.place_.x - 6), e.place_.y);
await sleepMs(500);
await walkTo(e.place_.x, e.place_.y);
await sleepMs(1500);
ok(!(await inEvent()), "after Not now it is not offered again the same day");
// Next day it waits for the player.
const d1 = await day();
await w.p.evaluate((x) => window.farmState(x), {
  day: d1 + 1,
  minutes: mins,
  weather: "sunny",
  map: e.stage_.map,
  entry: entryOf(e.stage_.map),
});
await sleepMs(1000);
for (let i = 0; i < 3; i++) {
  if (!(await scenes()).includes("greencoat")) break;
  await w.p.keyboard.press("Escape");
  await sleepMs(400);
}
await walkTo(e.place_.x, e.place_.y);
ok(
  await wait(inEvent, 3000),
  "the declined event is offered again the next day",
);

// ---- movement in a scene that has a walk
await w.p.keyboard.press("Digit1");
await sleepMs(400);
const sampleActors = () =>
  w.p.evaluate(() => {
    const sc = window.__game.scene.getScene("heart-event");
    if (!sc?.actors) return null;
    return [...sc.actors].map(([id, a]) => [
      id,
      Math.round(a.box.x),
      Math.round(a.box.y),
    ]);
  });
const track = new Map();
await stepThrough(90000, async () => {
  const s = await sampleActors();
  for (const [id, x, y] of s ?? []) {
    const k = track.get(id) ?? new Set();
    k.add(`${x},${y}`);
    track.set(id, k);
  }
});
const moved = [...track].filter(([, s]) => s.size > 1).map(([id]) => id);
log(
  `${e.id}: actors seen ${[...track.keys()].join(", ")}; moved: ${moved.join(", ") || "none"}`,
);
ok(await seen(e.id), `${e.id} is recorded as seen after the run`);

// ---- one a day: a second event the same day does not start
const e2 = data.find(
  (x) =>
    x.villager !== e.villager &&
    x.stage_.map === e.stage_.map &&
    !x.conditions?.weather &&
    !x.conditions?.after,
);
if (e2) {
  const others = data.filter((x) => x.id !== e2.id).map((x) => x.id);
  void others;
  log(`one-a-day probe uses ${e2.id}`);
  await w.p.evaluate((p) => window.farmState(p), {
    hearts: { [e2.villager]: e2.hearts },
    minutes: Math.ceil((toMin(e2.window.from) + 1) / 10) * 10,
    weather: "sunny",
  });
  await sleepMs(500);
  log(
    "one-a-day state",
    JSON.stringify(
      await w.p.evaluate(() => {
        const g = window.__game.registry.get("state");
        return {
          day: g.day.clock.day,
          last: g.heartEvents.lastDay,
          min: g.day.clock.minutes,
        };
      }),
    ),
  );
  await w.p.evaluate(() => {
    const f = window.__game.scene.getScene("farm");
    const o = f.open.bind(f);
    window.__opens = [];
    f.open = (k, d) => {
      if (k === "heart-event")
        window.__opens.push({
          d,
          t: f.state?.day?.clock?.minutes,
          tile: f.eventTile,
          stack: new Error().stack.split("\n").slice(2, 5).join(" | "),
        });
      return o(k, d);
    };
  });
  await walkTo(e2.place_.x, e2.place_.y, e2);
  await sleepMs(1500);
  log("opens", JSON.stringify(await w.p.evaluate(() => window.__opens)));
  if (await inEvent())
    log(
      "second event scene:",
      JSON.stringify(
        await w.p.evaluate(() => {
          const sc = window.__game.scene.getScene("heart-event");
          const g = window.__game.registry.get("state");
          return {
            id: sc.event?.id,
            replay: sc.replay,
            warn: sc.warn,
            pos: sc.run?.position,
            cmd: sc.run?.current()?.cmd,
            day: g.day.clock.day,
            last: g.heartEvents.lastDay,
            seen: g.heartEvents.seen(sc.event?.id),
          };
        }),
      ),
    );
  ok(!(await inEvent()), "a second event the same day does not start");
}

// ---- replay gives nothing and records nothing (opened directly: no journal button yet)
const rich = data.find(
  (x) => x.scene.some((c) => c.cmd === "give") && x.id !== e.id,
);
await w.p.evaluate(() => window.farmState({ hearts: {} }));
const before = await w.bot.snap();
await w.p.evaluate(
  (id) =>
    window.__game.scene
      .getScene("farm")
      .open("heart-event", { id, replay: true }),
  rich.id,
);
await sleepMs(600);
await stepThrough(90000);
const after = await w.bot.snap();
const gives = rich.scene.filter(
  (c) => c.cmd === "give" && (c.item || c.furniture),
);
let gained = 0;
for (const g of gives) {
  const id = g.item ?? g.furniture;
  gained += w.bot.countBase(after, id) - w.bot.countBase(before, id);
}
ok(gained === 0, `a replay of ${rich.id} gives no reward (gained ${gained})`);
ok(!(await seen(rich.id)), `a replay of ${rich.id} is not recorded as seen`);

const errs = w.errs.filter((x) => !/favicon|ERR_ABORTED/.test(String(x)));
ok(
  errs.length === 0,
  `no console or page errors (${errs.slice(0, 3).join(" | ")})`,
);
await w.b.close();
log(fails.length ? `${fails.length} FAILED` : "all passed", GAME_URL);
process.exit(fails.length ? 1 : 0);
