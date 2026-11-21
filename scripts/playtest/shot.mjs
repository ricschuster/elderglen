// A picture only when the look is the question: crop, shrink and tile.
//   node scripts/playtest/shot.mjs <out.png> [--at 480,500,540] [--crop x,y,w,h] [--width 480] [--map farm]
// --at jumps the clock to each game minute (a multiple of 10) and takes a frame each;
// without --at it takes one frame now. Frames are cropped (screen pixels, default the
// whole screen), scaled to --width (default 480) and tiled three to a row into one file.
// Read the one output file, never the raw frames. Needs python3 with Pillow.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ADB, ev, sleep } from "./tablet-lib.mjs";

const args = process.argv.slice(2);
const out = args[0];
if (!out) {
  console.error(
    "usage: shot.mjs <out.png> [--at m,m] [--crop x,y,w,h] [--width 480] [--map id]",
  );
  process.exit(2);
}
const opt = (name, d) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? d : args[i + 1];
};
const times = opt("at", "") ? opt("at").split(",").map(Number) : [null];
const crop = opt("crop", "0,0,1920,1200").split(",").map(Number);
const width = Number(opt("width", "480"));
const map = opt("map", "");
const dir = mkdtempSync(join(tmpdir(), "shot-"));
const files = [];
for (const m of times) {
  if (m !== null || map) {
    const patch = {
      ...(m !== null ? { minutes: m } : {}),
      ...(map ? { map, entry: "door" } : {}),
    };
    await ev(`window.farmState(${JSON.stringify(patch)})`);
    await sleep(2500);
  }
  const png = execFileSync(ADB, ["exec-out", "screencap", "-p"], {
    maxBuffer: 1 << 26,
  });
  const f = join(dir, `f${files.length}.png`);
  writeFileSync(f, png);
  files.push(f);
}
const py = `
import sys
from PIL import Image
out, width, x, y, w, h, *files = sys.argv[1:]
width, x, y, w, h = map(int, (width, x, y, w, h))
frames = [Image.open(f).convert("RGB").crop((x, y, x + w, y + h)) for f in files]
fh = int(h * width / w)
cols = min(3, len(frames))
rows = (len(frames) + cols - 1) // cols
sheet = Image.new("RGB", (cols * width, rows * fh))
for i, im in enumerate(frames):
    sheet.paste(im.resize((width, fh), Image.NEAREST), ((i % cols) * width, (i // cols) * fh))
sheet.save(out)
`;
execFileSync("python3", [
  "-I",
  "-c",
  py,
  out,
  String(width),
  ...crop.map(String),
  ...files,
]);
console.log(`${out} (${files.length} frame${files.length > 1 ? "s" : ""})`);
