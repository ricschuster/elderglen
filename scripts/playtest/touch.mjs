// The touch persona: a tablet player who only uses the screen. Everything is
// done with touch events in a tablet-sized, touch-enabled browser: no keys.
import {
  launch,
  Bot,
  TABLET,
  log,
  sleepMs,
  finding,
  findings,
  isWalk,
  setMap,
} from "./lib.mjs";

const { b, p, errs } = await launch({
  fresh: true,
  context: TABLET,
  profile: "touch",
});
const bot = new Bot(p, errs);
const cdp = await p.context().newCDPSession(p);

/** Smallest comfortable touch target, in CSS pixels (about 8 mm on the T500). */
const MIN_TARGET = 40;

// ---- touch input ----------------------------------------------------------

const rect = () =>
  p.evaluate(() => {
    const r = document.querySelector("canvas").getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });
/**
 * Canvas coordinates (CSS pixels from the canvas corner, as `targets` gives
 * them) to page coordinates. The canvas is the window (note 64), so there is
 * no fixed game size to scale by.
 */
async function toPage(cx, cy) {
  const r = await rect();
  return { x: r.left + cx, y: r.top + cy };
}
const point = (id, x, y) => ({ id, x, y, radiusX: 8, radiusY: 8, force: 1 });
const touch = (type, pts) =>
  cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });

async function tap(gx, gy, wait = 120) {
  const { x, y } = await toPage(gx, gy);
  await touch("touchStart", [point(1, x, y)]);
  await sleepMs(40);
  await touch("touchEnd", []);
  await sleepMs(wait);
}

/** The floating stick starts here: the left half, clear of the toolbar. */
const STICK = { fx: 0.15, fy: 0.45 };
const dirs = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
let stick = null;
async function stickDown() {
  const r = await rect();
  const a = await toPage(STICK.fx * r.width, STICK.fy * r.height);
  stick = a;
  await touch("touchStart", [point(0, a.x, a.y)]);
}
async function stickPush(dir, reach = 45) {
  const [dx, dy] = dirs[dir];
  await touch("touchMove", [
    point(0, stick.x + dx * reach, stick.y + dy * reach),
  ]);
}
async function stickUp() {
  await touch("touchEnd", []);
  stick = null;
}

/**
 * All interactive objects of a scene, as boxes in canvas CSS pixels (through
 * the scene's camera, which the menus and the farm HUD use to centre and scale)
 * with any label near them.
 */
function targets(key) {
  return p.evaluate((key) => {
    const sc = window.__game.scene.getScene(key);
    // The farm draws its HUD with a second, unzoomed camera.
    const cam = sc.cameras.cameras[sc.cameras.cameras.length - 1];
    const gs = window.__game.scale;
    const css =
      document.querySelector("canvas").getBoundingClientRect().width / gs.width;
    const sx = (x) =>
      (cam.x + cam.width / 2 + (x - cam.scrollX - cam.width / 2) * cam.zoom) *
      css;
    const sy = (y) =>
      (cam.y + cam.height / 2 + (y - cam.scrollY - cam.height / 2) * cam.zoom) *
      css;
    const sz = cam.zoom * css;
    const objs = sc.children.list;
    const texts = objs.filter((o) => o.type === "Text" && o.text);
    return objs
      .filter((o) => o.input && o.input.enabled && o.displayWidth < 900)
      .map((o) => {
        const x0 = o.x - o.displayWidth * o.originX;
        const y0 = o.y - o.displayHeight * o.originY;
        const t = texts.find(
          (t) =>
            t.x >= x0 - 2 &&
            t.x <= x0 + o.displayWidth + 2 &&
            t.y >= y0 - 2 &&
            t.y <= y0 + o.displayHeight + 2,
        );
        return {
          cx: sx(x0 + o.displayWidth / 2),
          cy: sy(y0 + o.displayHeight / 2),
          w: o.displayWidth * sz,
          h: o.displayHeight * sz,
          label: t ? t.text.replace(/\n/g, " ") : "",
        };
      });
  }, key);
}

async function tapLabel(scene, label, nth = 0) {
  const all = (await targets(scene)).filter((t) => t.label === label);
  if (!all[nth]) throw new Error(`no touch target "${label}" in ${scene}`);
  await tap(all[nth].cx, all[nth].cy, 200);
}

