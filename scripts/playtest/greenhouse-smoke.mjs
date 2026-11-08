// Short check of the greenhouse (#602): the ruin door is shut, the Larder
// repairs it, and inside the player digs, plants and waters in winter. Needs `npm run dev`.
import { launch, Bot, log, sleepMs, finding, findings, OUT } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
const farm = (fn, arg) =>
  p.evaluate(
    ([src, arg]) => {
      const g = window.__game;
      const f = g.scene.getScene("farm");
      return new Function("g", "f", "s", "arg", src)(g, f, g.registry.get("state"), arg);
    },
    [`return (${fn.toString()})(g, f, s, arg)`, arg],
  );
const shot = (n) => p.screenshot({ path: `${OUT}/shots/greenhouse-${n}.png` });

// The ruin on the farm, door shut.
await farm((g, f, s) => {
  f.pos = { x: 15 * 16 + 8, y: 6 * 16 + 8 };
});
await sleepMs(300);
await shot("ruin");
const shut = await farm((g, f) => {
  f.facing = "up";
  f.action();
  return f.message;
});
log("shut door says:", shut);
if (!/ruin/.test(shut)) finding(`ruin message missing: ${shut}`);

// Repair it as the Larder would, make it winter, and go in.
await farm((g, f, s) => {
  s.hall.roomComplete = (id) => id === "larder" || s.hall.rooms.some((r) => r.id === id) && false;
  s.day.clock.day = 3 * 28 + 5;
  s.inventory.add("parsnip-seed", 3);
  f.action();
});
await sleepMs(1500);
let st = await farm((g, f) => ({ map: f.mapId, scenes: g.scene.getScenes(true).map((x) => x.scene.key) }));
log("after door:", JSON.stringify(st));
if (st.map !== "greenhouse") finding(`did not enter the greenhouse: ${st.map}`);
log("errs:", JSON.stringify(errs));
await shot("inside");

// Dig, plant and water the plot ahead of the entry.
await sleepMs(500);
await bot.refreshMap();
await bot.walkTo(9, 14);
await bot.face("up");
const plots = () => farm((g, f, s) => [...s.greenhouse.each()]);
const toolbar = await farm((g, f, s) => s.inventory.save().slice(0, 6).map((x) => x && x.id));
log("backpack:", JSON.stringify(toolbar));
await bot.select(0);
await bot.key("KeyC", 300);
log("plots after slot 1:", JSON.stringify(await plots()));
if ((await plots()).length < 1) finding("hoe did not dig a greenhouse plot");
await shot("dug");
await bot.select(4);
await bot.key("KeyC", 300);
await bot.select(1);
await bot.key("KeyC", 300);
const plot = (await plots())[0];
log("plot:", JSON.stringify(plot));
if (!plot?.plot.crop) finding("seed did not plant in winter");
if (!plot?.plot.wateredToday) finding("can did not water");
await shot("planted");

// Sleep overnight in the scene's own end of day.
await farm((g, f, s) => f.endDay());
await sleepMs(800);
const grown = await farm((g, f, s) => [...s.greenhouse.each()][0]?.plot.crop?.daysGrown);
log("daysGrown after a night:", grown);
if (grown !== 1) finding(`crop did not grow overnight in winter: ${grown}`);
for (const e of errs) finding(`console: ${e}`);
log(findings.length ? `FINDINGS:\n${findings.join("\n")}` : "no findings");
await b.close();
