// DRAFT ONLY, DO NOT RUN (ADR 0014). This script overwrites a committed map that has
// since been edited by hand, so running it would drop working features. The committed
// JSON in src/content/maps/ is the source. Kept as a record of the first draft.
//
// Writes the Secret Woods map (Tiled JSON), steps 1 to 4 of
// docs/design/73_secret_woods.md: the shell, the upper glade, the covered
// passage, the lower hollow with its pond, six large stumps and forage spots.
// Run once: node scripts/drafts/gen-secret-woods-map.mjs
// The file it writes, src/content/maps/secret-woods.json, is the source from
// then on: edit that by hand or in Tiled. This script only authored the first
// draft, with a fixed seed so a re-run gives the same file.
import { writeFileSync } from "node:fs";

const W = 48;
const H = 40;
const T = 16;

// Tileset ids (placeholder tileset): 1 grass, 2 flowers, 3 path, 4 water,
// 5 pale earth, 6 tree, 7 wall (cliff).
const GRASS = 1;
const FLOWERS = 2;
const WATER = 4;
const TREE = 6;
const CLIFF = 7;

let seed = 7301;
const rnd = () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const idx = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

const ground = new Array(W * H).fill(GRASS);
const objects = new Array(W * H).fill(0);
const collision = new Array(W * H).fill(0);
for (let i = 0; i < ground.length; i++) if (rnd() < 0.1) ground[i] = FLOWERS;

const rect = (x0, y0, x1, y1, f) => {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (inside(x, y)) f(x, y);
};
const solid = (x, y, tile) => {
  objects[idx(x, y)] = tile;
  collision[idx(x, y)] = 1;
};

// Everything starts as dense trees (cliff along the north edge), then the open
// ground is carved out of it.
rect(0, 0, W - 1, H - 1, (x, y) => solid(x, y, y < 2 ? CLIFF : TREE));
const carve = (x0, y0, x1, y1) =>
  rect(x0, y0, x1, y1, (x, y) => {
    objects[idx(x, y)] = 0;
    collision[idx(x, y)] = 0;
  });
const GLADE = { x0: 6, y0: 4, x1: 44, y1: 22 };
const PASSAGE = { x0: 38, y0: 22, x1: 39, y1: 26 };
const HOLLOW = { x0: 12, y0: 26, x1: 42, y1: 38 };
const EXIT = { x: 47, y: 10, w: 1, h: 4 };
carve(GLADE.x0, GLADE.y0, GLADE.x1, GLADE.y1);
carve(PASSAGE.x0, PASSAGE.y0, PASSAGE.x1, PASSAGE.y1);
carve(HOLLOW.x0, HOLLOW.y0, HOLLOW.x1, HOLLOW.y1);
carve(GLADE.x1, EXIT.y, EXIT.x, EXIT.y + EXIT.h - 1); // the way east to the exit

