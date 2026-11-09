// Writes the Hearthwell river layout (Tiled JSON), build issue #661, the
// layout pass before the shell (#645) of docs/design/77_hearthwell.md: the 120
// by 110 terrain with the two river arms, the three bridges, the streets and
// the reserved lots. No building, door, exit or farm change: the lots are
// `region` rectangles and the doors are entries, for #645 to fill.
// Run once: node scripts/gen-hearthwell-map.mjs && npx prettier --write src/content/maps/hearthwell.json
// The file it writes is the source from then on: edit it by hand or in Tiled.
// This script only authored the first draft, with a fixed seed.
import { writeFileSync } from "node:fs";

const W = 120;
const H = 110;
const T = 16;

// Placeholder tileset ids: 1 grass, 2 flowers, 3 path, 4 water.
const GRASS = 1;
const FLOWERS = 2;
const PATH = 3;
const WATER = 4;

let seed = 7701;
const rnd = () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const idx = (x, y) => y * W + x;
const ground = new Array(W * H).fill(GRASS);
const collision = new Array(W * H).fill(0);
const paths = new Array(W * H).fill(0);
for (let i = 0; i < ground.length; i++) if (rnd() < 0.06) ground[i] = FLOWERS;
const rect = (x0, y0, x1, y1, f) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(x, y);
};

// ---- the river. Main arm: x 56 to 62 (7 wide), straight to y 94, one bend east
// (a quarter circle, centre (68.5, 94.5), radius 9, half width 3.5), then a
// horizontal reach at y 100 to 106. East arm: x 109 to 113, y 0 to 99. They
// join at y 100 to 106 and leave by the south edge at x 104 to 113.
const isWater = (x, y) => {
  const cx = x + 0.5;
  const cy = y + 0.5;
  if (cy < 94.5 && Math.abs(cx - 59.5) < 3.5) return true;
  if (cx < 68.5 && cy >= 94.5) {
    const r = Math.hypot(cx - 68.5, cy - 94.5);
    if (r > 5.5 && r < 12.5) return true;
  }
  if (cx >= 68.5 && x <= 113 && y >= 100 && y <= 106) return true;
  if (x >= 109 && x <= 113 && y <= 99) return true;
  if (x >= 104 && x <= 113 && y >= 107) return true;
  return false;
};
rect(0, 0, W - 1, H - 1, (x, y) => {
  if (!isWater(x, y)) return;
  ground[idx(x, y)] = WATER;
  collision[idx(x, y)] = 1;
});

// ---- streets, avenues and bridges (on the `paths` layer, so no seeds spread).
const road = (x0, y0, x1, y1) =>
  rect(x0, y0, x1, y1, (x, y) => {
    ground[idx(x, y)] = PATH;
    collision[idx(x, y)] = 0;
    paths[idx(x, y)] = PATH;
  });
road(0, 29, 89, 31); // north street, west bank, bridge and the island road
road(0, 60, 108, 64); // middle street, the cart road, to the broken bridge
road(0, 90, 70, 92); // south street, bridge and a stub into the green
road(30, 29, 32, 108); // the west bank avenue
road(50, 0, 52, 28); // the river road to the Mountain
road(87, 13, 89, 76); // the island avenue, Outpost to green
road(31, 76, 55, 77); // the sawmill lane
road(30, 107, 76, 108); // the south road to the delta exit
road(0, 58, 4, 59); // the farm road
road(64, 85, 70, 85); // the retired couple's footpath

// ---- reserved lots (footprints), with the door on the bottom row and the
// entry one tile below it. Interiors and buildings are #645 and #646.
const LOTS = [
  // id, x, y, w, h, door x
  ["general-store", 17, 21, 10, 8, 22],
  ["healer", 36, 21, 10, 8, 41],
  ["inn", 15, 50, 14, 10, 22],
  ["library", 36, 52, 10, 8, 41],
  ["burrow-young", 5, 55, 6, 5, 8],
  ["sawmill", 37, 66, 14, 10, 48],
  ["smithy", 17, 82, 10, 8, 22],
  ["hatter", 36, 82, 10, 8, 41],
  ["burrow-gardener", 66, 24, 6, 5, 68],
  ["outpost", 82, 5, 12, 8, 88],
  ["hall", 92, 50, 14, 10, 99],
  ["burrow-retired", 64, 80, 6, 5, 66],
];

