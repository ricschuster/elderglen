// The Forest, part 1 (note 72): walk from the farm's north exit into the Forest,
// check its own trees and forage are swapped in, chop a grove tree, pick forage,
// leave by the south road, then pass the night away from the farm.
// Run with `npm run dev` going: node scripts/playtest/forest.mjs
// (BASE_URL=http://localhost:5174/ if the dev server picked another port.)
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

const farmTrees = await state((s) => s.trees.count);
log(`farm trees at the start: ${farmTrees}`);

// ---- farm to Forest by the north exit.
await bot.walkTo(46, 1);
await bot.face("up");
await bot.key("KeyX", 200);
await sleepMs(800);
let d = await bot.dbg();
if (d.map !== "forest") finding(`expected the forest, on ${d.map}`);
log(`on ${d.map} at ${JSON.stringify(d.tile)}`);
await bot.shot("forest-arrive");
const inForest = await state((s) => ({
  trees: s.trees.count,
  rocks: s.rocks.count,
  weeds: s.weeds.count,
  twigs: s.twigs.count,
  forage: [...s.forage.each()].length,
  away: s.away?.mapId,
}));
log(`forest world: ${JSON.stringify(inForest)}`);
if (inForest.away !== "forest") finding("the Forest world was not swapped in");
if (inForest.trees < 150) finding(`forest has ${inForest.trees} trees`);

// ---- walk to the nearest mature oak of grove G3 and chop it.
const trees = await state((s) => s.trees.save());
const here = d.tile;
const target = trees
  .filter(
    (t) => t.stage === 5 && !t.stump && t.x >= 38 && t.x <= 62 && t.y >= 84,
  )
  .sort(
    (a, c) =>
      Math.hypot(a.x - here.x, a.y - here.y) -
      Math.hypot(c.x - here.x, c.y - here.y),
  )[0];
log(`target tree ${JSON.stringify(target)}`);
await bot.select(2); // axe
let stood = false;
for (const [dx, dy, dir] of [
  [0, 1, "up"],
  [0, -1, "down"],
  [-1, 0, "right"],
  [1, 0, "left"],
]) {
  try {
    await bot.walkTo(target.x + dx, target.y + dy);
    await bot.face(dir);
    stood = true;
    break;
  } catch {
    // try the next side
  }
}
if (!stood) finding("could not walk beside the grove tree");
const wood0 = (await bot.dbg()).wood;
await p.keyboard.down("KeyC");
const t0 = Date.now();
while (Date.now() - t0 < 20000) {
  const t = await state((s, a) => s.trees.at(a.x, a.y)?.stump, target);
  if (t) break;
  await sleepMs(100);
}
await p.keyboard.up("KeyC");
await sleepMs(300);
const wood1 = (await bot.dbg()).wood;
log(`wood ${wood0} -> ${wood1}`);
if (wood1 - wood0 < 12) finding(`a mature oak gave ${wood1 - wood0} wood`);
const farmCheck = await state((s) => s.away.home.trees.count);
if (farmCheck !== farmTrees) finding("the farm's trees changed in the Forest");

// ---- pick forage.
const goods = await state((s) => [...s.forage.each()]);
log(`forage out: ${goods.length}`);
if (goods.length === 0) finding("no forage out in the Forest");
else {
  const f = goods[0];
  let ok = false;
  for (const [dx, dy, dir] of [
    [0, 1, "up"],
    [0, -1, "down"],
    [-1, 0, "right"],
    [1, 0, "left"],
  ]) {
    try {
      await bot.walkTo(f.x + dx, f.y + dy);
      await bot.face(dir);
      ok = true;
      break;
    } catch {
      // next side
    }
  }
  if (ok) {
    await p.keyboard.press("KeyX");
    await sleepMs(300);
    const left = await state((s, a) => s.forage.itemAt(a.x, a.y), f);
    if (left) finding(`forage ${f.id} was not picked up`);
  } else finding("could not reach a forage spot");
}

// ---- pass the night in the Forest: wake at home, the Forest has its own morning.
const day0 = (await bot.snap()).day;
await bot.key("z", 500);
await bot.key("Enter", 800);
await sleepMs(500);
d = await bot.dbg();
const s1 = await bot.snap();
log(`after the night: map ${d.map}, day ${s1.day}`);
if (s1.day !== day0 + 1) finding(`the night moved day ${day0} to ${s1.day}`);
if (d.map !== "farm") finding(`woke on ${d.map}, not the farm`);
const after = await state((s) => ({
  farm: s.trees.count,
  away: s.away?.mapId ?? null,
  forest: s.areas.forest.trees.count,
  forageOut: [...s.areas.forest.forage.each()].length,
}));
log(`world after the night: ${JSON.stringify(after)}`);
if (after.away) finding("still in the Forest world at home");
if (after.forageOut === 0)
  finding("no new forage in the Forest in the morning");
await bot.shot("farm-morning");

// ---- back into the Forest by the north exit, and out by the south road.
await bot.walkTo(46, 1);
await bot.face("up");
await bot.key("KeyX", 200);
await sleepMs(800);
d = await bot.dbg();
if (d.map !== "forest") finding(`second visit: on ${d.map}`);
await bot.walkTo(73, 118);
await bot.face("down");
await bot.key("KeyX", 200);
await sleepMs(800);
d = await bot.dbg();
if (d.map !== "farm") finding(`leaving by the south road reached ${d.map}`);
const home = await state((s) => ({
  away: s.away?.mapId ?? null,
  t: s.trees.count,
}));
if (home.away || home.t !== after.farm)
  finding("the farm's world did not come back");

if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
