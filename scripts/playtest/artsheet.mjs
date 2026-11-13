// Art sweep: one sprite sheet of every texture the game paints in code, then
// screenshots of a few places where people, animals and creatures stand. For
// looking at the placeholder art, not a test. Needs `npm run dev`. Output goes
// to playtest-out/shots/art-*.png.
import fs from "node:fs";
import { launch, log, sleepMs, OUT } from "./lib.mjs";

const { b, p, errs } = await launch({ fresh: true });
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
const shot = (name) => p.screenshot({ path: `${OUT}/shots/art-${name}.png` });

// Wait for the farm scene (a fresh game may show the name or farm choice first).
for (let i = 0; i < 40; i++) {
  const ok = await p.evaluate(() =>
    window.__game?.scene.getScenes(true).some((s) => s.scene.key === "farm"),
  );
  if (ok) break;
  await p.keyboard.press("Enter");
  await sleepMs(300);
}

// 1. The sprite sheets: every painted canvas texture (text labels left out),
// drawn on a grid with its key above it. One sheet of everything, then one
// close up of the figures: people, animals, the horse and creatures.
async function sheetOf(name, pattern, Z, COLS) {
  const r = await p.evaluate(
    ([src, Z, COLS]) => {
      const re = new RegExp(src);
      const tm = window.__game.textures;
      const keys = tm
        .getTextureKeys()
        .filter(
          (k) =>
            tm.get(k).source[0]?.isCanvas &&
            re.test(k) &&
            !/^[0-9a-f]{8}-/.test(k),
        )
        .sort();
      const imgs = keys.map((k) => tm.get(k).getSourceImage());
      const cellW =
        Math.max(...imgs.map((i) => Math.min(i.width * Z, 192))) + 8;
      const cellH =
        Math.max(...imgs.map((i) => Math.min(i.height * Z, 96))) + 20;
      const out = document.createElement("canvas");
      out.width = COLS * cellW;
      out.height = Math.ceil(keys.length / COLS) * cellH;
      const c = out.getContext("2d");
      c.imageSmoothingEnabled = false;
      c.fillStyle = "#4a6a3a";
      c.fillRect(0, 0, out.width, out.height);
      c.font = "10px sans-serif";
      keys.forEach((k, i) => {
        const img = imgs[i];
        const x = (i % COLS) * cellW;
        const y = Math.floor(i / COLS) * cellH;
        const s = Math.min(Z, 192 / img.width, 96 / img.height);
        c.fillStyle = "#ffffff";
        c.fillText(k.slice(0, 26), x + 2, y + 11);
        c.drawImage(img, x + 2, y + 15, img.width * s, img.height * s);
      });
      return { url: out.toDataURL("image/png"), count: keys.length };
    },
    [pattern, Z, COLS],
  );
  fs.writeFileSync(
    `${OUT}/shots/art-${name}.png`,
    Buffer.from(r.url.split(",")[1], "base64"),
  );
  log(`${name}: ${r.count} textures`);
}
await sheetOf("sheet", ".", 3, 16);
await sheetOf("figures", "^(villager|player|animal|steed|creature|hat)", 6, 8);
await sheetOf(
  "world",
  "^(tree|fruit-tree|rock|stump|crop|forage|chest|light)",
  4,
  14,
);

// SHEETS_ONLY=1 stops here, for quick looks while painting.
if (process.env.SHEETS_ONLY) {
  await b.close();
  process.exit(0);
}

// 2. Places. Zoom the world camera in so the 16 px sprites can be judged.
async function place(name, data, setup) {
  if (setup) await farm(setup);
  await farm((g, f, s, a) => f.scene.restart(a), data);
  await sleepMs(1200);
  await farm((g, f) =>
    f.cameras.main.setZoom(Math.max(4, f.cameras.main.zoom)),
  );
  await sleepMs(200);
  await shot(name);
  log(`${name}: shot`);
}

await place("farm", { map: "farm" });
await place("forest", { map: "forest" });
await place("hearthwell", { map: "hearthwell" }, (g, f, s) => {
  s.day.clock.minutes = 12 * 60;
});
await place("mine-5", { map: "mine-5" });
await place("mine-45", { map: "mine-45" });
const animals = (kinds) => (g, f, s) => {
  s.animals.coopBuilt = s.animals.barnBuilt = true;
  s.animals.tier = s.animals.barnTier = 3;
  s.animals.animals = [];
  for (const [i, species] of kinds.entries())
    s.animals.animals.push({
      id: 100 + i,
      species,
      name: species,
      age: i === 0 ? 0 : 30,
      friendship: 0,
      mood: 100,
      fed: true,
      petted: true,
      outside: false,
      fresh: false,
      grazed: false,
      lay: 0,
      product: i % 2 ? 0 : undefined,
    });
};
await place(
  "coop",
  { map: "coop" },
  animals(["chicken", "chicken", "duck", "rabbit", "chicken"]),
);
await place(
  "barn",
  { map: "barn" },
  animals(["cow", "cow", "goat", "sheep", "pig"]),
);
await place("horse", { map: "farm" }, (g, f, s) => {
  s.animals.mounted = true;
});

if (errs.length) log(`console errors:\n  ${errs.join("\n  ")}`);
await b.close();
