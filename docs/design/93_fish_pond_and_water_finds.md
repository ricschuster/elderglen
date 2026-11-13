# 93 Fish pond and water finds (draft)

Status: **settled with the owner on 2026-11-12 (the full Stardew pond with capacity
quests, and six water finds); the numbers and lists are placeholders.** Design part of
Issue #879. Stardew rules are from the saved Fish Pond page (read 2026-11-12). Names, prices and
art are ours (ADR 0002). Extends the "Fish ponds later" paragraph of `21_fishing.md`.

## What the owner decided

- **Full Stardew pond, with capacity quests** (not the quest-free version).
- **Six water finds like Stardew's set:** three water plants and three jellies, our names.

## Water finds (rod casts, no bar)

Lifted with the rod like trash (note 21): no bar, fishing XP, never fish for the fish
bundles. Plants are common, jellies rare.

| Find | Where | Kind | Notes |
| --- | --- | --- | --- |
| Pondweed | Fresh water (farm pond, river, lake) | plant | Replaces Stardew's green algae |
| Pale lichen | Cave water and the mine pools | plant | Replaces white algae |
| Seaweed | The sea and the cove | plant | Already a forage item (note 72); the cast adds it to the rod table |
| Brook jelly | River and delta | jelly | Rare, any season |
| Tide jelly | The sea | jelly | Rare, any season |
| Glow jelly | Cave water | jelly | Rare |

Where each can be cast and in which season is not on the saved page, so it is ours
(placeholder: jellies in one season each, 8 in 100 bites of the right water). They feed
cooking (algae soup, later), the fish pond build and quests, and the fishing completion
count. They cannot be put in a pond.

## The pond

- **A farm building from the carpenter** (note 23, building rules). 5,000g, 200 stone, 5
  seaweed and 5 pondweed, two days to build, a 5 by 5 footprint (saved page: Robin's build
  list of stone, seaweed and green algae).
- **What goes in.** Any fish caught with a rod or a pot, the legends included, and sea
  urchin and coral (our sea forage items count as fish for the pond). Not the six water
  finds above. One species per pond: a pond refuses a second species.
- **Population.** Starts at 3 fish (1 for a legend, and for some rare fish, which hold 1
  at the start). The cap is 10 (1 for a legend). Fish breed to the cap, one new fish
  every 1 to 5 days by species, dearer fish slower. Fish breed even if only one is in.
  Throwing in more fish up to the cap is allowed and does not reset the clock.
- **Taking fish out.** With the rod, a simplified harvest: no bar, no bait, no tackle
  wear, always normal quality, not a fish collection entry, no XP. Emptying the pond
  resets it (the capacity from quests too).
- **Products.** Each fish may give an item at night. Roe is the main one: Stardew rolls
  an extra roe 20 percent of the time again and again (about 0.25 extra on average). The
  chance is Stardew's (saved page, SC-158; owner chose it 2026-11-12): each night an item
  is possible with chance population x 0.08 + 0.15 (23 to 95 percent, an empty pond
  never), then the item is picked by species and population, roe mostly. Species goods
  need a minimum population, as the page's table lists (for example Sunfish gives Solar
  Essence at 10, Woodskip hardwood at 6, Blobfish a pearl at 9). Fish the page does not
  list keep our own goods (Fernscale: a pond pearl, others later). The roe goes to
  the preserves jar for aged roe (note 24).
- **Quests (Stardew).** When the pond hits its cap, an exclamation mark appears over it
  1 to 5 days later. The quest asks for items thrown in one at a time, any quality. Done,
  the fish thanks you and the cap rises by steps of 3, 5, 7, 10: so a quest at 3, at 5,
  and at 7 fish. A quest also gives fishing XP of 20 plus 5 times the spawn days
  (25 to 45). A completed quest resets the spawn clock, so a quest slows growth. Removing
  fish pauses it, and the same item comes back.
- **The Golden cracker** (doubles output once) is not taken.
- **Quest items** are ours. Stardew's list is by species, with lots of items from its own
  world, so we use item groups: a river fish asks for a forage plant or an ore, a sea fish
  for shells or seaweed or a jelly, a cave fish for a gem, a mineral or a jelly, and the
  top quest (capacity 7 to 10) asks for a made good (jam, pickles, honey, cheese) or a
  gem. One table per fish row in `src/content/pond.json`, with a safe fallback item.

## Where it goes

- **Placement.** The farm layout note (55) reserves building plots. The pond takes a
  5 by 5 plot beside the barn and coop; the placeholder farm gets one. It holds
  its own water, so it needs no water tile nearby.
