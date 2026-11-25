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
2. **Save split** (note 52, built 2026-11-16; desktop browser check 2026-11-18 passed, `playtest/save.mjs`, takeover race fixed): emulator check 2026-11-18 (handoff 2026-11-18e): debug menu and Pack tab worn slots work by touch; `persist()` returns false on the emulator WebView (real tablet unknown). Tablets 2026-11-19: `persist()` false on both. Left: the owner's look.
3. **Gallery** (note 104, 94 items after High gem B was removed 2026-11-18; the museum order is built): left the owner's look, display case, librarian lines (M3d). The 60-donation key opens a new hidden area, its own note, M3d or later.
4. **Built to shell level 2026-11-16, left the owner's look:** control schemes (note 27; 1, 4 and 9 are real, SC-188), marriage (note 12; SC-201 to 203), chests and tools (notes 34, 49, 101 to 103), sim (55 of 100 finished by day 112, no drift).
5. **#951: play M3b end to end** (live checklist `docs/handoffs/PLAYCHECKS.md`, run with `/playcheck <area>`; stage jumper, note 42). Done headless 2026-11-21: Marriage, Festivals, Mines and combat, Fishing, Bundles (30 of 30), Places and other systems (handoff 2026-11-21f), Heart events (150 of 150 on the real-map build, 2026-11-22, under the sweep cap; step 5 journal replay built, owner to look and close #1003; #1002 proof moves built 2026-11-23, closes with this PR). Saves and device passed on the SM-T500 and the spouse-at-night probe passed (handoff 2026-11-21i). Farm ponds by hand passed 2026-11-22 (patch keys and stages `farm-pond-product`, `farm-pond-quest`). Tablet checks are text first (`scripts/playtest/probe.mjs`).

Decided 2026-11-18: shrine score 21, Diamond sources (floor 120 drop, Crystalarium copies, ponds, no fishing chest), Feast caps 300 and 100; multiplayer rulings for shrine, gallery, orders and player marriage are in note 53; note 12 now has the two-player wedding and divorce steps (drafted 2026-11-18, owner decided: the wedding plays after night 3 with no wait for the partner, the proposer's cabin is home, the filer pays the fee, divorce at the hall ledger (30,5)). Build with M4.

M4 built headless 2026-11-18h (note 53). Two-tablet plus desktop check ran 2026-11-19f. Guest intents built: till, plant, water, bin, harvest, axe, pickaxe (2026-11-20). Marriage ran 2026-11-21: the spouse walks out, the token needs house tier 1; #991 wedding scene has no movement, #992 beds. **Built 2026-11-21k:** player rows on Social; steps 3 to 5 and #976 were already built (issues stale). **Next:** guest animals, guest shop by hand, spouse life, divorce and children by hand, villager lock (needs guest courtship), guest pile pickup and camp chest, player rows on top of Social, file saves before release. Layout page (slices 1 to 5) waits for the owner's look.

Audio built 2026-11-21 (note 107, ADR 0017; handoff 2026-11-21g): effects, ambience, 18 music slots (6 synth placeholders), Options sliders. **Left: the owner listens** (`/audio.html` or the tablet), swaps tracks, tunes sounds.

Built 2026-11-23 (handoff 2026-11-23, one PR): energy rules (note 07), level 10 professions for foraging, mining and combat, the Hearthsilver grade (crops, forage, fish, animal goods, casks), per-person beds with Maren's room and Marl's tent (#992), #1002 proof moves, the slayer wall list and reward shop at Maren's, rare gilded creatures and dangerous mode. All left for the owner's play; the lever timing was ruled 2026-11-24 (next day, note 109).

Built 2026-11-21 (handoff 2026-11-21j): #991 wedding movement (player wedding only), #992 bed marks (nothing draws them yet), #977 injectable RNG in core. Left for the owner's look and play.

Alongside: the wiki (#910, note 100; built for every category, every item has a picture; text cleared for crops, fish, forage, items, places and rooms; draft text left for bundles, recipes, people and five gem names; left: owner reads the draft text and clears flags, gift lists (`giftsDraft`), people prose with the voice sheets, hosting after M3d), Stardew checks rows (open: SC-188 only; the rest answered or closed as ours, on purpose, 2026-11-17). M4 hosting spike filed as #948.

Designed 2026-11-24: notes 108 to 113 (#1014 to #1018). **Built 2026-11-24 (handoffs 2026-11-24b and c, headless):** #1014 guest screens (groups 1 to 5), #1015 guests off the farm (steps 1 to 4 plus the finishing pass: slayer screen, fishing bar, ice and pier, bombs), #1016 guest cabins, #1017 festivals with several players, guest copies follow the host's results (`worldfx`), note 106 step 8, Social player rows. Sim (#181): sprinklers, can refill, deterministic per seed; still no Last Seat in 168 days (note 16). **Left for the owner:** play all of it with two players (none was run in a browser), and the sim pacing options in note 16. **Build list next:** note 113 (after the M4 groups); loose ends in handoff 2026-11-25.

Built 2026-11-25 (handoff 2026-11-25, headless): #1018 year two; sim trace (note 16); per-player guest settings, wardrobe, friendship and villager marriage; furniture, chests and machines in any house; cabin move and demolish with a lost and found box. Decided: Specialty Fish 4 of 4 and the Last Seat after all 26 (Stardew); note 114 odd requests (M5). **Later session:** sim bot only (river and lake pots, Cook's and Host's letters and tea), 20-run rerun.

## Milestone order (ADR 0012)

M3 (close out: the owner's play), M3b ring 1 systems, M4 multiplayer, M3c story and
ending, M3d polish, then M5 and M6. Map areas (notes 71 to 78) are M3b.

## After M3b

Other open items, the layout and tiles track (note 81) and leftovers are in
`PRIORITIES_LATER.md` (not read at start).
