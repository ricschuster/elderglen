# 03 Milestones (draft)

Status: draft. This is the one place the overall order of work lives. Live
tasks and open questions are GitHub issues, grouped by the GitHub milestones
named below. Filter by label `next-payoff` for the few items that matter most
right now.

How to pick a payoff: choose the item that gets something playable sooner, or
settles a decision that many other items wait on. Review this list at the start
and end of each session, and update the status column.

Order of work (ADR 0012, 2026-11-08): M3, M3b, M4, M3c, M3d, M5, M6. The letters
split the old "vertical slice" into the rest of ring 1; M3c and M3d build on a
multiplayer base.

Ranking from the project brief: home valley is Must, the regions are Should,
the dark edge is Could.

| # | Milestone | Payoff (done when) | Status | Main blocker |
| --- | --- | --- | --- | --- |
| M1 | Define the first playable | The first playable's scope and done list are written below, and the audience, identity, core loop of a day and multiplayer questions are answered. | Done | None |
| M2 | First playable | Day and energy cycle, farming, selling and a small centre 1 run in the home valley, with rough art. Engine chosen in an ADR. | Done (2026-11-07) | None |
| M3 | Vertical slice | Slice 1 and the work pulled forward from later slices (`33_build_order.md`). Done when the owner has played the coop, barn, machines and cooking by hand and the open issues are closed or moved. | In progress | The owner's hands-on play |
| M3b | Ring 1 systems | Fishing and the Water room (slice 2), combat and the deeper mines (slice 3), friendship, the cast, gifts and heart events (slice 4), the horse, the cask and cellar, the dye vat and the greenhouse, and the map areas of the home valley (Forest, Secret Woods, River delta with the Beach, Mountain, Quarry, Lake cove, then Hearthwell with #599; notes 71 to 78). Bundles 1 to 26 can be filled. | In progress. Built: fishing, pots and legends, combat and the deeper mines, the horse, the cask and cellar, the dye vat, the greenhouse, every map area to shell level, villagers with schedules, friendship, gifts, shops and the first heart events. Not yet: bundles 20, 24 and 26 and their items, several room rewards (Hearth carts, herb stall, Guests' Board bonus), gift tastes for 22 of 30 people, the real heart event list, the elderfruit effect, goods hand-in for three special orders, the lightning rod and lamp placement, and the festival route layer. Open work is in the M3b GitHub milestone (#869 to #880, #396) | The owner's play, bundles 20, 24 and 26 (#869), design for placement, hand-in and elderfruit (#877, #875, #874) |
| M4 | Multiplayer | Up to 8 players share one valley on one network, designed in `53_multiplayer.md` (ADR 0007, `docs/decisions/0007-multiplayer-milestone.md`). Moved to follow M3b (ADR 0012). | Not started | M3b, the wrapper ADR (done, ADR 0008), a hosting spike |
| M3c | Ring 1 story and ending | The story spine, the Last Seat (slice 5) and its numbers, the year two rules. The Forest and Mountain maps moved to M3b on 2026-11-08 (owner, note 71) and take tree types with them. Ring 1 plays from start to ending. | Not started | M4, the story spine design (#176 to #178) |
| M3d | Ring 1 polish | Art, audio, onboarding, balance, minigames, packaging and the name register check. Ring 1 is releasable as a full game. | Not started | M3c |
| M5 | Ring 2 prototype | A haven and about 2 regions reachable from the home valley. Centre 2 in small form. | Not started | M3d, ring 2 shape (#20) |
| M6 | Ring 3 and centre 3 | A logistics-only frontier outpost. Optional, late. Only if M1 to M5 prove fun. | Not started | M5, centre 3 (#5) |

## First playable scope (draft, issue #12)

Decided in discussion on 2026-10-15. Still draft until played.

In:

- Day and energy cycle.
- Farming: plant, tend, harvest.
- Foraging: wild goods found near the farm.
- Skills for farming and foraging, leveled by doing.
- Two short seasons with different crops and foraging goods.
- Selling goods.
- A small version of centre 1 (village hall) with a few bundles.
- House upgrade: the first paid tier (`41_house.md`), added 2026-10-31. Tiers 2 and 3 and the cellar are M3.
- Rough placeholder art.

Out (non-goals for now, see the project brief): regions, ring 3, combat,
multiplayer (planned as M4, after M3), generated content, deep relationships, final name and polish.

### Centre 1 in the first playable

- **Size.** Four bundles (five until the Pantry was dropped, 2026-10-31), each asking for 3 to 6 items.
- **Requests.** Modelled on the original's approach, in our own names and
  items. A bundle names specific goods, and some bundles accept "any N of these
  M" so the player has choices. Some goods are tied to one of the two seasons,
  so what matters shifts over time and both foraging and farming are needed.
- **Starting set.** Season 1 foraging, season 2 foraging, season 1 crops,
  season 2 crops, and one mixed bundle that draws on all of them. Exact items
  wait for the crop and forage lists.
- **Hand-in.** The player hands items in one by one at the village hall. Each
  bundle remembers its progress between visits. The hall is always open.
- **Rewards.** Finishing a bundle gives a small reward (placeholder: seeds or a
  little money, to be tuned). Finishing all of them ends the first playable with a
  simple end screen.
- **Quality tiers, skill gates, tool upgrades.** Planned for M3, but quality
  tiers and tool upgrades were built early (#94, #97). Skill gates and
  professions are not built.

### Done list

The first playable is done when all of these are true:

1. A day runs with energy and a clock, and the player can pass out and wake at
   home with a small cost.
2. The player can plant, tend and harvest crops, and forage wild goods.
3. Farming and foraging skills level up by doing.
4. Two short seasons run, each with its own crops and foraging goods.
5. The player can sell goods.
6. The village hall shows its bundles, accepts item hand-ins one by one, and
   keeps progress between visits.
7. Finishing a bundle gives its reward, and finishing all bundles shows an end
   screen.
8. The game can be saved and loaded between days.
9. It runs with rough placeholder art and no audio requirement.
10. The house can be upgraded once at the carpenter, opening the kitchen and
    double bedroom inside the same footprint (`41_house.md`). Tiers 2 and 3 and
    the cellar are M3.

A new idea during the build becomes an issue, not scope.

### Early M3 work

Built during M2 because it needed no design input and copies Stardew: quality
tiers, tool upgrades, eating, a weather forecast, a skills screen, a weekday
date, six more crops and three more forage goods. Numbers are in
`07_tuning_numbers.md`. This does not move the M3 scope, which is still fixed
by a design note before building.

### M3 candidates from reader feedback

Decided 2026-10-27 from reader 1's feedback. None are built. The M3
scope is in `13_m3_scope.md` (accepted, #130).

- Two festivals per season, one in M3 (`09_story_and_lore.md`): calendar #131, system
  #132.
- Bundle hints: a short hint per bundle, from a villager line or a tooltip.
  Part of the bundle format, #21.
- Customisation, first slice: house furniture and hats
  (`10_customisation.md`): #133. Furniture rewards are part of #21.
- Minigames, starting with a festival game (`11_minigames.md`): #134.
- The neglect rules and tone rules in `09_story_and_lore.md`: #135.
- The scope note that picks what is in and out of M3: #130.
- Tree types by region, as Stardew (`36_gathering_trees_sap_fiber.md`, SC-30):
  three types in fixed places outside the farm, regrowing when chopped, and some
  cosmetic ones that cannot be chopped. Decided 2026-11-06 for M3, not M2: #396.
- Later, not M3: marriage, which needs its own design note (#137, parked).
  The ring 1 cast list (#136, note 20) and the final name (#138, Elderglen,
  ADR 0011) are settled and closed.

### CI and the build check

The `build` job in `.github/workflows/ci.yml` runs format, lint, typecheck,
tests and the production build. Until 2026-11-02 the `main` branch protection
required only `repo-hygiene`, so auto-merge did not wait for `build`.

Decision (owner, 2026-11-02): `build` is a required check on `main`, next to
`repo-hygiene`, and a PR must be up to date with `main`. Auto-merge is on for
every PR, so this is the only automatic stop for a failing format, lint,
typecheck, test or production build. The cost is that a cancelled or flaky
`build` run blocks a merge until it is re-run. If that happens often, revisit
this. Still run `npm run check` before pushing.

## Scope control

- New ideas become issues, not scope.
- Each feature gets a time box with a cut, iterate or ship decision at the end.
- Keep a short log of how long things really take, so estimates improve.
- The vertical slice often feels nearly done but is about 20% of the total
  work. Fix its scope before building.