- **Interface.** A small pond menu: the fish, count against the cap, the quest item, the
  empty button. Tablet friendly, no drag.

## Build list

1. Water finds: six items, the rod table, catch with no bar, fishing XP.
2. Pond building (carpenter, build time, plot), the pond menu.
3. Population, breeding, cap steps, harvest with the rod.
4. Products and roe, the pond quest items table.
5. Save in the placed store. Tests for each.

## Built status (2026-11-12)

Core rules, content and tests are built. The scenes are not.

- **Water finds (build step 1): built.** `src/core/waterfinds.ts` and
  `src/content/waterfinds.json`. `bite()` can return `{ kind: "find" }` after the trash
  roll, never on the tutorial cast. The `FishingScene` lifts a find with no bar, gives 3
  fishing XP and does not touch the fish log. Plants bite 12 in 100 and jellies 8 in 100 in
  the right water, one season each (placeholders): Brook jelly in spring on the river and
  the delta lake, Tide jelly in summer on the sea. All six are items. Pale lichen and Glow
  jelly bite in the `cave-pool` water kind, which no map places yet.
- **Pond building (step 2): core built.** `src/core/pond.ts`: the placeable `fish-pond` (kind
  `pond`, farm only, 5 by 5), `pondProblem` and `orderPond` (5,000g, 200 stone, 5 seaweed, 5
  pondweed, 2 days, clear ground, no overlap with a building or another pond),
  `advancePonds` in the morning, `pondBlocks` (the whole footprint stops walking; wired in
  `FarmScene`). Held in the placed store under the farm, so it saves with no new field.
- **Population, breeding, harvest (step 3): built.** `putFish` (any quality, one species,
  the cap), `takeFish` (normal quality, no XP, no log entry, emptying resets it). Cap steps
  3, 5, 7, 10 (1 for a legend). Breeding one fish every 1 to 5 days by price
  (`spawnDaysOf`), no clock reset on adding fish.
- **Products, roe and quests (step 4): built.** `pondNight` (called from `sleep.ts`): chance
  population x 0.08 + 0.15 (0.5 for a legend), roe mostly with extra roe 20 percent again
  and again, a species goods table in `pond.json` read at its minimum population. One roe
  item per species (`<id>-roe`, half the fish price, ours). Quests: the wait is 1 to 5 days
  after the pond fills and ticks only while it is full, items by water group
  (`questItems` in `pond.json`) and the top quest a made good or gem, XP 20 plus 5 per
  spawn day, the spawn clock resets. Removing fish pauses it, the same item comes back.
- **Not built:** see the second and third passes below for what is still open.

### Gaps found while building (design to settle, not invented)

- **No Stardew fish table for our fish.** The saved page lists Stardew's species only, and
  none of ours match, so `pond.json` has an empty `species` table: every fish makes roe
  only. The goods machinery (a `goods` list of item and minimum population per species) is
  built and tested, but no species has a row. The Fernscale's pond pearl is not set because
  the Fernscale is not in the fish roster yet.
