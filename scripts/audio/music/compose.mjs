// Renders a track description into a mono loop. Composition is note data: a chord per bar from the
// progression, an accompaniment pattern, a bass line, and a lead melody generated from the seed with
// musical constraints (steps over leaps, chord tones on strong beats, phrase ends rest on chord tones).
// Notes that run past the end wrap to the start and the reverb runs two passes, so the loop is seamless.
import {
  SR,
  rngOf,
  zeros,
  addInto,
  reverb,
  secs,
  scale as scaleBuf,
  lp,
} from "../lib/dsp.mjs";
import * as V from "../lib/voices.mjs";

const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

/** MIDI note of scale degree `deg` (0 is the tonic, negative and above 6 wrap by octave). */
function degToMidi(root, mode, deg) {
  const s = MODES[mode];
  const oct = Math.floor(deg / 7);
  const i = ((deg % 7) + 7) % 7;
  return root + s[i] + 12 * oct;
}

// Rhythm cells in eighth note slots per bar of 4 beats (8 slots): [slot, lengthInSlots].
const CELLS_4 = [
  [
    [0, 2],
    [2, 2],
    [4, 2],
    [6, 2],
  ],
  [
    [0, 3],
    [3, 1],
    [4, 2],
    [6, 2],
  ],
  [
    [0, 2],
    [2, 1],
    [3, 1],
    [4, 4],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 2],
    [4, 3],
    [7, 1],
  ],
  [
    [0, 4],
    [4, 2],
    [6, 2],
  ],
  [
    [0, 2],
    [2, 2],
    [4, 4],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 2],
    [4, 2],
    [6, 2],
  ],
  [
    [2, 2],
    [4, 2],
    [6, 2],
  ],
];
const CELLS_3 = [
  [
    [0, 2],
    [2, 2],
    [4, 2],
  ],
  [
    [0, 3],
    [3, 1],
    [4, 2],
  ],
  [
    [0, 2],
    [2, 4],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 2],
    [4, 2],
  ],
];

function chordOf(deg) {
  return [deg, deg + 2, deg + 4];
}

/** Lead melody for one phrase of `bars` bars: returns notes [{bar, slot, len, deg}] relative to the tonic. */
function phrase(rng, prog, startBar, bars, beats, density, end) {
  const cells = beats === 3 ? CELLS_3 : CELLS_4;
  const notes = [];
  let cur = 4 + Math.floor(rng() * 3); // around the 5th to 7th degree above the tonic
  let dir = rng() < 0.5 ? -1 : 1;
  for (let b = 0; b < bars; b++) {
    const bar = startBar + b;
    if (rng() > density && b !== bars - 1) continue;
    const chord = chordOf(prog[bar % prog.length] - 1);
    const cell = cells[Math.floor(rng() * cells.length)];
    cell.forEach(([slot, len], i) => {
      const strong = slot % 4 === 0;
      const last = b === bars - 1 && i === cell.length - 1;
      let target = cur;
      if (last && end !== undefined) target = end;
      else {
        const step = rng() < 0.7 ? 1 : rng() < 0.5 ? 2 : 3;
        if (rng() < 0.25) dir = -dir;
        target = cur + dir * step;
        if (target > 11) {
          target = 9;
          dir = -1;
        }
        if (target < 2) {
          target = 4;
          dir = 1;
        }
        if (strong) {
          // Pull to the nearest chord tone (by pitch class), keeping the octave.
          let best = target;
          let bestD = 99;
          for (let o = -2; o <= 2; o++)
            for (const c of chord) {
              const cand = c + 7 * o;
              const dd = Math.abs(cand - target);
              if (dd < bestD) {
                bestD = dd;
                best = cand;
              }
            }
          target = best;
        }
      }
      cur = target;
      notes.push({ bar, slot, len, deg: target });
    });
  }
  return notes;
}

/** Whole-track melody: A, A varied, B, A with a cadence on the tonic. */
function melody(rng, t) {
  const phraseBars = 4;
  const sections = Math.ceil(t.bars / phraseBars);
  const A = [];
  const baseSeed = Math.floor(rng() * 1e9);
  const gen = (seed, start, end) =>
    phrase(rngOf(seed), t.prog, start, phraseBars, t.beats, t.leadDensity, end);
  const out = [];
  for (let s = 0; s < sections; s++) {
    const start = s * phraseBars;
    const kind = s % 4; // 0 A, 1 A', 2 B, 3 A''
    const end =
      kind === 3 || s === sections - 1 ? 7 : kind === 1 ? 4 : undefined;
    const seed = kind === 2 ? baseSeed + 77 : baseSeed;
    const ph = gen(seed, start, end);
    // Keep the shape of A by regenerating with the same seed but a different last note.
    out.push(...ph);
    void A;
  }
  return out;
}

const VOICE = {
  pluck: (m, d, rng) => V.pluck(m, d, rng),
  piano: (m, d, rng) => V.piano(m, d, rng),
  flute: (m, d, rng) => V.flute(m, d, rng),
  mallet: (m, d, rng) => V.mallet(m, d, rng),
  bell: (m, d, rng) => V.bell(m, d, rng),
  pad: (m, d, rng) => V.pad(m, d, rng),
};

