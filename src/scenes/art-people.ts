import Phaser from "phaser";

/**
 * Painted 16x16 people: the villagers, the player and the worn-hat shape.
 * Drawn in code, like the rest of the placeholder art. Light falls from the
 * top left. The feet sit on row 14, so a sprite with origin (0.5, 0.875) or
 * (0.5, 1) stands on its tile.
 */

const SIZE = 16;
const OUTLINE = "#2a1c1a";

export const VILLAGER_VARIANTS = 12;

export interface PersonLook {
  skin: string;
  hair: string;
  /** Main top colour. */
  shirt: string;
  /** Apron, vest, dress or collar colour, by outfit. */
  accent: string;
  pants: string;
  boots: string;
  style: "short" | "long" | "bun" | "spiky" | "ponytail" | "bald";
  outfit: "shirt" | "apron" | "dress" | "vest" | "overalls";
  build?: "normal" | "broad" | "short";
  beard?: boolean;
  /** Boots up to the knee instead of trousers over the boots. */
  tallBoots?: boolean;
}

type Grid = (string | null)[][];

/** Same hash FarmScene has always used on a villager id. */
function hashId(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

export function villagerKey(id: string): string {
  return `villager-${hashId(id) % VILLAGER_VARIANTS}`;
}

export const VILLAGER_LOOKS: PersonLook[] = [
  {
    skin: "#f2c9a3",
    hair: "#6b4426",
    shirt: "#c8503c",
    accent: "#f0e6cc",
    pants: "#4a4f6e",
    boots: "#4a3020",
    style: "short",
    outfit: "shirt",
  },
  {
    skin: "#8d5a3b",
    hair: "#2a2222",
    shirt: "#e0b640",
    accent: "#7a3f6a",
    pants: "#3f5a46",
    boots: "#3a2a22",
    style: "long",
    outfit: "dress",
  },
  {
    skin: "#e8b48a",
    hair: "#d9a43a",
    shirt: "#4f8f6a",
    accent: "#ece2c8",
    pants: "#6b4a34",
    boots: "#3a3030",
    style: "bun",
    outfit: "apron",
  },
  {
    skin: "#fbdcc0",
    hair: "#c0502e",
    shirt: "#5a78c0",
    accent: "#e8e0d0",
    pants: "#52463d",
    boots: "#4a3020",
    style: "spiky",
    outfit: "shirt",
    build: "short",
  },
  {
    skin: "#b87a52",
    hair: "#9a9aa2",
    shirt: "#d8d0bc",
    accent: "#5a4a7a",
    pants: "#3d4a5c",
    boots: "#2f2a2a",
    style: "bald",
    outfit: "vest",
    build: "broad",
    beard: true,
  },
  {
    skin: "#f2c9a3",
    hair: "#3a3448",
    shirt: "#e08a5a",
    accent: "#5a7a4a",
    pants: "#5a6a4a",
    boots: "#4a3a2a",
    style: "ponytail",
    outfit: "dress",
  },
  {
    skin: "#6f4430",
    hair: "#3a2418",
    shirt: "#c8c0a8",
    accent: "#3f5f8f",
    pants: "#3f5f8f",
    boots: "#2f2a2a",
    style: "short",
    outfit: "overalls",
    build: "broad",
  },
  {
    skin: "#e8b48a",
    hair: "#7a5230",
    shirt: "#3f9a9a",
    accent: "#8a5a3a",
    pants: "#4a4a58",
    boots: "#5a3a24",
    style: "spiky",
    outfit: "vest",
    tallBoots: true,
  },
  {
    skin: "#fbdcc0",
    hair: "#e8d070",
    shirt: "#b85a8a",
    accent: "#f4ecd8",
    pants: "#4a3a4a",
    boots: "#4a3020",
    style: "long",
    outfit: "apron",
    build: "short",
  },
  {
    skin: "#a8684a",
    hair: "#1e1a1a",
    shirt: "#7a8a3a",
    accent: "#e6dcc0",
    pants: "#5a4434",
    boots: "#3a2a22",
    style: "short",
    outfit: "shirt",
    beard: true,
    tallBoots: true,
  },
  {
    skin: "#f2c9a3",
    hair: "#8a3a2a",
    shirt: "#6a5aa8",
    accent: "#2f3a5a",
    pants: "#2f3a5a",
    boots: "#2f2a2a",
    style: "bun",
    outfit: "dress",
  },
  {
    skin: "#d49a70",
    hair: "#c8c8cc",
    shirt: "#a8483a",
    accent: "#6a7a5a",
    pants: "#6a7a5a",
    boots: "#4a3a2a",
    style: "ponytail",
    outfit: "overalls",
  },
];

/** The player: brown hair, blue shirt and a belt. */
export const PLAYER_LOOK: PersonLook = {
  skin: "#f0c8a0",
  hair: "#6a4426",
  shirt: "#3f6fb8",
  accent: "#e8e2d0",
  pants: "#5a4a3a",
  boots: "#4a3a2a",
  style: "short",
  outfit: "shirt",
};

/** Mix a colour toward white (f > 0) or a dark plum (f < 0). */
function tone(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = f > 0 ? [255, 250, 235] : [26, 16, 32];
  const a = Math.abs(f);
  const mix = (v: number, i: number) => Math.round(v + (to[i]! - v) * a);
  const r = mix((n >> 16) & 255, 0);
  const g = mix((n >> 8) & 255, 1);
  const b = mix(n & 255, 2);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

interface Tones {
  lit: string;
  base: string;
  shade: string;
}
const tones = (hex: string, lit = 0.25, shade = 0.3): Tones => ({
  lit: tone(hex, lit),
  base: hex,
  shade: tone(hex, -shade),
});

function personGrid(l: PersonLook): Grid {
  const g: Grid = Array.from({ length: SIZE }, () =>
    Array<string | null>(SIZE).fill(null),
  );
  const fill = (colour: string, x: number, y: number, w = 1, h = 1) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && i < SIZE && j >= 0 && j < SIZE) g[j]![i] = colour;
  };
  const skin = tones(l.skin, 0.2, 0.22);
  const hair = tones(l.hair, 0.3, 0.32);
  const shirt = tones(l.shirt);
  const accent = tones(l.accent, 0.2, 0.25);
  const pants = tones(l.pants, 0.2, 0.3);
  const boots = tones(l.boots, 0.2, 0.3);
  const build = l.build ?? "normal";
  const top = build === "short" ? 1 : 0;
  const L = build === "broad" ? 4 : 5; // torso columns L..R
  const R = build === "broad" ? 11 : 10;
  const faceY = 3 + top; // first face row, under the fringe
  const bodyY = 8 + top; // first torso row
  const waist = 11; // last torso row

  // hair that falls behind the body goes down first
  if (l.style === "long") {
    fill(hair.base, 4, faceY - 1, 1, bodyY - faceY + 3);
    fill(hair.shade, 11, faceY - 1, 1, bodyY - faceY + 3);
    fill(hair.shade, 4, bodyY + 1, 1, 1);
  }
  if (l.style === "ponytail") {
    fill(hair.base, 11, faceY, 1, 2);
    fill(hair.shade, 12, faceY + 1, 1, 3);
    fill(hair.shade, 11, faceY + 2, 1, 2);
  }

  // legs: trousers then boots, with a gap between the feet
  if (l.outfit !== "dress") {
    const leg = l.tallBoots ? boots : pants;
    fill(leg.base, 5, 12, 6, 1);
    fill(leg.lit, 5, 12, 1, 1);
    fill(leg.shade, 7, 12, 2, 1);
    fill(leg.shade, 10, 12, 1, 1);
  }
  fill(boots.base, 5, 13, 2, 1);
  fill(boots.base, 9, 13, 2, 1);
  fill(boots.shade, 6, 13, 1, 1);
  fill(boots.shade, 10, 13, 1, 1);

  // torso: lit left side, shaded right side and under the arms
  fill(shirt.base, L, bodyY, R - L + 1, waist - bodyY + 1);
  fill(shirt.lit, L, bodyY, 1, waist - bodyY);
  fill(shirt.lit, L, bodyY, R - L - 1, 1);
  fill(shirt.shade, R, bodyY, 1, waist - bodyY + 1);
  fill(shirt.shade, L, waist, R - L + 1, 1);
  fill(shirt.shade, L + 1, bodyY + 2, 1, waist - bodyY - 2);
  fill(shirt.shade, R - 1, bodyY + 2, 1, waist - bodyY - 2);

  // outfit details
  const mid = 7; // the two centre columns are 7 and 8
  if (l.outfit === "shirt") {
    fill(accent.base, mid - 1, bodyY, 1, 1); // collar points
    fill(accent.shade, mid + 2, bodyY, 1, 1);
    fill(tone(l.boots, -0.2), L, waist, R - L + 1, 1); // belt
    fill("#e0c050", mid, waist, 1, 1); // buckle
    fill(shirt.shade, mid + 1, bodyY + 1, 1, waist - bodyY - 1); // placket
  } else if (l.outfit === "apron") {
    fill(accent.base, mid - 1, bodyY + 1, 4, 13 - bodyY - 1);
    fill(accent.lit, mid - 1, bodyY + 1, 1, 13 - bodyY - 2);
    fill(accent.shade, mid + 2, bodyY + 1, 1, 13 - bodyY - 1);
    fill(accent.shade, mid - 1, 12, 4, 1);
    fill(accent.base, mid - 1, bodyY, 1, 1); // straps
    fill(accent.shade, mid + 2, bodyY, 1, 1);
    fill(accent.shade, mid, bodyY + 3, 2, 1); // pocket
  } else if (l.outfit === "dress") {
    fill(accent.base, L, 11, R - L + 1, 1); // sash
    fill(accent.lit, L, 11, 1, 1);
    fill(accent.shade, R, 11, 1, 1);
    fill(shirt.base, L - 1, 12, R - L + 3, 1); // skirt flares out
    fill(shirt.lit, L - 1, 12, 2, 1);
    fill(shirt.shade, R, 12, 2, 1);
    fill(shirt.shade, mid + 1, 12, 1, 1);
    fill(tone(l.shirt, 0.6), mid, bodyY, 2, 1); // pale neckline
  } else if (l.outfit === "vest") {
    fill(accent.base, L, bodyY, mid - L, waist - bodyY);
    fill(accent.lit, L, bodyY, 1, waist - bodyY);
    fill(accent.shade, mid + 2, bodyY, R - mid - 1, waist - bodyY);
    fill(tone(l.accent, -0.45), R, bodyY, 1, waist - bodyY);
    fill("#e0c050", mid - 1, bodyY + 2, 1, 1); // buttons
    fill("#e0c050", mid - 1, bodyY + 4 - top, 1, 1);
    fill(tone(l.boots, -0.2), L, waist, R - L + 1, 1); // belt
  } else {
    // overalls: bib and straps over the shirt
    fill(pants.base, mid - 1, bodyY + 1, 4, waist - bodyY);
    fill(pants.lit, mid - 1, bodyY + 1, 1, waist - bodyY - 1);
    fill(pants.shade, mid + 2, bodyY + 1, 1, waist - bodyY);
    fill(pants.base, mid - 1, bodyY, 1, 1);
    fill(pants.shade, mid + 2, bodyY, 1, 1);
    fill("#e0c050", mid - 1, bodyY + 1, 1, 1);
    fill("#e0c050", mid + 2, bodyY + 1, 1, 1);
    fill(pants.shade, mid, bodyY + 3, 2, 1); // bib pocket
  }

  // arms: sleeves then hands, the far arm in shade
  const armH = waist - bodyY;
  fill(shirt.base, L - 1, bodyY, 1, armH);
  fill(shirt.lit, L - 1, bodyY, 1, 1);
  fill(shirt.shade, R + 1, bodyY, 1, armH);
  fill(skin.base, L - 1, waist, 1, 1);
  fill(skin.shade, R + 1, waist, 1, 1);

  // neck and face
  if (l.outfit !== "dress") fill(skin.shade, mid, bodyY, 2, 1);
  fill(skin.base, 5, faceY, 6, 5);
  fill(skin.lit, 5, faceY + 1, 1, 2);
  fill(skin.lit, 6, faceY + 1, 1, 1);
  fill(skin.shade, 10, faceY, 1, 5);
  fill(skin.shade, 5, faceY + 4, 6, 1);
  fill(skin.shade, 5, faceY, 6, 1); // under the hair
  fill("#241a1a", 6, faceY + 2); // eyes
  fill("#241a1a", 9, faceY + 2);
  fill(tone(l.skin, 0.45), 6, faceY + 1); // a glint above each eye
  fill(tone(l.skin, -0.35), mid, faceY + 3, 2, 1); // mouth
  if (l.beard) {
    fill(hair.base, 5, faceY + 3, 6, 2);
    fill(hair.lit, 5, faceY + 3, 1, 1);
    fill(hair.shade, 10, faceY + 3, 1, 2);
    fill(hair.shade, 6, faceY + 5, 4, 1);
    fill(tone(l.skin, -0.35), mid, faceY + 3, 2, 1);
  }

  // hair cap, fringe and highlight
  if (l.style === "bald") {
    fill(skin.base, 6, faceY - 2, 4, 1);
    fill(skin.base, 5, faceY - 1, 6, 1);
    fill(skin.lit, 6, faceY - 2, 2, 1);
    fill(skin.lit, 5, faceY - 1, 1, 1);
    fill(skin.shade, 10, faceY - 1, 1, 1);
    fill(skin.base, 5, faceY, 6, 1);
    fill(hair.base, 5, faceY, 1, 2);
    fill(hair.shade, 10, faceY, 1, 2);
    return g;
  }
  fill(hair.base, 6, faceY - 2, 4, 1);
  fill(hair.base, 5, faceY - 1, 6, 1);
  fill(hair.base, 5, faceY, 6, 1);
  fill(hair.lit, 6, faceY - 2, 2, 1);
  fill(hair.lit, 6, faceY - 1, 1, 1);
  fill(hair.shade, 10, faceY - 1, 1, 2);
  fill(hair.shade, 8, faceY, 2, 1);
  fill(hair.base, 5, faceY + 1, 1, 1); // sideburns
  fill(hair.shade, 10, faceY + 1, 1, 1);
  if (l.style === "long") {
    fill(hair.base, 5, faceY + 2, 1, 2);
    fill(hair.shade, 10, faceY + 2, 1, 2);
  }
  if (l.style === "bun") {
    fill(hair.base, 7, faceY - 4, 2, 2);
    fill(hair.lit, 7, faceY - 4, 1, 1);
    fill(hair.shade, 8, faceY - 3, 1, 1);
  }
  if (l.style === "spiky") {
    fill(hair.lit, 5, faceY - 2, 1, 1);
    fill(hair.base, 7, faceY - 3, 1, 1);
    fill(hair.shade, 10, faceY - 2, 1, 1);
    fill(hair.lit, 8, faceY - 2, 1, 1);
  }
  if (l.style === "ponytail") fill(accent.base, 11, faceY - 1, 1, 1); // tie
  return g;
}

