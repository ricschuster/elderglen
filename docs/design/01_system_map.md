# 01 System Map (draft)

Status: draft. Nothing here is decided. This is a list of candidate systems
and open questions, to be argued with and rewritten. All names, numbers and
content are to be original (see `docs/decisions/0002-stardew-valley-inspired.md`).

## Candidate systems

Each line is a system and a one-line "our version" idea.

- **Time and energy.** A day cycle with a limited energy budget, so each day
  forces choices about what to do.
- **Seasons and weather.** Seasons change what can grow and what is available.
  Weather could also affect water levels.
- **Farming.** Plant, tend, harvest, sell. Open: what is our own twist on
  the basic loop?
- **Building and crafting.** A chain from raw materials through processing to
  built structures and goods. Generic item names, our own quantities.
- **Foraging, fishing, mining.** Secondary ways to gather resources and vary
  the day.
- **Animals.** Care for animals for regular output. Open: which animals.
- **Relationships.** Villagers with routines, gifts and growing friendship.
  Open: cast, personalities and how deep this goes.
- **Goals and events.** A chain of community projects plus seasonal events.
  See "Community project chain" below.
- **Progression.** Tool and building upgrades that open new areas.

## Candidate hook (not decided)

A cozy farming life as a home base, with expeditions into a larger and more
dangerous world and a distant threat that slowly grows. The mood is pastoral
comfort under quiet threat, in a generic high-fantasy setting. The setting must
use original names, places, characters and lore. It must not use the names or
specific content of any existing fantasy franchise.

Tone (not decided): warm, wry comic fantasy, with affectionate humor about
everyday life and eccentric villagers. Humor could also take the edge off the
ambient threat. As with the setting, all names, places, characters and jokes
must be original.

## Community project chain (draft)

In the original, finishing the community centre ends the main loop. We want a
chain of community projects ("community centre after community centre"), at
least 2 and possibly 3, so the game keeps a main goal after the first is done.

Agreed so far:

- **Centre 1, village hall.** Local and cozy. Gather from the farm, foraging and
  the seasons.
- **Centre 2, regional project.** Bundles need expedition goods, which is what
  gives the larger world a purpose.
- **Order and unlocking.** Finishing one is required before the next. The next
  does not open automatically; it needs a trigger (for example meeting a
  character or reaching a region).
- **Pacing target.** If centre 1 takes about 1.5 years for an experienced
  player, centre 2 takes about the same, and centre 3 about 1 year. Three may
  be enough in total, depending on the architecture.
- **Centre 3 exists.** Decided. What it is remains open.

