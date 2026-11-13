/**
 * Crop pictures, drawn in code: one painter per crop so each has its own
 * silhouette as it grows (stage 0 seed mound, 1 sprout, 2 growing, 3 ripe).
 * Original pixel art, 16 by 16, lit from the top left, with a dark outline on
 * fruit. Also the tiny pictures on seed packets.
 */

type Ctx = CanvasRenderingContext2D;
const N = 16;

const px = (c: Ctx, colour: string, x: number, y: number, w = 1, h = 1) => {
  c.fillStyle = colour;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};

// ---- colour

function rgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  return (
    "#" +
    A.map((v, i) =>
      Math.round(v + (B[i]! - v) * t)
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
}

interface Tones {
  hi: string;
  light: string;
  mid: string;
  dark: string;
  line: string;
}

function tones(base: string): Tones {
  return {
    hi: mix(base, "#fffbe8", 0.6),
    light: mix(base, "#fff4d0", 0.28),
    mid: base,
    dark: mix(base, "#201028", 0.32),
    line: mix(base, "#140a18", 0.66),
  };
}

const LEAF = tones("#5aa83a");
const DEEP = tones("#3f8f35");
const WOOD = tones("#a87440");
const SOIL = tones("#6e4a2a");

// ---- shapes

const inEll = (
  x: number,
  y: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
) => {
  const nx = (x + 0.5 - cx) / rx;
  const ny = (y + 0.5 - cy) / ry;
  return nx * nx + ny * ny <= 1;
};

/** A 1px line around every pixel of a shape (4 neighbours, so corners round off). */
function outlineOf(
  c: Ctx,
  inside: (x: number, y: number) => boolean,
  colour: string,
) {
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (
        !inside(x, y) &&
        (inside(x - 1, y) ||
          inside(x + 1, y) ||
          inside(x, y - 1) ||
          inside(x, y + 1))
      )
        px(c, colour, x, y);
}

interface BlobOpt {
  outline?: boolean;
  hi?: boolean;
  /** Darken (+1) or lighten (-1) single pixels: ribs, stripes, texture. */
  shift?: (x: number, y: number, nx: number, ny: number) => number;
}

/** A shaded ellipse: light top left, dark bottom right, an outline and a glint. */
function blob(
  c: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  T: Tones,
  o: BlobOpt = {},
) {
  const inside = (x: number, y: number) => inEll(x, y, cx, cy, rx, ry);
  if (o.outline !== false) outlineOf(c, inside, T.line);
  const ramp = [T.hi, T.light, T.mid, T.dark];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (!inside(x, y)) continue;
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const l = -(nx + ny) * 0.7071;
      let k = l > 0.38 ? 1 : l < -0.3 ? 3 : 2;
      k = Math.max(0, Math.min(3, k + (o.shift?.(x, y, nx, ny) ?? 0)));
      px(c, ramp[k]!, x, y);
    }
  if (o.hi !== false) {
    const hx = Math.floor(cx - rx * 0.45);
    const hy = Math.floor(cy - ry * 0.5);
    if (inside(hx, hy)) px(c, T.hi, hx, hy);
  }
}

type Lobe = readonly [number, number, number];

/** Leafy mass: overlapping shaded lobes inside one outline. */
function bush(c: Ctx, lobes: readonly Lobe[], T: Tones, outline = true) {
  if (outline)
    outlineOf(
      c,
      (x, y) => lobes.some(([cx, cy, r]) => inEll(x, y, cx, cy, r, r)),
      T.line,
    );
  for (const [cx, cy, r] of lobes) {
    blob(c, cx, cy, r, r, T, { outline: false, hi: false });
    // a midrib glint, so overlapping leaves read apart
    if (r >= 2) {
      px(c, T.light, cx - 1, cy - 0.5);
      px(c, T.hi, cx - 1.5, cy - 1.5);
    }
  }
}

function line(
  c: Ctx,
  colour: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++)
    px(c, colour, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
}

/** A small leaf from (x, y) pointing left (-1) or right (1), tip curling up. */
function leaf(c: Ctx, x: number, y: number, dir: number, n: number, T: Tones) {
  for (let i = 0; i < n - 1; i++)
    px(c, i > 0 && i < n - 2 ? T.light : T.mid, x + dir * i, y);
  for (let i = 0; i < n - 2; i++) px(c, T.dark, x + dir * i, y + 1);
  px(c, T.mid, x + dir * (n - 1), y - 1);
}

/** A thin upright blade, leaning `lean` pixels by its tip. */
function blade(
  c: Ctx,
  x: number,
  y: number,
  h: number,
  lean: number,
  T: Pick<Tones, "light" | "mid">,
) {
  for (let i = 0; i < h; i++) {
    const f = i / Math.max(1, h - 1);
    px(c, i > h * 0.55 ? T.light : T.mid, x + Math.round(lean * f * f), y - i);
  }
}

/** A two pixel wide strap leaf (tulip, garlic). */
function strap(
  c: Ctx,
  x: number,
  y: number,
  h: number,
  lean: number,
  T: Tones,
) {
  blade(c, x + 1, y, h - 1, lean, { light: T.mid, mid: T.dark });
  blade(c, x, y, h, lean, T);
}

