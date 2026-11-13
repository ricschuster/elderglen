// DRAFT ONLY, DO NOT RUN (ADR 0014). This script overwrites a committed map that has
// since been edited by hand, so running it would drop working features. The committed
// JSON in src/content/maps/ is the source. Kept as a record of the first draft.
//
// Writes Thalwen's cottage (Tiled JSON), build issue #641, note 75 and note 09:
// the cottage on the Beach dunes in delta.json and the interior beach-elf-house.json.
// Run once: node scripts/drafts/gen-beach-elf-house.mjs && npx prettier --write src/content/maps/*.json
// The files it writes are the source from then on: edit them by hand or in Tiled.
import { readFileSync, writeFileSync } from "node:fs";

const MAPS = "src/content/maps/";
const T = 16;
// Placeholder tileset ids: 1 grass, 3 path, 7 wall (cliff), 8 roof, 9 door, 10 bed, 11 scroll, 12 crate.
const GRASS = 1;
const PATH = 3;
const WALL = 7;
const ROOF = 8;
const DOOR = 9;
const BED = 10;
const SCROLL = 11;
const CRATE = 12;

const props = (o) =>
  Object.entries(o).map(([name, value]) => ({
    name,
    type: typeof value === "number" ? "int" : "string",
    value,
  }));
const mk = (id, name, cls, x, y, extra = {}, rectangle = false) => ({
  id,
  name,
  class: cls,
  type: cls,
  x: rectangle ? x * T : x * T + 8,
  y: rectangle ? y * T : y * T + 8,
  width: rectangle ? T : 0,
  height: rectangle ? T : 0,
  rotation: 0,
  visible: true,
  ...(rectangle ? {} : { point: true }),
  ...(Object.keys(extra).length ? { properties: props(extra) } : {}),
});

// ---- the cottage on the Beach dunes: 7 by 5, x 77 to 83, y 23 to 27, door on
// the south wall at (80, 27), entry below it at (80, 28).
const HOUSE = { x0: 77, y0: 23, x1: 83, y1: 27, door: 80 };
const deltaUrl = new URL(`../${MAPS}delta.json`, import.meta.url);
const delta = JSON.parse(readFileSync(deltaUrl, "utf8"));
const W = delta.width;
const layer = (n) => delta.layers.find((l) => l.name === n && !l.properties);
const markers = delta.layers.find((l) => l.name === "markers");
if (!markers.objects.some((o) => o.name === "elf")) {
  for (let y = HOUSE.y0; y <= HOUSE.y1; y++)
    for (let x = HOUSE.x0; x <= HOUSE.x1; x++) {
      const i = y * W + x;
      layer("ground").data[i] = GRASS;
      layer("objects").data[i] = y <= HOUSE.y0 + 2 ? ROOF : WALL;
      layer("collision").data[i] = 1;
    }
  const d = HOUSE.y1 * W + HOUSE.door;
  layer("ground").data[d] = DOOR;
  layer("objects").data[d] = 0;
  layer("collision").data[d] = 0;
  layer("ground").data[(HOUSE.y1 + 1) * W + HOUSE.door] = PATH;
  let id = delta.nextobjectid;
  markers.objects.push(
    mk(id++, "from_elf", "entry", HOUSE.door, HOUSE.y1 + 1),
    mk(
      id++,
      "elf",
      "exit",
      HOUSE.door,
      HOUSE.y1,
      { map: "beach-elf-house", entry: "door" },
      true,
    ),
  );
  delta.nextobjectid = id;
  writeFileSync(deltaUrl, JSON.stringify(delta) + "\n");
}

// ---- the interior: 12 by 9. Her counter on the north wall, the pin stall.
// The half-packed trunk stands by the door, a bed and a table with shelves.
const grid = [
  "############",
  "#xx..1..xx.#",
  "#..........#",
  "#bb........#",
  "#..........#",
  "#........xx#",
  "#..........#",
  "#...t......#",
  "#####D######",
];
const w = grid[0].length;
const h = grid.length;
const g = new Array(w * h).fill(PATH);
const c = new Array(w * h).fill(0);
const markersOut = [];
let id = 1;
for (let y = 0; y < h; y++)
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const ch = grid[y][x];
    if (ch === "#") ((g[i] = WALL), (c[i] = 1));
    else if (ch === "x") ((g[i] = CRATE), (c[i] = 1));
    else if (ch === "b") ((g[i] = BED), (c[i] = 1));
    else if (ch === "t")
      ((g[i] = CRATE), (c[i] = 1)); // the half-packed trunk
    else if (ch === "1") ((g[i] = SCROLL), (c[i] = 1));
    else if (ch === "D") ((g[i] = DOOR), (c[i] = 0));
  }
const doorX = grid[h - 1].indexOf("D");
const stall = { x: grid[1].indexOf("1"), y: 1 };
markersOut.push(
  mk(id++, "door", "entry", doorX, h - 2),
  mk(
    id++,
    "door",
    "exit",
    doorX,
    h - 1,
    { map: "delta", entry: "from_elf" },
    true,
  ),
  mk(id++, "pin-stall", "service", stall.x, stall.y, { kind: "pin-stall" }),
);
const base = JSON.parse(
  readFileSync(new URL(`../${MAPS}fisher-hut.json`, import.meta.url), "utf8"),
);
const tl = (lid, name, data, visible = true) => ({
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
const house = {
  ...base,
  width: w,
  height: h,
  nextlayerid: 4,
  nextobjectid: id,
  properties: [{ name: "placeholder", type: "bool", value: true }],
  layers: [
    tl(1, "ground", g),
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
      objects: markersOut,
    },
  ],
};
writeFileSync(
  new URL(`../${MAPS}beach-elf-house.json`, import.meta.url),
  JSON.stringify(house) + "\n",
);
