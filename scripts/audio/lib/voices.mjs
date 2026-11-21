// Instrument voices for the synthesised music. Each returns a mono buffer for one note.
import {
  SR,
  secs,
  zeros,
  osc,
  fm,
  decayEnv,
  adsr,
  mulEnv,
  lp,
  hp,
  bp,
  whiteNoise,
  midiHz,
  declick,
  addInto,
} from "./dsp.mjs";

/** Karplus-Strong plucked string (nylon guitar like). */
export function pluck(midi, dur, rng, { bright = 0.5, body = 0.996 } = {}) {
  const f = midiHz(midi);
  const n = secs(dur);
  const period = Math.max(2, Math.round(SR / f));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = rng() * 2 - 1;
  // Soften the excitation so the pick is warm, not a click.
  let prev = 0;
  for (let i = 0; i < period; i++) {
    ring[i] = prev = prev * (1 - bright) + ring[i] * bright;
  }
  const out = new Float32Array(n);
  let idx = 0;
  let last = 0;
  for (let i = 0; i < n; i++) {
    const cur = ring[idx];
    const nxt = ring[(idx + 1) % period];
    const v = (cur + nxt) * 0.5 * body;
    ring[idx] = v;
    idx = (idx + 1) % period;
    last = last * 0.2 + cur * 0.8;
    out[i] = last;
  }
  // Wooden body: one broad resonance under the string.
  const bodyRes = bp(out, 220, 1.2);
  for (let i = 0; i < n; i++) out[i] = out[i] * 1.6 + bodyRes[i] * 0.35;
  return declick(out, 0.5, 20);
}

/** Soft piano: a few inharmonic partials, hammer thump, pitch dependent decay. */
export function piano(midi, dur, rng, { soft = 0.5 } = {}) {
  const f = midiHz(midi);
  const n = secs(dur + 0.6);
  const out = zeros(n);
  const decay = 2.6 - Math.min(1.7, (midi - 36) / 40);
  const parts = [1, 2, 3, 4, 5, 6];
  const amp = [1, 0.55, 0.3, 0.16, 0.09, 0.05].map(
    (a, i) => a * Math.pow(1 - soft * 0.5, i),
  );
  parts.forEach((p, i) => {
    const fi = f * p * Math.sqrt(1 + 0.00035 * p * p);
    if (fi > 9000) return;
    const t = decay / (1 + i * 0.7);
    const sine = osc(n, fi, fi, "sine", rng());
    mulEnv(sine, decayEnv(n, t, 0.003));
    addInto(out, sine, 0, amp[i] * 0.4);
  });
  const hammer = hp(lp(whiteNoise(secs(0.03), rng), 2500), 300);
  mulEnv(hammer, decayEnv(hammer.length, 0.006, 0.0005));
  addInto(out, hammer, 0, 0.18 * (1 - soft * 0.6));
  // Release: a gentle fade at the end of the held length.
  const rel = adsr(n, 0, 0, 1, 0.3);
  const relStart = secs(dur);
  for (let i = relStart; i < n; i++)
    out[i] *= Math.max(0, 1 - (i - relStart) / secs(0.55));
  void rel;
  return declick(out, 0.5, 10);
}

/** Breathy flute: sine with a touch of odd harmonics, vibrato that arrives late, a breath hiss. */
export function flute(midi, dur, rng, { vib = 5.2, breath = 0.05 } = {}) {
  const f = midiHz(midi);
  const n = secs(dur + 0.25);
  const out = zeros(n);
  const ph = rng();
  let p = ph;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const vdepth = Math.min(1, Math.max(0, (t - 0.25) / 0.4)) * 0.006;
    p += (f * (1 + vdepth * Math.sin(2 * Math.PI * vib * t))) / SR;
    out[i] =
      Math.sin(2 * Math.PI * p) +
      0.12 * Math.sin(4 * Math.PI * p) +
      0.05 * Math.sin(6 * Math.PI * p);
  }
  const air = bp(whiteNoise(n, rng), f * 2, 1.0);
  for (let i = 0; i < n; i++) out[i] += air[i] * breath * 3;
  mulEnv(out, adsr(n, 0.07, 0.1, 0.8, 0.22));
  return declick(out, 1, 10);
}