/** A long corn or grass leaf arching out from a stalk and drooping. */
function arch(
  c: Ctx,
  x: number,
  y: number,
  dir: number,
  len: number,
  T: Tones,
) {
  const path = [0, -1, -1, -1, 0, 0, 1, 2];
  for (let i = 1; i <= len; i++) {
    const yy = y + path[Math.min(i, path.length - 1)]!;
    px(c, T.light, x + dir * i, yy);
    if (i < len - 1) px(c, T.dark, x + dir * i, yy + 1);
  }
}

/** A frond cluster at the end of a stem. */
function tuft(c: Ctx, x: number, y: number, T: Tones) {
  px(c, T.line, x - 2, y, 1, 2);
  px(c, T.line, x + 2, y, 1, 2);
  px(c, T.line, x - 1, y - 2, 3, 1);
  px(c, T.line, x - 1, y + 2, 3, 1);
  px(c, T.mid, x - 1, y - 1, 3, 3);
  px(c, T.light, x - 1, y - 1, 2, 1);
  px(c, T.light, x - 1, y);
  px(c, T.dark, x + 1, y + 1);
  px(c, T.dark, x, y + 1);
}

/** A pixel map: each character picks a colour from `pal`, `.` is clear. */
function pmap(
  c: Ctx,
  x: number,
  y: number,
  rows: readonly string[],
  pal: Record<string, string>,
) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const colour = pal[row[i]!];
      if (colour) px(c, colour, x + i, y + j);
    }
  });
}

const palOf = (T: Tones, extra: Record<string, string> = {}) => ({
  o: T.line,
  h: T.hi,
  l: T.light,
  m: T.mid,
  d: T.dark,
  ...extra,
});

const shadow = (c: Ctx, x = 4, w = 8) => px(c, "#00000030", x, 14, w, 1);

// ---- shared stages

function seedMound(c: Ctx) {
  shadow(c, 5, 6);
  px(c, SOIL.dark, 5, 13, 6, 1);
  px(c, SOIL.mid, 6, 12, 4, 1);
  px(c, SOIL.light, 6, 12, 2, 1);
  px(c, SOIL.light, 5, 13);
  px(c, LEAF.dark, 8, 10, 1, 2);
  px(c, LEAF.light, 7, 9);
  px(c, LEAF.mid, 9, 9);
  px(c, LEAF.hi, 7, 9);
}

/** Stage 1 for most leafy crops: a stem and two leaves. */
function sprout(c: Ctx, T: Tones = LEAF) {
  shadow(c, 5, 6);
  px(c, T.dark, 8, 9, 1, 5);
  leaf(c, 7, 10, -1, 4, T);
  leaf(c, 9, 9, 1, 4, T);
  px(c, T.light, 8, 8);
}

/** Stage 1 for grasses and alliums: a few blades. */
function blades(c: Ctx, T: Tones, h = 5) {
  shadow(c, 5, 6);
  blade(c, 7, 13, h, -2, T);
  blade(c, 8, 13, h + 1, 0, T);
  blade(c, 9, 13, h - 1, 2, T);
}

/** Stage 2 for most leafy crops: a taller stem with two pairs of leaves. */
function leafy(c: Ctx, T: Tones = LEAF) {
  shadow(c);
  px(c, T.dark, 8, 5, 1, 9);
  leaf(c, 7, 11, -1, 4, T);
  leaf(c, 9, 10, 1, 5, T);
  leaf(c, 7, 7, -1, 4, T);
  leaf(c, 9, 6, 1, 4, T);
  px(c, T.light, 8, 4);
}

/** A low rosette of round leaves (stage 2 of heads and roots). */
function rosette(c: Ctx, T: Tones, top = 8) {
  shadow(c, 3, 10);
  bush(
    c,
    [
      [4.5, top + 3, 2.4],
      [11.5, top + 3, 2.4],
      [6, top, 2.4],
      [10, top, 2.4],
      [8, top + 3, 2.6],
    ],
    T,
  );
  line(c, T.light, 8, 13, 8, top + 1);
}

// ---- the crops

type Painter = (c: Ctx, s: number) => void;

/** A root showing at the soil, under a leafy top. */
function rootTop(
  c: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  root: Tones,
) {
  blob(c, cx, cy, rx, ry, root);
}

const parsnip: Painter = (c, s) => {
  if (s === 1) return sprout(c);
  const F = tones("#62b043");
  shadow(c);
  const tips: readonly (readonly [number, number])[] =
    s === 2
      ? [
          [5, 7],
          [8, 5],
          [11, 7],
        ]
      : [
          [4, 5],
          [8, 3],
          [12, 5],
          [5, 9],
          [11, 9],
        ];
  const by = s === 2 ? 13 : 10;
  if (s === 3) rootTop(c, 8, 12, 2.7, 2, tones("#efe0ac"));
  for (const [x, y] of tips) line(c, F.dark, 8, by, x, y + 1);
  for (const [x, y] of tips) tuft(c, x, y, F);
};

