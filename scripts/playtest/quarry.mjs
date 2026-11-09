// The Quarry (note 78): the Mountain's east bridge is out until the Foragers'
// Shelf is done at the hall. Walk to the bridge and find it shut, finish the
// Shelf (by state, not by hand), cross, speak to the stonekeeper at his camp,
// break a rock with the pickaxe, then pass the night and find the nodes back.
// Run with `npm run dev` going: node scripts/playtest/quarry.mjs
// (BASE_URL=http://localhost:5174/ if the dev server picked another port.)
// The start is a scene restart on the Mountain, not a walk from the farm.
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
const message = () =>
  p.evaluate(() => window.__game.scene.getScenes(true)[0].message ?? "");

// ---- the bridge is out.
await travel("mountain", "from_forest");
await sleepMs(1500);
await bot.walkTo(72, 47);
await bot.face("right");
await p.keyboard.press("KeyX");
await sleepMs(400);
let line = await message();
log(`ruined bridge: ${line}`);
if (!/bridge is out/i.test(line)) finding("the ruined bridge said nothing");
await p.keyboard.down("ArrowRight");
await sleepMs(700);
await p.keyboard.up("ArrowRight");
let d = await bot.dbg();
if (d.tile.x > 72) finding(`walked onto the ruined bridge to ${d.tile.x}`);
await bot.shot("bridge-ruined");

// ---- finish the Foragers' Shelf, then the bridge is mended.
await state((s) => {
  for (const bundle of s.hall.bundles.filter(
    (x) => x.room === "foragers-shelf",
  ))
    for (const item of bundle.items)
      for (let n = 0; n < item.count; n++) {
        if (s.hall.complete(bundle.id)) break;
        const stack =
          item.minQuality === "normal"
            ? item.id
            : `${item.id}@${item.minQuality}`;
        s.inventory.add(stack);
        s.hall.handIn(s.inventory, s, bundle.id, stack);
      }
});
await travel("mountain", "from_forest");
await sleepMs(1500);
await bot.walkTo(72, 47);
await bot.face("right");
await p.keyboard.press("KeyX");
await sleepMs(300);
await bot.shot("bridge-mended");
await bot.walkTo(78, 47);
await bot.face("right");
await p.keyboard.down("ArrowRight");
await sleepMs(900);
await p.keyboard.up("ArrowRight");
await sleepMs(300);
await p.keyboard.press("KeyX"); // exits open with Action, standing on them
await sleepMs(1500);
d = await bot.dbg();
log(`across the bridge: ${d.map} at ${JSON.stringify(d.tile)}`);
if (d.map !== "quarry") finding(`expected the quarry, on ${d.map}`);
await bot.shot("quarry-entry");

// ---- the dwarf's camp.
await bot.walkTo(11, 34);
await bot.face("down");
await p.keyboard.press("KeyX");
await sleepMs(400);
line = await message();
log(`stonekeeper: ${line}`);
if (!/stonekeeper/i.test(line)) finding("the camp dwarf said nothing");
await bot.shot("quarry-camp");

// ---- break the nearest rock with the pickaxe.
const rock = await state((s) => {
  const rocks = [...s.rocks.each()].filter((r) => r.kind === "stone");
  rocks.sort(
    (a, b) => Math.hypot(a.x - 3, a.y - 22) - Math.hypot(b.x - 3, b.y - 22),
  );
  return { ...rocks[0], count: s.rocks.count };
});
log(`rocks here: ${rock.count}, nearest ${rock.x},${rock.y}`);
if (rock.count < 70)
  finding(`only ${rock.count} rocks in the Quarry at the start`);
const stone0 = await state((s) => s.inventory.count("stone"));
await bot.select(3);
for (let n = 0; n < 4; n++) {
  await bot.useAt(rock.x, rock.y);
  await sleepMs(300);
  const gone = await state((s, r) => !s.rocks.at(r.x, r.y), rock);
  if (gone) break;
}
const stone1 = await state((s) => s.inventory.count("stone"));
log(`stone ${stone0} -> ${stone1}`);
if (stone1 <= stone0) finding("breaking a rock gave no stone");
await bot.shot("quarry-rock-broken");

// ---- the night brings nodes back.
const before = await state((s) => s.rocks.count);
await p.evaluate(() => {
  window.__game.scene.getScenes(true)[0].endDay();
});
await sleepMs(1500);
await p.keyboard.press("Escape");
await sleepMs(300);
const after = await state((s) => s.areas.quarry.rocks.count);
log(`rocks ${before} -> ${after}`);
if (after <= before) finding("no nodes came back overnight");
const told = await state((s) => (s.flags ?? []).includes("quarry-told"));
if (!told) finding("the morning report did not tell of the bridge");

if (errs.length) finding(`console errors: ${errs.slice(0, 5).join(" | ")}`);
log(findings.length ? `FINDINGS:\n- ${findings.join("\n- ")}` : "no findings");
await b.close();
process.exit(findings.length ? 1 : 0);
