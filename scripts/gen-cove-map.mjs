// Writes the Lake cove map (Tiled JSON) and patches the delta with the ferry,
// build slices 1, 2 and 4 of docs/design/76_lake_cove.md: the 50 by 40 cove with
// its dock, lake, shore path, lanterns, bench, treasure ledge and forage spots;
// on the delta, the dock, the gated ferry exit `ferry`, the entry `from_ferry`
// and the ruined and repaired boat art.
// Run once: node scripts/gen-cove-map.mjs && npx prettier --write src/content/maps/cove.json src/content/maps/delta.json
// The files it writes are the source from then on: edit them by hand or in
// Tiled. This script only authored the first draft, with a fixed seed so a
// re-run gives the same cove. (The delta patch is idempotent.)
import { readFileSync, writeFileSync } from "node:fs";

const W = 50;
const H = 40;
const T = 16;

// Placeholder tileset ids: 1 grass, 2 flowers, 3 path, 4 water, 6 tree,
// 7 wall (cliff), 8 roof, 11 sign (the bench), 12 stone stack (lantern, ledge).
const GRASS = 1;
const FLOWERS = 2;
const PATH = 3;
const WATER = 4;
const TREE = 6;
const CLIFF = 7;
const ROOF = 8;
const SIGN = 11;
const STACK = 12;

let seed = 7601;
const rnd = () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const idx = (x, y) => y * W + x;
const ground = new Array(W * H).fill(GRASS);
const objects = new Array(W * H).fill(0);
const collision = new Array(W * H).fill(0);
for (let i = 0; i < ground.length; i++) if (rnd() < 0.08) ground[i] = FLOWERS;
const rect = (x0, y0, x1, y1, f) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(x, y);
};
const solid = (x, y, tile) => {
  objects[idx(x, y)] = tile;
  collision[idx(x, y)] = 1;
};

// The cliff border, two tiles thick.
rect(0, 0, W - 1, H - 1, (x, y) => {
  if (x >= 2 && y >= 2 && x < W - 2 && y < H - 2) return;
  solid(x, y, CLIFF);
});

// The cove water: x 14 to 44, y 10 to 34, corners cut round.
const WATER_BOX = { x0: 14, y0: 10, x1: 44, y1: 34 };
rect(WATER_BOX.x0, WATER_BOX.y0, WATER_BOX.x1, WATER_BOX.y1, (x, y) => {
  const cx = Math.min(x - WATER_BOX.x0, WATER_BOX.x1 - x);
  const cy = Math.min(y - WATER_BOX.y0, WATER_BOX.y1 - y);
  if (cx + cy < 3) return;
  ground[idx(x, y)] = WATER;
  collision[idx(x, y)] = 1;
});

// The shore path: a ring 3 tiles wide round the water.
rect(11, 7, 47, 37, (x, y) => {
  if (ground[idx(x, y)] === WATER) return;
  const inner = x >= 14 && x <= 44 && y >= 10 && y <= 34;
  const nearCorner = inner; // cut corners stay path
  if (!inner || nearCorner) ground[idx(x, y)] = PATH;
});

// The dock in the north-west: a path pad with the boat on its east edge.
const DOCK = { x: 4, y: 6, w: 5, h: 5 };
rect(DOCK.x, DOCK.y, DOCK.x + DOCK.w - 1, DOCK.y + DOCK.h - 1, (x, y) => {
  ground[idx(x, y)] = PATH;
});
// Boat art on the exit column (x 8, y 7 to 9). The ferry works like a door.
const EXIT = { x: 8, y: 7, w: 1, h: 3 };
rect(EXIT.x, EXIT.y, EXIT.x, EXIT.y + EXIT.h - 1, (x, y) => {
  objects[idx(x, y)] = ROOF;
});
rect(9, 7, 10, 9, (x, y) => {
  ground[idx(x, y)] = PATH;
});

// Scenery: six lantern posts, the bench and the treasure ledge (stone pile).
const LANTERNS = [
  [11, 12],
  [11, 32],
  [20, 37],
  [36, 37],
  [47, 12],
  [47, 32],
];
for (const [x, y] of LANTERNS) solid(x, y, STACK);
rect(24, 36, 26, 36, (x, y) => solid(x, y, SIGN));
const TREASURE = { x: 41, y: 36 };
solid(TREASURE.x, TREASURE.y, STACK);