/** Check target sizes of a screen against the comfortable minimum. */
async function checkSizes(scene) {
  const small = (await targets(scene))
    .filter((t) => Math.min(t.w, t.h) < MIN_TARGET)
    .map((t) => `${t.label || "?"} ${t.w.toFixed(0)}x${t.h.toFixed(0)}`);
  if (small.length)
    finding(
      `${scene}: touch targets under ${MIN_TARGET} CSS px: ${[...new Set(small)].slice(0, 6).join(", ")}${small.length > 6 ? ` (+${small.length - 6} more)` : ""}`,
    );
  else log(`${scene}: all touch targets are ${MIN_TARGET} px or more`);
}

// ---- walking with the stick ----------------------------------------------

const cx = (tx) => tx * 16 + 8;
const cy = (ty) => ty * 16 + 11;

async function holdAxis(axis, target) {
  for (let i = 0; i < 4; i++) {
    const d = await bot.dbg();
    const diff = target - d.pos[axis];
    if (Math.abs(diff) <= 2) return;
    const dir =
      axis === "x" ? (diff > 0 ? "right" : "left") : diff > 0 ? "down" : "up";
    await stickDown();
    // Crawl for a short last step: on a real device the position poll lags a
    // few frames, which at full speed overshoots by more than the tolerance.
    await stickPush(dir, Math.abs(diff) < 12 ? 14 : 45);
    const limit = Date.now() + (Math.abs(diff) / 80) * 1000 + 1500;
    for (;;) {
      const c = (await bot.dbg()).pos[axis];
      if ((diff > 0 && c >= target - 0.7) || (diff < 0 && c <= target + 0.7))
        break;
      if (Date.now() > limit) break;
    }
    await stickUp();
    await sleepMs(40);
  }
}

async function walkTo(tx, ty) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const d = await bot.dbg();
    setMap(d.map);
    const path = bot.bfs(d.tile, { x: tx, y: ty });
    if (!path) throw new Error(`no path to ${tx},${ty}`);
    let i = 0;
    while (i < path.length - 1) {
      const a = path[i];
      const dx = path[i + 1].x - a.x;
      const dy = path[i + 1].y - a.y;
      let j = i + 1;
      while (
        j + 1 < path.length &&
        path[j + 1].x - path[j].x === dx &&
        path[j + 1].y - path[j].y === dy
      )
        j++;
      if (dx !== 0) await holdAxis("x", cx(path[j].x));
      else await holdAxis("y", cy(path[j].y));
      i = j;
    }
    await holdAxis("x", cx(tx));
    await holdAxis("y", cy(ty));
    const e = await bot.dbg();
    if (e.tile.x === tx && e.tile.y === ty) return;
  }
  throw new Error(`could not reach ${tx},${ty}`);
}

/** A short flick turns the player without leaving the tile. */
async function faceTo(dir) {
  await stickDown();
  // Just past the dead zone: turns the player at a crawl, so the tile holds.
  await stickPush(dir, 8);
  await sleepMs(80);
  await stickUp();
  await sleepMs(40);
}

async function useTool() {
  const t = (await targets("farm")).find((t) => t.label === "Use");
  if (!t) throw new Error("no Use button");
  await tap(t.cx, t.cy, 150);
}

/** Tap the Action button (it opens things, picks and harvests, and eats). */
async function actTool() {
  const t = (await targets("farm")).find((t) => t.label === "Action");
  if (!t) throw new Error("no Action button");
  await tap(t.cx, t.cy, 150);
}

async function selectSlot(i) {
  const H = (await rect()).height;
  const slots = (await targets("farm"))
    .filter((t) => t.cy > H * 0.85 && t.w < 90)
    .sort((a, c) => a.cx - c.cx);
  await tap(slots[i].cx, slots[i].cy, 100);
  const s = await bot.snap();
  if (s.selected !== i)
    finding(`tapping toolbar slot ${i} selected ${s.selected}`);
}

const sceneNow = () =>
  p.evaluate(() => window.__game.scene.getScenes(true).map((x) => x.scene.key));

// ---- the run --------------------------------------------------------------

const vp = await rect();
log(
  `canvas ${vp.width.toFixed(0)}x${vp.height.toFixed(0)} CSS px at ${vp.left.toFixed(0)},${vp.top.toFixed(0)} in a 1200x700 page`,
);
if (vp.width > 1200.5 || vp.height > 700.5)
  finding("the game canvas is larger than the tablet viewport");
const scrolls = await p.evaluate(
  () =>
    document.documentElement.scrollWidth > innerWidth ||
    document.documentElement.scrollHeight > innerHeight,
);
if (scrolls) finding("the page scrolls on the tablet viewport");
await checkSizes("farm");

