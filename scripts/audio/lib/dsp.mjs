// Small offline DSP kit for the audio build. Everything works on Float32Array mono buffers at SR.
// Deterministic: all randomness comes from a seeded generator passed in by the caller.

export const SR = 44100;
const TAU = Math.PI * 2;

/** Seeded generator (mulberry32). */
export function rngOf(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.gauss = () => (r() + r() + r() + r() - 2) / 0.58;
  return r;
}

export const secs = (s) => Math.max(1, Math.round(s * SR));
export const zeros = (n) => new Float32Array(n);
export const dbToGain = (db) => Math.pow(10, db / 20);

/** Add src into dst starting at sample `at`, scaled by g. With wrap, runs past the end loop to the start. */
export function addInto(dst, src, at = 0, g = 1, wrap = false) {
  const n = dst.length;
  for (let i = 0; i < src.length; i++) {
    let j = at + i;
    if (j >= n) {
      if (!wrap) break;
      j %= n;
    }
    if (j >= 0) dst[j] += src[i] * g;
  }
  return dst;
}

export const scale = (x, g) => {
  for (let i = 0; i < x.length; i++) x[i] *= g;
  return x;
};

export const mulEnv = (x, env) => {
  for (let i = 0; i < x.length; i++) x[i] *= env[i] ?? 0;
  return x;
};

/** Exponential decay envelope with a short linear attack (seconds). */
export function decayEnv(n, tau, attack = 0.002) {
  const e = new Float32Array(n);
  const a = Math.max(1, Math.round(attack * SR));
  for (let i = 0; i < n; i++) {
    const up = i < a ? i / a : 1;
    e[i] = up * Math.exp(-i / (tau * SR));
  }
  return e;
}

/** Attack, sustain level, release envelope over n samples (all in seconds). */
export function adsr(n, a, d, s, r) {
  const e = new Float32Array(n);
  const A = Math.round(a * SR);
  const D = Math.round(d * SR);
  const R = Math.round(r * SR);
  for (let i = 0; i < n; i++) {
    let v;
    if (i < A) v = i / Math.max(1, A);
    else if (i < A + D) v = 1 - (1 - s) * ((i - A) / Math.max(1, D));
    else v = s;
    const left = n - i;
    if (left < R) v *= left / R;
    e[i] = v;
  }
  return e;
}

/** Fade the first and last ms of a buffer in place to avoid clicks. */
export function declick(x, headMs = 1, tailMs = 4) {
  const h = Math.round((headMs / 1000) * SR);
  const t = Math.round((tailMs / 1000) * SR);
  for (let i = 0; i < h && i < x.length; i++) x[i] *= i / h;
  for (let i = 0; i < t && i < x.length; i++) x[x.length - 1 - i] *= i / t;
  return x;
}

/** Oscillator with an exponential pitch sweep f0 to f1. wave: sine, tri, saw, square, pulse. */
export function osc(n, f0, f1 = f0, wave = "sine", phase0 = 0) {
  const out = new Float32Array(n);
  let ph = phase0;
  for (let i = 0; i < n; i++) {
    const f = f0 * Math.pow(f1 / f0, i / n);
    ph += f / SR;
    ph -= Math.floor(ph);
    out[i] =
      wave === "sine"
        ? Math.sin(TAU * ph)
        : wave === "tri"
          ? 4 * Math.abs(ph - 0.5) - 1
          : wave === "saw"
            ? 2 * ph - 1
            : wave === "pulse"
              ? ph < 0.3
                ? 1
                : -1
              : ph < 0.5
                ? 1
                : -1;
  }
  return out;
}

/** Frequency-modulated tone (bells, marimba, electric keys). */
export function fm(n, fc, ratio, index, indexDecay = 0.3) {
  const out = new Float32Array(n);
  const fmod = fc * ratio;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const idx = index * Math.exp(-t / indexDecay);
    out[i] = Math.sin(TAU * fc * t + idx * Math.sin(TAU * fmod * t));
  }
  return out;
}

export const whiteNoise = (n, rng) => {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = rng() * 2 - 1;
  return x;
};

/** Pink-ish noise (Paul Kellet filter), roughly unit level. */
export function pinkNoise(n, rng) {
  const x = new Float32Array(n);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.22;
    b6 = w * 0.115926;
  }
  return x;
}

/**
 * State variable filter with a per-sample cutoff (number or function of sample index).
 * mode: lp, hp, bp. q around 0.7 (flat) to 8 (ringing).
 */
