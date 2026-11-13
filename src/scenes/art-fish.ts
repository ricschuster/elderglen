import type Phaser from "phaser";

/**
 * Painted 16x16 item pictures for the fish (note 99, "Fish pictures"). There are
 * eight body shapes. Each fish picks a shape and a short palette: `d` back, `b`
 * body, `l` belly, `f` fins, and an optional `m` for the marks (spots or stripes
 * the shape carries as `m`; without one the marks take the body colour). The
 * outline is the back colour, darkened. Fish face right, light from the top left.
 */

const SIZE = 16;
const EYE = "#f6f2e2";

export type FishShape =
  "slim" | "stout" | "deep" | "long" | "cat" | "eel" | "ray" | "squid";

/** `.` clear, `o` outline, `e` eye, `w` barbel, the rest from the palette. */
export const SHAPES: Record<FishShape, string[]> = {
  slim: [
    "......oooooo....",
    "..oo.oddddddoo..",
    ".offoddddddddboo",
    "offfobbmbmbbbbeo",
    "offolllllllllo..",
    ".offolllllllllbo",
    "..oo.ollllllloo.",
    "......oooooo....",
  ],
  stout: [
    ".....oooooo.....",
    "....oddddddoo...",
    "..oooddddddddoo.",
    ".offobbmbbmbbebo",
    "offfobbbbbbbbbbo",
    ".offolllllllllbo",
    "..oooollllllloo.",
    ".....oooooooo...",
  ],
  deep: [
    "......ooo.......",
    "....oodddoo.....",
    "..oooddddddoo...",
    ".offodddddddddoo",
    "offfobbbmbbmbebo",
    "offfobbbbbbbbbbo",
    ".offolllllllllbo",
    "..oooollllllloo.",
    "....oolllllloo..",
    ".....oooooo.....",
  ],
  long: [
    "...ooooooooooo..",
    ".ooddddddddddooo",
    "offoddddddddbbeo",
    "offobbmbmbmbbbbo",
    "offolllllllllllo",
    ".oooollllllllloo",
    "...oooooooooo...",
  ],
  cat: [
    ".....oooooo.....",
    "....oddddddoo...",
    "..oooddddddddoo.",
    ".offobbbbbbbebow",
    "offfobbbmbmbbbo.",
    "offfollllllllowo",
    ".offolllllllllbo",
    "..oooollllllloo.",
    ".....oooooooo...",
  ],
  eel: [
    "........oooo....",
    "..oooo.oddddoo..",
    ".oddddoobbbbbeo.",
    "oblllbbooolllbo.",
    "ooooooo.oooooo..",
  ],
  ray: [
    ".......oo.......",
    ".....oodddoo....",
    "...oodddddddoo..",
    ".oodddeddedddbo.",
    "oolllllllllllloo",
    ".ooollllllllooo.",
    "...oooooooooo...",
  ],
  squid: [
    ".......oo.......",
    "......obbo......",
    ".....obbbbo.....",
    ".....obmmbo.....",
    ".....obbbbo.....",
    "....oebbbbeo....",
    ".....ollllo.....",
    "....ollllllo....",
    "....ofofofofo...",
    ".....o.o.o.o....",
  ],
};

export interface FishLook {
  shape: FishShape;
  d: string;
  b: string;
  l: string;
  f: string;
  m?: string;
}

const look = (
  shape: FishShape,
  d: string,
  b: string,
  l: string,
  f: string,
  m?: string,
): FishLook => ({ shape, d, b, l, f, ...(m ? { m } : {}) });

