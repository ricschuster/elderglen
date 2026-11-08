// The wood persona: a player who only chops. It fells the starting trees with a
// held Use key, sleeps when the energy runs low, and reports how many days of
// chopping it takes to reach the 450 wood for house tier 1. It measures the
// energy a tree costs and how much wood a tree and its stump give.
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const TARGET = Number(process.env.WOOD_TARGET ?? 450);
const KEEP = 25; // stop chopping under this much energy (a tree costs about 20)
const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);

const treeList = () =>
  p.evaluate(() => window.__game.registry.get("state").trees.save());
const treeAt = (x, y) =>
  p.evaluate(
    ([x, y]) => !!window.__game.registry.get("state").trees.at(x, y),
    [x, y],
  );
const wood = async () => (await bot.dbg()).wood;
const ground = () =>
  p.evaluate(() =>
    window.__game.registry
      .get("state")
      .ground.each()
      .reduce((n, g) => (g.id === "wood" ? n + g.count : n), 0),
  );

async function chop(t) {
  await bot.refreshMap();
  const here = (await bot.dbg()).tile;
  const cands = [
    { x: t.x, y: t.y + 1, dir: "up" },
    { x: t.x, y: t.y - 1, dir: "down" },
    { x: t.x - 1, y: t.y, dir: "right" },
    { x: t.x + 1, y: t.y, dir: "left" },
  ]
    .map((c) => ({ ...c, d: bot.dist(here, c) }))
    .filter((c) => c.d < Infinity)
    .sort((a, c) => a.d - c.d);
  if (!cands.length) return null;
  const c = cands[0];
  await bot.walkTo(c.x, c.y);
  await bot.face(c.dir);
  const f = await bot.dbg();
  if (f.target.x !== t.x || f.target.y !== t.y) return null;
  const e0 = f.energy;
  const w0 = (await wood()) + (await ground());
  const t0 = Date.now();
  await p.keyboard.down("KeyC");
  while ((await treeAt(t.x, t.y)) && Date.now() - t0 < 25000)
    await sleepMs(100);
  await p.keyboard.up("KeyC");
  await sleepMs(300);
  const e1 = (await bot.dbg()).energy;
  const w1 = (await wood()) + (await ground());
  return { energy: e0 - e1, wood: w1 - w0, ms: Date.now() - t0 };
}

await bot.select(2); // axe
const day0 = (await bot.snap()).day;
let trees = 0;
const spent = [];
for (let guard = 0; guard < 400; guard++) {
  const d = await bot.dbg();
  if ((await wood()) + (await ground()) >= TARGET) break;
  if (d.energy < KEEP) {
    const s0 = await bot.snap();
    await bot.key("z", 500);
    await bot.key("Enter", 500);
    const s1 = await bot.snap();
    log(
      `night ${s0.day}: wood ${await wood()}, ${trees} trees so far, energy ${s1.energy}`,
    );
    if (s1.day !== s0.day + 1)
      finding(`sleep moved day ${s0.day} to ${s1.day}`);
    await bot.select(2);
    continue;
  }
  const all = (await treeList()).filter((t) => t.stage >= 4 || t.stump);
  const here = d.tile;
  const ranked = all
    .map((t) => ({ t, d: Math.abs(t.x - here.x) + Math.abs(t.y - here.y) }))
    .sort((a, c) => a.d - c.d);
  let did = null;
  for (const { t } of ranked.slice(0, 6)) {
    try {
      did = await chop(t);
    } catch (e) {
      log("skip tree", t.x, t.y, e.message);
    }
    if (did) break;
  }
  if (!did) {
    finding("no reachable tree left to chop");
    break;
  }
  trees++;
  spent.push(did);
  log(
    `tree ${trees}: ${did.energy.toFixed(1)} energy, ${did.wood} wood, ${(did.ms / 1000).toFixed(1)}s`,
  );
}
const s = await bot.snap();
const days = s.day - day0 + 1;
const tot = spent.reduce((a, c) => a + c.energy, 0);
const w = (await wood()) + (await ground());
log(
  `RESULT: ${w} wood from ${trees} trees on ${days} day(s), ${tot.toFixed(0)} energy (${(tot / Math.max(trees, 1)).toFixed(1)} a tree and stump, ${(w / Math.max(trees, 1)).toFixed(1)} wood a tree and stump)`,
);
if (days > 3) finding(`reaching ${TARGET} wood took ${days} days of chopping`);
await bot.shot("wood-done");
log("errors", JSON.stringify(errs));
log("FINDINGS:\n" + (findings.length ? findings.join("\n") : "none"));
await b.close();
