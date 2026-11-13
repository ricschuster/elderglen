// DRAFT ONLY, DO NOT RUN (ADR 0014). This script overwrites a committed map that has
// since been edited by hand, so running it would drop working features. The committed
// JSON in src/content/maps/ is the source. Kept as a record of the first draft.
//
// Writes the River delta and Beach map and the fisher's hut interior (Tiled
// JSON), steps 1 to 4 of docs/design/75_river_delta_and_beach.md, and cuts the
// farm's south exit into both farm maps.
// Run once: node scripts/drafts/gen-delta-map.mjs
// The files it writes, src/content/maps/delta.json and fisher-hut.json, are the
// source from then on: edit them by hand or in Tiled. This script only authored
// the first draft, with a fixed seed so a re-run gives the same files. (The
// farm patch is idempotent: it only adds the exit when it is not there.)
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const W = 100;
const H = 70;
const T = 16;

// Tileset ids (placeholder tileset): 1 grass, 2 flowers, 3 path, 4 water,
// 5 pale earth (used as sand), 6 tree, 7 wall (cliff), 8 roof, 9 door.
const GRASS = 1;
const FLOWERS = 2;
const PATH = 3;
const WATER = 4;
const SAND = 5;
const TREE = 6;
const CLIFF = 7;
const ROOF = 8;
const DOOR = 9;

let seed = 7501;
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
const water = new Set();
const setWater = (x, y) => {
  ground[idx(x, y)] = WATER;
  collision[idx(x, y)] = 1;
  objects[idx(x, y)] = 0;
  water.add(idx(x, y));
};
const setLand = (x, y, tile) => {
  ground[idx(x, y)] = tile;
  collision[idx(x, y)] = 0;
  objects[idx(x, y)] = 0;
  water.delete(idx(x, y));
};
const solid = (x, y, tile) => {
  objects[idx(x, y)] = tile;
  collision[idx(x, y)] = 1;
};

// ---- sand: the Beach (east bank), the west strip by the channel mouth, and the
// tide pool pocket at the far east end.
const POCKET = { x0: 90, y0: 38, x1: 97, y1: 51 };
rect(66, 20, 85, 51, (x, y) => setLand(x, y, SAND));
rect(56, 44, 61, 51, (x, y) => setLand(x, y, SAND));
rect(POCKET.x0, POCKET.y0, POCKET.x1, POCKET.y1, (x, y) => setLand(x, y, SAND));

// ---- the cliff wall that shuts the east end: the north of the pocket, the
// divider (with the lagoon and the footbridge) and the south of the divider.
rect(86, 20, 99, 37, (x, y) => solid(x, y, CLIFF));
rect(86, 38, 89, 39, (x, y) => solid(x, y, CLIFF));
rect(86, 48, 89, 51, (x, y) => solid(x, y, CLIFF));
rect(98, 38, 99, 51, (x, y) => solid(x, y, TREE));

// ---- the waters.
const LAKE = { x: 8, y: 28, w: 31, h: 25 };
rect(LAKE.x, LAKE.y, LAKE.x + LAKE.w - 1, LAKE.y + LAKE.h - 1, (x, y) => {
  const dx = (x + 0.5 - (LAKE.x + LAKE.w / 2)) / (LAKE.w / 2);
  const dy = (y + 0.5 - (LAKE.y + LAKE.h / 2)) / (LAKE.h / 2);
  if (dx * dx + dy * dy <= 1) setWater(x, y);
});
const CHANNEL = { x: 62, y: 0, w: 4, h: 52 };
rect(CHANNEL.x, CHANNEL.y, CHANNEL.x + CHANNEL.w - 1, CHANNEL.y + 51, setWater);
const SIDE_A = { x: 50, y: 18, w: 3, h: 16 }; // down to the lake's level
const SIDE_B = { x: 35, y: 31, w: 18, h: 3 }; // west into the lake
const SIDE_C = { x: 50, y: 18, w: 12, h: 3 }; // from the main channel
for (const z of [SIDE_A, SIDE_B, SIDE_C])
  rect(z.x, z.y, z.x + z.w - 1, z.y + z.h - 1, setWater);
const SEA = { x: 56, y: 52, w: 44, h: 18 };
rect(SEA.x, SEA.y, SEA.x + SEA.w - 1, SEA.y + SEA.h - 1, setWater);
const LAGOON = { x: 86, y: 40, w: 4, h: 4 };
rect(LAGOON.x, LAGOON.y, LAGOON.x + 3, LAGOON.y + 3, setWater);

