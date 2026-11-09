// Part 2 of docs/design/72_forest.md: the farmstead, the hermit's tower and the
// Wanderer's camp, cut into the Forest map, plus the two interiors
// (forest-farmstead.json, hermit-tower.json).
// A one-off edit of src/content/maps/forest.json, already applied. Re-running it
// on the edited file is safe: it clears and re-draws the same tiles, but it adds
// a second copy of the markers, so do not. After that, edit the files by hand.
// Run: node scripts/gen-forest-part2.mjs && npx prettier --write src/content/maps
import { readFileSync, writeFileSync } from "node:fs";

const W = 120;
const T = 16;
const GRASS = 1;
const PATH = 3;
const EARTH = 5;
const CLIFF = 7;
const ROOF = 8;
const DOOR = 9;
const SIGN = 11;

const url = new URL("../src/content/maps/forest.json", import.meta.url);
const map = JSON.parse(readFileSync(url, "utf8"));
const layer = (n) => map.layers.find((l) => l.name === n);
const ground = layer("ground").data;
const objects = layer("objects").data;
const collision = layer("collision").data;
const paths = layer("paths").data;
const markers = layer("markers").objects;
const idx = (x, y) => y * W + x;

const cleared = [];
const clear = (x, y) => {
  for (let i = markers.length - 1; i >= 0; i--) {
    const o = markers[i];
    if (
      ["tree", "rock", "twig", "weed", "forage"].includes(o.class) &&
      Math.floor(o.x / T) === x &&
      Math.floor(o.y / T) === y
    ) {
      cleared.push(markers.splice(i, 1)[0]);
    }
  }
};
const rect = (x0, y0, x1, y1, f) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f(x, y);
};
const road = (x0, y0, x1, y1) =>
  rect(x0, y0, x1, y1, (x, y) => {
    clear(x, y);
    ground[idx(x, y)] = PATH;
    paths[idx(x, y)] = 1;
    objects[idx(x, y)] = 0;
    collision[idx(x, y)] = 0;
  });
const solid = (x, y, tile, under = GRASS) => {
  clear(x, y);
  ground[idx(x, y)] = under;
  objects[idx(x, y)] = tile;
  collision[idx(x, y)] = 1;
};
const open = (x, y, tile = 0) => {
  objects[idx(x, y)] = tile;
  collision[idx(x, y)] = 0;
};

// A building: roof on the top rows, stone wall below, a door in the bottom row.
const building = (x0, y0, x1, y1, doorX, roofRows) => {
  rect(x0, y0, x1, y1, (x, y) => solid(x, y, y < y0 + roofRows ? ROOF : CLIFF));
  ground[idx(doorX, y1)] = DOOR;
  open(doorX, y1);
};
// A fenced paddock: a ring of fence, grass inside. Scenery only (note 58).
const paddock = (x0, y0, x1, y1) =>
  rect(x0, y0, x1, y1, (x, y) => {
    const edge = x === x0 || x === x1 || y === y0 || y === y1;
    if (edge) solid(x, y, CLIFF);
    else {
      clear(x, y);
      ground[idx(x, y)] = GRASS;
      open(x, y);
    }
  });

// ---- the roads: to the farmstead, down to the tower, into the camp.
road(68, 35, 97, 37); // east from the lake's south shore path
road(95, 23, 97, 34); // north to the keeper's door
road(31, 71, 33, 95); // the west leg runs on south
road(23, 93, 30, 95); // to the tower door
road(75, 84, 89, 86); // from the farm road into the camp

// ---- the farmstead: keeper's house x 92 to 100, y 18 to 22, door (96, 22).
building(92, 18, 100, 22, 96, 3);
paddock(85, 26, 90, 32);
paddock(101, 26, 106, 32);
paddock(102, 16, 107, 22);

// ---- the hermit's tower: x 19 to 25, y 86 to 92, door (22, 92).
building(19, 86, 25, 92, 22, 3);

// ---- the Wanderer's camp: a tent, a bench and a fire.
rect(87, 80, 89, 82, (x, y) => solid(x, y, ROOF));
solid(82, 83, CLIFF);
solid(83, 83, CLIFF);
solid(85, 83, EARTH);

