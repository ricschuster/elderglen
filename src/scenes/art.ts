import { POT_ITEM } from "../core/pots";
import { isBomb } from "../core/bombs";
import {
  BOOTS,
  RINGS,
  comboId,
  comboParts,
  ringById,
  tailoredParts,
} from "../core/equipment";
import { LIFE_ELIXIR, MINERS_TREAT, OIL_OF_GARLIC } from "../core/items";
import { farmDecorIds, isFarmDecor } from "../core/farmdecor";
import { isLight } from "../core/lights";
import { LIGHTNING_ROD } from "../core/lightning";
import { CHESTS, chestById } from "../core/chestdefs";
import { MAHOGANY_SEED } from "../core/mahogany";
import { DECOR, decorById } from "../core/decor";
import { FURNITURE, furnitureById } from "../core/furniture";
import { fertilizerById } from "../core/fertilizer";
import { SPRINKLERS, sprinklerById } from "../core/sprinklers";
import { GEODE_ITEMS, GEODE_KINDS } from "../core/geodes";
import { GEM_ITEMS } from "../core/gems";
import { ARTIFACTS } from "../core/artifacts";
import { categoryOf } from "../core/artisan";
import { MACHINES, machineById } from "../core/processing";
import Phaser from "phaser";
import { paintAnimals } from "./art-animals";
import { paintCropStage, paintSeedPacket } from "./art-crops";
import { paintCreatures } from "./art-creatures";
import { FISH_LOOKS, fishKey, paintFish } from "./art-fish";
import { GOOD_LOOKS, goodKey, paintGoods } from "./art-goods";
import {
  MELON_KEY,
  PRIZE_MELON,
  SHELL_LOOKS,
  paintShellGoods,
  roeIconKey,
  shellKey,
} from "./art-shell";
import { PLAYER_LOOK, paintPeople, paintPerson } from "./art-people";
import { ALL_CROPS } from "../core/crops";
import { FORAGE } from "../core/forage";
import { FRUIT_TREES, fruitTreeById, treeOfSapling } from "../core/fruittrees";
import { seedId } from "../core/items";
import { splitQuality } from "../core/quality";

/**
 * All of the game's art, drawn in code at start up. Every picture here is
 * original work, so there are no art files and no third party licences (see
 * ASSET_LICENCES.md). Sprites are 16 by 16 pixels.
 */
export const SIZE = 16;

type Ctx = CanvasRenderingContext2D;

/** Small deterministic random numbers, so the art is the same on every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const px = (c: Ctx, colour: string, x: number, y: number, w = 1, h = 1) => {
  c.fillStyle = colour;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};

function disc(c: Ctx, colour: string, cx: number, cy: number, r: number) {
  c.fillStyle = colour;
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r + r * 0.6) c.fillRect(cx + x, cy + y, 1, 1);
}

type Lobe = readonly [number, number, number];
/** Outline, shade, body, light, shine: the tones of a leafy crown. */
type CrownTones = readonly [string, string, string, string, string];
const TREE_TONES: CrownTones = [
  "#12341a",
  "#1f5a28",
  "#2f7a36",
  "#4a9a46",
  "#86c470",
];
const FRUIT_TREE_TONES: CrownTones = [
  "#1a4422",
  "#2d7036",
  "#46a04a",
  "#6cc26c",
  "#b0e08e",
];

/**
 * A leafy crown of overlapping lobes: a dark rim, then shade, body and a lit patch, each
 * nudged up and left, so the light falls from the top left and the crown keeps a bumpy edge.
 */
function canopy(c: Ctx, lobes: readonly Lobe[], tones: CrownTones) {
  const [outline, shade, body, light, shine] = tones;
  for (const [x, y, r] of lobes) disc(c, outline, x, y, r);
  for (const [x, y, r] of lobes) disc(c, shade, x, y, r - 1);
  for (const [x, y, r] of lobes) if (r > 2) disc(c, body, x - 1, y - 1, r - 2);
  for (const [x, y, r] of lobes) if (r > 3) disc(c, light, x - 2, y - 2, r - 4);
  for (const [x, y, r] of lobes) if (r > 2) px(c, shine, x - 2, y - 2);
}

/** A soft oval shadow on the ground, `w` wide, centred on `cx`. */
function groundShadow(c: Ctx, cx: number, y: number, w: number) {
  px(c, "#0000002a", cx - w / 2 + 1, y - 1, w - 2, 1);
  px(c, "#00000038", cx - w / 2, y, w, 1);
}

/** A bark trunk: lit on the left, shaded on the right, with a small root flare. */
function trunk(c: Ctx, x: number, y: number, w: number, h: number) {
  px(c, "#2e1e0e", x - 1, y, w + 2, h);
  px(c, "#5a3e22", x, y, w, h);
  px(c, "#7a5832", x, y, 1, h);
  px(c, "#3e2a16", x + w - 1, y, 1, h);
  px(c, "#2e1e0e", x - 2, y + h - 1, w + 4, 1);
  px(c, "#4a3218", x - 1, y + h - 1, w + 2, 1);
}

// ---- tiles, in the order of the tileset in the map JSON (`src/content/maps/`)

function speckle(
  c: Ctx,
  ox: number,
  seed: number,
  colours: string[],
  count: number,
) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const colour = colours[Math.floor(r() * colours.length)] as string;
    px(c, colour, ox + Math.floor(r() * SIZE), Math.floor(r() * SIZE));
  }
}

const TILE_PAINTERS: ((c: Ctx, ox: number) => void)[] = [
  // grass
  (c, ox) => {
    px(c, "#3f7d3a", ox, 0, SIZE, SIZE);
    speckle(c, ox, 11, ["#4a8c44", "#356f31", "#52964a"], 26);
    // soft darker patches break up the flat green
    for (const [x, y] of [
      [1, 7],
      [12, 2],
      [8, 12],
    ] as const)
      px(c, "#37742f", ox + x, y, 3, 1);
    // blade tufts: a dark base, a bright tip
    for (const [x, y] of [
      [3, 4],
      [10, 9],
      [6, 13],
      [13, 14],
    ] as const) {
      px(c, "#2f6a2c", ox + x, y + 1);
      px(c, "#5aa152", ox + x, y);
      px(c, "#72b866", ox + x, y - 1);
      px(c, "#5aa152", ox + x + 1, y);
    }
  },
  // grass with flowers
  (c, ox) => {
    // Same base as plain grass, so no seam shows between the two tiles.
    px(c, "#3f7d3a", ox, 0, SIZE, SIZE);
    speckle(c, ox, 23, ["#4a8c44", "#356f31", "#52964a"], 26);
    // little blooms with a leaf each
    px(c, "#2f6a2c", ox + 4, 7);
    px(c, "#3d7d38", ox + 3, 7);
    px(c, "#f4f0e0", ox + 3, 5);
    px(c, "#f4f0e0", ox + 5, 5);
    px(c, "#f4f0e0", ox + 4, 4);
    px(c, "#f2d24a", ox + 4, 5);
    px(c, "#f4f0e0", ox + 4, 6);
    px(c, "#2f6a2c", ox + 11, 13);
    px(c, "#f4f0e0", ox + 10, 11);
    px(c, "#f4f0e0", ox + 12, 11);
    px(c, "#f2d24a", ox + 11, 11);
    px(c, "#f4f0e0", ox + 11, 10);
    px(c, "#f4f0e0", ox + 11, 12);
    px(c, "#2f6a2c", ox + 12, 5);
    px(c, "#e98ac0", ox + 12, 3);
    px(c, "#f7b4d8", ox + 12, 2);
    px(c, "#e98ac0", ox + 11, 3);
    px(c, "#e98ac0", ox + 13, 3);
    px(c, "#c0609a", ox + 12, 4);
  },
  // path
  (c, ox) => {
    px(c, "#b59b6a", ox, 0, SIZE, SIZE);
    speckle(c, ox, 37, ["#a68c5c", "#c4aa78", "#9a8253"], 30);
    // pebbles: a light top, a dark underside
    for (const [x, y] of [
      [5, 6],
      [11, 12],
      [2, 13],
    ] as const) {
      px(c, "#8f7a50", ox + x, y + 1, 2, 1);
      px(c, "#d2bb8a", ox + x, y, 2, 1);
      px(c, "#a68c5c", ox + x + 1, y);
    }
  },
  // water
  (c, ox) => {
    px(c, "#2f6fb0", ox, 0, SIZE, SIZE);
    px(c, "#3b80c4", ox, 3, SIZE, 1);
    px(c, "#3b80c4", ox, 10, SIZE, 1);
    px(c, "#8fc4f0", ox + 2, 3, 3, 1);
    px(c, "#8fc4f0", ox + 9, 10, 4, 1);
    px(c, "#27609c", ox + 6, 7, 3, 1);
    px(c, "#27609c", ox + 1, 13, 4, 1);
    px(c, "#27609c", ox + 12, 5, 3, 1);
    px(c, "#e4f4ff", ox + 3, 3);
    px(c, "#e4f4ff", ox + 10, 10, 2, 1);
  },
  // pale untilled earth (the diggable field)
  (c, ox) => {
    // Pale yellow, flat, untilled earth, the look of fertile land. Lighter than the path and the
    // furrowed brown of dug soil, so the field reads as diggable at a glance.
    px(c, "#e0d08c", ox, 0, SIZE, SIZE);
    speckle(c, ox, 41, ["#d3c27c", "#e9dca0", "#c8b672"], 34);
  },
  // tree (seen from above)
  (c, ox) => {
    // The grass base, so a row of trees stands on the grass, not on a square.
    px(c, "#3f7d3a", ox, 0, SIZE, SIZE);
    speckle(c, ox, 11, ["#4a8c44", "#356f31", "#52964a"], 26);
    px(c, "#2f6a2c", ox + 3, 14, 11, 1);
    canopy(
      c,
      [
        [ox + 8, 6, 5],
        [ox + 5, 10, 4],
        [ox + 11, 10, 4],
      ],
      TREE_TONES,
    );
    px(c, "#1f5a28", ox + 9, 9, 2, 1);
    px(c, "#1f5a28", ox + 6, 12, 2, 1);
  },
  // wall
  (c, ox) => {
    // Stone blocks: a mortar line, a lit top edge and a shaded bottom per block.
    px(c, "#8d7b6a", ox, 0, SIZE, SIZE);
    for (let row = 0; row < 4; row++) {
      const y = row * 4;
      px(c, "#5f5044", ox, y + 3, SIZE, 1);
      px(c, "#7c6b5c", ox, y + 2, SIZE, 1);
      px(c, "#a4927f", ox, y, SIZE, 1);
      const off = row % 2 === 0 ? 4 : 0;
      for (const x of [off, off + 8]) {
        px(c, "#5f5044", ox + x, y, 1, 3);
        px(c, "#b3a18d", ox + x + 1, y, 2, 1);
      }
      speckle(c, ox, 50 + row, ["#837162", "#978573"], 3);
    }
  },
  // roof
  (c, ox) => {
    // Overlapping shingles: each row lit on top, shaded at its lower lip.
    px(c, "#a0482e", ox, 0, SIZE, SIZE);
    for (let row = 0; row < 4; row++) {
      const y = row * 4;
      px(c, "#c06548", ox, y, SIZE, 1);
      px(c, "#8a3c26", ox, y + 2, SIZE, 1);
      px(c, "#5e2616", ox, y + 3, SIZE, 1);
      for (let x = (row % 2) * 4; x < SIZE; x += 8) {
        px(c, "#5e2616", ox + x, y, 1, 3);
        px(c, "#d27a5a", ox + x + 1, y, 2, 1);
      }
    }
  },
  // door
  (c, ox) => {
    px(c, "#7a4f24", ox, 0, SIZE, SIZE);
    px(c, "#a8733a", ox + 1, 1, SIZE - 2, SIZE - 1);
    for (const x of [5, 10]) px(c, "#8a5c2a", ox + x, 1, 1, SIZE - 1);
    px(c, "#f0c75e", ox + 12, 9, 2, 2);
  },
  // bed
  (c, ox) => {
    px(c, "#7a4f24", ox, 0, SIZE, SIZE);
    px(c, "#c9a0dc", ox + 1, 4, SIZE - 2, SIZE - 5);
    px(c, "#b088c8", ox + 1, 9, SIZE - 2, 1);
    px(c, "#f4f0f8", ox + 2, 1, SIZE - 4, 4);
    px(c, "#d8d0e0", ox + 2, 4, SIZE - 4, 1);
  },
  // scroll, on a wall: a rolled sheet with ribbon ends
  (c, ox) => {
    px(c, "#8d7b6a", ox, 0, SIZE, SIZE);
    px(c, "#f0e6c8", ox + 3, 3, SIZE - 6, SIZE - 6);
    px(c, "#d8c9a0", ox + 3, 3, SIZE - 6, 1);
    px(c, "#d8c9a0", ox + 3, SIZE - 4, SIZE - 6, 1);
    px(c, "#a0482e", ox + 5, 6, SIZE - 10, 1);
    px(c, "#a0482e", ox + 5, 9, SIZE - 10, 1);
  },
  // shipping bin: a wooden crate with an open lid
  (c, ox) => {
    px(c, "#3f7d3a", ox, 0, SIZE, SIZE);
    px(c, "#6f4a22", ox + 1, 3, SIZE - 2, SIZE - 4);
    px(c, "#a8733a", ox + 2, 5, SIZE - 4, SIZE - 7);
    px(c, "#2a1a0a", ox + 3, 6, SIZE - 6, 3);
    px(c, "#c28a48", ox + 1, 2, SIZE - 2, 2);
    px(c, "#8a5c2a", ox + 2, 11, SIZE - 4, 1);
  },
];

