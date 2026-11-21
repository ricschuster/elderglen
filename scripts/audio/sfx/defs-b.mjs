// Effect recipes, part B: combat, mines, animals, cooking, hall, people, day, festival, weather.
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
  addInto,
  midiHz,
  echo,
  thump,
  nburst,
  ping,
  blip,
  seq,
  arpeggio,
  jit,
} from "./kit.mjs";

const d = (id, o, render) => ({
  id,
  variants: 1,
  gain: 1,
  peakDb: -6,
  pitch: 0,
  gainJitter: 0,
  cooldownMs: 0,
  ...o,
  render,
});

/** A voiced grunt: a saw sweep through a formant-ish band pass with vibrato, used for animal cues. */
function voice(f0, f1, dur, formant, q = 3, wave = "saw", vib = 0) {
  const n = secs(dur);
  const x = osc(n, f0, f1, wave);
  if (vib)
    for (let i = 0; i < n; i++)
      x[i] *= 1 + 0.25 * Math.sin((i / n) * 6.28 * vib);
  const y = bp(x, formant, q);
  return mulEnv(y, adsr(n, 0.03, 0.08, 0.7, dur * 0.35));
}

export const DEFS_B = [
  // ---- combat
  d(
    "combat.swing",
    { variants: 3, gain: 0.7, pitch: 0.07, cooldownMs: 60 },
    ({ rng }) => {
      const n = secs(0.25);
      const x = svf(whiteNoise(n, rng), (i) => 700 + (3400 * i) / n, 1.2, "bp");
      return mulEnv(x, adsr(n, 0.07, 0.03, 0.4, 0.14));
    },
  ),
  d(
    "combat.hit",
    { variants: 3, gain: 0.95, pitch: 0.06, gainJitter: 0.1, cooldownMs: 40 },
    ({ rng }) =>
      seq(0.35, [
        [0, thump(jit(rng, 170, 0.1), 70, 0.06), 1],
        [0, nburst(rng, 0.07, 2600, 1200, 1.2, 0.015), 0.8],
        [0.004, ping(jit(rng, 1500, 0.1), 0.04, 0.2, 3.1, 0.7), 0.3],
      ]),
  ),
  d(
    "enemy.hurt",
    { variants: 3, gain: 0.8, pitch: 0.1, cooldownMs: 60 },
    ({ rng }) =>
      seq(0.4, [
        [0, voice(jit(rng, 420, 0.1), 260, 0.18, 900, 2.5, "square"), 0.7],
        [0, thump(150, 70, 0.05), 0.4],
      ]),
  ),
  d(
    "enemy.die",
    { variants: 2, gain: 0.95, pitch: 0.06, cooldownMs: 100 },
    ({ rng }) =>
      seq(0.8, [
        [0, voice(520, 110, 0.5, 800, 2, "square"), 0.7],
        [0, nburst(rng, 0.4, 3000, 400, 0.8, 0.12), 0.5],
        [0.3, ping(800, 0.1, 0.4, 2.0, 0.5), 0.15],
      ]),
  ),
  d(
    "player.hurt",
    { variants: 2, gain: 0.9, pitch: 0.05, cooldownMs: 150 },
    ({ rng }) =>
      seq(0.45, [
        [0, thump(110, 55, 0.09), 1],
        [0, nburst(rng, 0.12, 1500, 600, 1.2, 0.03), 0.6],
        [0.04, voice(340, 200, 0.22, 700, 2.5, "tri"), 0.6],
      ]),
  ),
  d("player.die", { gain: 0.9, cooldownMs: 600 }, () =>
    arpeggio(64, [0, -3, -7, -12], 0.16, 0.7),
  ),
  d("bomb.fuse", { gain: 0.6, cooldownMs: 300 }, ({ rng }) => {
    const n = secs(1.0);
    const x = hp(whiteNoise(n, rng), 3000);
    for (let i = 0; i < n; i++) x[i] *= 0.4 + 0.6 * rng();
    return mulEnv(x, adsr(n, 0.05, 0.1, 0.8, 0.1));
  }),
  d("bomb.boom", { gain: 1, peakDb: -3, cooldownMs: 300 }, ({ rng }) =>
    seq(1.6, [
      [0, thump(90, 28, 0.25, 1.4), 1],
      [0, nburst(rng, 1.2, 2500, 150, 0.6, 0.3), 0.8],
      [0.02, nburst(rng, 0.2, 6000, 2000, 0.8, 0.04, "hp"), 0.4],
    ]),
  ),

  // ---- mines
  d("mine.stairs", { gain: 0.9, cooldownMs: 400 }, ({ rng }) => {
    const out = zeros(secs(1.0));
    for (let k = 0; k < 4; k++)
      addInto(
        out,
        seq(0.2, [
          [0, nburst(rng, 0.04, 2800, 1800, 1.4, 0.008, "hp"), 0.6],
          [0, thump(130, 70, 0.04), 0.6],
        ]),
        secs(k * 0.14),
        0.9 - k * 0.12,
      );
    return out;
  }),
  d(
    "mine.rock",
    { variants: 3, gain: 1, pitch: 0.06, cooldownMs: 100 },
    ({ rng }) => {
      const out = seq(0.8, [
        [0, thump(jit(rng, 100, 0.1), 45, 0.09), 1],
        [0, nburst(rng, 0.25, 3500, 800, 0.8, 0.06), 0.9],
      ]);
      for (let k = 0; k < 5; k++)
        addInto(
          out,
          ping(jit(rng, 900 + rng() * 1200, 0.05), 0.04, 0.15, 3.3, 0.5),
          secs(0.03 + rng() * 0.3),
          0.3,
        );
      return out;
    },
  ),
  d("mine.ladder", { gain: 0.9, cooldownMs: 500 }, () =>
    seq(1.2, [
      [0, thump(100, 60, 0.1), 0.6],
      [0.15, arpeggio(72, [0, 7, 12], 0.1, 0.4), 0.9],
    ]),
  ),
  d(
    "mine.ore",
    { variants: 3, gain: 0.9, pitch: 0.05, cooldownMs: 60 },
    ({ rng }) =>
      seq(0.5, [
        [0, ping(jit(rng, 2200, 0.15), 0.12, 0.5, 5.4, 0.9), 0.8],
        [0, ping(jit(rng, 3300, 0.15), 0.07, 0.4, 5.9, 0.8), 0.5],
        [0, nburst(rng, 0.03, 5000, 5000, 1, 0.006, "hp"), 0.5],
      ]),
  ),
  d("mine.geode", { gain: 0.9, cooldownMs: 200 }, ({ rng }) =>
    seq(0.8, [
      [0, thump(140, 60, 0.05), 0.9],
      [0, nburst(rng, 0.08, 3000, 1500, 1.3, 0.015), 0.8],
      [0.06, arpeggio(88, [0, 3, 7, 10], 0.05, 0.3), 0.5],
    ]),
  ),

  // ---- animals (abstract cues, not recordings of anything)
  d(
    "animal.cluck",
    { variants: 2, gain: 0.7, pitch: 0.12, cooldownMs: 250 },
    ({ rng }) =>
      seq(0.5, [
        [0, voice(jit(rng, 600, 0.1), 460, 0.07, 1500, 3, "saw"), 0.8],
        [0.09, voice(jit(rng, 640, 0.1), 480, 0.07, 1500, 3, "saw"), 0.7],
        [0.19, voice(jit(rng, 700, 0.1), 500, 0.1, 1500, 3, "saw"), 0.6],
      ]),
  ),
  d(
    "animal.moo",
    { variants: 2, gain: 0.8, pitch: 0.08, cooldownMs: 600 },
    ({ rng }) => voice(jit(rng, 150, 0.08), 110, 1.1, 480, 2.5, "saw", 5),
  ),
  d(
    "animal.baa",
    { variants: 2, gain: 0.7, pitch: 0.1, cooldownMs: 500 },
    ({ rng }) => voice(jit(rng, 380, 0.08), 340, 0.7, 1100, 4, "saw", 20),
  ),
  d(
    "animal.chirp",
    { variants: 3, gain: 0.55, pitch: 0.15, cooldownMs: 200 },
    ({ rng }) =>
      seq(0.35, [
        [0, blip(jit(rng, 2600, 0.1), 3400, 0.06, 0.03), 0.8],
        [0.09, blip(3300, 2700, 0.07, 0.03), 0.7],
      ]),
  ),
  d(
    "animal.oink",
    { variants: 2, gain: 0.7, pitch: 0.1, cooldownMs: 400 },
    ({ rng }) =>
      seq(0.6, [
        [0, voice(jit(rng, 200, 0.1), 140, 0.14, 700, 2, "square"), 0.7],
        [0.18, voice(190, 130, 0.14, 700, 2, "square"), 0.6],
      ]),
  ),
  d("animal.horse", { gain: 0.7, pitch: 0.05, cooldownMs: 800 }, () =>
    voice(620, 300, 0.9, 1100, 2, "saw", 14),
  ),
  d(
    "animal.pet",
    { variants: 2, gain: 0.55, pitch: 0.05, cooldownMs: 300 },
    () => arpeggio(84, [0, 4, 7], 0.07, 0.25),
  ),

  // ---- cooking and crafting
  d("cook.sizzle", { gain: 0.55, cooldownMs: 400 }, ({ rng }) => {
    const n = secs(1.2);
    const x = hp(whiteNoise(n, rng), 4500);
    for (let i = 0; i < n; i++) x[i] *= 0.3 + 0.7 * Math.pow(rng(), 3);
    return mulEnv(x, adsr(n, 0.05, 0.1, 0.8, 0.5));
  }),
  d("cook.done", { gain: 0.9, cooldownMs: 300 }, () =>
    seq(1.0, [
      [0, ping(1568, 0.3, 1, 4, 0.6)],
      [0.18, ping(1568, 0.3, 1, 4, 0.6), 0.8],
    ]),
  ),
  d(
    "craft.tap",
    { variants: 3, gain: 0.75, pitch: 0.06, cooldownMs: 80 },
    ({ rng }) =>
      seq(0.3, [
        [0, thump(jit(rng, 220, 0.1), 110, 0.03), 0.8],
        [0, ping(jit(rng, 1400, 0.1), 0.05, 0.25, 3.4, 0.7), 0.5],
      ]),
  ),
  d("craft.done", { gain: 0.9, cooldownMs: 300 }, () =>
    arpeggio(79, [0, 4, 7, 12], 0.07, 0.35),
  ),
  d("machine.start", { gain: 0.7, cooldownMs: 200 }, ({ rng }) =>
    seq(0.6, [
      [0, thump(100, 60, 0.1), 0.8],
      [0.06, nburst(rng, 0.3, 700, 400, 2.5, 0.1), 0.4],
      [0.2, ping(500, 0.15, 0.4, 2.2, 0.4), 0.3],
    ]),
  ),
  d("machine.done", { gain: 0.8, cooldownMs: 200 }, () =>
    seq(1.0, [
      [0, ping(1319, 0.4, 1, 3, 0.4)],
      [0.2, ping(1760, 0.5, 1, 3, 0.4), 0.8],
    ]),
  ),
  d(
    "eat",
    { variants: 3, gain: 0.6, pitch: 0.07, cooldownMs: 200 },
    ({ rng }) => {
      const out = zeros(secs(0.6));
      for (let k = 0; k < 3; k++)
        addInto(
          out,
          seq(0.15, [
            [0, nburst(rng, 0.09, 1800 + rng() * 800, 900, 1.4, 0.02), 0.8],
            [0, thump(150, 90, 0.025), 0.4],
          ]),
          secs(k * 0.18),
          0.9 - k * 0.1,
        );
      return out;
    },
  ),
  d(
    "drink",
    { variants: 2, gain: 0.6, pitch: 0.05, cooldownMs: 300 },
    ({ rng }) => {
      const out = zeros(secs(0.7));
      for (let k = 0; k < 3; k++)
        addInto(
          out,
          blip(jit(rng, 300, 0.2), jit(rng, 200, 0.2), 0.12, 0.05),
          secs(k * 0.2),
          0.7,
        );
      addInto(out, nburst(rng, 0.4, 1500, 900, 1, 0.15), 0, 0.15);
      return out;
    },
  ),

  // ---- hall
  d("bundle.item", { gain: 0.85, cooldownMs: 100 }, () =>
    seq(0.6, [
      [0, ping(1319, 0.15, 0.6, 3, 0.5)],
      [0.08, ping(1760, 0.25, 0.6, 3, 0.5), 0.8],
    ]),
  ),
  d("bundle.complete", { gain: 1, cooldownMs: 800 }, () =>
    arpeggio(67, [0, 4, 7, 12, 16, 19, 24], 0.11, 0.7),
  ),

  // ---- people
  d("gift.give", { gain: 0.8, cooldownMs: 300 }, ({ rng }) =>
    seq(0.7, [
      [0, nburst(rng, 0.2, 3000, 1500, 0.9, 0.06), 0.3],
      [0.05, arpeggio(84, [0, 4], 0.09, 0.3), 0.8],
    ]),
  ),
  d("gift.loved", { gain: 0.95, cooldownMs: 500 }, () =>
    arpeggio(76, [0, 4, 7, 12, 16], 0.09, 0.55),
  ),
  d("heart.up", { gain: 0.9, cooldownMs: 400 }, () =>
    seq(1.4, [
      [0, ping(784, 0.5, 1.4, 2.0, 0.3)],
      [0.15, ping(988, 0.5, 1.4, 2.0, 0.3), 0.9],
      [0.3, ping(1175, 0.7, 1.4, 2.0, 0.3), 0.9],
    ]),
  ),
  d("event.start", { gain: 0.8, cooldownMs: 800 }, () =>
    arpeggio(60, [0, 7, 12, 16], 0.22, 0.9),
  ),
  d("marriage.accept", { gain: 1, cooldownMs: 1000 }, () =>
    arpeggio(60, [0, 4, 7, 12, 16, 19, 24, 28], 0.14, 0.9),
  ),
  d("wedding.bells", { gain: 0.9, cooldownMs: 1000 }, () => {
    const out = zeros(secs(4.5));
    [0, 0.5, 1.0, 1.5, 2.0, 2.5].forEach((t, i) => {
      addInto(
        out,
        ping(midiHz(i % 2 ? 72 : 67), 1.0, 2.6, 2.76, 1.2),
        secs(t),
        0.7,
      );
      addInto(
        out,
        ping(midiHz(i % 2 ? 84 : 79), 0.6, 2.0, 2.76, 0.8),
        secs(t),
        0.25,
      );
    });
    return out;
  }),
  d("mail", { gain: 0.7, cooldownMs: 300 }, ({ rng }) =>
    seq(0.5, [
      [0, nburst(rng, 0.1, 3500, 2500, 0.9, 0.02), 0.3],
      [0.05, ping(1976, 0.15, 0.5, 3, 0.4), 0.8],
      [0.13, ping(2349, 0.2, 0.5, 3, 0.4), 0.7],
    ]),
  ),

  // ---- day
  d("day.start", { gain: 0.85, cooldownMs: 1000 }, () =>
    arpeggio(72, [0, 4, 7, 9], 0.28, 1.1),
  ),
  d("day.end", { gain: 0.85, cooldownMs: 1000 }, () =>
    arpeggio(72, [12, 7, 4, 0], 0.32, 1.2),
  ),
  d("bed.sleep", { gain: 0.6, cooldownMs: 800 }, () =>
    seq(1.5, [
      [0, ping(392, 0.8, 1.5, 2, 0.2), 0.8],
      [0.3, ping(330, 0.9, 1.5, 2, 0.2), 0.6],
    ]),
  ),
  d("clock.chime", { gain: 0.5, cooldownMs: 1000 }, () =>
    seq(2, [
      [0, ping(660, 0.8, 2, 2.76, 0.7)],
      [0.5, ping(523, 1.0, 2, 2.76, 0.7), 0.8],
    ]),
  ),

  // ---- festival, weather
  d("festival.start", { gain: 0.9, cooldownMs: 1000 }, () =>
    seq(2.2, [
      [0, arpeggio(67, [0, 4, 7], 0.12, 0.5)],
      [0.5, arpeggio(72, [0, 4, 7, 12], 0.1, 0.8), 0.9],
    ]),
  ),
  d(
    "festival.cheer",
    { variants: 2, gain: 0.6, cooldownMs: 800 },
    ({ rng }) => {
      const out = zeros(secs(1.2));
      for (let k = 0; k < 6; k++)
        addInto(
          out,
          voice(
            jit(rng, 300 + rng() * 200, 0.1),
            jit(rng, 420, 0.2),
            0.5,
            jit(rng, 900, 0.2),
            1.5,
            "saw",
          ),
          secs(k * 0.05),
          0.4,
        );
      return out;
    },
  ),
  d(
    "weather.thunder",
    { variants: 2, gain: 0.9, cooldownMs: 3000 },
    ({ rng }) => {
      const n = secs(3.5);
      const x = lp(whiteNoise(n, rng), 280, 0.8);
      const env = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const t = i / 44100;
        env[i] =
          (t < 0.2 ? t / 0.2 : Math.exp(-(t - 0.2) / 0.9)) *
          (0.7 + 0.3 * Math.sin(t * 17 + rng()));
      }
      return mulEnv(x, env);
    },
  ),
  d("achievement", { gain: 0.95, cooldownMs: 800 }, () =>
    seq(1.8, [
      [0, arpeggio(72, [0, 7, 12], 0.1, 0.5)],
      [0.4, arpeggio(76, [0, 4, 7, 12], 0.09, 0.9), 0.9],
    ]),
  ),
];
