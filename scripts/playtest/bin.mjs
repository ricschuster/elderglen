// The shipping bin: ship, take back, ship part through the prompt, sleep, and
// check the payout, the summary screen and the report. About 30 seconds.
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);
const scenes = () => bot.snap().then((s) => s.scenes);
const binLines = () =>
  p.evaluate(() => window.__game.registry.get("state").bin.save().lines);
const have = async (id) => bot.countBase(await bot.snap(), id);

await p.evaluate(() => {
  window.farmGive("parsnip", 10);
  window.farmGive("wood", 5);
});
const money0 = (await bot.snap()).money;

// Stand below the bin and use it.
await bot.walkTo(66, 14);
await bot.face("up");
const target = (await bot.dbg()).target;
if (target.x !== 66 || target.y !== 13)
  finding(`facing ${JSON.stringify(target)}, expected the bin at 8,6`);
await bot.shot("bin-world");
await bot.key("KeyX", 400);
if (!(await scenes()).includes("bin")) finding("using the bin did not open it");
await bot.shot("bin-open");

// Enter ships the whole first stack (the backpack list keeps its order).
const first = (await bot.snap()).inv.find((s) => s)?.id;
const firstCount = await have(first);
await bot.key("Enter", 200);
if ((await have(first)) !== 0)
  finding(`Enter did not ship all of ${first} (${await have(first)} left)`);
if (!(await binLines()).some((l) => l.id === first && l.count === firstCount))
  finding("the shipped stack is not in the bin");

// Take it back with the right-hand list, then ship part through the prompt.
await bot.key("ArrowRight", 100);
await bot.key("Enter", 200);
if ((await have(first)) !== firstCount) finding("Take all did not return it");
await bot.key("ArrowLeft", 100);
await bot.key("Space", 200); // Ship some: opens the prompt at 1
await bot.key("ArrowUp", 100);
await bot.key("ArrowUp", 100); // 3
await bot.shot("bin-prompt");
await bot.key("Enter", 200);
if ((await have(first)) !== firstCount - 3)
  finding(`the prompt shipped ${firstCount - (await have(first))}, wanted 3`);
// Escape in the prompt cancels it and leaves the bin open.
await bot.key("Space", 200);
await bot.key("Escape", 200);
if (!(await scenes()).includes("bin"))
  finding("Escape in the prompt closed the whole bin");
await bot.key("Escape", 300);
if (!(await scenes()).includes("farm") || (await scenes()).includes("bin"))
  finding("Escape did not close the bin");

// Sleep: the summary, then the report, then the morning.
const owed = await p.evaluate(() =>
  window.__game.registry.get("state").bin.total(),
);
await bot.key("z", 500);
let s = await bot.snap();
if (!s.scenes.includes("shipping"))
  finding(`no shipping summary after sleeping: ${s.scenes}`);
await bot.shot("bin-summary");
await bot.key("Enter", 400);
s = await bot.snap();
if (!s.scenes.includes("report"))
  finding(`Continue did not open the report: ${s.scenes}`);
await bot.key("Enter", 400);
s = await bot.snap();
if (!s.scenes.includes("farm")) finding("the morning did not start");
if (s.money !== money0 + owed)
  finding(`money ${s.money}, expected ${money0 + owed}`);
if ((await binLines()).length) finding("the bin was not emptied");
log(`owed ${owed}g, paid: money ${money0} -> ${s.money}`);

// An empty bin skips the summary.
await bot.key("z", 500);
s = await bot.snap();
if (s.scenes.includes("shipping")) finding("an empty bin showed the summary");
await bot.key("Enter", 400);

log("errors", JSON.stringify(errs));
log("FINDINGS:\n" + (findings.length ? findings.join("\n") : "none"));
await b.close();
