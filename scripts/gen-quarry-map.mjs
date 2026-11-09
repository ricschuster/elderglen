// Writes the Quarry map (Tiled JSON), build slices 1 and 4 of
// docs/design/78_quarry.md: the rubble field, three clear work pads, the cliff
// border, the Mountain exit and entry, the starting stone and ore, and the
// stonekeeper's camp (a hut, a fire and the dwarf's post).
// Run once: node scripts/gen-quarry-map.mjs
// The file it writes, src/content/maps/quarry.json, is the source from then
// on: edit that by hand or in Tiled. This script only authored the first
// draft, with a fixed seed so a re-run gives the same file.
import { writeFileSync } from "node:fs";

const W = 60;
const H = 44;
const T = 16;

// Placeholder tileset ids: 3 path, 5 pale earth, 7 wall (cliff), 8 roof,
// 9 door, 11 sign (the dwarf), 12 stone stack (the fire).
const PATH = 3;
const EARTH = 5;
const CLIFF = 7;
const ROOF = 8;
const DOOR = 9;
const DWARF = 11;
const FIRE = 12;

let seed = 7801;
const rnd = () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const idx = (x, y) => y * W + x;
const ground = new Array(W * H).fill(EARTH);
const objects = new Array(W * H).fill(0);
const collision = new Array(W * H).fill(0);
const paths = new Array(W * H).fill(0);
const rect = (x0, y0, x1, y1, f) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(x, y);
};
const solid = (x, y, tile) => {
  objects[idx(x, y)] = tile;
  collision[idx(x, y)] = 1;
};
const path = (x0, y0, x1, y1) =>
  rect(x0, y0, x1, y1, (x, y) => {
    ground[idx(x, y)] = PATH;
    paths[idx(x, y)] = 1;
  });

// The cliff border, two tiles thick, with the Mountain exit gap on the west.
const EXIT = { x: 0, y: 20, w: 1, h: 5 };
rect(0, 0, W - 1, H - 1, (x, y) => {
  if (x >= 2 && y >= 2 && x < W - 2 && y < H - 2) return;
  if (x === 0 && y >= EXIT.y && y < EXIT.y + EXIT.h) return;
  if (x === 1 && y >= EXIT.y && y < EXIT.y + EXIT.h) return;
  solid(x, y, CLIFF);
});

// The way in: a path from the exit to the camp.
path(0, 20, 4, 24);
path(4, 22, 11, 22);
path(11, 22, 11, 29);

// The stonekeeper's camp: a hut (no interior), a fire and the dwarf's post.
const CAMP = { x0: 7, y0: 29, x1: 15, y1: 37 };
rect(CAMP.x0, CAMP.y0, CAMP.x1, CAMP.y1, (x, y) => {
  ground[idx(x, y)] = PATH;
  paths[idx(x, y)] = 1;
});
rect(8, 30, 12, 33, (x, y) => solid(x, y, y <= 31 ? ROOF : CLIFF));
objects[idx(10, 33)] = DOOR;
collision[idx(10, 33)] = 1;
solid(14, 35, FIRE);
solid(11, 35, DWARF);

// Clear work pads (note 78), flat ground for machines and chests.
const PADS = [
  { id: "pad-a", x: 6, y: 5, w: 8, h: 6 },
  { id: "pad-b", x: 28, y: 12, w: 8, h: 6 },
  { id: "pad-c", x: 46, y: 26, w: 8, h: 6 },
];
const inPad = (x, y) =>
  PADS.some((p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h);

// ---- objects.
let nextId = 1;
const props = (o) =>
  Object.entries(o).map(([name, value]) => ({
    name,
    type: typeof value === "number" ? "int" : "string",
    value,
  }));
const mk = (name, cls, x, y, extra = {}, rectangle) => ({
  id: nextId++,
  name,
  class: cls,
  type: cls,
  x: rectangle ? x * T : x * T + 8,
  y: rectangle ? y * T : y * T + 8,
  width: rectangle ? rectangle.w * T : 0,
  height: rectangle ? rectangle.h * T : 0,
  rotation: 0,
  visible: true,
  ...(rectangle ? {} : { point: true }),
  ...(Object.keys(extra).length ? { properties: props(extra) } : {}),
});
const markers = [];
const add = (...a) => markers.push(mk(...a));

add("from_mountain", "entry", 3, 22);
add(
  "to_mountain",
  "exit",
  EXIT.x,
  EXIT.y,
  {
    map: "mountain",
    entry: "from_quarry",
  },
  EXIT,
);
for (const p of PADS) add(p.id, "region", p.x, p.y, { pad: "true" }, p);
add("stonekeeper", "service", 11, 35, { kind: "stonekeeper" });

// Starting stone and ore: 60 rocks, 8 copper, 4 coal and 2 iron on free tiles.
const taken = new Set();
const free = (x, y) =>
  x >= 2 &&
  y >= 2 &&
  x < W - 2 &&
  y < H - 2 &&
  !collision[idx(x, y)] &&
  !paths[idx(x, y)] &&
  !inPad(x, y) &&
  !taken.has(idx(x, y));
const scatter = (kind, count) => {
  for (let n = 0; n < count;) {
    const x = 2 + Math.floor(rnd() * (W - 4));
    const y = 2 + Math.floor(rnd() * (H - 4));
    if (!free(x, y)) continue;
    taken.add(idx(x, y));
    add(`${kind}-${n + 1}`, "rock", x, y, kind === "stone" ? {} : { kind });
    n++;
  }
};
scatter("stone", 60);
scatter("copper", 8);
scatter("coal", 4);
scatter("iron", 2);

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
const quarry = {
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
    { name: "wild", type: "bool", value: true },
  ],
  layers: [
    layer(1, "ground", ground),
    layer(2, "objects", objects),
    layer(3, "collision", collision, false),
    layer(4, "paths", paths, false),
    {
      id: 5,
      name: "markers",
      type: "objectgroup",
      draworder: "topdown",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects: markers,
    },
  ],
};
writeFileSync(
  new URL("../src/content/maps/quarry.json", import.meta.url),
  JSON.stringify(quarry) + "\n",
);
