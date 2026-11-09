// Writes the Hearthwell interiors (Tiled JSON), build issue #646, step 3 of
// docs/design/77_hearthwell.md: the six shop-and-home shells, the Outpost's two
// maps and the three burrows, and opens the ten shut lot doors in hearthwell.json.
// Run once: node scripts/gen-hearthwell-interiors.mjs && npx prettier --write src/content/maps/*.json
// The files it writes are the source from then on: edit them by hand or in Tiled.
import { readFileSync, writeFileSync } from "node:fs";

const MAPS = "src/content/maps/";

// Placeholder tileset ids: 3 path (floor), 7 wall, 9 door, 10 bed, 11 scroll, 12 crate.
const FLOOR = 3;
const WALL = 7;
const DOOR = 9;
const BED = 10;
const SCROLL = 11;
const CRATE = 12;

// Grid glyphs: # wall, . floor, D door (the way out), R door to another room of
// the same building, b bed, x furniture (shelf, table, stove: solid), n notice
// wall (solid), 1 to 2 a counter or station (solid, a service, see `services`).
const SHOP_DOOR = "#######D######";
const maps = {
  "general-store": {
    grid: [
      "##############",
      "#xxx.1.xxxx..#",
      "#............#",
      "#.xx......xx.#",
      "#............#",
      "#.xx......xx.#",
      "#............#",
      "#.bb.........#",
      "#............#",
      SHOP_DOOR,
    ],
    out: ["hearthwell", "from_general-store"],
    services: { 1: ["shop", "shop"] },
  },
  healer: {
    grid: [
      "##############",
      "#xxx..1..xxxx#",
      "#............#",
      "#.bb......bb.#",
      "#............#",
      "#.bb......bb.#",
      "#............#",
      "#.x........x.#",
      "#............#",
      SHOP_DOOR,
    ],
    out: ["hearthwell", "from_healer"],
    services: { 1: ["counter", "counter-healer"] },
  },
  inn: {
    grid: [
      "##############",
      "#x..xx1xx...x#",
      "#............#",
      "#.xx..xx..xx.#",
      "#............#",
      "#.xx..xx..xx.#",
      "#............#",
      "#.bb.bb.bb.bb#",
      "#............#",
      SHOP_DOOR,
    ],
    out: ["hearthwell", "from_inn"],
    services: { 1: ["counter", "counter-inn"] },
  },
  library: {
    grid: [
      "##############",
      "#xxxxx1xxxxxx#",
      "#............#",
      "#.xxxx..xxxx.#",
      "#............#",
      "#.xxxx..xxxx.#",
      "#............#",
      "#...xx..xx...#",
      "#............#",
      SHOP_DOOR,
    ],
    out: ["hearthwell", "from_library"],
    services: { 1: ["counter", "counter-library"] },
  },
  smithy: {
    grid: [
      "##############",
      "#xx...1..xxxx#",
      "#............#",
      "#.xx......xx.#",
      "#............#",
      "#....xx......#",
      "#............#",
      "#.bb.........#",
      "#............#",
      SHOP_DOOR,
    ],
    out: ["hearthwell", "from_smithy"],
    services: { 1: ["smithy", "smith"] },
  },
  hatter: {
    grid: [
      "##############",
      "#xxx..1..xxxx#",
      "#............#",
      "#.xx......xx.#",
      "#............#",
      "#.xx......xx.#",
      "#............#",
      "#.bb.........#",
      "#............#",
      SHOP_DOOR,
    ],
    out: ["hearthwell", "from_hatter"],
    services: { 1: ["counter", "counter-hatter"] },
  },
  outpost: {
    grid: [
      "############R#",
      "#nnn.1.nnnnn.#",
      "#............#",
      "#.xxxxxx.....#",
      "#............#",
      "#.xx.........#",
      "#............#",
      "#.xx....xx...#",
      "#............#",
      SHOP_DOOR,
    ],
    out: ["hearthwell", "from_outpost"],
    // The way to the steward's rooms is the R door on the top wall.
    rooms: { at: [12, 0], to: ["outpost-rooms", "door"], entry: "from_rooms" },
    services: { 1: ["counter", "counter-outpost"] },
  },
  "outpost-rooms": {
    grid: [
      "##########",
      "#bb.xx..x#",
      "#........#",
      "#.xx.....#",
      "#........#",
      "#....xx..#",
      "#........#",
      "####D#####",
    ],
    out: ["outpost", "from_rooms"],
    services: {},
  },
  "burrow-gardener": {
    grid: [
      "########",
      "#b.xx.x#",
      "#......#",
      "#.x....#",
      "#...xx.#",
      "#......#",
      "###D####",
    ],
    out: ["hearthwell", "from_burrow-gardener"],
    services: {},
  },
  "burrow-retired": {
    grid: [
      "########",
      "#bbb.xx#",
      "#......#",
      "#.xx...#",
      "#....x.#",
      "#......#",
      "###D####",
    ],
    out: ["hearthwell", "from_burrow-retired"],
    services: {},
  },
  "burrow-young": {
    grid: [
      "########",
      "#bb.xxx#",
      "#......#",
      "#......#",
      "#.xx.x.#",
      "#......#",
      "###D####",
    ],
    out: ["hearthwell", "from_burrow-young"],
    services: {},
  },
};

