// Writes the Standard farm map, src/content/maps/farm.json, from the checked
// layout in docs/design/55_farm_layout.md (issue #776). The ground comes from
// the Tiled draft, docs/design/drafts/farm-draft/farm-draft.tmj; this script
// turns its colour swatches into the placeholder tileset, adds the markers
// and scatters the starting clutter from a fixed seed.
// Run once: node scripts/gen-farm-map.mjs
// The file it writes is the source from then on: edit it by hand or in Tiled.
// A re-run replaces the map, so it also replaces hand edits.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "docs/design/drafts/farm-draft/farm-draft.tmj";
const OUT = "src/content/maps/farm.json";
const W = 80;
const H = 65;
const T = 16;

// Draft swatches (farm-draft tiles.png): 1 grass, 2 field, 3 pond, 4 path,
// 5 cliff, 6 border trees.
const D = { GRASS: 1, FIELD: 2, POND: 3, PATH: 4, CLIFF: 5, TREES: 6 };
// Placeholder tileset: 1 grass, 2 flowers, 3 path, 4 water, 5 pale earth,
// 6 tree, 7 wall (cliff), 8 roof, 9 door.
const R = {
  GRASS: 1,
  FLOWERS: 2,
  PATH: 3,
  WATER: 4,
  EARTH: 5,
  TREE: 6,
  WALL: 7,
  ROOF: 8,
  DOOR: 9,
};

const draft = JSON.parse(readFileSync(SRC, "utf8"));
const dground = draft.layers.find((l) => l.name === "ground").data;
if (draft.width !== W || draft.height !== H)
  throw new Error("draft is not 80 by 65");

let seed = 5501;
const rnd = () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const idx = (x, y) => y * W + x;

const ground = new Array(W * H).fill(R.GRASS);
const objects = new Array(W * H).fill(0);
const collision = new Array(W * H).fill(0);
const soil = new Array(W * H).fill(0);
const paths = new Array(W * H).fill(0);

for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    switch (dground[i]) {
      case D.GRASS:
        ground[i] = rnd() < 0.1 ? R.FLOWERS : R.GRASS;
        break;
      case D.FIELD:
        ground[i] = R.EARTH;
        soil[i] = 1;
        break;
      case D.POND:
        ground[i] = R.WATER;
        collision[i] = 1;
        break;
      case D.PATH:
        ground[i] = R.PATH;
        paths[i] = 1;
        break;
      case D.CLIFF:
        objects[i] = R.WALL;
        collision[i] = 1;
        break;
      case D.TREES:
        objects[i] = R.TREE;
        collision[i] = 1;
        break;
    }
  }

const rect = (x0, y0, w, h, f) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) f(x, y);
};

// ---- the farmhouse: x 58 to 66, y 7 to 11, door bottom middle (note 55).
const HOUSE = { x: 58, y: 7, w: 9, h: 5 };
rect(HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h, (x, y) => {
  objects[idx(x, y)] = y === HOUSE.y ? R.ROOF : R.WALL;
  collision[idx(x, y)] = 1;
});
const DOOR = { x: 62, y: 11 };
objects[idx(DOOR.x, DOOR.y)] = R.DOOR;
collision[idx(DOOR.x, DOOR.y)] = 0;

// ---- the farm cave in the north cliff: two door tiles at 38,3.
const CAVE = { x: 38, y: 3 };
for (const dx of [0, 1]) {
  objects[idx(CAVE.x + dx, CAVE.y)] = R.DOOR;
  collision[idx(CAVE.x + dx, CAVE.y)] = 0;
}

// ---- the greenhouse ruin stands on field. The map does not draw it (code
// stands it at GREENHOUSE_SITE and walls it), but its 24 tiles are marked soil
// so the ground under it is tillable once it moves (note 55).
const GH = { x: 24, y: 10, w: 6, h: 4 };
rect(GH.x, GH.y, GH.w, GH.h, (x, y) => {
  soil[idx(x, y)] = 1;
  ground[idx(x, y)] = R.EARTH;
});

// ---- building sites (the code keeps the matching numbers in core/animals.ts).
// The thin-clutter area x 50 to 76, y 18 to 36 holds them.
const SITES = {
  coop: { x: 52, y: 20, w: 6, h: 3, doorX: 1 },
  barn: { x: 60, y: 20, w: 7, h: 4, doorX: 3 },
  silo: { x: 52, y: 27, w: 3, h: 3 },
  stable: { x: 60, y: 27, w: 4, h: 2 },
};

// ---- markers.
let nextId = 1;
const prop = (name, value) => ({
  name,
  type: typeof value === "number" ? "int" : "string",
  value,
});
const obj = (name, type, tx, ty, w, h, props = []) => ({
  id: nextId++,
  name,
  type,
  x: tx * T,
  y: ty * T,
  width: w * T,
  height: h * T,
  rotation: 0,
  visible: true,
  ...(props.length ? { properties: props } : {}),
});
const markers = [];
const entry = (name, x, y) => markers.push(obj(name, "entry", x, y, 0, 0));
const service = (name, kind, x, y) =>
  markers.push(obj(name, "service", x, y, 0, 0, [prop("kind", kind)]));
const exit = (name, x, y, w, h, map, to, requires) =>
  markers.push(
    obj(name, "exit", x, y, w, h, [
      prop("map", map),
      prop("entry", to),
      ...(requires ? [prop("requires", requires)] : []),
    ]),
  );