export function paintTiles(scene: Phaser.Scene, key: string): void {
  const tiles = scene.textures.createCanvas(
    key,
    SIZE * TILE_PAINTERS.length,
    SIZE,
  )!;
  const c = tiles.getContext();
  TILE_PAINTERS.forEach((paint, i) => paint(c, i * SIZE));
  tiles.refresh();
}

// ---- tilled soil, drawn over the soil tile

export const soilKey = (wet: boolean) => (wet ? "soil-wet" : "soil-dry");

function paintSoil(scene: Phaser.Scene, wet: boolean): void {
  const t = scene.textures.createCanvas(soilKey(wet), SIZE, SIZE)!;
  const c = t.getContext();
  const [base, furrow, ridge, dot] = wet
    ? ["#4e3722", "#3c2a19", "#5c4128", "#6a4d31"]
    : ["#9a7a4c", "#7f6339", "#ad8d5c", "#b89868"];
  px(c, base, 0, 0, SIZE, SIZE);
  for (const y of [3, 8, 13]) {
    px(c, furrow, 1, y, SIZE - 2, 1);
    px(c, ridge, 1, y - 1, SIZE - 2, 1);
  }
  speckle(c, 0, wet ? 53 : 47, [dot, furrow], 10);
  // a lit ridge top and a few clods give the bed depth
  for (const x of [3, 7, 11]) {
    px(c, dot, x, 2, 2, 1);
    px(c, dot, x + 2, 7, 2, 1);
    px(c, dot, x - 1, 12, 2, 1);
  }
  // a darker edge so neighbouring plots read as separate beds
  px(c, furrow, 0, 0, SIZE, 1);
  px(c, furrow, 0, SIZE - 1, SIZE, 1);
  px(c, furrow, 0, 0, 1, SIZE);
  px(c, furrow, SIZE - 1, 0, 1, SIZE);
  t.refresh();
}

// ---- the frame menu screens and the toolbar sit in

export const UI_FRAME_KEY = "ui-frame";
/** Width of the frame's border in the texture, for a nine slice. */
export const UI_FRAME_EDGE = 8;

/** Safe to call twice: screens opened before the farm need the frame too. */
export function paintUiFrame(scene: Phaser.Scene): void {
  if (scene.textures.exists(UI_FRAME_KEY)) return;
  const size = UI_FRAME_EDGE * 2 + 8;
  const t = scene.textures.createCanvas(UI_FRAME_KEY, size, size)!;
  const c = t.getContext();
  px(c, "#5a3d1e", 0, 0, size, size); // wood rim
  px(c, "#8a5c2a", 1, 1, size - 2, size - 2);
  px(c, "#a8733a", 2, 2, size - 4, 1); // light edge on top and left
  px(c, "#a8733a", 2, 2, 1, size - 4);
  px(c, "#6b4a24", 2, size - 3, size - 4, 1); // shade on bottom and right
  px(c, "#6b4a24", size - 3, 2, 1, size - 4);
  px(c, "#f0c75e", 3, 3, 1, 1); // a brass stud in each corner
  px(c, "#f0c75e", size - 4, 3, 1, 1);
  px(c, "#f0c75e", 3, size - 4, 1, 1);
  px(c, "#f0c75e", size - 4, size - 4, 1, 1);
  px(
    c,
    "#10201a",
    UI_FRAME_EDGE,
    UI_FRAME_EDGE,
    size - UI_FRAME_EDGE * 2,
    size - UI_FRAME_EDGE * 2,
  );
  t.refresh();
}

// ---- the player

export function paintPlayer(scene: Phaser.Scene, key: string): void {
  paintPerson(scene, key, PLAYER_LOOK);
}

// ---- crops

interface Palette {
  fruit: string;
  leaf: string;
}

const CROP_COLOURS: Record<string, Palette> = {
  parsnip: { fruit: "#f1e4b8", leaf: "#5aa83a" },
  potato: { fruit: "#c49a5a", leaf: "#4a9a3a" },
  cauliflower: { fruit: "#f4f4ec", leaf: "#5aa83a" },
  melon: { fruit: "#9bd45c", leaf: "#3f8f35" },
  tomato: { fruit: "#d9432f", leaf: "#3f8f35" },
  radish: { fruit: "#d94a7a", leaf: "#4a9a3a" },
  "green-bean": { fruit: "#7ac84a", leaf: "#3a8a30" },
  kale: { fruit: "#2f7f3f", leaf: "#2a6f38" },
  garlic: { fruit: "#efe9dc", leaf: "#6ab040" },
  "hot-pepper": { fruit: "#d92f1f", leaf: "#3f8f35" },
  corn: { fruit: "#f0d040", leaf: "#5aa83a" },
  "red-cabbage": { fruit: "#8a3a8a", leaf: "#4a9a3a" },
  // Flowers (note 91): placeholder colours, the dye colour of each.
  tulip: { fruit: "#f08aaa", leaf: "#4a9a3a" },
  cornflower: { fruit: "#4a78d8", leaf: "#4a9a3a" },
  poppy: { fruit: "#d9322a", leaf: "#3f8f35" },
  zinnia: { fruit: "#f08a2a", leaf: "#3f8f35" },
  sunflower: { fruit: "#f4cf2a", leaf: "#3f8f35" },
  dahlia: { fruit: "#8a4ac8", leaf: "#3a8a30" },
};
const FALLBACK: Palette = { fruit: "#e0c040", leaf: "#5aa83a" };

/** Growth stages drawn per crop: seedling, sprout, leafy, ripe. */
export const CROP_STAGES = 4;

export const cropKey = (id: string, stage: number) => `crop-${id}-${stage}`;

/** The stage to draw for a crop that has grown `fraction` of the way, or is ripe. */
export function stageOf(fraction: number, ripe: boolean): number {
  return ripe ? CROP_STAGES - 1 : Math.min(Math.floor(fraction * 3), 2);
}

function paintCrop(scene: Phaser.Scene, id: string): void {
  const pal = CROP_COLOURS[id] ?? FALLBACK;
  for (let stage = 0; stage < CROP_STAGES; stage++) {
    const t = scene.textures.createCanvas(cropKey(id, stage), SIZE, SIZE)!;
    paintCropStage(t.getContext(), id, stage, pal.fruit);
    t.refresh();
  }
}

// ---- forage

const LEAF = "#4a9a3a";
const LEAF_DARK = "#2a6a24";
const LEAF_LIGHT = "#7ac05a";
const STEM = "#3a8a30";

/** A round thing with a shaded lower right and a glint: berries, fruit, nuts. */
function ball(
  c: Ctx,
  x: number,
  y: number,
  r: number,
  colour: string,
  shade: string,
) {
  disc(c, shade, x, y, r);
  if (r >= 2) disc(c, colour, x - 1, y - 1, r - 1);
  else {
    px(c, colour, x - 1, y);
    px(c, colour, x, y - 1);
    px(c, colour, x, y);
  }
  px(c, "#ffffffaa", x - (r >= 2 ? 1 : 0), y - 1);
}

/** A small leaf, two pixels long, lit on its upper edge. */
function leaf(c: Ctx, x: number, y: number, w = 2) {
  px(c, LEAF_DARK, x, y + 1, w, 1);
  px(c, LEAF, x, y, w, 1);
  px(c, LEAF_LIGHT, x, y);
}

/** A mushroom: a stem, a cap with a dark rim underneath, and a lit top. */
function mushroom(
  c: Ctx,
  cap: string,
  capDark: string,
  capLight: string,
  stem: string,
) {
  groundShadow(c, 8, 15, 10);
  px(c, "#5a4a3a", 6, 9, 4, 6);
  px(c, stem, 7, 9, 2, 5);
  px(c, "#ffffff66", 7, 10, 1, 3);
  px(c, "#00000033", 8, 10, 1, 4);
  px(c, "#2a1e16", 2, 5, 12, 5);
  px(c, "#2a1e16", 4, 3, 8, 2);
  px(c, capDark, 3, 6, 10, 3);
  px(c, cap, 3, 5, 10, 3);
  px(c, cap, 5, 4, 6, 1);
  px(c, capLight, 5, 4, 4, 1);
  px(c, capLight, 4, 5, 2, 1);
  px(c, "#00000044", 4, 9, 8, 1);
}

/** A rooted crop of the soil: tapered root, leaves on top. */
function root(c: Ctx, body: string, shade: string, light: string) {
  groundShadow(c, 8, 15, 8);
  px(c, LEAF_DARK, 5, 2, 6, 4);
  px(c, LEAF, 6, 2, 1, 4);
  px(c, LEAF, 9, 1, 1, 4);
  px(c, LEAF_LIGHT, 6, 2);
  px(c, LEAF_LIGHT, 9, 1);
  px(c, "#3a2a1e", 5, 5, 6, 8);
  px(c, "#3a2a1e", 7, 13, 2, 2);
  px(c, body, 6, 6, 4, 6);
  px(c, body, 7, 12, 2, 2);
  px(c, shade, 9, 6, 1, 6);
  px(c, light, 6, 6, 1, 4);
  px(c, shade, 6, 9, 2, 1);
}

/** A shell or sea good, lying on the sand. */
const SHORE_PAINTERS: Record<string, (c: Ctx) => void> = {
  periwinkle: (c) => {
    groundShadow(c, 8, 14, 8);
    disc(c, "#2a1e2a", 8, 10, 4);
    disc(c, "#6a4a7a", 8, 10, 3);
    disc(c, "#8a6a9a", 7, 9, 2);
    px(c, "#3a2a44", 8, 10, 2, 1);
    px(c, "#3a2a44", 9, 9, 1, 1);
    px(c, "#3a2a44", 7, 11, 2, 1);
    px(c, "#c8b0d8", 6, 8);
  },
  "razor-clam": (c) => {
    groundShadow(c, 8, 15, 12);
    for (let i = 0; i < 9; i++) {
      px(c, "#3a2e1e", 2 + i, 11 - i, 4, 3);
    }
    for (let i = 0; i < 9; i++) {
      px(c, "#d8c8a0", 3 + i, 11 - i, 2, 1);
      px(c, "#a89068", 3 + i, 12 - i, 2, 1);
    }
    px(c, "#f4ecd0", 4, 10);
    px(c, "#f4ecd0", 7, 7);
    px(c, "#7a6a4a", 6, 9);
    px(c, "#7a6a4a", 10, 5);
  },
  whelk: (c) => {
    groundShadow(c, 8, 15, 10);
    px(c, "#3a2a1a", 4, 7, 9, 7);
    px(c, "#3a2a1a", 6, 3, 4, 5);
    px(c, "#3a2a1a", 7, 1, 2, 2);
    px(c, "#c8a878", 5, 8, 7, 5);
    px(c, "#c8a878", 7, 4, 2, 4);
    px(c, "#c8a878", 7, 2, 1, 2);
    px(c, "#8a6a44", 5, 10, 7, 1);
    px(c, "#8a6a44", 6, 6, 4, 1);
    px(c, "#8a6a44", 10, 8, 2, 5);
    px(c, "#f4e0c0", 6, 8, 2, 1);
    px(c, "#f4e0c0", 7, 4);
    px(c, "#f0c8a8", 8, 12, 3, 1);
  },
  cockleshell: (c) => {
    groundShadow(c, 8, 15, 12);
    disc(c, "#4a3a2a", 8, 9, 5);
    disc(c, "#e8d8c0", 8, 9, 4);
    px(c, "#4a3a2a", 6, 13, 5, 2);
    px(c, "#c8b090", 7, 13, 3, 1);
    for (const x of [5, 7, 9, 11]) px(c, "#b89c78", x, 6, 1, 7);
    px(c, "#ffffffaa", 6, 6, 1, 3);
    px(c, "#f4e8d8", 8, 5, 1, 2);
  },
  "pearly-shell": (c) => {
    groundShadow(c, 8, 15, 12);
    disc(c, "#5a4a5a", 8, 9, 5);
    disc(c, "#e8d8e8", 8, 9, 4);
    disc(c, "#c8b0c8", 9, 10, 3);
    disc(c, "#f4e8f0", 7, 8, 2);
    // the pearl in the opened shell
    disc(c, "#8a7a8a", 9, 10, 1);
    px(c, "#ffffff", 8, 10);
    px(c, "#ffffff", 9, 9);
    px(c, "#ffffff", 5, 7);
  },
  "spiral-shell": (c) => {
    groundShadow(c, 8, 15, 12);
    disc(c, "#5a3a2a", 8, 9, 5);
    disc(c, "#e0b8a0", 8, 9, 4);
    disc(c, "#b88a70", 9, 9, 3);
    disc(c, "#e0b8a0", 9, 8, 2);
    disc(c, "#b88a70", 9, 9, 1);
    px(c, "#f4dcc8", 9, 9);
    px(c, "#fff0e0", 5, 7, 1, 2);
  },
  "sea-fan": (c) => {
    groundShadow(c, 8, 15, 8);
    px(c, "#8a2a4a", 7, 10, 2, 5);
    for (const [x, y, h] of [
      [3, 4, 6],
      [5, 2, 8],
      [8, 1, 9],
      [10, 3, 7],
      [12, 5, 5],
    ] as const) {
      px(c, "#8a2a4a", x, y, 2, h);
      px(c, "#e86a8a", x, y, 1, h - 1);
      px(c, "#ffa8c0", x, y);
    }
    px(c, "#e86a8a", 4, 9, 9, 2);
    px(c, "#8a2a4a", 4, 11, 9, 1);
  },
  "pin-urchin": (c) => {
    groundShadow(c, 8, 15, 12);
    // spines first, then the body over them
    for (const [x, y] of [
      [8, 2],
      [3, 5],
      [13, 5],
      [2, 10],
      [14, 10],
      [5, 3],
      [11, 3],
      [4, 13],
      [12, 13],
    ] as const)
      px(c, "#3a2a4a", x, y, 1, 2);
    disc(c, "#2a1a3a", 8, 9, 5);
    disc(c, "#5a3a7a", 8, 9, 4);
    disc(c, "#7a5a9a", 7, 8, 2);
    for (const [x, y] of [
      [6, 6],
      [10, 7],
      [8, 11],
      [5, 10],
      [11, 10],
    ] as const)
      px(c, "#2a1a3a", x, y);
    px(c, "#c8b0e0", 6, 7);
  },
  seaweed: (c) => {
    groundShadow(c, 8, 15, 10);
    for (const [x, sway] of [
      [5, 1],
      [8, -1],
      [11, 1],
    ] as const)
      for (let y = 3; y < 15; y++) {
        const dx = ((y >> 1) % 2) * sway;
        px(c, "#174a38", x + dx, y, 2, 1);
        px(c, "#2a7a5a", x + dx, y);
        if (y % 3 === 0) px(c, "#5ab08a", x + dx, y);
      }
  },
};

