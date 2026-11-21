// Ambient loops. Each renders a seamless loop of `seconds` by building a longer bed and crossfading its
// tail into its head (equal power), so the loop point has no click. `gain` is the manifest level.
import {
  SR,
  secs,
  zeros,
  osc,
  mulEnv,
  lp,
  hp,
  bp,
  svf,
  whiteNoise,
  pinkNoise,
  addInto,
  midiHz,
  rngOf,
} from "../lib/dsp.mjs";
import { blip, nburst, jit } from "./kit.mjs";

/** Make x of length L+xf loop by blending its last xf samples into its first xf. */
export function loopify(x, xf) {
  const L = x.length - xf;
  const out = x.slice(0, L);
  for (let i = 0; i < xf; i++) {
    const t = i / xf;
    const a = Math.cos(t * Math.PI * 0.5);
    const b = Math.sin(t * Math.PI * 0.5);
    out[i] = x[L + i] * a + x[i] * b;
  }
  return out;
}

const a = (id, o, render) => ({
  id,
  seconds: 20,
  gain: 0.5,
  level: -28,
  ...o,
  render,
});

/** Scatter short events across a bed. */
function scatter(len, count, rng, make, g = 1) {
  const out = zeros(len);
  for (let k = 0; k < count; k++)
    addInto(out, make(rng), Math.floor(rng() * len), g * (0.5 + 0.5 * rng()));
  return out;
}

export const AMBIENT = [
  a("birds", { gain: 0.55, seconds: 24 }, (rng) => {
    const len = secs(24);
    const bed = scatter(
      len + secs(1),
      34,
      rng,
      (r) => {
        // A short song: a few chirps stepping around a base pitch.
        const base = jit(r, 2400, 0.35);
        const notes = 2 + Math.floor(r() * 4);
        const out = zeros(secs(0.9));
        for (let n = 0; n < notes; n++) {
          const f0 = base * (1 + (r() - 0.5) * 0.4);
          addInto(
            out,
            blip(f0, f0 * (r() < 0.5 ? 1.25 : 0.8), 0.07 + r() * 0.05, 0.03),
            secs(n * (0.09 + r() * 0.05)),
            0.7,
          );
        }
        return out;
      },
      0.5,
    );
    const air = lp(pinkNoise(len + secs(1), rng), 900, 0.7);
    for (let i = 0; i < air.length; i++) bed[i] += air[i] * 0.015;
    return bed;
  }),
  a("crickets", { gain: 0.5, seconds: 20, level: -30 }, (rng) => {
    const len = secs(20);
    const out = zeros(len + secs(1));
    // Several chirp trains: a pulsed tone near 4.5 kHz.
    for (let v = 0; v < 6; v++) {
      const f = 4200 + v * 170;
      const rate = 3.1 + v * 0.35;
      const phase = rng() * 10;
      const tone = osc(out.length, f, f, "sine", rng());
      for (let i = 0; i < out.length; i++) {
        const t = i / SR;
        const pulse = (t * rate + phase) % 1;
        const gate = pulse < 0.22 ? Math.sin((pulse / 0.22) * Math.PI) : 0;
        const slow = 0.5 + 0.5 * Math.sin(t * 0.45 + v * 1.7);
        out[i] += tone[i] * gate * slow * 0.1;
      }
    }
    return out;
  }),
  a("rain", { gain: 0.6, seconds: 16, level: -26 }, (rng) => {
    const len = secs(16) + secs(1);
    const base = hp(lp(whiteNoise(len, rng), 7000, 0.7), 600, 0.7);
    const patter = scatter(
      len,
      520,
      rng,
      (r) => nburst(r, 0.025, jit(r, 4200, 0.3), 2500, 1.2, 0.005, "hp"),
      0.28,
    );
    for (let i = 0; i < len; i++) base[i] = base[i] * 0.5 + patter[i];
    return base;
  }),
  a("wind", { gain: 0.5, seconds: 20, level: -29 }, (rng) => {
    const len = secs(20) + secs(2);
    const x = whiteNoise(len, rng);
    return svf(
      x,
      (i) =>
        380 +
        260 * Math.sin((i / SR) * 0.55) +
        150 * Math.sin((i / SR) * 1.3 + 1),
      2.5,
      "bp",
    ).map((v) => v * 2.2);
  }),
  a("waves", { gain: 0.6, seconds: 20, level: -27 }, (rng) => {
    const len = secs(20) + secs(2);
    const x = whiteNoise(len, rng);
    const y = svf(
      x,
      (i) =>
        500 + 900 * Math.pow(0.5 + 0.5 * Math.sin((i / SR / 8.5) * 6.2832), 2),
      0.9,
      "lp",
    );
    for (let i = 0; i < len; i++)
      y[i] *=
        0.15 +
        0.85 * Math.pow(0.5 + 0.5 * Math.sin((i / SR / 8.5) * 6.2832 - 1.2), 2);
    return y.map((v) => v * 2.5);
  }),
  a("drip", { gain: 0.55, seconds: 22, level: -31 }, (rng) => {
    const len = secs(22) + secs(2);
    const out = zeros(len);
    const rumble = lp(pinkNoise(len, rng), 200, 0.7);
    for (let i = 0; i < len; i++) out[i] += rumble[i] * 0.05;
    for (let k = 0; k < 9; k++) {
      const t = rng() * (len - secs(1));
      const f = jit(rng, 1300, 0.4);
      addInto(out, blip(f, f * 1.7, 0.09, 0.03), Math.floor(t), 0.8);
      addInto(
        out,
        blip(f * 0.5, f * 0.8, 0.12, 0.05),
        Math.floor(t + 0.12 * SR),
        0.2,
      );
    }
    return out;
  }),
  a("hearth", { gain: 0.5, seconds: 16, level: -31 }, (rng) => {
    const len = secs(16) + secs(1);
    const base = lp(pinkNoise(len, rng), 700, 0.7);
    const out = zeros(len);
    for (let i = 0; i < len; i++) out[i] = base[i] * 0.55;
    const crack = scatter(
      len,
      60,
      rng,
      (r) =>
        nburst(r, 0.02 + r() * 0.03, jit(r, 3000, 0.5), 1500, 1.5, 0.006, "hp"),
      0.35,
    );
    for (let i = 0; i < len; i++) out[i] += crack[i];
    return out;
  }),
];
export { rngOf };
