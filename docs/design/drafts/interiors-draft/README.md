# Interior layout drafts (note 86)

Rough block-outs for the owner to check, not the real maps. All were owner checked on
2026-11-11. Open a `.tmj` in Tiled (Ubuntu: `sudo apt install tiled`). The tiles are flat
colour swatches (`tiles.png`, one per fixture kind, in the order note 86 lists). Each map has
`ground` (walls, floor, rug, door), `fixtures` (blocking pieces) and `markers` (points for the
entry, the door, services and the routes' spots). Each `.txt` is the plan, one character per
tile, and each `-preview.png` is the same plan at 20 px a tile with a 5 tile grid and the marks
in yellow.

## Plans

- Pilot: `general-store` (31 by 31), from an earlier script that was not kept.
- Batch 1: `sawmill` (31 by 27), `healer` (22 by 23), `smithy` (21 by 26).
- Batch 2: `library` (35 by 30), `hatter` (27 by 27), `forest-farmstead` (32 by 22).
- Batch 3: `burrow-gardener` (30 by 20), `burrow-retired` (32 by 21), `burrow-young` (28 by 20).
- Batch 4: `hermit-tower` (19 by 28), `outpost` (18 by 23), `outpost-rooms` (19 by 19),
  `forge` (20 by 16), `beach-elf-house` (14 by 15), `inn` (44 by 32, redrawn with its home),
  `hut-fisher` (12 by 13) and `hut-fisher-loft` (11 by 11, up the fisher's ladder).

## The generator

`plans.py` holds one function per plan (rooms and passages as floor rectangles, fixtures, gates
and marks). `gen.py` builds the walls, writes the `.txt`, `.tmj` and preview, and checks that
every floor tile and mark is reachable from the entry with the gates open (with them shut only
the bedrooms are cut off), that no mark is on a fixture, and that each counter has player and
keeper tiles.

```text
python3 gen.py              # every plan (needs Python 3 and Pillow)
python3 gen.py inn forge    # only these
```

Keep `general-store.tmj`: `gen.py` uses it as the Tiled template, and `python3 gen.py` does
not rebuild `general-store`. Full notes, the plan calls and the character key are in note 86,
section "Tooling: the draft generator". Not an npm script and not a CI gate.
