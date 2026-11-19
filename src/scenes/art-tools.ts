import type Phaser from "phaser";

/**
 * Painted 16x16 tool icons (note 103, decision 5). Each tool is a small character
 * map: `o` outline, `w` `W` `d` the wooden handle (mid, light, dark), `L` `m` `M`
 * the metal (light, mid, dark) and, on the can, `b` `B` `c` the tin body (mid, dark,
 * light). The metal takes the tier tint, so one map gives all five looks. Light
 * falls from the top left. Placeholder quality until M3d (note 99).
 */

const SIZE = 16;

/** Light, mid and dark metal for each tier, matching `TIER_NAMES` (basic to Hearthsilver). */
const METAL: readonly (readonly [string, string, string])[] = [
  ["#d8dce4", "#a4a9b3", "#6a6e76"],
  ["#f0b890", "#c8764a", "#7e3e22"],
  ["#e6f0fa", "#9cb8d4", "#58748e"],
  ["#fff0a0", "#f0c030", "#a8780c"],
  ["#e8fff4", "#7fe0c8", "#2e8a86"],
];

const WOOD: Record<string, string> = {
  o: "#2e1e0e",
  w: "#8a5c2a",
  W: "#b07a3c",
  d: "#5c3a18",
};
const TIN: Record<string, string> = {
  b: "#5a8ec0",
  B: "#3f6f9c",
  c: "#8fc4f0",
};

// Rows are listed from the top of the picture; short pictures sit on the bottom edge.
const MAPS: Record<string, string[]> = {
  hoe: [
    ".......ooooooo..",
    ".......oLLLLLmo.",
    "......owommmmMo.",
    ".....owWwoooMMo.",
    "....owWwo..oMo..",
    "...owWwo...ooo..",
    "..owWwo.........",
    ".owWwo..........",
    ".owWo...........",
    ".odo............",
    "..o.............",
  ],
  axe: [
    "........ooo.....",
    ".......oLLLoo...",
    "......oLLmmmMo..",
    "......oLmmmmMMo.",
    ".....owoLmmmMMo.",
    "....owWwoLmmMo..",
    "...owWwo.oMMMo..",
    "..owWwo...ooo...",
    ".owWwo..........",
    ".owWo...........",
    ".odo............",
    "..o.............",
  ],
  pickaxe: [
    "....oooooooo....",
    "..ooLLLLLLmmoo..",
    ".oLLmmmmmmmmMMo.",
    "oLmMoooowoooMMMo",
    "oMoo...owWo..ooo",
    ".oo....owWo.....",
    "......owWwo.....",
    "......owWwo.....",
    "......owWwo.....",
    "......owWwo.....",
    "......owWwo.....",
    "......odwo......",
    ".......oo.......",
  ],
  scythe: [
    "....oooooo......",
    "..ooLLLLLLoo....",
    ".oLLmmmmmmMMo...",
    "oLmoo...owMMo...",
    "oMo.....owWo....",
    ".o......owWo....",
    "........owWo....",
    ".........owWo...",
    ".........owWo...",
    "..........owWo..",
    "..........owWo..",
    "...........owWo.",
    "...........odwo.",
    "............oo..",
  ],
  can: [
    "....oooooo......",
    "...oMmmmmMo...oo",
    "..oMo....oMo.oMo",
    "..oMo.oooooMooMo",
    "..oMooLLLLmoMMo.",
    "..ooobccbbbbMo..",
    "...oobccbbbBBo..",
    "...oobbbbbbBBo..",
    "...oobbbbbbBBo..",
    "...oobbbbbBBBo..",
    "....ooooooooo...",
  ],
};

/** The metal tier tint for a tool tier, clamped to the table. */
function metal(tier: number): readonly [string, string, string] {
  return METAL[Math.max(0, Math.min(METAL.length - 1, Math.floor(tier)))]!;
}

function paintTool(
  c: CanvasRenderingContext2D,
  tool: string,
  tier: number,
): void {
  const rows = MAPS[tool];
  if (!rows) return;
  const [l, m, d] = metal(tier);
  const colours: Record<string, string> = {
    ...WOOD,
    ...TIN,
    L: l,
    m,
    M: d,
  };
  const top = SIZE - rows.length - (rows.length < 12 ? 1 : 0);
  rows.forEach((row, y) => {
    for (let x = 0; x < SIZE; x++) {
      // The scythe and the can face the other way (owner, 2026-11-16).
      const sx = tool === "scythe" || tool === "can" ? SIZE - 1 - x : x;
      const colour = colours[row[sx] ?? "."];
      if (!colour) continue;
      c.fillStyle = colour;
      c.fillRect(x, top + y, 1, 1);
    }
  });
}

/** The texture key for a tool at a tier; tier 0 (and any tool without tiers) is `base`. */
export function toolTierKey(base: string, tier: number): string {
  const t = Math.max(0, Math.min(METAL.length - 1, Math.floor(tier || 0)));
  return t === 0 ? base : `${base}-t${t}`;
}

/** Paint every tool at every tier. `keys` maps a tool name (hoe, can, axe, pickaxe, scythe) to its tier 0 key. */
export function paintToolIcons(
  scene: Phaser.Scene,
  keys: Record<string, string>,
): void {
  for (const [tool, base] of Object.entries(keys)) {
    const tiers = tool === "scythe" ? 1 : METAL.length;
    for (let tier = 0; tier < tiers; tier++) {
      const key = toolTierKey(base, tier);
      if (scene.textures.exists(key)) continue;
      const t = scene.textures.createCanvas(key, SIZE, SIZE)!;
      paintTool(t.getContext(), tool, tier);
      t.refresh();
    }
  }
}
