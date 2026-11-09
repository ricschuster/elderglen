// The Forest's farmstead, hermit's tower and Wanderer's camp (note 72, part 2):
// walk from the farm road to the keeper's door, go in, buy a young chicken and hay
// at the counter, come out; walk to the tower and speak to the hermit; walk to
// the camp and look at the fire.
// Run with `npm run dev` going: node scripts/playtest/farmstead.mjs
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
const message = () =>
  p.evaluate(() => window.__game.scene.getScenes(true)[0].message ?? "");

await state((s) => {
  s.money += 3000;
  s.animals.coopBuilt = true;
  s.animals.tier = 1;
});

// ---- the farmstead, from the farm road.
await travel("forest", "from_farm");
await sleepMs(1500);
await bot.walkTo(96, 23);
await bot.face("up");
await bot.key("KeyX", 200);
await sleepMs(900);
let d = await bot.dbg();
log(`through the keeper's door: ${d.map}`);
if (d.map !== "forest-farmstead")
  finding(`expected the farmstead, on ${d.map}`);
else {
  await bot.shot("farmstead-inside");
  await bot.walkTo(6, 2);
  await bot.face("up");
  const money0 = await state((s) => s.money);
  await p.keyboard.press("KeyX");
  await sleepMs(700);
  const open = await p.evaluate(() => window.__game.scene.isActive("keeper"));
  if (!open) finding("the keeper's counter did not open");
  else {
    await bot.shot("keeper-counter");
    const rows = await p.evaluate(
      () =>
        window.__game.scene
          .getScene("keeper")
          .menu.rows?.map?.((r) => r.label) ?? null,
    );
    log(`counter rows: ${JSON.stringify(rows)}`);
    if (rows && !rows.some((r) => /chicken/i.test(r)))
      finding("the keeper does not sell chickens");
    await p.keyboard.press("Enter"); // the first row, a young chicken
    await sleepMs(400);
    const money1 = await state((s) => s.money);
    const hens = await state((s) => s.animals.animals.length);
    log(`bought: money ${money0} -> ${money1}, animals ${hens}`);
    if (money1 >= money0 || hens < 1) finding("no young chicken was bought");
    await p.keyboard.press("Escape");
    await sleepMs(500);
  }
  await bot.walkTo(6, 6);
  await bot.face("down");
  await bot.key("KeyX", 200);
  await sleepMs(900);
  d = await bot.dbg();
  if (d.map !== "forest") finding(`leaving the farmstead reached ${d.map}`);
}

// ---- the hermit's tower.
await travel("forest", "from_farm");
await sleepMs(1200);
await bot.walkTo(22, 93);
await bot.face("up");
await bot.key("KeyX", 200);
await sleepMs(900);
d = await bot.dbg();
log(`through the tower door: ${d.map}`);
if (d.map !== "hermit-tower") finding(`expected the tower, on ${d.map}`);
else {
  await bot.walkTo(4, 2);
  await bot.face("up");
  await p.keyboard.press("KeyX");
  await sleepMs(500);
  const line = await message();
  log(`hermit: ${line}`);
  if (!/witch/.test(line)) finding("the hermit said nothing");
  await bot.shot("hermit-tower");
  await bot.walkTo(4, 7);
  await bot.face("down");
  await bot.key("KeyX", 200);
  await sleepMs(900);
  d = await bot.dbg();
  if (d.map !== "forest") finding(`leaving the tower reached ${d.map}`);
}

// ---- the Wanderer's camp.
await travel("forest", "from_farm");
await sleepMs(1200);
await bot.walkTo(85, 84);
await bot.face("up");
await p.keyboard.press("KeyX");
await sleepMs(500);
const camp = await message();
log(`camp: ${camp}`);
if (!/Greencoat/.test(camp)) finding("the camp fire said nothing");
await bot.shot("wanderers-camp");

if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
