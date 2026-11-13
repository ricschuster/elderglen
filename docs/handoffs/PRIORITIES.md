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

Decided 2026-11-12 (session 9): ADR 0014, committed map JSON is the source, generators moved to
`scripts/drafts/`. Elderfruit sources confirmed. Tapper crafted at Foraging 4, no shop; Heavy
Tapper is the Rare Finds bundle reward. Rings from the trainer and slayer goal; Sturdy band
crafted at Combat 1. Boots tailoring built. Regrow outside the farm 20 percent a night, stage 3.
Hat Parade join until 14:30. Hall restored is derived. Dye redo costs the six pot items.

Built 2026-11-12 (sessions 7d, 8 and 8b), all awaiting the owner's play. Bundles 1 to 26 can be
filled in code; the exit test needs the owner's play. Detail is in the notes' "Built status",
the 2026-11-12l, 2026-11-12m and 2026-11-12n handoffs and `PRIORITIES_ARCHIVE.md`.

Decided 2026-11-12 (session 10): Crabshell ring is the Rock Crab 60 reward; Bug Meat added (Sturdy
band, Icicle Hopper reward); Cordelia's 4 heart event unlocks tailoring; Heavy Tapper twice as fast
(saved page, SC-168); finds count only toward "catch N fish", algae soup is a pond reward only, aged
roe in the jar; tea bush crafted (note 97); Cake Day points 60/90/120; hunt prize Straw Boater plus a
yearly rare seed; keepsake lantern placeable. Built, awaiting play: all of these, plus hunt, cake
table, lantern floating and ice fishing rules with thin scene hooks, pond menu and placing screen.

Open, top to bottom:

1. **Owner answers left:** herb tea with tea leaves (second recipe, or a new dish, or green tea in
   the keg; bundle 24), garden pot item for tea bushes, Frostfin price and bundle use, hat for
   Frostday (`snow-cap` placeholder), crop for the rare seed packet, which fish gives algae soup
   once the species table is filled, aged roe quality rule.
2. **#873 heart events** (note 62), needs the list per person, then scenes as data.
3. **#878 Secret Woods statue and pond fish**, after note 93 (the species table is empty).
4. **Note 93 left:** the species table, pond art, a cave pool on a map.
5. **#876 left:** judging (Harvest Showing), cake table dish picker (it takes the held item now),
   scene walking villagers and marchers, even-year hedge maze and niche lines, lantern drift
   animation, on-screen ice fishing counter, multiplayer counts (M4).
6. **Decided, still to build:** cave-pool water on mine floors (no map has water), village trees
   marked `cosmetic` (needs tree objects in `hearthwell.json`, note 87), mahogany monster seed
   (needs Secret Woods creatures), #874 elderfruit sources left: spouse and gallery set.
7. A browser look at everything built since the owner last played: hat picker, cart, herb stall,
   tapper, lights, rod, bombs, festival maps and activities, tailoring, pond screens, tea bush.

Alongside: `docs/overview.json` (behind since 2026-11-11), Stardew checks rows (SC-122, 135, 160 to 174), and file the M4
hosting spike before M4 (also farm player state size in the save, ADR 0014).

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
- The other interiors are built (note 86, #853 to #860) from the checked drafts, with the
  shared test `tests/interior-reach.test.ts` and the converter
  `scripts/interiors/tmj-to-map.mjs`. Left: the hall layout (no draft, one player tile at
  each counter), the owner's call on the `AISLE_EXCEPTIONS` lists, game code that reads
  `gate` (friendship doors), spouse route code (note 84), decor zones for renovation
  rooms, the cabin (M4).

## Leftovers and housekeeping

- Slice 1 leftovers: #522 closed 2026-11-12 (art item moved to #335). Bundles: #181 (note 63; #201 closed).
- Art polish pass done 2026-11-12 ahead of M3d (handoff 2026-11-12q); look with
  `node scripts/playtest/artsheet.mjs`.
- Tablet follow-ups (#523; #336 closed), notes 45 and 60 open items, barn stall wing, note 54 answer
  sheet.