/** One look per fish id in `fish.json`. A test fails when a fish has none. */
export const FISH_LOOKS: Record<string, FishLook> = {
  // river
  reedling: look("slim", "#4e6a3a", "#7c9a52", "#d8d89a", "#a8b46a"),
  brookslip: look(
    "slim",
    "#7a6a4a",
    "#b49a6a",
    "#ecdcb0",
    "#c8a870",
    "#8a5a3a",
  ),
  millrun: look("stout", "#5a4630", "#8a6a44", "#d4bc8a", "#a07a4a"),
  ferrywhisker: look("cat", "#5a5a52", "#8c8a7a", "#d0ccb8", "#6c6a5c"),
  salmon: look("long", "#56687a", "#d68a7e", "#f4cfc0", "#9a4e50", "#b04e52"),
  "hearthside-dace": look("slim", "#6a6a5a", "#aab0a0", "#f08a52", "#d8683a"),
  "tallow-eel": look("eel", "#8a7a3a", "#d0b45a", "#f0e0a0", "#b09840"),
  silverthread: look("slim", "#6a7a8e", "#c4ced8", "#f4f6f8", "#9aaabc"),
  "old-mossback": look(
    "deep",
    "#3a5230",
    "#5e7a40",
    "#a4b270",
    "#4a6234",
    "#78903e",
  ),
  // forest lake
  carp: look("stout", "#6a5428", "#b08a3a", "#e8cf80", "#8a6a30"),
  perch: look("stout", "#3e5a32", "#7a9a48", "#e8e090", "#d8683a", "#2e4228"),
  fernfin: look("stout", "#2e6a46", "#4e9a62", "#a8dca0", "#7ac47e"),
  "mushroom-loach": look(
    "eel",
    "#6a5238",
    "#b08e6a",
    "#e4d0b0",
    "#8a6a48",
    "#e8dcc4",
  ),
  moonmirror: look(
    "deep",
    "#4a5a8a",
    "#aab8dc",
    "#f0f4ff",
    "#7a8cc0",
    "#dce4ff",
  ),
  "hermit-trout": look(
    "slim",
    "#5a5a3a",
    "#9a9a62",
    "#e0d8a0",
    "#7a7a4a",
    "#b84a3a",
  ),
  // marsh
  marshlight: look(
    "slim",
    "#2e7a6a",
    "#6adcb0",
    "#d0fce0",
    "#4ab898",
    "#f4ffd0",
  ),
  bogwhisker: look("cat", "#2e4a2e", "#52743a", "#a4b46a", "#3a5a30"),
  "sunk-boot-loach": look("eel", "#4a3a2a", "#7a5e3e", "#b4966a", "#5e4a30"),
  "reed-cat": look(
    "cat",
    "#8a7a4a",
    "#c8b070",
    "#f0e2b0",
    "#a89050",
    "#a07a3a",
  ),
  catfish: look("cat", "#46526a", "#7a8aa4", "#c4ccd8", "#5a6a84"),
  bullhead: look("cat", "#4a3a28", "#7a5e3a", "#c8aa74", "#5e4a2e", "#3a2c1c"),
  "glassy-elver": look("eel", "#7a9a9a", "#cce4e0", "#f4fffc", "#a4c4c0"),
  // sea
  sardine: look("slim", "#3e5a7a", "#a4bcd4", "#f0f4f8", "#7a96b4"),
  "skiff-sprat": look("slim", "#4a6a7a", "#b0c8d0", "#f4f8f8", "#86a4b0"),
  mackerel: look("slim", "#2e6a7a", "#5ea0a0", "#e4ecea", "#3e8a8a", "#1e4a58"),
  mullet: look("long", "#5a6a6e", "#a4b0b0", "#eaf0ee", "#7a8a8a"),
  cod: look("stout", "#5a5a38", "#968a52", "#e0d8b0", "#7a7040", "#5e4e2e"),
  "kelp-ribbon": look("eel", "#6a5a1e", "#b0903a", "#e4cc7a", "#8a7228"),
  "harbour-ray": look("ray", "#5a5a6a", "#8a8a9a", "#dcdce4", "#6a6a7a"),
  herring: look("slim", "#3a5a6e", "#8ab0c4", "#eaf2f6", "#6a8ea4"),
  "lantern-squid": look(
    "squid",
    "#8a3a4a",
    "#e08a8a",
    "#f8cccc",
    "#c85a6a",
    "#fff0a0",
  ),
  "crowned-tunny": look(
    "long",
    "#26407a",
    "#4a76b8",
    "#cce0f4",
    "#e0b43a",
    "#8ab4e8",
  ),
  // mountain lake
  "cold-quill": look("slim", "#5a7a9a", "#b4d4ec", "#f0f8ff", "#8ab4d4"),
  "arctic-char": look(
    "stout",
    "#4a5a6a",
    "#7a8e9e",
    "#f08a42",
    "#e06a2a",
    "#d4dce4",
  ),
  "granite-gudgeon": look(
    "stout",
    "#5a5a60",
    "#8e8e94",
    "#c8c8cc",
    "#74747a",
    "#6a6a70",
  ),
  "echo-pike": look(
    "long",
    "#3a6a42",
    "#6a9a4a",
    "#d8e0a0",
    "#4a7a3a",
    "#9ac05a",
  ),
  "ember-trout": look(
    "slim",
    "#8a3a2a",
    "#e0683a",
    "#ffcc7a",
    "#c8481e",
    "#ffd86a",
  ),
  "glacier-ghost": look("deep", "#8aa4bc", "#d4e4f2", "#ffffff", "#aac4dc"),
  // cove
  pearlback: look(
    "stout",
    "#8a8a9a",
    "#dcdce8",
    "#fffaf0",
    "#b4b4c8",
    "#f0e4f4",
  ),
  "cove-lantern": look(
    "deep",
    "#1e5a6a",
    "#3aa0a4",
    "#b8f4e0",
    "#2a8088",
    "#f8ff9a",
  ),
  "still-water-gar": look(
    "long",
    "#4a5a46",
    "#788a64",
    "#d0d4a8",
    "#5e6e4e",
    "#a4ac7a",
  ),
  "velvet-koi": look(
    "deep",
    "#a83a3a",
    "#f4ece0",
    "#ffffff",
    "#d8584a",
    "#d8404a",
  ),
  hush: look("stout", "#7a6a9a", "#b4a4d4", "#ece4f8", "#9684b8"),
  "dusk-opal": look(
    "deep",
    "#4a3a7a",
    "#8a6ac4",
    "#d8b8f0",
    "#6a4ea4",
    "#f08ad0",
  ),
  deepglow: look("slim", "#1e2a6a", "#3a52b4", "#7ad4f0", "#2e40a0", "#8afcf4"),
  "shell-ghost": look(
    "deep",
    "#a4b0b4",
    "#e4ecec",
    "#fffefa",
    "#c4d0d4",
    "#f4dce0",
  ),
  "hearthwell-carp": look(
    "stout",
    "#b0561e",
    "#f09a3a",
    "#ffe0a0",
    "#d87428",
    "#ffd45a",
  ),
  // the rare ones
  "grandmother-hush": look(
    "long",
    "#6a5a8a",
    "#a496c4",
    "#e8e0f4",
    "#8272a8",
    "#d4c4ec",
  ),
  "valley-king": look(
    "long",
    "#3a5a2e",
    "#8aa83e",
    "#f0e08a",
    "#c8a43a",
    "#d8c050",
  ),
  "moonlit-mother": look(
    "deep",
    "#34468a",
    "#8a9ed4",
    "#e8eeff",
    "#6a7cbc",
    "#ffffff",
  ),
  "great-hearthfin": look(
    "long",
    "#8a2a1e",
    "#e0502e",
    "#ffc27a",
    "#f09a3a",
    "#ffd45a",
  ),
  fernscale: look(
    "slim",
    "#2e5a3a",
    "#5a9a5a",
    "#c4e4a0",
    "#7ac47a",
    "#3a7a48",
  ),
};

