// Turn a downloaded (or hand made) music file into a shipped, looping slot.
// Usage: node scripts/audio/ingest.mjs <input> <slot-id> [--loopready] [--xfade 3] [--max 150]
//          [--oneshot (a stinger, no loop)] [--lufs -18] [--q 2] [--licence CC0] [--author "Name"] [--title "Title"] [--url https://...]
// Steps: decode to stereo 44.1 kHz, trim silence at both ends, cap the length, cross fade the tail into
// the head (unless --loopready) so the loop point is seamless, wrap with loop pre-roll, normalise to the
// target loudness, encode Ogg Vorbis to public/audio/music/<slot-id>.ogg, record the slot in external.json
// and add a ledger row to docs/reference/audio/LICENCES.md when --author and --url are given.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
import { SR, LOOP_PAD } from "./lib/dsp.mjs";
import { decodeFile, encodeOgg, measureLufs } from "./lib/encode.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const [input, id] = argv;
if (!input || !id) {
  console.error("usage: ingest.mjs <input> <slot-id> [options]");
  process.exit(2);
}
const CH = 2;
let x = decodeFile(input, CH, SR);
const frames = () => x.length / CH;

// Trim silence below -50 dBFS at both ends.
const thr = Math.pow(10, -50 / 20);
let a = 0;
while (
  a < frames() &&
  Math.abs(x[a * CH]) < thr &&
  Math.abs(x[a * CH + 1]) < thr
)
  a++;
let b = frames();
while (
  b > a &&
  Math.abs(x[(b - 1) * CH]) < thr &&
  Math.abs(x[(b - 1) * CH + 1]) < thr
)
  b--;
x = x.slice(a * CH, b * CH);

const max = parseFloat(val("--max", "150")) * SR;
if (frames() > max) x = x.slice(0, max * CH);

const oneshot = flag("--oneshot");
if (!flag("--loopready") && !oneshot) {
  const xf = Math.round(parseFloat(val("--xfade", "3")) * SR);
  const L = frames() - xf;
  // y = x[xf..L] followed by blend(tail fading out, head fading in): the end then flows into y[0] = x[xf].
  const body = x.subarray(xf * CH, L * CH);
  const y = new Float32Array((body.length / CH + xf) * CH);
  y.set(body, 0);
  const base = body.length;
  for (let i = 0; i < xf; i++) {
    const t = i / xf;
    const fo = Math.cos(t * Math.PI * 0.5);
    const fi = Math.sin(t * Math.PI * 0.5);
    for (let c = 0; c < CH; c++)
      y[base + i * CH + c] = x[(L + i) * CH + c] * fo + x[i * CH + c] * fi;
  }
  x = y;
}
const loopFrames = frames();
const pad = Math.round(LOOP_PAD * SR);
const wrapped = new Float32Array((loopFrames + 2 * pad) * CH);
wrapped.set(x.subarray((loopFrames - pad) * CH), 0);
wrapped.set(x, pad * CH);
wrapped.set(x.subarray(0, pad * CH), (pad + loopFrames) * CH);

if (oneshot) {
  // A stinger: no loop, a short fade at the end so the file does not stop on a click.
  const f = Math.round(0.15 * SR);
  for (let i = 0; i < f; i++)
    for (let c = 0; c < CH; c++) x[(frames() - 1 - i) * CH + c] *= i / f;
}
const target = parseFloat(val("--lufs", "-18"));
const out = oneshot ? x : wrapped;
const { lufs } = measureLufs(out, CH);
const file = join(root, "public", "audio", "music", `${id}.ogg`);
encodeOgg(out, file, {
  ch: CH,
  q: parseFloat(val("--q", "2")),
  gainDb: target - lufs,
});

const extPath = join(here, "external.json");
const ext = JSON.parse(readFileSync(extPath, "utf8"));
ext.music[id] = oneshot
  ? { file: `music/${id}.ogg`, gain: 1, loop: false, from: basename(input) }
  : {
      file: `music/${id}.ogg`,
      gain: 1,
      loop: true,
      loopStart: LOOP_PAD,
      loopEnd: +(LOOP_PAD + loopFrames / SR).toFixed(4),
      from: basename(input),
    };
writeFileSync(extPath, JSON.stringify(ext, null, 2) + "\n");

const ledger = join(root, "docs", "reference", "audio", "LICENCES.md");
if (val("--author") && val("--url") && existsSync(ledger)) {
  const row = `| music/${id}.ogg | ${val("--title", id)} | ${val("--author")} | ${val("--licence", "CC0")} | ${val("--url")} |\n`;
  const text = readFileSync(ledger, "utf8");
  if (!text.includes(`| music/${id}.ogg |`))
    writeFileSync(ledger, text.replace(/\n*$/, "\n") + row);
}
console.log(
  `${id}: ${(loopFrames / SR).toFixed(1)} s loop, was ${lufs.toFixed(1)} LUFS, now ${target}`,
);
