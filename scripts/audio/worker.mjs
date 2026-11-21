// One render task, run in a worker thread by build.mjs.
import { parentPort } from "node:worker_threads";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import {
  rngOf,
  normalisePeak,
  declick,
  dcBlock,
  scale,
  dbToGain,
  padLoop,
  LOOP_PAD,
  SR,
} from "./lib/dsp.mjs";
import { encodeOgg, measureLufs } from "./lib/encode.mjs";
import { DEFS_A } from "./sfx/defs-a.mjs";
import { DEFS_B } from "./sfx/defs-b.mjs";
import { AMBIENT, loopify } from "./sfx/ambient.mjs";
import { renderTrack } from "./music/compose.mjs";
import { TRACKS } from "./music/tracks.mjs";

const hash = (s) =>
  [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);

parentPort.on("message", ({ kind, id, outDir }) => {
  try {
    const result = run(kind, id, outDir);
    parentPort.postMessage({ ok: true, kind, id, ...result });
  } catch (e) {
    parentPort.postMessage({
      ok: false,
      kind,
      id,
      error: String(e.stack ?? e),
    });
  }
});

function run(kind, id, outDir) {
  if (kind === "sfx") {
    const def = [...DEFS_A, ...DEFS_B].find((d) => d.id === id);
    const files = [];
    for (let v = 0; v < def.variants; v++) {
      const rng = rngOf(hash(id) + v * 7919);
      let x = def.render({ rng, v });
      dcBlock(x);
      declick(x, 1, 6);
      normalisePeak(x, def.peakDb);
      const name = def.variants > 1 ? `${id}_${v + 1}.ogg` : `${id}.ogg`;
      encodeOgg(x, join(outDir, "sfx", name), { q: 4 });
      files.push(`sfx/${name}`);
    }
    return { files };
  }
  if (kind === "ambient") {
    const def = AMBIENT.find((d) => d.id === id);
    const rng = rngOf(hash(id));
    const bed = def.render(rng);
    const xf = Math.round(2.0 * 44100);
    let x = loopify(
      bed.length > def.seconds * 44100
        ? bed.slice(0, Math.round(def.seconds * 44100) + xf)
        : bed,
      xf,
    );
    dcBlock(x);
    const { lufs } = measureLufs(x);
    encodeOgg(padLoop(x), join(outDir, "ambient", `${id}.ogg`), {
      q: 3,
      gainDb: def.level - lufs,
    });
    return {
      files: [`ambient/${id}.ogg`],
      loopStart: LOOP_PAD,
      loopEnd: LOOP_PAD + x.length / SR,
    };
  }
  if (kind === "music") {
    const t = TRACKS.find((d) => d.id === id);
    let x = renderTrack(t);
    dcBlock(x);
    const { lufs } = measureLufs(x);
    const isLoop = t.loop !== false;
    encodeOgg(isLoop ? padLoop(x) : x, join(outDir, "music", `${id}.ogg`), {
      q: 4,
      gainDb: (t.lufs ?? -18) - lufs,
    });
    return isLoop
      ? {
          files: [`music/${id}.ogg`],
          loopStart: LOOP_PAD,
          loopEnd: LOOP_PAD + x.length / SR,
        }
      : { files: [`music/${id}.ogg`] };
  }
  throw new Error(`unknown kind ${kind}`);
}
export { writeFileSync, scale, dbToGain };
