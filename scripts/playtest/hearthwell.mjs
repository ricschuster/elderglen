// Hearthwell part 1 (note 77): the shell and the farm's moved doors. Leave the
// farm by its east exit, walk to the Village Hall door and the sawmill door and
// back, use the store and smithy counters, read the Outpost boards, then out by
// the Mountain exit and back, and by the delta exit and back, and home to the farm.
// Run with `npm run dev` going: node scripts/playtest/hearthwell.mjs
// (BASE_URL=http://localhost:5174/ if the dev server picked another port.)
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
const bot = new Bot(p, errs);

const travel = (map, entry) =>
  p.evaluate(
    ([m, e]) => {
      window.__game.scene
        .getScenes(true)[0]
        .scene.restart({ map: m, entry: e });
    },
    [map, entry],
  );

/** Stand on a tile, face the way, press Action, and expect the next map. */
async function door(x, y, dir, want, what) {
  await bot.walkTo(x, y);
  await bot.face(dir);
  await bot.key("KeyX", 200);
  await sleepMs(1000);
  const d = await bot.dbg();
  log(`${what}: ${d.map} at ${JSON.stringify(d.tile)}`);
  if (d.map !== want) finding(`${what} reached ${d.map}, not ${want}`);
}

/** Face a counter from the tile below it and expect a screen to open, then close it. */
async function counter(x, y, scene, what) {
  await bot.walkTo(x, y);
  await bot.face("up");
  await bot.key("KeyX", 300);
  const s = await bot.snap();
  if (!s.scenes.includes(scene))
    finding(`${what} did not open ${scene}: ${s.scenes}`);
  else {
    log(`${what}: ${scene} opened`);
    await bot.key("Escape", 350);
  }
}

await travel("farm", "from_hearthwell");
await sleepMs(1500);
let d = await bot.dbg();
if (d.map !== "farm") finding(`expected the farm, on ${d.map}`);

// The farm has no hall or sawmill door any more, and an east exit.
const farmExits = await p.evaluate(
  () => window.__game.registry.get("state") && window.farmDebug().map,
);
if (farmExits !== "farm") finding("not on the farm");

await door(38, 17, "right", "hearthwell", "the farm's east exit");
await bot.shot("hearthwell-arrive");

// The hall and back.
await door(99, 60, "up", "hall", "the hall door");
await door(23, 18, "down", "hearthwell", "the hall's own door");

// The sawmill and the carpenter's counter, and back.
await door(48, 76, "up", "sawmill", "the sawmill door");
await counter(5, 2, "carpenter", "the carpenter");
await door(5, 5, "down", "hearthwell", "the sawmill's own door");

// The store and smithy counters, outside their doors.
await counter(22, 29, "shop", "the store counter");
await counter(20, 29, "requests", "the Help Wanted board");
await counter(22, 90, "smith", "the smithy counter");

// The Outpost boards say something and open nothing.
for (const [x, what, line] of [
  [86, "road news board", "road news board"],
  [90, "Special Orders board", "Special Orders board"],
]) {
  for (let tries = 0; tries < 3; tries++) {
    await bot.walkTo(x, 13);
    const at = (await bot.dbg()).tile;
    if (at.x === x && at.y === 13) break;
  }
  await bot.face("up");
  await bot.key("KeyX", 300);
  const s = await bot.snap();
  const said = (await bot.dbg()).message;
  if (s.scenes.length !== 1 || s.scenes[0] !== "farm")
    finding(`the ${what} opened ${s.scenes}`);
  if (!said.includes(line)) finding(`the ${what} said "${said}"`);
  else log(`the ${what}: "${said}"`);
}

// Out by the Mountain exit and back.
await door(51, 1, "up", "mountain", "the Mountain exit");
await door(47, 68, "down", "hearthwell", "the Mountain's Hearthwell exit");

// Out by the delta exit and back.
await door(73, 108, "down", "delta", "the delta exit");
await door(69, 1, "up", "hearthwell", "the delta's Hearthwell exit");

// Home by the west exit.
await door(1, 61, "left", "farm", "the Farm exit");

if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