const T = 16;
const str = (name, value) => ({ name, type: "string", value });
const layerBase = { opacity: 1, x: 0, y: 0 };
let nextId = 1;

function build(id, m) {
  const h = m.grid.length;
  const w = m.grid[0].length;
  if (m.grid.some((r) => r.length !== w)) throw new Error(`${id}: ragged grid`);
  const ground = [];
  const collision = [];
  const objects = [];
  let door;
  let rooms;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = m.grid[y][x];
      const solid = c !== "." && c !== "D" && c !== "R";
      collision.push(solid ? 1 : 0);
      ground.push(
        {
          "#": WALL,
          ".": FLOOR,
          D: DOOR,
          R: DOOR,
          b: BED,
          x: CRATE,
          n: SCROLL,
        }[c] ?? CRATE,
      );
      if (c === "D") door = [x, y];
      if (c === "R") rooms = [x, y];
    }
  const point = (name, cls, x, y, props) => ({
    id: nextId++,
    name,
    class: cls,
    type: cls,
    x: x * T + T / 2,
    y: y * T + T / 2,
    width: 0,
    height: 0,
    point: true,
    rotation: 0,
    visible: true,
    ...(props ? { properties: props } : {}),
  });
  const exit = (name, x, y, map, entry) => ({
    id: nextId++,
    name,
    class: "exit",
    type: "exit",
    x: x * T,
    y: y * T,
    width: T,
    height: T,
    rotation: 0,
    visible: true,
    properties: [str("map", map), str("entry", entry)],
  });
  objects.push(point("door", "entry", door[0], door[1] - 1));
  objects.push(exit("door", door[0], door[1], m.out[0], m.out[1]));
  if (m.rooms) {
    objects.push(point(m.rooms.entry, "entry", rooms[0], rooms[1] + 1));
    objects.push(exit("rooms", rooms[0], rooms[1], ...m.rooms.to));
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = m.services[m.grid[y][x]];
      if (s) objects.push(point(s[0], "service", x, y, [str("kind", s[1])]));
    }
  return {
    type: "map",
    version: "1.10",
    tiledversion: "1.10.2",
    orientation: "orthogonal",
    renderorder: "right-down",
    infinite: false,
    width: w,
    height: h,
    tilewidth: T,
    tileheight: T,
    nextlayerid: 4,
    nextobjectid: nextId,
    properties: [{ name: "placeholder", type: "bool", value: true }],
    tilesets: JSON.parse(readFileSync(MAPS + "sawmill.json", "utf8")).tilesets,
    layers: [
      {
        id: 1,
        name: "ground",
        type: "tilelayer",
        width: w,
        height: h,
        ...layerBase,
        visible: true,
        data: ground,
      },
      {
        id: 2,
        name: "collision",
        type: "tilelayer",
        width: w,
        height: h,
        ...layerBase,
        visible: false,
        data: collision,
      },
      {
        id: 3,
        name: "markers",
        type: "objectgroup",
        draworder: "topdown",
        ...layerBase,
        visible: true,
        objects,
      },
    ],
  };
}

for (const [id, m] of Object.entries(maps))
  writeFileSync(MAPS + `${id}.json`, JSON.stringify(build(id, m)));

// ---- open the ten shut lot doors in hearthwell.json and drop the stand-ins.
const town = JSON.parse(readFileSync(MAPS + "hearthwell.json", "utf8"));
const W = town.width;
const layer = (n) => town.layers.find((l) => l.name === n);
const markers = layer("markers");
let oid = Math.max(...markers.objects.map((o) => o.id)) + 1;
const doors = {
  "general-store": [22, 28],
  healer: [41, 28],
  inn: [22, 59],
  library: [41, 59],
  smithy: [22, 89],
  hatter: [41, 89],
  outpost: [88, 12],
  "burrow-gardener": [68, 28],
  "burrow-retired": [66, 84],
  "burrow-young": [8, 59],
};
// The store counter and the smithy counter move inside.
markers.objects = markers.objects.filter(
  (o) => !(o.class === "service" && ["shop", "smithy"].includes(o.name)),
);
for (const [id, [x, y]] of Object.entries(doors)) {
  layer("collision").data[y * W + x] = 0;
  if (markers.objects.some((o) => o.class === "exit" && o.name === id))
    continue;
  markers.objects.push({
    id: oid++,
    name: id,
    class: "exit",
    type: "exit",
    x: x * T,
    y: y * T,
    width: T,
    height: T,
    rotation: 0,
    visible: true,
    properties: [str("map", id), str("entry", "door")],
  });
}
town.nextobjectid = oid;
writeFileSync(MAPS + "hearthwell.json", JSON.stringify(town));