// 1. The stick moves the player and stops when released.
const t0 = await bot.dbg();
await stickDown();
await stickPush("right");
await sleepMs(500);
const t1 = await bot.dbg();
await stickUp();
await sleepMs(200);
const t2 = await bot.dbg();
const t3 = await bot.dbg();
if (t1.pos.x <= t0.pos.x + 10)
  finding("dragging the stick right did not move the player");
if (Math.abs(t3.pos.x - t2.pos.x) > 0.01)
  finding("the player kept moving after the finger lifted");
log(`stick: moved ${(t1.pos.x - t0.pos.x).toFixed(0)}px in 0.5s`);

// 2. Farming loop by touch. The toolbar is hoe, can, axe, pickaxe, hand, then the bag.
const PX = 16;
await walkTo(PX, 12);
await faceTo("up");
const front = (await bot.dbg()).target;
log("facing", JSON.stringify(front));
await selectSlot(0); // hoe
await useTool();
let s = await bot.snap();
if (!s.plots.some((q) => q.x === front.x && q.y === front.y && q.tilled))
  finding("Use with the hoe did not till the tile in front");
const seedSlot = s.inv.findIndex((x) => x && x.id === "parsnip-seed") + 5;
await selectSlot(seedSlot);
await useTool();
s = await bot.snap();
if (!s.plots.some((q) => q.x === front.x && q.y === front.y && q.crop))
  finding("Use with seeds did not plant");
await selectSlot(1); // can
await useTool();
s = await bot.snap();
if (!s.plots.some((q) => q.x === front.x && q.y === front.y && q.wateredToday))
  finding("Use with the can did not water");
log("till, plant, water by touch: done");
// Skip the growing days with the debug state, then harvest by touch.
await p.evaluate(
  ([x, y]) => {
    const st = window.__game.registry.get("state");
    st.farm.plotAt(x, y).crop.daysGrown = 99;
  },
  [front.x, front.y],
);
await selectSlot(4); // hand
const before = (await bot.snap()).inv;
await actTool();
s = await bot.snap();
if (bot.countBase(s, "parsnip") < 1)
  finding("Action did not harvest the ripe crop");
else log("harvest by touch: done");
void before;

// 2b. Hold Use to chop: a finger held on the Use button fells a tree and then
// its stump, and goods that do not fit in a full bag are picked up on the way.
async function holdUse(until, limit = 25000) {
  const t = (await targets("farm")).find((t) => t.label === "Use");
  const a = await toPage(t.cx, t.cy);
  await touch("touchStart", [point(1, a.x, a.y)]);
  const t0 = Date.now();
  while (!(await until()) && Date.now() - t0 < limit) await sleepMs(100);
  await touch("touchEnd", []);
  await sleepMs(200);
  return Date.now() - t0;
}
const treeHere = (x, y) =>
  p.evaluate(
    ([x, y]) => window.__game.registry.get("state").trees.at(x, y)?.stage ?? 0,
    [x, y],
  );
await walkTo(14, 13);
await faceTo("down");
const tr = (await bot.dbg()).target;
const stage = await treeHere(tr.x, tr.y);
log(`tree at ${tr.x},${tr.y}, stage ${stage}`);
await selectSlot(2); // axe
const wood0 = (await bot.dbg()).wood;
const e0 = (await bot.dbg()).energy;
// A single tap swings once and must not fell it.
await useTool();
if ((await treeHere(tr.x, tr.y)) === 0)
  finding("one tap on Use felled a mature tree");
const ms = await holdUse(async () => (await treeHere(tr.x, tr.y)) === 0);
const d2 = await bot.dbg();
if ((await treeHere(tr.x, tr.y)) !== 0)
  finding("holding Use on the button did not clear the tree and its stump");
else
  log(
    `hold to chop by touch: tree and stump gone in ${(ms / 1000).toFixed(1)}s, wood +${d2.wood - wood0}, energy -${(e0 - d2.energy).toFixed(0)}`,
  );
if (d2.wood <= wood0) finding("chopping by touch gave no wood");
// Ground pickup: fill the bag, chop another tree, then walk onto the drops.
await p.evaluate(() => {
  const inv = window.__game.registry.get("state").inventory;
  while (inv.add("sap", 1));
  while (inv.add("wood", 1));
});
await walkTo(15, 16);
await faceTo("down");
const tr2 = (await bot.dbg()).target;
if (await treeHere(tr2.x, tr2.y)) {
  await holdUse(async () => (await treeHere(tr2.x, tr2.y)) === 0);
  const dropped = await p.evaluate(
    () => window.__game.registry.get("state").ground.each().length,
  );
  log(`full bag: ${dropped} pile(s) on the ground after the chop`);
  if (dropped === 0)
    log("no ground piles (the bag had room); the pickup check is skipped");
  else {
    await p.evaluate(() => {
      const st = window.__game.registry.get("state");
      st.inventory.remove("sap", st.inventory.count("sap"));
      st.inventory.remove("wood", st.inventory.count("wood"));
    });
    await walkTo(15, 14);
    await sleepMs(500);
    await walkTo(15, 16);
    await sleepMs(500);
    const left = await p.evaluate(
      () => window.__game.registry.get("state").ground.each().length,
    );
    if (left > 0)
      finding(`walking by with the stick left ${left} pile(s) on the ground`);
    else log("ground pickup by walking with the stick: done");
  }
} else log(`no tree at ${tr2.x},${tr2.y}; the pickup check is skipped`);
await selectSlot(0);

