import { POT_ITEM } from "../core/pots";
import { CHESTS, chestById } from "../core/chestdefs";
import { MAHOGANY_SEED } from "../core/mahogany";
import { DECOR, decorById } from "../core/decor";
import { FURNITURE, furnitureById } from "../core/furniture";
import { fertilizerById } from "../core/fertilizer";
import { SPRINKLERS, sprinklerById } from "../core/sprinklers";
import { GEODE_ITEMS, GEODE_KINDS } from "../core/geodes";
import { categoryOf } from "../core/artisan";
import { MACHINES, machineById } from "../core/processing";
import Phaser from "phaser";
import { CROPS } from "../core/crops";
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
    for (const [x, y] of [
      [3, 4],
      [10, 9],
      [6, 13],
    ] as const) {
      px(c, "#5aa152", ox + x, y - 1);
      px(c, "#5aa152", ox + x, y);
    }
  },
  // grass with flowers
  (c, ox) => {
    px(c, "#468a40", ox, 0, SIZE, SIZE);
    speckle(c, ox, 23, ["#4f9549", "#3d7d38"], 22);
    px(c, "#f4f0e0", ox + 4, 5);
    px(c, "#f2d24a", ox + 4, 6);
    px(c, "#f4f0e0", ox + 11, 11);
    px(c, "#e98ac0", ox + 12, 3);
  },
  // path
  (c, ox) => {
    px(c, "#b59b6a", ox, 0, SIZE, SIZE);
    speckle(c, ox, 37, ["#a68c5c", "#c4aa78", "#9a8253"], 30);
    px(c, "#8f7a50", ox + 5, 6, 2, 1);
    px(c, "#8f7a50", ox + 11, 12, 2, 1);
  },
  // water
  (c, ox) => {
    px(c, "#2f6fb0", ox, 0, SIZE, SIZE);
    px(c, "#3b80c4", ox, 3, SIZE, 1);
    px(c, "#3b80c4", ox, 10, SIZE, 1);
    px(c, "#8fc4f0", ox + 2, 3, 3, 1);
    px(c, "#8fc4f0", ox + 9, 10, 4, 1);
    px(c, "#27609c", ox + 6, 7, 3, 1);
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
    px(c, "#2d6a2e", ox, 0, SIZE, SIZE);
    disc(c, "#1f4d25", ox + 8, 8, 7);
    disc(c, "#2a6b31", ox + 6, 6, 4);
    disc(c, "#3c8a40", ox + 5, 5, 2);
    px(c, "#14381a", ox + 11, 12, 2, 1);
  },
  // wall
  (c, ox) => {
    px(c, "#8d7b6a", ox, 0, SIZE, SIZE);
    for (let row = 0; row < 4; row++) {
      px(c, "#6f5f50", ox, row * 4 + 3, SIZE, 1);
      const off = row % 2 === 0 ? 4 : 0;
      px(c, "#6f5f50", ox + off + 4, row * 4, 1, 3);
      px(c, "#6f5f50", ox + off + 12, row * 4, 1, 3);
      px(c, "#9d8b7a", ox + 1, row * 4, 3, 1);
    }
  },
  // roof
  (c, ox) => {
    px(c, "#a0482e", ox, 0, SIZE, SIZE);
    for (let row = 0; row < 4; row++) {
      px(c, "#7d3622", ox, row * 4 + 3, SIZE, 1);
      for (let x = (row % 2) * 4; x < SIZE; x += 8)
        px(c, "#b85a3e", ox + x, row * 4, 3, 1);
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
  const t = scene.textures.createCanvas(key, SIZE, SIZE)!;
  const c = t.getContext();
  px(c, "#5a3a1e", 4, 1, 8, 3); // hair
  px(c, "#f0c8a0", 5, 4, 6, 4); // face
  px(c, "#5a3a1e", 4, 3, 1, 3);
  px(c, "#5a3a1e", 11, 3, 1, 3);
  px(c, "#222222", 6, 5);
  px(c, "#222222", 9, 5);
  px(c, "#3f6fb8", 4, 8, 8, 5); // shirt
  px(c, "#2f528c", 4, 12, 8, 1);
  px(c, "#f0c8a0", 3, 9, 1, 3); // arms
  px(c, "#f0c8a0", 12, 9, 1, 3);
  px(c, "#4a3a2a", 5, 13, 3, 2); // boots
  px(c, "#4a3a2a", 8, 13, 3, 2);
  t.refresh();
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
    const c = t.getContext();
    const dark = "#2d6a2e";
    if (stage === 0) {
      px(c, pal.leaf, 7, 11, 2, 2);
      px(c, dark, 7, 13);
    } else if (stage === 1) {
      px(c, dark, 8, 8, 1, 6);
      px(c, pal.leaf, 5, 8, 3, 2);
      px(c, pal.leaf, 9, 7, 3, 2);
    } else if (stage === 2) {
      px(c, dark, 8, 5, 1, 9);
      px(c, pal.leaf, 4, 5, 4, 2);
      px(c, pal.leaf, 9, 4, 4, 2);
      px(c, pal.leaf, 5, 9, 3, 2);
      px(c, pal.leaf, 9, 9, 3, 2);
    } else {
      px(c, dark, 8, 6, 1, 8);
      px(c, pal.leaf, 4, 5, 4, 2);
      px(c, pal.leaf, 9, 5, 4, 2);
      disc(c, pal.fruit, 5, 11, 2);
      disc(c, pal.fruit, 11, 10, 2);
      disc(c, pal.fruit, 8, 4, 2);
      px(c, "#ffffff55", 4, 10);
      px(c, "#ffffff55", 10, 9);
    }
    t.refresh();
  }
}

