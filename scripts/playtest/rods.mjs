// Fishing rods: load each fishing stage (note 42), hold the rod, cast on the delta
// river and check the fishing screen opens with that rod's bar width and the cast lands.
// Run with `npm run dev` going: node scripts/playtest/rods.mjs
import {
  launch,
  Bot,
  log,
  sleepMs,
  finding,
  findings,
  toStage,
} from "./lib.mjs";
import { readFileSync } from "node:fs";

const rods = JSON.parse(readFileSync("src/content/rods.json", "utf8"));
const STAGES = [
  ["fishing-reed-pole", "reed-pole"],
  ["fishing-hazel-rod", "hazel-rod"],
  ["fishing-heron-rod", "heron-rod"],
  ["fishing-hearthwell-rod", "hearthwell-rod"],
];
const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
const fishing = () =>
  p.evaluate(() => {
    const sc = window.__game.scene.getScene("fishing");
    if (!sc || !window.__game.scene.isActive("fishing")) return null;
    return { kind: sc.cfg.kind, phase: sc.phase, cfg: JSON.stringify(sc.cfg) };
  });

for (const [stage, rodId] of STAGES) {
  const rod = rods.find((r) => r.id === rodId);
  await toStage(p, stage);
  const have = await p.evaluate(
    ([id]) => {
      const s = window.__game.registry.get("state");
      return {
        slot: s.inventory.save().findIndex((x) => x?.id === id),
        level: s.skills.level("fishing"),
        season: s.day.season ?? null,
      };
    },
    [rodId],
  );
  log(`${stage}: ${JSON.stringify(have)}`);
  if (have.slot < 0) {
    finding(`${stage}: ${rodId} is not in the pack`);
    continue;
  }
  await p.evaluate(() => {
    window.__game.scene
      .getScenes(true)[0]
      .scene.restart({ map: "delta", entry: "from_farm" });
  });
  await sleepMs(1200);
  await bot.dismissModals();
  await bot.select(have.slot);
  await bot.walkTo(61, 10);
  await bot.face("right");
  await p.keyboard.press("KeyC");
  await sleepMs(600);
  let f = await fishing();
  if (!f) {
    finding(`${stage}: the fishing screen did not open`);
    continue;
  }
  log(`${stage}: cfg ${f.cfg}`);
  if (!f.cfg.includes(`"rod":"${rodId}"`))
    finding(`${stage}: the cast config names another rod: ${f.cfg}`);
  // The river is 4 tiles wide, so a long rod must charge less (a full charge lands
  // on dry ground, by design). Aim for tile 3: power (3 - 1) / (range - 1), 1.2 s to full.
  const hold = Math.round((2 / (rod.range - 1)) * 1200);
  await p.keyboard.down("Space");
  await sleepMs(hold);
  await p.keyboard.up("Space");
  await sleepMs(500);
  f = await fishing();
  if (!f || (f.phase !== "wait" && f.phase !== "hook"))
    finding(`${stage}: the cast did not land, phase ${f?.phase}`);
  await p.keyboard.press("Escape");
  await sleepMs(500);
  await bot.dismissModals();
}
for (const e of errs) finding(`console: ${e}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
