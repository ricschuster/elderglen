// DRAFT ONLY, DO NOT RUN (ADR 0014). This script overwrites a committed map that has
// since been edited by hand, so running it would drop working features. The committed
// JSON in src/content/maps/ is the source. Kept as a record of the first draft.
//
// Writes a large Tiled-format map (JSON) for the performance spike.
// Run: node scripts/drafts/gen-spike-map.mjs
import { writeFileSync } from "node:fs";

const W = 128;
const H = 128;
const T = 16;

// Deterministic pseudo-random so the file does not churn between runs.
let seed = 12345;
const rnd = () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

// Tileset ids (1-based in Tiled): 1 grass, 2 grass2, 3 dirt, 4 water, 5 tree, 6 flower, 7 stone
const ground = [];
const decor = [];
const objects = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const lake = Math.hypot(x - 90, y - 40) < 14;
    ground.push(lake ? 4 : rnd() < 0.15 ? 3 : rnd() < 0.5 ? 1 : 2);
    decor.push(lake ? 0 : rnd() < 0.08 ? 6 : 0);
    const edge = x < 2 || y < 2 || x >= W - 2 || y >= H - 2;
    objects.push(!lake && (edge || rnd() < 0.06) ? (rnd() < 0.8 ? 5 : 7) : 0);
  }
}

const layer = (id, name, data) => ({
  id,
  name,
  type: "tilelayer",
  width: W,
  height: H,
  x: 0,
  y: 0,
  opacity: 1,
  visible: true,
  data,
});

const map = {
  type: "map",
  version: "1.10",
  tiledversion: "1.10.2",
  orientation: "orthogonal",
  renderorder: "right-down",
  infinite: false,
  width: W,
  height: H,
  tilewidth: T,
  tileheight: T,
  nextlayerid: 4,
  nextobjectid: 1,
  layers: [
    layer(1, "ground", ground),
    layer(2, "decor", decor),
    layer(3, "objects", objects),
  ],
  tilesets: [
    {
      firstgid: 1,
      name: "spike",
      tilewidth: T,
      tileheight: T,
      tilecount: 7,
      columns: 7,
      image: "spike-tiles.png",
      imagewidth: 7 * T,
      imageheight: T,
    },
  ],
};

writeFileSync("public/spike/spike-map.json", JSON.stringify(map));
console.log(`wrote public/spike/spike-map.json (${W}x${H} tiles, 3 layers)`);
