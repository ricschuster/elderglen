// DRAFT ONLY, DO NOT RUN (ADR 0014). This script overwrites a committed map that has
// since been edited by hand, so running it would drop working features. The committed
// JSON in src/content/maps/ is the source. Kept as a record of the first draft.
//
// Writes the Mountain map (Tiled JSON), build steps 1 to 3 and 6 of
// docs/design/74_mountain.md: the shell, the lake and river, the footbridge,
// the roads, the rockfall and mine mouth, pines, rocks, clutter and forage.
// Run once: node scripts/drafts/gen-mountain-map.mjs
// The file it writes, src/content/maps/mountain.json, is the source from then
// on: edit that by hand or in Tiled. This script only authored the first
// draft, with a fixed seed so a re-run gives the same file.
import { writeFileSync } from "node:fs";

const W = 80;
const H = 70;
const T = 16;

// Tileset ids (placeholder tileset): 1 grass, 2 flowers, 3 path, 4 water,
// 5 pale earth, 6 tree, 7 wall (cliff), 8 roof, 9 door.
const GRASS = 1;
const FLOWERS = 2;
const PATH = 3;
const WATER = 4;
const TREE = 6;
const CLIFF = 7;
const ROOF = 8;
const DOOR = 9;

let seed = 7401;
const rnd = () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const idx = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

const ground = new Array(W * H).fill(GRASS);
const objects = new Array(W * H).fill(0);
const collision = new Array(W * H).fill(0);
const paths = new Array(W * H).fill(0);
for (let i = 0; i < ground.length; i++) if (rnd() < 0.08) ground[i] = FLOWERS;

const rect = (x0, y0, x1, y1, f) => {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (inside(x, y)) f(x, y);
};
const water = new Set();
const setWater = (x, y) => {
  ground[idx(x, y)] = WATER;
  collision[idx(x, y)] = 1;
  objects[idx(x, y)] = 0;
  water.add(idx(x, y));
};
const solid = (x, y, tile) => {
  objects[idx(x, y)] = tile;
  collision[idx(x, y)] = 1;
};
const road = (x0, y0, x1, y1) =>
  rect(x0, y0, x1, y1, (x, y) => {
    ground[idx(x, y)] = PATH;
    paths[idx(x, y)] = 1;
    collision[idx(x, y)] = 0;
    objects[idx(x, y)] = 0;
    water.delete(idx(x, y));
  });

// ---- the lake: an ellipse, x 18 to 45 and y 8 to 25 (28 by 18).
const LAKE = { x: 18, y: 8, w: 28, h: 18 };
rect(LAKE.x, LAKE.y, LAKE.x + LAKE.w - 1, LAKE.y + LAKE.h - 1, (x, y) => {
  const dx = (x + 0.5 - (LAKE.x + LAKE.w / 2)) / (LAKE.w / 2);
  const dy = (y + 0.5 - (LAKE.y + LAKE.h / 2)) / (LAKE.h / 2);
  if (dx * dx + dy * dy <= 1) setWater(x, y);
});
// ---- the river: the stream leaves the lake at (46, 18), runs south and steps
// east so the Hearthwell road keeps the west bank to the south edge.
const RIVER_A = { x: 46, y: 17, w: 7, h: 21 }; // x 46 to 52, y 17 to 37
const RIVER_B = { x: 50, y: 38, w: 6, h: 8 }; // x 50 to 55, y 38 to 45
const RIVER_C = { x: 53, y: 46, w: 6, h: 24 }; // x 53 to 58, y 46 to 69
for (const z of [RIVER_A, RIVER_B, RIVER_C])
  rect(z.x, z.y, z.x + z.w - 1, z.y + z.h - 1, (x, y) => {
    // the east bank of the stream mouth stays land north of the lake level
    if (z === RIVER_A && x === 46 && (y < 17 || y > 19)) return;
    setWater(x, y);
  });

// ---- the ridge east of the lake and the cliff band across the pass: the north
// east (the mine mouth) can be reached only through the rockfall gap.
const RIDGE = { x0: 46, y0: 2, x1: 53, y1: 16 };
rect(RIDGE.x0, RIDGE.y0, RIDGE.x1, RIDGE.y1, (x, y) => {
  if (!water.has(idx(x, y))) solid(x, y, CLIFF);
});
const PASS = { y0: 14, y1: 18 };
rect(54, PASS.y0, 77, PASS.y1, (x, y) => solid(x, y, CLIFF));
const ROCKFALL = { x: 60, y: 14, w: 7, h: 5 };
rect(ROCKFALL.x, ROCKFALL.y, ROCKFALL.x + 6, ROCKFALL.y + 4, (x, y) => {
  objects[idx(x, y)] = 0;
  collision[idx(x, y)] = 0;
});

