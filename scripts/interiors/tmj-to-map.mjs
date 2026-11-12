#!/usr/bin/env node
// Convert a checked interior draft into the game's map file (note 86, build work).
//
//   node scripts/interiors/tmj-to-map.mjs <draft-id> [more ids...]
//
// Reads docs/design/drafts/interiors-draft/<id>.tmj and writes
// src/content/maps/<id>.json. Not an npm script and not a CI gate; run it, then
// `npm run format`, and review the diff. The draft's ground and fixtures layers become
// the game's `ground`, `fixtures` (drawn) and `collision` (walls, void and fixtures)
// layers on the placeholder tileset (see TILE below). The draft's `markers` points
// (centred on a tile) map across by their names:
//   door-1, door-2 ...      one `exit` rectangle over the door row (default target is
//                           the old file's `door` exit, else hearthwell:from_<id>), plus
//                           a `door` entry on entry-1 (the game's one named entry).
//   service-<x>-<n>         `service` points, moved onto the adjacent counter tile (a
//                           service is solid and faced from beside). The id and kind
//                           come from the old map's services, in order (the first
//                           group takes the first old service); n above 1 gets id-<n>.
//                           Without an old file: kind `counter`, id `counter-<x>`.
//   door-gated-<name>-<n>   a `gate` rectangle (property gate = friendship:<name>:2,
//                           the 2 hearts rule, note 61) over the gate tiles. The tiles
//                           stay walkable: nothing in src/ reads `gate` yet.
//   everything else         (entry-N, door-N, spot-*, bed-*, door-kitchen-*, door-gated-*)
//                           a `mark` object of the same name (the route marks).
// Limits: draft fixtures are tiles only (no `fixture` objects with a kind); extra
// exits (the Outpost's steward door, the fisher's ladder, a loft) are not in the draft
// points, so any old `exit` or `entry` object other than `door` is carried over from the
// existing map with a warning to check its position; other old layers are dropped.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DRAFTS = join(ROOT, "docs/design/drafts/interiors-draft");
const MAPS = join(ROOT, "src/content/maps");
const T = 16;

// Draft swatch gids to the game's placeholder tileset ids (12 tiles: 3 path, 5 pale
// earth, 7 wall, 9 door, 10 bed, 11 scroll, 12 crate). All placeholders until M3d art.
const GROUND = { 2: 7, 3: 3, 4: 5, 5: 9, 16: 9 }; // wall, floor, rug, door, gated door
const FIXTURE = {
  6: 11,
  7: 12,
  8: 10,
  9: 11,
  10: 11,
  11: 12,
  12: 12,
  13: 12,
  14: 11,
  15: 11,
};
const COUNTER_GID = 6;

const str = (name, value) => ({ name, type: "string", value });
const warn = (id, msg) => console.warn(`warning (${id}): ${msg}`);

