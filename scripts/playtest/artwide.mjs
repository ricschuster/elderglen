// Wide art shots: each place at the game's own zoom in a large window, to judge
// how a whole screen reads. Needs `npm run dev`. Output: playtest-out/shots/wide-*.png.
// PLACES=farm,house picks some; ZOOM=3 forces a camera zoom; AT=x,y moves the player.
import { launch, log, sleepMs, OUT } from "./lib.mjs";

const W = Number(process.env.W ?? 1280);
const H = Number(process.env.H ?? 720);
const { b, p, errs } = await launch({
  fresh: true,
  context: { viewport: { width: W, height: H } },
});
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
for (let i = 0; i < 40; i++) {
  const ok = await p.evaluate(() =>
    window.__game?.scene.getScenes(true).some((s) => s.scene.key === "farm"),
  );
  if (ok) break;
  await p.keyboard.press("Enter");
  await sleepMs(300);
}
const PLACES = {
  farm: { map: "farm" },
  house: { map: "house", entry: "door" },
  forest: { map: "forest", entry: "from_farm" },
  hearthwell: { map: "hearthwell", entry: "from_farm" },
  mountain: { map: "mountain", entry: "from_hearthwell" },
  delta: { map: "delta", entry: "from_farm" },
  cove: { map: "cove", entry: "from_ferry" },
  hall: { map: "hall", entry: "door" },
  store: { map: "general-store", entry: "door" },
  coop: { map: "coop", entry: "door" },
};
const want = (process.env.PLACES ?? Object.keys(PLACES).join(",")).split(",");
for (const name of want) {
  const data = PLACES[name] ?? { map: name, entry: process.env.ENTRY };
  await farm((g, f, s) => {
    s.day.clock.minutes = 12 * 60;
  });
  await farm((g, f, s, a) => f.scene.restart(a), data);
  await sleepMs(1200);
  if (process.env.AT) {
    const [x, y] = process.env.AT.split(",").map(Number);
    await farm(
      (g, f, s, a) => {
        f.pos.x = (a.x + 0.5) * 16;
        f.pos.y = (a.y + 1) * 16 - 2;
      },
      { x, y },
    );
    await sleepMs(300);
  }
  if (process.env.ZOOM)
    await farm(
      (g, f, s, z) => f.cameras.main.setZoom(z),
      Number(process.env.ZOOM),
    );
  await sleepMs(300);
  await p.screenshot({ path: `${OUT}/shots/wide-${name}.png` });
  log(`${name}: shot`);
}
if (errs.length) log(`console errors:\n  ${errs.join("\n  ")}`);
await b.close();