// ---- roads, three tiles wide.
road(0, 34, 4, 40); // the Forest exit flare
road(0, 35, 46, 37); // the west road to the bridge
road(47, 35, 52, 37); // the stone footbridge, 6 by 3 (path over the water)
road(53, 35, 65, 37); // the east road
road(62, 19, 64, 34); // north to the rockfall
road(62, 11, 64, 18); // through the rockfall gap (62 to 64)
road(62, 11, 69, 13); // to the mine mouth
road(62, 38, 64, 47); // south to the stonekeeper's yard (note 74, #643)
road(44, 38, 46, 69); // the river road to Hearthwell, west bank
road(44, 66, 50, 69); // the Hearthwell exit
road(12, 36, 14, 48); // the spur to the forge
road(12, 47, 46, 48); // the road past the forge, on to the river road
road(18, 27, 46, 28); // the lake shore path, south and east
road(18, 27, 20, 37); // joins the west road
road(46, 20, 46, 28); // east shore, beside the stream

// ---- the mine mouth: 5 by 4, door at (68, 10).
const MOUTH = { x0: 66, y0: 7, x1: 70, y1: 10, door: 68 };
rect(MOUTH.x0, MOUTH.y0, MOUTH.x1, MOUTH.y1, (x, y) =>
  solid(x, y, y <= MOUTH.y0 + 1 ? ROOF : CLIFF),
);
ground[idx(MOUTH.door, MOUTH.y1)] = DOOR;
collision[idx(MOUTH.door, MOUTH.y1)] = 0;
objects[idx(MOUTH.door, MOUTH.y1)] = 0;

// ---- the border: a cliff wall on the north, pines round the other edges, with
// gaps for the Forest exit (west) and the Hearthwell exit (south).
rect(0, 0, W - 1, H - 1, (x, y) => {
  if (water.has(idx(x, y))) return;
  if (y < 2) return solid(x, y, CLIFF);
  if (x < 2 || x >= W - 2 || y >= H - 2) {
    if (paths[idx(x, y)]) return;
    solid(x, y, TREE);
  }
});

