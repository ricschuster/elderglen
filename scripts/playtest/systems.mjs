// Small systems with no map walk of their own: the Hearth room's cart, the herb
// stall, the hat picker and the tailor. Load the hall-6 stage (every hall room done),
// open each screen the way the farm scene does, check it shows rows and closes, and
// ride the cart to another stop. Run with `npm run dev` going:
//   node scripts/playtest/systems.mjs
import {
  launch,
  Bot,
  log,
  sleepMs,
  finding,
  findings,
  toStage,
} from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
await bot.dismissModals();
await toStage(p, "hall-6");
await bot.dismissModals();

const open = (kind, data) =>
  p.evaluate(
    ([k, d]) => window.__game.scene.getScenes(true)[0].open(k, d),
    [kind, data],
  );
const active = (k) => p.evaluate((n) => window.__game.scene.isActive(n), k);
const rowsOf = (scene, field) =>
  p.evaluate(
    ([s, f]) => {
      const m = window.__game.scene.getScene(s)?.[f];
      return (m?.rows ?? []).map((r) => r.label);
    },
    [scene, field],
  );
const closeIt = async (scene) => {
  await p.keyboard.press("Escape");
  await sleepMs(500);
  if (await active(scene)) finding(`${scene} did not close with Escape`);
};

// The cart: free once the Hearth room runs, with stops other than this one.
await open("cart", { from: "square" });
await sleepMs(500);
if (!(await active("cart"))) finding("the cart screen did not open");
else {
  const rows = await rowsOf("cart", "menu");
  log(`cart stops: ${JSON.stringify(rows)}`);
  if (rows.length < 2) finding(`the cart lists ${rows.length} stops`);
  await p.keyboard.press("Enter");
  await sleepMs(1500);
  const d = await bot.dbg();
  log(`rode the first stop: ${d.map} at ${JSON.stringify(d.tile)}`);
  if (await active("cart"))
    finding("the cart screen stayed open after the ride");
}

// The herb stall.
await bot.dismissModals();
await open("shop", { stock: "herb" });
await sleepMs(500);
if (!(await active("shop"))) finding("the herb stall did not open");
else {
  const rows = await rowsOf("shop", "buyMenu");
  log(`herb stall rows: ${JSON.stringify(rows)}`);
  if (rows.length < 1) finding("the herb stall has no rows");
  await closeIt("shop");
}

// The hat picker and the tailor.
for (const [kind, scene] of [
  ["hats", "hats"],
  ["tailor", "tailor"],
]) {
  await bot.dismissModals();
  await open(kind);
  await sleepMs(500);
  if (!(await active(scene))) finding(`the ${kind} screen did not open`);
  else {
    log(`${kind}: opened`);
    await closeIt(scene);
  }
}

for (const e of errs) finding(`console: ${e}`);
log(
  findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "FINDINGS: none",
);
await b.close();
