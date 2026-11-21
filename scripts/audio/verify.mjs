// Objective checks of every audio file in the manifest: clipping, true peak, loudness, head and tail
// silence, loop seam, duration, total size. Exit code 1 when a hard limit fails. No ears needed.
// Usage: node scripts/audio/verify.mjs [--json out.json]
import { readFileSync, statSync, existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const audio = join(root, "public", "audio");
const manifest = JSON.parse(
  readFileSync(join(root, "src", "content", "audio-manifest.json"), "utf8"),
);

const items = [];
for (const [id, s] of Object.entries(manifest.sfx))
  for (const f of s.files) items.push({ kind: "sfx", id, file: f });
for (const [id, a] of Object.entries(manifest.ambient))
  items.push({
    kind: "ambient",
    id,
    file: a.file,
    loop: true,
    ls: a.loopStart,
    le: a.loopEnd,
  });
for (const [id, m] of Object.entries(manifest.music))
  items.push({
    kind: "music",
    id,
    file: m.file,
    loop: m.loop,
    ls: m.loopStart,
    le: m.loopEnd,
  });

const SR = 44100;
function decode(path) {
  const r = spawnSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      path,
      "-f",
      "f32le",
      "-ar",
      String(SR),
      "-ac",
      "1",
      "-",
    ],
    { maxBuffer: 1 << 30 },
  );
  const b = r.stdout;
  return new Float32Array(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
}
function loudness(path) {
  const r = spawnSync(
    "ffmpeg",
    [
      "-nostats",
      "-hide_banner",
      "-i",
      path,
      "-af",
      "ebur128=peak=true",
      "-f",
      "null",
      "-",
    ],
    { maxBuffer: 1 << 26 },
  );
  const t = r.stderr.toString();
  const tail = t.slice(t.lastIndexOf("Summary:"));
  const i = /I:\s+(-?[\d.]+)\s+LUFS/.exec(tail);
  const p = /Peak:\s+(-?[\d.]+)\s+dBFS/.exec(tail);
  return { lufs: i ? +i[1] : -70, tp: p ? +p[1] : -70 };
}
const rms = (x, a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
};

const rows = [];
const problems = [];
let total = 0;
for (const it of items) {
  const path = join(audio, it.file);
  if (!existsSync(path)) {
    problems.push(`${it.file}: missing`);
    continue;
  }
  const size = statSync(path).size;
  total += size;
  let x = decode(path);
  const { lufs, tp } = loudness(path);
  let peak = 0,
    clip = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > peak) peak = a;
    if (a >= 0.999) clip++;
  }
  const dur = x.length / SR;
  const fullLen = x.length;
  const thr = Math.max(0.01, peak * 0.03);
  let head = 0;
  while (head < x.length && Math.abs(x[head]) < thr) head++;
  let tail = 0;
  while (tail < x.length && Math.abs(x[x.length - 1 - tail]) < thr) tail++;
  // Loop seam: the jump from the last sample to the first against the typical sample to sample step.
  let seam = 0,
    levelJump = 0;
  if (it.loop) {
    const full = x;
    const a0 = Math.round(it.ls * SR);
    const a1 = Math.round(it.le * SR);
    if (a1 > full.length + 2)
      problems.push(
        `${it.file}: loopEnd ${it.le} s is past the end (${(full.length / SR).toFixed(2)} s)`,
      );
    x = full.subarray(a0, Math.min(a1, full.length));
    let d2 = 0;
    for (let i = 1; i < x.length; i++) d2 += (x[i] - x[i - 1]) ** 2;
    const step = Math.sqrt(d2 / x.length) + 1e-6;
    seam = Math.abs(x[0] - x[x.length - 1]) / step;
    const n = Math.round(1.0 * SR);
    levelJump =
      20 *
      Math.log10(
        (rms(x, 0, n) + 1e-9) / (rms(x, x.length - n, x.length) + 1e-9),
      );
  }
  const row = {
    ...it,
    size,
    dur: +dur.toFixed(2),
    peakDb: +(20 * Math.log10(peak + 1e-9)).toFixed(1),
    tp,
    lufs,
    clip,
    headMs: Math.round((head / SR) * 1000),
    tailMs: Math.round((tail / SR) * 1000),
    seam: +seam.toFixed(2),
    levelJump: +levelJump.toFixed(1),
  };
  rows.push(row);
  const bad = (m) => problems.push(`${it.file}: ${m}`);
  if (clip > 0) bad(`${clip} clipped samples`);
  if (tp > -0.5) bad(`true peak ${tp} dBTP over -0.5`);
  if (dur < 0.03) bad("empty or too short");
  if (it.kind === "sfx" && row.headMs > 40)
    bad(`head silence ${row.headMs} ms`);
  if (it.kind === "music" && it.loop && (lufs < -22 || lufs > -14))
    bad(`music loudness ${lufs} LUFS outside -22..-14`);
  if (it.kind === "ambient" && lufs > -22) bad(`ambient too loud ${lufs} LUFS`);
  if (it.loop && seam > 6)
    bad(`loop seam jump ${seam.toFixed(1)}x the local step`);
  if (it.kind === "music" && it.loop && Math.abs(levelJump) > 12)
    bad(`loop level jump ${levelJump} dB between tail and head`);
  if (it.loop && x.length / SR < 8)
    bad(`loop shorter than 8 s (${(x.length / SR).toFixed(1)})`);
}
const mb = total / 1048576;
if (mb > 28)
  problems.push(
    `total size ${mb.toFixed(1)} MB over the 28 MB limit (budget 30)`,
  );

const pad = (s, n) => String(s).padEnd(n);
console.log(
  pad("file", 34) +
    pad("dur", 8) +
    pad("peak", 7) +
    pad("TP", 7) +
    pad("LUFS", 7) +
    pad("head", 6) +
    pad("tail", 6) +
    pad("seam", 6) +
    "KB",
);
for (const r of rows)
  if (r.kind !== "sfx" || process.argv.includes("--all"))
    console.log(
      pad(r.file, 34) +
        pad(r.dur, 8) +
        pad(r.peakDb, 7) +
        pad(r.tp, 7) +
        pad(r.lufs, 7) +
        pad(r.headMs, 6) +
        pad(r.tailMs, 6) +
        pad(r.seam, 6) +
        Math.round(r.size / 1024),
    );
const by = (k) => rows.filter((r) => r.kind === k);
console.log(
  `\nfiles ${rows.length} (sfx ${by("sfx").length}, ambient ${by("ambient").length}, music ${by("music").length}); total ${mb.toFixed(2)} MB`,
);
const sfx = by("sfx");
console.log(
  `sfx: max peak ${Math.max(...sfx.map((r) => r.peakDb))} dBFS, max head silence ${Math.max(...sfx.map((r) => r.headMs))} ms, max dur ${Math.max(...sfx.map((r) => r.dur))} s`,
);
const mus = by("music").filter((r) => r.loop);
console.log(
  `music loops: LUFS ${Math.min(...mus.map((r) => r.lufs))}..${Math.max(...mus.map((r) => r.lufs))}, worst seam ${Math.max(...mus.map((r) => r.seam))}`,
);
const jsonOut = process.argv.indexOf("--json");
if (jsonOut > 0)
  writeFileSync(process.argv[jsonOut + 1], JSON.stringify(rows, null, 1));
if (problems.length) {
  console.log(`\n${problems.length} PROBLEMS`);
  for (const p of problems) console.log(" - " + p);
  process.exit(1);
}
console.log("\nverify: all checks passed");
