import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";
const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
const s0 = await bot.snap();
log("idle until 2am; money", s0.money, "clock", s0.minutes);
let s;
for (;;) {
  await sleepMs(10000);
  s = await bot.snap();
  if (s.scenes.includes("report")) break;
  if (Date.now() % 60000 < 10000)
    log(
      "clock",
      Math.floor(s.minutes / 60),
      ":",
      s.minutes % 60,
      "scenes",
      s.scenes,
    );
}
const txt = await p.evaluate(() =>
  window.__game.scene
    .getScene("report")
    .children.list.filter((o) => o.type === "Text")
    .map((o) => o.text)
    .join(" | "),
);
log("report:", txt, "| money", s.money);
await bot.shot("passout-time");
await bot.key("Enter", 500);
const n = await bot.snap();
log(
  `next morning day ${n.day} energy ${n.energy} money ${n.money} clock ${n.minutes}`,
);
if (n.money !== s0.money - 50)
  finding(`time pass-out cost ${s0.money - n.money}g, expected 50g`);
if (Math.abs(n.energy - 135) > 1)
  finding(
    `morning energy after staying up late is ${n.energy}, expected about 135 (50%, a 2 am pass-out)`,
  );
log("errors", JSON.stringify(errs));
log("FINDINGS:\n" + findings.join("\n"));
await b.close();