// Clutter the new buildings and roads displaced moves to free open ground in the
// middle of the map, so the Forest keeps its 40 rocks, 50 twigs and 60 weeds.
// Trees and forage are not moved (none stood in the way).
{
  const taken = new Set(
    markers.map((o) => `${Math.floor(o.x / T)},${Math.floor(o.y / T)}`),
  );
  let x = 40;
  let y = 46;
  for (const o of cleared) {
    if (!["rock", "twig", "weed"].includes(o.class)) continue;
    while (collision[idx(x, y)] || paths[idx(x, y)] || taken.has(`${x},${y}`)) {
      x += 2;
      if (x > 60) {
        x = 40;
        y += 2;
      }
    }
    taken.add(`${x},${y}`);
    o.x = x * T + 8;
    o.y = y * T + 8;
    markers.push(o);
  }
}

let id = map.nextobjectid;
const props = (o) =>
  Object.entries(o).map(([name, value]) => ({
    name,
    type: typeof value === "number" ? "int" : "string",
    value,
  }));
const mark = (name, cls, x, y, extra, rectSize) => ({
  id: id++,
  name,
  class: cls,
  type: cls,
  x: x * T + (rectSize ? 0 : 8),
  y: y * T + (rectSize ? 0 : 8),
  width: rectSize ? T : 0,
  height: rectSize ? T : 0,
  rotation: 0,
  visible: true,
  ...(rectSize ? {} : { point: true }),
  ...(extra ? { properties: props(extra) } : {}),
});
markers.push(
  mark(
    "farmstead",
    "exit",
    96,
    22,
    { map: "forest-farmstead", entry: "door" },
    true,
  ),
  mark("from_farmstead", "entry", 96, 23),
  mark("hermit", "exit", 22, 92, { map: "hermit-tower", entry: "door" }, true),
  mark("from_hermit", "entry", 22, 93),
  mark("camp", "service", 85, 83, { kind: "camp" }),
);
map.nextobjectid = id;
writeFileSync(url, JSON.stringify(map) + "\n");
console.log("displaced", cleared.map((o) => o.class).join(","));

// ---- the interiors, one room each (note 58).
const interior = (file, w, h, signX, outMap, outEntry, kind, name) => {
  const g = new Array(w * h).fill(PATH);
  const c = new Array(w * h).fill(0);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        g[y * w + x] = CLIFF;
        c[y * w + x] = 1;
      }
  const doorX = Math.floor(w / 2);
  g[1 * w + signX] = SIGN;
  g[(h - 1) * w + doorX] = DOOR;
  c[(h - 1) * w + doorX] = 0;
  let oid = 1;
  const m = (nm, cls, x, y, extra, size) => ({
    id: oid++,
    name: nm,
    class: cls,
    type: cls,
    x: x * T + (size ? 0 : 8),
    y: y * T + (size ? 0 : 8),
    width: size ? T : 0,
    height: size ? T : 0,
    rotation: 0,
    visible: true,
    ...(size ? {} : { point: true }),
    ...(extra ? { properties: props(extra) } : {}),
  });
  const tl = (lid, nm, data, visible) => ({
    id: lid,
    name: nm,
    type: "tilelayer",
    width: w,
    height: h,
    x: 0,
    y: 0,
    opacity: 1,
    visible,
    data,
  });
  const out = {
    type: "map",
    version: "1.10",
    tiledversion: "1.10.2",
    orientation: "orthogonal",
    renderorder: "right-down",
    infinite: false,
    tilewidth: T,
    tileheight: T,
    tilesets: map.tilesets,
    width: w,
    height: h,
    nextlayerid: 4,
    nextobjectid: 4,
    properties: [{ name: "placeholder", type: "bool", value: true }],
    layers: [
      tl(1, "ground", g, true),
      tl(2, "collision", c, false),
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
          m("door", "entry", doorX, h - 2),
          m(
            "door",
            "exit",
            doorX,
            h - 1,
            { map: outMap, entry: outEntry },
            true,
          ),
          m(name, "service", signX, 1, { kind }),
        ],
      },
    ],
  };
  writeFileSync(
    new URL(`../src/content/maps/${file}.json`, import.meta.url),
    JSON.stringify(out) + "\n",
  );
};
interior(
  "forest-farmstead",
  12,
  8,
  6,
  "forest",
  "from_farmstead",
  "keeper",
  "keeper",
);
interior("hermit-tower", 9, 9, 4, "forest", "from_hermit", "hermit", "hermit");
