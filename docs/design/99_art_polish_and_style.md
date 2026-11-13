# 99 Art polish and style sheet

Status: **building** (2026-11-13). The owner asked for an art pass over everything the
player sees, aimed at the finish of Stardew Valley, ahead of M3d. This note is the shared
style sheet for that pass and records how the art is put together. It does not change any
map layout, rule or number. All art stays original and drawn in code (ADR 0002,
`ASSET_LICENCES.md`); nothing is copied or traced from Stardew Valley or any other game.

## What the pass covers

Everything on screen: the land, water, trees, buildings outside and inside, the mines,
people, animals, creatures, crops, forage, objects, item pictures, the HUD, every menu
screen, the title screen, light and weather.

## Style rules

- **Pixel grid.** Tiles are 16 px (note 06). Art is painted at 1x and shown at a whole
  number zoom. No smoothing, no sub-pixel art, no rotated or scaled sprites (a wind up
  swell and such excepted).
- **Light** falls from the top left. Tops and left sides are lit, bottoms and right sides
  shaded. Standing things cast a short soft shadow on the ground, down and to the right.
- **Colour.** Each material has a ramp of four or five tones. Shade by shifting hue as
  well as value: shadows lean cool (toward blue and purple), lights lean warm (toward
  yellow). Saturated, warm and friendly, never grey mud. No pure black: the darkest
  outline is a deep tone of the thing itself.
- **Outline.** Figures, animals, creatures, objects and item pictures carry a one pixel
  dark outline, tinted to the thing (dark brown for skin and wood, dark green for leaves).
  Terrain has no outline.
- **Texture.** Large surfaces are broken by clusters, not noise: grass tufts, plank
  seams, shingle rows, stones. No single pixel speckle fields, no flat fills over 8 by 8.
- **Seasons.** Outdoors the land and the trees change by season: fresh green spring,
  deep green summer, gold and rust fall, snow in winter. Interiors and the mines do not.
- **Sizes.** People are 16 by 32 px with four facings and a four frame walk (note 15).
  Farm animals are up to 32 by 32. Trees are tall (up to 48 by 80) and rise from the tile
  they stand on. Buildings are drawn whole, with a roof, eaves, windows and a door, over
  the block of wall tiles the map gives them.
- **Draw order** (`src/scenes/depth.ts`). Flat things lie on the ground. Standing things
  sort by their feet, so a figure walks behind a tree and in front of the next one.
  Canopies and roofs nobody can stand in front of use the `above` depth.

## How the art is put together

- **The painted map** (`src/scenes/mapart.ts`). The map files keep their twelve
  placeholder tile ids (ADR 0014: the committed map JSON is the source). The scene no
  longer stamps one picture per id. Each visible tile layer is painted once onto a canvas
  by passes that see a cell's neighbours, the layers under it, the season and the kind of
  place. Under the sky `art-terrain.ts` paints grass, flowers, path, water, earth and
  the map trees, and `art-structures.ts` paints wall, roof, door and bin as buildings,
  stone walls and bridges. Indoors and underground `art-interiors.ts` paints every id.
  A pass can also add tall, depth sorted props and moving water.
- **Sprites** are canvas textures painted at start up, as before: `art.ts` and its
  companions. A picture taller or wider than a tile stands on its tile's bottom centre.
- **The interface** has its own pixel font and framed panels, shared by the HUD and every
  menu screen.

## Checks

`npm run check` as always. Look with `node scripts/playtest/artsheet.mjs` (sheets and
close ups) and `node scripts/playtest/artwide.mjs` (whole screens at the game's own zoom).

## Built status

Filled in by the handoff of each session that works on the pass.

## Fish pictures (decided 2026-11-13)

The game has no fish art; fish only appear as names. The owner decided to draw simple fish art
once, in code, and use it in the game (bag, catch popup, journal) and in the wiki. Rules:

- One 16 by 16 item picture per fish, painted in `src/scenes/art-fish.ts` like the other items,
  with a one pixel outline and the shared ramps above.
- A small set of body shapes (slim, round, flat, eel, shellfish, crab, ray) recoloured per fish
  from a palette row in the data, so 51 fish need a handful of painters, not 51.
- The wiki picks the pictures up through `npm run wiki:images` like other items.
- Left: the shape and colour table per fish, then the painter. Build status: not built.