/** Each land forage good has its own small picture. */
const FORAGE_PAINTERS: Record<string, (c: Ctx) => void> = {
  daffodil: (c) => {
    groundShadow(c, 8, 15, 8);
    px(c, LEAF_DARK, 5, 8, 1, 7);
    px(c, LEAF, 11, 9, 1, 6);
    px(c, STEM, 8, 8, 1, 7);
    disc(c, "#a07a10", 8, 6, 3);
    disc(c, "#f6e47a", 8, 6, 2);
    px(c, "#d8b02a", 9, 7, 2, 1);
    px(c, "#d8b02a", 10, 6);
    px(c, "#fff4b0", 6, 5);
    // the trumpet
    px(c, "#f09a2a", 7, 5, 2, 2);
    px(c, "#c06a1a", 8, 6);
  },
  dandelion: (c) => {
    groundShadow(c, 8, 15, 12);
    px(c, STEM, 8, 8, 1, 6);
    // jagged leaves at the foot
    for (let x = 3; x < 13; x++) {
      px(c, LEAF_DARK, x, 14);
      px(c, LEAF, x, 13 - (x % 2));
    }
    disc(c, "#a07a10", 8, 5, 3);
    disc(c, "#e8b820", 8, 5, 2);
    disc(c, "#f4e04a", 7, 4, 1);
    px(c, "#fff8b0", 7, 4);
    px(c, "#c8901a", 9, 6);
    px(c, "#c8901a", 10, 4);
  },
  "sweet-pea": (c) => {
    groundShadow(c, 8, 15, 8);
    px(c, STEM, 8, 9, 1, 6);
    px(c, STEM, 7, 7, 1, 2);
    px(c, STEM, 9, 8, 2, 1);
    px(c, LEAF_LIGHT, 11, 7);
    px(c, LEAF_LIGHT, 12, 6);
    leaf(c, 5, 11);
    leaf(c, 9, 12);
    for (const [x, y] of [
      [4, 4],
      [9, 3],
    ] as const) {
      px(c, "#8a3a6a", x, y, 4, 4);
      px(c, "#e98ac0", x, y, 3, 3);
      px(c, "#f7b4d8", x, y, 2, 1);
      px(c, "#c0609a", x + 1, y + 2, 2, 1);
    }
  },
  crocus: (c) => {
    groundShadow(c, 8, 15, 8);
    px(c, LEAF, 5, 9, 1, 6);
    px(c, LEAF, 11, 10, 1, 5);
    px(c, LEAF_DARK, 6, 11, 1, 4);
    px(c, "#e8e0c8", 8, 10, 1, 5);
    // a goblet of petals, three tips at the top, narrowing to the stem
    px(c, "#3a1a5a", 5, 2, 7, 7);
    px(c, "#3a1a5a", 6, 9, 5, 1);
    px(c, "#3a1a5a", 7, 10, 3, 1);
    px(c, "#8a5ac8", 6, 3, 5, 5);
    px(c, "#8a5ac8", 7, 8, 3, 1);
    px(c, "#8a5ac8", 6, 2);
    px(c, "#8a5ac8", 8, 2);
    px(c, "#8a5ac8", 10, 2);
    px(c, "#5a5a2a", 7, 2);
    px(c, "#5a5a2a", 9, 2);
    px(c, "#b48ae0", 6, 2, 1, 5);
    px(c, "#6a3aa0", 10, 3, 1, 5);
    px(c, "#f0a030", 8, 6, 1, 2);
    px(c, "#ffd870", 8, 6);
  },
  snowdrop: (c) => {
    groundShadow(c, 8, 15, 8);
    px(c, LEAF, 5, 9, 1, 6);
    px(c, LEAF_DARK, 6, 11, 1, 4);
    // an arched stem with the white bell hanging from it
    px(c, STEM, 8, 6, 1, 9);
    px(c, STEM, 9, 5, 2, 1);
    px(c, "#5a5a6a", 9, 6, 4, 5);
    px(c, "#f4f4f8", 10, 6, 2, 4);
    px(c, "#ffffff", 10, 6);
    px(c, "#c8c8d8", 11, 7, 1, 3);
    px(c, "#6ab84a", 10, 9, 2, 1);
  },
  grape: (c) => {
    groundShadow(c, 8, 15, 10);
    px(c, "#6a4a26", 8, 1, 1, 3);
    leaf(c, 9, 2, 3);
    px(c, LEAF_LIGHT, 13, 1);
    for (const [x, y] of [
      [5, 5],
      [8, 5],
      [11, 5],
      [6, 8],
      [9, 8],
      [7, 11],
      [10, 11],
      [8, 13],
    ] as const)
      ball(c, x, y, 1, "#8a4aaa", "#3a1a5a");
  },
  "spice-berry": (c) => {
    groundShadow(c, 8, 15, 10);
    px(c, "#6a4a26", 3, 3, 1, 1);
    for (let i = 0; i < 9; i++) px(c, STEM, 3 + i, 3 + i);
    leaf(c, 6, 3, 3);
    leaf(c, 10, 7, 3);
    ball(c, 5, 9, 1, "#e04a3a", "#7a1a14");
    ball(c, 8, 11, 1, "#e04a3a", "#7a1a14");
    ball(c, 12, 13, 1, "#e04a3a", "#7a1a14");
  },
  salmonberry: (c) => {
    groundShadow(c, 8, 15, 10);
    leaf(c, 6, 2, 4);
    px(c, STEM, 8, 3, 1, 2);
    disc(c, "#8a3a14", 8, 9, 4);
    disc(c, "#f08a3a", 8, 9, 3);
    // drupelets
    for (const [x, y] of [
      [6, 7],
      [9, 7],
      [7, 9],
      [10, 10],
      [6, 11],
      [9, 12],
    ] as const) {
      px(c, "#ffc078", x, y);
      px(c, "#c05a20", x + 1, y + 1);
    }
  },
  "bramble-berry": (c) => {
    groundShadow(c, 8, 15, 12);
    px(c, "#5a3a2a", 2, 4, 12, 1);
    px(c, "#5a3a2a", 4, 3);
    px(c, "#5a3a2a", 10, 3);
    leaf(c, 6, 2, 3);
    for (const [x, y] of [
      [5, 8],
      [11, 9],
    ] as const) {
      px(c, STEM, x, 5, 1, y - 6);
      disc(c, "#14081a", x, y + 1, 2);
      disc(c, "#3a1a4a", x, y + 1, 1);
      px(c, "#7a5a9a", x - 1, y + 1);
      px(c, "#7a5a9a", x, y);
      px(c, "#7a5a9a", x + 1, y + 2);
    }
  },
  "holly-sprig": (c) => {
    groundShadow(c, 8, 15, 12);
    // two spiky leaves
    for (const [x, y, dx] of [
      [2, 5, 1],
      [9, 8, 1],
    ] as const) {
      px(c, "#0e3a1a", x, y, 6, 4);
      px(c, "#1e6a2e", x + 1, y + 1, 4, 2);
      px(c, "#4a9a4a", x + 1, y + 1, 3, 1);
      px(c, "#0e3a1a", x + 2 * dx, y - 1);
      px(c, "#0e3a1a", x + 4 * dx, y + 4);
    }
    ball(c, 7, 10, 1, "#e0283a", "#6a0a14");
    ball(c, 9, 7, 1, "#e0283a", "#6a0a14");
    ball(c, 6, 13, 1, "#e0283a", "#6a0a14");
  },
  "rose-hip": (c) => {
    groundShadow(c, 8, 15, 10);
    px(c, "#5a3a2a", 3, 3, 10, 1);
    leaf(c, 7, 1, 3);
    for (const x of [5, 10]) {
      px(c, "#5a3a2a", x, 4, 1, 2);
      disc(c, "#6a1a10", x, 9, 3);
      disc(c, "#d8402a", x, 9, 2);
      px(c, "#a02818", x + 1, 10, 1, 2);
      px(c, "#a02818", x, 11);
      px(c, "#f0805a", x - 1, 8, 1, 2);
      px(c, "#ffffffaa", x - 1, 7);
      px(c, "#2a1a10", x - 1, 12, 3, 1);
      px(c, "#2a1a10", x, 13);
    }
  },
  "wild-plum": (c) => {
    groundShadow(c, 8, 15, 10);
    px(c, "#5a3a2a", 8, 2, 1, 3);
    leaf(c, 9, 2, 3);
    disc(c, "#2a0a2a", 8, 9, 5);
    disc(c, "#7a3a8a", 8, 9, 4);
    disc(c, "#9a5aaa", 7, 8, 2);
    px(c, "#4a1a5a", 8, 6, 1, 7);
    px(c, "#d8b8e8", 5, 7, 1, 2);
  },
  "crab-apple": (c) => {
    groundShadow(c, 8, 15, 12);
    px(c, "#5a3a2a", 6, 3, 1, 4);
    px(c, "#5a3a2a", 10, 4, 1, 4);
    px(c, "#5a3a2a", 7, 2, 3, 1);
    leaf(c, 9, 1, 3);
    ball(c, 5, 10, 2, "#e04030", "#7a1a10");
    ball(c, 11, 11, 2, "#e8b030", "#9a5a10");
    px(c, "#e04030", 12, 10);
  },
  hazelnut: (c) => {
    groundShadow(c, 8, 15, 10);
    disc(c, "#2a1a0a", 8, 9, 4);
    disc(c, "#a0682a", 8, 9, 3);
    disc(c, "#c88a44", 7, 8, 1);
    px(c, "#f0c890", 6, 8);
    // the frilly husk on top
    px(c, "#2a5a1a", 4, 4, 8, 3);
    px(c, "#6aa83a", 5, 4, 6, 2);
    px(c, "#9ad060", 5, 4, 2, 1);
    px(c, "#2a5a1a", 4, 3);
    px(c, "#2a5a1a", 7, 3);
    px(c, "#2a5a1a", 11, 3);
  },
  chestnut: (c) => {
    groundShadow(c, 8, 15, 12);
    // a split spiny husk
    for (const [x, y] of [
      [2, 6],
      [3, 3],
      [6, 2],
      [10, 2],
      [13, 3],
      [14, 7],
      [2, 11],
      [14, 11],
    ] as const)
      px(c, "#4a7a1a", x, y);
    disc(c, "#3a5a14", 8, 10, 5);
    disc(c, "#7aa83a", 8, 10, 4);
    px(c, "#a8d060", 5, 8, 2, 1);
    // the glossy nut bursting out of the top of the husk
    disc(c, "#2a1a0a", 8, 7, 3);
    disc(c, "#7a3a14", 8, 7, 2);
    px(c, "#b8683a", 7, 6, 2, 1);
    px(c, "#f0c0a0", 7, 6);
    px(c, "#e8d8b0", 7, 9, 3, 1);
  },
  "pine-nut": (c) => {
    groundShadow(c, 8, 15, 10);
    px(c, "#2a1a0a", 4, 3, 8, 11);
    px(c, "#2a1a0a", 5, 2, 6, 1);
    for (let y = 3; y < 13; y += 2)
      for (let x = 5 + ((y >> 1) % 2); x < 11; x += 2) {
        px(c, "#8a6a34", x, y, 2, 2);
        px(c, "#c09a5a", x, y);
        px(c, "#4a2e14", x + 1, y + 1);
      }
    px(c, "#2a1a0a", 7, 13, 2, 2);
    px(c, "#f0e0c0", 12, 12, 2, 1);
    px(c, "#f0e0c0", 13, 10, 1, 1);
  },
  "field-mushroom": (c) =>
    mushroom(c, "#f0e8d8", "#c8a888", "#ffffff", "#f4ecdc"),
  chanterelle: (c) => {
    groundShadow(c, 8, 15, 10);
    // a funnel cap with a wavy edge, flaring up from the stem
    px(c, "#7a3a0a", 3, 3, 10, 4);
    px(c, "#7a3a0a", 5, 7, 6, 2);
    px(c, "#7a3a0a", 6, 9, 4, 5);
    px(c, "#f0a020", 4, 4, 8, 2);
    px(c, "#d8801a", 5, 6, 6, 2);
    px(c, "#f0a020", 7, 8, 2, 5);
    px(c, "#ffd060", 4, 4, 3, 1);
    px(c, "#ffd060", 7, 8, 1, 4);
    px(c, "#3a1a04", 4, 3, 1, 1);
    px(c, "#3a1a04", 8, 3, 1, 1);
    px(c, "#3a1a04", 11, 3, 1, 1);
  },
  morel: (c) => {
    groundShadow(c, 8, 15, 8);
    px(c, "#5a4a3a", 6, 11, 4, 4);
    px(c, "#f0e4c8", 7, 11, 2, 3);
    px(c, "#2a1e10", 5, 2, 6, 10);
    px(c, "#2a1e10", 6, 1, 4, 1);
    px(c, "#a07a44", 6, 2, 4, 9);
    px(c, "#a07a44", 7, 1, 2, 1);
    // honeycomb pits
    for (const [x, y] of [
      [6, 3],
      [8, 4],
      [7, 6],
      [9, 7],
      [6, 8],
      [8, 9],
    ] as const)
      px(c, "#4a3218", x, y);
    px(c, "#d8b878", 7, 2);
    px(c, "#d8b878", 6, 5);
  },
  snowcap: (c) => {
    mushroom(c, "#d8e4f0", "#8aa0b8", "#ffffff", "#e8eef4");
    px(c, "#ffffff", 5, 4, 6, 1);
    px(c, "#ffffff", 4, 5, 3, 1);
    px(c, "#7a9ac0", 7, 6);
    px(c, "#7a9ac0", 10, 6);
    px(c, "#7a9ac0", 5, 7);
  },
  "cave-mushroom": (c) => {
    mushroom(c, "#8a4ab0", "#4a1a6a", "#c08ae0", "#d8c8e0");
    for (const [x, y] of [
      [6, 6],
      [9, 5],
      [11, 7],
    ] as const) {
      px(c, "#b8f0ff", x, y);
    }
  },
  horseradish: (c) => root(c, "#e0d8b0", "#a89870", "#f4ecd0"),
  "frost-root": (c) => {
    root(c, "#c8e0f0", "#7a9ab8", "#f0f8ff");
    px(c, "#ffffff", 11, 7);
    px(c, "#ffffff", 4, 10);
    px(c, "#ffffff", 10, 12);
  },
  "snow-tuber": (c) => {
    groundShadow(c, 8, 15, 12);
    px(c, LEAF_DARK, 7, 2, 2, 3);
    px(c, LEAF, 7, 2, 1, 2);
    disc(c, "#4a3a2a", 7, 9, 4);
    disc(c, "#4a3a2a", 11, 11, 2);
    disc(c, "#a8987a", 7, 9, 3);
    disc(c, "#a8987a", 11, 11, 1);
    disc(c, "#f0e8d0", 6, 8, 2);
    px(c, "#7a6a4a", 8, 10);
    px(c, "#7a6a4a", 5, 11);
    px(c, "#7a6a4a", 10, 7);
    px(c, "#ffffff", 5, 7);
  },
  "wild-ginger": (c) => {
    groundShadow(c, 8, 15, 12);
    px(c, LEAF_DARK, 9, 2, 4, 4);
    px(c, LEAF, 10, 2, 2, 2);
    px(c, LEAF_LIGHT, 10, 2);
    px(c, STEM, 10, 5, 1, 3);
    // a knobbly rhizome
    px(c, "#4a3218", 2, 8, 12, 5);
    px(c, "#4a3218", 4, 6, 3, 2);
    px(c, "#d8b070", 3, 9, 10, 3);
    px(c, "#d8b070", 5, 7, 1, 2);
    px(c, "#f0d8a0", 3, 9, 4, 1);
    px(c, "#a07a44", 3, 11, 10, 1);
    px(c, "#a07a44", 7, 9, 1, 2);
    px(c, "#a07a44", 10, 9, 1, 2);
  },
  leek: (c) => {
    groundShadow(c, 8, 15, 8);
    px(c, "#1e5a1a", 5, 1, 6, 9);
    px(c, "#3a8a30", 6, 1, 1, 8);
    px(c, "#3a8a30", 9, 2, 1, 7);
    px(c, "#5aa84a", 7, 3, 2, 6);
    px(c, "#7ac05a", 7, 3, 1, 4);
    px(c, "#7a8a5a", 6, 9, 4, 6);
    px(c, "#c8e0a0", 7, 9, 2, 5);
    px(c, "#ffffff", 7, 11, 1, 3);
    px(c, "#d8d0b0", 7, 14, 2, 1);
  },
  "spring-onion": (c) => {
    groundShadow(c, 8, 15, 8);
    px(c, "#1e5a1a", 5, 2, 1, 8);
    px(c, "#1e5a1a", 8, 1, 1, 9);
    px(c, "#1e5a1a", 10, 3, 1, 7);
    px(c, "#5aa84a", 6, 2, 1, 8);
    px(c, "#5aa84a", 9, 1, 1, 9);
    px(c, "#7ac05a", 9, 1);
    disc(c, "#7a7a5a", 8, 12, 3);
    disc(c, "#f4f0e0", 8, 12, 2);
    px(c, "#ffffff", 7, 11);
    px(c, "#c8c0a0", 9, 13);
    px(c, "#a8a080", 7, 15, 3, 1);
  },
  "wild-garlic": (c) => {
    groundShadow(c, 8, 15, 12);
    // broad leaves with a pale midrib
    for (const [x, h] of [
      [3, 8],
      [10, 9],
    ] as const) {
      px(c, LEAF_DARK, x, 13 - h, 3, h);
      px(c, LEAF, x, 13 - h, 2, h - 1);
      px(c, LEAF_LIGHT, x + 1, 14 - h, 1, h - 3);
    }
    // white star flowers on a stalk
    px(c, STEM, 8, 4, 1, 10);
    for (const [x, y] of [
      [7, 3],
      [9, 2],
      [8, 5],
    ] as const) {
      px(c, "#ffffff", x, y);
      px(c, "#e0e0d0", x + 1, y);
    }
    px(c, "#f0f0e0", 6, 12, 5, 3);
    px(c, "#c8c0a8", 9, 13, 2, 2);
  },
  "winter-cress": (c) => {
    groundShadow(c, 8, 15, 12);
    for (const [x, y] of [
      [4, 8],
      [11, 8],
      [6, 5],
      [10, 5],
      [8, 11],
      [5, 11],
      [11, 11],
    ] as const) {
      disc(c, LEAF_DARK, x, y, 2);
      disc(c, "#3a8a4a", x, y, 1);
      px(c, "#8ad08a", x - 1, y);
    }
    px(c, "#ffffff", 6, 4);
    px(c, "#ffffff", 11, 7);
  },
  "fiddlehead-fern": (c) => {
    groundShadow(c, 8, 15, 8);
    px(c, "#1f5a28", 6, 3, 7, 5);
    px(c, "#1f5a28", 7, 7, 3, 8);
    px(c, "#3a9a4a", 8, 7, 1, 7);
    px(c, "#3a9a4a", 8, 4, 3, 1);
    px(c, "#3a9a4a", 11, 5, 1, 2);
    px(c, "#3a9a4a", 9, 6, 2, 1);
    px(c, "#7ad064", 8, 4, 2, 1);
    px(c, "#2a7a38", 6, 10, 2, 1);
    px(c, "#2a7a38", 9, 11, 2, 1);
  },
};

