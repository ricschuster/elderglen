// Heart event motion on a real map (note 62, build step 2): a `walk` moves a sprite tile by tile, a `pan`
// moves the camera, the farm's clock does not tick, and control comes back with the player where it was.
// The event is a throwaway one added to HEART_EVENTS for this run, on the Hearthwell square.
// Run: npm run dev, then `BASE_URL=http://localhost:5173/ node scripts/playtest/event-move.mjs`.
// Exit code 1 when a check fails.
import { launch, Bot, log, sleepMs } from "./lib.mjs";

const w = await launch({ fresh: true });
w.bot = new Bot(w.p, w.errs);
const fails = [];
const ok = (cond, msg) => {
  log(cond ? "pass" : "FAIL", msg);
  if (!cond) fails.push(msg);
};
const wait = async (fn, ms = 8000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleepMs(50);
  }
  return false;
};

await w.p.evaluate((p) => window.farmState(p), {
  season: "spring",
  dayOfSeason: 3,
  minutes: 600,
  weather: "sunny",
  map: "hearthwell",
  entry: "from_farm",
});
await sleepMs(900);

// A scene that names real marks and a real path on the hearthwell map.
const names = await w.p.evaluate(async () => {
  // The game's own copy of the module (Vite serves it under a stamped URL).
  const url = performance
    .getEntriesByType("resource")
    .map((r) => r.name)
    .find((n) => /\/src\/core\/heartevents\.ts/.test(n));
  const ev = await import(url ?? "/src/core/heartevents.ts");
  const map = await import("/src/core/map.ts");
  const maps = await import("/src/content/maps.ts");
  const st = map.stageNames(maps.mapFiles.hearthwell);
  ev.HEART_EVENTS.push({
    id: "event-move-probe",
    villager: "odette",
    place: "hw:square",
    hearts: 0,
    scene: [
      { cmd: "place", who: "player", mark: "square_entry" },
      { cmd: "place", who: "odette", mark: "square_centre" },
      { cmd: "pan", to: "odette" },
      { cmd: "walk", who: "odette", path: "square_centre_to_entry" },
      { cmd: "pose", who: "odette", pose: "bow" },
      { cmd: "pan", to: "square_entry" },
      { cmd: "snap" },
      { cmd: "hold", ms: 100 },
    ],
  });
  return { marks: st.marks, paths: st.paths };
});
log(
  "square paths:",
  names.paths.filter((n) => n.startsWith("square_")).join(", "),
);
const before = await w.bot.snap();
const spot = await w.bot.dbg();
await w.p.evaluate(() => {
  const g = window.__game;
  g.scene.getScene("farm").open("heart-event", { id: "event-move-probe" });
});
ok(
  await wait(async () => (await w.bot.snap()).scenes.includes("heart-event")),
  "the event scene opens",
);

const probe = () =>
  w.p.evaluate(() => {
    const sc = window.__game.scene.getScene("heart-event");
    if (!sc?.run || !window.__game.scene.isActive("heart-event")) return null;
    const o = sc.actors.get("odette");
    return {
      cmd: sc.run.current()?.cmd ?? "",
      real: !!sc.cam,
      cam: sc.cam ? [sc.cam.scrollX, sc.cam.scrollY, sc.cam.zoom] : null,
      odette: o ? [o.box.x, o.box.y, o.box.flipX] : null,
      cams: sc.cameras.cameras.length,
    };
  });
const first = await probe();
ok(
  first?.real === true,
  "the scene draws the event's own map with a stage camera",
);
const pos = new Set();
const cams = new Set();
let sawWalk = false;
let sawPan = false;
const end = Date.now() + 30000;
while (Date.now() < end) {
  const s = await probe();
  if (!s) break;
  if (s.cmd === "walk") sawWalk = true;
  if (s.cmd === "pan") sawPan = true;
  if (s.odette && sawWalk)
    pos.add(`${Math.round(s.odette[0])},${Math.round(s.odette[1])}`);
  if (s.cam) cams.add(`${Math.round(s.cam[0])},${Math.round(s.cam[1])}`);
  await sleepMs(40);
}
ok(
  sawWalk && pos.size > 3,
  `Odette's position changes during the walk (${pos.size} positions)`,
);
ok(
  sawPan && cams.size > 3,
  `the camera scroll changes during the pans (${cams.size} scrolls)`,
);
ok(
  await wait(
    async () => !(await w.bot.snap()).scenes.includes("heart-event"),
    5000,
  ),
  "control returns to the farm",
);
const after = await w.bot.snap();
const spot2 = await w.bot.dbg();
ok(
  after.minutes === before.minutes && after.day === before.day,
  `the clock did not move (${before.minutes} to ${after.minutes})`,
);
ok(
  spot.map === spot2.map &&
    Math.abs(spot.pos.x - spot2.pos.x) < 1 &&
    Math.abs(spot.pos.y - spot2.pos.y) < 1,
  "the player is on the same map and tile",
);
const cams2 = await w.p.evaluate(
  () => window.__game.scene.getScene("farm").cameras.cameras.length,
);
ok(cams2 === 2, `the farm keeps its own two cameras (${cams2})`);
const errs = w.errs?.length ?? 0;
ok(errs === 0, `no console errors (${w.errs.slice(0, 3).join(" | ")})`);
await w.b.close();
process.exit(fails.length ? 1 : 0);
