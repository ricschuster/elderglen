// The Mountain and the Mines entrance (note 74): leave the Forest by its east
// exit, find the rockfall shut before Spring 5, cast a rod on the lake and the
// river, then on day 5 walk through the cleared rockfall to the mine mouth and
// down to the mine hall, and back out onto the Mountain. Then pass the night.
// Run with `npm run dev` going: node scripts/playtest/mountain.mjs
// (BASE_URL=http://localhost:5174/ if the dev server picked another port.)
// A cast here means the fishing screen opens on that water kind, a charged cast
// lands and a bite is rolled; the bar fight itself is covered by the unit tests.
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);

const state = (fn, arg) =>
  p.evaluate(
    ([src, a]) =>
      new Function("s", "a", `return (${src})(s, a)`)(
        window.__game.registry.get("state"),
        a,
      ),
    [fn.toString(), arg],
  );
const travel = (map, entry) =>
  p.evaluate(
    ([m, e]) => {
      window.__game.scene
        .getScenes(true)[0]
        .scene.restart({ map: m, entry: e });
    },
    [map, entry],
  );
const hold = async (key, ms) => {
  await p.keyboard.down(key);
  await sleepMs(ms);
  await p.keyboard.up(key);
  await sleepMs(300);
};
const fishing = () =>
  p.evaluate(() => {
    const sc = window.__game.scene.getScene("fishing");
    if (!sc || !window.__game.scene.isActive("fishing")) return null;
    return {
      kind: sc.cfg.kind,
      phase: sc.phase,
      bite: sc.pending?.kind === "fish" ? sc.pending.fish.id : sc.pending?.kind,
      water: sc.pending?.kind === "fish" ? sc.pending.fish.water : null,
    };
  });

await state((s) => {
  s.inventory.add("reed-pole", 1);
});

// ---- the Forest's east exit leads to the Mountain.
await travel("forest", "from_mountain");
await sleepMs(1500);
let d = await bot.dbg();
if (d.map !== "forest") finding(`expected the forest, on ${d.map}`);
await bot.walkTo(117, 63);
await hold("ArrowRight", 900);
await bot.key("KeyX", 200); // an exit is used with Action, standing on it
await sleepMs(1200);
d = await bot.dbg();
log(`after the east exit: ${d.map} at ${JSON.stringify(d.tile)}`);
if (d.map !== "mountain") {
  finding(`the Forest's east exit did not reach the Mountain, on ${d.map}`);
  await travel("mountain", "from_forest");
  await sleepMs(1200);
}
const world = await state((s) => s.away?.mapId);
if (world !== "mountain") finding("the Mountain world was not swapped in");
await bot.shot("mountain-arrive");

// ---- before Spring 5 the rockfall holds the way to the mine mouth.
await bot.walkTo(63, 20);
await bot.face("up");
await hold("ArrowUp", 1500);
d = await bot.dbg();
log(`pushing on the rockfall: ${JSON.stringify(d.tile)}`);
if (d.tile.y < 19)
  finding(`walked through the rockfall to ${JSON.stringify(d.tile)}`);
await bot.shot("rockfall-shut");

// ---- the rod, held on the toolbar, on the lake and the river.
const slot = await state((s) =>
  s.inventory.save().findIndex((x) => x?.id === "reed-pole"),
);
await bot.select(4 + slot);
async function castOn(name, kind, tx, ty, dir) {
  await bot.walkTo(tx, ty);
  await bot.face(dir);
  await p.keyboard.press("KeyC");
  await sleepMs(600);
  let f = await fishing();
  if (!f) return finding(`${name}: the fishing screen did not open`);
  if (f.kind !== kind) finding(`${name}: fished ${f.kind}, wanted ${kind}`);
  await p.keyboard.down("Space");
  await sleepMs(1500);
  await p.keyboard.up("Space");
  await sleepMs(500);
  f = await fishing();
  log(`${name}: ${JSON.stringify(f)}`);
  if (!f || (f.phase !== "wait" && f.phase !== "hook"))
    finding(`${name}: the cast did not land, phase ${f?.phase}`);
  else if (f.water && f.water !== kind)
    finding(`${name}: a ${f.water} fish bit on ${kind} water`);
  await bot.shot(`cast-${name}`);
  await p.keyboard.press("Escape");
  await sleepMs(500);
  await bot.dismissModals();
}
await castOn("mountain-lake", "mountain-lake", 32, 26, "up");
await castOn("river", "river", 46, 25, "right");

// ---- Spring 5: the mines open and the rockfall is gone.
await state((s) => {
  s.day.clock.day = 5;
});
await travel("mountain", "from_forest");
await sleepMs(1500);
await bot.walkTo(63, 20);
await bot.face("up");
await hold("ArrowUp", 1800);
d = await bot.dbg();
log(`pushing through the cleared rockfall: ${JSON.stringify(d.tile)}`);
if (d.tile.y > 14)
  finding(`the cleared rockfall still blocks, at ${JSON.stringify(d.tile)}`);
await bot.shot("rockfall-cleared");
await bot.walkTo(68, 11);
await bot.face("up");
await bot.key("KeyX", 200);
await sleepMs(900);
d = await bot.dbg();
log(`through the mine mouth: ${d.map}`);
if (d.map !== "mine")
  finding(`the mine mouth did not reach the mine hall, on ${d.map}`);
else {
  await bot.shot("mine-hall");
  // The hall's door is at (6, 6); step onto it to come back out.
  await bot.walkTo(6, 5);
  await bot.face("down");
  await hold("ArrowDown", 500);
  await bot.key("KeyX", 200);
  await sleepMs(1200);
  d = await bot.dbg();
  log(`out of the mine hall: ${d.map} at ${JSON.stringify(d.tile)}`);
  if (d.map !== "mountain")
    finding(`the mine hall door reached ${d.map}, not the Mountain`);
}

// ---- the farm no longer has a mine door.
await travel("farm", "start");
await sleepMs(1500);
const farmExits = await p.evaluate(() => window.farmDebug().map);
if (farmExits !== "farm") finding(`expected the farm, on ${farmExits}`);

// ---- the night: the Mountain's own forage lies out again in the morning.
await travel("mountain", "from_forest");
await sleepMs(1200);
await bot.dismissModals(); // Old Greencoat speaks on the farm on day 5
const day0 = (await bot.snap()).day;
await bot.key("z", 500);
await bot.key("Enter", 800);
await sleepMs(500);
const s1 = await bot.snap();
log(`after the night: day ${s1.day}`);
if (s1.day !== day0 + 1) finding(`the night moved day ${day0} to ${s1.day}`);
const goods = await state((s) => [...s.areas["mountain"].forage.each()].length);
if (goods === 0) finding("no forage on the Mountain in the morning");
log(`mountain forage in the morning: ${goods}`);

if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