// ---- forage

const FORAGE_COLOURS: Record<string, string> = {
  daffodil: "#f6d83a",
  leek: "#c8e0a0",
  dandelion: "#f4e04a",
  horseradish: "#d8d0a8",
  grape: "#7a3a9a",
  "spice-berry": "#d03a2a",
  "sweet-pea": "#e98ac0",
  "spring-onion": "#a8d878",
  salmonberry: "#f08a3a",
  "fiddlehead-fern": "#3a9a4a",
  periwinkle: "#8a6a9a",
  "razor-clam": "#d8c8a0",
  whelk: "#c8a878",
  cockleshell: "#e8d8c0",
  "pearly-shell": "#f4e8f0",
  "spiral-shell": "#e0b8a0",
  "sea-fan": "#e86a8a",
  "pin-urchin": "#5a3a7a",
  seaweed: "#2a7a5a",
};
/** Goods of the shore, drawn as a small shell or tuft rather than a flower. */
const SHORE_FORAGE = new Set([
  "periwinkle",
  "razor-clam",
  "whelk",
  "cockleshell",
  "pearly-shell",
  "spiral-shell",
  "sea-fan",
  "pin-urchin",
  "seaweed",
]);

export const forageKey = (id: string) => `forage-${id}`;

function paintForage(scene: Phaser.Scene, id: string): void {
  const colour = FORAGE_COLOURS[id] ?? "#e58fd0";
  const t = scene.textures.createCanvas(forageKey(id), SIZE, SIZE)!;
  const c = t.getContext();
  if (id === "fiddlehead-fern") {
    px(c, colour, 8, 7, 1, 7);
    px(c, colour, 8, 5, 3, 1);
    px(c, colour, 10, 6, 1, 2);
    px(c, "#2a7a38", 6, 9, 2, 1);
  } else if (id === "leek" || id === "spring-onion") {
    px(c, "#3a8a30", 6, 5, 1, 6);
    px(c, "#3a8a30", 9, 4, 1, 7);
    px(c, colour, 6, 11, 4, 3);
    px(c, "#ffffff", 7, 13, 2, 1);
  } else if (SHORE_FORAGE.has(id)) {
    disc(c, colour, 8, 10, 3);
    px(c, "#ffffff88", 7, 8, 2, 1);
    px(c, "#00000033", 6, 12, 5, 1);
  } else if (id === "horseradish") {
    px(c, "#4a9a3a", 5, 4, 3, 5);
    px(c, "#4a9a3a", 9, 5, 3, 4);
    px(c, colour, 7, 10, 2, 4);
  } else {
    px(c, "#3a8a30", 8, 8, 1, 6);
    px(c, "#4a9a3a", 5, 11, 3, 1);
    px(c, "#4a9a3a", 9, 10, 3, 1);
    for (const [x, y] of [
      [6, 5],
      [10, 6],
      [8, 3],
      [7, 8],
    ] as const)
      disc(c, colour, x, y, 1);
    px(c, "#ffffff66", 6, 4);
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
    px(c, "#b8bcc4", 4, 2, 8, 2);
    px(c, "#8a8e96", 4, 4, 2, 1);
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
  });
  draw(TOOL_ICONS.axe, (c) => {
    px(c, "#8a5c2a", 7, 3, 2, 11);
    px(c, "#b8bcc4", 3, 2, 5, 5);
    px(c, "#8a8e96", 3, 6, 5, 1);
    px(c, "#d8dce4", 4, 3, 2, 1);
  });
  draw(TOOL_ICONS.pickaxe, (c) => {
    px(c, "#8a5c2a", 7, 4, 2, 10);
    px(c, "#b8bcc4", 2, 3, 12, 2);
    px(c, "#8a8e96", 2, 5, 2, 2);
    px(c, "#8a8e96", 12, 5, 2, 2);
    px(c, "#d8dce4", 5, 3, 3, 1);
  });
}