// ---- paths: the farm road, the boardwalk on the north shore, the reed
// footbridge over the side stream, the paths to the fisher's hut and the Beach
// footbridge, and the pier. Paths and bridges cross water as plain walkable ground.
const path = (x0, y0, x1, y1) =>
  rect(x0, y0, x1, y1, (x, y) => setLand(x, y, PATH));
path(13, 0, 13, 26); // the farm road
path(13, 26, 49, 26); // boardwalk, north shore of the marsh lake
path(48, 23, 49, 26);
path(40, 23, 58, 24); // reed footbridge over the side stream at x 50 to 52
path(56, 24, 57, 44);
path(56, 36, 66, 36); // to the Beach footbridge
path(61, 35, 66, 37); // Beach footbridge over the main channel, 6 by 3
path(44, 41, 57, 42); // to the fisher's hut
path(80, 48, 82, 58); // the pier: land for casting
// the tide pool footbridge: ground the player could walk, shut by a collision
// layer and covered by ruined art until the flag `tide-bridge-mended`.
const BRIDGE = { x: 86, y: 44, w: 4, h: 4 };
rect(BRIDGE.x, BRIDGE.y, BRIDGE.x + 3, BRIDGE.y + 3, (x, y) =>
  setLand(x, y, PATH),
);

// ---- the 2 tile border of trees, except where there is water (it reaches the
// map edge) and the Farm exit gap.
const FARM_EXIT = { x: 10, y: 0, w: 7, h: 1 };
rect(0, 0, W - 1, H - 1, (x, y) => {
  const edge = x < 2 || y < 2 || x >= W - 2 || y >= H - 2;
  if (!edge || water.has(idx(x, y))) return;
  if (y < 3 && x >= FARM_EXIT.x && x < FARM_EXIT.x + FARM_EXIT.w) return;
  if (ground[idx(x, y)] === PATH) return;
  solid(x, y, TREE);
});

// ---- the fisher's hut: 9 by 7, on the east shore of the marsh lake. Its door
// is on the south wall at (44, 40), entry beside it at (44, 41).
const HUT = { x0: 40, y0: 34, x1: 48, y1: 40, door: 44 };
rect(HUT.x0, HUT.y0, HUT.x1, HUT.y1, (x, y) => {
  setLand(x, y, GRASS);
  solid(x, y, y <= HUT.y0 + 2 ? ROOF : CLIFF);
});
ground[idx(HUT.door, HUT.y1)] = DOOR;
collision[idx(HUT.door, HUT.y1)] = 0;
objects[idx(HUT.door, HUT.y1)] = 0;
path(44, 41, 44, 41);

// ---- cosmetic trees (willows): not choppable, not near water, paths or the
// ring of marked places. They make the marsh meadow look wild.
const wet = (x, y, r) => {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (inside(x + dx, y + dy) && water.has(idx(x + dx, y + dy))) return true;
  return false;
};
const nearPath = (x, y, r) => {
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++)
      if (inside(x + dx, y + dy) && ground[idx(x + dx, y + dy)] === PATH)
        return true;
  return false;
};
const free = (x, y) =>
  inside(x, y) && !collision[idx(x, y)] && !water.has(idx(x, y));
