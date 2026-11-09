// Thalwen's cottage and the Homeward pin stall (note 75, note 09, #641): walk the
// Beach dunes to the cottage door, go in, read the pin stall, refuse a purchase
// with too little money, buy the pin with a full purse, find a second sale refused,
// and walk out again. A scene restart stands in for the walk from the farm.
// Run with `npm run dev` going: node scripts/playtest/beach-elf.mjs
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

await p.evaluate(() => {
  window.__game.scene
    .getScenes(true)[0]
    .scene.restart({ map: "delta", entry: "from_farm" });
});
await sleepMs(1500);
let d = await bot.dbg();
if (d.map !== "delta") finding(`expected the delta, on ${d.map}`);

// To the cottage door and in.
await bot.walkTo(80, 28);
await bot.shot("elf-cottage");
await bot.face("up");
await bot.key("KeyX", 200);
await sleepMs(1000);
d = await bot.dbg();
log(`through the cottage door: ${d.map} at ${JSON.stringify(d.tile)}`);
if (d.map !== "beach-elf-house")
  finding(`expected Thalwen's cottage, on ${d.map}`);
else {
  // The pin stall, with too little money first.
  await bot.walkTo(5, 2);
  await bot.face("up");
  await state((s) => {
    s.money = 100;
  });
  await bot.key("KeyX", 400);
  let s = await bot.snap();
  if (!s.scenes.includes("shop"))
    finding(`the pin stall did not open the shop: ${s.scenes}`);
  else {
    await bot.shot("pin-stall");
    const rows = await p.evaluate(
      () =>
        window.__game.scene
          .getScene("shop")
          .buyMenu.rows?.map?.((r) => r.label) ?? null,
    );
    log(`stall rows: ${JSON.stringify(rows)}`);
    if (!rows || rows.length !== 1 || rows[0] !== "Homeward pin")
      finding(`the stall sells ${JSON.stringify(rows)}`);
    await p.keyboard.press("Enter");
    await sleepMs(400);
    let n = await state((st) => st.inventory.count("homeward-pin"));
    if (n !== 0) finding("bought the pin with 100g");
    await state((st) => {
      st.money = 2_000_000;
    });
    await p.keyboard.press("Enter");
    await sleepMs(400);
    n = await state((st) => st.inventory.count("homeward-pin"));
    const money = await state((st) => st.money);
    log(`bought: pins ${n}, money ${money}`);
    if (n !== 1 || money !== 500_000)
      finding("the pin was not sold once for 1,500,000g");
    await p.keyboard.press("Enter");
    await sleepMs(400);
    n = await state((st) => st.inventory.count("homeward-pin"));
    if (n !== 1) finding(`a second pin was sold, now ${n}`);
    await bot.shot("pin-bought");
    await p.keyboard.press("Escape");
    await sleepMs(500);
  }
  await bot.walkTo(5, 7);
  await bot.face("down");
  await bot.key("KeyX", 200);
  await sleepMs(1000);
  d = await bot.dbg();
  if (d.map !== "delta") finding(`leaving the cottage reached ${d.map}`);
}

if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
