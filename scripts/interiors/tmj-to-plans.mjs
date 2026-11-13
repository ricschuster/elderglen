#!/usr/bin/env node
// Write src/scenes/interior-plans.ts from the interior drafts (note 86, note 99).
//
//   node scripts/interiors/tmj-to-plans.mjs
//
// The map files keep only three stand-in ids for furniture (bed, scroll, bin), so the
// painter cannot tell a counter from a table. The drafts still know: this copies each
// draft's fixture letters (the plan characters of gen.py) into one small table the
// interiors pass reads. A cell where the map and the table disagree is ignored by the
// painter, which then guesses from the room. Not an npm script and not a CI gate; run it
// after a draft changes, then `npm run format`.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DRAFTS = join(ROOT, "docs/design/drafts/interiors-draft");
const MAPS = join(ROOT, "src/content/maps");
// Draft names that differ from the map id.
const RENAME = { "hut-fisher": "fisher-hut", "hut-fisher-loft": "fisher-loft" };
// Draft fixture gid to plan letter (gen.py FIX).
const LETTER = {
  6: "C",
  7: "S",
  8: "B",
  9: "T",
  10: "K",
  11: "X",
  12: "W",
  13: "H",
  14: "Q",
  15: "L",
};
// The stand-in id each letter became in the map file (tmj-to-map.mjs FIXTURE).
const STAND_IN = {
  C: 11,
  S: 12,
  B: 10,
  T: 11,
  K: 11,
  X: 12,
  W: 12,
  H: 12,
  Q: 11,
  L: 11,
};

const out = {};
for (const file of readdirSync(DRAFTS).sort()) {
  if (!file.endsWith(".tmj")) continue;
  const draftId = file.slice(0, -4);
  const id = RENAME[draftId] ?? draftId;
  const draft = JSON.parse(readFileSync(join(DRAFTS, file), "utf8"));
  const fx = draft.layers.find((l) => l.name === "fixtures").data;
  const mapPath = join(MAPS, `${id}.json`);
  if (!existsSync(mapPath)) {
    console.warn(`warning: no map file for draft ${draftId}`);
    continue;
  }
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const mapFx = map.layers.find((l) => l.name === "fixtures")?.data ?? [];
  if (map.width !== draft.width || map.height !== draft.height)
    console.warn(`warning (${id}): the map and the draft differ in size`);
  let off = 0;
  const rows = [];
  for (let y = 0; y < draft.height; y++) {
    let row = "";
    for (let x = 0; x < draft.width; x++) {
      const ch = LETTER[fx[y * draft.width + x]] ?? " ";
      row += ch;
      const want = ch === " " ? 0 : STAND_IN[ch];
      if (map.width === draft.width && (mapFx[y * map.width + x] ?? 0) !== want)
        off++;
    }
    rows.push(row.trimEnd());
  }
  if (off) console.warn(`warning (${id}): ${off} cells differ from the map`);
  out[id] = rows;
}

const text = `// Made by scripts/interiors/tmj-to-plans.mjs from the interior drafts. Do not edit by hand.
// One string per map row: the plan letter of each fixture cell (C counter, S shelf, B bed,
// T table, K kitchen strip, X crate or bin, W workstation, H hearth, Q seat, L display).
export const INTERIOR_PLANS: Record<string, readonly string[]> = ${JSON.stringify(out, null, 2)};
`;
writeFileSync(join(ROOT, "src/scenes/interior-plans.ts"), text);
console.log(`${Object.keys(out).length} plans -> src/scenes/interior-plans.ts`);