export const forageKey = (id: string) => `forage-${id}`;

function paintForage(scene: Phaser.Scene, id: string): void {
  const t = scene.textures.createCanvas(forageKey(id), SIZE, SIZE)!;
  const c = t.getContext();
  const paint = FORAGE_PAINTERS[id] ?? SHORE_PAINTERS[id];
  if (paint) paint(c);
  else {
    // a fallback flower spray for any good without its own picture
    groundShadow(c, 8, 15, 8);
    px(c, STEM, 8, 8, 1, 6);
    leaf(c, 5, 11, 3);
    leaf(c, 9, 10, 3);
    for (const [x, y] of [
      [6, 5],
      [10, 6],
      [8, 3],
    ] as const)
      ball(c, x, y, 1, "#e58fd0", "#8a3a7a");
  }
  t.refresh();
}

// ---- item and tool icons for the toolbar

export const TOOL_ICONS = {
  hoe: "icon-hoe",
  can: "icon-can",
  axe: "icon-axe",
  pickaxe: "icon-pickaxe",
};

function paintToolIcons(scene: Phaser.Scene): void {
  const draw = (key: string, paint: (c: Ctx) => void) => {
    const t = scene.textures.createCanvas(key, SIZE, SIZE)!;
    paint(t.getContext());
    t.refresh();
  };
  draw(TOOL_ICONS.hoe, (c) => {
    px(c, "#8a5c2a", 7, 2, 2, 12);
    px(c, "#b07a3c", 7, 4, 1, 10);
    px(c, "#5c3a18", 8, 4, 1, 10);
    px(c, "#b8bcc4", 4, 2, 8, 2);
    px(c, "#e4e8ee", 5, 2, 5, 1);
    px(c, "#8a8e96", 4, 4, 2, 1);
    px(c, "#6a6e76", 4, 3, 1, 2);
  });
  draw(TOOL_ICONS.can, (c) => {
    px(c, "#5a8ec0", 3, 6, 8, 7);
    px(c, "#3f6f9c", 3, 12, 8, 1);
    px(c, "#5a8ec0", 11, 4, 3, 2);
    px(c, "#5a8ec0", 12, 3, 3, 1);
    px(c, "#8fc4f0", 4, 7, 2, 1);
    px(c, "#3f6f9c", 4, 4, 5, 1);
    px(c, "#3f6f9c", 4, 5, 1, 1);
    px(c, "#3f6f9c", 8, 5, 1, 1);
    px(c, "#7fb0dc", 3, 6, 8, 1);
    px(c, "#2c5478", 3, 13, 8, 1);
    px(c, "#3f6f9c", 10, 7, 1, 5);
    px(c, "#2c5478", 14, 3);
  });
  draw(TOOL_ICONS.axe, (c) => {
    px(c, "#8a5c2a", 7, 3, 2, 11);
    px(c, "#b8bcc4", 3, 2, 5, 5);
    px(c, "#8a8e96", 3, 6, 5, 1);
    px(c, "#d8dce4", 4, 3, 2, 1);
    px(c, "#6a6e76", 3, 7, 5, 1);
    px(c, "#b07a3c", 7, 4, 1, 10);
    px(c, "#5c3a18", 8, 4, 1, 10);
    px(c, "#5c3a18", 7, 14, 2, 1);
  });
  draw(TOOL_ICONS.pickaxe, (c) => {
    px(c, "#8a5c2a", 7, 4, 2, 10);
    px(c, "#b8bcc4", 2, 3, 12, 2);
    px(c, "#8a8e96", 2, 5, 2, 2);
    px(c, "#8a8e96", 12, 5, 2, 2);
    px(c, "#d8dce4", 5, 3, 3, 1);
    px(c, "#6a6e76", 2, 7, 2, 1);
    px(c, "#6a6e76", 12, 7, 2, 1);
    px(c, "#b07a3c", 7, 5, 1, 9);
    px(c, "#5c3a18", 8, 5, 1, 9);
    px(c, "#5c3a18", 7, 14, 2, 1);
  });
}

function paintSeedIcon(scene: Phaser.Scene, cropId: string): void {
  const pal = CROP_COLOURS[cropId] ?? FALLBACK;
  const t = scene.textures.createCanvas(`icon-${seedId(cropId)}`, SIZE, SIZE)!;
  paintSeedPacket(t.getContext(), cropId, pal.fruit);
  t.refresh();
}

// ---- trees and tree goods

export const WEED_KEY = "weed";
export const TWIG_KEY = "twig";

/** The picture of a sprinkler, on the ground and in the backpack. */
/** Fruit tree pictures: growth stages 0 to 4 and, over a mature crown, the fruit it holds. */
export const fruitTreeKey = (stage: number) => `fruit-tree-${stage}`;
export const fruitOnTreeKey = (id: string) => `fruit-on-${id}`;
export const saplingIconKey = (id: string) => `icon-sapling-${id}`;
const FRUIT_COLOUR: Record<string, string> = {
  apricot: "#f0a030",
  cherry: "#c02040",
  peach: "#f0a090",
  orange: "#f08020",
  apple: "#d83030",
  pomegranate: "#a01848",
};
const fruitColour = (id: string) => FRUIT_COLOUR[id] ?? "#e0b040";

export const machineKey = (id: string) => `machine-${id}`;
export const MACHINE_READY_KEY = "machine-ready";

export const sprinklerKey = (id: string) => `sprinkler-${id}`;

/** Small marks over fertilized soil, one per line, so the bed shows what it holds. */
export const fertKey = (line: string) => `fert-${line}`;

export const treeKey = (
  stage: number,
  stump: boolean,
  large = false,
  cut = false,
) =>
  large
    ? cut
      ? "stump-cut"
      : "stump-large"
    : stump
      ? "tree-stump"
      : `tree-${stage}`;