- **Which of our fish hold 1 at the start** (the page's "some rare fish"). Not set: every
  non-legend pond has the cap of 3.
- **How the page picks among several goods.** The page gives a chance and a population
  gate, not the draw. Placeholder: roe has weight 3 and each good with its population
  met has weight 1.
- **Quest item counts.** Stardew asks several of an item; ours are 3, 5, 8 by step
  (placeholder). The quest item lists in `pond.json` are our first guess at the
  note's groups, and there is no cave group because there is no cave fish.
- **Cave water.** Settled 2026-11-12 (taken, owner can correct): a `cave-pool` water kind
  (`WaterKind`, a map trait or a `water` zone names it). Pale lichen and Glow jelly bite in it.
  No map places such water yet (the farm cave and the mine floors have no pool), so they still
  bite nowhere in play until a map or floor carries a pool.
- **Roe price.** Half the fish price is ours, not Stardew's.
- **The carpenter is one job at a time.** The pond refuses an order while the coop, barn,
  silo or house job runs, and those jobs now wait for a pond under way too. Buildings cannot be
  placed over a pond, and a pond cannot be placed over a building (`pondsite.ts` holds the shared
  footprint so `placement.ts` need not import `pond.ts`).
- **Sea urchin and coral.** Read as our Pin urchin and Sea fan (note 72). Confirm.

## Open

- SC-158: done for the chance formula and the listed fish. Our own fish still need their goods and population gates (see the gaps above).
- The legend rule and whether the Fernscale needs a pond of its own (note 21).
- Names, prices, art.

## Built status, second pass (2026-11-12)

Built, with `tests/pondleftovers.test.ts`: the `cave-pool` water kind and the two finds' water
lists; `pondStatus` and `pondUse` (one Action rule: the quest item first, then the waiting
product, then a held fish, else the pond's status line); `pondNews` and three morning report
lines (pond finished, something to take, a fish asking); `FarmScene` hooks: Action on any
pond tile runs `pondUse`, the rod on a pond tile lifts a fish (`takeFish`) instead of casting.

## Built status, third pass (2026-11-12)

Built, with `tests/pondmenu.test.ts`: the carpenter menu line "Fish pond" (`pondOrderProblem`,
`pondCostLine`: price, or what is lacking or the busy job, before a spot is chosen); the
pond on the placing screen (`PlacementScene` takes `"pond"`; `pondBlockers` gives the red
tiles, a spot is not free until the price is in hand; the same rules as `pondProblem`); the
pond menu (`PondScene`, `pondMenu`: fish, count against the cap, the ask, a waiting product)
with an Empty button (`emptyPond`). Action on a pond with nothing to put in, take or give opens
the menu. The dev menu already lists the water finds and every roe item (item groups), so no
dev pick was added; the pond itself is a building, not an item.

Empty is taken, owner can correct: every fish goes to the pack (refused unless the pack has
room for all), which resets the pond, as the rod's `takeFish` does one at a time. The note only
says "the empty button".

Still not built: drawing the pond (art), a pool on any map, and the
species table (still empty, see the gaps). The coop, barn, stable, silo and house placing
rules still do not check for a pond (a building can be put over a pond: `placementBlockers`
is blind to ponds, and the other carpenter jobs do not wait for a pond under way).

## Settled by the owner and built (2026-11-12)

- **Water finds are not Fish entries.** They do not join the Fish completion category (note 39),
  the fish kinds or the roster. They only count toward the "catch N fish" total, as note 38
  says plants do in Stardew; trash does not. `FishLog.noteFind` (called by `landFind`) keeps a
  separate saved `finds` count that `total` includes. Pale lichen and Glow jelly bite on no map
  yet, which no longer matters for completion. Tests: `tests/roeandfinds.test.ts`.
- **Algae soup is a pond reward only, with no cooking recipe.** Saved Fish Pond page: Slimejack
  gives "1 Algae Soup or 5 Wild Bait" at 5 fish. Item `algae-soup` exists (price 100, energy 80,
  placeholders). The hook is a per-species `reward` row in `pond.json` (`{"item", "count"}`),
  given when a capacity quest is finished (to the pack, else at the pond). **Open: the species
  table is empty and we have no slime-like fish, so no species carries it yet.** Name the
  fish (or a legend) that gets it when the table is filled.
- **Aged roe.** Roe in the preserves jar (`processing.ts`) becomes `<fish>-aged-roe` (name
  "Aged <fish> roe"), 2 times the roe's price, 4 days (6,400 machine minutes, placeholder).
  Aged roe goes in no machine. Sea urchin and coral roe count as any species. The Stardew rule is
  from memory (SC-174, unchecked). Colour: `potColourOf` now strips `-roe` and `-aged-roe` and
  uses the fish's pot colour (roe had no colour before this, only note 24 said it should).
  Pot colours exist only for fish listed in `dyes.json` `potInputs`; a fish not listed has no
  colour for its roe either.

## Open question: aged roe quality (new)

Quality of the input is ignored and aged roe is normal quality (as the jar ignores quality).

## Open questions found 2026-11-12 (answered above: completion and soup)

The note says the finds "feed" the fishing completion count and cooking (algae soup), but
does not decide the rules, so neither is built. To settle:

- **Completion count.** Do the six finds join the Fish category (note 39) as six more
  one-time entries (47 fish plus shellfish plus six), or do they only count toward the
  "catch N fish" achievements (note 38 says plants count there, trash does not)? A new
  entry needs a saved found-once record (`FishLog.load` drops ids that are not fish).
  Pale lichen and Glow jelly bite on no map yet (`cave-pool`), so counting them would make
  the category impossible to finish until a map carries a pool.
- **Algae soup.** No recipe is decided: ingredients (which find, how many), energy, sell
  price, and how it is learned (a level, a letter or a shop). No other dish is named for the
  finds. Do the jellies feed a dish at all?