const potato: Painter = (c, s) => {
  const T = tones("#4a9a3a");
  if (s === 1) return sprout(c, T);
  shadow(c, 3, 10);
  bush(
    c,
    s === 2
      ? [
          [5.5, 10, 2.4],
          [10.5, 10, 2.4],
          [8, 7.5, 2.8],
        ]
      : [
          [4.5, 9, 2.6],
          [11.5, 9, 2.6],
          [8, 6, 3],
          [8, 10, 2.6],
        ],
    T,
  );
  if (s < 3) return;
  const P = tones("#c49a5a");
  blob(c, 4.5, 12.6, 2.2, 1.6, P);
  blob(c, 11.6, 13, 2, 1.4, P);
  px(c, P.dark, 5, 13);
  // pale flowers on top
  for (const [x, y] of [
    [6, 4],
    [10, 5],
  ] as const) {
    px(c, "#e8dcf8", x - 1, y, 3, 1);
    px(c, "#e8dcf8", x, y - 1, 1, 3);
    px(c, "#f0c838", x, y);
  }
};

const cauliflower: Painter = (c, s) => {
  const T = tones("#5c9c4a");
  if (s === 1) return sprout(c, T);
  if (s === 2) return rosette(c, T);
  shadow(c, 2, 12);
  bush(
    c,
    [
      [3.5, 9, 2.4],
      [12.5, 9, 2.4],
    ],
    T,
  );
  blob(c, 8, 8, 4.2, 3.4, tones("#f2ecd4"), {
    shift: (x, y) => ((x * 3 + y * 5) % 7 === 0 ? 1 : 0),
  });
  bush(
    c,
    [
      [4, 12, 2.2],
      [12, 12, 2.2],
      [8, 13, 1.8],
    ],
    T,
  );
  line(c, T.light, 4, 13, 6, 11);
  line(c, T.light, 12, 13, 10, 11);
};

const redCabbage: Painter = (c, s) => {
  const O = tones("#5f8288");
  if (s === 1) return sprout(c, O);
  if (s === 2) return rosette(c, O);
  shadow(c, 2, 12);
  bush(
    c,
    [
      [3.5, 9.5, 2.4],
      [12.5, 9.5, 2.4],
    ],
    O,
  );
  blob(c, 8, 8.6, 4.2, 3.8, tones("#8a3a8a"), {
    shift: (x, y, nx, ny) =>
      Math.abs(nx - (ny * 0.5 - 0.1)) < 0.13 && ny < 0.6 ? -1 : 0,
  });
  bush(
    c,
    [
      [4.5, 12.4, 2],
      [11.5, 12.4, 2],
    ],
    O,
  );
};

const kale: Painter = (c, s) => {
  const T = tones("#2f7a45");
  if (s === 1) return sprout(c, T);
  shadow(c, 3, 10);
  const lobes: Lobe[] =
    s === 2
      ? [
          [5, 8, 2.2],
          [11, 8, 2.2],
          [8, 6, 2.4],
          [8, 10, 2.2],
        ]
      : [
          [4.5, 9, 2.4],
          [11.5, 9, 2.4],
          [5, 4.5, 2.4],
          [11, 4.5, 2.4],
          [8, 3, 2.4],
          [8, 8, 2.8],
        ];
  bush(c, lobes, T);
  // frilly edges: a notch every other outline pixel
  for (const [cx, cy, r] of lobes)
    for (let a = 0; a < 8; a++) {
      const x = Math.round(cx + Math.cos(a * 0.785) * (r + 0.3) - 0.5);
      const y = Math.round(cy + Math.sin(a * 0.785) * (r + 0.3) - 0.5);
      if (a % 2 === 0) px(c, T.mid, x, y);
    }
  for (const [cx, cy] of lobes) line(c, "#a8cc90", 8, 13, cx, cy);
};

const artichoke: Painter = (c, s) => {
  const T = tones("#7aa48a");
  if (s === 1) return sprout(c, T);
  shadow(c, 3, 10);
  const lobes: Lobe[] =
    s === 2
      ? [
          [5, 10, 2.2],
          [11, 10, 2.2],
          [8, 8, 2.4],
        ]
      : [
          [4, 11, 2.2],
          [12, 11, 2.2],
          [8, 12, 2],
        ];
  bush(c, lobes, T);
  // spiny, deeply cut leaf tips
  for (const [x, y] of s === 2
    ? ([
        [2, 9],
        [14, 9],
        [8, 5],
        [4, 7],
        [12, 7],
      ] as const)
    : ([
        [1, 10],
        [15, 10],
        [2, 13],
        [14, 13],
      ] as const))
    px(c, T.light, x, y);
  for (const [x, y] of lobes) line(c, T.hi, 8, 13, x, y);
  if (s === 2) return;
  px(c, T.mid, 7, 6, 1, 6);
  px(c, T.dark, 8, 6, 1, 6);
  leaf(c, 6, 8, -1, 3, T);
  leaf(c, 9, 7, 1, 3, T);
  const B = tones("#6e9e5e");
  blob(c, 8, 4, 3.2, 3.3, B, {
    // overlapping scales: a dark arc under each row
    shift: (x, y) =>
      (y + 1) % 2 === 0 && (x + Math.floor(y / 2)) % 2 === 0 ? 1 : 0,
  });
  px(c, "#9a5ac8", 7, 0, 2, 1);
  px(c, "#c898e8", 7, 0);
  px(c, "#9a5ac8", 6, 1);
  px(c, "#9a5ac8", 9, 1);
};

