import Phaser from "phaser";

/** Painted pixel-art farm animals and the horse, drawn in code like art.ts. */

/** The texture key for an animal: adults by species, the young share one. */
export function animalKey(species: string, grown: boolean): string {
  return grown ? `animal-${species}` : "animal-baby";
}

/**
 * A sprite as rows of palette letters ("." is clear), facing right. Letters in
 * `ramp` get a lit tone on their top and left edges and a shade tone on their
 * bottom and right edges, and the whole shape gets a 1px dark outline.
 */
type Grid = {
  rows: string[];
  palette: Record<string, string>;
  ramp?: Record<string, [lit: string, shade: string]>;
  outline?: string;
};

const OUTLINE = "#2a1d17";

/** Paint a grid with a 1px outline round it (the texture is 2px bigger). */
function paintGrid(scene: Phaser.Scene, key: string, g: Grid): void {
  const h = g.rows.length;
  const w = Math.max(...g.rows.map((r) => r.length));
  const at = (x: number, y: number) => (g.rows[y] ?? "").charAt(x) || ".";
  const t = scene.textures.createCanvas(key, w + 2, h + 2)!;
  const c = t.getContext();
  const put = (colour: string, x: number, y: number) => {
    c.fillStyle = colour;
    c.fillRect(x + 1, y + 1, 1, 1);
  };
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++) {
      const ch = at(x, y);
      if (ch === ".") {
        const edge =
          at(x - 1, y) !== "." ||
          at(x + 1, y) !== "." ||
          at(x, y - 1) !== "." ||
          at(x, y + 1) !== ".";
        if (edge) put(g.outline ?? OUTLINE, x, y);
        continue;
      }
      let colour = g.palette[ch];
      const ramp = g.ramp?.[ch];
      if (ramp) {
        if (at(x, y - 1) === "." || at(x - 1, y) === ".") colour = ramp[0];
        else if (at(x, y + 1) === "." || at(x + 1, y) === ".") colour = ramp[1];
      }
      if (colour) put(colour, x, y);
    }
  t.refresh();
}

