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

1. **#876 festivals** (note 82, 14): walk and joining built for the green, hedge and six in-place festivals; the **Night Market built 2026-11-16** (stalls, hats, crowd, pier, market fish, float, hot drink; all placeholder art and lines). The Feast is held in place, so it has no exit tiles (closed 2026-11-18). The Feast gift exchange and lantern are built (note 105); left multiplayer counts (M4) and the owner's play.
2. **Save split** (note 52, built 2026-11-16; desktop browser check 2026-11-18 passed, `playtest/save.mjs`, takeover race fixed): emulator check 2026-11-18 (handoff 2026-11-18e): debug menu and Pack tab worn slots work by touch; `persist()` returns false on the emulator WebView (real tablet unknown). Real tablets 2026-11-19: `persist()` false on both (SM-T500, SM-X210). Left: the owner's look.
3. **Gallery** (note 104, 94 items after High gem B was removed 2026-11-18; the museum order is built): left the owner's look, display case, librarian lines (M3d). The 60-donation key opens a new hidden area, its own note, M3d or later.
4. **Built to shell level 2026-11-16, left the owner's look:** control schemes (note 27; 1, 4 and 9 are real, SC-188), marriage (note 12; SC-201 to 203), chests and tools (notes 34, 49, 101 to 103), sim (55 of 100 finished by day 112, no drift).
5. **#951: play M3b end to end** (tablet play 2026-11-20, handoff 2026-11-20; stage jumper, note 42). Checked by hand: Camp Chest, wedding scene, feast exchange, spouse label. Every finding was fixed in the same PR but the build is unseen: **next is a fresh debug APK and a short regression pass** (swing arc, monster speed, toolbar size, a villager walking out of the burrow at 9:00, a rock broken with a full pack, feast reveal, wedding sprites). Then festivals, fishing rods, `late-game-100` on the SM-T500, finger feel for schemes 1 and 4. Villagers walk now (note 79 walker, Hearthwell only); left in the handoff.

Decided 2026-11-18: shrine score 21, Diamond sources (floor 120 drop, Crystalarium copies, ponds, no fishing chest), Feast caps 300 and 100; multiplayer rulings for shrine, gallery, orders and player marriage are in note 53; note 12 now has the two-player wedding and divorce steps (drafted 2026-11-18, owner decided: the wedding plays after night 3 with no wait for the partner, the proposer's cabin is home, the filer pays the fee, divorce at the hall ledger (30,5)). Build with M4.

M4 built headless 2026-11-18h (note 53). Two-tablet plus desktop check ran 2026-11-19f. Guest intents built: till, plant, water, bin, harvest, axe, pickaxe (2026-11-20). Marriage by hand ran 2026-11-21 (handoff 2026-11-21): courtship, engaged and the wedding morning work; #991 wedding scene has no movement, #992 beds. **Next:** guest animals, guest shop by hand, spouse life, divorce and children by hand, villager lock (needs guest courtship), guest pile pickup and camp chest, player rows on top of Social, file saves before release. Layout page (slices 1 to 5) waits for the owner's look.

Alongside: the wiki (#910, note 100; built for every category, every item has a picture; text cleared for crops, fish, forage, items, places and rooms; draft text left for bundles, recipes, people and five gem names; left: owner reads the draft text and clears flags, gift lists (`giftsDraft`), people prose with the voice sheets, hosting after M3d), Stardew checks rows (open: SC-188 only; the rest answered or closed as ours, on purpose, 2026-11-17). M4 hosting spike filed as #948.

## Milestone order (ADR 0012)

M3 (close out: the owner's play), M3b ring 1 systems, M4 multiplayer, M3c story and
ending, M3d polish, then M5 and M6. Map areas (notes 71 to 78) are M3b.

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
