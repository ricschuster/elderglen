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

Decided 2026-11-12: the Last Seat opens after ALL other bundles (built). #876 and #879
stay in M3b (#879 closed 2026-11-12). Guests' Board +500 friendship (built), up to five heart events a person.

Decisions and built detail for sessions 7 to 10 (2026-11-12) are in `PRIORITIES_ARCHIVE.md`.

Open, top to bottom:

1. **Owner answers left:** none. Decided 2026-11-13: garden pot is clay 1, stone 10 and a refined crystal (smelted quartz, Stardew), taught by Alder (built: smelt recipe, letter and craft recipe); Frostfin 300g, no bundle slot; Frostday cap is Icewarden's Cap (built); the hunt prize is the emberseed (built); aged roe quality closed. Algae soup is the glassy-elver's reward (note 93).
2. **#876 festivals** (note 82, 14): walk and joining built for the green, hedge and six in-place festivals; the **Night Market built 2026-11-16** (stalls, hats, crowd, pier, market fish, float, hot drink; all placeholder art and lines). Left: hall-restored Feast (waits for the hall layout), exit tiles, multiplayer counts (M4), the owner's play.
3. **Heart events** (#873, closed) and the **Secret Woods and ponds** (#878, closed) are built; real text, pond art and tuning are #950 (M3d).
4. **Save split** (note 52, built 2026-11-16, with the two-tab guard, newer-version text and stored artifact spots): left a browser check of resume, late-game size, tablet `persist()`, the debug tab and Import with the guard, paper doll.
5. **Gallery** (note 104, 95 items): left the owner's look, display case, special order, librarian lines (M3d).
6. **Built to shell level 2026-11-16, left the owner's look:** control schemes (note 27; only 1 and 9 are real, SC-188), marriage (note 12; SC-201 to 203), chests and tools (notes 34, 49, 101 to 103), sim (55 of 100 finished by day 112, no drift).
7. **#951: play M3b end to end.** A checklist plus the stage jumper (built, note 42: 38 stages, `window.farmStage(name)`, `--stage` in playtests). A browser look at everything built since the owner last played, including the Night Market, then SC-160 and SC-135 and the other open checks in play.

Alongside: the wiki (#910, note 100; built for every category, every item has a picture; text cleared for crops, fish, forage, items, places and rooms; draft text left for bundles, recipes, people and five gem names; left: owner reads the draft text and clears flags, gift lists (`giftsDraft`), people prose with the voice sheets, hosting after M3d), Stardew checks rows (open: SC-122, 135, 160, 161, 170, 172, 184 to 203). M4 hosting spike filed as #948.

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
   the shrine tiles (farm layout; #776 is closed), scene shots, camp chest items (note 22).
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
