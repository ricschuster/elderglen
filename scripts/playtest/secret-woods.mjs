// The Secret Woods (note 73): with a steel axe, chop the massive log in the
// Forest (the exit is shut before), walk through into the woods, chop a daily
// large stump for 2 Hardwood, then pass the night and find the stump back.
// Run with `npm run dev` going: node scripts/playtest/secret-woods.mjs
// (BASE_URL=http://localhost:5174/ if the dev server picked another port.)
// The start is a scene restart at the Forest's `from_secret_woods` entry, not a
// walk from the farm (the Forest walk is covered by forest.mjs).
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
      const scene = window.__game.scene.getScenes(true)[0];
      scene.scene.restart({ map: m, entry: e });
    },
    [map, entry],
  );

// Grant a steel axe (tier 2), as the smith would after two upgrades.
await state((s) => {
  s.toolTiers.axe = 2;
});
await travel("forest", "from_secret_woods");
await sleepMs(1200);
let d = await bot.dbg();
if (d.map !== "forest") finding(`expected the forest, on ${d.map}`);
log(`on ${d.map} at ${JSON.stringify(d.tile)}`);

// ---- the log is solid and the exit is shut until it is chopped.
await bot.select(2); // axe
await bot.walkTo(8, 15);
await bot.face("left");
await p.keyboard.down("ArrowLeft");
await sleepMs(500);
await p.keyboard.up("ArrowLeft");
d = await bot.dbg();
if (d.tile.x < 8)
  finding(`walked through the log to ${JSON.stringify(d.tile)}`);
const hw0 = await state((s) => s.inventory.count("hardwood"));
await p.keyboard.press("KeyC");
await sleepMs(500);
const hw1 = await state((s) => s.inventory.count("hardwood"));
const flag = await state((s) => (s.flags ?? []).includes("secret-log-cleared"));
log(`hardwood ${hw0} -> ${hw1}, flag ${flag}`);
if (hw1 - hw0 !== 8) finding(`the log gave ${hw1 - hw0} hardwood, not 8`);
if (!flag) finding("the log flag was not set");
await bot.shot("log-cleared");

// ---- walk on through the gap and out of the west exit.
await bot.walkTo(1, 15);
await bot.face("left");
await bot.key("KeyX", 200);
await sleepMs(800);
d = await bot.dbg();
if (d.map !== "secret-woods") {
  finding(`expected the secret woods, on ${d.map}`);
  await travel("secret-woods", "from_forest");
  await sleepMs(1200);
}
log(`on ${(await bot.dbg()).map}`);
await bot.shot("secret-woods-arrive");

// ---- chop the nearest daily stump.
const world = await state((s) => ({
  away: s.away?.mapId,
  trees: [...s.trees.each()].map((t) => ({ x: t.x, y: t.y, large: t.large })),
}));
if (world.away !== "secret-woods")
  finding("the woods world was not swapped in");
if (world.trees.length !== 6) finding(`woods has ${world.trees.length} stumps`);
const here = (await bot.dbg()).tile;
const target = [...world.trees].sort(
  (a, c) =>
    Math.hypot(a.x - here.x, a.y - here.y) -
    Math.hypot(c.x - here.x, c.y - here.y),
)[0];
log(`target stump ${JSON.stringify(target)}`);
await bot.select(2);
let stood = false;
for (const [dx, dy, dir] of [
  [1, 0, "left"],
  [0, 1, "up"],
  [0, -1, "down"],
  [-1, 0, "right"],
]) {
  try {
    await bot.walkTo(target.x + dx, target.y + dy);
    await bot.face(dir);
    stood = true;
    break;
  } catch {
    // next side
  }
}
if (!stood) finding("could not walk beside the stump");
const h0 = await state((s) => s.inventory.count("hardwood"));
await p.keyboard.down("KeyC");
const t0 = Date.now();
while (Date.now() - t0 < 20000) {
  const r = await state((s, a) => s.trees.at(a.x, a.y)?.regrow, target);
  if (r) break;
  await sleepMs(100);
}
await p.keyboard.up("KeyC");
await sleepMs(300);
const h1 = await state((s) => s.inventory.count("hardwood"));
log(`hardwood ${h0} -> ${h1}`);
if (h1 - h0 !== 2) finding(`a large stump gave ${h1 - h0} hardwood, not 2`);

// ---- pass the night: wake at home, the stump is back in the woods.
const day0 = (await bot.snap()).day;
await bot.key("z", 500);
await bot.key("Enter", 800);
await sleepMs(500);
d = await bot.dbg();
const s1 = await bot.snap();
log(`after the night: map ${d.map}, day ${s1.day}`);
if (s1.day !== day0 + 1) finding(`the night moved day ${day0} to ${s1.day}`);
const back = await state((s, a) => {
  const t = s.areas["secret-woods"].trees.at(a.x, a.y);
  return t ? { regrow: t.regrow ?? null, stage: t.stage } : null;
}, target);
log(`stump after the night: ${JSON.stringify(back)}`);
if (!back || back.regrow || back.stage !== 5)
  finding("the stump did not regrow overnight");
const forageOut = await state(
  (s) => [...s.areas["secret-woods"].forage.each()].length,
);
if (forageOut === 0) finding("no forage in the Secret Woods in the morning");

if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
