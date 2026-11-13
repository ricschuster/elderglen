// Wide art shots: each place at the game's own zoom in a large window, to judge
// how a whole screen reads. Needs `npm run dev`. Output: playtest-out/shots/wide-*.png.
// PLACES=farm,house picks some; ZOOM=3 forces a camera zoom; AT=x,y moves the player.
// SPOTS=inn:22,62;store:22,31 shoots several tiles of each place (wide-<place>-<spot>.png).
// BUILT=1 stands every farm building up (BUILT=site shows them as building sites);
// SEASON=winter picks the season; FESTIVAL=<day index> sets the day.
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
  await farm(
    (g, f, s, a) => {
      s.day.clock.minutes = 12 * 60;
      if (a.day !== undefined) s.day.clock.day = a.day;
      if (a.season)
        s.day.clock.day =
          ["spring", "summer", "fall", "winter"].indexOf(a.season) * 28;
      const an = s.animals;
      if (a.built === "1") {
        an.coopBuilt = an.barnBuilt = an.stableBuilt = an.silo = true;
        s.furnace.gifted = true;
      } else if (a.built === "site") {
        an.build = { building: "coop", daysLeft: 2 };
        an.siloDays = 2;
        s.houseBuild = { tier: 1, daysLeft: 2 };
      }
    },
    {
      built: process.env.BUILT,
      season: process.env.SEASON,
      day: process.env.FESTIVAL ? Number(process.env.FESTIVAL) : undefined,
    },
  );
  await farm((g, f, s, a) => f.scene.restart(a), data);
  await sleepMs(1200);
  const spots = process.env.SPOTS
    ? process.env.SPOTS.split(";").map((t) => {
        const [tag, at] = t.split(":");
        const [x, y] = at.split(",").map(Number);
        return { tag: `-${tag}`, x, y };
      })
    : process.env.AT
      ? [
          {
            tag: "",
            x: Number(process.env.AT.split(",")[0]),
            y: Number(process.env.AT.split(",")[1]),
          },
        ]
      : [{ tag: "" }];
  for (const spot of spots) {
    if (spot.x !== undefined) {
      await farm((g, f, s, a) => {
        f.pos.x = (a.x + 0.5) * 16;
        f.pos.y = (a.y + 1) * 16 - 2;
      }, spot);
      await sleepMs(300);
    }
    if (process.env.ZOOM)
      await farm(
        (g, f, s, z) => f.cameras.main.setZoom(z),
        Number(process.env.ZOOM),
      );
    await sleepMs(300);
    await p.screenshot({ path: `${OUT}/shots/wide-${name}${spot.tag}.png` });
    log(`${name}${spot.tag}: shot`);
  }
}
if (errs.length) log(`console errors:\n  ${errs.join("\n  ")}`);
await b.close();