/** A vine running along the ground with round leaves (pumpkin, melon, sweet potato). */
function vine(c: Ctx, s: number, T: Tones, stem: string) {
  if (s === 1) {
    shadow(c, 5, 6);
    px(c, stem, 8, 10, 1, 4);
    bush(
      c,
      [
        [6, 9.5, 1.8],
        [10.5, 8.5, 1.8],
      ],
      T,
    );
    return;
  }
  shadow(c, 2, 12);
  line(c, stem, 2, 12, 6, 13);
  line(c, stem, 6, 13, 13, 11);
  px(c, stem, 14, 10);
  px(c, stem, 13, 9);
  bush(
    c,
    s === 2
      ? [
          [4.5, 9.5, 2.4],
          [10.5, 8, 2.6],
          [13, 11.5, 1.8],
        ]
      : [
          [3, 6, 2.4],
          [13, 6.5, 2.2],
        ],
    T,
  );
}

const pumpkin: Painter = (c, s) => {
  const T = tones("#4f9a3a");
  vine(c, s, T, "#5a8a2a");
  if (s === 2) {
    pmap(c, 6, 11, [".y.", "yoy", ".y."], { y: "#f4c830", o: "#d8862a" });
    return;
  }
  if (s < 3) return;
  blob(c, 8, 10.4, 5.6, 3.8, tones("#e8862a"), {
    shift: (x, y, nx) => (Math.abs(Math.abs(nx) - 0.5) < 0.1 ? 1 : 0),
  });
  px(c, "#5a3a1a", 7, 5, 2, 2);
  px(c, "#8a6a3a", 7, 5);
  px(c, "#5a8a2a", 9, 5);
  px(c, "#5a8a2a", 10, 4);
};

const melon: Painter = (c, s) => {
  const T = tones("#3f8f35");
  vine(c, s, T, "#4a7a2a");
  if (s === 2) {
    pmap(c, 6, 11, [".y.", "yoy", ".y."], { y: "#f0e050", o: "#c8a030" });
    return;
  }
  if (s < 3) return;
  blob(c, 8, 10, 4.8, 4, tones("#9cc860"), {
    shift: (x, y, nx, ny) => {
      const lon = nx / Math.sqrt(Math.max(0.08, 1 - ny * ny));
      return Math.floor(lon * 2.4 + 10) % 2 === 0 ? 1 : 0;
    },
  });
  px(c, "#5a3a1a", 8, 5);
  px(c, "#4a7a2a", 9, 4, 2, 1);
};

/** A wooden stake with ties (tomato). */
function stake(c: Ctx, x: number, top: number) {
  px(c, WOOD.light, x, top, 1, 14 - top);
  px(c, WOOD.dark, x + 1, top, 1, 14 - top);
  px(c, WOOD.line, x, top - 1, 2, 1);
}

const tomato: Painter = (c, s) => {
  if (s === 1) return sprout(c, DEEP);
  shadow(c, 3, 10);
  stake(c, 11, s === 2 ? 4 : 1);
  const top = s === 2 ? 5 : 2;
  line(c, DEEP.dark, 8, 13, 9, top);
  bush(
    c,
    s === 2
      ? [
          [6, 9, 2.2],
          [9.5, 7, 2],
          [7, 12, 1.8],
        ]
      : [
          [5.5, 4.5, 2.4],
          [9.5, 3.5, 2],
          [6, 9.5, 2.6],
          [10, 8.5, 2],
          [7.5, 12.5, 1.8],
        ],
    DEEP,
  );
  px(c, WOOD.light, 11, top + 3, 1, 1);
  if (s === 2) {
    px(c, "#f4d030", 5, 8);
    px(c, "#f4d030", 9, 6);
    return;
  }
  const R = tones("#d9402c");
  for (const [x, y, r] of [
    [4.5, 7.5, 1.7],
    [9.5, 6.5, 1.6],
    [8, 11, 1.8],
  ] as const) {
    blob(c, x, y, r, r, R);
    px(c, DEEP.light, Math.floor(x), Math.floor(y - r) - 1);
  }
};

const greenBean: Painter = (c, s) => {
  if (s === 1) return sprout(c);
  shadow(c, 4, 9);
  const top = s === 2 ? 5 : 0;
  px(c, WOOD.light, 8, top, 1, 14 - top);
  px(c, WOOD.dark, 9, top, 1, 14 - top);
  // the vine twines round the pole
  for (let y = 13; y > top + 1; y--) px(c, LEAF.dark, y % 4 < 2 ? 7 : 10, y);
  const leaves: Lobe[] =
    s === 2
      ? [
          [5.5, 10, 1.8],
          [11.5, 8, 1.8],
          [6, 6.5, 1.6],
        ]
      : [
          [5, 11, 1.8],
          [12, 9, 1.8],
          [5.5, 6, 1.8],
          [12, 3.5, 1.8],
          [6, 2, 1.5],
        ];
  bush(c, leaves, DEEP);
  if (s < 3) return;
  const P = tones("#a8dc5a");
  for (const [x, y] of [
    [4.5, 8.6],
    [11, 6.4],
    [10.6, 12],
    [3.5, 3.4],
  ] as const)
    blob(c, x, y, 1, 2.3, P);
};