// ---- markers.
let nextId = 1;
const props = (o) =>
  Object.entries(o).map(([name, value]) => ({
    name,
    type: typeof value === "number" ? "int" : "string",
    value,
  }));
const mk = (name, cls, x, y, extra = {}, r) => ({
  id: nextId++,
  name,
  class: cls,
  type: cls,
  x: r ? x * T : x * T + 8,
  y: r ? y * T : y * T + 8,
  width: r ? r.w * T : 0,
  height: r ? r.h * T : 0,
  rotation: 0,
  visible: true,
  ...(r ? {} : { point: true }),
  ...(Object.keys(extra).length ? { properties: props(extra) } : {}),
});
const markers = [];
const entry = (name, x, y) => markers.push(mk(name, "entry", x, y));
const region = (name, x, y, w, h) =>
  markers.push(mk(name, "region", x, y, {}, { w, h }));

entry("from_farm", 3, 61);
entry("from_mountain", 51, 3);
entry("from_delta", 73, 108);
for (const [id, x, y, w, h, doorX] of LOTS) {
  region(`lot-${id}`, x, y, w, h);
  entry(`from_${id}`, doorX, y + h);
}
// Reserved edge exits (authored as exits by #645) and landmarks.
region("exit-farm", 0, 58, 1, 7);
region("exit-mountain", 48, 0, 7, 1);
region("exit-delta", 70, 109, 7, 1);
region("exit-ring2", 119, 58, 1, 8);
region("bridge-north", 56, 29, 7, 3);
region("bridge-middle", 56, 60, 7, 5);
region("bridge-south", 56, 90, 7, 3);
region("broken-bridge", 109, 60, 5, 5);
region("town-square", 64, 54, 17, 17);
region("cart-stop", 66, 58, 1, 1);
region("festival-green", 70, 77, 36, 22);
region("bandstand", 86, 81, 5, 3);
region("outpost-yard", 80, 14, 17, 6);
region("sawmill-yard", 51, 66, 5, 10);
region("mill-wheel", 56, 67, 3, 3);

// ---- bridges: path over the water, walkable. (Drawn by the roads above for
// the rows, which clears the collision on the water tiles they cover.)

const layer = (id, name, data, visible = true) => ({
  id,
  name,
  type: "tilelayer",
  width: W,
  height: H,
  x: 0,
  y: 0,
  opacity: 1,
  visible,
  data,
});
const map = {
  type: "map",
  version: "1.10",
  tiledversion: "1.10.2",
  orientation: "orthogonal",
  renderorder: "right-down",
  infinite: false,
  tilewidth: T,
  tileheight: T,
  tilesets: [
    {
      firstgid: 1,
      name: "placeholder",
      tilewidth: T,
      tileheight: T,
      tilecount: 12,
      columns: 10,
      image: "placeholder-tiles.png",
      imagewidth: 192,
      imageheight: 16,
    },
  ],
  width: W,
  height: H,
  nextlayerid: 6,
  nextobjectid: nextId,
  properties: [
    { name: "placeholder", type: "bool", value: true },
    { name: "rideable", type: "bool", value: true },
    { name: "waterKind", type: "string", value: "river" },
  ],
  layers: [
    layer(1, "ground", ground),
    layer(2, "objects", new Array(W * H).fill(0)),
    layer(3, "collision", collision, false),
    {
      id: 4,
      name: "markers",
      type: "objectgroup",
      draworder: "topdown",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects: markers,
    },
    layer(5, "paths", paths, false),
  ],
};
writeFileSync(
  new URL("../src/content/maps/hearthwell.json", import.meta.url),
  JSON.stringify(map) + "\n",
);
