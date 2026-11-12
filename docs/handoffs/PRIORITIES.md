# Design priority list

The single live copy. Read it at the start of each session, show the owner the open
items and the layout track, and ask which to take. Update it in the handoff pull request.

Keep this file under about 8 KB. One or two lines per item, with a pointer to the note
or issue for detail. Move finished items and built-status detail to
`PRIORITIES_ARCHIVE.md` in the same pull request. Do not keep a session log here; the
handoffs hold that. Full history to 2026-11-11 is in the archive.

## NOW: finish M3b (agreed 2026-11-12)

The exit test is "bundles 1 to 26 can be filled". Work this list top to bottom; the first
open item is the next task. Issues are in the M3b GitHub milestone. Update this list in
every handoff pull request. Do not start items from the sections below until it is done,
unless the owner says so.

Decided 2026-11-12: the Last Seat opens after ALL other bundles (not 23; fix
`rooms.json` `opensAfter`). #876 and #879 stay in M3b. Guests' Board +500 friendship, up
to five heart events a person.

Tier 1, needed to fill the bundles:

1. **#877 placement** is built (steps 1 to 7). Left: icons for bombs and Forge goods, a
   browser look at the lights, rod and bombs. Close the issue after the owner's play.
2. **#869 bundles 20, 24, 26** and the gate rule. Designed (note 63): wax from the bee
   house, candle recipe and artifact spots to number, hats choose 3 of 5 (Harvest Crown,
   Snow Cap, Holly Hat, new spring and summer hats), bread, honey cake, herb tea as
   starter recipes. Artifact spots are built (note 69), the four old things exist as items but
   bundle 26 is not in `bundles.json`. Build the rest: wax, candle, hats, dishes, the gate.
3. **#874 elderfruit**: eight sources and the eat effect (note 39). Build.
4. **#875 goods hand-in**: designed (note 65), a drop chest bound to the order. Scope is
   Spring Leeks, Barrel Batch, Pantry Stock, Crystal Gift. Build.
5. **#870 Crystalarium**: designed (note 24), Stardew's times by gem value, craftable with
   Hearthsilver. Build.
6. **#871 room rewards**: designed (note 16), free four-stop carts and a weekly herb
   stall. Build with the Guests' Board data fix and `bundleBonus()` wiring.

Tier 2, thin or placeholder content:

- **7. #872 gift tastes**: designed, approved (note 90). Build the 22 entries into `friendship.json`; confirm the `#shell` and `#monster-drop` tags exist.
- **8. #873 heart events**: scale and rewards designed (note 62: 2 and 6 hearts for all 30, fixed reward pattern). Needs #872, then the list per person, then scenes as data.
- **9. #878 Secret Woods statue and pond fish** (check the fish table first).

Tier 3, design first, one issue per system when taken:

- **10. #879 systems.** Built: artifact spots and gem nodes (note 69). Designed, not
  built: tapper, crusher, worm bin, hops and pale ale (note 92); fish pond and six water
  finds (note 93); Defense, Immunity and three bad effects (note 94); flowers (note 91);
  forge ring combining in ring 1 (note 95, gem forging and enchanting deferred to ring 2
  or 3). Tailoring is designed (note 96): sewing machine and dye pots in the Hat-maker's house.
- **11. #876 festival route layer** and seven festival maps (overlaps layout step 10).
- **12. #396 tree types by region.**

Alongside: #880 stale status lines, `docs/overview.json` (behind since 2026-11-11), a
A few Stardew checks rows (SC-122, 135, 160 to 163), and file the M4 hosting spike before M4.

## Milestone order (ADR 0012)

M3 (close out: the owner's play), M3b ring 1 systems, M4 multiplayer, M3c story and
ending, M3d polish, then M5 and M6. Map areas (notes 71 to 78) are M3b.

## Other open items (after M3b)

1. **Completion tracker (#196).** Built (PR #573). Left: real lines and art with the
   voice sheets, a browser look at the summit scene and layout.
2. **Story spine.** Warden head (#177), sea elf (#176) and Rosmarin (#178) settled bar
   small items. The third community project (#5) waits for ring 2 (M5). Needed before
   slice 5 (note 33).
2b. **Ancestors' shrine (note 83).** Left: the Diamond's name, art and drops (SC-135),
   the shrine tiles (farm layout, #776), scene shots, camp chest items (note 22).
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

- Step 5: Layout page design note. Drafted (note 87), small points decided. Next: file
  the slice 1 and 2 issues.
- Step 6 (owner): Hands-on play of the built areas to check placeholder metrics (paths
  2 wide, doors 1, 60 s on foot and 30 s on the horse to cross).
- Step 7: Build the layout page, before the valley and festival layouts.
- Step 8: Wait for the M4 spike (jam freeing, tablet map memory; may change the
  120 by 120 cap).
- Step 9: Valley maps, area by area (note 71 order), after step 6.
- Step 10: Festival layouts, from step 2.
- Step 12: Mines, after combat leftovers (#598).
- Steps 13 to 16 (M3d): `above` layer and seasonal tilesets, reference images and
  style sheet, licence ADR for generated art, the art swap.
- The other interiors are built (note 86, #853 to #860) from the checked drafts, with the
  shared test `tests/interior-reach.test.ts` and the converter
  `scripts/interiors/tmj-to-map.mjs`. Left: the hall layout (no draft, one player tile at
  each counter), the owner's call on the `AISLE_EXCEPTIONS` lists, game code that reads
  `gate` (friendship doors), spouse route code (note 84), decor zones for renovation
  rooms, the cabin (M4).

## Leftovers and housekeeping

- Slice 1 leftovers are tracked in #522 and #521. Bundles: #181, #201 (note 63).
- Tablet check (#336), notes 45 and 60 open items, barn stall wing, note 54 answer
  sheet.
