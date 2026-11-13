// Wiki pictures (note 100): writes one PNG per item that has a painted icon in the game, to
// docs/wiki/img/<id>.png (shown at 64 px, pixel perfect). Items with no icon get a labelled box
// on the page. Needs `npm run dev` (set BASE_URL if it is not on port 5173). Run it by hand
// when the art changes, then `npm run wiki` and commit the PNGs. Not a gate.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { launch, log } from "../playtest/lib.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const ids = JSON.parse(
  fs.readFileSync(`${root}src/content/item-table.json`, "utf8"),
).map((i) => i.id);
const out = `${root}docs/wiki/img`;
fs.mkdirSync(out, { recursive: true });

const { b, p } = await launch({ fresh: true });
for (let i = 0; i < 40; i++) {
  const ok = await p.evaluate(() =>
    window.__game?.scene.getScenes(true).some((s) => s.scene.key === "farm"),
  );
  if (ok) break;
  await p.keyboard.press("Enter");
  await p.waitForTimeout(300);
}
const shots = await p.evaluate(async (ids) => {
  const { iconKey } = await import("/src/scenes/art.ts");
  const tm = window.__game.textures;
  const result = {};
  for (const id of ids) {
    const key = iconKey(id);
    if (!key || !tm.exists(key)) continue;
    const img = tm.get(key).getSourceImage();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d").drawImage(img, 0, 0);
    result[id] = c.toDataURL("image/png");
  }
  return result;
}, ids);
for (const f of fs.readdirSync(out)) fs.rmSync(`${out}/${f}`);
for (const [id, url] of Object.entries(shots))
  fs.writeFileSync(
    `${out}/${id}.png`,
    Buffer.from(url.split(",")[1], "base64"),
  );
log(
  `wiki images: ${Object.keys(shots).length} of ${ids.length} items have a picture`,
);
await b.close();
