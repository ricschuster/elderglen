// Hearthwell parts 1 and 2 (note 77): the shell, the farm's moved doors and the
// interiors. Leave the farm by its east exit, walk to the hall and sawmill doors
// and back, go into the store, smithy, healer, inn, library, hatter, the Outpost
// and its rooms and the three burrows and out again, then out by the Mountain
// exit and back, and by the delta exit and back, and home to the farm.
// Run with `npm run dev` going: node scripts/playtest/hearthwell.mjs
// (BASE_URL=http://localhost:5174/ if the dev server picked another port.)
import { readFileSync } from "node:fs";
import { launch, Bot, log, sleepMs, finding, findings } from "./lib.mjs";

// Interior sizes change, so read each interior's standing tile at its door (the
// "entry" marker) and the tile below its counter from the map file.
function interior(id) {
  const map = JSON.parse(readFileSync(`src/content/maps/${id}.json`, "utf8"));
  const objs = map.layers.find((l) => l.name === "markers").objects;
  const at = (o) => [Math.floor(o.x / 16), Math.floor(o.y / 16)];
  const entry = objs.find((o) => o.name === "door" && o.class === "entry");
  const counter = objs.find(
    (o) => o.class === "service" || o.name.startsWith("counter"),
  );
  return {
    exit: at(entry),
    counter: counter ? [at(counter)[0], at(counter)[1] + 1] : null,
  };
}

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

// The doors and counters keep hours (shops.json); a new game starts at 6:00 on a
// Monday, when the store, smithy and sawmill are all open from 9:00.
await p.evaluate(() => {
  window.__game.registry.get("state").day.clock.minutes = 11 * 60;
});
await door(78, 14, "right", "hearthwell", "the farm's east exit");
await bot.shot("hearthwell-arrive");

// The hall and back.
await door(99, 60, "up", "hall", "the hall door");
await door(23, 18, "down", "hearthwell", "the hall's own door");

// The sawmill and the carpenter's counter, and back.
await door(48, 76, "up", "sawmill", "the sawmill door");
await counter(...interior("sawmill").counter, "carpenter", "the carpenter");
await door(
  ...interior("sawmill").exit,
  "down",
  "hearthwell",
  "the sawmill's own door",
);

// The Help Wanted board stays outside the general store, by its door.
await counter(20, 29, "requests", "the Help Wanted board");

// The store: in by its door, the counter inside, out again.
await door(22, 29, "up", "general-store", "the general store door");
await counter(
  ...interior("general-store").counter,
  "shop",
  "the store counter",
);
await door(
  ...interior("general-store").exit,
  "down",
  "hearthwell",
  "the store's own door",
);

// The smithy: in by its door, the smith counter inside, out again.
await door(22, 90, "up", "smithy", "the smithy door");
await counter(...interior("smithy").counter, "smithy", "the smithy counter");
await door(
  ...interior("smithy").exit,
  "down",
  "hearthwell",
  "the smithy's own door",
);

// The healer, inn, library and hatter: in, a counter that talks, out.
for (const [id, x, doorX, doorY, cx] of [
  ["healer", 41, 41, 29, 6],
  ["inn", 22, 22, 60, 6],
  ["library", 41, 41, 60, 6],
  ["hatter", 41, 41, 90, 6],
]) {
  // The library is shut on Mondays and the inn opens at 12:00 (shops.json).
  await p.evaluate(() => {
    const c = window.__game.registry.get("state").day.clock;
    c.day = Math.max(c.day, 2);
    c.minutes = 13 * 60;
  });
  await door(doorX, doorY, "up", id, `the ${id} door`);
  await bot.walkTo(...interior(id).counter);
  await bot.face("up");
  await bot.key("KeyX", 300);
  const said = (await bot.dbg()).message;
  if (id === "library") {
    // The library counter opens the gallery (note 104), not a line.
    const open = await p.evaluate(() =>
      window.__game.scene.isActive("gallery"),
    );
    if (!open) finding("the library counter did not open the gallery");
    else {
      log("the library counter: the gallery opened");
      await bot.key("Escape", 350);
    }
  } else if (!said.includes("Nobody is here yet"))
    finding(`the ${id} counter said "${said}"`);
  else log(`the ${id} counter: "${said}"`);
  await door(
    ...interior(id).exit,
    "down",
    "hearthwell",
    `the ${id}'s own door`,
  );
}

// The Outpost: the post room, the steward's rooms behind it, and back.
await door(88, 13, "up", "outpost", "the Outpost door");
await door(8, 3, "up", "outpost-rooms", "the steward's rooms door");
await door(
  ...interior("outpost-rooms").exit,
  "down",
  "outpost",
  "the steward's rooms' own door",
);
await door(
  ...interior("outpost").exit,
  "down",
  "hearthwell",
  "the Outpost's own door",
);

// The three burrows.
for (const [id, x, y] of [
  ["burrow-young", 8, 60],
  ["burrow-gardener", 68, 29],
  ["burrow-retired", 66, 85],
]) {
  await door(x, y, "up", id, `the ${id} door`);
  await door(
    ...interior(id).exit,
    "down",
    "hearthwell",
    `the ${id}'s own door`,
  );
}

// The Special Orders board is on the Outpost wall, right of the door (notes 57 and 65).
await counter(90, 13, "orders", "the Orders board");

// The road news board says something and opens nothing.
// It speaks the road news (src/content/road-news.json), so any line will do.
for (const [x, what, line] of [[86, "road news board", ""]]) {
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
  if (!said || !said.includes(line)) finding(`the ${what} said "${said}"`);
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