function paintTrees(scene: Phaser.Scene): void {
  const draw = (key: string, paint: (c: Ctx) => void) => {
    const t = scene.textures.createCanvas(key, SIZE, SIZE)!;
    paint(t.getContext());
    t.refresh();
  };
  // A weed: a ragged tuft of leaves, flat enough to walk over.
  draw(WEED_KEY, (c) => {
    groundShadow(c, 8, 14, 10);
    px(c, "#2a5a20", 3, 7, 4, 4);
    px(c, "#2a5a20", 6, 5, 5, 4);
    px(c, "#2a5a20", 9, 7, 4, 4);
    px(c, "#3a7a2a", 5, 9, 1, 5);
    px(c, "#4aa03a", 8, 7, 1, 7);
    px(c, "#3a7a2a", 11, 9, 1, 5);
    px(c, "#4aa03a", 4, 8, 2, 2);
    px(c, "#4aa03a", 7, 6, 3, 2);
    px(c, "#4aa03a", 10, 8, 2, 2);
    px(c, "#7ad064", 4, 8);
    px(c, "#7ad064", 7, 6, 2, 1);
    px(c, "#7ad064", 10, 8);
    px(c, "#2f6a24", 6, 12, 1, 2);
    px(c, "#2f6a24", 9, 11, 1, 3);
  });
  // A twig: two crossed bits of branch, flat enough to walk over.
  draw(TWIG_KEY, (c) => {
    px(c, "#6b4e2d", 3, 10, 9, 1);
    px(c, "#8a6a40", 5, 9, 7, 1);
    px(c, "#6b4e2d", 6, 8, 1, 4);
    px(c, "#8a6a40", 10, 7, 1, 4);
    px(c, "#4a3820", 4, 12, 7, 1);
    px(c, "#4a3820", 3, 11, 9, 1);
    px(c, "#4a3820", 7, 9, 1, 3);
    px(c, "#a88456", 4, 10, 3, 1);
    px(c, "#a88456", 10, 7);
  });
  // A seed in the ground: a pale mound and a speck.
  draw(treeKey(1, false), (c) => {
    groundShadow(c, 8, 12, 8);
    px(c, "#4a3218", 5, 10, 6, 2);
    px(c, "#6b4e2d", 6, 10, 4, 2);
    px(c, "#8a6a40", 7, 9, 2, 1);
    px(c, "#a88456", 6, 10);
    px(c, "#c9a24a", 7, 10, 2, 1);
    px(c, "#f0d488", 7, 10);
  });
  // Seedlings: a stem with a few leaves.
  draw(treeKey(2, false), (c) => {
    groundShadow(c, 8, 14, 6);
    px(c, "#5a3e22", 8, 9, 1, 5);
    px(c, "#2d6a2e", 5, 8, 3, 3);
    px(c, "#2d6a2e", 9, 6, 3, 3);
    px(c, "#4aa04a", 6, 8, 2, 2);
    px(c, "#4aa04a", 9, 7, 2, 2);
    px(c, "#86c470", 6, 8);
    px(c, "#86c470", 9, 7);
  });
  draw(treeKey(3, false), (c) => {
    groundShadow(c, 8, 14, 8);
    trunk(c, 8, 8, 1, 6);
    canopy(
      c,
      [
        [8, 6, 3],
        [6, 7, 2],
        [10, 7, 2],
      ],
      TREE_TONES,
    );
  });
  // A young tree: a thin trunk and a small crown.
  draw(treeKey(4, false), (c) => {
    groundShadow(c, 8, 15, 10);
    trunk(c, 7, 9, 2, 6);
    canopy(
      c,
      [
        [8, 5, 4],
        [5, 8, 3],
        [11, 8, 3],
      ],
      TREE_TONES,
    );
  });
  // A mature tree: the full crown over a trunk.
  draw(treeKey(5, false), (c) => {
    groundShadow(c, 8, 15, 14);
    trunk(c, 7, 10, 3, 5);
    canopy(
      c,
      [
        [8, 5, 5],
        [4, 8, 4],
        [12, 8, 3],
        [8, 9, 4],
      ],
      TREE_TONES,
    );
    // leaf clumps: a few darker notches and lit tips break up the crown
    px(c, "#1f5a28", 10, 9, 2, 1);
    px(c, "#1f5a28", 5, 11, 2, 1);
    px(c, "#1f5a28", 9, 4, 1, 1);
    px(c, "#4a9a46", 7, 8, 2, 1);
    px(c, "#86c470", 3, 6);
    for (const [x, y] of [
      [5, 3],
      [10, 3],
      [2, 8],
      [7, 7],
      [11, 7],
      [5, 10],
      [9, 11],
    ] as const) {
      px(c, "#5aaa52", x, y, 2, 1);
      px(c, "#1f5a28", x + 1, y + 1, 2, 1);
    }
  });
  draw(treeKey(5, true), (c) => {
    groundShadow(c, 8, 15, 12);
    px(c, "#2e1e0e", 3, 7, 10, 8);
    px(c, "#5a3e22", 4, 8, 8, 6);
    px(c, "#7a5832", 4, 9, 2, 5);
    px(c, "#3e2a16", 10, 9, 2, 5);
    px(c, "#3e2a16", 7, 10, 1, 3);
    px(c, "#2e1e0e", 2, 13, 12, 1);
    px(c, "#4a3218", 3, 13, 10, 1);
    px(c, "#c9a470", 4, 6, 8, 3);
    px(c, "#2e1e0e", 4, 5, 8, 1);
    px(c, "#e0c08c", 5, 6, 3, 1);
    px(c, "#a8844f", 5, 7, 6, 1);
    px(c, "#c9a470", 7, 7, 2, 1);
    px(c, "#a8844f", 4, 8, 8, 1);
  });
  // A large stump (Woodland): wide, with rings on top. Cut, it is a low stub.
  draw("stump-large", (c) => {
    px(c, "#2e1e0e", 0, 4, 16, 12);
    px(c, "#5a3e22", 1, 6, 14, 9);
    px(c, "#7a5832", 1, 7, 3, 7);
    px(c, "#3e2a16", 12, 7, 3, 7);
    px(c, "#3e2a16", 6, 9, 1, 4);
    px(c, "#3e2a16", 9, 8, 1, 5);
    px(c, "#3e2a16", 1, 14, 14, 1);
    px(c, "#c9a470", 1, 4, 14, 3);
    px(c, "#e0c08c", 2, 4, 5, 1);
    px(c, "#a8844f", 3, 5, 10, 1);
    px(c, "#c9a470", 5, 5, 6, 1);
    px(c, "#a8844f", 7, 5, 2, 1);
    px(c, "#a8844f", 1, 6, 14, 1);
  });
  draw("stump-cut", (c) => {
    px(c, "#2e1e0e", 2, 9, 12, 7);
    px(c, "#5a3e22", 3, 11, 10, 4);
    px(c, "#7a5832", 3, 11, 2, 4);
    px(c, "#3e2a16", 11, 11, 2, 4);
    px(c, "#c9a470", 3, 10, 10, 1);
    px(c, "#e0c08c", 4, 10, 3, 1);
  });
  draw("icon-wood", (c) => {
    px(c, "#7a4e26", 2, 5, 12, 3);
    px(c, "#9a6a3a", 2, 5, 12, 1);
    px(c, "#7a4e26", 2, 9, 12, 3);
    px(c, "#9a6a3a", 2, 9, 12, 1);
    px(c, "#d9b27a", 2, 6, 1, 2);
    px(c, "#d9b27a", 2, 10, 1, 2);
  });
  // The tapper (note 92): a small spout and a bucket. Placeholder art. The icon is the
  // item; the "on-tree" picture is the overlay drawn over a tapped trunk.
  const tapperArt = (c: Ctx, heavy: boolean) => {
    px(c, heavy ? "#6a6a74" : "#8a8a94", 6, 4, 4, 2);
    px(c, heavy ? "#4a4a54" : "#6a6a72", 7, 6, 2, 3);
    px(c, "#7a4e26", 5, 9, 6, 5);
    px(c, "#9a6a3a", 5, 9, 6, 1);
    if (heavy) px(c, "#c8a838", 5, 11, 6, 1);
  };
  draw("icon-tapper", (c) => tapperArt(c, false));
  draw("icon-heavy-tapper", (c) => tapperArt(c, true));
  draw("tapper-on-tree", (c) => {
    px(c, "#8a8a94", 6, 8, 3, 2);
    px(c, "#7a4e26", 4, 10, 5, 4);
    px(c, "#9a6a3a", 4, 10, 5, 1);
  });
  draw("tapper-on-tree-heavy", (c) => {
    px(c, "#6a6a74", 6, 8, 3, 2);
    px(c, "#7a4e26", 4, 10, 5, 4);
    px(c, "#9a6a3a", 4, 10, 5, 1);
    px(c, "#c8a838", 4, 12, 5, 1);
  });
  draw("icon-hardwood", (c) => {
    px(c, "#4a2e18", 2, 5, 12, 3);
    px(c, "#6a4426", 2, 5, 12, 1);
    px(c, "#4a2e18", 2, 9, 12, 3);
    px(c, "#6a4426", 2, 9, 12, 1);
    px(c, "#b58a56", 2, 6, 1, 2);
    px(c, "#b58a56", 2, 10, 1, 2);
  });
  draw("icon-sap", (c) => {
    px(c, "#e0a030", 7, 3, 2, 2);
    px(c, "#e0a030", 6, 5, 4, 5);
    px(c, "#e0a030", 7, 10, 2, 2);
    px(c, "#f8d878", 7, 6, 1, 3);
  });
  const bag = (id: string, color: string, light: string) =>
    draw(`icon-${id}`, (c) => {
      px(c, "#7a6040", 4, 4, 8, 9);
      px(c, "#9a8058", 4, 3, 8, 2);
      px(c, color, 5, 7, 6, 4);
      px(c, light, 6, 8, 2, 1);
    });
  bag("basic-fertilizer", "#6a8f3a", "#a0c060");
  bag("quality-fertilizer", "#3a7fb0", "#80c0e8");
  bag("speed-fertilizer", "#d8a030", "#f8d878");
  bag("basic-retaining-soil", "#5a7fa0", "#9cc0e0");
  bag("quality-retaining-soil", "#3a5f9a", "#78a0d8");
  const mark = (line: string, color: string) =>
    draw(fertKey(line), (c) => {
      for (const [x, y] of [
        [3, 2],
        [11, 5],
        [6, 9],
        [13, 12],
        [2, 13],
      ] as const)
        px(c, color, x, y, 2, 2);
    });
  mark("quality", "#e8d8a0");
  mark("retaining", "#6ab0e8");
  mark("speed", "#f0b040");
  // A sprinkler: a short post and a head with spray ticks. Quality has a gold ring.
  for (const s of SPRINKLERS)
    draw(sprinklerKey(s.id), (c) => {
      const quality = s.id !== "sprinkler";
      px(c, "#5a5a62", 7, 7, 2, 7);
      px(c, "#8a8a94", 5, 12, 6, 2);
      px(c, quality ? "#e8c040" : "#c8743c", 5, 5, 6, 3);
      px(c, "#9ad0f0", 7, 3, 2, 2);
      px(c, "#9ad0f0", 3, 6, 2, 1);
      px(c, "#9ad0f0", 11, 6, 2, 1);
      if (quality) {
        px(c, "#9ad0f0", 4, 4, 1, 1);
        px(c, "#9ad0f0", 11, 4, 1, 1);
      }
    });
  // Machines: a small body each, with a mark of what it does.
  for (const m of MACHINES)
    draw(machineKey(m.id), (c) => {
      px(c, "#00000044", 2, 14, 12, 1);
      if (m.id === "charcoal-kiln") {
        px(c, "#4a4a52", 3, 5, 10, 9);
        px(c, "#6a6a74", 4, 3, 8, 3);
        px(c, "#1c1c20", 6, 9, 4, 5);
        px(c, "#e87a2a", 7, 11, 2, 2);
      } else if (m.id === "preserves-jar") {
        px(c, "#7a5a3a", 3, 4, 10, 10);
        px(c, "#a8784a", 4, 5, 8, 8);
        px(c, "#7a5a3a", 5, 2, 6, 2);
        px(c, "#d94a7a", 5, 7, 6, 4);
      } else if (m.id === "cask") {
        px(c, "#6a4a2a", 3, 3, 10, 11);
        px(c, "#8a6234", 4, 4, 8, 9);
        px(c, "#3a3a42", 3, 6, 10, 1);
        px(c, "#3a3a42", 3, 11, 10, 1);
        px(c, "#d94a7a", 7, 8, 2, 2);
      } else if (m.id === "dye-vat") {
        px(c, "#4a4a52", 3, 6, 10, 8);
        px(c, "#6a6a74", 3, 5, 10, 2);
        px(c, "#4a7ad9", 4, 6, 8, 3);
      } else if (m.id === "bee-house") {
        px(c, "#c89a3a", 4, 6, 8, 8);
        px(c, "#e8c050", 3, 3, 10, 3);
        px(c, "#3a2a1a", 7, 9, 2, 3);
        px(c, "#f4e070", 10, 8, 1, 1);
      } else if (m.id === "keg") {
        px(c, "#8a5a2a", 3, 3, 10, 11);
        px(c, "#a8783c", 4, 4, 8, 9);
        px(c, "#5a5a62", 3, 5, 10, 1);
        px(c, "#5a5a62", 3, 11, 10, 1);
        px(c, "#3a2a1a", 7, 8, 2, 2);
      } else if (m.id === "cheese-press") {
        px(c, "#8a6a3a", 3, 9, 10, 5);
        px(c, "#f0d060", 4, 10, 8, 3);
        px(c, "#6a6a72", 7, 2, 2, 7);
        px(c, "#8a8a94", 4, 7, 8, 2);
      } else if (m.id === "mayonnaise-machine") {
        px(c, "#6a8aa8", 3, 6, 10, 8);
        px(c, "#9ab8d0", 4, 3, 8, 4);
        px(c, "#f4ecc8", 6, 9, 4, 4);
        px(c, "#3a4a5a", 7, 4, 2, 1);
      } else if (m.id === "loom") {
        px(c, "#8a5a2a", 2, 3, 2, 11);
        px(c, "#8a5a2a", 12, 3, 2, 11);
        px(c, "#a8783c", 2, 3, 12, 2);
        px(c, "#7a8ad0", 4, 6, 8, 6);
        px(c, "#d8d8e8", 5, 7, 1, 5);
        px(c, "#d8d8e8", 8, 7, 1, 5);
      } else if (m.id === "oil-maker") {
        px(c, "#5a5a62", 3, 5, 10, 9);
        px(c, "#7a7a84", 5, 2, 6, 4);
        px(c, "#c8a838", 6, 9, 4, 4);
        px(c, "#c8a838", 7, 13, 2, 1);
      } else if (m.id === "geode-crusher") {
        px(c, "#5a5a62", 3, 8, 10, 6);
        px(c, "#8a8a94", 4, 3, 3, 6);
        px(c, "#8a8a94", 9, 3, 3, 6);
        px(c, "#a8789a", 6, 10, 4, 3);
      } else if (m.id === "worm-bin") {
        px(c, "#7a5a3a", 3, 6, 10, 8);
        px(c, "#4a3222", 4, 7, 8, 3);
        px(c, "#d8a0a0", 6, 9, 4, 1);
        px(c, "#8a6a44", 3, 5, 10, 2);
      } else if (m.id === "recycler") {
        px(c, "#4a6a5a", 3, 5, 10, 9);
        px(c, "#6a8a7a", 4, 3, 8, 3);
        px(c, "#2a3a32", 6, 8, 4, 4);
        px(c, "#d8d8c0", 7, 9, 2, 2);
      } else if (m.id === "crystalarium") {
        px(c, "#5a5a72", 3, 9, 10, 5);
        px(c, "#9ac8e8", 4, 2, 8, 8);
        px(c, "#d8f0ff", 6, 3, 2, 4);
        px(c, "#3a3a4a", 4, 10, 8, 1);
      } else if (m.id === "furnace") {
        px(c, "#3a3a42", 3, 4, 10, 10);
        px(c, "#5a5a64", 4, 2, 8, 3);
        px(c, "#1c1c20", 5, 8, 6, 5);
        px(c, "#e87a2a", 6, 10, 4, 2);
      } else {
        px(c, "#6a8a4a", 3, 5, 10, 9);
        px(c, "#8aaa5a", 4, 3, 8, 3);
        px(c, "#3a5a2a", 6, 8, 4, 4);
        px(c, "#e8d070", 7, 9, 2, 2);
      }
    });
  draw(MACHINE_READY_KEY, (c) => {
    px(c, "#ffffff", 11, 0, 5, 5);
    px(c, "#48c060", 12, 1, 3, 3);
  });
  // Artisan goods: one picture per category.
  const goodColours: Record<string, string> = {
    jam: "#c0407a",
    pickles: "#6aa84a",
    wine: "#7a2a5a",
    juice: "#e8a030",
    honey: "#f0c030",
    mead: "#d89a2a",
    beer: "#e0b030",
    cheese: "#f0d060",
    mayonnaise: "#f4ecc8",
    cloth: "#7a8ad0",
    oil: "#c8a838",
  };
  for (const [cat, colour] of Object.entries(goodColours))
    draw(`icon-artisan-${cat}`, (c) => {
      px(c, "#00000044", 4, 14, 8, 1);
      px(c, "#d8e8f0", 5, 3, 6, 2);
      px(c, "#d8e8f0", 4, 5, 8, 9);
      px(c, colour, 5, 7, 6, 6);
      px(c, "#ffffff66", 5, 6, 1, 6);
    });
  draw("icon-fiber", (c) => {
    px(c, "#7ab04a", 4, 4, 2, 9);
    px(c, "#5a9a3a", 7, 3, 2, 10);
    px(c, "#8cc05a", 10, 5, 2, 8);
    px(c, "#c9b46a", 3, 11, 10, 1);
  });
  draw("icon-mixed-seed", (c) => {
    px(c, "#e8dcc0", 3, 2, 10, 12);
    px(c, "#c8bc9c", 3, 2, 10, 1);
    px(c, "#c0463c", 5, 5, 2, 3);
    px(c, "#e0b030", 7, 6, 2, 3);
    px(c, "#5a9a3a", 9, 5, 2, 3);
    px(c, "#7a5ac0", 6, 9, 3, 2);
  });
  draw("icon-mahogany-seed", (c) => {
    px(c, "#7a2e22", 5, 4, 6, 8);
    px(c, "#9a4a32", 6, 3, 4, 2);
    px(c, "#4a1a14", 5, 10, 6, 2);
    px(c, "#d08a5a", 7, 6, 1, 3);
  });
  draw("icon-maple-seed", (c) => {
    px(c, "#b8542a", 4, 6, 4, 5);
    px(c, "#d8744a", 8, 5, 4, 4);
    px(c, "#7a3418", 7, 10, 2, 2);
  });
  draw("icon-pine-cone", (c) => {
    px(c, "#6a4a22", 5, 3, 6, 10);
    px(c, "#8a6a34", 6, 4, 4, 2);
    px(c, "#8a6a34", 6, 8, 4, 2);
    px(c, "#3a2a10", 7, 12, 2, 1);
  });
  draw("icon-tree-seed", (c) => {
    px(c, "#7a5a2a", 5, 4, 6, 8);
    px(c, "#9a7a3a", 6, 3, 4, 2);
    px(c, "#5a3e1a", 5, 10, 6, 2);
    px(c, "#c9a24a", 7, 6, 1, 3);
  });
}