function paintSeedIcon(scene: Phaser.Scene, cropId: string): void {
  const pal = CROP_COLOURS[cropId] ?? FALLBACK;
  const t = scene.textures.createCanvas(`icon-${seedId(cropId)}`, SIZE, SIZE)!;
  const c = t.getContext();
  px(c, "#e8dcc0", 3, 2, 10, 12);
  px(c, "#c8bc9c", 3, 2, 10, 1);
  px(c, pal.fruit, 5, 5, 6, 4);
  px(c, pal.leaf, 6, 10, 4, 2);
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
    px(c, "#3a7a2a", 5, 9, 1, 5);
    px(c, "#4aa03a", 8, 7, 1, 7);
    px(c, "#3a7a2a", 11, 9, 1, 5);
    px(c, "#5ab84a", 4, 8, 2, 2);
    px(c, "#5ab84a", 7, 6, 3, 2);
    px(c, "#5ab84a", 10, 8, 2, 2);
    px(c, "#2a5a20", 4, 14, 8, 1);
  });
  // A twig: two crossed bits of branch, flat enough to walk over.
  draw(TWIG_KEY, (c) => {
    px(c, "#6b4e2d", 3, 10, 9, 1);
    px(c, "#8a6a40", 5, 9, 7, 1);
    px(c, "#6b4e2d", 6, 8, 1, 4);
    px(c, "#8a6a40", 10, 7, 1, 4);
    px(c, "#4a3820", 4, 12, 7, 1);
  });
  // A seed in the ground: a pale mound and a speck.
  draw(treeKey(1, false), (c) => {
    px(c, "#6b4e2d", 6, 10, 4, 2);
    px(c, "#8a6a40", 7, 9, 2, 1);
    px(c, "#c9a24a", 7, 10, 2, 1);
  });
  // Seedlings: a stem with a few leaves.
  draw(treeKey(2, false), (c) => {
    px(c, "#5a3e22", 8, 9, 1, 5);
    px(c, "#4aa04a", 6, 8, 2, 2);
    px(c, "#4aa04a", 9, 7, 2, 2);
  });
  draw(treeKey(3, false), (c) => {
    px(c, "#5a3e22", 8, 7, 1, 7);
    disc(c, "#3c8a40", 8, 6, 3);
    disc(c, "#4aa04a", 7, 5, 1);
  });
  // A young tree: a thin trunk and a small crown.
  draw(treeKey(4, false), (c) => {
    px(c, "#5a3e22", 7, 9, 2, 6);
    disc(c, "#1f4d25", 8, 6, 5);
    disc(c, "#2a6b31", 7, 5, 3);
    disc(c, "#3c8a40", 6, 4, 1);
  });
  // A mature tree: the full crown over a trunk.
  draw(treeKey(5, false), (c) => {
    px(c, "#5a3e22", 7, 10, 3, 5);
    px(c, "#3e2a16", 9, 10, 1, 5);
    disc(c, "#1f4d25", 8, 7, 7);
    disc(c, "#2a6b31", 6, 5, 4);
    disc(c, "#3c8a40", 5, 4, 2);
    px(c, "#14381a", 11, 11, 2, 1);
  });
  draw(treeKey(5, true), (c) => {
    px(c, "#5a3e22", 4, 8, 8, 6);
    px(c, "#3e2a16", 4, 13, 8, 1);
    px(c, "#c9a470", 4, 7, 8, 2);
    px(c, "#a8844f", 6, 7, 4, 1);
    px(c, "#a8844f", 7, 8, 2, 1);
  });
  // A large stump (Woodland): wide, with rings on top. Cut, it is a low stub.
  draw("stump-large", (c) => {
    px(c, "#5a3e22", 1, 6, 14, 9);
    px(c, "#3e2a16", 1, 14, 14, 1);
    px(c, "#c9a470", 1, 4, 14, 3);
    px(c, "#a8844f", 4, 5, 8, 1);
    px(c, "#a8844f", 6, 4, 4, 1);
  });
  draw("stump-cut", (c) => {
    px(c, "#5a3e22", 3, 11, 10, 4);
    px(c, "#c9a470", 3, 10, 10, 1);
  });
  draw("icon-wood", (c) => {
    px(c, "#7a4e26", 2, 5, 12, 3);
    px(c, "#9a6a3a", 2, 5, 12, 1);
    px(c, "#7a4e26", 2, 9, 12, 3);
    px(c, "#9a6a3a", 2, 9, 12, 1);
    px(c, "#d9b27a", 2, 6, 1, 2);
    px(c, "#d9b27a", 2, 10, 1, 2);
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
      } else if (m.id === "recycler") {
        px(c, "#4a6a5a", 3, 5, 10, 9);
        px(c, "#6a8a7a", 4, 3, 8, 3);
        px(c, "#2a3a32", 6, 8, 4, 4);
        px(c, "#d8d8c0", 7, 9, 2, 2);
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
  copper: "rock-copper",
  coal: "rock-coal",
  quartz: "rock-quartz",
  geode: "rock-geode",
  iron: "rock-iron",
  gold: "rock-gold",
  hearthsilver: "rock-hearthsilver",
} as const;
export const LADDER_KEY = "mine-ladder";

const MINE_ICON_IDS = [
  "stone",
  "coal",
  "quartz-crystal",
  ...GEODE_ITEMS.map((i) => i.id),
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
    px(c, "#5a3e22", 8, 10, 1, 4);
    px(c, "#7ac05a", 7, 9, 3, 2);
  });
  draw(fruitTreeKey(1), (c) => {
    px(c, "#5a3e22", 8, 8, 1, 6);
    px(c, "#7ac05a", 6, 7, 2, 2);
    px(c, "#7ac05a", 9, 6, 2, 2);
  });
  draw(fruitTreeKey(2), (c) => {
    px(c, "#5a3e22", 8, 7, 1, 7);
    disc(c, "#4a9a4a", 8, 6, 3);
  });
  draw(fruitTreeKey(3), (c) => {
    px(c, "#5a3e22", 7, 9, 2, 6);
    disc(c, "#3c8a40", 8, 6, 4);
    disc(c, "#5ab05a", 7, 5, 2);
  });
  draw(fruitTreeKey(4), (c) => {
    px(c, "#5a3e22", 7, 10, 3, 5);
    disc(c, "#2f7a38", 8, 7, 7);
    disc(c, "#4aa04a", 6, 5, 4);
    disc(c, "#6ac070", 5, 4, 2);
  });
  for (const t of FRUIT_TREES) {
    draw(fruitOnTreeKey(t.id), (c) => {
      for (const [x, y] of [
        [5, 6],
        [10, 5],
        [8, 9],
        [11, 9],
      ] as const)
        px(c, fruitColour(t.id), x, y, 2, 2);
    });
    draw(`icon-${t.id}`, (c) => {
      disc(c, fruitColour(t.id), 8, 9, 4);
      px(c, "#4a8a3a", 8, 3, 3, 2);
      px(c, "#5a3e22", 8, 4, 1, 2);
    });
    draw(saplingIconKey(t.id), (c) => {
      px(c, "#6b4e2d", 5, 12, 6, 2);
      px(c, "#5a3e22", 8, 6, 1, 6);
      px(c, fruitColour(t.id), 6, 4, 2, 2);
      px(c, "#7ac05a", 9, 5, 3, 2);
    });
  }
}

