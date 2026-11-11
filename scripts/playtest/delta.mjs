// The River delta and Beach (note 75): leave the farm by its south exit, cast a
// rod on each water kind (marsh lake, river channel, sea), buy a rod at the
// fisher's counter, find the tide pool footbridge broken, mend it with 300 wood
// and cross to the pools, then pass the night.
// Run with `npm run dev` going: node scripts/playtest/delta.mjs
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

// ---- the farm's south exit leads to the delta.
await state((s) => {
  s.inventory.add("reed-pole", 1);
  s.inventory.add("wood", 300);
  s.money += 1000;
});
await travel("farm", "from_delta");
await sleepMs(1200);
let d = await bot.dbg();
if (d.map !== "farm") finding(`expected the farm, on ${d.map}`);
await bot.walkTo(46, 63);
await bot.face("down");
await bot.key("KeyX", 200);
await sleepMs(900);
d = await bot.dbg();
log(`after the south exit: ${d.map} at ${JSON.stringify(d.tile)}`);
if (d.map !== "delta") {
  finding(`the farm's south exit did not reach the delta, on ${d.map}`);
  await travel("delta", "from_farm");
  await sleepMs(1200);
}
const world = await state((s) => ({
  away: s.away?.mapId,
  forage: [...s.forage.each()].length,
}));
if (world.away !== "delta") finding("the delta world was not swapped in");
log(`delta world: ${JSON.stringify(world)}`);
await bot.shot("delta-arrive");

// ---- the rod, held on the toolbar.
const slot = await state((s) =>
  s.inventory.save().findIndex((x) => x?.id === "reed-pole"),
);
await bot.select(4 + slot);

// Stand, face the water, use the rod, charge and release, and read the cast.
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
  else if (f.bite === "fish" || typeof f.bite === "string") {
    if (f.water && f.water !== kind)
      finding(`${name}: a ${f.water} fish bit on ${kind} water`);
  }
  await bot.shot(`cast-${name}`);
  await p.keyboard.press("Escape");
  await sleepMs(500);
  await bot.dismissModals();
}
await castOn("marsh-lake", "marsh-lake", 23, 27, "down");
await castOn("river", "river", 61, 10, "right");

// ---- the fisher's hut: door at (44, 40), counter inside sells the rods.
await bot.walkTo(44, 41);
await bot.face("up");
await bot.key("KeyX", 200);
await sleepMs(900);
d = await bot.dbg();
log(`through the hut door: ${d.map}`);
if (d.map !== "fisher-hut") finding(`expected the fisher's hut, on ${d.map}`);
else {
  await bot.walkTo(5, 2);
  await bot.face("up");
  const money0 = await state((s) => s.money);
  await p.keyboard.press("KeyX");
  await sleepMs(700);
  const open = await p.evaluate(() => window.__game.scene.isActive("shop"));
  if (!open) finding("the fisher's counter did not open the shop");
  else {
    await bot.shot("fisher-shop");
    const rows = await p.evaluate(
      () =>
        window.__game.scene
          .getScene("shop")
          .buyMenu.rows?.map?.((r) => r.label) ?? null,
    );
    log(`counter rows: ${JSON.stringify(rows)}`);
    if (rows && rows.some((r) => /seed|Sapling|fertilizer|Backpack/i.test(r)))
      finding("the fisher sells general store goods");
    await p.keyboard.press("Enter"); // buy 1 of the first row, the cheapest rod
    await sleepMs(400);
    const money1 = await state((s) => s.money);
    const rods = await state((s) => s.inventory.count("reed-pole"));
    log(`bought a rod: money ${money0} -> ${money1}, reed poles ${rods}`);
    if (money1 >= money0 || rods < 2) finding("the fisher did not sell a rod");
    await p.keyboard.press("Escape");
    await sleepMs(500);
  }
  await bot.walkTo(5, 5);
  await bot.face("down");
  await bot.key("KeyX", 200);
  await sleepMs(900);
  d = await bot.dbg();
  if (d.map !== "delta") finding(`leaving the hut reached ${d.map}`);
}

// ---- the sea, from the end of the pier.
await castOn("sea", "sea", 81, 58, "down");

// ---- the tide pool footbridge: broken, asks first, then mends for 300 wood.
await bot.walkTo(85, 45);
await bot.face("right");
await hold("ArrowRight", 600);
d = await bot.dbg();
if (d.tile.x > 85)
  finding(`crossed the broken footbridge to ${JSON.stringify(d.tile)}`);
await p.keyboard.press("KeyX");
await sleepMs(300);
d = await bot.dbg();
log(`first press: ${d.message}`);
if (!/broken/i.test(d.message))
  finding("the ruined footbridge did not ask first");
const wood0 = await state((s) => s.inventory.count("wood"));
if (wood0 !== 300) finding(`the first press changed the wood to ${wood0}`);
await p.keyboard.press("KeyX");
await sleepMs(1500);
const mended = await state((s) => ({
  flag: (s.flags ?? []).includes("tide-bridge-mended"),
  wood: s.inventory.count("wood"),
}));
log(`after the second press: ${JSON.stringify(mended)}`);
if (!mended.flag || mended.wood !== 0)
  finding("the footbridge was not mended for 300 wood");
d = await bot.dbg();
if (d.map !== "delta") finding(`mending left the delta for ${d.map}`);
await bot.walkTo(85, 45);
await bot.face("right");
await hold("ArrowRight", 1400);
d = await bot.dbg();
log(`after crossing: ${JSON.stringify(d.tile)}`);
if (d.tile.x < 90)
  finding(
    `could not cross the mended footbridge, at ${JSON.stringify(d.tile)}`,
  );
await bot.shot("tide-pools");

// ---- the night: the delta's own forage lies out again in the morning.
const day0 = (await bot.snap()).day;
await bot.key("z", 500);
await bot.key("Enter", 800);
await sleepMs(500);
const s1 = await bot.snap();
log(`after the night: day ${s1.day}`);
if (s1.day !== day0 + 1) finding(`the night moved day ${day0} to ${s1.day}`);
const goods = await state((s) => {
  const f = [...s.areas["delta"].forage.each()];
  return f.length;
});
if (goods === 0) finding("no forage on the delta in the morning");
log(`delta forage in the morning: ${goods}`);

if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