entry("start", 62, 13);
entry("from_house", 62, 12);
exit("house", DOOR.x, DOOR.y, 1, 1, "house", "door");
service("bin", "bin", 66, 13);
service("mailbox", "mailbox", 68, 13);
service("furnace", "furnace", 60, 13);
// Stand-in: the festival green stays on the farm until the festival layouts
// (layout track step 2) give it a home in the village.
service("festival", "festival", 74, 16);
objects[idx(74, 16)] = R.WALL;
collision[idx(74, 16)] = 1;
entry("from_festival", 74, 17);

exit("forest", 44, 0, 5, 1, "forest", "from_farm");
entry("from_forest", 46, 4);
exit("hearthwell", 79, 12, 1, 5, "hearthwell", "from_farm");
entry("from_hearthwell", 78, 14);
exit("delta", 44, 64, 5, 1, "delta", "from_farm");
entry("from_delta", 46, 63);
exit("cave", CAVE.x, CAVE.y, 2, 1, "farm-cave", "door", "cave-open");
entry("from_cave", CAVE.x, CAVE.y + 1);

exit(
  "greenhouse",
  GH.x + 2,
  GH.y + 3,
  1,
  1,
  "greenhouse",
  "door",
  "greenhouse-open",
);
entry("from_greenhouse", GH.x + 2, GH.y + 4);
exit(
  "coop",
  SITES.coop.x + 1,
  SITES.coop.y + 2,
  1,
  1,
  "coop",
  "door",
  "coop-built",
);
entry("from_coop", SITES.coop.x + 1, SITES.coop.y + 3);
exit(
  "barn",
  SITES.barn.x + 3,
  SITES.barn.y + 3,
  1,
  1,
  "barn",
  "door",
  "barn-built",
);
entry("from_barn", SITES.barn.x + 3, SITES.barn.y + 4);

// ---- starting clutter (note 55, raised after the owner's look, 2026-11-11): trees 250 (200 mature, 30 young, 20
// seedlings), stumps 45, stones and boulders 200, branches 150, weeds 400, all
// thin near the house. Bushes (15) have no system yet and are not placed.
const taken = new Set();
const keep = (x0, y0, w, h, m = 0) =>
  rect(x0 - m, y0 - m, w + 2 * m, h + 2 * m, (x, y) => taken.add(idx(x, y)));
for (const m of markers) {
  if (m.type === "entry" || m.type === "service")
    keep(m.x / T, m.y / T, 1, 1, 2);
  if (m.type === "exit") keep(m.x / T, m.y / T, m.width / T, m.height / T, 2);
}
keep(HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h + 3, 1);
// The grass strip around the house starts bare (note 55).
keep(56, 6, 22, 12);
// A bare patch of field south of the house, for tests that need open ground.
keep(60, 19, 4, 3);
keep(GH.x, GH.y, GH.w, GH.h + 2, 1);
for (const [k, s] of Object.entries(SITES))
  keep(s.x, s.y, s.w, s.h + (k === "stable" ? 1 : 2), 1);

const thin = (x, y) => x >= 50 && x <= 76 && y >= 18 && y <= 36;
const open = (x, y) => {
  const i = idx(x, y);
  return (
    x >= 3 &&
    x <= 76 &&
    y >= 8 &&
    y <= 60 &&
    ground[i] !== R.WATER &&
    ground[i] !== R.PATH &&
    !objects[i] &&
    !collision[i] &&
    !taken.has(i)
  );
};
const place = (n, add) => {
  let placed = 0;
  let guard = 0;
  while (placed < n && guard++ < 200000) {
    const x = 3 + Math.floor(rnd() * 74);
    const y = 8 + Math.floor(rnd() * 53);
    if (!open(x, y)) continue;
    if (thin(x, y) && rnd() > 1 / 3) continue;
    taken.add(idx(x, y));
    add(x, y);
    placed++;
  }
  if (placed < n) throw new Error("could not place all clutter");
};
const trees = [];
place(200, (x, y) =>
  trees.push(obj("tree", "tree", x, y, 0, 0, [prop("stage", 5)])),
);
place(30, (x, y) =>
  trees.push(obj("tree", "tree", x, y, 0, 0, [prop("stage", 4)])),
);
place(20, (x, y) =>
  trees.push(obj("tree", "tree", x, y, 0, 0, [prop("stage", 3)])),
);
place(45, (x, y) => trees.push(obj("stump", "stump", x, y, 0, 0)));
place(200, (x, y) => trees.push(obj("rock", "rock", x, y, 0, 0)));
place(400, (x, y) => trees.push(obj("twig", "twig", x, y, 0, 0)));
place(150, (x, y) => trees.push(obj("weed", "weed", x, y, 0, 0)));
// Forage may stand on the field (note 67); a few spots over the whole farm.
place(20, (x, y) => trees.push(obj("forage", "forage", x, y, 0, 0)));
markers.push(...trees);

const old = JSON.parse(readFileSync(OUT, "utf8"));
const layer = (l, data) => ({ ...l, width: W, height: H, data });
const byName = Object.fromEntries(old.layers.map((l) => [l.name, l]));
const out = {
  ...old,
  width: W,
  height: H,
  nextobjectid: nextId,
  layers: [
    layer(byName.ground, ground),
    layer(byName.objects, objects),
    layer(byName.collision, collision),
    layer(byName.soil, soil),
    { ...byName.markers, objects: markers },
    layer(byName.paths, paths),
  ],
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${OUT}: ${W} by ${H}, ${markers.length} markers`);
