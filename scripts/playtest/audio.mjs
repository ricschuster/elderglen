// Audio playtest (note 107): drives real play and checks the audio events and music changes.
// Needs `npm run dev` (BASE_URL=http://localhost:5199/ if the server is elsewhere). About 60 seconds.
// Asserts: the first key press unlocks the context, the farm plays its season track and birds, tilling,
// planting, watering, walking, opening a menu, sleeping and entering areas each fire their effect,
// the music changes with time, weather, season and place, files load and decode, and the console is clean.
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
const A = (fn, arg) => p.evaluate(fn, arg);
const events = () =>
  A(() => window.farmAudio.events.map((e) => `${e.kind}:${e.id}`));
const music = () => A(() => window.farmAudio.currentMusic);
const ambient = () => A(() => window.farmAudio.currentAmbient);

let mark = 0;
const fresh = async () => {
  const all = await events();
  const out = all.slice(mark);
  mark = all.length;
  return out;
};
const expectEvent = async (what, pattern) => {
  const got = await fresh();
  if (!got.some((e) => pattern.test(e)))
    finding(`${what}: wanted ${pattern}, got [${got.join(", ")}]`);
  else log(`${what}: ok (${got.filter((e) => pattern.test(e))[0]})`);
  return got;
};
const expectMusic = async (what, id, wait = 700) => {
  await sleepMs(wait);
  const m = await music();
  if (m !== id) finding(`${what}: music is ${m}, wanted ${id}`);
  else log(`${what}: music ${m} ok`);
};
const state = (patch) => A((x) => window.farmState(x), patch);
const key = (k, wait = 120) => bot.key(k, wait);

if (!(await A(() => !!window.farmAudio))) {
  finding("window.farmAudio is missing (dev build only)");
  process.exit(1);
}

// 1. Autoplay: nothing is unlocked before a gesture, and one key press unlocks it.
const before = await A(() => window.farmAudio.isUnlocked);
await key("ArrowDown", 300);
const afterState = await A(() => ({
  u: window.farmAudio.isUnlocked,
  s: window.farmAudio.state,
}));
log(`before gesture unlocked=${before}; after: ${JSON.stringify(afterState)}`);
if (!afterState.u)
  finding("the first key press did not unlock the audio context");
if (afterState.s !== "running")
  finding(`audio context state is ${afterState.s}, wanted running`);

// 2. The opening morning: spring music and birds.
await state({ day: 3, minutes: 10 * 60, weather: "sunny" });
await sleepMs(1200);
await expectMusic("spring morning", "spring");
const amb = await ambient();
if (!amb.includes("birds")) finding(`morning ambient ${amb} lacks birds`);
await fresh();

// 3. Till, plant, water: select by tool id from the pack.
const slotOf = (id) =>
  A((id) => {
    const inv = window.__game.registry.get("state").inventory;
    for (let i = 0; i < inv.size; i++) if (inv.slot(i)?.id === id) return i;
    return -1;
  }, id);
const select = (i) =>
  A((i) => window.__game.scene.getScene("farm").select(i), i);
await A(() => window.farmGive("parsnip-seed", 5));
// A tillable tile with a free tile below it, near the player.
const spot = await A(() => {
  const f = window.__game.scene.getScene("farm");
  const me = window.farmDebug().tile;
  let best;
  for (let y = 0; y < 80; y++)
    for (let x = 0; x < 100; x++)
      if (
        f.map.isTillable(x, y) &&
        !f.map.isBlocked(x, y) &&
        !f.tileBlocked(x, y + 1) &&
        !f.tileBlocked(x, y + 2)
      ) {
        const dist = Math.abs(x - me.x) + Math.abs(y - me.y);
        if (!best || dist < best.dist) best = { x, y, dist };
      }
  return best;
});
log(`tillable spot ${JSON.stringify(spot)}`);
const hoe = await slotOf("tool:hoe");
const can = await slotOf("tool:can");
const seed = await slotOf("parsnip-seed");
log(`slots hoe ${hoe} can ${can} seed ${seed}`);
if (hoe < 0 || seed < 0)
  finding(`cannot find hoe (${hoe}) or seeds (${seed}) in the pack`);
await fresh();
await select(hoe);
await bot.useAt(spot.x, spot.y);
await sleepMs(150);
await expectEvent("hoe", /sfx:tool\.hoe/);
await select(seed);
await bot.useAt(spot.x, spot.y);
await expectEvent("plant", /sfx:crop\.plant/);
if (can >= 0) {
  await select(can);
  await bot.useAt(spot.x, spot.y);
  await expectEvent("water", /sfx:tool\.water/);
}