export function svf(x, fc, q = 0.7, mode = "lp") {
  const out = new Float32Array(x.length);
  let lo = 0,
    bd = 0;
  const damp = 1 / q;
  for (let i = 0; i < x.length; i++) {
    const f = typeof fc === "function" ? fc(i) : fc;
    const g = 2 * Math.sin((Math.PI * Math.min(f, SR * 0.45)) / SR);
    lo += g * bd;
    const hi = x[i] - lo - damp * bd;
    bd += g * hi;
    out[i] = mode === "lp" ? lo : mode === "hp" ? hi : bd;
  }
  return out;
}

export const lp = (x, f, q = 0.7) => svf(x, f, q, "lp");
export const hp = (x, f, q = 0.7) => svf(x, f, q, "hp");
export const bp = (x, f, q = 1.5) => svf(x, f, q, "bp");

/** Soft saturation, keeps peaks under 1. */
export function softClip(x, drive = 1) {
  for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * drive);
  return x;
}

/** Feedback delay line (echo). */
export function echo(x, timeS, fb = 0.4, mix = 0.4, tail = 1.5) {
  const d = Math.round(timeS * SR);
  const n = x.length + Math.round(tail * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const dry = i < x.length ? x[i] : 0;
    const wet = i >= d ? out[i - d] : 0;
    out[i] = dry + wet * fb;
  }
  const res = new Float32Array(n);
  for (let i = 0; i < n; i++)
    res[i] = (i < x.length ? x[i] : 0) * (1 - mix * 0.5) + out[i] * mix * 0.5;
  return res;
}

/**
 * Schroeder style reverb: four combs into two all-passes. With `loop` the input is run twice
 * and the second pass returned, so a looping bed has no seam (the tail wraps into the start).
 */
export function reverb(
  x,
  { wet = 0.25, room = 0.8, damp = 0.4, loop = false, tail = 1.2 } = {},
) {
  const base = loop ? x.length : x.length + Math.round(tail * SR);
  const src = new Float32Array(base);
  src.set(x);
  const passes = loop ? 2 : 1;
  const delays = [1557, 1617, 1491, 1422].map((d) =>
    Math.round((d * SR) / 44100),
  );
  const aps = [225, 556].map((d) => Math.round((d * SR) / 44100));
  const combs = delays.map((d) => ({ buf: new Float32Array(d), i: 0, lp: 0 }));
  const apBufs = aps.map((d) => ({ buf: new Float32Array(d), i: 0 }));
  let out = new Float32Array(base);
  for (let p = 0; p < passes; p++) {
    for (let n = 0; n < base; n++) {
      const inp = src[n] * 0.25;
      let s = 0;
      for (const c of combs) {
        const y = c.buf[c.i];
        c.lp = y * (1 - damp) + c.lp * damp;
        c.buf[c.i] = inp + c.lp * room;
        c.i = (c.i + 1) % c.buf.length;
        s += y;
      }
      for (const a of apBufs) {
        const y = a.buf[a.i];
        const v = s + y * 0.5;
        a.buf[a.i] = v;
        s = y - v * 0.5;
        a.i = (a.i + 1) % a.buf.length;
      }
      out[n] = s;
    }
  }
  const res = new Float32Array(base);
  for (let n = 0; n < base; n++)
    res[n] = src[n] * (1 - wet * 0.5) + out[n] * wet * 1.6;
  return res;
}

/** Peak of a buffer. */
export const peakOf = (x) => {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
};

/** Scale so the peak sits at `db` dBFS. */
export function normalisePeak(x, db = -6) {
  const p = peakOf(x);
  if (p > 0) scale(x, dbToGain(db) / p);
  return x;
}

/** Remove DC offset. */
export function dcBlock(x) {
  let m = 0;
  for (let i = 0; i < x.length; i++) m += x[i];
  m /= x.length || 1;
  for (let i = 0; i < x.length; i++) x[i] -= m;
  return x;
}

/** Concatenate buffers. */
export function concat(...bufs) {
  const out = new Float32Array(bufs.reduce((a, b) => a + b.length, 0));
  let o = 0;
  for (const b of bufs) {
    out.set(b, o);
    o += b.length;
  }
  return out;
}

export const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Seconds of pre-roll and post-roll stored around every loop (codec edge effects live in them). */
export const LOOP_PAD = 0.5;

/** Wrap a seamless loop with its own tail before it and its own head after it. */
export function padLoop(x, pad = LOOP_PAD) {
  const p = Math.round(pad * SR);
  const out = new Float32Array(x.length + 2 * p);
  out.set(x.subarray(x.length - p), 0);
  out.set(x, p);
  out.set(x.subarray(0, p), p + x.length);
  return out;
}
