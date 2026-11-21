# Priorities: later items

Not read at session start. Items for after M3b (other open items, the layout and tiles
track, leftovers). Moved out of `PRIORITIES.md` on 2026-11-21 to keep that file short.
The owner can ask for any of it; show it when the NOW list is done.

## Other open items (after M3b)

1. **Completion tracker (#196).** Built (PR #573). Left: real lines and art with the
   voice sheets, a browser look at the summit scene and layout.
2. **Story spine.** Warden head (#177), sea elf (#176) and Rosmarin (#178) settled bar
   small items. The third community project (#5) waits for ring 2 (M5). Needed before
   slice 5 (note 33).
2b. **Ancestors' shrine (note 83).** Built to shell level 2026-11-18 (core, scene, farm hook, tests). Owner to confirm the
   placeholders listed in note 83 "Built status" (tiles, candle minimum, point total, trigger, redo). Left: art,
   real lines, the Diamond's name, fishing-chest source, camp chest items (note 22).
3. **Map areas (notes 71 to 78).** All built to shell level (#636 to #646, #649, #661).
   Left items are in each note's "Built status". Build detail is in the archive.
4. **Art direction and audio plan.** Character art (note 15), hall rooms (#335),
   placeholder swap, audio (#527).
5. **Ring 2 shape and travel (#20, M5).** Parked until slice 3 is played.

## Layout and tiles track (note 81)

Rules: `docs/design/81_layout_shared_rules.md`. Art waits for M3d.

Done, owner checked (2026-11-11): step 1 farm (note 55, #776), step 2 festival spots
(note 82), step 3 heart events and spouses (note 84, #600), step 4 interior plans
(note 86), step 11 farmhouse and cabin drafts (note 85, build issues next).

- Step 5: Layout page design note (note 87), slices 1 to 5 built (#970, #971, #984 to #986). Next: your look at `/layout.html` (`npm run dev`).
- Step 6 (owner): Hands-on play of the built areas to check placeholder metrics (paths
  2 wide, doors 1, 60 s on foot and 30 s on the horse to cross).
- Step 7: Layout page built (see step 5); one pair gap listed in `KNOWN_PAIR_GAPS` (`secret-woods` exit `to_forest`).
- Step 8: M4 spike desktop part done 2026-11-18 (note 53): the 120 by 120 cap stays (host holds all 38 maps in about 69 MB). Tablet runs done 2026-11-19; left: the jam rule with people walking, battery drain.
- Step 9: Valley maps, area by area (note 71 order), after step 6.
- Step 10: Festival layouts, from step 2.
- Step 12: Mines (the combat leftovers, #598, are closed).
- Steps 13 to 16 (M3d): `above` layer and seasonal tilesets, reference images and
  style sheet, licence ADR for generated art, the art swap.
- The other interiors are built (note 86, #853 to #860) from the checked drafts (doors 1 tile, 2026-11-12), with the
  shared test `tests/interior-reach.test.ts` and the converter
  `scripts/interiors/tmj-to-map.mjs`. Left: the owner's call on the `AISLE_EXCEPTIONS` lists, game code that reads
  `gate` (friendship doors), spouse route code (note 84), the cabin (M4).

## Leftovers and housekeeping

- Slice 1 leftovers: #522 closed 2026-11-12 (art item moved to #335). Bundles: #181 (note 63; #201 closed).
- Refactor proposal #904 (FarmScene split, rules into core, shared helpers): settle in a
  short note before moving code. Repo hygiene pass done 2026-11-13 (handoff 2026-11-13).
- Art polish pass done 2026-11-12 ahead of M3d (handoff 2026-11-12q); look with
  `node scripts/playtest/artsheet.mjs`.
- Tablet follow-ups (#523; #336 closed), notes 45 and 60 open items, barn stall wing, note 54 answer
  sheet.