// ---- mining goods and rocks

export const ROCK_KEYS = {
  stone: "rock-stone",
  hard: "rock-hard",
  copper: "rock-copper",
  coal: "rock-coal",
  quartz: "rock-quartz",
  geode: "rock-geode",
  gem: "rock-gem",
  iron: "rock-iron",
  gold: "rock-gold",
  hearthsilver: "rock-hearthsilver",
} as const;
export const LADDER_KEY = "mine-ladder";
export const SPOT_KEY = "artifact-spot";

const MINE_ICON_IDS = [
  "stone",
  "coal",
  "quartz-crystal",
  ...GEODE_ITEMS.map((i) => i.id),
  ...GEM_ITEMS.map((i) => i.id),
  "copper-ore",
  "iron-ore",
  "gold-ore",
  "copper-bar",
  "iron-bar",
  "gold-bar",
  "hearthsilver-bar",
];
const METAL: Record<string, string> = {
  "copper-ore": "#c8743c",
  "iron-ore": "#9aa4b4",
  "gold-ore": "#e8c040",
  "hearthsilver-ore": "#d8d0c8",
};

function paintFruitTrees(scene: Phaser.Scene): void {
  const draw = (key: string, paint: (c: Ctx) => void) => {
    const t = scene.textures.createCanvas(key, SIZE, SIZE)!;
    paint(t.getContext());
    t.refresh();
  };
  // Stages: sapling stick, taller sapling, young tree, then the mature crown.
  draw(fruitTreeKey(0), (c) => {
    groundShadow(c, 8, 14, 6);
    px(c, "#5a3e22", 8, 10, 1, 4);
    px(c, "#3a8a3a", 7, 9, 3, 2);
    px(c, "#7ac05a", 7, 9, 2, 1);
    px(c, "#b0e08e", 7, 9);
  });
  draw(fruitTreeKey(1), (c) => {
    groundShadow(c, 8, 14, 6);
    px(c, "#5a3e22", 8, 8, 1, 6);
    px(c, "#2d7036", 5, 7, 3, 3);
    px(c, "#2d7036", 9, 5, 3, 3);
    px(c, "#7ac05a", 6, 7, 2, 2);
    px(c, "#7ac05a", 9, 6, 2, 2);
    px(c, "#b0e08e", 6, 7);
    px(c, "#b0e08e", 9, 6);
  });
  draw(fruitTreeKey(2), (c) => {
    groundShadow(c, 8, 14, 8);
    trunk(c, 8, 8, 1, 6);
    canopy(
      c,
      [
        [8, 6, 3],
        [6, 7, 2],
        [10, 7, 2],
      ],
      FRUIT_TREE_TONES,
    );
  });
  draw(fruitTreeKey(3), (c) => {
    groundShadow(c, 8, 15, 10);
    trunk(c, 7, 9, 2, 6);
    canopy(
      c,
      [
        [8, 5, 4],
        [5, 8, 3],
        [11, 8, 3],
      ],
      FRUIT_TREE_TONES,
    );
  });
  draw(fruitTreeKey(4), (c) => {
    groundShadow(c, 8, 15, 14);
    trunk(c, 7, 10, 3, 5);
    canopy(
      c,
      [
        [8, 5, 5],
        [4, 8, 4],
        [12, 8, 3],
        [8, 9, 4],
      ],
      FRUIT_TREE_TONES,
    );
    px(c, "#2d7036", 10, 9, 2, 1);
    px(c, "#2d7036", 5, 11, 2, 1);
    px(c, "#6cc26c", 7, 8, 2, 1);
    px(c, "#b0e08e", 3, 6);
    for (const [x, y] of [
      [5, 3],
      [10, 3],
      [2, 8],
      [7, 7],
      [11, 7],
      [5, 10],
      [9, 11],
    ] as const) {
      px(c, "#7ad07a", x, y, 2, 1);
      px(c, "#2d7036", x + 1, y + 1, 2, 1);
    }
  });
  for (const t of FRUIT_TREES) {
    draw(fruitOnTreeKey(t.id), (c) => {
      for (const [x, y] of [
        [5, 6],
        [10, 5],
        [8, 9],
        [11, 9],
      ] as const) {
        px(c, "#00000055", x, y + 1, 3, 2);
        px(c, fruitColour(t.id), x, y, 2, 2);
        px(c, "#ffffffaa", x, y);
        px(c, "#00000040", x + 1, y + 1);
      }
    });
    draw(`icon-${t.id}`, (c) => {
      groundShadow(c, 8, 14, 8);
      disc(c, "#00000066", 8, 9, 5);
      disc(c, fruitColour(t.id), 8, 9, 4);
      disc(c, "#00000030", 9, 10, 3);
      disc(c, fruitColour(t.id), 7, 8, 3);
      px(c, "#ffffffaa", 6, 7, 2, 1);
      px(c, "#ffffff66", 6, 8);
      px(c, "#5a3e22", 8, 3, 1, 3);
      px(c, "#2d7036", 9, 3, 3, 2);
      px(c, "#7ac05a", 9, 3, 2, 1);
    });
    draw(saplingIconKey(t.id), (c) => {
      px(c, "#4a3218", 4, 12, 8, 3);
      px(c, "#6b4e2d", 5, 12, 6, 2);
      px(c, "#8a6a40", 5, 12, 3, 1);
      px(c, "#5a3e22", 8, 6, 1, 6);
      px(c, "#2d7036", 9, 5, 3, 3);
      px(c, "#7ac05a", 9, 5, 3, 2);
      px(c, "#b0e08e", 9, 5);
      px(c, "#00000055", 6, 5, 3, 2);
      px(c, fruitColour(t.id), 6, 4, 2, 2);
      px(c, "#ffffffaa", 6, 4);
    });
  }
}

export const furnitureKey = (id: string) => `furniture-${id}`;
export const chestKey = (id: string) => `chest-${id}`;
export const lightKey = (id: string) => `light-${id}`;
/** A farm decoration, drawn per covered tile (note 89). */
export const farmDecorKey = (id: string) => `farmdecor-${id}`;
/** The shellfish pot standing in the water, and the mark on one that holds a catch. */
export const POT_KEY = "shellfish-pot";
export const POT_READY_KEY = "shellfish-pot-ready";

/** The garden pot standing on the ground (note 97). Placeholder art. */
export const GARDEN_POT_KEY = "garden-pot-placed";

/** A terracotta pot with soil in it. Placeholder art. */
function paintGardenPot(scene: Phaser.Scene): void {
  const t = scene.textures.createCanvas(GARDEN_POT_KEY, SIZE, SIZE)!;
  const c = t.getContext();
  px(c, "#3a2a1a", 3, 9, 10, 2);
  px(c, "#b8602c", 4, 10, 8, 5);
  px(c, "#d8803c", 4, 10, 8, 1);
  px(c, "#8a4420", 5, 14, 6, 1);
  px(c, "#5a3a20", 4, 9, 8, 1);
  t.refresh();
}

/** A wicker pot with a float. Placeholder art. */
function paintPot(scene: Phaser.Scene): void {
  const t = scene.textures.createCanvas(POT_KEY, SIZE, SIZE)!;
  const c = t.getContext();
  // ripples where the pot meets the water
  px(c, "#8fc4f0aa", 2, 13, 12, 1);
  px(c, "#3b80c4", 3, 14, 10, 1);
  px(c, "#4a3218", 3, 5, 10, 9);
  px(c, "#9a7a3c", 4, 6, 8, 7);
  px(c, "#c09a52", 4, 6, 8, 1);
  for (let y = 7; y < 13; y += 2)
    for (let x = 4 + ((y >> 1) % 2); x < 12; x += 2) px(c, "#7a5c2a", x, y);
  px(c, "#6a4e22", 4, 9, 8, 1);
  px(c, "#6a4e22", 10, 6, 2, 7);
  px(c, "#c09a52", 4, 7, 1, 5);
  px(c, "#2a1a0a", 5, 6, 6, 1);
  px(c, "#6a4e22", 8, 3, 1, 3);
  px(c, "#7a2418", 6, 1, 4, 4);
  px(c, "#d8503c", 7, 1, 2, 3);
  px(c, "#f4f0e0", 7, 3, 2, 1);
  px(c, "#ff9a84", 7, 1);
  t.refresh();
  const r = scene.textures.createCanvas(POT_READY_KEY, SIZE, SIZE)!;
  const rc = r.getContext();
  px(rc, "#8a6a10", 10, 0, 6, 6);
  px(rc, "#ffe070", 11, 1, 4, 4);
  px(rc, "#fff6c0", 11, 1, 2, 1);
  r.refresh();
}

