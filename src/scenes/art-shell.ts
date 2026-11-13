import type Phaser from "phaser";
import { roeSpeciesOf } from "../core/pondspecies";
import { PRIZE_MELON } from "../core/showing";
import { FISH_LOOKS, colourOf, darken } from "./art-fish";

/**
 * Painted 16x16 pictures for the shellfish, for roe and aged roe, and for the Blue
 * Ribbon Melon (note 99, "Fish pictures"). Shellfish use four body shapes and a
 * palette row each, with the same letters as the fish. Roe is one heap of eggs
 * coloured from its species; aged roe is the same heap turned amber.
 */

const SIZE = 16;
export type ShellShape = "crab" | "shrimp" | "snail" | "clam";

export const SHELL_SHAPES: Record<ShellShape, string[]> = {
  crab: [
    "..ff........ff..",
    ".fffo......offf.",
    ".fo.oooooooo.of.",
    "...oddddddddddo.",
    "..odbbmbbmbbbdo.",
    "..ollllllllllo..",
    "...oooooooooo...",
    ".f.f.f....f.f.f.",
  ],
  shrimp: [
    ".....ooooo......",
    "...oodddddbboo..",
    "..oddbmbbbbbbeo.",
    "..ollllllllbboo.",
    "ffollloooooloo..",
    "fff.ooo..ooo....",
  ],
  snail: [
    "....oooooo......",
    "...oddddddoo....",
    "..oddbbmbbddo...",
    "..odbmddmbbdo...",
    "..odbbmmbbbdo.e.",
    "...oodddddoollo.",
    "..ollllllllllllo",
    "..oooooooooooooo",
  ],
  clam: [
    ".....oooooo.....",
    "...ooddddddoo...",
    "..oddbmbbmbbdo..",
    ".odbbmbbbbmbbbdo",
    ".odbbbmbbbbmbbdo",
    ".oooooooooooooo.",
    "..ollllllllllo..",
    "...oooooooooo...",
  ],
};

export interface ShellLook {
  shape: ShellShape;
  d: string;
  b: string;
  l: string;
  f: string;
  m?: string;
}

const shell = (
  shape: ShellShape,
  d: string,
  b: string,
  l: string,
  f: string,
  m?: string,
): ShellLook => ({ shape, d, b, l, f, ...(m ? { m } : {}) });

/** One look per shellfish id in `pots.json`. A test fails when one has none. */
export const SHELL_LOOKS: Record<string, ShellLook> = {
  crayfish: shell("shrimp", "#6a2a1e", "#b84a30", "#e8a07a", "#d86a44"),
  "river-mussel": shell(
    "clam",
    "#2a2e3e",
    "#4a5470",
    "#a8a4b8",
    "#6a7490",
    "#363c52",
  ),
  "ladle-snail": shell(
    "snail",
    "#5a4a2e",
    "#a08850",
    "#e0d0a0",
    "#c8b070",
    "#7a6638",
  ),
  "marsh-clam": shell(
    "clam",
    "#4a4a2a",
    "#8a8a52",
    "#d4d0a0",
    "#aaa468",
    "#66663a",
  ),
  crab: shell("crab", "#8a2a1e", "#d8502e", "#f6b08a", "#e87a50", "#f09a3a"),
  "reef-periwinkle": shell(
    "snail",
    "#2e4a5e",
    "#5a8aa8",
    "#bcd8e4",
    "#7aaac4",
    "#3e6a88",
  ),
  "spiny-shrimp": shell("shrimp", "#8a4a5e", "#e08aa0", "#fbd2d8", "#f0a8b8"),
  "pearl-lobster": shell(
    "shrimp",
    "#3a3e7a",
    "#6a74d0",
    "#e6e8ff",
    "#8a94e8",
    "#a8b0ff",
  ),
};

export { PRIZE_MELON };
export const shellKey = (id: string) => `icon-shell-${id}`;
export const MELON_KEY = "icon-blue-ribbon-melon";
const roeKey = (id: string, aged: boolean) =>
  `icon-${aged ? "aged-roe" : "roe"}-${id}`;

