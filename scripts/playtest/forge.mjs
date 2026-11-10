// The Mountain's forge and the stonekeeper's yard (note 74, steps 4 and 5):
// walk to the forge door on the west road, go in, use the smith's counter (buy
// coal, sell ore, show the dwarf a copper ore so the furnace is owed), come
// back out, then walk over the footbridge to the yard and speak to the
// stonekeeper.
// Run with `npm run dev` going: node scripts/playtest/forge.mjs
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
const travel = (map, entry) =>
  p.evaluate(
    ([m, e]) => {
      window.__game.scene
        .getScenes(true)[0]
        .scene.restart({ map: m, entry: e });
    },
    [map, entry],
  );

await state((s) => {
  s.money += 500;
  s.inventory.add("copper-ore", 3);
});

// ---- the forge door, on the road past the forge.
await travel("mountain", "from_forest");
await sleepMs(1500);
await bot.walkTo(18, 47);
await bot.face("up");
await bot.key("KeyX", 200);
await sleepMs(900);
let d = await bot.dbg();
log(`through the forge door: ${d.map}`);
if (d.map !== "forge") finding(`expected the forge, on ${d.map}`);
else {
  await bot.shot("forge-inside");
  await bot.walkTo(5, 2);
  await bot.face("up");
  const money0 = await state((s) => s.money);
  await p.keyboard.press("KeyX");
  await sleepMs(700);
  const open = await p.evaluate(() => window.__game.scene.isActive("smith"));
  if (!open) finding("the smith's counter did not open");
  else {
    await bot.shot("forge-counter");
    const rows = await p.evaluate(
      () =>
        window.__game.scene
          .getScene("smith")
          .menu.rows?.map?.((r) => r.label) ?? null,
    );
    log(`counter rows: ${JSON.stringify(rows)}`);
    if (rows && !rows.some((r) => /copper ore/i.test(r) && /Sell/.test(r)))
      finding("the dwarf does not buy ore");
    if (rows && !rows.some((r) => /Copper Switch/.test(r)))
      finding("the dwarf does not sell weapons");
    if (rows && rows.some((r) => /Forge:|Crack|\(Basic\)/.test(r)))
      finding("the dwarf still forges, cracks or upgrades");
    await p.keyboard.press("Enter"); // buy 1 of the first row, copper ore
    await sleepMs(400);
    const money1 = await state((s) => s.money);
    log(`bought ore: money ${money0} -> ${money1}`);
    if (money1 >= money0) finding("the smith did not sell ore");
    await p.keyboard.press("Escape");
    await sleepMs(500);
  }
  await bot.walkTo(5, 5);
  await bot.face("down");
  await bot.key("KeyX", 200);
  await sleepMs(900);
  d = await bot.dbg();
  if (d.map !== "mountain") finding(`leaving the forge reached ${d.map}`);
}

// ---- the stonekeeper's yard, over the footbridge.
await travel("mountain", "from_forest");
await sleepMs(1200);
await bot.walkTo(66, 47);
await bot.face("up");
await p.keyboard.press("KeyX");
await sleepMs(500);
const line = await p.evaluate(
  () => window.__game.scene.getScenes(true)[0].message ?? "",
);
log(`stonekeeper: ${line}`);
if (!/bridge/.test(line))
  finding("the stonekeeper said nothing about the bridge");
await bot.shot("stonekeepers-yard");

if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