/** Furniture: a plain shape per piece, in the piece's colour. Placeholders. */
function paintFurniture(scene: Phaser.Scene): void {
  for (const f of FURNITURE) {
    const t = scene.textures.createCanvas(furnitureKey(f.id), SIZE, SIZE)!;
    const c = t.getContext();
    if (f.rug) {
      px(c, f.color, 1, 3, 14, 10);
      px(c, "#00000033", 1, 3, 14, 10);
      px(c, f.color, 2, 4, 12, 8);
      px(c, "#ffffff55", 3, 5, 10, 6);
      px(c, f.color, 4, 6, 8, 4);
      px(c, "#ffffff33", 6, 7, 4, 2);
      // a fringe at each end
      for (let x = 2; x < 14; x += 2) {
        px(c, "#f4ecd0", x, 2);
        px(c, "#f4ecd0", x, 13);
      }
    } else {
      groundShadow(c, 8, 15, 12);
      px(c, "#2a1e16", 2, 4, 12, 11);
      px(c, f.color, 3, 5, 10, 9);
      px(c, "#ffffff55", 3, 5, 10, 1);
      px(c, "#ffffff33", 4, 6, 8, 2);
      px(c, "#ffffff33", 3, 6, 1, 6);
      px(c, "#00000033", 12, 6, 1, 6);
      px(c, "#00000044", 3, 12, 10, 2);
      px(c, "#00000033", 4, 9, 8, 1);
      // legs
      px(c, "#2a1e16", 3, 14, 2, 1);
      px(c, "#2a1e16", 11, 14, 2, 1);
    }
    t.refresh();
  }
}

/** Wallpaper and flooring icons: a swatch in the covering's colour. Placeholders. */
function paintDecor(scene: Phaser.Scene): void {
  for (const d of DECOR) {
    const t = scene.textures.createCanvas(`decor-${d.id}`, SIZE, SIZE)!;
    const c = t.getContext();
    px(c, "#00000055", 1, 1, 14, 14);
    px(c, d.color, 2, 2, 12, 12);
    if (d.kind === "floor") {
      // staggered boards, each with a lit top edge
      for (const y of [2, 6, 10]) {
        px(c, "#ffffff33", 2, y, 12, 1);
        px(c, "#00000033", 2, y + 3, 12, 1);
      }
      px(c, "#00000033", 7, 2, 1, 4);
      px(c, "#00000033", 4, 6, 1, 4);
      px(c, "#00000033", 10, 6, 1, 4);
      px(c, "#00000033", 8, 10, 1, 4);
    } else {
      // stripes and a small motif, lit from the top
      for (const x of [4, 8, 12]) px(c, "#ffffff33", x, 2, 1, 12);
      for (const [x, y] of [
        [6, 5],
        [10, 9],
        [6, 12],
      ] as const) {
        px(c, "#ffffff55", x, y);
        px(c, "#00000033", x, y + 1);
      }
      px(c, "#00000044", 2, 12, 12, 2);
    }
    t.refresh();
  }
}

/** Chests: a lidded box, wood or stone, a little wider when big. Placeholders. */
function paintChests(scene: Phaser.Scene): void {
  for (const ch of CHESTS) {
    const t = scene.textures.createCanvas(chestKey(ch.id), SIZE, SIZE)!;
    const c = t.getContext();
    const stone = ch.id.includes("stone");
    const big = ch.id.startsWith("big");
    const body = stone ? "#8a8a90" : "#8a5a2a";
    const lid = stone ? "#b4b4ba" : "#b4803c";
    const x = big ? 1 : 2;
    const w = big ? 14 : 12;
    const rim = stone ? "#3a3a42" : "#3a220e";
    const band = stone ? "#5a5a62" : "#6a6a72";
    groundShadow(c, 8, 15, w + 2);
    px(c, rim, x - 1, 3, w + 2, 12);
    px(c, body, x, 7, w, 7);
    px(c, lid, x, 4, w, 4);
    // the lid's lit top and shaded seam
    px(c, "#ffffff55", x, 4, w, 1);
    px(c, "#00000044", x, 7, w, 1);
    px(c, "#00000033", x, 12, w, 2);
    if (stone) {
      px(c, "#00000033", x + 3, 9, 1, 3);
      px(c, "#00000033", x + w - 4, 8, 1, 3);
    } else {
      px(c, "#00000026", x, 10, w, 1);
      px(c, "#ffffff22", x, 8, w, 1);
    }
    // corner bands and a latch
    px(c, band, x, 4, 1, 10);
    px(c, band, x + w - 1, 4, 1, 10);
    px(c, "#2a2a30", 7, 6, 2, 4);
    px(c, "#e8c050", 7, 7, 2, 2);
    px(c, "#fff0a0", 7, 7);
    t.refresh();
  }
}

/** Farm decorations: one plain block per piece, in its colour. Placeholders (art waits for M3d). */
function paintFarmDecor(scene: Phaser.Scene): void {
  const colours: Record<string, [string, string]> = {
    "ornamental-hay-bale": ["#d8b84a", "#b8942e"],
    doghouse: ["#a8703a", "#6a4220"],
    "dark-doghouse": ["#5a4a3a", "#2e2418"],
    "cat-tree": ["#c8a878", "#8a6a44"],
    "dark-cat-tree": ["#6a5a6a", "#3a2e3a"],
    "bird-house": ["#9a7a4a", "#c8503c"],
    "keepsake-lantern": ["#f0c860", "#8a5a2a"],
  };
  for (const id of farmDecorIds()) {
    const [body, trim] = colours[id] ?? ["#a08060", "#604830"];
    const t = scene.textures.createCanvas(farmDecorKey(id), SIZE, SIZE)!;
    const c = t.getContext();
    groundShadow(c, 8, 15, 14);
    px(c, "#2a1e16", 0, 2, 16, 13);
    px(c, body, 1, 3, 14, 11);
    px(c, trim, 1, 3, 14, 2);
    px(c, "#ffffff44", 1, 3, 14, 1);
    px(c, "#ffffff33", 3, 6, 10, 2);
    px(c, "#ffffff22", 1, 5, 1, 9);
    px(c, "#00000033", 14, 5, 1, 9);
    px(c, "#00000033", 1, 12, 14, 2);
    t.refresh();
  }
}

/** The texture key of a ring, a pair of boots or a Forge good. */
export const forgeKey = (id: string) => `icon-forge-${id}`;
const FORGE_GOODS = [LIFE_ELIXIR, MINERS_TREAT, OIL_OF_GARLIC];

/**
 * Rings, boots and the Forge's small goods (note 89, note 95, #877): flat placeholder
 * pictures. A ring's stone is coloured by what it does; a combined ring shows both
 * stones. Art waits for M3d.
 */
function paintForgeGoods(scene: Phaser.Scene): void {
  const draw = (id: string, paint: (c: Ctx) => void) => {
    const t = scene.textures.createCanvas(forgeKey(id), SIZE, SIZE)!;
    paint(t.getContext());
    t.refresh();
  };
  const stone = (id: string): string => {
    const r = ringById(id);
    if (!r) return "#c8c8d0";
    if (r.light) return "#ffe14a";
    if (r.magnet) return "#d8503c";
    if (r.slimeProof) return "#5ac86a";
    if (r.immunity) return "#8a6ad8";
    return "#7ab0e8";
  };
  const band = (c: Ctx) => {
    px(c, "#00000044", 4, 14, 8, 1);
    px(c, "#d8b84a", 4, 7, 8, 6);
    px(c, "#00000000", 6, 9, 4, 2);
    px(c, "#2a2a30", 6, 9, 4, 2);
  };
  for (const r of RINGS)
    draw(r.id, (c) => {
      band(c);
      px(c, stone(r.id), 6, 4, 4, 3);
      px(c, "#ffffff88", 7, 4, 1, 1);
    });
  for (const a of RINGS)
    for (const b of RINGS) {
      if (a.id >= b.id) continue;
      draw(comboId(a.id, b.id), (c) => {
        band(c);
        px(c, stone(a.id), 4, 4, 4, 3);
        px(c, stone(b.id), 8, 4, 4, 3);
      });
    }
  for (const b of BOOTS)
    draw(b.id, (c) => {
      const tone = b.defense >= 3 ? "#6a6a74" : "#8a5a2a";
      px(c, "#00000044", 3, 14, 10, 1);
      px(c, tone, 5, 3, 4, 8);
      px(c, tone, 5, 9, 8, 4);
      px(c, "#ffffff44", 5, 3, 1, 8);
      px(c, "#2a2a30", 5, 13, 8, 1);
    });
  draw(LIFE_ELIXIR, (c) => {
    px(c, "#00000044", 4, 14, 8, 1);
    px(c, "#c8d8e0", 6, 2, 4, 3);
    px(c, "#d84a5a", 4, 6, 8, 8);
    px(c, "#ff9aa4", 5, 7, 2, 4);
  });
  draw(MINERS_TREAT, (c) => {
    px(c, "#00000044", 3, 14, 10, 1);
    px(c, "#a8743c", 3, 6, 10, 8);
    px(c, "#d8a860", 3, 6, 10, 2);
    px(c, "#5a3a1e", 5, 9, 2, 2);
    px(c, "#5a3a1e", 9, 11, 2, 2);
  });
  draw(OIL_OF_GARLIC, (c) => {
    px(c, "#00000044", 4, 14, 8, 1);
    px(c, "#7a5a2a", 6, 2, 4, 3);
    px(c, "#e8d878", 4, 5, 8, 9);
    px(c, "#f4ecb0", 5, 6, 2, 5);
  });
}

/** Torch, campfire and the two braziers. Placeholders: the glow itself is drawn by the scene. */
function paintLights(scene: Phaser.Scene): void {
  const draw = (id: string, paint: (c: Ctx) => void) => {
    const t = scene.textures.createCanvas(lightKey(id), SIZE, SIZE)!;
    paint(t.getContext());
    t.refresh();
  };
  const flame = (c: Ctx, x: number, y: number) => {
    px(c, "#a8301a", x, y + 2, 3, 2);
    px(c, "#e8641e", x, y + 1, 3, 2);
    px(c, "#e8641e", x + 1, y - 1, 1, 1);
    px(c, "#ffd24a", x + 1, y, 1, 3);
    px(c, "#fff6c8", x + 1, y + 2);
  };
  draw("torch", (c) => {
    groundShadow(c, 8, 15, 6);
    px(c, "#3a2412", 6, 6, 4, 9);
    px(c, "#6a4a26", 7, 6, 2, 8);
    px(c, "#8a6234", 7, 6, 1, 8);
    px(c, "#5a5a62", 6, 5, 4, 2);
    flame(c, 7, 2);
  });
  draw("campfire", (c) => {
    groundShadow(c, 8, 15, 14);
    // a ring of stones, each lit on top
    for (const x of [2, 5, 8, 11]) {
      px(c, "#4a4a52", x, 11, 3, 3);
      px(c, "#8a8a90", x, 11, 2, 2);
      px(c, "#b4b4ba", x, 11);
    }
    px(c, "#3e2a16", 3, 9, 10, 2);
    px(c, "#7a5832", 3, 9, 10, 1);
    px(c, "#3e2a16", 5, 8, 6, 1);
    flame(c, 7, 5);
    flame(c, 5, 7);
    flame(c, 9, 6);
  });
  // Bombs: a dark ball, bigger with the blast, and a fuse spark (note 89).
  for (const [id, size] of [
    ["cherry-bomb", 4],
    ["bomb", 5],
    ["mega-bomb", 6],
  ] as const)
    draw(id, (c) => {
      const o = 8 - size;
      px(c, "#00000033", o, 14, size * 2, 1);
      px(c, "#2a2a30", o, 14 - size * 2, size * 2, size * 2);
      px(c, "#4a4a54", o + 1, 14 - size * 2 + 1, 2, 2);
      px(c, "#c8a060", 8, 14 - size * 2 - 2, 1, 2);
      px(c, "#ffd24a", 8, 14 - size * 2 - 3, 2, 1);
    });
  draw("lightning-rod", (c) => {
    px(c, "#00000033", 5, 14, 6, 1);
    px(c, "#7a7a84", 7, 4, 2, 10);
    px(c, "#b4b4ba", 6, 12, 4, 2);
    px(c, "#ffe14a", 7, 1, 2, 3);
  });
  for (const iron of [false, true])
    draw(iron ? "iron-lamp-post" : "wood-lamp-post", (c) => {
      px(c, "#00000033", 5, 14, 6, 1);
      px(c, iron ? "#5a5a66" : "#6a4a26", 7, 5, 2, 9);
      px(c, iron ? "#7a7a86" : "#8a5a2a", 5, 12, 6, 2);
      px(c, iron ? "#7a7a86" : "#8a5a2a", 5, 3, 6, 2);
      px(c, "#ffe9a0", 6, 0, 4, 3);
      px(c, "#fffbe0", 7, 1, 2, 1);
      px(c, iron ? "#3a3a44" : "#3e2a16", 8, 5, 1, 9);
      px(c, "#ffffff33", 5, 12, 6, 1);
    });
  for (const stone of [false, true])
    draw(stone ? "stone-brazier" : "wood-brazier", (c) => {
      groundShadow(c, 8, 15, 10);
      px(c, stone ? "#3a3a42" : "#3a220e", 2, 7, 12, 8);
      px(c, stone ? "#8a8a90" : "#8a5a2a", 4, 9, 8, 5);
      px(c, "#ffffff33", 4, 10, 1, 4);
      px(c, "#00000044", 11, 10, 1, 4);
      px(c, stone ? "#b4b4ba" : "#b4803c", 3, 8, 10, 2);
      px(c, "#ffffff44", 3, 8, 10, 1);
      px(c, "#1c1c20", 4, 9, 8, 1);
      flame(c, 7, 4);
      flame(c, 5, 6);
      flame(c, 9, 6);
    });
}