/** The texture key for a fish picture. */
export const fishKey = (id: string) => `icon-fish-${id}`;

const hex = (n: number) => n.toString(16).padStart(2, "0");

/** A colour darkened toward a deep blue-black, for the outline. */
export function darken(colour: string, by = 0.55): string {
  const t = [0x16, 0x1a, 0x28];
  let out = "#";
  for (let i = 0; i < 3; i++) {
    const v = parseInt(colour.slice(1 + 2 * i, 3 + 2 * i), 16);
    out += hex(Math.round(v + (t[i]! - v) * by));
  }
  return out;
}

/** The colour of one map letter for a look, or undefined for clear. */
export function colourOf(
  ch: string,
  k: Pick<FishLook, "d" | "b" | "l" | "f" | "m">,
): string | undefined {
  switch (ch) {
    case "o":
      return darken(k.d);
    case "e":
      return EYE;
    case "w":
      return darken(k.d, 0.3);
    case "d":
      return k.d;
    case "b":
      return k.b;
    case "l":
      return k.l;
    case "f":
      return k.f;
    case "m":
      return k.m ?? k.b;
    default:
      return undefined;
  }
}

/** Paint every fish picture onto its own texture. */
export function paintFish(scene: Phaser.Scene): void {
  for (const [id, k] of Object.entries(FISH_LOOKS)) {
    const rows = SHAPES[k.shape];
    const t = scene.textures.createCanvas(fishKey(id), SIZE, SIZE)!;
    const c = t.getContext();
    const y0 = Math.floor((SIZE - rows.length) / 2) + 1;
    c.fillStyle = "#00000030";
    c.fillRect(3, SIZE - 2, 10, 1);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = colourOf(row[x]!, k);
        if (!col) continue;
        c.fillStyle = col;
        c.fillRect(x, y0 + y, 1, 1);
      }
    });
    t.refresh();
  }
}