let trees = 0;
for (let guard = 0; trees < 90 && guard < 100000; guard++) {
  const x = 3 + Math.floor(rnd() * 53);
  const y = 3 + Math.floor(rnd() * 64);
  if (!free(x, y) || wet(x, y, 2) || nearPath(x, y, 2)) continue;
  if (ground[idx(x, y)] === SAND) continue;
  if (x >= 8 && x <= 18 && y <= 8) continue; // the Farm exit approach
  solid(x, y, TREE);
  trees++;
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

add("from_farm", "entry", 13, 3);
add("from_fisher", "entry", HUT.door, HUT.y1 + 1);
add("at_bridge", "entry", 85, 45);
add(
  "to_farm",
  "exit",
  FARM_EXIT.x,
  0,
  { map: "farm", entry: "from_delta" },
  FARM_EXIT,
);
add(
  "fisher",
  "exit",
  HUT.door,
  HUT.y1,
  { map: "fisher-hut", entry: "door" },
  {
    w: 1,
    h: 1,
  },
);
// Water kinds: the map default is the marsh lake, the rest are zones (note 71).
add("marsh-lake", "water", LAKE.x, LAKE.y, { kind: "marsh-lake" }, LAKE);
add("main-channel", "water", CHANNEL.x, CHANNEL.y, { kind: "river" }, CHANNEL);
add(
  "side-channel-north",
  "water",
  SIDE_C.x,
  SIDE_C.y,
  { kind: "river" },
  SIDE_C,
);
add(
  "side-channel-down",
  "water",
  SIDE_A.x,
  SIDE_A.y,
  { kind: "river" },
  SIDE_A,
);
add(
  "side-channel-west",
  "water",
  SIDE_B.x,
  SIDE_B.y,
  { kind: "river" },
  SIDE_B,
);
add("sea", "water", SEA.x, SEA.y, { kind: "sea" }, SEA);
add("lagoon", "water", LAGOON.x, LAGOON.y, { kind: "sea" }, LAGOON);
// Forage regions: the pools first, then the marsh. Anything else is the Beach.
add(
  "tide-pools",
  "region",
  POCKET.x0,
  POCKET.y0,
  { forage: "tide-pools" },
  { w: 9, h: 14 },
);
add("marsh", "region", 0, 0, { forage: "marsh" }, { w: 56, h: 70 });

// The fisher's hut has its own counter inside. Placement of everything else.
const used = new Set();
const keepOff = (x, y) => {
  for (const o of markers)
    if (o.class === "entry" || o.class === "exit") {
      const ox = Math.floor(o.x / T);
      const oy = Math.floor(o.y / T);
      const ow = Math.max(1, Math.round(o.width / T));
      const oh = Math.max(1, Math.round(o.height / T));
      if (x >= ox - 3 && x < ox + ow + 3 && y >= oy - 3 && y < oy + oh + 3)
        return true;
    }
  return false;
};
const place = (n, name, cls, ok) => {
  let placed = 0;
  for (let guard = 0; placed < n && guard < 200000; guard++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * H);
    if (!free(x, y) || used.has(idx(x, y)) || keepOff(x, y)) continue;
    if (ground[idx(x, y)] === PATH || objects[idx(x, y)] !== 0) continue;
    if (!ok(x, y)) continue;
    used.add(idx(x, y));
    add(name, cls, x, y);
    placed++;
  }
  if (placed < n) throw new Error(`only placed ${placed} of ${n} ${name}`);
};
const onBeach = (x, y) =>
  ground[idx(x, y)] === SAND &&
  x <= 85 &&
  !(x >= BRIDGE.x - 2 && x <= BRIDGE.x && y >= 43 && y <= 48);
const inMarsh = (x, y) => x >= 2 && x <= 55 && !nearPath(x, y, 0);
const inPocket = (x, y) =>
  x >= POCKET.x0 && x <= POCKET.x1 && y >= POCKET.y0 && y <= POCKET.y1;
// Forage: marsh 24, beach 40, tide pools 20 candidate spots.
place(24, "forage", "forage", (x, y) => inMarsh(x, y) && !wet(x, y, 0));
place(40, "forage", "forage", (x, y) => onBeach(x, y));
place(20, "forage", "forage", (x, y) => inPocket(x, y));
// Debris: driftwood twigs 20, rocks 12, a handful of weeds in the marsh meadow.
place(
  20,
  "twig",
  "twig",
  (x, y) => onBeach(x, y) || (inMarsh(x, y) && wet(x, y, 1)),
);
place(12, "rock", "rock", (x, y) => onBeach(x, y) || inMarsh(x, y));
place(8, "weed", "weed", (x, y) => inMarsh(x, y));

// The ruined footbridge: four service tiles (the player faces any one of them
// from the sand), on an object layer that is hidden once it is mended.
const bridgeMarkers = [];
for (let y = BRIDGE.y; y < BRIDGE.y + BRIDGE.h; y++)
  bridgeMarkers.push(
    mk(`tide-bridge-${y - BRIDGE.y + 1}`, "service", BRIDGE.x, y, {
      kind: "tide-bridge",
    }),
  );

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
const unlessMended = [
  { name: "unless", type: "string", value: "tide-bridge-mended" },
];
const brokenCollision = new Array(W * H).fill(0);
const ruinedArt = new Array(W * H).fill(0);
rect(BRIDGE.x, BRIDGE.y, BRIDGE.x + 3, BRIDGE.y + 3, (x, y) => {
  brokenCollision[idx(x, y)] = 1;
  if ((x + y) % 2 === 0) ruinedArt[idx(x, y)] = CLIFF;
});

const tilesets = [
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
];
const base = {
  type: "map",
  version: "1.10",
  tiledversion: "1.10.2",
  orientation: "orthogonal",
  renderorder: "right-down",
  infinite: false,
  tilewidth: T,
  tileheight: T,
  tilesets,
};

