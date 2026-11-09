// The Lake cove and the ferry (note 76): the delta's ferry is a wreck until the
// Water room is done at the hall, so find it shut, repair it (the cove-open
// world flag stands in, since bundles 13 to 18 are not written yet), step on the
// boat, land at the cove, cast a rod on its water, open the treasure chest on
// the south-east ledge (once a season), then step back on the boat to the delta.
// Run with `npm run dev` going: node scripts/playtest/cove.mjs
// (BASE_URL=http://localhost:5174/ if the dev server picked another port.)
// A scene restart stands in for the walk from the farm to the dock.
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
const travel = (map, entry) =>
  p.evaluate(
    ([m, e]) => {
      window.__game.scene
        .getScenes(true)[0]
        .scene.restart({ map: m, entry: e });
    },
    [map, entry],
  );
const hold = async (key, ms) => {
  await p.keyboard.down(key);
  await sleepMs(ms);
  await p.keyboard.up(key);
  await sleepMs(300);
};
const fishing = () =>
  p.evaluate(() => {
    const sc = window.__game.scene.getScene("fishing");
    if (!sc || !window.__game.scene.isActive("fishing")) return null;
    return {
      kind: sc.cfg.kind,
      phase: sc.phase,
      bite: sc.pending?.kind === "fish" ? sc.pending.fish.id : sc.pending?.kind,
      water: sc.pending?.kind === "fish" ? sc.pending.fish.water : null,
    };
  });

const message = () =>
  p.evaluate(() => window.__game.scene.getScenes(true)[0].message ?? "");

// ---- the ferry is a wreck.
await state((s) => {
  s.inventory.add("reed-pole", 1);
});
await travel("delta", "from_ferry");
await sleepMs(1500);
let d = await bot.dbg();
if (d.map !== "delta") finding(`expected the delta, on ${d.map}`);
await bot.face("down");
await p.keyboard.press("KeyX");
await sleepMs(400);
let line = await message();
log(`ruined ferry: ${line}`);
if (!/ferry is a wreck/i.test(line)) finding("the ruined ferry said nothing");
d = await bot.dbg();
if (d.map !== "delta") finding(`the ruined ferry took the player to ${d.map}`);
await bot.shot("ferry-ruined");

// ---- repaired: the gate opens.
await state((s) => {
  s.flags = [...(s.flags ?? []), "cove-open"];
});
await travel("delta", "from_ferry");
await sleepMs(1500);
await bot.face("down");
await bot.shot("ferry-repaired");
await p.keyboard.press("KeyX");
await sleepMs(1500);
d = await bot.dbg();
log(`after the ferry: ${d.map} at ${JSON.stringify(d.tile)}`);
if (d.map !== "cove") finding(`expected the cove, on ${d.map}`);
await bot.shot("cove-arrive");
const world = await state((s) => ({
  away: s.away?.mapId,
  forage: [...s.forage.each()].length,
}));
if (world.away !== "cove") finding("the cove world was not swapped in");
log(`cove world: ${JSON.stringify(world)}`);

// ---- cast on the cove water.
const slot = await state((s) =>
  s.inventory.save().findIndex((x) => x?.id === "reed-pole"),
);
await bot.select(4 + slot);
await bot.walkTo(30, 9);
await bot.face("down");
await p.keyboard.press("KeyC");
await sleepMs(600);
let f = await fishing();
if (!f) finding("the fishing screen did not open");
else {
  log(`fishing: ${JSON.stringify(f)}`);
  if (f.kind !== "cove") finding(`fished ${f.kind}, wanted cove`);
  await p.keyboard.down("Space");
  await sleepMs(1500);
  await p.keyboard.up("Space");
  await sleepMs(500);
  f = await fishing();
  log(`cast: ${JSON.stringify(f)}`);
  if (!f || (f.phase !== "wait" && f.phase !== "hook"))
    finding(`the cast did not land, phase ${f?.phase}`);
  else if (f.water && f.water !== "cove")
    finding(`a ${f.water} fish bit on cove water`);
  await bot.shot("cast-cove");
  await p.keyboard.press("Escape");
  await sleepMs(500);
  await bot.dismissModals();
}

// ---- the hidden chest on the ledge: once a season.
await bot.walkTo(41, 35);
await bot.face("down");
await p.keyboard.press("KeyX");
await sleepMs(400);
line = await message();
log(`treasure: ${line}`);
if (!/chest/i.test(line)) finding("the ledge gave no chest");
const geodes = await state((s) => s.inventory.count("geode"));
if (geodes < 1) finding("no treasure in the backpack");
await bot.shot("cove-treasure");
await p.keyboard.press("KeyX");
await sleepMs(400);
line = await message();
log(`second try: ${line}`);
if (!/bare/i.test(line)) finding("the chest opened twice in one season");

// ---- night: the cove's own forage lies out again in the morning.
const day0 = (await bot.snap()).day;
await p.evaluate(() => {
  window.__game.scene.getScenes(true)[0].endDay();
});
await sleepMs(1500);
await bot.key("Enter", 800);
await sleepMs(500);
const s1 = await bot.snap();
log(`after the night: day ${s1.day}`);
if (s1.day !== day0 + 1) finding(`the night moved day ${day0} to ${s1.day}`);
const goods = await state(
  (s) => [...(s.areas["cove"]?.forage.each() ?? [])].length,
);
log(`cove forage in the morning: ${goods}`);
if (goods === 0) finding("no forage on the cove in the morning");

// ---- step back on the boat.
await travel("cove", "from_ferry");
await sleepMs(1500);
await bot.face("left");
await p.keyboard.press("KeyX");
await sleepMs(1500);
d = await bot.dbg();
log(`back: ${d.map} at ${JSON.stringify(d.tile)}`);
if (d.map !== "delta") finding(`expected the delta, on ${d.map}`);
await bot.shot("back-on-delta");

if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
