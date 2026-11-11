// Short check of the greenhouse (#602, #634): the ruin door is shut, the Larder
// repairs it, inside the player digs, plants and waters in winter, a sprinkler
// waters the plot overnight, a fruit tree grows and bears indoors, and the
// greenhouse is moved at the carpenter with its contents staying. Needs `npm run dev`
// (set BASE_URL if the server is not on port 5173).
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
const shot = (n) => p.screenshot({ path: `${OUT}/shots/greenhouse-${n}.png` });

// The ruin on the farm, door shut.
await farm((g, f, s) => {
  f.pos = { x: 26 * 16 + 8, y: 14 * 16 + 8 };
});
await sleepMs(300);
await shot("ruin");
const shut = await farm((g, f) => {
  f.facing = "up";
  f.action();
  return f.message;
});
log("shut door says:", shut);
if (!/ruin/.test(shut)) finding(`ruin message missing: ${shut}`);

// Repair it as the Larder would, make it winter, and go in.
await farm((g, f, s) => {
  s.hall.roomComplete = (id) =>
    id === "larder" || (s.hall.rooms.some((r) => r.id === id) && false);
  s.day.clock.day = 3 * 28 + 5;
  s.inventory.add("parsnip-seed", 3);
  f.action();
});
await sleepMs(1500);
let st = await farm((g, f) => ({
  map: f.mapId,
  scenes: g.scene.getScenes(true).map((x) => x.scene.key),
}));
log("after door:", JSON.stringify(st));
if (st.map !== "greenhouse") finding(`did not enter the greenhouse: ${st.map}`);
log("errs:", JSON.stringify(errs));
await shot("inside");

// Dig, plant and water the plot ahead of the entry.
await sleepMs(500);
await bot.refreshMap();
await bot.walkTo(9, 14);
await bot.face("up");
const plots = () => farm((g, f, s) => [...s.greenhouse.each()]);
const toolbar = await farm((g, f, s) =>
  s.inventory
    .save()
    .slice(0, 6)
    .map((x) => x && x.id),
);
log("backpack:", JSON.stringify(toolbar));
await bot.select(0);
await bot.key("KeyC", 300);
log("plots after slot 1:", JSON.stringify(await plots()));
if ((await plots()).length < 1) finding("hoe did not dig a greenhouse plot");
await shot("dug");
await bot.select(4);
await bot.key("KeyC", 300);
await bot.select(1);
await bot.key("KeyC", 300);
const plot = (await plots())[0];
log("plot:", JSON.stringify(plot));
if (!plot?.plot.crop) finding("seed did not plant in winter");
if (!plot?.plot.wateredToday) finding("can did not water");
await shot("planted");

// Sleep overnight in the scene's own end of day, then dismiss the morning report.
const night = async () => {
  await farm((g, f) => f.endDay());
  await sleepMs(800);
  await farm((g) => {
    if (g.scene.isActive("report")) g.scene.getScene("report").close();
  });
  await sleepMs(300);
};
await night();
const grown = await farm(
  (g, f, s) => [...s.greenhouse.each()][0]?.plot.crop?.daysGrown,
);
log("daysGrown after a night:", grown);
if (grown !== 1) finding(`crop did not grow overnight in winter: ${grown}`);
// (The scene is called directly from here: a morning summary covers the keyboard after a night.)
// Items from the toolbar: a sprinkler on the border beside the crop, then a fruit
// tree on the border. Both are the greenhouse's own (#634).
const stand = (x, y, facing) =>
  farm(
    (g, f, s, a) => {
      f.pos = { x: a[0] * 16 + 8, y: a[1] * 16 + 8 };
      f.facing = a[2];
    },
    [x, y, facing],
  );
// The toolbar is the four tools, then the backpack slots.
const slotOf = (id) =>
  farm(
    (g, f, s, id) => 4 + s.inventory.save().findIndex((x) => x && x.id === id),
    id,
  );
await farm((g, f, s) => {
  s.inventory.add("sprinkler", 1);
  s.inventory.add("apricot-sapling", 1);
});
await stand(9, 15, "up");
await farm((g, f, s, i) => f.select(i), await slotOf("sprinkler"));
await farm((g, f) => f.use());
const house = () =>
  farm((g, f, s) => ({
    sprinklers: [...s.greenhouseSprinklers.each()],
    trees: [...s.greenhouseFruitTrees.each()],
    farmSprinklers: s.sprinklers.count,
    farmTrees: s.fruitTrees.count,
  }));