Open (see issue #5):

- What is centre 3, and how does it differ from centres 1 and 2 in mechanics
  rather than just scale? A frontier project that pushes back the ambient
  threat is one idea but is not a settled fit.
- Does each centre change the bundle format (gather-and-hand-in checklist,
  multi-step build and stock, long-running supply chain), or keep one format at
  a bigger scale?
- How a centre relates to the ambient threat without adding a timer.

Draft leanings for the larger world, not confirmed: a ring of distinct regions
around the home valley unlocked by tool or bridge upgrades; expeditions as day
trips with limited energy and pack slots; the threat shown as a visible
corruption at the edges that recedes as areas are restored.

## Spatial structure (draft, NOT settled)

Status: recorded for reference only. This is important and needs several more
design sessions before anything here is treated as decided.

The world is a set of concentric rings, with the hub-and-spoke feel of the
original (screen-edge links, gates by tool or event). The shape is a general
pastoral home, varied middle, dark edge arc. Every name, place and lore piece
must be original.

- **Ring 1, home valley.** Farm, village, village hall (centre 1), basic
  foraging, fishing and animals. Open from the start. Safe, cozy, funny.
- **Ring 2, the regions.** Roughly 4 or 5 distinct biomes, each gated by a tool
  or bridge upgrade. Each has its own identity, gathering and crafting
  specialties and characters. Centre 2 sits at a crossroads or waystation where
  ring 1 meets ring 2, and its bundles draw on several regions. Regions link to
  2 or 3 neighbours, not only the hub, and unlocked waystations give fast
  travel late.
- **Ring 3, the dark edge.** The source of the ambient threat, with visible
  corruption that creeps toward unrestored ring 2 regions. Centre 3 would sit
  here, but what centre 3 is remains open (issue #5).

Leaning for ring 3 (not settled): something like the original's late-game
volcano. Optional, late, entered in runs, high risk and high reward, with rare
goods that feed centre 3 and late crafting. It is a destination to push into,
not a quest that ends the game. The threat stays ambient, and pushing it back
is partial. Failure costs follow the existing mild, recoverable answers. The
tone could make the dark edge absurd more than grim (for example a menace run
like an overworked bureaucracy).

Open for further discussion:

- Whether ring 3 has combat, and if so how much. Real-time action is the
  largest scope item, so the first playable should stay simple.
- Whether ring 3 is a dungeon of floors or something else (hazard navigation,
  puzzles).
- Map style: decided in ADR 0005 (separate areas joined by exits, buildings as
  interior maps). See `docs/design/06_map_style.md`. The valley layout is in `docs/design/19_valley_layout.md`.
- Whether the farm is fixed or outposts can be set up in other regions.
- Hand-built regions for the first playable, with generated content possibly
  later.
- How the three centres differ in mechanics, not just scale.

## Ring design notes (2026-10-14, draft)

Ring 1 is designed first. Nothing below blocks it.

Leanings so far:

- **Ring 2 shape.** Leaning hybrid: a haven (waystation) at the crossroads plus
  about 2 regions at first, structured so more regions can be added later. The
  final region count waits until the first ones have been played.
- **Ring 3 bastion.** Logistics only. The player keeps a frontier outpost
  supplied and pushes the corruption back by supplying it. No defence, no
  attacks, no time pressure. Goods can travel by caravan or supply route, so the
  player rarely has to walk there.
- **Home base vs distance.** Leaning Option A: the first trip to each ring is a
  story journey of a few days. The farm waits safely because nothing spoils
  while away. Waystations then make later visits day trips.

Still open:

- **Option B, outposts.** A small bed or cabin in other rings so the player can
  sleep away from home. It fits distance better but splits the player's
  attention across places (the Ginger Island problem). Not ruled out. The
  pull between coming home every night and staying in different places stays
  unresolved for now.
- **Absence rules.** Crops waiting without spoiling and animals coping for a few
  days are part of the A leaning. They also help B. Not confirmed.

Player evidence on the home base problem: some players feel anxiety visiting
Ginger Island because the main farm keeps needing attention, and the common fix
is to automate the home farm first. Sources were thin (forum and Reddit posts).

## Day cycle (draft, issue #14)

Decided in discussion on 2026-10-14. Still draft until the first playable is
played.

- **Energy plus a clock.** The day has a limited energy budget and a running
  clock. Time and energy both shape what the player can do.
- **Passing out.** Running out of energy or time ends the day. The player
  passes out and wakes at home, with a small cost (a little money or a few
  items, and a later start). The cost stays low and never feels like a
  punishment, in line with the mild, recoverable losses above.
- **Clock behaviour.** The clock runs through the day and stops in menus and
  conversations (single player). The original behaves this way too.
- **Numbers match the original for now.** Day length, clock speed, energy and
  the pass-out rules are tunable constants. Until playtesting says otherwise
  the day runs 6:00 am to 2:00 am, energy is 270, and passing out costs 10
  percent of money (up to 1000, none inside the farmhouse) and gives a 6:00 am
  wake with half energy (exhaustion or 2:00 am); late bedtimes lose a growing
  share (`07_tuning_numbers.md`, energy rules). These are numbers only; no name, art,
  text or code is copied (see `docs/decisions/0002-stardew-valley-inspired.md`).
  The original's day runs about 14 real minutes.
- **First playable.** The clock only passes time and ends the day late at
  night. Shop hours and villager schedules come later.

### Activities and skills (draft, issue #14)

Decided in discussion on 2026-10-14.

- **Skill categories.** Each activity belongs to a skill category, and doing the
  activity trains the skill. Higher levels unlock better tools, recipes and
  options. Skills level up by doing, like the original.
- **Categories.** Farming, foraging, fishing and mining. Combat is kept out for
  now (a non-goal in the project brief). Mining should work without it.
- **No always-best activity.** What matters changes with the season, the
  current bundle and what the player needs (money, materials, a tool upgrade).
  Players can lean on different activities. For example, one player may forage
  as the main activity and treat farming as the money maker, and another may do
  the opposite. The design must allow both.
- **First playable.** Foraging plus farming only. The skill system is set up for
  them, and fishing and mining are added once the loop proves fun.

### Seasons (draft, issue #14)

Decided in discussion on 2026-10-14.

- **First playable.** Two short seasons, with different crops and foraging
  goods in each, so the player sees what matters shift over time.
- **Eventually.** Build out to four full seasons. Content added later should
  slot into the same structure without rework.

### A typical day (draft, issue #14)

Decided in discussion on 2026-10-14.

- **Morning.** Water and tend crops. This takes a small slice of energy.
- **Main stretch.** Forage in the valley, or work the farm further. This is the
  main choice of the day.
- **Evening.** Sell goods, hand items in at the village hall, and plan the next
  day's planting.
- **Clock stays simple.** No shop hours or villager schedules in the first
  playable. The village hall is open whenever the player is there.

Issue #14 is settled for the first playable. Shop hours and schedules can be
revisited once there are villagers to schedule.

## Threat model (open)

A growing threat conflicts with the relaxed, no-pressure feel we want. Options
under consideration:

1. Backdrop only: the danger shapes the story and mood, but nothing worsens if
   ignored.
2. Progress-driven: the threat advances only when the player expands or
   explores, never with time alone.
3. Soft consequences: visible effects (quieter village, scarcer goods) that
   ease when pushed back, with no game over.
4. Real clock with an off switch: a true deadline for players who want
   tension.

Leaning toward 1, with some of 3. Options 2 and 3 can be added later without
reworking the base.

Current answers (still draft):

- Losses are mild and recoverable, like passing out in the original: a setback
  such as waking up back home, not a permanent loss.
- The threat is ambient. It is not a goal to defeat.
- Expeditions carry risk, such as dropping some items on failure. Some items
  are protected and cannot be lost this way.

## Open questions

- Name and world: the hook and setting are in the project brief (issue #15).
  The working name is only a placeholder and the world is not yet invented.
- Which systems are in the first playable and which come later?
- Engine and language (needs an ADR when chosen).

## Next steps

- Fill in `docs/design/00_project_brief.md`.
- Pick a small first slice and record it in `docs/design/03_milestones.md`.
