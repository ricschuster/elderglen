// Writes the Forest map (Tiled JSON), part 1 of docs/design/72_forest.md:
// the shell, the lake, the six groves, the clutter and the forage points.
// Run once: node scripts/gen-forest-map.mjs
// The file it writes, src/content/maps/forest.json, is the source from then on:
// edit that by hand or in Tiled. This script only authored the first draft, with
// a fixed seed so a re-run gives the same file.
import { writeFileSync } from "node:fs";

const W = 120;
const H = 120;
const T = 16;

// Tileset ids (placeholder tileset): 1 grass, 2 flowers, 3 path, 4 water,
// 5 pale earth, 6 tree, 7 wall (cliff).
const GRASS = 1;
const FLOWERS = 2;
const PATH = 3;
const WATER = 4;
const EARTH = 5;
const TREE = 6;
const CLIFF = 7;

let seed = 7201;
const rnd = () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (list) => list[Math.floor(rnd() * list.length)];
const idx = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

const ground = new Array(W * H).fill(GRASS);
const objects = new Array(W * H).fill(0);
const collision = new Array(W * H).fill(0);
const paths = new Array(W * H).fill(0);
for (let i = 0; i < ground.length; i++) if (rnd() < 0.07) ground[i] = FLOWERS;

const rect = (x0, y0, x1, y1, f) => {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (inside(x, y)) f(x, y);
};
const road = (x0, y0, x1, y1) =>
  rect(x0, y0, x1, y1, (x, y) => {
    ground[idx(x, y)] = PATH;
    paths[idx(x, y)] = 1;
  });
const solid = (x, y, tile) => {
  objects[idx(x, y)] = tile;
  collision[idx(x, y)] = 1;
};

// ---- the lake: an ellipse, water on the ground and in collision.
const LAKE = { x: 34, y: 12, w: 31, h: 23 };
const water = new Set();
for (let y = LAKE.y; y < LAKE.y + LAKE.h; y++)
  for (let x = LAKE.x; x < LAKE.x + LAKE.w; x++) {
    const dx = (x - 49) / 15.5;
    const dy = (y - 23) / 11.5;
    if (dx * dx + dy * dy <= 1) {
      water.add(idx(x, y));
      ground[idx(x, y)] = WATER;
      collision[idx(x, y)] = 1;
    }
  }

// ---- roads: three tiles wide, one loop past the lake (note 72).
road(72, 62, 74, 119); // the farm road, north to the junction and beyond
road(32, 69, 114, 71); // the trunk road, west to east, junction at (73, 70)
road(31, 35, 33, 71); // the west leg, up to the lake shore
road(31, 35, 67, 37); // the south shore path
road(65, 35, 67, 71); // the east leg, back down to the trunk
road(65, 12, 67, 34); // the east shore path
road(109, 62, 111, 71); // the Mountain road climbs from the trunk road
road(109, 62, 116, 64); // and ends in scenery, the exit comes with the Mountain

// ---- the north and west shore: cliff and reed, no casting from it.
for (const k of water) {
  const x = k % W;
  const y = Math.floor(k / W);
  for (const [dx, dy] of [
    [-1, 0],
    [0, -1],
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inside(nx, ny) || water.has(idx(nx, ny)) || paths[idx(nx, ny)])
      continue;
    // Only the north and west half of the shore.
    if ((ny < 23 && nx <= 60) || (nx < 49 && ny < 30)) solid(nx, ny, CLIFF);
  }
}

// ---- the border: a cliff wall on the north, trees round the other edges.
const SOUTH_GAP = { x0: 70, x1: 76 };
rect(0, 0, W - 1, H - 1, (x, y) => {
  if (y < 2) solid(x, y, CLIFF);
  else if (x < 2 || x >= W - 2 || y >= H - 2) {
    if (y >= H - 2 && x >= SOUTH_GAP.x0 && x <= SOUTH_GAP.x1) return;
    solid(x, y, TREE);
  }
});
rect(SOUTH_GAP.x0, H - 4, SOUTH_GAP.x1, H - 1, (x, y) => {
  objects[idx(x, y)] = 0;
  collision[idx(x, y)] = 0;
});

