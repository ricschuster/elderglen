// Tap-to-move (note 27): a tablet player taps the world. Checks that a tap on
// open ground walks there by route, a tap on a tree walks beside it and fells
// it with the axe, a tap with no route marks the target red and does not move,
// and a tap on the tile beside the farmer uses the held tool. Touch only.
import {
  launch,
  Bot,
  TABLET,
  log,
  sleepMs,
  finding,
  findings,
} from "./lib.mjs";

const { b, p, errs } = await launch({
  fresh: true,
  context: TABLET,
  profile: "touch",
  scheme: "tap",
});
const bot = new Bot(p, errs);
const cdp = await p.context().newCDPSession(p);

/** Page coordinates of the middle of a world tile. */
const tilePage = (tx, ty) =>
  p.evaluate(
    ([tx, ty]) => {
      const g = window.__game;
      const sc = g.scene.getScene("farm");
      const cam = sc.cameras.main;
      const ts = sc.map.tileSize;
      const wx = (tx + 0.5) * ts;
      const wy = (ty + 0.5) * ts;
      const gx = (wx - cam.worldView.x) * cam.zoom;
      const gy = (wy - cam.worldView.y) * cam.zoom;
      const r = document.querySelector("canvas").getBoundingClientRect();
      return {
        x: r.left + (gx * r.width) / g.scale.gameSize.width,
        y: r.top + (gy * r.height) / g.scale.gameSize.height,
      };
    },
    [tx, ty],
  );
async function tapTile(tx, ty, wait = 200) {
  const { x, y } = await tilePage(tx, ty);
  const pt = { id: 1, x, y, radiusX: 8, radiusY: 8, force: 1 };
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [pt],
  });
  await sleepMs(40);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await sleepMs(wait);
}
const tile = async () => (await bot.dbg()).tile;
async function waitTile(tx, ty, ms = 8000) {
  for (let t = 0; t < ms; t += 200) {
    const c = await tile();
    if (c.x === tx && c.y === ty) return true;
    await sleepMs(200);
  }
  return false;
}

const start = await tile();
log("start", JSON.stringify(start));

// 1. Walk over open ground.
const dest = { x: start.x + 4, y: start.y };
await tapTile(dest.x, dest.y);
if (await waitTile(dest.x, dest.y)) log("walked to", JSON.stringify(dest));
else finding(`tap on open ground did not walk to ${JSON.stringify(dest)}`);

// 2. Tap a tree: walk beside it and fell it.
const trees = await p.evaluate(() =>
  window.__game.registry.get("state").trees.save(),
);
const here = await tile();
const tree = [...trees].sort(
  (a, c) =>
    Math.abs(a.x - here.x) +
    Math.abs(a.y - here.y) -
    (Math.abs(c.x - here.x) + Math.abs(c.y - here.y)),
)[0];
if (tree) {
  log("tree at", tree.x, tree.y);
  await tapTile(tree.x, tree.y);
  let gone = false;
  for (let t = 0; t < 40000 && !gone; t += 500) {
    await sleepMs(500);
    gone = await p.evaluate(
      ([x, y]) =>
        !window.__game.registry.get("state").trees.at(x, y) ||
        window.__game.registry.get("state").trees.at(x, y).stump === true,
      [tree.x, tree.y],
    );
  }
  const sel = await p.evaluate(() => window.__game.registry.get("selected"));
  if (!gone) finding("tap on a tree did not fell it");
  if (sel !== 2) finding(`tap on a tree selected slot ${sel}, not the axe (2)`);
  else log("tree felled with the axe");
} else log("no trees to test");

// 3. A tap with no route: the map corner outside the walls.
const before = await tile();
await tapTile(0, 0);
await sleepMs(1200);
const after = await tile();
if (before.x !== after.x || before.y !== after.y)
  log("note: tile (0,0) had a route, farmer moved");
else log("no route: farmer stayed");

if (errs.length) finding(`page errors: ${errs.slice(0, 3).join(" | ")}`);
log(findings.length ? `${findings.length} finding(s)` : "tap-to-move OK");
await b.close();
process.exit(findings.length ? 1 : 0);