// ---- cliff outcrops on the slopes (cosmetic): small clumps off the roads.
const reserved = [
  { x0: 10, y0: 38, x1: 24, y1: 50 }, // the forge hut (#643)
  { x0: 56, y0: 40, x1: 79, y1: 54 }, // the stonekeeper's yard and the Quarry bridge (#643, #649)
  { x0: 56, y0: 2, x1: 77, y1: 13 }, // the mine mouth and the cart stop
];
const inReserved = (x, y) =>
  reserved.some((r) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
const nearBy = (set, x, y, r) => {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (inside(x + dx, y + dy) && set(x + dx, y + dy)) return true;
  return false;
};
const isWaterAt = (x, y) => water.has(idx(x, y));
const isPath = (x, y) => paths[idx(x, y)] === 1;
const isSolid = (x, y) => collision[idx(x, y)] === 1;
for (let n = 0, guard = 0; n < 10 && guard < 5000; guard++) {
  const x = 4 + Math.floor(rnd() * (W - 12));
  const y = 4 + Math.floor(rnd() * (H - 10));
  const w = 2 + Math.floor(rnd() * 2);
  const h = 2;
  let ok = true;
  rect(x - 1, y - 1, x + w, y + h, (cx, cy) => {
    if (
      isSolid(cx, cy) ||
      isPath(cx, cy) ||
      inReserved(cx, cy) ||
      nearBy(isWaterAt, cx, cy, 2) ||
      (cx >= 40 && cx <= 80 && cy >= 12 && cy <= 20)
    )
      ok = false;
  });
  if (!ok) continue;
  rect(x, y, x + w - 1, y + h - 1, (cx, cy) => solid(cx, cy, CLIFF));
  n++;
}

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

add("from_forest", "entry", 3, 37);
add("from_hearthwell", "entry", 47, 66);
add("from_mine", "entry", 68, 13, { requires: "mines-open" });
// The cart stop beside the mine door (note 16), open once the mines are.
add("cart-mine", "service", 66, 12, { kind: "cart" });
add("from_cart-mine", "entry", 66, 13, { requires: "mines-open" });

add(
  "to_forest",
  "exit",
  0,
  34,
  { map: "forest", entry: "from_mountain" },
  { w: 1, h: 7 },
);
add("mine", "exit", MOUTH.door, MOUTH.y1, {
  map: "mine",
  entry: "door",
  requires: "mines-open",
});
add("mountain-lake", "water", LAKE.x, LAKE.y, { kind: "mountain-lake" }, LAKE);
for (const [name, z] of [
  ["river-a", RIVER_A],
  ["river-b", RIVER_B],
  ["river-c", RIVER_C],
])
  add(name, "water", z.x, z.y, { kind: "river" }, z);

// ---- placement. Clutter and trees keep off roads, water, the reserved places
// and every entry and exit.
const keep = markers.filter((o) => o.class === "entry" || o.class === "exit");
const nearGate = (x, y) =>
  keep.some((o) => {
    const ox = Math.floor(o.x / T);
    const oy = Math.floor(o.y / T);
    const ow = Math.max(1, Math.round(o.width / T));
    const oh = Math.max(1, Math.round(o.height / T));
    return x >= ox - 3 && x < ox + ow + 3 && y >= oy - 3 && y < oy + oh + 3;
  });
const free = (x, y) =>
  x >= 3 &&
  y >= 3 &&
  x < W - 3 &&
  y < H - 3 &&
  !isSolid(x, y) &&
  !isPath(x, y) &&
  !isWaterAt(x, y) &&
  !inReserved(x, y) &&
  !nearGate(x, y) &&
  !(y >= PASS.y0 - 1 && y <= PASS.y1 + 1 && x >= 54);

// Pines: about 80 choppable ones, one tile apart at the least so every tree can
// be reached, and not on the shore (casting) or beside a road.
const used = new Set();
const pines = [];
const stages = [
  ...new Array(56).fill(5),
  ...new Array(17).fill(4),
  ...Array.from({ length: 7 }, () => (rnd() < 0.5 ? 2 : 3)),
];
for (const stage of stages) {
  for (let guard = 0; guard < 50000; guard++) {
    const x = 3 + Math.floor(rnd() * (W - 6));
    const y = 3 + Math.floor(rnd() * (H - 6));
    if (!free(x, y) || used.has(idx(x, y))) continue;
    if (nearBy(isWaterAt, x, y, 2) || nearBy(isPath, x, y, 1)) continue;
    if (nearBy((cx, cy) => used.has(idx(cx, cy)), x, y, 1)) continue;
    used.add(idx(x, y));
    pines.push(x);
    add("tree", "tree", x, y, { stage, kind: "pine" });
    break;
  }
}

// Clutter, hand placed: rocks 60 (thicker west of the bridge near the forge and
// along the east road), twigs 30, weeds 30.
const nearForge = (x, y) => x >= 4 && x <= 44 && y >= 38 && y <= 60;
const nearEast = (x, y) => x >= 54 && x <= 76 && y >= 19 && y <= 62;
const place = (n, name, cls, ok = () => true) => {
  let placed = 0;
  for (let guard = 0; placed < n && guard < 200000; guard++) {
    const x = 3 + Math.floor(rnd() * (W - 6));
    const y = 3 + Math.floor(rnd() * (H - 6));
    if (!free(x, y) || used.has(idx(x, y)) || !ok(x, y)) continue;
    used.add(idx(x, y));
    add(name, cls, x, y);
    placed++;
  }
  if (placed < n) throw new Error(`only placed ${placed} of ${n} ${name}`);
};
place(36, "rock", "rock", (x, y) => nearForge(x, y) || nearEast(x, y));
place(24, "rock", "rock");
place(30, "twig", "twig");
place(30, "weed", "weed");
// Forage: 24 candidate spots on the slopes.
place(24, "forage", "forage", (x, y) => !nearBy(isWaterAt, x, y, 1));

// ---- layers.
const layer = (id, name, data, visible = true, properties) => ({
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
  ...(properties ? { properties } : {}),
});
const unlessOpen = [{ name: "unless", type: "string", value: "mines-open" }];
const fallCollision = new Array(W * H).fill(0);
const fallArt = new Array(W * H).fill(0);
rect(ROCKFALL.x, ROCKFALL.y, ROCKFALL.x + 6, ROCKFALL.y + 4, (x, y) => {
  fallCollision[idx(x, y)] = 1;
  fallArt[idx(x, y)] = CLIFF;
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
  nextlayerid: 8,
  nextobjectid: nextId,
  properties: [
    { name: "placeholder", type: "bool", value: true },
    { name: "rideable", type: "bool", value: true },
    { name: "wild", type: "bool", value: true },
    { name: "waterKind", type: "string", value: "mountain-lake" },
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
    layer(4, "collision", fallCollision, false, unlessOpen),
    layer(5, "rockfall", fallArt, true, unlessOpen),
    layer(6, "paths", paths, false),
    {
      id: 7,
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
  new URL("../src/content/maps/mountain.json", import.meta.url),
  JSON.stringify(map) + "\n",
);
console.log(`mountain: ${pines.length} pines, ${markers.length} objects`);
