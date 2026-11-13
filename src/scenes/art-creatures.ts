import type Phaser from "phaser";

/**
 * Painted 16x16 sprites for the mine creatures. Each is a small character
 * map: `.` is clear, `o` the outline, and the other letters come from the
 * creature's own palette. Rows are bottom aligned and centred in the frame.
 */

const SIZE = 16;

type Sprite = { palette: Record<string, string>; rows: string[] };

const OUT = "#2a1f2b";

const SPRITES: Record<string, Sprite> = {
  // A rock shell on stubby legs with a small face.
  pebbleback: {
    palette: {
      b: "#8c8c94",
      l: "#b4b4bc",
      d: "#62626c",
      e: "#ffffff",
      p: "#1a1a22",
    },
    rows: [
      "....oooooo......",
      "...obllbbbo.....",
      "..oblbbbdbbo....",
      "..obbbdbbbbooo..",
      ".obdbbbbbdboeepo",
      ".obbbbbbbbbbbbo.",
      ".oddbbbbbbddoo..",
      "..oo.oo..oo.oo..",
    ],
  },
  // A dusty moth with spread wings.
  dustmoth: {
    palette: {
      b: "#d9c08a",
      l: "#f0e2b8",
      d: "#a88a54",
      e: "#c23a3a",
      a: "#7a6a4a",
    },
    rows: [
      "..oo........oo..",
      ".olloo....oollo.",
      "olblbbo..obblblo",
      "olbblbbooobblbbo",
      "obdblbbaaabblbdo",
      ".obddbbaeaebddo.",
      "..oodbbaaabdoo..",
      "....ooobbooo....",
      "......oaao......",
    ],
  },
  // A crab: shell, raised claws, stalk eyes.
  "rock-crab": {
    palette: {
      b: "#7a6a5a",
      l: "#a3917c",
      d: "#54473b",
      c: "#c4553a",
      e: "#ffffff",
      p: "#111111",
    },
    rows: [
      "..occo....occo..",
      ".occcco..occcco.",
      ".occoco..ococco.",
      "..oo.o.ee.o.oo..",
      ".....oepepeo....",
      "....obllbbbdo...",
      "...oblbbbbbbdo..",
      "..oobbdbbbdbboo.",
      "..o.oobbbbboo.o.",
      "....o.o..o.o....",
    ],
  },
  // A green beetle with moss on its back.
  mossbeetle: {
    palette: {
      b: "#5f8f4a",
      l: "#8dc46a",
      d: "#3d6232",
      h: "#3a2e24",
      e: "#ffffff",
      m: "#a6d65a",
    },
    rows: [
      "..o..o..........",
      "...o.o..........",
      "..ooooooo.......",
      ".obmlbmlbo.ooo..",
      "obbblbbbbooheeo.",
      "obdbbbbdbbohhho.",
      "obbbdbbbbbooooo.",
      ".odddddddo......",
      "..o.o.o.o.o.....",
    ],
  },
  // A green blob with big eyes.
  gloop: blob("#6fd16f", "#a8f0a0", "#3f9a45"),
  "gloop-blue": blob("#5f9fe8", "#9fcdf8", "#3868b0"),
  "gloop-red": blob("#e85a5a", "#f89a8a", "#a83030"),
  // A pale gnawing critter with big teeth.
  frostnibbler: {
    palette: {
      b: "#bfe6f5",
      l: "#eefaff",
      d: "#8ab8d0",
      e: "#1a2a40",
      t: "#ffffff",
      n: "#e89aa8",
    },
    rows: [
      "..oo..oo........",
      ".olno.olno......",
      ".olno.olno......",
      "..oooooooo......",
      ".obbllbbbbo.....",
      "obbebbbebbboo...",
      "obbbbnnbbbbdbo..",
      "obbbtotobbbbbo..",
      ".obbtttbbbddbo..",
      "..oobbbbbbbdo...",
      "....oo..oo......",
    ],
  },
  // A spiky ice frog.
  "icicle-hopper": {
    palette: {
      b: "#8fc8e8",
      l: "#d4f0ff",
      d: "#5a90b8",
      e: "#ffffff",
      p: "#14243a",
    },
    rows: [
      "...o....o.......",
      "..olo..olo......",
      "..olooooloo.....",
      ".oblbbbbblbo....",
      "oebobbbbobeo....",
      "oppbbbbbbbpo....",
      "obbbbbbbbbbbo...",
      "obdbbbbbbbdbbo..",
      ".ooddbbbbddoobo.",
      "..olo.oooo.olo..",
    ],
  },
  // A bat with wings out.
  "cave-bat": {
    palette: {
      b: "#5a4a78",
      l: "#7e6ea0",
      d: "#3a2e52",
      e: "#ff5050",
      t: "#ffffff",
    },
    rows: [
      "o..o......o..o..",
      "ob.obo..obo.bo..",
      "oblobbo..obbolbo",
      "obbllbbooobbllbo",
      "obbbdbbbbbbdbbbo",
      ".obbbdbeobebdbbo",
      "..obbbbbtobbbbo.",
      "...oobbbbbbboo..",
      ".....o.oooo.o...",
    ],
  },
  // A sneaky pocket thief with a sack.
  nabbler: {
    palette: {
      b: "#c99a52",
      l: "#e8c47e",
      d: "#8a6430",
      e: "#ffffff",
      p: "#111111",
      m: "#2a2a3a",
      s: "#8a5a2a",
      g: "#f2d050",
    },
    rows: [
      "...oo...oo......",
      "..olo...olo.....",
      "..obboooobo.....",
      ".obmmmmmmmbo....",
      ".obeemmeemoo.oo.",
      ".obpemmpemo.osso",
      "..obbbbbbbo.ogso",
      "..obllbbbdbooss.",
      "..obbbbbbddbooo.",
      "...oo.oo.oo.....",
    ],
  },
  // A small fiery pup.
  "cinder-pup": {
    palette: {
      b: "#e8703a",
      l: "#f8a85a",
      d: "#a84420",
      e: "#fff4c0",
      p: "#1a1010",
      f: "#ffd84a",
      r: "#ff4a20",
    },
    rows: [
      "..........f.....",
      ".......o.frf....",
      "..oo..olofrf....",
      ".obbo.obbbo.....",
      "obblboobbbbo....",
      "obbbbbbebbpo....",
      "obbbddbbbbbbooo.",
      ".obbbbbbbbbbbpo.",
      "..obbbbbbbbbbo..",
      "...oo.oo.oo.oo..",
    ],
  },
  // A glowing moth with a lantern belly.
  lanternmoth: {
    palette: {
      b: "#f5d76e",
      l: "#fff4b0",
      d: "#c8a03c",
      e: "#3a2a10",
      g: "#fffbe0",
      a: "#9a7a2a",
    },
    rows: [
      "..oo........oo..",
      ".olloo......olo.",
      "olllbbo....obbbo",
      "oblbbbboooobbbbo",
      "obbbbbbaeaebbbbo",
      ".obbddbaaaabddo.",
      "..oodbbogoobdo..",
      "....oooggooo....",
      "......ogggo.....",
      ".......ooo......",
    ],
  },
  // A bony old miner with a lamp and a pick.
  "old-digger": {
    palette: {
      b: "#e8e0cc",
      l: "#fffaf0",
      d: "#b0a68c",
      e: "#1a1a22",
      h: "#d8a030",
      w: "#8a5a2a",
      g: "#9a9a9a",
      y: "#fff080",
    },
    rows: [
      "....ohyho.......",
      "...ohhhhho..oo..",
      "...obbbbbo.ogo..",
      "..obeblebbo.ogo.",
      "..obbbbbbbo..wgo",
      "...obdddbo...ow.",
      "..oobbbbboo..ow.",
      ".obobllbbobo.w..",
      ".o.obbbbbo.oo...",
      "...obo.obo......",
      "..ooo..ooo......",
    ],
  },
};

