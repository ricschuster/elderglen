# Farmhouse and cabin layout draft (note 85)

A rough block-out for the owner to check, not the real map. Open
`house-draft.tmj` in Tiled. The tiles are flat colour swatches (`tiles.png`).
It holds the whole house in its final frame, 74 by 44 tiles, with one tile layer per
feature: `ground-t0`, `ground-t1`, `ground-t1-connectors`, `ground-spouse-t1`,
`ground-t2`, `ground-t2-stairs`, `ground-spouse-t2`, one per renovation, and
`ground-corner-stairs`. Each layer has a `tier` property and, where it applies, a
`when` property, so you can switch layers off in Tiled to see a tier, the spouse room
or a renovation on its own. Fixtures are on `fixtures`, and the named marks, the door
and the three stairs are points on `markers`.

The map is shifted by (20, 11) against the built `house.json` and the numbers in
note 85, which use the built frame. Add (20, 11) to a note coordinate to find it in
Tiled.

The pictures use the note's coordinates and a 10 tile grid:

- `house-draft-tier0-preview.png`, `-tier1-`, `-tier2-`: the tiers on their own.
- `house-draft-tier1-spouse-preview.png`, `-tier2-spouse-`: with the spouse room.
- `house-draft-all-renovations-preview.png`: everything on.
- `house-draft-reno-<name>-preview.png`: one per renovation, the added tiles tinted yellow.
- `house-draft-cellar-preview.png`: the built cellar, unchanged.

The walls and rooms of the first two tiers come from the built
`src/content/maps/house.json`. The wider connectors, the stairs, the spouse room, the
fixtures and the renovation rooms are new and proposed. On Ubuntu: `sudo apt install tiled`.
