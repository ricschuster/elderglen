# Interior layout drafts (note 86)

Rough block-outs for the owner to check, not the real maps. Open a `.tmj` in Tiled.
The tiles are flat colour swatches (`tiles.png`, one per fixture kind, in the order
note 86 lists). Each map has `ground` (walls, floor, rug, door), `fixtures`
(blocking pieces) and `markers` (points for the entry, the door, services and the
routes' spots). Each `.txt` is the plan, one character per tile, and each
`-preview.png` is the same plan with a 5 tile grid and the marks in yellow.

- `general-store`: the pilot, irregular, home behind the shop, 31 by 31.
- `hut-fisher`: the one-room hut template, 12 by 12.
- `inn`: the inn and kitchen, 30 by 16.
- `sawmill` (31 by 27), `healer` (22 by 23), `smithy` (21 by 26): batch 1 plans (owner checked).
- `library` (35 by 30), `hatter` (27 by 27), `forest-farmstead` (32 by 22): batch 2 plans.

`gen.py` builds the walls, the `.tmj`, the `.txt` and the preview from the room
rectangles in `plans.py`, and checks reachability (`python3 gen.py`, needs Pillow).
The first three drafts came from an earlier script that was not kept.

Every floor tile and every mark is reachable from the entry (checked when the files
were made). On Ubuntu: `sudo apt install tiled`.
