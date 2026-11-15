// A farmer walled in by trees (they spread and regrow on the farm) can cut a way
// out with the axe, as a player can. This walls the bot in on all four sides and
// checks `Bot.clearWay` (called by `walkTo` when there is no path) gets it out.
// About 40 seconds, `npm run dev` running.
import { launch, Bot, log, finding, findings, sleepMs } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
await bot.dismissModals();
await bot.refreshMap();
const start = { x: 30, y: 20 };
await bot.walkTo(start.x, start.y);
await p.evaluate(
  ([x, y]) => {
    const t = window.__game.registry.get("state").trees;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      (t.remove(x + dx, y + dy), t.add(x + dx, y + dy, 5));
  },
  [start.x, start.y],
);
await bot.refreshMap();
const blocked = await p.evaluate(() => window.farmBlocked().length);
log("walled in at", start, "blocked tiles on the map:", blocked);
try {
  await bot.walkTo(start.x + 6, start.y);
  const d = await bot.dbg();
  log("arrived at", d.tile);
  if (d.tile.x !== start.x + 6 || d.tile.y !== start.y)
    finding(
      `did not reach the target after clearing: at ${d.tile.x},${d.tile.y}`,
    );
} catch (e) {
  finding(`boxed-in bot did not get out: ${e.message}`);
}
await sleepMs(200);
if (errs.length) finding(`console errors: ${errs.join(" | ")}`);
await b.close();
console.log(
  findings.length ? `FINDINGS:\n${findings.join("\n")}` : "FINDINGS: none",
);
process.exit(findings.length ? 1 : 0);
