// The mine stages 30, 60 and 100, headless, as text: starts each stage, stands on the arrival tile
// for a while swinging the weapon, and reports the floor, the creatures met, their speed in tiles
// a second and the player's health, plus any console error. Feel (swing arc, speed against the
// player) is the owner's. About 40 seconds. Needs `npm run dev`.
//   node scripts/playtest/mine-floors.mjs [seconds per floor, default 12]
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const secs = Number(process.argv[2] || 12);
for (const id of ["mines-30", "mines-60", "mines-100"]) {
  const { b, p, errs } = await launch({ fresh: true });
  const bot = new Bot(p, errs);
  const r = await p.evaluate((n) => JSON.stringify(window.farmStage(n)), id);
  if (!r.includes('"problems":[]')) finding(`${id}: stage problems ${r}`);
  await sleepMs(1500);
  const seen = new Map();
  const states = new Set();
  let maxCreatures = 0;
  let minHealth = 999;
  let hit = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < secs * 1000) {
    await p.keyboard.press("KeyC");
    const d = await bot.dbg();
    maxCreatures = Math.max(maxCreatures, d.creatures.length);
    minHealth = Math.min(minHealth, d.health);
    for (const c of d.creatures) {
      const k = c.uid;
      const prev = seen.get(k);
      const now = { x: c.x, y: c.y, t: Date.now() };
      if (prev && c.x != null) {
        const tiles = Math.hypot(c.x - prev.x, c.y - prev.y) / 16;
        const dt = (now.t - prev.t) / 1000;
        if (dt > 0 && tiles / dt < 20) hit = Math.max(hit, tiles / dt);
        states.add(c.state);
      }
      seen.set(k, now);
    }
    await sleepMs(150);
  }
  const d = await bot.dbg();
  log(
    id,
    `map=${d.map} health=${d.health} (min ${minHealth}) creatures now ${d.creatures.length} (max ${maxCreatures}) kinds=${[
      ...new Set(d.creatures.map((c) => c.kind ?? c.id)),
    ].join(
      ",",
    )} fastest~${hit.toFixed(1)} tiles/s states=${[...states].join(",")} errors=${errs.length}`,
  );
  if (d.map !== id.replace("mines-", "mine-"))
    finding(`${id}: landed on ${d.map}`);
  if (errs.length)
    finding(`${id}: console errors ${JSON.stringify(errs).slice(0, 300)}`);
  await b.close();
}
log("FINDINGS:\n" + (findings.length ? findings.join("\n") : "none"));
process.exit(findings.length ? 1 : 0);