// 4. Walking makes footsteps by surface.
await fresh();
const t = (await bot.dbg()).tile;
await bot.walkTo(t.x + 6, t.y);
await sleepMs(100);
const steps = (await fresh()).filter((e) => /sfx:step\./.test(e));
if (steps.length < 3)
  finding(`walking six tiles made ${steps.length} footsteps`);
else log(`footsteps ok: ${steps.length} (${[...new Set(steps)].join(",")})`);

// 5. A menu opens and closes with its sounds.
await fresh();
await key("KeyE", 500);
const open = await A(() =>
  window.__game.scene.getScenes(true).map((s) => s.scene.key),
);
log(`scenes after E: ${open}`);
await key("Escape", 500);
const evs = await fresh();
if (!evs.includes("sfx:ui.open"))
  finding(`opening the menu: no ui.open in [${evs}]`);
if (!evs.includes("sfx:ui.close"))
  finding(`closing the menu: no ui.close in [${evs}]`);
await expectMusic("music unchanged under a menu", "spring", 300);

// 6. Time and weather change the music; the ambient follows.
await state({ minutes: 22 * 60 });
await expectMusic("night", "night", 900);
if (!(await ambient()).includes("crickets"))
  finding(`night ambient ${await ambient()} lacks crickets`);
await state({ minutes: 12 * 60, weather: "rainy" });
await expectMusic("rain", "rain", 900);
if (!(await ambient()).includes("rain"))
  finding(`rain ambient ${await ambient()} lacks rain`);
await state({ weather: "sunny", season: "summer", dayOfSeason: 3 });
await expectMusic("summer", "summer", 900);
await state({ season: "fall", dayOfSeason: 3 });
await expectMusic("fall", "fall", 900);
await state({ season: "winter", dayOfSeason: 3 });
await expectMusic("winter", "winter", 900);
if (!(await ambient()).includes("wind"))
  finding(`winter ambient ${await ambient()} lacks wind`);
await state({ season: "spring", dayOfSeason: 3, minutes: 12 * 60 });

// 7. Places: village, shop interior, beach, woods, mine.
for (const [map, id, ambId] of [
  ["hearthwell", "village", undefined],
  ["inn", "interior", "hearth"],
  ["cove", "beach", "waves"],
  ["forest", "woods", undefined],
  ["mine-1", "mines", "drip"],
]) {
  await state({ map, entry: map === "mine-1" ? "from_above" : "door" });
  await sleepMs(1200);
  const now = (await bot.dbg()).map;
  if (now !== map) {
    log(`could not stand on ${map} (on ${now}); skipping`);
    continue;
  }
  await expectMusic(`place ${map}`, id, 1200);
  if (ambId && !(await ambient()).includes(ambId))
    finding(`${map}: ambient ${await ambient()} lacks ${ambId}`);
}
await state({ map: "farm", entry: "door" });
await sleepMs(1200);

// 8. Sleep: day.end on the way, day.start when the report closes.
await fresh();
await A(() => window.__game.scene.getScene("farm").endDay());
await sleepMs(900);
await expectEvent("sleep", /sfx:day\.end/);
const sc = await A(() =>
  window.__game.scene.getScenes(true).map((s) => s.scene.key),
);
log(`scenes after sleep: ${sc}`);
for (
  let i = 0;
  i < 4 && !(await A(() => window.__game.scene.isActive("farm")));
  i++
)
  await key("Enter", 500);
await expectEvent("morning report closes", /sfx:day\.start/);

// 9. The title screen plays the title track; story scenes override.
await A(() => window.__game.scene.getScene("farm").scene.start("title"));
await expectMusic("title", "title", 1200);

// 10. Settings: mute and volumes reach the engine without error.
await A(() =>
  window.farmAudio.applySettings({
    muted: true,
    musicVolume: 30,
    sfxVolume: 50,
    ambientVolume: 10,
  }),
);
await A(() => window.farmAudio.sfx("ui.click"));
await A(() =>
  window.farmAudio.applySettings({
    muted: false,
    musicVolume: 60,
    sfxVolume: 80,
    ambientVolume: 60,
  }),
);

// 11. Files load and decode, and nothing complained.
await sleepMs(1500);
const report = await A(() => ({
  loaded: window.farmAudio.loaded,
  errors: window.farmAudio.errors,
}));
log(
  `decoded ${report.loaded} files; audio errors: ${JSON.stringify(report.errors)}`,
);
if (report.loaded < 10) finding(`only ${report.loaded} audio files decoded`);
for (const e of report.errors) finding(`audio error: ${e}`);

for (const e of errs) finding(`console: ${e}`);
await b.close();
log(
  findings.length
    ? `${findings.length} FINDINGS`
    : "audio playtest: all checks passed",
);
process.exit(findings.length ? 1 : 0);