const delta = {
  ...base,
  width: W,
  height: H,
  nextlayerid: 8,
  nextobjectid: nextId,
  properties: [
    { name: "placeholder", type: "bool", value: true },
    { name: "rideable", type: "bool", value: true },
    { name: "wild", type: "bool", value: true },
    { name: "waterKind", type: "string", value: "marsh-lake" },
  ],
  layers: [
    layer(1, "ground", ground),
    layer(2, "objects", objects),
    layer(3, "collision", collision, false),
    layer(4, "collision", brokenCollision, false, unlessMended),
    layer(5, "bridge-ruined", ruinedArt, true, unlessMended),
    {
      id: 6,
      name: "markers",
      type: "objectgroup",
      draworder: "topdown",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects: markers,
    },
    {
      id: 7,
      name: "bridge-markers",
      type: "objectgroup",
      draworder: "topdown",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      properties: unlessMended,
      objects: bridgeMarkers,
    },
  ],
};
writeFileSync(
  new URL("../src/content/maps/delta.json", import.meta.url),
  JSON.stringify(delta) + "\n",
);

// ---- the fisher's hut interior: 10 by 7, one counter (note 75).
{
  const w = 10;
  const h = 7;
  const g = new Array(w * h).fill(PATH);
  const c = new Array(w * h).fill(0);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        g[y * w + x] = CLIFF;
        c[y * w + x] = 1;
      }
  g[1 * w + 5] = 11; // the counter's sign, as the sawmill has
  g[6 * w + 5] = DOOR;
  c[6 * w + 5] = 0;
  let id = 1;
  const m = (name, cls, x, y, extra = {}, size) => ({
    id: id++,
    name,
    class: cls,
    type: cls,
    x: x * T + (size ? 0 : 8),
    y: y * T + (size ? 0 : 8),
    width: size ? T : 0,
    height: size ? T : 0,
    rotation: 0,
    visible: true,
    ...(size ? {} : { point: true }),
    ...(Object.keys(extra).length ? { properties: props(extra) } : {}),
  });
  const hutLayer = (lid, name, data, visible = true) => ({
    id: lid,
    name,
    type: "tilelayer",
    width: w,
    height: h,
    x: 0,
    y: 0,
    opacity: 1,
    visible,
    data,
  });
  const hut = {
    ...base,
    width: w,
    height: h,
    nextlayerid: 4,
    nextobjectid: 5,
    properties: [{ name: "placeholder", type: "bool", value: true }],
    layers: [
      hutLayer(1, "ground", g),
      hutLayer(2, "collision", c, false),
      {
        id: 3,
        name: "markers",
        type: "objectgroup",
        draworder: "topdown",
        opacity: 1,
        visible: true,
        x: 0,
        y: 0,
        objects: [
          m("door", "entry", 5, 5),
          m("door", "exit", 5, 6, { map: "delta", entry: "from_fisher" }, true),
          m("fisher", "service", 5, 1, { kind: "fisher-shop" }),
        ],
      },
    ],
  };
  hut.nextobjectid = id;
  // The hut was rebuilt from the checked interior plan (note 86), so this
  // script no longer overwrites it. Delete the file to regenerate the old one.
  const hutUrl = new URL(
    "../src/content/maps/fisher-hut.json",
    import.meta.url,
  );
  if (!existsSync(hutUrl)) writeFileSync(hutUrl, JSON.stringify(hut) + "\n");
}

// ---- the farm's south exit, in both farm maps (note 55): three tiles wide at
// x 21 to 23 on the bottom row, entry `from_delta` above it.
for (const file of ["farm", "farm-woodland"]) {
  const url = new URL(`../src/content/maps/${file}.json`, import.meta.url);
  const m = JSON.parse(readFileSync(url, "utf8"));
  const markersLayer = m.layers.find((l) => l.type === "objectgroup");
  if (markersLayer.objects.some((o) => o.name === "delta")) continue;
  const FW = m.width;
  const row = (m.height - 1) * FW;
  for (const name of ["ground", "objects", "collision"]) {
    const data = m.layers.find((l) => l.name === name).data;
    for (let x = 21; x <= 23; x++) data[row + x] = name === "ground" ? PATH : 0;
  }
  let nid = m.nextobjectid;
  markersLayer.objects.push(
    {
      id: nid++,
      name: "delta",
      class: "exit",
      type: "exit",
      x: 21 * T,
      y: (m.height - 1) * T,
      width: 3 * T,
      height: T,
      rotation: 0,
      visible: true,
      properties: [
        { name: "map", type: "string", value: "delta" },
        { name: "entry", type: "string", value: "from_farm" },
      ],
    },
    {
      id: nid++,
      name: "from_delta",
      class: "entry",
      type: "entry",
      x: 22 * T + 8,
      y: (m.height - 2) * T + 8,
      width: 0,
      height: 0,
      point: true,
      rotation: 0,
      visible: true,
    },
  );
  m.nextobjectid = nid;
  writeFileSync(url, JSON.stringify(m) + "\n");
}
console.log(`delta: ${markers.length} markers`);