const hops: Painter = (c, s) => {
  if (s === 1) return sprout(c);
  shadow(c, 3, 10);
  const top = s === 2 ? 4 : 0;
  // a pole with a crossbar, and twine down to the ground
  px(c, WOOD.light, 7, top, 1, 14 - top);
  px(c, WOOD.dark, 8, top, 1, 14 - top);
  px(c, WOOD.mid, 3, top, 11, 1);
  px(c, WOOD.line, 3, top + 1, 11, 1);
  line(c, "#d8c8a0", 3, top + 2, 5, 13);
  line(c, "#d8c8a0", 13, top + 2, 11, 13);
  const T = DEEP;
  bush(
    c,
    s === 2
      ? [
          [5, 10, 1.8],
          [11, 9, 1.8],
          [5, 6.5, 1.6],
          [11.5, 6, 1.6],
        ]
      : [
          [4.5, 11, 1.8],
          [11.5, 11, 1.8],
          [4, 7, 1.8],
          [12, 7, 1.8],
          [4, 3.5, 1.6],
          [12, 3.5, 1.6],
        ],
    T,
  );
  if (s < 3) return;
  const H = tones("#d4e680");
  for (const [x, y] of [
    [3, 5.6],
    [13, 5.4],
    [5.6, 9.2],
    [10.6, 9.4],
    [3.6, 13],
  ] as const)
    blob(c, x, y, 1.3, 1.9, H, {
      shift: (_x, yy) => (yy % 2 === 0 ? 1 : 0),
      hi: false,
    });
};

const hotPepper: Painter = (c, s) => {
  if (s === 1) return sprout(c, DEEP);
  shadow(c, 3, 10);
  bush(
    c,
    s === 2
      ? [
          [5.5, 9.5, 2.2],
          [10.5, 9.5, 2.2],
          [8, 7, 2.4],
        ]
      : [
          [5, 7, 2.4],
          [11, 7, 2.4],
          [8, 4.5, 2.6],
          [8, 9.5, 2.4],
        ],
    DEEP,
  );
  px(c, DEEP.dark, 8, 11, 1, 3);
  if (s < 3) return;
  const R = tones("#d92f1f");
  const pepper = [".g.", "ohmo", "olmo", "olmo", ".omo", "..o."];
  const pal = palOf(R, { g: DEEP.light });
  pmap(c, 2, 6, pepper, pal);
  pmap(c, 10, 7, pepper, pal);
  pmap(c, 6, 9, pepper, pal);
};

const eggplant: Painter = (c, s) => {
  const T = tones("#4f8a50");
  if (s === 1) return sprout(c, T);
  shadow(c, 3, 10);
  px(c, "#5a3a6a", 8, 6, 1, 8);
  bush(
    c,
    s === 2
      ? [
          [5.5, 9, 2.4],
          [10.5, 8, 2.4],
          [8, 5.5, 2.4],
        ]
      : [
          [4.5, 5, 2.6],
          [11.5, 5, 2.6],
          [8, 3, 2.4],
        ],
    T,
  );
  if (s === 2) {
    px(c, "#b88ae0", 7, 11);
    px(c, "#f0d040", 7, 11);
    return;
  }
  const E = tones("#5a2a7a");
  for (const [x, y] of [
    [5, 10.4],
    [11, 10.8],
  ] as const) {
    blob(c, x, y, 2, 2.9, E);
    px(c, T.mid, x - 1.5, y - 3.4, 3, 1);
    px(c, T.light, x - 0.5, y - 4.4);
  }
};

const cranberry: Painter = (c, s) => {
  const T = tones("#3f7a3a");
  if (s === 1) return sprout(c, T);
  shadow(c, 2, 12);
  bush(
    c,
    [
      [4, 10.5, 2.4],
      [8, 9, 2.8],
      [12, 10.5, 2.4],
      [6, 12, 2],
      [10, 12, 2],
    ],
    T,
  );
  for (let y = 7; y < 14; y++)
    for (let x = 2; x < 14; x++)
      if ((x * 5 + y * 3) % 7 === 0) px(c, T.light, x, y);
  if (s < 3) return;
  for (const [x, y] of [
    [3, 9],
    [6, 7],
    [9, 9],
    [12, 8],
    [5, 11],
    [11, 11],
    [8, 12],
  ] as const) {
    px(c, "#7a1428", x, y, 2, 2);
    px(c, "#d42c40", x, y);
    px(c, "#ff8a90", x, y);
    px(c, "#b01c32", x + 1, y);
  }
};

const emberBerry: Painter = (c, s) => {
  const T = tones("#5a6c3a");
  if (s === 1) return sprout(c, T);
  shadow(c, 3, 10);
  bush(
    c,
    [
      [5, 9, 2.4],
      [11, 9, 2.4],
      [8, 5.5, 2.8],
      [8, 11, 2.4],
    ],
    T,
  );
  // spiky shoots
  for (const [x, y] of [
    [3, 6],
    [13, 6],
    [6, 2],
    [10, 2],
  ] as const)
    px(c, T.light, x, y);
  if (s < 3) return;
  const B = tones("#f06018");
  for (const [x, y] of [
    [5, 7],
    [10, 5],
    [8, 10],
    [12, 10],
  ] as const) {
    px(c, "#ffb04040", x - 2, y - 2, 5, 5);
    blob(c, x + 0.5, y + 0.5, 1.5, 1.5, B, { hi: false });
    px(c, "#fff0a0", x - 1, y - 1);
  }
};