// About 60 more cosmetic trees in the edge bands (they cannot be chopped).
let cosmetic = 0;
while (cosmetic < 60) {
  const band = rnd() < 0.5;
  const x = band ? 2 + Math.floor(rnd() * 5) : 2 + Math.floor(rnd() * (W - 4));
  const y = band ? 2 + Math.floor(rnd() * (H - 4)) : 2 + Math.floor(rnd() * 5);
  const rx = rnd() < 0.5 ? x : W - 1 - x;
  const ry = !band && rnd() < 0.5 ? H - 1 - y : y;
  if (
    !inside(rx, ry) ||
    objects[idx(rx, ry)] ||
    paths[idx(rx, ry)] ||
    water.has(idx(rx, ry)) ||
    (rx >= 64 && rx <= 82 && ry >= 108) ||
    ry < 3
  )
    continue;
  solid(rx, ry, TREE);
  cosmetic++;
}

// ---- the onion bank: pale earth, 8 by 6, below the trunk road.
const BANK = { x: 96, y: 72, w: 8, h: 6 };
rect(BANK.x, BANK.y, BANK.x + BANK.w - 1, BANK.y + BANK.h - 1, (x, y) => {
  ground[idx(x, y)] = EARTH;
});

// ---- objects.
let nextId = 1;
const props = (o) =>
  Object.entries(o).map(([name, value]) => ({
    name,
    type: typeof value === "number" ? "int" : "string",
    value,
  }));
const markers = [];
const add = (name, cls, x, y, extra = {}, rectangle) => {
  const o = {
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
  };
  markers.push(o);
};

add("from_farm", "entry", 73, 116);
add(
  "to_farm",
  "exit",
  SOUTH_GAP.x0,
  H - 1,
  { map: "farm", entry: "from_forest" },
  { w: SOUTH_GAP.x1 - SOUTH_GAP.x0 + 1, h: 1 },
);
add("forest-lake", "water", LAKE.x, LAKE.y, { kind: "forest-lake" }, LAKE);
add("onion-bank", "region", BANK.x, BANK.y, { forage: "onion-bank" }, BANK);

// ---- the six groves (note 72). Trees stand only where both coordinates are
// even steps from the grove's corner, so a one tile lane always runs between
// them and the grove can be walked.
const GROVES = [
  { id: "G1", x0: 8, y0: 40, x1: 30, y1: 54, kind: "oak", m: 19, y: 4, s: 3 },
  { id: "G2", x0: 6, y0: 58, x1: 28, y1: 76, kind: "oak", m: 20, y: 4, s: 4 },
  { id: "G3", x0: 38, y0: 84, x1: 62, y1: 104, kind: "oak", m: 20, y: 4, s: 4 },
  {
    id: "G4",
    x0: 70,
    y0: 12,
    x1: 82,
    y1: 30,
    kind: "maple",
    m: 13,
    y: 4,
    s: 1,
  },
  {
    id: "G5",
    x0: 88,
    y0: 44,
    x1: 112,
    y1: 58,
    kind: "maple",
    m: 19,
    y: 4,
    s: 3,
  },
  {
    id: "G6",
    x0: 88,
    y0: 92,
    x1: 112,
    y1: 112,
    kind: "maple",
    m: 19,
    y: 5,
    s: 2,
  },
];
const taken = new Set();
const inGrove = (x, y) =>
  GROVES.some((g) => x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1);
const open = (x, y) =>
  inside(x, y) &&
  !collision[idx(x, y)] &&
  !paths[idx(x, y)] &&
  !water.has(idx(x, y));