/** The texture key for a roe or aged roe item, or undefined for anything else. */
export function roeIconKey(item: string): string | undefined {
  const sp = roeSpeciesOf(item);
  return sp ? roeKey(sp, item.endsWith("-aged-roe")) : undefined;
}

export const ROE_SHAPE = [
  "......oooo......",
  "....ooblbboo....",
  "..oobbbbblbboo..",
  ".oblbbbbbbbbbbo.",
  ".obbbbblbbblbbo.",
  ".oobbblbbbbbboo.",
  "..ooobbbbbboo...",
  "....oooooooo....",
];

/** Blend two #rrggbb colours; `t` is the share of `to`. */
export function mix(from: string, to: string, t: number): string {
  let out = "#";
  for (let i = 0; i < 3; i++) {
    const a = parseInt(from.slice(1 + 2 * i, 3 + 2 * i), 16);
    const z = parseInt(to.slice(1 + 2 * i, 3 + 2 * i), 16);
    out += Math.round(a + (z - a) * t)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

const AMBER = "#b4701e";
/** Roe colour for pond species that are not fish or shellfish (the urchin, the fan). */
const FALLBACK_EGG = "#d49a9a";

/** The egg colour of a species: its body colour. */
export function eggColour(id: string): string {
  return FISH_LOOKS[id]?.b ?? SHELL_LOOKS[id]?.b ?? FALLBACK_EGG;
}

/** The colours of the roe map for one species: egg, highlight, outline. */
export function roePalette(id: string, aged: boolean) {
  const egg = aged ? mix(eggColour(id), AMBER, 0.6) : eggColour(id);
  return {
    b: egg,
    l: mix(egg, "#ffffff", aged ? 0.25 : 0.4),
    o: darken(egg, 0.5),
  };
}

export const MELON_MAP = [
  ".......ss.......",
  "......ss........",
  "....oooooooo....",
  "..ooggGggGggoo..",
  ".oggGggGggGgggo.",
  ".ogGggGggGggGgo.",
  ".oBBBBBBBBBBBBo.",
  ".ogGggGgRRgGggo.",
  ".oggGggRBBRgggo.",
  ".oggGgBRggRBgGo.",
  "..ooggGggGggoo..",
  "....oooooooo....",
];

export const MELON_COLOURS: Record<string, string> = {
  o: "#1c3a22",
  g: "#5aa84a",
  G: "#3a7a38",
  B: "#3a62c8",
  R: "#8ab0f0",
  s: "#6a4a2a",
};

function paintMap(
  scene: Phaser.Scene,
  key: string,
  rows: string[],
  colour: (ch: string) => string | undefined,
  top: number,
) {
  const t = scene.textures.createCanvas(key, SIZE, SIZE)!;
  const c = t.getContext();
  c.fillStyle = "#00000030";
  c.fillRect(3, SIZE - 2, 10, 1);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = colour(row[x]!);
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(x, top + y, 1, 1);
    }
  });
  t.refresh();
}

/** Paint the shellfish, every roe and aged roe, and the melon. */
export function paintShellGoods(scene: Phaser.Scene): void {
  for (const [id, k] of Object.entries(SHELL_LOOKS)) {
    const rows = SHELL_SHAPES[k.shape];
    paintMap(
      scene,
      shellKey(id),
      rows,
      (ch) => colourOf(ch, k),
      Math.floor((SIZE - rows.length) / 2) + 1,
    );
  }
  const species = new Set([
    ...Object.keys(FISH_LOOKS),
    ...Object.keys(SHELL_LOOKS),
    "pin-urchin",
    "sea-fan",
  ]);
  for (const id of species)
    for (const aged of [false, true]) {
      const p = roePalette(id, aged);
      paintMap(
        scene,
        roeKey(id, aged),
        ROE_SHAPE,
        (ch) =>
          ch === "o" ? p.o : ch === "b" ? p.b : ch === "l" ? p.l : undefined,
        4,
      );
    }
  paintMap(scene, MELON_KEY, MELON_MAP, (ch) => MELON_COLOURS[ch], 2);
}