export const furnitureKey = (id: string) => `furniture-${id}`;
export const chestKey = (id: string) => `chest-${id}`;
/** The shellfish pot standing in the water, and the mark on one that holds a catch. */
export const POT_KEY = "shellfish-pot";
export const POT_READY_KEY = "shellfish-pot-ready";

/** A wicker pot with a float. Placeholder art. */
function paintPot(scene: Phaser.Scene): void {
  const t = scene.textures.createCanvas(POT_KEY, SIZE, SIZE)!;
  const c = t.getContext();
  px(c, "#00000033", 3, 13, 10, 1);
  px(c, "#9a7a3c", 4, 6, 8, 7);
  px(c, "#6a4e22", 4, 8, 8, 1);
  px(c, "#6a4e22", 4, 11, 8, 1);
  px(c, "#6a4e22", 7, 6, 1, 7);
  px(c, "#d8503c", 7, 3, 2, 3);
  t.refresh();
  const r = scene.textures.createCanvas(POT_READY_KEY, SIZE, SIZE)!;
  px(r.getContext(), "#ffe070", 11, 1, 4, 4);
  r.refresh();
}

/** Furniture: a plain shape per piece, in the piece's colour. Placeholders. */
function paintFurniture(scene: Phaser.Scene): void {
  for (const f of FURNITURE) {
    const t = scene.textures.createCanvas(furnitureKey(f.id), SIZE, SIZE)!;
    const c = t.getContext();
    if (f.rug) {
      px(c, f.color, 1, 3, 14, 10);
      px(c, "#ffffff55", 3, 5, 10, 6);
    } else {
      px(c, "#00000044", 2, 14, 12, 1);
      px(c, f.color, 3, 5, 10, 9);
      px(c, "#ffffff44", 4, 6, 8, 2);
      px(c, "#00000033", 3, 12, 10, 2);
    }
    t.refresh();
  }
}

