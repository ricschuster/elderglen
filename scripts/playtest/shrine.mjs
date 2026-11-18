// Shrine (note 83): jump to the year 3 stage, sleep, check the evaluation scene
// opens on the first free morning, play it through, then check the candles, the
// save, Oriel's letter the next morning, and that it does not repeat.
// Run with `npm run dev` going: node scripts/playtest/shrine.mjs
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
await toStage(p, "shrine-year-three");

const st = () =>
  p.evaluate(() => {
    const s = window.__game.registry.get("state");
    return {
      day: s.day.clock.day,
      shrine: s.shrine.save(),
      scenes: window.__game.scene.getScenes(true).map((x) => x.scene.key),
    };
  });

let s = await st();
log("before sleep", JSON.stringify(s));
if (s.shrine.seen || s.shrine.pending)
  finding("shrine already owed before sleeping");

await bot.key("z", 600);
let opened = false;
for (let i = 0; i < 40; i++) {
  s = await st();
  if (s.scenes.includes("shrine")) {
    opened = true;
    break;
  }
  await bot.key("Enter", 400);
}
if (!opened) finding(`shrine scene never opened: ${JSON.stringify(s)}`);
else {
  log("shrine scene open on day", s.day, "pending", s.shrine.pending);
  await sleepMs(500);
  await bot.shot("shrine-scene");
  for (let i = 0; i < 60 && (await st()).scenes.includes("shrine"); i++)
    await bot.key("Enter", 350);
}
await sleepMs(500);
s = await st();
log("after scene", JSON.stringify(s));
if (s.scenes.includes("shrine")) finding("shrine scene did not end");
if (!s.shrine.seen) finding("seen not set after the scene");
if (s.shrine.pending) finding("still pending after the scene");
if (s.shrine.candles < 1) finding("no candle lit");
await bot.shot("shrine-after");

// Next morning: Oriel's letter arrives, the scene does not repeat.
for (let i = 0; i < 25 && (await st()).scenes.length > 1; i++)
  await bot.key("Enter", 350);
await bot.key("z", 600);
let repeated = false;
for (let i = 0; i < 25; i++) {
  s = await st();
  if (s.scenes.includes("shrine")) repeated = true;
  if (s.scenes.length <= 1) break;
  await bot.key("Enter", 350);
}
if (repeated) finding("shrine scene repeated the next morning");
const mail = await p.evaluate(() => {
  const m = window.__game.registry.get("state").mail;
  return JSON.stringify(m.save?.() ?? null).slice(0, 300);
});
log("mail", mail);
if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS: ${findings.length}` : "PASS");
await b.close();
process.exit(findings.length ? 1 : 0);
