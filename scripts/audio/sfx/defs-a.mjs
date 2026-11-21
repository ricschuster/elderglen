// Effect recipes, part A: UI, tools, fishing, farm items, money, steps, doors.
// Each def: id, variants, gain (manifest level), peakDb (file peak), pitch (rate jitter), gainJitter,
// cooldownMs, render({rng, v}) -> Float32Array.
import {
  secs,
  zeros,
  osc,
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

export const DEFS_A = [
  // ---- UI
  d("ui.click", { gain: 0.6, pitch: 0.03, cooldownMs: 30 }, ({ rng }) =>
    seq(0.12, [
      [0, blip(jit(rng, 1500, 0.02), 1100, 0.06, 0.012)],
      [0, nburst(rng, 0.02, 4000, 4000, 1, 0.004), 0.15],
    ]),
  ),
  d("ui.move", { gain: 0.45, pitch: 0.04, cooldownMs: 40 }, ({ rng }) =>
    blip(jit(rng, 880, 0.02), 820, 0.05, 0.01),
  ),
  d("ui.open", { gain: 0.6, cooldownMs: 100 }, () =>
    seq(0.3, [
      [0, blip(520, 780, 0.12, 0.05)],
      [0.05, blip(780, 1040, 0.14, 0.06), 0.7],
    ]),
  ),
  d("ui.close", { gain: 0.55, cooldownMs: 100 }, () =>
    seq(0.3, [
      [0, blip(780, 520, 0.12, 0.05)],
      [0.05, blip(1040, 700, 0.14, 0.06), 0.5],
    ]),
  ),
  d("ui.confirm", { gain: 0.65, cooldownMs: 60 }, () =>
    arpeggio(79, [0, 7], 0.06, 0.1),
  ),
  d("ui.error", { gain: 0.6, cooldownMs: 120 }, () =>
    seq(0.3, [
      [0, blip(220, 190, 0.11, 0.05)],
      [0.09, blip(196, 160, 0.13, 0.06)],
    ]),
  ),
  d("ui.notify", { gain: 0.6, cooldownMs: 200 }, () =>
    arpeggio(84, [0, 4], 0.09, 0.22),
  ),
  d("ui.levelup", { gain: 0.9, cooldownMs: 500 }, () =>
    arpeggio(72, [0, 4, 7, 12, 16], 0.1, 0.5),
  ),
  d("ui.tab", { gain: 0.5, pitch: 0.03, cooldownMs: 50 }, ({ rng }) =>
    seq(0.15, [
      [0, blip(jit(rng, 660, 0.02), 700, 0.05, 0.02)],
      [0.04, blip(990, 1000, 0.05, 0.02), 0.6],
    ]),
  ),
  d("ui.toggle", { gain: 0.5, cooldownMs: 50 }, () =>
    seq(0.15, [
      [0, blip(440, 440, 0.04, 0.015)],
      [0.05, blip(660, 660, 0.06, 0.02)],
    ]),
  ),

  // ---- tools
  d(
    "tool.hoe",
    { variants: 3, gain: 0.9, pitch: 0.05, gainJitter: 0.1, cooldownMs: 80 },
    ({ rng }) => {
      const out = seq(0.35, [
        [0, thump(jit(rng, 150, 0.1), 70, 0.05), 0.9],
        [0.005, nburst(rng, 0.22, 1400, 500, 0.9, 0.06, "bp"), 0.8],
        [0.03, nburst(rng, 0.2, 3000, 1500, 1, 0.035, "hp"), 0.25],
      ]);
      return out;
    },
  ),
  d(
    "tool.water",
    { variants: 3, gain: 0.85, pitch: 0.05, cooldownMs: 120 },
    ({ rng }) => {
      const n = secs(0.5);
      const x = svf(
        whiteNoise(n, rng),
        (i) => 2200 + 1800 * Math.sin(i / 900 + rng() * 6),
        1.4,
        "bp",
      );
      mulEnv(x, adsr(n, 0.04, 0.1, 0.6, 0.25));
      const out = zeros(n);
      addInto(out, x, 0, 0.8);
      for (let k = 0; k < 6; k++)
        addInto(
          out,
          blip(jit(rng, 900, 0.5), jit(rng, 1500, 0.4), 0.05, 0.015),
          secs(0.05 + rng() * 0.35),
          0.18,
        );
      return out;
    },
  ),
  d("tool.fill", { gain: 0.8, cooldownMs: 300 }, ({ rng }) => {
    const n = secs(0.9);
    const x = svf(whiteNoise(n, rng), (i) => 600 + (2200 * i) / n, 1.8, "bp");
    mulEnv(x, adsr(n, 0.1, 0.1, 0.8, 0.2));
    const out = zeros(n);
    addInto(out, x, 0, 0.9);
    for (let k = 0; k < 10; k++)
      addInto(
        out,
        blip(500 + k * 140, 900 + k * 180, 0.06, 0.02),
        secs(k * 0.08),
        0.15,
      );
    return out;
  }),
  d(
    "tool.axe",
    { variants: 3, gain: 1, pitch: 0.05, gainJitter: 0.08, cooldownMs: 100 },
    ({ rng }) =>
      seq(0.5, [
        [0, thump(jit(rng, 190, 0.08), 85, 0.07), 1],
        [0, nburst(rng, 0.12, 2500, 900, 1.1, 0.02), 0.7],
        [0.004, nburst(rng, 0.3, 700, 400, 2.5, 0.09), 0.5],
      ]),
  ),
  d(
    "tool.pickaxe",
    { variants: 3, gain: 1, pitch: 0.05, gainJitter: 0.08, cooldownMs: 100 },
    ({ rng }) =>
      seq(0.6, [
        [0, nburst(rng, 0.05, 4500, 3000, 1.2, 0.01, "hp"), 0.8],
        [0, thump(jit(rng, 130, 0.1), 60, 0.06), 0.8],
        [0.002, ping(jit(rng, 1800, 0.06), 0.09, 0.4, 5.2, 0.8), 0.5],
        [0.002, ping(jit(rng, 2700, 0.06), 0.06, 0.3, 5.7, 0.6), 0.3],
      ]),
  ),
  d(
    "tool.scythe",
    { variants: 3, gain: 0.8, pitch: 0.06, cooldownMs: 80 },
    ({ rng }) => {
      const n = secs(0.28);
      const x = svf(
        whiteNoise(n, rng),
        (i) => 1200 + (3200 * i) / n,
        1.0,
        "bp",
      );
      mulEnv(x, adsr(n, 0.09, 0.05, 0.4, 0.14));
      const out = zeros(n);
      addInto(out, x, 0, 0.9);
      addInto(
        out,
        nburst(rng, 0.08, 5000, 5000, 0.8, 0.02, "hp"),
        secs(0.1),
        0.3,
      );
      return out;
    },
  ),
  d(
    "tool.swing",
    { variants: 2, gain: 0.5, pitch: 0.06, cooldownMs: 80 },
    ({ rng }) => {
      const n = secs(0.22);
      const x = svf(whiteNoise(n, rng), (i) => 900 + (1800 * i) / n, 0.9, "bp");
      mulEnv(x, adsr(n, 0.08, 0.03, 0.3, 0.1));
      return x;
    },
  ),

  // ---- fishing
  d("fish.cast", { gain: 0.85, cooldownMs: 200 }, ({ rng }) => {
    const n = secs(0.5);
    const x = svf(whiteNoise(n, rng), (i) => 3500 - (2600 * i) / n, 1.0, "bp");
    mulEnv(x, adsr(n, 0.05, 0.1, 0.5, 0.3));
    return seq(0.9, [
      [0, x, 0.9],
      [0.4, blip(700, 300, 0.1, 0.03), 0.5],
      [0.4, nburst(rng, 0.25, 1500, 600, 0.8, 0.07), 0.6],
    ]);
  }),
  d(
    "fish.reel",
    { variants: 2, gain: 0.45, pitch: 0.05, cooldownMs: 90 },
    ({ rng }) =>
      seq(0.12, [
        [0, nburst(rng, 0.03, 2800, 2800, 3, 0.006), 0.8],
        [0.04, nburst(rng, 0.03, 2400, 2400, 3, 0.006), 0.6],
      ]),
  ),
  d("fish.bite", { gain: 0.95, cooldownMs: 300 }, () =>
    seq(0.5, [
      [0, ping(1568, 0.15, 0.6, 2.0, 0.5)],
      [0.1, ping(2093, 0.18, 0.6, 2.0, 0.5), 0.9],
      [0.2, ping(1568, 0.15, 0.6, 2.0, 0.5), 0.7],
    ]),
  ),
  d("fish.catch", { gain: 1, cooldownMs: 400 }, () =>
    arpeggio(76, [0, 4, 7, 11, 12], 0.08, 0.4),
  ),
  d(
    "fish.splash",
    { variants: 2, gain: 0.8, pitch: 0.06, cooldownMs: 120 },
    ({ rng }) => {
      const out = nburst(rng, 0.5, 2500, 500, 0.9, 0.12);
      for (let k = 0; k < 5; k++)
        addInto(
          out,
          blip(jit(rng, 700, 0.5), jit(rng, 1400, 0.4), 0.06, 0.018),
          secs(0.03 + rng() * 0.3),
          0.3,
        );
      return out;
    },
  ),
  d("fish.lost", { gain: 0.7, cooldownMs: 300 }, () =>
    seq(0.6, [
      [0, blip(440, 300, 0.2, 0.08)],
      [0.15, blip(330, 200, 0.3, 0.12)],
    ]),
  ),

  // ---- farm and items
  d(
    "crop.plant",
    { variants: 3, gain: 0.7, pitch: 0.06, cooldownMs: 60 },
    ({ rng }) =>
      seq(0.3, [
        [0, thump(jit(rng, 120, 0.1), 80, 0.04), 0.7],
        [0, nburst(rng, 0.16, 1500, 700, 0.8, 0.04), 0.7],
        [0.07, blip(jit(rng, 600, 0.1), 500, 0.05, 0.02), 0.15],
      ]),
  ),
  d(
    "crop.harvest",
    { variants: 3, gain: 0.8, pitch: 0.05, cooldownMs: 60 },
    ({ rng }) =>
      seq(0.35, [
        [0, nburst(rng, 0.14, 2800, 1000, 1, 0.03), 0.8],
        [0, thump(jit(rng, 200, 0.1), 100, 0.04), 0.6],
        [0.1, blip(jit(rng, 900, 0.05), 1400, 0.07, 0.03), 0.4],
      ]),
  ),
  d(
    "forage.pick",
    { variants: 2, gain: 0.7, pitch: 0.06, cooldownMs: 60 },
    ({ rng }) =>
      seq(0.25, [
        [0, nburst(rng, 0.1, 3500, 1800, 1.2, 0.02), 0.7],
        [0.04, blip(jit(rng, 1200, 0.05), 1700, 0.08, 0.03), 0.5],
      ]),
  ),
  d(
    "item.pickup",
    { variants: 2, gain: 0.7, pitch: 0.05, cooldownMs: 40 },
    ({ rng }) => blip(jit(rng, 1000, 0.03), 1500, 0.12, 0.04),
  ),
  d("item.drop", { gain: 0.5, pitch: 0.05, cooldownMs: 60 }, () =>
    blip(700, 400, 0.1, 0.03),
  ),
  d(
    "world.place",
    { variants: 2, gain: 0.75, pitch: 0.05, cooldownMs: 60 },
    ({ rng }) =>
      seq(0.3, [
        [0, thump(jit(rng, 150, 0.08), 70, 0.06), 0.9],
        [0, nburst(rng, 0.1, 1200, 600, 1, 0.025), 0.5],
      ]),
  ),
  d("chest.open", { gain: 0.7, cooldownMs: 100 }, ({ rng }) =>
    seq(0.6, [
      [0, nburst(rng, 0.15, 900, 500, 3, 0.05), 0.6],
      [0.02, blip(180, 260, 0.2, 0.07), 0.6],
      [0.2, ping(1200, 0.2, 0.5, 4, 0.8), 0.25],
    ]),
  ),
  d("chest.close", { gain: 0.7, cooldownMs: 100 }, ({ rng }) =>
    seq(0.4, [
      [0, thump(140, 70, 0.07), 0.9],
      [0, nburst(rng, 0.1, 1000, 500, 2, 0.03), 0.5],
    ]),
  ),
  d("tree.fall", { gain: 1, cooldownMs: 500 }, ({ rng }) => {
    const out = seq(1.8, [[0, nburst(rng, 0.7, 1800, 300, 0.7, 0.3), 0.7]]);
    for (let k = 0; k < 7; k++)
      addInto(
        out,
        nburst(rng, 0.05, 2200, 900, 2, 0.01),
        secs(0.05 + rng() * 0.6),
        0.5,
      );
    addInto(out, thump(80, 35, 0.2, 0.8), secs(0.85), 1.0);
    addInto(out, nburst(rng, 0.5, 600, 200, 0.7, 0.15), secs(0.85), 0.6);
    return out;
  }),
  d("sprinkler.run", { gain: 0.5, cooldownMs: 500 }, ({ rng }) => {
    const n = secs(0.8);
    const x = svf(whiteNoise(n, rng), 3500, 1.2, "bp");
    for (let i = 0; i < n; i++)
      x[i] *= 0.5 + 0.5 * Math.sin((i / n) * 6.28 * 9);
    return mulEnv(x, adsr(n, 0.05, 0.05, 0.7, 0.2));
  }),

  // ---- money
  d(
    "money.sell",
    { variants: 2, gain: 0.85, pitch: 0.03, cooldownMs: 60 },
    ({ rng }) =>
      seq(0.6, [
        [0, ping(jit(rng, 2637, 0.01), 0.12, 0.5, 3.0, 0.5)],
        [0.07, ping(jit(rng, 3520, 0.01), 0.2, 0.6, 3.0, 0.5), 0.9],
      ]),
  ),
  d("money.bin", { gain: 0.8, cooldownMs: 80 }, ({ rng }) =>
    seq(0.4, [
      [0, thump(120, 60, 0.05), 0.7],
      [0, nburst(rng, 0.1, 1500, 700, 1, 0.025), 0.5],
      [0.07, ping(2200, 0.1, 0.3, 3.2, 0.5), 0.4],
    ]),
  ),
  d("money.buy", { gain: 0.85, cooldownMs: 100 }, () =>
    seq(0.7, [
      [0, ping(1760, 0.1, 0.4, 3.0, 0.5)],
      [0.06, ping(2349, 0.1, 0.4, 3.0, 0.5), 0.9],
      [0.12, ping(2960, 0.2, 0.6, 3.0, 0.5), 0.8],
    ]),
  ),

  // ---- footsteps (3 variants each; a step is short, quiet and soft)
  d(
    "step.grass",
    {
      variants: 3,
      gain: 0.28,
      pitch: 0.08,
      gainJitter: 0.15,
      cooldownMs: 110,
      peakDb: -10,
    },
    ({ rng }) =>
      seq(0.18, [
        [0, nburst(rng, 0.11, 2800, 1400, 0.8, 0.03), 0.8],
        [0, thump(jit(rng, 100, 0.1), 60, 0.03), 0.35],
      ]),
  ),
  d(
    "step.dirt",
    {
      variants: 3,
      gain: 0.3,
      pitch: 0.08,
      gainJitter: 0.15,
      cooldownMs: 110,
      peakDb: -10,
    },
    ({ rng }) =>
      seq(0.18, [
        [0, thump(jit(rng, 120, 0.1), 60, 0.035), 0.8],
        [0, nburst(rng, 0.09, 1500, 600, 0.9, 0.025), 0.7],
      ]),
  ),
  d(
    "step.wood",
    {
      variants: 3,
      gain: 0.34,
      pitch: 0.06,
      gainJitter: 0.15,
      cooldownMs: 110,
      peakDb: -10,
    },
    ({ rng }) =>
      seq(0.22, [
        [0, ping(jit(rng, 190, 0.1), 0.045, 0.25, 2.0, 0.3), 0.9],
        [0, nburst(rng, 0.04, 1300, 900, 1.8, 0.01), 0.5],
      ]),
  ),
  d(
    "step.stone",
    {
      variants: 3,
      gain: 0.32,
      pitch: 0.06,
      gainJitter: 0.15,
      cooldownMs: 110,
      peakDb: -10,
    },
    ({ rng }) =>
      seq(0.2, [
        [0, nburst(rng, 0.03, 3200, 2200, 1.4, 0.006, "hp"), 0.7],
        [0, ping(jit(rng, 800, 0.1), 0.03, 0.2, 2.5, 0.4), 0.5],
        [0, thump(jit(rng, 150, 0.1), 80, 0.025), 0.4],
      ]),
  ),
  d(
    "step.sand",
    {
      variants: 3,
      gain: 0.26,
      pitch: 0.08,
      gainJitter: 0.15,
      cooldownMs: 110,
      peakDb: -10,
    },
    ({ rng }) =>
      seq(0.22, [[0, nburst(rng, 0.16, 3400, 1800, 0.6, 0.05, "lp"), 0.8]]),
  ),
  d(
    "step.water",
    {
      variants: 3,
      gain: 0.36,
      pitch: 0.08,
      gainJitter: 0.15,
      cooldownMs: 120,
      peakDb: -9,
    },
    ({ rng }) => {
      const out = nburst(rng, 0.25, 1800, 700, 0.9, 0.07);
      addInto(
        out,
        blip(jit(rng, 600, 0.3), jit(rng, 1100, 0.3), 0.05, 0.015),
        secs(0.04),
        0.5,
      );
      addInto(
        out,
        blip(jit(rng, 800, 0.3), jit(rng, 1300, 0.3), 0.04, 0.012),
        secs(0.1),
        0.35,
      );
      return out;
    },
  ),

  // ---- doors
  d(
    "door.open",
    { variants: 2, gain: 0.75, pitch: 0.04, cooldownMs: 150 },
    ({ rng }) =>
      seq(0.5, [
        [0, nburst(rng, 0.25, 700, 1100, 4, 0.1), 0.35],
        [0.01, thump(140, 90, 0.05), 0.5],
        [0.12, ping(jit(rng, 900, 0.05), 0.05, 0.2, 2.2, 0.4), 0.2],
      ]),
  ),
  d(
    "door.close",
    { variants: 2, gain: 0.8, pitch: 0.04, cooldownMs: 150 },
    ({ rng }) =>
      seq(0.4, [
        [0, thump(100, 50, 0.08), 1],
        [0, nburst(rng, 0.1, 900, 400, 1.4, 0.03), 0.6],
      ]),
  ),
  d("door.locked", { gain: 0.7, cooldownMs: 300 }, ({ rng }) =>
    seq(0.4, [
      [0, ping(300, 0.03, 0.2, 2.4, 0.4), 0.8],
      [0.08, ping(260, 0.03, 0.2, 2.4, 0.4), 0.8],
      [0, nburst(rng, 0.04, 1500, 1500, 2, 0.01), 0.3],
    ]),
  ),
  d("door.shop", { gain: 0.8, cooldownMs: 300 }, () =>
    seq(1.0, [
      [0, ping(2093, 0.25, 1, 4.0, 0.6), 0.8],
      [0.12, ping(2637, 0.3, 1, 4.0, 0.6), 0.7],
    ]),
  ),
];