const corn: Painter = (c, s) => {
  const T = tones("#5aa83a");
  if (s === 1) return blades(c, T, 5);
  shadow(c, 4, 8);
  const top = s === 2 ? 4 : 2;
  px(c, T.light, 7, top, 1, 14 - top);
  px(c, T.dark, 8, top, 1, 14 - top);
  arch(c, 7, 11, -1, 6, T);
  arch(c, 8, 9, 1, 6, T);
  arch(c, 7, 6, -1, 5, T);
  if (s === 3) arch(c, 8, 4, 1, 4, T);
  if (s < 3) {
    blade(c, 7, top, 2, 0, T);
    return;
  }
  // tassel
  pmap(c, 5, 0, ["t.t.t", ".tTt.", "..T.."], {
    t: "#e8d090",
    T: "#c8a050",
  });
  // cobs in their husks
  const K = tones("#f2cc3a");
  for (const [x, y] of [
    [10.6, 8.4],
    [4.8, 10.8],
  ] as const) {
    blob(c, x, y, 1.5, 2.5, K, {
      shift: (xx, yy) => ((xx + yy) % 2 === 0 ? 1 : 0),
    });
    px(c, T.mid, x - 1.5, y + 0.5, 1, 2);
    px(c, T.dark, x + 0.5, y + 1.5, 1, 1);
    px(c, "#8a5a2a", x - 0.5, y - 3.5);
  }
};

const wheat: Painter = (c, s) => {
  const G = tones("#6ab845");
  if (s === 1) return blades(c, G, 4);
  shadow(c, 2, 12);
  const ripe = s === 3;
  const stalk = ripe ? tones("#c89a3a") : G;
  const ear = ripe ? tones("#e8c058") : tones("#8cc858");
  const stalks = [
    [3, 6, -1],
    [6, 4, 0],
    [9, 3, 0],
    [12, 5, 1],
    [7.5, 7, 0],
  ] as const;
  for (const [x, top, lean] of stalks) {
    const t = s === 2 ? top + 3 : top;
    line(c, stalk.mid, x - lean, 13, x, t + 3);
    if (s === 2) {
      px(c, ear.mid, x, t, 1, 3);
      px(c, ear.light, x, t);
      continue;
    }
    pmap(c, x - 1, t - 1, [".h", "lm", "md", "lm", "md", ".d"], palOf(ear));
    px(c, ear.hi, x - 1, t - 2);
  }
  if (!ripe) {
    blade(c, 4, 13, 4, -2, G);
    blade(c, 11, 13, 4, 2, G);
  }
};

const garlic: Painter = (c, s) => {
  const T = tones("#6aa850");
  if (s === 1) return blades(c, T, 4);
  shadow(c, 4, 8);
  const h = s === 2 ? 8 : 10;
  if (s === 3)
    blob(c, 8, 12, 2.7, 2.1, tones("#ece2d6"), {
      shift: (x, y, nx) => (Math.abs(Math.abs(nx) - 0.45) < 0.12 ? 1 : 0),
    });
  const by = s === 3 ? 10 : 13;
  strap(c, 6, by, h - 2, -3, T);
  strap(c, 8, by, h, 1, T);
  strap(c, 9, by, h - 3, 4, T);
  if (s === 3) {
    px(c, "#b88ac0", 7, 12);
    // a curled flower stalk
    pmap(c, 10, 0, [".mm", "m.m", "..m"], palOf(T));
  }
};

const radish: Painter = (c, s) => {
  if (s === 1) return sprout(c);
  const T = tones("#4a9a3a");
  shadow(c, 4, 8);
  const lobes: Lobe[] =
    s === 2
      ? [
          [5.5, 9, 2],
          [10.5, 9, 2],
          [8, 7, 2.2],
        ]
      : [
          [4.5, 6, 2.2],
          [11.5, 6, 2.2],
          [8, 4, 2.4],
        ];
  const by = s === 2 ? 13 : 10;
  for (const [x, y] of lobes) line(c, T.dark, 8, by, x, y);
  bush(c, lobes, T);
  for (const [x, y] of lobes) line(c, T.light, 8, by - 1, x, y);
  if (s === 3) {
    blob(c, 8, 11.6, 2.8, 2.5, tones("#e04a7a"));
    px(c, "#f4ecec", 8, 14);
  }
};

const beet: Painter = (c, s) => {
  const T = tones("#3f8a3a");
  if (s === 1) return sprout(c, T);
  shadow(c, 3, 10);
  const lobes: Lobe[] =
    s === 2
      ? [
          [5, 8.5, 2.2],
          [11, 8.5, 2.2],
          [8, 6, 2.4],
        ]
      : [
          [4, 5.5, 2.4],
          [12, 5.5, 2.4],
          [8, 3, 2.6],
          [5, 9, 1.8],
          [11, 9, 1.8],
        ];
  const by = s === 2 ? 13 : 10;
  bush(c, lobes, T);
  for (const [x, y] of lobes) line(c, "#b0244c", 8, by, x, y);
  if (s === 3) {
    blob(c, 8, 12, 3, 2.3, tones("#8e1c40"));
    px(c, "#5a1028", 8, 14);
  }
};