// ---- the pond: an ellipse in the hollow, water on the ground and in collision.
const POND = { x: 24, y: 29, w: 10, h: 6 };
const water = new Set();
rect(POND.x, POND.y, POND.x + POND.w - 1, POND.y + POND.h - 1, (x, y) => {
  const dx = (x + 0.5 - (POND.x + POND.w / 2)) / (POND.w / 2);
  const dy = (y + 0.5 - (POND.y + POND.h / 2)) / (POND.h / 2);
  if (dx * dx + dy * dy <= 1.05) {
    water.add(idx(x, y));
    ground[idx(x, y)] = WATER;
    collision[idx(x, y)] = 1;
  }
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
const add = (name, cls, x, y, extra = {}, rectangle) =>
  markers.push({
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

add("from_forest", "entry", 45, 11);
add(
  "to_forest",
  "exit",
  EXIT.x,
  EXIT.y,
  { map: "forest", entry: "from_secret_woods" },
  EXIT,
);
add("woods-pond", "water", POND.x, POND.y, { kind: "woods-pond" }, POND);

// Six large stumps: four in the upper glade, two in the lower hollow (note 73).
const STUMPS = [
  [12, 9],
  [19, 6],
  [27, 10],
  [35, 7],
  [15, 33],
  [37, 32],
];
const taken = new Set();
for (const [x, y] of STUMPS) {
  taken.add(idx(x, y));
  add("stump", "stump", x, y, { kind: "oak" });
}

// ---- cosmetic trees scattered in the glade and hollow (not choppable).
const open = (x, y) =>
  inside(x, y) && !collision[idx(x, y)] && !taken.has(idx(x, y));
const clear = (x, y, r) => {
  for (const [sx, sy] of STUMPS)
    if (Math.hypot(x - sx, y - sy) <= r) return false;
  return (
    !(x >= 40 && y >= 9 && y <= 14) &&
    !(x >= 36 && x <= 41 && y >= 21 && y <= 28)
  );
};
const areas = [GLADE, HOLLOW];
for (const a of areas) {
  let n = 0;
  let guard = 0;
  while (n < 22 && guard++ < 10000) {
    const x = a.x0 + 1 + Math.floor(rnd() * (a.x1 - a.x0 - 1));
    const y = a.y0 + 1 + Math.floor(rnd() * (a.y1 - a.y0 - 1));
    if (!open(x, y) || !clear(x, y, 2) || water.has(idx(x, y))) continue;
    // keep the shore of the pond free for casting
    if (
      x >= POND.x - 2 &&
      x <= POND.x + POND.w + 1 &&
      y >= POND.y - 2 &&
      y <= POND.y + POND.h + 1
    )
      continue;
    solid(x, y, TREE);
    n++;
  }
}

// ---- starting clutter, hand placed: rocks 6, twigs 8, weeds 14.
const used = new Set();
const scatter = (n, name, cls) => {
  let placed = 0;
  let guard = 0;
  while (placed < n && guard++ < 100000) {
    const area = areas[Math.floor(rnd() * areas.length)];
    const x = area.x0 + Math.floor(rnd() * (area.x1 - area.x0 + 1));
    const y = area.y0 + Math.floor(rnd() * (area.y1 - area.y0 + 1));
    if (!open(x, y) || used.has(idx(x, y)) || water.has(idx(x, y))) continue;
    if (Math.hypot(x - 45, y - 11) < 4) continue;
    if (x >= PASSAGE.x0 - 1 && x <= PASSAGE.x1 + 1 && y >= 21 && y <= 27)
      continue;
    used.add(idx(x, y));
    add(name, cls, x, y);
    placed++;
  }
};
scatter(6, "rock", "rock");
scatter(8, "twig", "twig");
scatter(14, "weed", "weed");

// ---- forage: 30 candidate spots, 15 in the glade and 15 in the hollow.
for (const a of areas) {
  let n = 0;
  let guard = 0;
  while (n < 15 && guard++ < 10000) {
    const x = a.x0 + Math.floor(rnd() * (a.x1 - a.x0 + 1));
    const y = a.y0 + Math.floor(rnd() * (a.y1 - a.y0 + 1));
    if (!open(x, y) || used.has(idx(x, y)) || water.has(idx(x, y))) continue;
    if (Math.hypot(x - 45, y - 11) < 3) continue;
    used.add(idx(x, y));
    add("forage", "forage", x, y);
    n++;
  }
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
  nextlayerid: 5,
  nextobjectid: nextId,
  properties: [
    { name: "placeholder", type: "bool", value: true },
    { name: "rideable", type: "bool", value: true },
    { name: "wild", type: "bool", value: true },
    { name: "waterKind", type: "string", value: "woods-pond" },
    { name: "stumpRegrowDays", type: "int", value: 1 },
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
  new URL("../src/content/maps/secret-woods.json", import.meta.url),
  JSON.stringify(map) + "\n",
);
console.log(`secret-woods: ${markers.length} objects`);