function convert(id) {
  const draft = JSON.parse(readFileSync(join(DRAFTS, `${id}.tmj`), "utf8"));
  const { width: W, height: H } = draft;
  const layer = (n) => draft.layers.find((l) => l.name === n);
  const gd = layer("ground").data;
  const fx = layer("fixtures").data;
  const pts = layer("markers").objects.map((o) => ({
    name: o.name,
    x: Math.floor(o.x / T),
    y: Math.floor(o.y / T),
  }));
  const at = (x, y) => y * W + x;

  const ground = gd.map((g) => (g === 0 ? 0 : (GROUND[g] ?? 3)));
  const fixtures = fx.map((f) => (f === 0 ? 0 : (FIXTURE[f] ?? 12)));
  const collision = gd.map((g, i) =>
    g === 2 || g === 0 || fx[i] !== 0 ? 1 : 0,
  );

  const oldPath = join(MAPS, `${id}.json`);
  const old = existsSync(oldPath)
    ? JSON.parse(readFileSync(oldPath, "utf8"))
    : null;
  const oldObjs = (old?.layers ?? [])
    .filter((l) => l.type === "objectgroup")
    .flatMap((l) => l.objects);
  const oldDoor = oldObjs.find((o) => o.class === "exit" && o.name === "door");
  const prop = (o, n) => o?.properties?.find((p) => p.name === n)?.value;
  const target = [
    prop(oldDoor, "map") ?? "hearthwell",
    prop(oldDoor, "entry") ?? `from_${id}`,
  ];
  const oldServices = oldObjs.filter((o) => o.class === "service");

  const objects = [];
  let oid = 1;
  const add = (o) =>
    objects.push({ id: oid++, rotation: 0, visible: true, ...o });
  const point = (name, cls, x, y, properties) =>
    add({
      name,
      class: cls,
      type: cls,
      x: x * T,
      y: y * T,
      width: 0,
      height: 0,
      point: true,
      ...(properties ? { properties } : {}),
    });
  const rect = (name, cls, x0, y0, x1, y1, properties) =>
    add({
      name,
      class: cls,
      type: cls,
      x: x0 * T,
      y: y0 * T,
      width: (x1 - x0 + 1) * T,
      height: (y1 - y0 + 1) * T,
      ...(properties ? { properties } : {}),
    });
  const span = (list) => ({
    x0: Math.min(...list.map((p) => p.x)),
    y0: Math.min(...list.map((p) => p.y)),
    x1: Math.max(...list.map((p) => p.x)),
    y1: Math.max(...list.map((p) => p.y)),
  });

  // Entry and exit from the door pair.
  const entries = pts.filter((p) => /^entry-\d+$/.test(p.name));
  const doors = pts.filter((p) => /^door-\d+$/.test(p.name));
  if (!entries.length || !doors.length)
    throw new Error(`${id}: no entry-N / door-N points`);
  point("door", "entry", entries[0].x, entries[0].y);
  const d = span(doors);
  rect("door", "exit", d.x0, d.y0, d.x1, d.y1, [
    str("map", target[0]),
    str("entry", target[1]),
  ]);

  // Services, one group per `service-<x>`.
  const groups = [];
  for (const p of pts) {
    const m = /^service-(.+)-(\d+)$/.exec(p.name);
    if (!m) continue;
    let g = groups.find((q) => q.x === m[1]);
    if (!g) groups.push((g = { x: m[1], list: [] }));
    g.list.push({ ...p, n: Number(m[2]) });
  }
  groups.forEach((g, gi) => {
    const old1 = oldServices[gi];
    const sid = old1?.name ?? `counter-${g.x}`;
    const kind = prop(old1, "kind") ?? "counter";
    for (const p of g.list) {
      let { x, y } = p;
      if (fx[at(x, y)] === 0) {
        const near = [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ]
          .map(([dx, dy]) => [x + dx, y + dy])
          .filter(
            ([nx, ny]) =>
              nx >= 0 && ny >= 0 && nx < W && ny < H && fx[at(nx, ny)] !== 0,
          );
        const best =
          near.find(([nx, ny]) => fx[at(nx, ny)] === COUNTER_GID) ?? near[0];
        if (best) [x, y] = best;
        else warn(id, `${p.name} has no fixture beside it`);
      }
      point(p.n === 1 ? sid : `${sid}-${p.n}`, "service", x, y, [
        str("kind", kind),
      ]);
    }
  });

  // Gates (ground gid 16 tiles), one rectangle per name, and every other point a mark.
  const gated = new Map();
  for (const p of pts) {
    const m = /^door-gated-(.+)-\d+$/.exec(p.name);
    if (m) gated.set(m[1], [...(gated.get(m[1]) ?? []), p]);
  }
  for (const [name, list] of gated) {
    const s = span(list);
    rect(`door-gated-${name}`, "gate", s.x0, s.y0, s.x1, s.y1, [
      str("gate", `friendship:${name}:2`),
    ]);
  }
  for (const p of pts)
    if (!/^service-/.test(p.name)) point(p.name, "mark", p.x, p.y);

  // Carry over extra exits and entries from the old map.
  for (const o of oldObjs) {
    if (o.name === "door" && (o.class === "exit" || o.class === "entry"))
      continue;
    if (o.class !== "exit" && o.class !== "entry") continue;
    warn(id, `carried over old ${o.class} "${o.name}"; check its position`);
    add({ ...o, id: undefined });
  }

  const base = (i, name, type) => ({
    id: i,
    name,
    type,
    opacity: 1,
    x: 0,
    y: 0,
    visible: true,
  });
  const tiles = (i, name, data, visible) => ({
    ...base(i, name, "tilelayer"),
    width: W,
    height: H,
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
    width: W,
    height: H,
    tilewidth: T,
    tileheight: T,
    nextlayerid: 5,
    nextobjectid: oid,
    properties: [{ name: "placeholder", type: "bool", value: true }],
    tilesets: old?.tilesets ?? [
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
      tiles(1, "ground", ground, true),
      tiles(2, "fixtures", fixtures, true),
      tiles(3, "collision", collision, false),
      { ...base(4, "markers", "objectgroup"), draworder: "topdown", objects },
    ],
  };
  writeFileSync(oldPath, JSON.stringify(out));
  console.log(
    `${id}: ${W} by ${H}, ${objects.length} objects -> src/content/maps/${id}.json`,
  );
}

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error(
    "usage: node scripts/interiors/tmj-to-map.mjs <draft-id> [...]",
  );
  process.exit(1);
}
ids.forEach(convert);
