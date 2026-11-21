// Renders every synthesised sound into public/audio/ and writes src/content/audio-manifest.json.
// Usage: node scripts/audio/build.mjs [--only <id>[,<id>]] [--kind sfx|ambient|music]
// Deterministic (seeded). Needs ffmpeg with libvorbis. Ids listed in external.json are not rendered.
import { Worker } from "node:worker_threads";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { DEFS_A } from "./sfx/defs-a.mjs";
import { DEFS_B } from "./sfx/defs-b.mjs";
import { AMBIENT } from "./sfx/ambient.mjs";
import { TRACKS } from "./music/tracks.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const outDir = join(root, "public", "audio");
const manifestPath = join(root, "src", "content", "audio-manifest.json");
const args = process.argv.slice(2);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = opt("--only")?.split(",");
const onlyKind = opt("--kind");

const external = JSON.parse(readFileSync(join(here, "external.json"), "utf8"));
const SFX = [...DEFS_A, ...DEFS_B];

const tasks = [];
for (const d of SFX) tasks.push({ kind: "sfx", id: d.id });
for (const d of AMBIENT) tasks.push({ kind: "ambient", id: d.id });
for (const t of TRACKS)
  if (!external.music[t.id]) tasks.push({ kind: "music", id: t.id });
const todo = tasks.filter(
  (t) => (!only || only.includes(t.id)) && (!onlyKind || t.kind === onlyKind),
);

mkdirSync(outDir, { recursive: true });
const results = new Map();
const pool = Math.min(12, todo.length);
let next = 0;
let failed = 0;
const t0 = Date.now();
await Promise.all(
  Array.from({ length: pool }, () => {
    const w = new Worker(join(here, "worker.mjs"));
    return new Promise((resolve) => {
      const feed = () => {
        if (next >= todo.length) {
          w.terminate();
          return resolve();
        }
        w.postMessage({ ...todo[next++], outDir });
      };
      w.on("message", (m) => {
        if (!m.ok) {
          failed++;
          console.error(`FAIL ${m.kind} ${m.id}: ${m.error}`);
        } else results.set(`${m.kind}:${m.id}`, m);
        feed();
      });
      w.on("error", (e) => {
        failed++;
        console.error(e);
        resolve();
      });
      feed();
    });
  }),
);
if (failed) process.exit(1);

// Manifest: built from the defs; loop points of ids not rendered this run come from the old manifest.
const old = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : { sfx: {}, ambient: {}, music: {} };
const manifest = { version: 1, sfx: {}, ambient: {}, music: {} };
for (const d of SFX) {
  const files = Array.from(
    { length: d.variants },
    (_, v) => `sfx/${d.variants > 1 ? `${d.id}_${v + 1}` : d.id}.ogg`,
  );
  manifest.sfx[d.id] = {
    files,
    gain: d.gain,
    pitch: d.pitch,
    gainJitter: d.gainJitter,
    cooldownMs: d.cooldownMs,
  };
}
const loops = (kind, id) => {
  const r = results.get(`${kind}:${id}`) ?? old[kind]?.[id];
  if (!r || r.loopStart === undefined)
    throw new Error(`no loop points for ${kind} ${id}: run a full build`);
  return { loopStart: +r.loopStart.toFixed(4), loopEnd: +r.loopEnd.toFixed(4) };
};
for (const d of AMBIENT)
  manifest.ambient[d.id] = {
    file: `ambient/${d.id}.ogg`,
    gain: d.gain,
    ...loops("ambient", d.id),
  };
for (const t of TRACKS) {
  const ext = external.music[t.id];
  const isLoop = ext ? ext.loop !== false : t.loop !== false;
  const pts = ext
    ? { loopStart: ext.loopStart, loopEnd: ext.loopEnd }
    : isLoop
      ? loops("music", t.id)
      : {};
  manifest.music[t.id] = {
    file: ext ? ext.file : `music/${t.id}.ogg`,
    gain: ext?.gain ?? 1,
    loop: isLoop,
    ...(isLoop ? pts : {}),
    source: ext ? "downloaded" : "synth",
  };
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `rendered ${todo.length} tasks in ${((Date.now() - t0) / 1000).toFixed(1)}s, manifest written`,
);