function blob(b: string, l: string, d: string): Sprite {
  return {
    palette: { b, l, d, e: "#ffffff", p: "#14141c" },
    rows: [
      "....oooooo......",
      "...oblllbbo.....",
      "..oblbbbbbbo....",
      ".obbbbbbbbbbo...",
      ".obbepbbepbbo...",
      "obbbeebbeebbbo..",
      "obbbbbbbbbbbbo..",
      "obdbbbppbbbdbo..",
      ".obddbbbbbddbo..",
      "..ooodddddooo...",
    ],
  };
}

const GENERIC: Sprite = {
  palette: {
    b: "#b0a0c8",
    l: "#d8ccec",
    d: "#7a6a98",
    e: "#ffffff",
    p: "#14141c",
  },
  rows: blob("", "", "").rows,
};

/** The texture key of a creature's sprite. */
export function creatureKey(kind: string): string {
  return `creature-${kind}`;
}

function paintOne(scene: Phaser.Scene, kind: string, s: Sprite): void {
  const t = scene.textures.createCanvas(creatureKey(kind), SIZE, SIZE)!;
  const c = t.getContext();
  const width = Math.max(...s.rows.map((r) => r.length));
  const x0 = Math.floor((SIZE - width) / 2);
  const y0 = SIZE - s.rows.length - 1;
  c.fillStyle = "#00000033";
  c.fillRect(x0 + 2, SIZE - 1, Math.max(2, width - 4), 1);
  s.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === ".") continue;
      c.fillStyle = ch === "o" ? OUT : (s.palette[ch] ?? OUT);
      c.fillRect(x0 + x, y0 + y, 1, 1);
    }
  });
  t.refresh();
}

/** Paint every creature texture, plus a generic blob for unknown ids. */
export function paintCreatures(scene: Phaser.Scene): void {
  for (const [kind, s] of Object.entries(SPRITES)) paintOne(scene, kind, s);
  paintOne(scene, "generic", GENERIC);
}

/** The texture to draw for a creature kind, falling back to the generic blob. */
export function creatureTexture(scene: Phaser.Scene, kind: string): string {
  const key = creatureKey(kind);
  return scene.textures.exists(key) ? key : creatureKey("generic");
}
