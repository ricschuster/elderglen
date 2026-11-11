// The desktop mouse (note 46): a near click uses the tile under the cursor, a
// far click turns the farmer and uses the adjacent tile, a click on the toolbar
// selects and uses nothing, right-click is Action and shows no browser menu,
// the wheel changes the slot without scrolling the page, and holding the left
// button with the axe keeps chopping. About 40 seconds. Needs `npm run dev`.
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);

/** The screen point at the middle of a tile, from the live camera. */
const screenOf = (tx, ty) =>
  p.evaluate(
    ([tx, ty]) => {
      const scene = window.__game.scene.getScene("farm");
      const cam = scene.cameras.main;
      const ts = 16;
      return {
        x: (tx * ts + ts / 2 - cam.worldView.x) * cam.zoom,
        y: (ty * ts + ts / 2 - cam.worldView.y) * cam.zoom,
      };
    },
    [tx, ty],
  );
const clickTile = async (tx, ty, opts) => {
  const s = await screenOf(tx, ty);
  await p.mouse.click(s.x, s.y, opts);
  await sleepMs(150);
};
const plotAt = async (x, y) =>
  (await bot.snap()).plots.some((q) => q.x === x && q.y === y);

// ---- near and far clicks with the hoe -------------------------------------
await bot.walkTo(61, 20);
const start = await bot.dbg();
await clickTile(62, 21); // one step diagonally: within reach
let d = await bot.dbg();
if (!(await plotAt(62, 21)))
  finding(`near click: the cursor tile (25,16) was not tilled (${d.message})`);
else if (await plotAt(start.target.x, start.target.y))
  finding("near click: it tilled the faced tile as well");
else log("near click: tilled the cursor tile, not the faced one");

await clickTile(67, 20); // six tiles right: out of reach
d = await bot.dbg();
if (d.facing !== "right") finding(`far click: facing ${d.facing}, not right`);
else if (!(await plotAt(62, 20)))
  finding(`far click: the adjacent tile (25,15) was not tilled (${d.message})`);
else log("far click: turned right and tilled the adjacent tile");

// ---- the toolbar and the context menu -------------------------------------
const before = await bot.snap();
const slot2 = await p.evaluate(() => {
  // The HUD is anchored to the window edges, so find the slot on screen.
  const sc = window.__game.scene.getScene("farm");
  const cam = sc.cameras.cameras[sc.cameras.cameras.length - 1];
  const H = window.innerHeight;
  const hits = sc.children.list
    .filter((o) => o.input && o.input.enabled && o.displayWidth < 90)
    .map((o) => ({
      x: cam.x + o.x + o.displayWidth * (0.5 - o.originX),
      y: cam.y + o.y + o.displayHeight * (0.5 - o.originY),
    }))
    .filter((q) => q.y > H * 0.85)
    .sort((a, c) => a.x - c.x);
  return hits[1];
});
await p.mouse.click(slot2.x, slot2.y); // the second toolbar slot
await sleepMs(150);
const after = await bot.snap();
if (after.selected !== 1) finding(`toolbar click: slot ${after.selected}`);
else if (
  after.plots.length !== before.plots.length ||
  after.energy !== before.energy
)
  finding("toolbar click: it also used a tool on the world");
else log("toolbar click: selected slot 2 and used nothing");

await p.evaluate(() => {
  window.__menu = null;
  window.addEventListener("contextmenu", (e) => {
    window.__menu = e.defaultPrevented;
  });
});
await clickTile(25, 15, { button: "right" });
if ((await p.evaluate(() => window.__menu)) !== true)
  finding("right-click: the browser menu was not prevented");
else log("right-click: the browser menu is prevented");

// ---- the wheel -------------------------------------------------------------
const slot = async () => (await bot.snap()).selected;
const s0 = await slot();
await p.mouse.move(400, 200);
await p.mouse.wheel(0, 100);
await sleepMs(100);
const down = await slot();
await p.mouse.wheel(0, -100);
await sleepMs(100);
const up = await slot();
if (down !== s0 + 1 || up !== s0)
  finding(`wheel: down gave ${down}, up gave ${up} from ${s0}`);
else log("wheel: down is the next slot, up the previous");
for (let i = 0; i < 4; i++) {
  await p.mouse.wheel(0, 25);
  await sleepMs(30);
}
if ((await slot()) !== s0 + 1)
  finding("wheel: four small deltas did not make one step");
if ((await p.evaluate(() => window.scrollY)) !== 0)
  finding("wheel: the page scrolled");

// ---- hold the left button with the axe ------------------------------------
await bot.select(2);
const trees = (
  await p.evaluate(() => window.__game.registry.get("state").trees.save())
).filter((t) => t.stage === 5 && !t.stump); // mature: it takes many swings
const here = (await bot.dbg()).tile;
const t = trees
  .map((q) => ({ q, d: Math.abs(q.x - here.x) + Math.abs(q.y - here.y) }))
  .sort((a, c) => a.d - c.d)[0]?.q;
if (!t) finding("hold: no tree to chop");
else {
  const stand = [
    { x: t.x, y: t.y + 1 },
    { x: t.x, y: t.y - 1 },
    { x: t.x - 1, y: t.y },
    { x: t.x + 1, y: t.y },
  ]
    .map((c) => ({ c, d: bot.dist(here, c) }))
    .filter((e) => e.d < Infinity)
    .sort((a, c) => a.d - c.d)[0]?.c;
  if (!stand) finding("hold: no tile beside the tree is reachable");
  else {
    await bot.walkTo(stand.x, stand.y);
    const s = await screenOf(t.x, t.y);
    await p.mouse.move(s.x, s.y);
    await p.mouse.down();
    await sleepMs(1800);
    const hits = await p.evaluate(
      ([x, y]) => window.__game.registry.get("state").trees.at(x, y)?.hits,
      [t.x, t.y],
    );
    await p.mouse.up();
    await sleepMs(900);
    const later = await p.evaluate(
      ([x, y]) => window.__game.registry.get("state").trees.at(x, y)?.hits,
      [t.x, t.y],
    );
    if (!(hits >= 3))
      finding(`hold: only ${hits} swings in 1.8 s, expected a repeat`);
    else if (later !== hits)
      finding(`hold: it kept swinging after release (${hits} to ${later})`);
    else log(`hold: ${hits} swings while held, none after release`);
  }
}

if (errs.length) finding(`mouse errors: ${errs.join(" | ")}`);
await b.close();
log(findings.length ? `${findings.length} findings` : "no findings");
process.exit(findings.length ? 1 : 0);