/** Accompaniment slots for one bar: [slot, chordIndex, lenSlots]. */
function compPattern(kind, beats) {
  if (beats === 3)
    return [
      [0, 0, 2],
      [2, 1, 2],
      [4, 2, 2],
    ]; // waltz arpeggio
  switch (kind) {
    case "arp":
      return [
        [0, 0, 4],
        [1, 1, 3],
        [2, 2, 3],
        [3, 1, 3],
        [4, 0, 4],
        [5, 1, 3],
        [6, 2, 3],
        [7, 1, 3],
      ];
    case "arp-slow":
      return [
        [0, 0, 4],
        [2, 1, 4],
        [4, 2, 4],
        [6, 1, 3],
      ];
    case "strum":
      return [
        [0, 0, 4],
        [0, 1, 4],
        [0, 2, 4],
        [3, 1, 3],
        [3, 2, 3],
        [4, 0, 4],
        [4, 1, 4],
        [6, 2, 3],
      ];
    case "block":
      return [
        [0, 0, 8],
        [0, 1, 8],
        [0, 2, 8],
      ];
    case "sparse":
      return [
        [0, 0, 8],
        [4, 2, 4],
      ];
    default:
      return [];
  }
}

/**
 * Render one track. t: {seed, bpm, beats, bars, root, mode, prog, comp, compVoice, lead, leadVoice,
 * leadDensity, leadOct, bass, pad, perc, mix:{comp,lead,bass,pad,perc}, verb:{wet,room,damp}, loop}
 */
export function renderTrack(t) {
  const rng = rngOf(t.seed);
  const spb = 60 / t.bpm;
  const barS = spb * t.beats;
  const slotS = spb / 2;
  const loop = t.loop !== false;
  // Loops are sized to about 70 seconds (a whole number of 4 bar phrases); a stinger keeps its bars.
  t = {
    ...t,
    bars: loop ? Math.max(8, Math.round(70 / barS / 4) * 4) : t.bars,
  };
  const len = secs(barS * t.bars);
  const dry = zeros(loop ? len : len + secs(3));
  const w = loop;
  const mix = {
    comp: 0.5,
    lead: 0.55,
    bass: 0.5,
    pad: 0.22,
    perc: 0.3,
    ...t.mix,
  };
  const sec = (bar, slot) => secs(bar * barS + slot * slotS);

  for (let bar = 0; bar < t.bars; bar++) {
    const deg = t.prog[bar % t.prog.length] - 1;
    const chord = chordOf(deg).map((d) => degToMidi(t.root, t.mode, d));
    // Accompaniment
    if (t.comp) {
      for (const [slot, ci, ln] of compPattern(t.comp, t.beats)) {
        const midi = chord[ci] + (t.comp === "block" || ci === 0 ? 0 : 0);
        const voice = VOICE[t.compVoice ?? "pluck"];
        const jitter = (rng() - 0.5) * 0.004;
        const buf = voice(midi, ln * slotS, rng);
        const strum = t.comp === "strum" ? ci * 0.012 : 0;
        addInto(
          dry,
          buf,
          sec(bar, slot) + secs(strum + Math.max(0, jitter)),
          mix.comp * (0.8 + 0.2 * rng()),
          w,
        );
      }
    }
    // Bass on the downbeat (and the third beat in 4/4)
    if (t.bass) {
      const root = degToMidi(t.root, t.mode, deg) - 12;
      addInto(dry, V.bass(root, barS * 0.45, rng), sec(bar, 0), mix.bass, w);
      if (t.beats === 4)
        addInto(
          dry,
          V.bass(
            chord[2] - 12 - (chord[2] - 12 > root + 12 ? 12 : 0),
            barS * 0.3,
            rng,
          ),
          sec(bar, 4),
          mix.bass * 0.7,
          w,
        );
    }
    // Pad: one long chord per bar pair
    if (t.pad && bar % 2 === 0) {
      for (const m of chord)
        addInto(
          dry,
          V.pad(m - 12 + 12, barS * 2, rng),
          sec(bar, 0),
          mix.pad * 0.5,
          w,
        );
    }
    // Percussion
    if (t.perc && t.perc !== "none") {
      const slots = t.beats === 3 ? [0, 2, 4] : [0, 1, 2, 3, 4, 5, 6, 7];
      for (const s of slots) {
        const g = t.perc === "heartbeat" ? 0 : s % 2 === 0 ? 1 : 0.55;
        if (t.perc === "shaker" || t.perc === "soft")
          addInto(dry, V.shaker(rng), sec(bar, s), mix.perc * 0.45 * g, w);
        if (t.perc === "soft" && (s === 0 || s === 4))
          addInto(dry, V.softKick(rng), sec(bar, s), mix.perc * 0.9, w);
        if (t.perc === "soft" && s === 6)
          addInto(dry, V.rim(rng), sec(bar, s), mix.perc * 0.5, w);
      }
      if (t.perc === "heartbeat" && bar % 2 === 0) {
        addInto(dry, V.softKick(rng), sec(bar, 0), mix.perc, w);
        addInto(dry, V.softKick(rng), sec(bar, 1.5), mix.perc * 0.6, w);
      }
    }
  }
  // Lead
  if (t.lead) {
    const notes = melody(rng, t);
    for (const n of notes) {
      const midi = degToMidi(t.root + (t.leadOct ?? 12), t.mode, n.deg - 7);
      const voice = VOICE[t.leadVoice ?? "flute"];
      addInto(
        dry,
        voice(midi, n.len * slotS * 0.95, rng),
        sec(n.bar, n.slot),
        mix.lead * (0.85 + 0.15 * rng()),
        w,
      );
    }
  }
  let out = reverb(dry, {
    wet: t.verb?.wet ?? 0.28,
    room: t.verb?.room ?? 0.82,
    damp: t.verb?.damp ?? 0.45,
    loop,
    tail: 2.5,
  });
  if (t.lowpass) out = lp(out, t.lowpass, 0.7);
  return out;
}