const sweetPotato: Painter = (c, s) => {
  const T = tones("#5a9a40");
  vine(c, s, T, "#7a4a6a");
  if (s < 3) return;
  blob(c, 6.5, 11.6, 3.4, 1.8, tones("#cc6a52"));
  blob(c, 12, 12.6, 2.2, 1.4, tones("#cc6a52"));
  bush(
    c,
    [
      [8.5, 7, 2],
      [4, 9, 1.6],
    ],
    T,
  );
};

// ---- flowers

/** Stage 2 of a flower: a leafy stem and a closed bud showing its colour. */
function bud(c: Ctx, colour: string, T: Tones = LEAF) {
  shadow(c, 5, 6);
  px(c, T.dark, 8, 5, 1, 9);
  leaf(c, 7, 11, -1, 4, T);
  leaf(c, 9, 9, 1, 4, T);
  pmap(c, 7, 2, [".c.", "lcm", "lmd", ".m."], { ...palOf(T), c: colour });
}

const tulip: Painter = (c, s) => {
  const T = tones("#4f9a52");
  const P = tones("#f07aa0");
  if (s === 1) return blades(c, T, 4);
  if (s === 2) {
    shadow(c, 5, 6);
    strap(c, 5, 13, 6, -2, T);
    strap(c, 9, 13, 6, 2, T);
    pmap(c, 7, 3, [".c.", "mcm", "lmd"], { ...palOf(T), c: P.mid });
    px(c, T.dark, 8, 6, 1, 8);
    return;
  }
  shadow(c, 4, 8);
  px(c, T.dark, 8, 8, 1, 6);
  strap(c, 4, 13, 7, -2, T);
  strap(c, 10, 13, 7, 2, T);
  pmap(
    c,
    5,
    1,
    [
      ".o.o.o.",
      "ohoooo",
      "olhmmdo",
      "olmmmdo",
      "olmmddo",
      ".oldmo.",
      "..ooo..",
    ].map((r) => r.padEnd(7, ".")),
    palOf(P),
  );
  pmap(c, 5, 1, [".......", ".h.m.d."], palOf(P));
};

const poppy: Painter = (c, s) => {
  const T = tones("#5a9a5a");
  if (s === 1) return sprout(c, T);
  shadow(c, 5, 6);
  line(c, T.dark, 8, 13, 7, 6);
  leaf(c, 7, 11, -1, 4, T);
  leaf(c, 9, 10, 1, 4, T);
  if (s === 2) {
    // a nodding bud
    line(c, T.dark, 7, 6, 9, 3);
    pmap(c, 9, 3, [".m", "mc", "lm"], { ...palOf(T), c: "#d9322a" });
    return;
  }
  pmap(
    c,
    3,
    1,
    [
      "..oo..oo..",
      ".ohlo.lmo.",
      "ohllmolmdo",
      "olmmkkmddo",
      "olmkyykmdo",
      ".omkkkkdo.",
      ".omdmmddo.",
      "..oodddo..",
      "....oo....",
    ],
    palOf(tones("#e0342a"), { k: "#2a1420", y: "#5a4a7a" }),
  );
};

const sunflower: Painter = (c, s) => {
  const T = tones("#4a9a3a");
  if (s === 1) return sprout(c, T);
  shadow(c, 4, 8);
  const top = s === 2 ? 5 : 7;
  px(c, T.light, 7, top, 1, 14 - top);
  px(c, T.dark, 8, top, 1, 14 - top);
  bush(
    c,
    [
      [4.5, 11, 2],
      [11.5, 9.5, 2],
    ],
    T,
  );
  if (s === 2) {
    blob(c, 8, 4, 2.4, 2.2, T);
    px(c, "#f4cf2a", 6, 2);
    px(c, "#f4cf2a", 10, 3);
    return;
  }
  const Y = tones("#f4c82a");
  // a ring of petals round a seed-brown middle, petal tips round the edge
  blob(c, 8, 4.6, 4, 3.8, Y, { hi: false });
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    const tx = 8 + Math.cos(ang) * 4.6 - 0.5;
    const ty = 4.6 + Math.sin(ang) * 4.4 - 0.5;
    px(c, a > 2 && a < 7 ? Y.light : Y.mid, tx, ty);
    const g = ang + Math.PI / 8;
    px(c, Y.dark, 8 + Math.cos(g) * 3.3 - 0.5, 4.6 + Math.sin(g) * 3.2 - 0.5);
  }
  blob(c, 8, 4.6, 2.2, 2.1, tones("#6a3e1a"), {
    shift: (x, y) => ((x + y * 2) % 3 === 0 ? 1 : 0),
  });
};