let chopTrees = 0;
for (const g of GROVES) {
  const spots = [];
  for (let y = g.y0; y <= g.y1; y += 2)
    for (let x = g.x0; x <= g.x1; x += 2) if (open(x, y)) spots.push({ x, y });
  const stages = [
    ...new Array(g.m).fill(5),
    ...new Array(g.y).fill(4),
    ...Array.from({ length: g.s }, () => pick([2, 3])),
  ];
  for (const stage of stages) {
    const i = Math.floor(rnd() * spots.length);
    const [s] = spots.splice(i, 1);
    taken.add(idx(s.x, s.y));
    add("tree", "tree", s.x, s.y, { stage, kind: g.kind });
    chopTrees++;
  }
}

// ---- clutter, hand placed: rocks 40, twigs 50, weeds 60.
const free = (x, y) =>
  open(x, y) &&
  x >= 3 &&
  y >= 3 &&
  x < W - 3 &&
  y < H - 3 &&
  !taken.has(idx(x, y)) &&
  Math.hypot(x - 73, y - 116) > 4;
const used = new Set();
const scatter = (n, name, cls, avoidGroves, spacing) => {
  let placed = 0;
  let guard = 0;
  while (placed < n && guard++ < 100000) {
    const x = 3 + Math.floor(rnd() * (W - 6));
    const y = 3 + Math.floor(rnd() * (H - 6));
    if (!free(x, y) || used.has(idx(x, y))) continue;
    if (avoidGroves && inGrove(x, y)) continue;
    let crowded = false;
    for (let dy = -spacing; dy <= spacing; dy++)
      for (let dx = -spacing; dx <= spacing; dx++)
        if (used.has(idx(x + dx, y + dy))) crowded = true;
    if (crowded) continue;
    used.add(idx(x, y));
    add(name, cls, x, y);
    placed++;
  }
};
scatter(40, "rock", "rock", true, 2);
scatter(50, "twig", "twig", false, 0);
scatter(60, "weed", "weed", false, 0);

// ---- forage: 56 candidate spots along grove edges and the shore, and every
// tile of the onion bank.
const spotUsed = new Set();
const forageAt = (x, y) => {
  if (!free(x, y) || used.has(idx(x, y)) || spotUsed.has(idx(x, y)))
    return false;
  spotUsed.add(idx(x, y));
  add("forage", "forage", x, y);
  return true;
};
for (const g of GROVES) {
  let placed = 0;
  let guard = 0;
  while (placed < 6 && guard++ < 1000) {
    const side = Math.floor(rnd() * 4);
    const t = rnd();
    const x =
      side === 0
        ? g.x0 - 1
        : side === 1
          ? g.x1 + 1
          : g.x0 + Math.floor(t * (g.x1 - g.x0));
    const y =
      side === 2
        ? g.y0 - 1
        : side === 3
          ? g.y1 + 1
          : g.y0 + Math.floor(t * (g.y1 - g.y0));
    if (forageAt(x, y)) placed++;
  }
}
for (let n = 0, guard = 0; n < 10 && guard < 1000; guard++)
  if (forageAt(36 + Math.floor(rnd() * 28), 38)) n++;
for (let n = 0, guard = 0; n < 10 && guard < 1000; guard++)
  if (forageAt(68, 14 + Math.floor(rnd() * 22))) n++;
// The onion bank is its own region: every point is a spot.
rect(BANK.x, BANK.y, BANK.x + BANK.w - 1, BANK.y + BANK.h - 1, (x, y) =>
  add("forage", "forage", x, y),
);

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
  width: W,
  height: H,
  tilewidth: T,
  tileheight: T,
  nextlayerid: 6,
  nextobjectid: nextId,
  properties: [
    { name: "placeholder", type: "bool", value: true },
    { name: "rideable", type: "bool", value: true },
    { name: "wild", type: "bool", value: true },
    { name: "waterKind", type: "string", value: "forest-lake" },
  ],
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
  new URL("../src/content/maps/forest.json", import.meta.url),
  JSON.stringify(map) + "\n",
);
console.log(
  `forest: ${chopTrees} choppable trees, ${cosmetic} extra cosmetic trees, ${markers.length} objects`,
);