let items = await house();
log("greenhouse items:", JSON.stringify(items));
if (items.sprinklers.length !== 1) finding("sprinkler did not go down indoors");
if (items.farmSprinklers !== 0)
  finding("indoor sprinkler leaked to the farm store");
await stand(2, 8, "right");
await farm((g, f, s, i) => f.select(i), await slotOf("apricot-sapling"));
await farm((g, f) => f.use());
items = await house();
if (items.trees.length !== 1) finding("fruit tree did not plant indoors");
await shot("sprinkler-tree");

// The sprinkler waters at dawn, so it feeds the crop for the night after.
await night();
await night();
const watered = await farm((g, f, s) => {
  const p = [...s.greenhouse.each()][0]?.plot;
  return { daysGrown: p?.crop?.daysGrown, wet: p?.wateredToday };
});
log("after a second night:", JSON.stringify(watered));
if (watered.daysGrown !== 2 || !watered.wet)
  finding(`sprinkler did not water overnight: ${JSON.stringify(watered)}`);

// The tree grows indoors in winter, and bears a fruit a night once mature.
await farm((g, f, s) => {
  [...s.greenhouseFruitTrees.each()][0].age = 28;
});
await night();
const tree = await farm((g, f, s) => [...s.greenhouseFruitTrees.each()][0]);
log("tree after a night at 28 days:", JSON.stringify(tree));
if (tree.fruit !== 1)
  finding(`tree bore no fruit in winter: ${JSON.stringify(tree)}`);
await stand(2, 8, "right");
const picked = await farm((g, f, s) => {
  f.action();
  return s.inventory.count("apricot");
});
log("apricots picked:", picked);
if (picked !== 1) finding("could not pick the indoor fruit");
await shot("tree-fruit");

// Move the greenhouse at the carpenter: through the real carpenter and placement scenes.
log(
  "scenes before carpenter:",
  JSON.stringify(
    await farm((g) => g.scene.getScenes(true).map((x) => x.scene.key)),
  ),
);
await farm((g, f) => f.scene.launch("carpenter"));
await sleepMs(500);
await farm((g) => g.scene.getScene("carpenter").place("greenhouse", "move"));
await sleepMs(500);
const row = await farm((g, f) => f.scene.isActive("placement"));
if (!row) finding("placement screen did not open for the greenhouse");
await sleepMs(500);
await farm((g) => {
  const pl = g.scene.getScene("placement");
  // Try spots until one is free, as the player would: the farm has clutter on day 1.
  pl.free = false;
  for (let y = 8; y < 24 && !pl.free; y++)
    for (let x = 18; x < 34 && !pl.free; x++) pl.moveTo(x, y);
  pl.confirm();
});
await sleepMs(500);
const moved = await farm((g, f, s) => ({
  site: s.greenhouseSite,
  plot: [...s.greenhouse.each()].length,
  sprinklers: s.greenhouseSprinklers.count,
  trees: s.greenhouseFruitTrees.count,
}));
log("after the move:", JSON.stringify(moved));
if (!moved.site) finding("greenhouse did not move");
if (moved.plot < 1 || moved.sprinklers !== 1 || moved.trees !== 1)
  finding(`contents lost in the move: ${JSON.stringify(moved)}`);
await farm((g) => g.scene.getScene("carpenter").close());

// Walk out of the door: the farm map puts us at the new door.
await stand(9, 16, "down");
await farm((g, f) => f.action());
await sleepMs(1200);
const out = await farm((g, f, s) => ({
  map: f.mapId,
  tile: { x: Math.floor(f.pos.x / 16), y: Math.floor(f.pos.y / 16) },
  oldSiteBlocked: f.map.isBlocked(25, 11),
  newSiteBlocked: f.map.isBlocked(
    s.greenhouseSite.x + 1,
    s.greenhouseSite.y + 1,
  ),
  site: s.greenhouseSite,
}));
log("outside:", JSON.stringify(out));
if (out.map !== "farm") finding(`did not leave to the farm: ${out.map}`);
if (out.tile.x !== out.site.x + 2 || out.tile.y !== out.site.y + 4)
  finding(`arrived away from the new door: ${JSON.stringify(out.tile)}`);
if (out.oldSiteBlocked || !out.newSiteBlocked)
  finding("farm walls did not move with the greenhouse");
await sleepMs(300);
await bot.key("Escape", 300);
await farm((g, f) => {
  f.cameras.main.stopFollow();
  f.cameras.main.centerOn(20 * 16, 8 * 16);
});
await sleepMs(300);
await shot("moved");
for (const e of errs) finding(`console: ${e}`);
log(findings.length ? `FINDINGS:\n${findings.join("\n")}` : "no findings");
await b.close();