// 3. Two fingers: keep the stick down and tap Use with the other.
await selectSlot(0);
await stickDown();
await stickPush("down");
const use = (await targets("farm")).find((t) => t.label === "Use");
const up = await toPage(use.cx, use.cy);
const m0 = (await bot.dbg()).pos.y;
await touch("touchStart", [
  point(0, stick.x, stick.y + 45),
  point(1, up.x, up.y),
]);
await sleepMs(60);
await touch("touchEnd", [point(0, stick.x, stick.y + 45)]);
await sleepMs(300);
const m1 = (await bot.dbg()).pos.y;
await stickUp();
if (m1 <= m0)
  finding("the stick stopped working while a second finger tapped Use");
else log("stick plus Use at once: the stick kept moving");

// 4. Shop by touch.
await walkTo(33, 19);
await faceTo("down");
await actTool();
await sleepMs(300);
if (!(await sceneNow()).includes("shop"))
  finding("Action facing the shop door did not open the shop");
else {
  await checkSizes("shop");
  const m = (await bot.snap()).money;
  // Tapping a row does its main action; the buttons do the rest.
  const buyRow = (await targets("shop")).find(
    (t) => t.label === "Parsnip seeds",
  );
  await tap(buyRow.cx, buyRow.cy, 200);
  const m2 = (await bot.snap()).money;
  if (m2 >= m) finding("tapping a buy row did not buy one");
  await tapLabel("shop", "Buy 5");
  const m3 = (await bot.snap()).money;
  if (m3 >= m2) finding("tapping Buy 5 did not spend money");
  const have = bot.countBase(await bot.snap(), "parsnip");
  if (have > 0) {
    const sellRow = (await targets("shop")).find((t) =>
      t.label.startsWith("Parsnip  x"),
    );
    await tap(sellRow.cx, sellRow.cy, 200);
    const m4 = (await bot.snap()).money;
    if (m4 <= m3) finding("tapping a sell row did not sell one");
    const rows = (await targets("shop")).filter((t) => t.label === "Sell all");
    if (rows.length) await tap(rows[0].cx, rows[0].cy, 200);
  }
  await tapLabel("shop", "Close");
  await sleepMs(300);
  const sc = await sceneNow();
  if (sc.includes("shop") || !sc.includes("farm"))
    finding("tapping Close did not return to the farm");
  else log("shop by touch: buy, sell, close done");
}

// 5. Hall by touch: in by the door, to a scroll, and back out.
// Doors open on Action, not on a walk through.
await walkTo(6, 21);
await faceTo("down");
await actTool();
await sleepMs(900);
const inHall = await bot.dbg();
if (inHall.map !== "hall")
  finding(`Action on the hall door did not enter the hall (map ${inHall.map})`);
await walkTo(4, 2);
await faceTo("up");
const bundle = await p.evaluate(() => {
  const st = window.__game.registry.get("state");
  const b = st.hall.bundles[0];
  window.farmGive(b.items[0].id, 1);
  return { id: b.id, item: b.items[0].id };
});
await actTool();
await sleepMs(300);
if (!(await sceneNow()).includes("hall"))
  finding("Action facing the hall door did not open the hall");
else {
  await checkSizes("hall");
  const rows = (await targets("hall")).filter((t) => t.label === "Hand in");
  // The first backpack row is the one just given, or seeds; try each row.
  let done = false;
  for (let i = 0; i < rows.length && !done; i++) {
    await tap(rows[i].cx, rows[i].cy, 200);
    done = ((await bot.snap()).hall[bundle.id]?.[bundle.item] ?? 0) >= 1;
  }
  if (!done) finding("tapping Hand in did not hand the item in");
  else log("hall by touch: hand-in done");
  await tapLabel("hall", "Close");
  await sleepMs(300);
}
await walkTo(23, 18);
await faceTo("down");
await actTool();
await sleepMs(900);
if ((await bot.dbg()).map !== "farm")
  finding("Action on the hall door did not return to the farm");