/** Wallpaper and flooring icons: a swatch in the covering's colour. Placeholders. */
function paintDecor(scene: Phaser.Scene): void {
  for (const d of DECOR) {
    const t = scene.textures.createCanvas(`decor-${d.id}`, SIZE, SIZE)!;
    const c = t.getContext();
    px(c, d.color, 2, 2, 12, 12);
    px(c, d.kind === "floor" ? "#00000033" : "#ffffff44", 2, 8, 12, 1);
    px(c, d.kind === "floor" ? "#00000033" : "#ffffff44", 8, 2, 1, 12);
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
    px(c, "#00000044", x, 14, w, 1);
    px(c, body, x, 7, w, 7);
    px(c, lid, x, 4, w, 4);
    px(c, "#2a2a30", 7, 7, 2, 3);
    t.refresh();
  }
}

function paintMineArt(scene: Phaser.Scene): void {
  const draw = (key: string, paint: (c: Ctx) => void) => {
    const t = scene.textures.createCanvas(key, SIZE, SIZE)!;
    paint(t.getContext());
    t.refresh();
  };
  const lump = (c: Ctx, base: string, dark: string, light: string) => {
    px(c, dark, 3, 11, 10, 3);
    px(c, base, 3, 6, 10, 6);
    px(c, base, 5, 4, 6, 3);
    px(c, light, 5, 5, 3, 1);
  };
  const specks = (c: Ctx, colour: string) => {
    px(c, colour, 5, 8, 2, 2);
    px(c, colour, 9, 7, 2, 2);
    px(c, colour, 8, 10, 2, 1);
  };
  draw(ROCK_KEYS.stone, (c) => lump(c, "#8a8a90", "#5a5a62", "#b4b4ba"));
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
    px(c, "#5a5a62", 3, 12, 10, 2);
    px(c, "#dff2f4", 5, 4, 3, 8);
    px(c, "#b4dde2", 8, 6, 3, 6);
    px(c, "#ffffff", 6, 5, 1, 3);
  };
  draw(ROCK_KEYS.quartz, crystal);
  const geode = (c: Ctx) => {
    lump(c, "#7a6a5a", "#4a3e32", "#a8987a");
    px(c, "#c8a0e0", 6, 7, 4, 3);
    px(c, "#e8d0f4", 7, 8, 2, 1);
  };
  draw(ROCK_KEYS.geode, geode);
  const gem = (c: Ctx, colour: string, light: string) => {
    px(c, "#00000044", 4, 13, 8, 1);
    px(c, colour, 4, 6, 8, 6);
    px(c, colour, 5, 4, 6, 3);
    px(c, light, 6, 5, 2, 2);
  };
  draw(LADDER_KEY, (c) => {
    px(c, "#2a1e12", 2, 2, 12, 12);
    px(c, "#a0743c", 4, 1, 2, 14);
    px(c, "#a0743c", 10, 1, 2, 14);
    for (const y of [3, 6, 9, 12]) px(c, "#c8964c", 4, y, 8, 1);
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
        px(c, "#00000044", 3, 12, 10, 2);
        px(c, colour, 3, 7, 10, 5);
        px(c, "#ffffff88", 4, 8, 6, 1);
        px(c, "#00000033", 3, 11, 10, 1);
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
  if (base === POT_ITEM) return POT_KEY;
  const sapling = treeOfSapling(base);
  if (sapling) return saplingIconKey(sapling.id);
  if (fruitTreeById(base)) return `icon-${base}`;
  const category = categoryOf(base);
  if (category) return `icon-artisan-${category}`;
  if (MINE_ICON_IDS.includes(base)) return `icon-${base}`;
  if (
    base === "wood" ||
    base === "hardwood" ||
    base === "sap" ||
    base === "fiber"
  )
    return `icon-${base}`;
  if (base.endsWith("-seed")) return `icon-${base}`;
  if (CROPS.some((c) => c.id === base)) return cropKey(base, CROP_STAGES - 1);
  if (FORAGE.some((f) => f.id === base)) return forageKey(base);
  return undefined;
}

/** Make every texture the farm scene and the toolbar use. */
export function makeArt(
  scene: Phaser.Scene,
  tilesKey: string,
  playerKey: string,
) {
  paintTiles(scene, tilesKey);
  paintPlayer(scene, playerKey);
  paintSoil(scene, false);
  paintSoil(scene, true);
  paintUiFrame(scene);
  for (const c of CROPS) {
    paintCrop(scene, c.id);
    paintSeedIcon(scene, c.id);
  }
  for (const f of FORAGE) paintForage(scene, f.id);
  paintToolIcons(scene);
  paintTrees(scene);
  paintFruitTrees(scene);
  paintMineArt(scene);
  paintFurniture(scene);
  paintDecor(scene);
  paintChests(scene);
  paintPot(scene);
}
