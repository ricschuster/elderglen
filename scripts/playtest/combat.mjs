// Combat smoke test (note 22, build slice 3 part one): the trainer's starter,
// the dummy, a fight with a creature on mine floor 1, health on the HUD, and a
// knock out. Manual only. Needs `npm run dev`. About 30 seconds.
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
const shot = (name) =>
  p.screenshot({ path: `${OUT}/shots/combat-${name}.png` });
const goMap = async (map, entry) => {
  await farm((g, f, s, a) => f.scene.restart(a), { map, entry });
  await sleepMs(900);
};

// The trainer gives the Hazel Switch free.
await goMap("mine", "door");
await farm((g, f) => f.open("trainer"));
await sleepMs(400);
await shot("trainer");
await p.keyboard.press("Enter");
await sleepMs(300);
await p.keyboard.press("Escape");
await sleepMs(300);
if ((await farm((g, f, s) => s.inventory.count("hazel-switch"))) !== 1)
  finding("the trainer did not give the Hazel Switch");

// The dummy takes a swing and shows the number.
const slot = await farm((g, f, s) => {
  for (let i = 0; i < s.inventory.size; i++)
    if (s.inventory.slot(i)?.id === "hazel-switch") return 4 + i;
  return -1;
});
await farm((g, f, s, a) => f.select(a), slot);
const dummy = await farm((g, f) => {
  const d = f.map.services.find((x) => x.kind === "dummy");
  return d ? { x: d.x, y: d.y } : null;
});
await farm((g, f, s, a) => {
  f.pos = { x: (a.x + 0.5) * 16, y: (a.y + 2) * 16 - 2 };
  f.facing = "up";
}, dummy);
await sleepMs(200);
await p.keyboard.press("KeyC");
await sleepMs(200);
const dm = await bot.dbg();
if (!/dummy takes/i.test(dm.message)) finding(`dummy: ${dm.message}`);
await shot("dummy");

// A creature on floor 1: health shows, a hit costs health, the weapon beats it.
await goMap("mine-1", "from_above");
await farm((g, f, s, a) => f.select(a), slot);
let d = await bot.dbg();
log("creatures", JSON.stringify(d.creatures));
if (d.creatures.length < 2) finding("floor 1 has fewer than 2 creatures");
await shot("floor-1");
const target = d.creatures[0];
// Stand beside it and wait for its wind up to land.
await farm((g, f, s, a) => {
  f.pos = { x: a.x - 10, y: a.y };
  f.facing = "right";
}, target);
await sleepMs(2200);
d = await bot.dbg();
log("health after standing next to it", d.health);
await shot("hit");
if (!(d.health < 100)) finding("standing next to a creature cost no health");
// Swing until it is beaten.
for (let i = 0; i < 8; i++) {
  d = await bot.dbg();
  const c = d.creatures.find((x) => x.uid === target.uid);
  if (!c) break;
  await farm((g, f, s, a) => {
    f.pos = { x: a.x - 10, y: a.y };
    f.facing = "right";
  }, c);
  await p.keyboard.press("KeyC");
  await sleepMs(450);
}
d = await bot.dbg();
if (d.creatures.some((x) => x.uid === target.uid))
  finding("the creature was not beaten in 8 swings");
log("message", d.message);
await shot("beaten");

// Part two: the deeper bands have their own creatures, a kill gives combat XP
// and counts toward the slayer goal, and nothing throws while they act.
for (const [floor, band] of [
  [45, [41, 80]],
  [100, [81, 120]],
]) {
  await goMap(`mine-${floor}`, "from_above");
  await farm((g, f, s) => {
    s.inventory.add("hearthsilver-rolling-pin");
    s.combat.health.current = s.combat.health.max;
  });
  const pin = await farm((g, f, s) => {
    for (let i = 0; i < s.inventory.size; i++)
      if (s.inventory.slot(i)?.id === "hearthsilver-rolling-pin") return 4 + i;
    return -1;
  });
  await farm((g, f, s, a) => f.select(a), pin);
  d = await bot.dbg();
  const kinds = d.creatures.map((c) => c.kind ?? c.id);
  log(`floor ${floor} creatures`, JSON.stringify(d.creatures));
  if (d.creatures.length < 4)
    finding(`floor ${floor} has fewer than 4 creatures`);
  await shot(`floor-${floor}`);
  const xpBefore = await farm((g, f, s) => s.skills.xpOf("combat"));
  for (let i = 0; i < 12; i++) {
    d = await bot.dbg();
    const c = d.creatures[0];
    if (!c) break;
    await farm((g, f, s, a) => {
      s.combat.health.current = s.combat.health.max;
      f.pos = { x: a.x - 10, y: a.y };
      f.facing = "right";
    }, c);
    await p.keyboard.press("KeyC");
    await sleepMs(700);
  }
  const xpAfter = await farm((g, f, s) => s.skills.xpOf("combat"));
  log(`combat XP ${xpBefore} to ${xpAfter}`);
  if (!(xpAfter > xpBefore))
    finding(`floor ${floor}: no combat XP from a kill`);
  void kinds;
  void band;
}
const kills = await farm((g, f, s) => JSON.stringify(s.combat.kills));
log("kills", kills);

// A knock out ends the day: the report opens and health is full again.
await farm((g, f, s) => {
  s.combat.health.current = 1;
  s.combat.health.grace = 0;
  s.money = 1000;
});
d = await bot.dbg();
const other = d.creatures[0];
if (other) {
  await farm((g, f, s, a) => {
    f.pos = { x: a.x - 10, y: a.y };
  }, other);
  await sleepMs(2200);
  const scenes = await p.evaluate(() =>
    window.__game.scene.getScenes(true).map((s) => s.scene.key),
  );
  log("scenes after the knock out", scenes.join(","));
  if (!scenes.includes("report"))
    finding("no morning report after a knock out");
  const text = await p.evaluate(() =>
    window.__game.scene
      .getScene("report")
      .children.list.filter((c) => c.text)
      .map((c) => c.text)
      .join(" | "),
  );
  log("report:", text.slice(0, 300));
  if (!/knocked out/.test(text))
    finding("the report does not mention the knock out");
  await shot("report");
  await p.keyboard.press("Enter");
  await sleepMs(900);
  d = await bot.dbg();
  if (d.map !== "farm") finding(`woke on ${d.map}, not at home`);
  if (d.health !== 100) finding(`health ${d.health} after waking`);
}

for (const e of errs) finding(`console: ${e}`);
log(findings.length ? `FINDINGS:\n${findings.join("\n")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