const dahlia: Painter = (c, s) => {
  const T = tones("#3f8a3a");
  const P = tones("#9a52d0");
  if (s === 1) return sprout(c, T);
  if (s === 2) return bud(c, P.mid, T);
  shadow(c, 3, 10);
  px(c, T.dark, 8, 8, 1, 6);
  bush(
    c,
    [
      [4.5, 11, 2.2],
      [11.5, 11, 2.2],
      [8, 12, 1.8],
    ],
    T,
  );
  blob(c, 8, 5.2, 4.2, 4, P, {
    shift: (x, y, nx, ny) => {
      const d = Math.sqrt(nx * nx + ny * ny);
      return d > 0.2 && Math.floor(d * 4.2) % 2 === 1 ? 1 : 0;
    },
  });
  px(c, "#f0d870", 8, 4);
};

const zinnia: Painter = (c, s) => {
  const T = tones("#4a9a3a");
  const P = tones("#f0882a");
  if (s === 1) return sprout(c, T);
  if (s === 2) return bud(c, P.mid, T);
  shadow(c, 4, 8);
  line(c, T.dark, 8, 13, 7, 5);
  line(c, T.dark, 8, 11, 12, 8);
  leaf(c, 7, 11, -1, 4, T);
  leaf(c, 10, 11, 1, 3, T);
  blob(c, 12, 8, 2.2, 1.8, P, {
    shift: (x) => (x % 2 === 0 ? 1 : 0),
  });
  px(c, "#8a2a1a", 12, 7);
  blob(c, 7, 4.6, 4.2, 3, P, {
    shift: (x, y, nx) => (Math.abs(nx) > 0.35 && x % 2 === 0 ? 1 : 0),
  });
  pmap(c, 6, 2, [".rr.", "rkyr", ".rr."], {
    r: "#a02a1a",
    k: "#6a1a10",
    y: "#f8e040",
  });
};

const cornflower: Painter = (c, s) => {
  const T = tones("#6a9a7a");
  const B = tones("#4a78d8");
  if (s === 1) return blades(c, T, 4);
  shadow(c, 4, 8);
  const heads: readonly (readonly [number, number])[] =
    s === 2
      ? [
          [5, 6],
          [10, 5],
        ]
      : [
          [3, 4],
          [8, 1],
          [11, 6],
        ];
  for (const [x, y] of heads) line(c, T.mid, 8, 13, x + 2, y + 4);
  blade(c, 6, 13, 5, -2, T);
  blade(c, 10, 13, 5, 2, T);
  for (const [x, y] of heads) {
    if (s === 2) {
      pmap(c, x + 1, y + 1, [".c.", "lmd", ".m."], { ...palOf(T), c: B.mid });
      continue;
    }
    pmap(
      c,
      x,
      y,
      ["h.l.m", ".lmd.", "lmkmd", ".oddo", "..o.."],
      palOf(B, { k: "#20307a" }),
    );
  }
};

const PAINTERS: Record<string, Painter> = {
  parsnip,
  potato,
  cauliflower,
  melon,
  tomato,
  radish,
  "green-bean": greenBean,
  kale,
  garlic,
  "hot-pepper": hotPepper,
  corn,
  "red-cabbage": redCabbage,
  pumpkin,
  eggplant,
  "sweet-potato": sweetPotato,
  beet,
  cranberry,
  artichoke,
  wheat,
  "ember-berry": emberBerry,
  hops,
  tulip,
  cornflower,
  poppy,
  zinnia,
  sunflower,
  dahlia,
};

/** A crop with no painter of its own: a leafy plant with fruit of its colour. */
function generic(c: Ctx, s: number, fruit: string) {
  if (s === 1) return sprout(c);
  if (s === 2) return leafy(c);
  shadow(c, 3, 10);
  bush(
    c,
    [
      [5, 8, 2.4],
      [11, 8, 2.4],
      [8, 5, 2.6],
      [8, 10, 2.4],
    ],
    LEAF,
  );
  const F = tones(fruit);
  for (const [x, y] of [
    [5, 10],
    [11, 9],
    [8, 5],
  ] as const)
    blob(c, x, y, 1.7, 1.7, F);
}

/** Paint one growth stage (0 to 3) of a crop onto a clear 16 by 16 canvas. */
export function paintCropStage(
  c: Ctx,
  id: string,
  stage: number,
  fruit: string,
): void {
  if (stage === 0) return seedMound(c);
  const p = PAINTERS[id];
  if (p) p(c, stage);
  else generic(c, stage, fruit);
}

/** A seed packet: paper, a fold, and a small picture of the ripe crop. */
export function paintSeedPacket(c: Ctx, id: string, fruit: string): void {
  px(c, "#a89870", 2, 1, 12, 14);
  px(c, "#f0e6c8", 3, 2, 10, 12);
  px(c, "#d8ccaa", 3, 2, 10, 2);
  px(c, "#c0b28c", 3, 4, 10, 1);
  px(c, "#e0d4b4", 12, 5, 1, 9);
  // draw the ripe crop at half size into the picture window
  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = N;
  const t = tmp.getContext("2d")!;
  paintCropStage(t, id, 3, fruit);
  px(c, "#cfe0e8", 4, 5, 8, 8);
  c.imageSmoothingEnabled = false;
  c.drawImage(tmp, 0, 0, N, N, 4, 5, 8, 8);
}
