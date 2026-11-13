# Committed map files are the source; only the mines are generated

## Status

Proposed (2026-11-12). For the owner to accept or change. Builds on ADR 0005 (map
style) and note 81 ("The committed JSON is the source").

## Context

Maps are Tiled JSON in `src/content/maps/`. Twelve of them were first written by
`scripts/gen-*-map.mjs`, and each script writes straight over its committed file. Later
sessions edited the committed files by hand (doors, cart tiles, building objects, sewing
and dye tiles), and not all of those edits went back into the scripts. Regenerating
`farm.json` or `mountain.json` would now drop working features. The last handoff
estimated about 40,000 lines of difference. Some maps, such as the hatter, never had a
generator. Note 81 already says the generators are one-time drafts, but nothing
enforces it, so the risk stays.

Maps differ in how they change while the game runs, so one rule per kind is clearer
than one rule for all.

## Decision

The committed JSON is the only source for every authored map. Maps fall into four kinds.

- **Static.** Hearthwell, the forest, the mountain, the cove, the delta, the quarry, the
  Secret Woods and the interiors. The file is the whole truth. Only the seasonal tileset
  and conditional festival layers change how it looks.
- **Static base plus player state.** The farm, farm cave, barn, coop, house and
  greenhouse. The file is the starting layout and is never rewritten at runtime. Placed
  items, buildings, tilled soil and trees live in the save.
- **Variant.** Festival layers, house tiers and the hall as it is restored. These are the
  same file with conditional layers or unbuilt void space (notes 66 and 68). Which one
  shows comes from save flags, for example the derived `hallRestored`.
- **Generated.** The mine floors. They come from a daily seed (note 22) and are not
  stored. This is the only map code that stays live.

The `scripts/gen-*-map.mjs` files move to `scripts/drafts/`, each with a header saying
it is a one-time draft that overwrites hand edits and must not be run. They are kept as
a record of how the first drafts were made, not as a build step.

Validity is checked by tests, not by regeneration. `tests/mapcontract.test.ts` and the
related map tests already cover the map contract (note 05). The layout page (note 87)
becomes the tool for hand edits, with Tiled for tile detail.

Hand-built regions inside generated content, and baked mine floors, are not supported.
They wait for M5 and a real need.

## Consequences

- Positive: no one can lose hand edits by running a script. One rule per map kind,
  and a clear answer to "where do I change this?"
- Positive: the layout and tiles track (note 81, steps 7 to 10) edits the files directly,
  with no second source to keep in step.
- Negative: a map's first-draft logic is not reproducible from its script once edited.
  Changing a first draft later means editing the file, or rewriting the layout in the
  layout page.
- Negative: the multiplayer spike (M4) must confirm that farm state in the save stays
  small enough, since the farm file is never rewritten.
- Follow-up: move the scripts, add the headers, and check that no doc or npm script
  still tells anyone to run them.
