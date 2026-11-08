// Smoke test of the newer scenes: the collections page, the smith (geodes),
// the carpenter (furniture, flooring, wallpaper), the village green and hedge
// festival maps, the mailbox, mine floors beyond 10 and the request board. It
// opens each, does one small thing, takes a screenshot and fails on any console
// error or page error. About 30 seconds. Needs `npm run dev`.
import { launch, Bot, log, sleepMs, finding, findings, OUT } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
const farm = (fn, arg) =>
  p.evaluate(
    ([src, arg]) => {
      const g = window.__game;
      const f = g.scene.getScene("farm");
      return new Function("g", "f", "s", "arg", src)(
        g,
        f,
        g.registry.get("state"),
        arg,
      );
    },
    [`return (${fn.toString()})(g, f, s, arg)`, arg],
  );
const shot = (name) => p.screenshot({ path: `${OUT}/shots/smoke-${name}.png` });
const active = () =>
  p.evaluate(() => window.__game.scene.getScenes(true).map((s) => s.scene.key));

async function step(name, fn) {
  const before = errs.length;
  try {
    await fn();
  } catch (e) {
    finding(`${name}: script error: ${e.message}`);
  }
  await sleepMs(150);
  await shot(name);
  for (const e of errs.slice(before)) finding(`${name}: console: ${e}`);
  log(`${name}: ok so far`);
}
async function overlay(kind, data) {
  await farm((g, f, s, a) => f.open(a.kind, a.data), { kind, data });
  await sleepMs(400);
  if (!(await active()).includes(kind))
    throw new Error(`${kind} did not open: ${await active()}`);
  await shot(`${kind}-open`);
}
async function close() {
  await p.keyboard.press("Escape");
  await sleepMs(300);
  if ((await active()).length !== 1) {
    await p.keyboard.press("Escape");
    await sleepMs(300);
  }
  if ((await active()).join() !== "farm")
    throw new Error(`overlay did not close: ${await active()}`);
}
async function goMap(map, entry) {
  await farm((g, f, s, a) => f.scene.restart(a), { map, entry });
  await sleepMs(900);
  const d = await bot.dbg();
  if (d.map !== map) throw new Error(`wanted map ${map}, on ${d.map}`);
}
/** Press Down and Enter until the scene's message contains `text`. */
async function pickRow(scene, text, tries = 25) {
  for (let i = 0; i < tries; i++) {
    await p.keyboard.press("Enter");
    await sleepMs(60);
    const m = await p.evaluate(
      (k) => window.__game.scene.getScene(k).message?.text ?? "",
      scene,
    );
    if (text.test(m)) return m;
    await p.keyboard.press("ArrowDown");
    await sleepMs(40);
  }
  throw new Error(`no row gave ${text} in ${scene}`);
}

await bot.dbg();
await p.evaluate(() => {
  window.farmMoney(1000000);
  for (const id of ["geode", "frozen-geode", "magma-geode", "omni-geode"])
    window.farmGive(id, 2);
});

await step("collections", async () => {
  await overlay("collections");
  await close();
  await overlay("achievements");
  await close();
});

await step("smith-geodes", async () => {
  await overlay("smith");
  const before = await farm((g, f, s) => s.inventory.count("geode"));
  const m = await pickRow("smith", /splits open|Not enough|full/);
  log("smith crack:", m);
  const after = await farm((g, f, s) => s.inventory.count("geode"));
  if (/splits open/.test(m) && after !== before - 1)
    finding(`smith: geode count ${before} -> ${after} after a crack`);
  await close();
});

await step("carpenter", async () => {
  await overlay("carpenter");
  await sleepMs(200);
  for (let i = 0; i < 4; i++) {
    await p.keyboard.press("ArrowDown");
    await sleepMs(60);
  }
  await shot("carpenter-list");
  await close();
});

await step("mailbox", async () => {
  const n = await farm((g, f, s) => {
    s.mail.queue("hatters-letter", s.day.clock.day);
    return s.mail.deliver(s.day.clock.day);
  });
  log("mail delivered:", n);
  await overlay("mailbox");
  await p.keyboard.press("Enter");
  await sleepMs(300);
  await shot("mailbox-letter");
  await close();
});

await step("requests", async () => {
  await overlay("requests");
  await close();
  await overlay("requests", { list: true });
  await close();
});

await step("village-green", async () => {
  await goMap("green", "door");
  const d = await bot.dbg();
  const ok = await bot.hookWalk(d.tile.x, d.tile.y - 4);
  if (!ok) finding("village green: could not walk 4 tiles up");
  await shot("green-walk");
});

await step("hedge-maze", async () => {
  await goMap("hedge", "door");
  const d = await bot.dbg();
  if (!(await bot.hookWalk(d.tile.x + 3, d.tile.y)))
    finding("hedge: could not walk 3 tiles right");
});

for (const floor of [11, 26, 45, 85, 100, 120])
  await step(`mine-${floor}`, async () => {
    await goMap(`mine-${floor}`, "from_above");
    const d = await bot.dbg();
    log(`mine floor ${floor} at`, JSON.stringify(d.tile));
  });

await step("back-to-farm", async () => {
  await goMap("farm", "start");
});

log(`console errors: ${errs.length}`);
log("FINDINGS:");
console.log(
  findings.length
    ? findings.map((f, i) => `${i + 1}. ${f}`).join("\n")
    : "none",
);
await b.close();
process.exit(findings.length ? 1 : 0);