function paintMineArt(scene: Phaser.Scene): void {
  const draw = (key: string, paint: (c: Ctx) => void) => {
    const t = scene.textures.createCanvas(key, SIZE, SIZE)!;
    paint(t.getContext());
    t.refresh();
  };
  // A rounded boulder: dark rim, shaded underside, lit top-left facets and a crack.
  const ROCK_ROWS: readonly (readonly [number, number, number])[] = [
    [4, 5, 10],
    [5, 4, 11],
    [6, 3, 12],
    [7, 2, 13],
    [8, 2, 13],
    [9, 2, 13],
    [10, 2, 13],
    [11, 2, 13],
    [12, 3, 12],
    [13, 4, 11],
  ];
  const lump = (c: Ctx, base: string, dark: string, light: string) => {
    groundShadow(c, 8, 15, 12);
    for (const [y, a, b] of ROCK_ROWS) px(c, "#1e1c22", a - 1, y, b - a + 3, 1);
    px(c, "#1e1c22", 5, 3, 6, 1);
    for (const [y, a, b] of ROCK_ROWS) px(c, dark, a, y, b - a + 1, 1);
    for (const [y, a, b] of ROCK_ROWS.slice(0, 7)) px(c, base, a, y, b - a, 1);
    px(c, light, 5, 4, 4, 1);
    px(c, light, 4, 5, 3, 1);
    px(c, light, 3, 6, 2, 2);
    px(c, "#ffffff55", 5, 4, 2, 1);
    px(c, dark, 9, 5, 1, 2);
    px(c, dark, 10, 7, 1, 2);
    px(c, light, 8, 5, 1, 2);
  };
  const specks = (c: Ctx, colour: string) => {
    for (const [x, y, w, h] of [
      [5, 8, 2, 2],
      [9, 7, 2, 2],
      [8, 10, 2, 1],
    ] as const) {
      px(c, "#00000055", x, y + 1, w + 1, h);
      px(c, colour, x, y, w, h);
      px(c, "#ffffff77", x, y);
    }
  };
  draw(ROCK_KEYS.stone, (c) => lump(c, "#8a8a90", "#5a5a62", "#b4b4ba"));
  draw(ROCK_KEYS.hard, (c) => {
    lump(c, "#6e6e76", "#3e3e46", "#9a9aa2");
    specks(c, "#2e2e36");
  });
  draw(ROCK_KEYS.copper, (c) => {
    lump(c, "#8a8a90", "#5a5a62", "#b4b4ba");
    specks(c, "#d8803c");
  });
  draw(ROCK_KEYS.iron, (c) => {
    lump(c, "#7a8494", "#4a5262", "#a8b4c4");
    specks(c, "#c8d0dc");
  });
  draw(ROCK_KEYS.gold, (c) => {
    lump(c, "#8a7a5a", "#5a4a30", "#b4a07a");
    specks(c, "#f0c838");
  });
  draw(ROCK_KEYS.hearthsilver, (c) => {
    lump(c, "#6a5a58", "#3a2e2e", "#9a8a88");
    specks(c, "#f4efe8");
  });
  draw(ROCK_KEYS.coal, (c) => {
    lump(c, "#4a4a52", "#2a2a30", "#6a6a74");
    specks(c, "#16161a");
  });
  const crystal = (c: Ctx) => {
    groundShadow(c, 8, 15, 12);
    px(c, "#2a2a30", 2, 11, 12, 4);
    px(c, "#5a5a62", 3, 12, 10, 2);
    px(c, "#8a8a90", 3, 12, 4, 1);
    px(c, "#3a5a62", 4, 2, 5, 11);
    px(c, "#3a5a62", 5, 1, 3, 1);
    px(c, "#3a5a62", 7, 5, 5, 8);
    px(c, "#dff2f4", 5, 3, 3, 9);
    px(c, "#dff2f4", 6, 2);
    px(c, "#b4dde2", 8, 6, 3, 6);
    px(c, "#8ac0c8", 10, 7, 1, 5);
    px(c, "#8ac0c8", 7, 4, 1, 8);
    px(c, "#ffffff", 5, 4, 1, 4);
    px(c, "#ffffff", 8, 7);
  };
  draw(ROCK_KEYS.quartz, crystal);
  const geode = (c: Ctx) => {
    lump(c, "#7a6a5a", "#4a3e32", "#a8987a");
    px(c, "#3a2a4a", 5, 7, 6, 4);
    px(c, "#c8a0e0", 6, 7, 4, 3);
    px(c, "#8a60b0", 8, 9, 2, 1);
    px(c, "#e8d0f4", 6, 7, 2, 1);
  };
  draw(ROCK_KEYS.geode, geode);
  draw(ROCK_KEYS.gem, (c) => {
    lump(c, "#7a7a86", "#4a4a56", "#a8a8b4");
    px(c, "#1e3a44", 5, 7, 6, 4);
    px(c, "#7ad8e8", 6, 7, 4, 3);
    px(c, "#3a98b0", 8, 9, 2, 1);
    px(c, "#ffffff", 6, 7, 1, 1);
  });
  // A marked artifact spot: a patch of turned earth with a pale cross.
  draw(SPOT_KEY, (c) => {
    px(c, "#4a3218", 3, 8, 10, 5);
    px(c, "#6a4a2e", 4, 8, 8, 4);
    px(c, "#8a6a46", 5, 7, 6, 1);
    px(c, "#8a6a46", 4, 8, 2, 1);
    px(c, "#e8d8a8", 7, 8, 2, 3);
    px(c, "#e8d8a8", 6, 9, 4, 1);
    // little worms of soil wiggling up
    px(c, "#3a2412", 10, 6, 1, 2);
    px(c, "#3a2412", 5, 5, 1, 2);
    px(c, "#3a2412", 4, 7);
  });
  for (const a of ARTIFACTS.filter(
    (a) => !GEODE_ITEMS.some((g) => g.id === a.id),
  ))
    draw(`icon-${a.id}`, (c) => {
      const h = [...a.id].reduce((n, ch) => n + ch.charCodeAt(0), 0);
      const colour = `hsl(${(h * 37) % 360} 35% 55%)`;
      px(c, "#00000044", 4, 13, 8, 1);
      px(c, colour, 4, 6, 8, 6);
      px(c, colour, 6, 4, 4, 2);
      px(c, "#ffffff66", 5, 7, 2, 2);
    });
  // A cut gem: a dark rim, a table facet, a shaded lower half and a glint.
  const gem = (c: Ctx, colour: string, light: string) => {
    groundShadow(c, 8, 14, 8);
    px(c, "#1e1c22", 3, 6, 10, 6);
    px(c, "#1e1c22", 4, 3, 8, 3);
    px(c, "#1e1c22", 5, 12, 6, 1);
    px(c, colour, 4, 6, 8, 5);
    px(c, colour, 5, 4, 6, 3);
    px(c, colour, 6, 11, 4, 1);
    px(c, light, 5, 4, 6, 1);
    px(c, light, 6, 5, 2, 2);
    px(c, "#00000033", 4, 9, 8, 2);
    px(c, "#00000044", 9, 6, 3, 3);
    px(c, "#00000033", 6, 11, 4, 1);
    px(c, "#ffffff", 6, 5);
  };
  draw(LADDER_KEY, (c) => {
    // a dark shaft, deepest at the bottom, with a lit rim
    px(c, "#5a4a3a", 1, 1, 14, 14);
    px(c, "#2a1e12", 2, 2, 12, 12);
    px(c, "#140e08", 3, 6, 10, 8);
    px(c, "#7a6650", 1, 1, 14, 1);
    px(c, "#3a2e22", 1, 14, 14, 1);
    px(c, "#3a2418", 4, 1, 2, 14);
    px(c, "#3a2418", 10, 1, 2, 14);
    px(c, "#a0743c", 4, 1, 1, 14);
    px(c, "#a0743c", 10, 1, 1, 14);
    for (const y of [3, 6, 9, 12]) {
      px(c, "#5a3e22", 4, y + 1, 8, 1);
      px(c, "#c8964c", 4, y, 8, 1);
      px(c, "#e0b070", 5, y, 2, 1);
    }
  });
  for (const id of MINE_ICON_IDS)
    draw(`icon-${id}`, (c) => {
      if (id === "stone") lump(c, "#8a8a90", "#5a5a62", "#b4b4ba");
      else if (id === "quartz-crystal") crystal(c);
      else if (GEODE_KINDS.includes(id)) geode(c);
      else if (id === "dwarf-cup") {
        px(c, "#00000044", 4, 13, 8, 1);
        px(c, "#a88a4a", 4, 5, 8, 3);
        px(c, "#a88a4a", 6, 8, 4, 4);
        px(c, "#7a5e2a", 5, 12, 6, 1);
        px(c, "#d8be7a", 5, 6, 2, 1);
      } else if (GEM_ITEMS.some((i) => i.id === id)) {
        const i = GEM_ITEMS.find((i) => i.id === id)!;
        gem(c, i.color, i.light);
      } else if (GEODE_ITEMS.some((i) => i.id === id)) {
        const i = GEODE_ITEMS.find((i) => i.id === id)!;
        gem(c, i.color ?? "#ffffff", i.light ?? "#ffffff");
      } else if (id === "coal") {
        lump(c, "#4a4a52", "#2a2a30", "#6a6a74");
        specks(c, "#16161a");
      } else if (id.endsWith("-ore")) {
        lump(c, "#8a8a90", "#5a5a62", "#b4b4ba");
        specks(c, METAL[id] ?? "#ffffff");
      } else {
        const colour = METAL[id.replace("-bar", "-ore")] ?? "#ffffff";
        // an ingot: a bevelled top, a shaded front and a dark rim
        groundShadow(c, 8, 14, 12);
        px(c, "#1e1c22", 2, 6, 12, 7);
        px(c, colour, 3, 7, 10, 5);
        px(c, "#ffffff55", 4, 7, 8, 2);
        px(c, "#ffffffaa", 4, 7, 5, 1);
        px(c, "#00000044", 3, 9, 10, 1);
        px(c, "#00000033", 3, 10, 10, 2);
        px(c, "#00000033", 12, 7, 1, 5);
      }
    });
}

/** The texture key for a backpack item, or undefined if it has no picture. */
export function iconKey(itemId: string): string | undefined {
  const { base } = splitQuality(itemId);
  if (fertilizerById(base)) return `icon-${base}`;
  if (base === MAHOGANY_SEED) return "icon-mahogany-seed";
  if (sprinklerById(base)) return sprinklerKey(base);
  if (machineById(base)) return machineKey(base);
  if (furnitureById(base)) return furnitureKey(base);
  if (decorById(base)) return `decor-${base}`;
  if (chestById(base)) return chestKey(base);
  if (isFarmDecor(base)) return farmDecorKey(base);
  if (isLight(base) || isBomb(base) || base === LIGHTNING_ROD)
    return lightKey(base);
  if (base === "tapper" || base === "heavy-tapper") return `icon-${base}`;
  const tailored = tailoredParts(base);
  if (tailored) return forgeKey(tailored[0]);
  if (
    ringById(base) ||
    comboParts(base) ||
    BOOTS.some((b) => b.id === base) ||
    FORGE_GOODS.includes(base)
  )
    return forgeKey(base);
  if (base === POT_ITEM) return POT_KEY;
  const sapling = treeOfSapling(base);
  if (sapling) return saplingIconKey(sapling.id);
  if (fruitTreeById(base)) return `icon-${base}`;
  if (base === "frostfin" || GOOD_LOOKS[base]) return goodKey(base);
  const category = categoryOf(base);
  if (category) return `icon-artisan-${category}`;
  if (MINE_ICON_IDS.includes(base)) return `icon-${base}`;
  if (ARTIFACTS.some((a) => a.id === base)) return `icon-${base}`;
  if (
    base === "wood" ||
    base === "hardwood" ||
    base === "sap" ||
    base === "fiber"
  )
    return `icon-${base}`;
  if (base.endsWith("-seed") || base === "pine-cone") return `icon-${base}`;
  if (ALL_CROPS.some((c) => c.id === base))
    return cropKey(base, CROP_STAGES - 1);
  if (FORAGE.some((f) => f.id === base)) return forageKey(base);
  if (FISH_LOOKS[base]) return fishKey(base);
  if (SHELL_LOOKS[base]) return shellKey(base);
  if (base === PRIZE_MELON) return MELON_KEY;
  return roeIconKey(base);
}

/** Make every texture the farm scene and the toolbar use. */
export function makeArt(
  scene: Phaser.Scene,
  tilesKey: string,
  playerKey: string,
) {
  paintTiles(scene, tilesKey);
  paintPlayer(scene, playerKey);
  paintPeople(scene);
  paintSoil(scene, false);
  paintSoil(scene, true);
  paintUiFrame(scene);
  for (const c of ALL_CROPS) {
    paintCrop(scene, c.id);
    paintSeedIcon(scene, c.id);
  }
  for (const f of FORAGE) paintForage(scene, f.id);
  paintToolIcons(scene);
  paintTrees(scene);
  paintFruitTrees(scene);
  paintMineArt(scene);
  paintAnimals(scene);
  paintCreatures(scene);
  paintFish(scene);
  paintShellGoods(scene);
  paintGoods(scene);
  paintFurniture(scene);
  paintDecor(scene);
  paintChests(scene);
  paintLights(scene);
  paintForgeGoods(scene);
  paintFarmDecor(scene);
  paintPot(scene);
  paintGardenPot(scene);
}
