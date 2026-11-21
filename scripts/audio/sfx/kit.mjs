// Building blocks for effect recipes. Durations in seconds.
import {
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
  svf,
  whiteNoise,
  pinkNoise,
  addInto,
  scale,
  midiHz,
  declick,
  echo,
} from "../lib/dsp.mjs";

export {
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
  svf,
  whiteNoise,
  pinkNoise,
  addInto,
  scale,
  midiHz,
  declick,
  echo,
};

/** A low thump: sine sweep with fast decay. */
export function thump(f0, f1, tau, dur = tau * 5) {
  const n = secs(dur);
  return mulEnv(osc(n, f0, f1, "sine"), decayEnv(n, tau, 0.001));
}

/** A noise burst through a band pass that can sweep (fc0 to fc1). */
export function nburst(
  rng,
  dur,
  fc0,
  fc1 = fc0,
  q = 1.2,
  tau = dur / 4,
  mode = "bp",
) {
  const n = secs(dur);
  const x = whiteNoise(n, rng);
  const f = (i) => fc0 * Math.pow(fc1 / fc0, i / n);
  const y = svf(x, f, q, mode);
  return mulEnv(y, decayEnv(n, tau, 0.002));
}

/** A struck bell tone with a given decay time. */
export function ping(
  freq,
  tau = 0.25,
  dur = tau * 6,
  ratio = 3.5,
  index = 1.0,
) {
  const n = secs(dur);
  return mulEnv(fm(n, freq, ratio, index, tau * 0.5), decayEnv(n, tau, 0.001));
}

/** Soft sine blip. */
export function blip(f0, f1, dur, tau = dur / 3) {
  const n = secs(dur);
  return mulEnv(osc(n, f0, f1, "sine"), decayEnv(n, tau, 0.003));
}

/** Place several buffers at times (seconds) into one. */
export function seq(total, parts) {
  const out = zeros(secs(total));
  for (const [t, buf, g = 1] of parts) addInto(out, buf, secs(t), g);
  return out;
}

/** A rising or falling run of pings: notes are semitone offsets from base midi. */
export function arpeggio(baseMidi, offsets, step, tau = 0.25, g = 1) {
  const total = step * offsets.length + tau * 5;
  return seq(
    total,
    offsets.map((o, i) => [i * step, ping(midiHz(baseMidi + o), tau), g]),
  );
}

/** Humanise a base value by a fraction using the rng. */
export const jit = (rng, v, frac) => v * (1 + (rng() * 2 - 1) * frac);