/** Paint a person onto a fresh 16x16 canvas texture with a 1px dark outline. */
export function paintPerson(
  scene: Phaser.Scene,
  key: string,
  look: PersonLook,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.createCanvas(key, SIZE, SIZE)!;
  const c = t.getContext();
  const g = personGrid(look);
  const filled = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < SIZE && y < SIZE && g[y]![x] !== null;
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const col = g[y]![x];
      if (col) c.fillStyle = col;
      else if (
        filled(x - 1, y) ||
        filled(x + 1, y) ||
        filled(x, y - 1) ||
        filled(x, y + 1)
      )
        c.fillStyle = OUTLINE;
      else continue;
      c.fillRect(x, y, 1, 1);
    }
  t.refresh();
}

/** A small hat shape, painted in light greys so setTint gives it its colour. */
export const HAT_KEY = "hat-shape";

const HAT_ROWS = [
  "....oooo....",
  "...oWWLMo...",
  "...oWLMDo...",
  "..oWLLLMDo..",
  "..oBbbbbBo..",
  "ooWWLLLLMMDo",
  "oDMMMMMMMDDo",
  ".oooooooooo.",
];
const HAT_COLOURS: Record<string, string> = {
  o: "#2a2a2a",
  W: "#ffffff",
  L: "#e4e4e4",
  M: "#c4c4c4",
  D: "#9a9a9a",
  B: "#4a4a4a",
  b: "#626262",
};

function paintHat(scene: Phaser.Scene): void {
  if (scene.textures.exists(HAT_KEY)) scene.textures.remove(HAT_KEY);
  const t = scene.textures.createCanvas(HAT_KEY, 12, HAT_ROWS.length)!;
  const c = t.getContext();
  HAT_ROWS.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const col = HAT_COLOURS[ch];
      if (!col) return;
      c.fillStyle = col;
      c.fillRect(x, y, 1, 1);
    }),
  );
  t.refresh();
}

export function paintPeople(scene: Phaser.Scene): void {
  VILLAGER_LOOKS.forEach((look, i) =>
    paintPerson(scene, `villager-${i}`, look),
  );
  paintHat(scene);
}