// Cosmetic trees (tile art, never choppable) outside the ring.
let placed = 0;
while (placed < 45) {
  const x = 2 + Math.floor(rnd() * (W - 4));
  const y = 2 + Math.floor(rnd() * (H - 4));
  const onRing = x >= 11 && x <= 47 && y >= 7 && y <= 37;
  const nearDock = x >= 3 && x <= 10 && y >= 5 && y <= 11;
  if (onRing || nearDock || collision[idx(x, y)]) continue;
  solid(x, y, TREE);
  placed++;
}

// ---- objects.
let nextId = 1;
const props = (o) =>
  Object.entries(o).map(([name, value]) => ({
    name,
    type: typeof value === "number" ? "int" : "string",
    value,
  }));
const mk = (id, name, cls, x, y, extra = {}, rectangle) => ({
  id,
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
const add = (...a) => markers.push(mk(nextId++, ...a));
add("from_ferry", "entry", 9, 8);
add(
  "to_delta",
  "exit",
  EXIT.x,
  EXIT.y,
  { map: "delta", entry: "from_ferry" },
  EXIT,
);
add("treasure", "service", TREASURE.x, TREASURE.y, { kind: "cove-treasure" });

// Twelve forage spots round the shore path, on free walkable tiles.
const ringFree = (x, y) =>
  x >= 11 &&
  x <= 47 &&
  y >= 7 &&
  y <= 37 &&
  !collision[idx(x, y)] &&
  !(x >= 9 && x <= 10 && y >= 7 && y <= 9);
const taken = new Set();
for (let n = 0; n < 12;) {
  const x = 11 + Math.floor(rnd() * 37);
  const y = 7 + Math.floor(rnd() * 31);
  if (!ringFree(x, y) || taken.has(idx(x, y))) continue;
  taken.add(idx(x, y));
  add(`forage-${n + 1}`, "forage", x, y);
  n++;
}

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
const cove = {
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
  nextlayerid: 5,
  nextobjectid: nextId,
  properties: [
    { name: "placeholder", type: "bool", value: true },
    { name: "rideable", type: "bool", value: false },
    { name: "wild", type: "bool", value: true },
    { name: "waterKind", type: "string", value: "cove" },
  ],
  layers: [
    layer(1, "ground", ground),
    layer(2, "objects", objects),
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
  ],
};
writeFileSync(
  new URL("../src/content/maps/cove.json", import.meta.url),
  JSON.stringify(cove) + "\n",
);

// ---- the delta side: the dock, the ferry exit and entry, and the boat art.
{
  const url = new URL("../src/content/maps/delta.json", import.meta.url);
  const delta = JSON.parse(readFileSync(url, "utf8"));
  const DW = delta.width;
  const names = delta.layers.map((l) => l.name);
  if (!names.includes("ferry-ruined")) {
    const g = delta.layers.find((l) => l.name === "ground");
    const BOAT = { x: 25, y: 58, w: 3, h: 1 };
    // The dock: a path pad x 24 to 28, y 54 to 58, south of the marsh lake.
    for (let y = 54; y <= 58; y++)
      for (let x = 24; x <= 28; x++) g.data[y * DW + x] = PATH;
    const art = (tile) => {
      const data = new Array(DW * delta.height).fill(0);
      for (let x = BOAT.x; x < BOAT.x + BOAT.w; x++)
        data[BOAT.y * DW + x] = tile;
      return data;
    };
    const base = (id, name, data, prop) => ({
      id,
      name,
      type: "tilelayer",
      width: DW,
      height: delta.height,
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
      properties: [{ name: prop, type: "string", value: "cove-open" }],
      data,
    });
    const at = delta.layers.findIndex((l) => l.name === "markers");
    delta.layers.splice(
      at,
      0,
      base(delta.nextlayerid, "ferry-ruined", art(CLIFF), "unless"),
      base(delta.nextlayerid + 1, "ferry-repaired", art(ROOF), "when"),
    );
    delta.nextlayerid += 2;
    const markersLayer = delta.layers.find((l) => l.name === "markers");
    const oid = delta.nextobjectid;
    markersLayer.objects.push(
      mk(oid, "from_ferry", "entry", 26, 57),
      mk(
        oid + 1,
        "ferry",
        "exit",
        BOAT.x,
        BOAT.y,
        { map: "cove", entry: "from_ferry", requires: "cove-open" },
        BOAT,
      ),
    );
    delta.nextobjectid = oid + 2;
  }
  writeFileSync(url, JSON.stringify(delta) + "\n");
}