/** Warm pad: three detuned sines per partial, slow attack and release. */
export function pad(midi, dur, rng, { attack = 0.6, release = 1.0 } = {}) {
  const f = midiHz(midi);
  const n = secs(dur + release);
  const out = zeros(n);
  for (const det of [-0.004, 0, 0.005]) {
    const s = osc(n, f * (1 + det), f * (1 + det), "sine", rng());
    addInto(out, s, 0, 0.35);
    const o = osc(n, f * 2 * (1 + det), f * 2 * (1 + det), "sine", rng());
    addInto(out, o, 0, 0.1);
  }
  mulEnv(out, adsr(n, attack, 0.2, 0.8, release));
  return lp(out, 1800, 0.7);
}

/** Marimba or kalimba style mallet: short FM tone. */
export function mallet(midi, dur, rng) {
  const f = midiHz(midi);
  const n = secs(Math.min(dur, 1.4) + 0.1);
  const out = fm(n, f, 4, 1.8, 0.05);
  mulEnv(out, decayEnv(n, 0.35 - Math.min(0.2, (midi - 48) / 200), 0.002));
  const sub = osc(n, f, f, "sine", rng());
  mulEnv(sub, decayEnv(n, 0.5, 0.002));
  for (let i = 0; i < n; i++) out[i] = out[i] * 0.5 + sub[i] * 0.6;
  return declick(out, 0.5, 10);
}

/** Music box / glockenspiel bell. */
export function bell(midi, dur, rng) {
  const f = midiHz(midi);
  const n = secs(Math.min(dur, 2.5) + 0.2);
  const out = fm(n, f, 3.5, 1.0, 0.25);
  mulEnv(out, decayEnv(n, 0.9, 0.001));
  const top = osc(n, f * 2.01, f * 2.01, "sine", rng());
  mulEnv(top, decayEnv(n, 0.35, 0.001));
  for (let i = 0; i < n; i++) out[i] = out[i] * 0.6 + top[i] * 0.2;
  return declick(out, 0.3, 12);
}

/** Soft bass: sine plus a little second harmonic, round attack. */
export function bass(midi, dur, rng) {
  const f = midiHz(midi);
  const n = secs(dur + 0.1);
  const a = osc(n, f, f, "sine", rng());
  const b = osc(n, f * 2, f * 2, "sine", rng());
  const out = zeros(n);
  for (let i = 0; i < n; i++) out[i] = a[i] * 0.8 + b[i] * 0.18;
  mulEnv(out, adsr(n, 0.01, 0.1, 0.7, 0.12));
  return lp(out, 700, 0.7);
}

/** Light percussion. */
export function shaker(rng, len = 0.07) {
  const n = secs(len);
  const out = hp(whiteNoise(n, rng), 5000);
  mulEnv(out, decayEnv(n, 0.02, 0.004));
  return out;
}
export function softKick(rng) {
  const n = secs(0.22);
  const out = osc(n, 110, 45, "sine", 0);
  mulEnv(out, decayEnv(n, 0.07, 0.001));
  return out;
}
export function rim(rng) {
  const n = secs(0.09);
  const out = bp(whiteNoise(n, rng), 1800, 3);
  const t = osc(n, 900, 700, "sine", 0);
  mulEnv(out, decayEnv(n, 0.015, 0.0005));
  mulEnv(t, decayEnv(n, 0.02, 0.0005));
  for (let i = 0; i < n; i++) out[i] = out[i] * 0.6 + t[i] * 0.3;
  return out;
}
export function hush(rng, len = 0.5) {
  // A soft cymbal-ish swell used for the finale; high noise with a slow attack.
  const n = secs(len);
  const out = hp(whiteNoise(n, rng), 3000);
  mulEnv(out, adsr(n, len * 0.6, len * 0.2, 0.1, len * 0.2));
  return out;
}
