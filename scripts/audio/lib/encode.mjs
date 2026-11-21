// ffmpeg helpers: loudness measurement and Ogg Vorbis encoding from raw float samples.
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SR } from "./dsp.mjs";

const toBuf = (f32) => Buffer.from(f32.buffer, f32.byteOffset, f32.byteLength);

function ff(args, input) {
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-loglevel", "info", ...args],
    {
      input,
      maxBuffer: 1 << 28,
    },
  );
  return r;
}

/** Integrated loudness in LUFS of interleaved float samples. */
export function measureLufs(f32, ch = 1, sr = SR) {
  const r = ff(
    [
      "-f",
      "f32le",
      "-ar",
      String(sr),
      "-ac",
      String(ch),
      "-i",
      "pipe:0",
      "-af",
      "ebur128=peak=true",
      "-f",
      "null",
      "-",
    ],
    toBuf(f32),
  );
  const text = r.stderr.toString();
  const tail = text.slice(text.lastIndexOf("Summary:"));
  const m = /I:\s+(-?[\d.]+)\s+LUFS/.exec(tail);
  const p = /Peak:\s+(-?[\d.]+)\s+dBFS/.exec(tail);
  return {
    lufs: m ? parseFloat(m[1]) : -70,
    truePeak: p ? parseFloat(p[1]) : 0,
  };
}

/** Encode interleaved float samples to Ogg Vorbis at `out`. gainDb is applied before a -1.5 dB limiter. */
export function encodeOgg(
  f32,
  out,
  { ch = 1, q = 4, gainDb = 0, sr = SR } = {},
) {
  mkdirSync(dirname(out), { recursive: true });
  const af = `volume=${gainDb.toFixed(3)}dB,alimiter=limit=0.84:attack=3:release=40:level=disabled`;
  const r = ff(
    [
      "-y",
      "-f",
      "f32le",
      "-ar",
      String(sr),
      "-ac",
      String(ch),
      "-i",
      "pipe:0",
      "-af",
      af,
      "-c:a",
      "libvorbis",
      "-q:a",
      String(q),
      "-ar",
      String(sr),
      "-map_metadata",
      "-1",
      "-fflags",
      "+bitexact",
      "-flags:a",
      "+bitexact",
      out,
    ],
    toBuf(f32),
  );
  if (r.status !== 0)
    throw new Error(
      `ffmpeg failed for ${out}: ${r.stderr.toString().slice(-400)}`,
    );
}

/** Decode any audio file to interleaved float samples (stereo or mono) at SR. */
export function decodeFile(path, ch = 2, sr = SR, extra = []) {
  const r = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      path,
      ...extra,
      "-f",
      "f32le",
      "-ar",
      String(sr),
      "-ac",
      String(ch),
      "-",
    ],
    { maxBuffer: 1 << 30 },
  );
  if (r.status !== 0)
    throw new Error(
      `decode failed for ${path}: ${r.stderr.toString().slice(-300)}`,
    );
  const b = r.stdout;
  return new Float32Array(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
}
