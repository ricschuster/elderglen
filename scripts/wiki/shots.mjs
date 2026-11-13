// Wiki pictures, part two (note 100): whole-map views of the places, one sprite per person and
// the growth stages of each crop, written under docs/wiki/img/{places,people,crops}/.
// Needs `npm run dev` (set BASE_URL if it is not on port 5173). Run by hand when the art or the
// maps change, then `npm run wiki` and commit the PNGs. Not a gate. `npm run wiki:images` does
// the item pictures.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { launch, log, sleepMs } from "../playtest/lib.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (p) => JSON.parse(fs.readFileSync(`${root}${p}`, "utf8"));
const out = `${root}docs/wiki/img`;
for (const d of ["places", "people", "crops", "rooms"]) {
  fs.rmSync(`${out}/${d}`, { recursive: true, force: true });
  fs.mkdirSync(`${out}/${d}`, { recursive: true });
}
const places = Object.keys(read("docs/wiki-text/places.json"));
const people = read("src/content/villagers.json").villagers.map((v) => v.id);
const crops = read("src/content/crops.json").map((c) => c.id);

const entryOf = (map) => {
  const m = read(`src/content/maps/${map}.json`);
  for (const l of m.layers)
    for (const o of l.objects ?? [])
      if (o.class === "entry")
        return { entry: o.name, w: m.width, h: m.height };
};

const { b, p } = await launch({
  fresh: true,
  context: { viewport: { width: 1000, height: 800 } },
});
for (let i = 0; i < 40; i++) {
  const ok = await p.evaluate(() =>
    window.__game?.scene.getScenes(true).some((s) => s.scene.key === "farm"),
  );
  if (ok) break;
  await p.keyboard.press("Enter");
  await sleepMs(300);
}

// People and crops: read the painted textures straight out of the game.
const sprites = await p.evaluate(
  async ({ people, crops }) => {
    const { villagerKey } = await import("/src/scenes/art-people.ts");
    const { cropKey, CROP_STAGES } = await import("/src/scenes/art.ts");
    const tm = window.__game.textures;
    const png = (imgs) => {
      const c = document.createElement("canvas");
      c.width = 16 * imgs.length;
      c.height = 16;
      const g = c.getContext("2d");
      imgs.forEach((im, i) => g.drawImage(im, 16 * i, 0));
      return c.toDataURL("image/png");
    };
    const src = (k) => (tm.exists(k) ? tm.get(k).getSourceImage() : null);
    const result = { people: {}, crops: {} };
    for (const id of people) {
      const im = src(villagerKey(id));
      if (im) result.people[id] = png([im]);
    }
    for (const id of crops) {
      const ims = [];
      for (let s = 0; s < CROP_STAGES; s++) ims.push(src(cropKey(id, s)));
      if (ims.every(Boolean)) result.crops[id] = png(ims);
    }
    return result;
  },
  { people, crops },
);
const save = (path, url) =>
  fs.writeFileSync(path, Buffer.from(url.split(",")[1], "base64"));
for (const [id, u] of Object.entries(sprites.people))
  save(`${out}/people/${id}.png`, u);
for (const [id, u] of Object.entries(sprites.crops))
  save(`${out}/crops/${id}.png`, u);
log(
  `sprites: ${Object.keys(sprites.people).length} people, ${Object.keys(sprites.crops).length} crops`,
);

// Places: the whole map at the game's own pixel size, with the HUD and the player hidden.
for (const id of places) {
  const at = entryOf(id);
  if (!at) {
    log(`${id}: no entry, skipped`);
    continue;
  }
  const W = at.w * 16;
  const H = at.h * 16;
  await p.setViewportSize({ width: W, height: H });
  await sleepMs(300);
  await p.evaluate(
    async ({ id, entry }) => {
      const g = window.__game;
      g.scene.getScene("farm").scene.restart({ map: id, entry });
      await new Promise((r) => setTimeout(r, 1500));
      const f = g.scene.getScene("farm");
      f.uiCamera.setVisible(false);
      f.player.setVisible(false);
      // Hide the map labels, the zone tints and the tile cursor: only the ground and objects stay.
      for (const o of f.children.list)
        if (
          o.type === "Text" ||
          o.type === "Rectangle" ||
          o.type === "Graphics"
        )
          o.setVisible(false);
      const cam = f.cameras.main;
      cam.stopFollow();
      cam.removeBounds?.();
      cam.setZoom(1);
      cam.centerOn((cam.width / 2) | 0, (cam.height / 2) | 0);
    },
    { id, entry: at.entry },
  );
  await sleepMs(600);
  await p.screenshot({ path: `${out}/places/${id}.png` });
  log(`${id}: ${W}x${H}`);
}
// Hall rooms: the whole hall, then a close-up of each room's counter (its service point).
{
  const m = read("src/content/maps/hall.json");
  const W = m.width * 16;
  const H = m.height * 16;
  const entry = entryOf("hall").entry;
  await p.setViewportSize({ width: W, height: H });
  await sleepMs(300);
  await p.evaluate(
    async ({ entry }) => {
      const g = window.__game;
      g.scene.getScene("farm").scene.restart({ map: "hall", entry });
      await new Promise((r) => setTimeout(r, 1500));
      const f = g.scene.getScene("farm");
      f.uiCamera.setVisible(false);
      f.player.setVisible(false);
      for (const o of f.children.list)
        if (
          o.type === "Text" ||
          o.type === "Rectangle" ||
          o.type === "Graphics"
        )
          o.setVisible(false);
      const cam = f.cameras.main;
      cam.stopFollow();
      cam.removeBounds?.();
      cam.setZoom(1);
      cam.centerOn((cam.width / 2) | 0, (cam.height / 2) | 0);
    },
    { entry },
  );
  await sleepMs(600);
  await p.screenshot({ path: `${out}/rooms/hall.png` });
  const rooms = read("src/content/rooms.json").map((r) => r.id);
  const CW = 192;
  const CH = 128;
  for (const o of m.layers.flatMap((l) => l.objects ?? [])) {
    if (o.class !== "service" || !rooms.includes(o.name)) continue;
    const x = Math.max(0, Math.min(W - CW, Math.round(o.x - CW / 2)));
    const y = Math.max(0, Math.min(H - CH, Math.round(o.y - CH / 2)));
    await p.screenshot({
      path: `${out}/rooms/${o.name}.png`,
      clip: { x, y, width: CW, height: CH },
    });
    log(`room ${o.name}`);
  }
}
await b.close();