// 5b. Shipping bin by touch: tap a row to ship the stack, the prompt for part.
await walkTo(8, 7);
await faceTo("up");
await p.evaluate(() => {
  window.farmGive("parsnip", 6);
  window.farmGive("sap", 4);
});
await actTool();
await sleepMs(300);
if (!(await sceneNow()).includes("bin"))
  finding("Action facing the bin did not open it");
else {
  await checkSizes("bin");
  const binCount = () =>
    p.evaluate(() =>
      window.__game.registry
        .get("state")
        .bin.each()
        .reduce((n, l) => n + l.count, 0),
    );
  const rowOf = async (name) =>
    (await targets("bin")).find((t) => t.label.startsWith(name));
  const sapRow = await rowOf("Sap");
  const sap = Number(sapRow.label.split("x")[1]);
  await tap(sapRow.cx, sapRow.cy, 250);
  if ((await binCount()) !== sap)
    finding(`tapping a stack shipped ${await binCount()}, wanted all ${sap}`);
  const parRow = (await targets("bin")).filter((t) => t.label === "Ship some");
  await tap(parRow[parRow.length - 1].cx, parRow[parRow.length - 1].cy, 250);
  await tapLabel("bin", "+");
  await tapLabel("bin", "+");
  await tapLabel("bin", "Ship");
  await sleepMs(200);
  if ((await binCount()) < sap + 1)
    finding(`the prompt by touch left ${await binCount()} in the bin`);
  else log("shipping bin by touch: tap a stack, prompt for part: done");
  await tapLabel("bin", "Close");
  await sleepMs(300);
  if (!(await sceneNow()).includes("farm"))
    finding("tapping Close did not leave the bin");
}

// 6. Sleep by touch: walk into the house, use the bed, answer Yes.
await walkTo(6, 6);
await faceTo("up");
await actTool();
await sleepMs(900);
const atDoor = await bot.dbg();
if (atDoor.map !== "house")
  finding(
    `Action on the house door did not enter the house (map ${atDoor.map}, tile ${atDoor.tile.x},${atDoor.tile.y}, pos ${atDoor.pos.x.toFixed(1)},${atDoor.pos.y.toFixed(1)}, exit ${atDoor.exit})`,
  );
else {
  // The bed is at 20,19 on the house map; stand below it.
  await walkTo(20, 20);
  await faceTo("up");
  const day = (await bot.snap()).day;
  await actTool();
  await sleepMs(300);
  if (!(await sceneNow()).includes("bed"))
    finding("Action facing the bed did not ask about sleeping");
  else {
    await checkSizes("bed");
    // No first: the day must go on, then ask again and say Yes.
    await tapLabel("bed", "No");
    await sleepMs(300);
    if ((await sceneNow()).includes("report") || (await bot.snap()).day !== day)
      finding("answering No to the bed ended the day");
    await actTool();
    await sleepMs(300);
    await tapLabel("bed", "Yes");
    await sleepMs(400);
    // Goods in the bin show the shipping summary before the report.
    if ((await sceneNow()).includes("shipping")) {
      await checkSizes("shipping");
      await tapLabel("shipping", "Continue");
      await sleepMs(400);
    } else finding("sleeping with goods in the bin showed no summary");
    if (!(await sceneNow()).includes("report"))
      finding("answering Yes to the bed did not end the day");
    else {
      await checkSizes("report");
      await tapLabel("report", "Start the day");
      await sleepMs(300);
      const d2 = (await bot.snap()).day;
      if (d2 !== day + 1)
        finding(`sleeping moved the day from ${day} to ${d2}`);
      else log("sleep by touch: bed, Yes, report and next morning done");
    }
  }
}

// 7. Reload: the title screen's Continue by touch.
const saved = await bot.snap();
await p.goto(new URL(".", p.url()).href);
await sleepMs(1500);
const titleScenes = await sceneNow();
if (!titleScenes.includes("title"))
  finding(`reload did not show the title screen: ${titleScenes}`);
else {
  await checkSizes("title");
  await tapLabel("title", "Continue");
  await sleepMs(500);
  const r = await bot.snap();
  if (
    !r.scenes.includes("farm") ||
    r.day !== saved.day ||
    r.money !== saved.money
  )
    finding("Continue by touch did not restore the saved game");
  else log("title Continue by touch: restored day", r.day);
}

log("errors", JSON.stringify(errs));
log("FINDINGS:\n" + (findings.length ? findings.join("\n") : "none"));
await b.close();
void isWalk;
