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

1. **Owner answers left:** none. Decided 2026-11-13: garden pot is clay 1, stone 10 and a refined crystal (smelted quartz, Stardew), taught by Alder (still to build, with a smelt recipe); Frostfin 300g, no bundle slot; Frostday cap is Icewarden's Cap (built); the hunt prize is the emberseed (built); aged roe quality closed. Algae soup is the glassy-elver's reward (note 93).
2. **#873 heart events** (note 62): 66 events (62 plus four rain events), rewards real. Left: the owner's play, seed and window edits, then 4, 8 and 10 with the voice sheets (M3d).
3. **#878 Secret Woods:** fully built (statue, pond fish, creatures with the Burrmouse and the Mahogany seed drop, 2026-11-14). Left: tune in play.
4. **Note 93 left:** species numbers to tune in play; pond art is placeholder only (built 2026-11-14).
5. **#876 festivals:** built 2026-11-14: Showing judging (eight groups, Stardew price bands, dishes count), rotating token counter, even-year hedge map and chest, gap signpost, booth gravestone and gourd lantern recipe, player joins the march (auto-join, owner kept). Left: multiplayer counts (M4), the owner's play, and the plain walk to festival maps (note 82 decision 11; the farm sign still opens `FestivalScene`).
6. **Batch 4 built 2026-11-14** (hall counter second tiles, renovation decor zones, overview and valley-map refresh, wiki gift lists stay draft, M4 hosting spike text drafted in `docs/design/drafts/m4-hosting-spike-issue.md`, owner approves before filing). Left: the owner's play. Real garden pot art waits for M3d. Village trees: owner kept the layout, judge in play. #874 spouse source built with marriage; the gallery set is left. Friendship doors are built (`gates.ts`).
6b. **Playtest scripts** (handoff 2026-11-14i): expert day 5 and boxed-in bot fixed (bot-script problems). Left: a full pass of all three personas at `SPEED=2`, one at a time.
6c. **In-game menu built 2026-11-14** (note 49, 52): Pack equipment, Social, Animals, Special Items, Skills extras, journal (J), Exit saves the day. Left: the two-record save split (night record and resume record, Restart this day, title summary, export/import; note 52), trash drop target, paper doll, title from levels, quest expand. The owner checks it on a tablet.
6d. **In-game Guide built** (note 101): all eight categories and shop hours on a keeper's card once visited. Left: hours for shops with no keeper, the owner checks it and the tab count on a tablet.
6e. **Marriage (note 12) built to shell level 2026-11-14** (#934 to #939, placeholder text and art): bouquet, token, wedding, spouse room, kiss, divorce at the hall ledger, children. `npm run playtest:marriage` covers it. Left: the owner's play (nothing seen in a browser), the open owner questions in handoff 2026-11-14j, real lines and art (M3d), the ex at weddings, M4. #874 is unblocked.
7. A browser look at everything built since the owner last played: hat picker, cart, herb stall, tapper, lights, rod, bombs, festival maps and activities, tailoring, pond screens and art, tea bush, woods creatures, even-year maze.

Alongside: the wiki (#910, note 100; built for every category, every item has a picture; text cleared for crops, fish, forage, items, places and rooms; draft text left for bundles, recipes, people and five gem names; left: owner reads the draft text and clears flags, gift lists (`giftsDraft`), people prose with the voice sheets, hosting after M3d), Stardew checks rows (open: SC-122, 135, 160, 161, 170, 172), and file the M4
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