const GRIDS: Record<string, Grid> = {
  "animal-chicken": {
    palette: {
      w: "#f2ece0",
      s: "#cfc4b0",
      g: "#a89c88",
      r: "#d9402f",
      k: "#1f1a16",
      y: "#e8a43a",
      o: "#d98a30",
    },
    ramp: { w: ["#fffdf6", "#ddd4c2"] },
    rows: [
      "........rr....",
      ".......rrww...",
      ".......wwwkyy.",
      ".......wwwwy..",
      "w......wwwr...",
      "ww....wwww....",
      "wwwwwwwwwww...",
      "wwwggggwwww...",
      ".wwwwwwgwww...",
      "..wsssssww....",
      "....ssss......",
      ".....o.o......",
      "....oo.oo.....",
    ],
  },
  "animal-duck": {
    palette: {
      g: "#2f7d4a",
      w: "#f2efe6",
      b: "#a88653",
      d: "#6e5432",
      s: "#86683f",
      k: "#1f1a16",
      o: "#f0a030",
    },
    ramp: { b: ["#c4a273", "#8f7044"], g: ["#4a9e66", "#246a3c"] },
    rows: [
      ".........gg....",
      "........gggg...",
      "........gkggoo.",
      "........ggggo..",
      ".........ww....",
      "b.......bb.....",
      "bb...bbbbbb....",
      "bbbbbbbbbbbb...",
      ".bbddddddbbb...",
      "..bbbbbbdbb....",
      "...ssssssss....",
      ".....o..o......",
      "....oo.oo......",
    ],
  },
  "animal-rabbit": {
    palette: {
      c: "#c9bfb4",
      s: "#a39686",
      p: "#e8a8a8",
      w: "#fbf8f2",
      k: "#1f1a16",
      n: "#d98080",
    },
    ramp: { c: ["#ded6cc", "#b0a497"] },
    rows: [
      ".......cc.cc..",
      ".......cp.cp..",
      ".......cp.cp..",
      ".......cc.cc..",
      "......ccccccc.",
      "......cccckcn.",
      "...ccccccccc..",
      ".ccccccccccc..",
      "wccccccccccs..",
      "wwcccccsssss..",
      "..csss...css..",
    ],
  },
  "animal-cow": {
    palette: {
      w: "#f4f2ee",
      s: "#cfc8c0",
      k: "#3a342f",
      h: "#e8dcb0",
      e: "#d8b0a8",
      p: "#e8a0a0",
      q: "#b86a6a",
      u: "#f0a8b0",
      d: "#2a2420",
    },
    ramp: { w: ["#ffffff", "#ddd8d0"] },
    rows: [
      ".............h..h..",
      "............ewwwwe.",
      "..kkkwwwwwwwwwwkww.",
      "s.kkkwwwwwkkwwwwppp",
      "swkkwwwwwwkkkwwppqp",
      "swwwwwwwwwwkwwwwpp.",
      "swwwwkkkwwwwwwww...",
      "swwwkkkkwwwwwwww...",
      "s.wwwkkwwwwwwwww...",
      "kk.ssssssssssssss..",
      "k.ww.ssuu...ssww...",
      "..ww.ss.....ssww...",
      "..dd.dd.....dddd...",
    ],
  },
  "animal-goat": {
    palette: {
      t: "#d8c8a8",
      s: "#b0a07e",
      h: "#8a7a5a",
      e: "#c0ae8a",
      b: "#ece4d2",
      n: "#a89070",
      k: "#1f1a16",
      d: "#4a4036",
    },
    ramp: { t: ["#ebdfc4", "#bfae8c"] },
    rows: [
      "..........hh....",
      "...........hh...",
      "..t.......ettt..",
      "..tt.......ttkt.",
      "..tttttttttttttn",
      ".ttttttttttttbb.",
      ".tttttttttttt.b.",
      ".tttttttttttt...",
      "..ssssssssss....",
      "..tt.ss..ss.tt..",
      "..tt.ss..ss.tt..",
      "..dd.dd..dd.dd..",
    ],
  },
  "animal-sheep": {
    palette: {
      w: "#ece8dc",
      s: "#c8c0ac",
      d: "#3e3934",
      f: "#2e2a26",
      k: "#d8d2c4",
    },
    ramp: { w: ["#fbf9f2", "#d6d0c0"] },
    rows: [
      "..ww.ww.ww......",
      ".wwwwwwwwwww.dd.",
      "wwwwwwwwwwwwddkd",
      ".wwwwwwwwwwwdddd",
      "wwwwwwwwwwwww.dd",
      ".wwwwwwwwwwww...",
      "wwwwwwwwwwwww...",
      ".ssssssssssss...",
      "..s.s.ss.s.s....",
      "..dd.ff...ff.dd.",
      "..dd.ff...ff.dd.",
    ],
  },
  "animal-pig": {
    palette: {
      p: "#eba5a3",
      s: "#cf8a88",
      e: "#d88884",
      n: "#f4b8b4",
      q: "#a85a58",
      k: "#1f1a16",
      c: "#d88884",
      d: "#6a4a46",
    },
    ramp: { p: ["#f7c2bf", "#d99694"] },
    rows: [
      "...........ee....",
      "cc.pppppppppee...",
      "c.pppppppppppkp..",
      ".cpppppppppppppnn",
      "..ppppppppppppnqn",
      "..pppppppppppppp.",
      "..pppppppppppppp.",
      "..pppppppppppp...",
      "...ssssssssss....",
      "...pp.ss..ss.pp..",
      "...dd.dd..dd.dd..",
    ],
  },
  "animal-baby": {
    palette: { y: "#f6dc5c", s: "#d9b638", k: "#1f1a16", o: "#e8963a" },
    ramp: { y: ["#fff0a0", "#e6c548"] },
    rows: [
      "..yyy...",
      ".yyyk...",
      ".yyyyoo.",
      "yyyyyy..",
      "yysyyy..",
      ".ysssy..",
      "..o.o...",
      ".oo.oo..",
    ],
  },
  // The horse: 24x14 inside the outline, so 26x16 like the old footprint.
  steed: {
    palette: {
      b: "#8a5a33",
      l: "#a87547",
      s: "#6a4426",
      m: "#4a301e",
      n: "#7a5434",
      z: "#c49a6a",
      k: "#1f1a16",
      h: "#3a302a",
      r: "#a8402c",
      q: "#d86a4a",
      u: "#3f6fa8",
      y: "#e8c050",
    },
    ramp: { b: ["#a87547", "#74492a"] },
    rows: [
      "..................b.b...",
      ".................nbbbb..",
      "................mnbbkbb.",
      "...............nmbbbbbbz",
      "......rqqr....mnbbbbbzzz",
      ".nm.lrrrrrrllnbbbb......",
      "mnmbbuuuuuubbbbbbb......",
      "nmnbbbuuuuybbbbbbb......",
      "mnmbbbbbbbybbbbbbs......",
      "n.m.ssssssyyyssss.......",
      "m.n.bb.ss.....ssbb......",
      "..m.bb.ss.....ssbb......",
      "....bb.ss.....ssbb......",
      "....hh.hh.....hhhh......",
    ],
  },
};

/** Make every farm animal texture and the horse. */
export function paintAnimals(scene: Phaser.Scene): void {
  for (const [key, grid] of Object.entries(GRIDS)) paintGrid(scene, key, grid);
}
