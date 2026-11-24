# 16 Village hall bundles: rooms, rewards and unlocks

Status: proposed 2026-10-28. The structure, unlocks, rules and the Last Seat
were decided with the owner in conversation. Every item, count and reward below
is a placeholder to be tuned. Bundle 25 (Fodder) and bundles 27 to 30 (the Last Seat) were added 2026-11-11 with placeholder stand-ins (oil for lamps, no 5,000g in the Long Road, kept stand-in rewards). Twelve of the 30 were built in the game (2026-11-07, `35_bundle_pools.md`: bundles 1, 2, 4, 5, 7, 8, 9, 10, 12 and 19, some with stand-in pools; and 11 and 21 on 2026-11-08, pools from `63_bundle_pools_part_two.md`, giving the cheese press and the loom); the rest are not. It answers
issue #21 (bundle format for centre 1) and extends the five-bundle first
playable described in `03_milestones.md` and `07_tuning_numbers.md`.

## Why

The first playable has five bundles. A full centre 1 needs a structure that
lasts about 1.5 years for an experienced player (`01_system_map.md`), gives
every system a reason to exist, and ends in the bridge to ring 2. The shape
follows Stardew Valley's community centre (rooms, a count-based soft gate and a
reward per bundle). Per ADR 0002 and ADR 0003 the names, items and rewards
here are our own.

## Decisions

1. **Six rooms, 30 bundles.** The per-room counts follow Stardew: 6, 6, 6, 3, 5
   and 4.
2. **Rooms appear by the total number of bundles finished**, not by finishing a
   whole room. Only the Foragers' Shelf is open at the start.
3. **One gate to ring 2.** Finishing the Last Seat mends the bridge and
   opens the road. There is no second room behind it.
4. **The Last Seat is the last and hardest thing in ring 1.** Its bundles
   ask for finished goods from three or four other rooms, so they cannot be
   filled early.
5. **Each bundle gives a useful item.** Finishing a whole room gives a larger
   unlock. Rewards lean towards machines and tools, seeds and consumables, and
   wearable equipment.
6. **The last room is called The Last Seat** (decided 2026-10-28), to avoid
   clashing with the hall, which keeps the name The Long Table. The name hints
   at a place left at the table for someone still to come.
7. **Rewards are designed in full now and tagged with the system they need.**
   A reward whose system does not exist yet stays a placeholder until that
   system has a design note.

## Room appearance (the soft gate)

| Room | Bundles | Appears after |
| --- | --- | --- |
| Foragers' Shelf | 6 | Open at the start |
| Larder | 6 | 1 bundle done |
| Water room | 6 (built 2026-11-10, pools in note 21) | 1 bundle done |
| Hearth | 3 | 2 bundles done |
| Guests' Board | 5 | 3 bundles done |
| The Last Seat | 4 | All the other bundles done (owner, 2026-11-11; was 20 of 26) |

- Stardew's own thresholds (1, 2, 3 and 4 for its later rooms) come from one
  forum reply and were not checked against the wiki or the game data. Ours
  follow the same pattern and are placeholders.
- A player may skip up to 6 of the other 26 bundles and still reach the Long
  Table. They will miss the room reward of any room left unfinished.
- A room reward needs every bundle in that room finished.
- The Last Seat needs all four of its own bundles for the bridge.
- Open: whether to require at least one bundle from every room before the Long
  Table appears. The default is no.

## Rooms and bundles

Counts are "N of M": the player hands in N items from a pool of M. "All" means
every listed item. Bundles accept any quality unless a minimum is given.
"Needs" is the system tag: where it says "exists" the goods are in the game
today.

### 1. Foragers' Shelf (open at the start)

Room reward: Old Greencoat sets up a herb and seed stall at the hall.

| # | Bundle | Rule | Reward | Needs |
| --- | --- | --- | --- | --- |
| 1 | Spring Foraging | 4 of 6 | 15 parsnip seeds | Exists |
| 2 | Summer Foraging | 3 of 4 | 15 radish seeds | Exists |
| 3 | Autumn Foraging | 4 of 6 | 15 autumn seeds | Autumn forage and crop |
| 4 | Winter Foraging | 3 of 5 | Seed maker | Winter forage, seed maker |
| 5 | Woodland | All: 50 wood, 50 stone, 30 fibre | Charcoal kiln | Gathering, crafting |
| 6 | Rare Finds | 3 of 5 rare forage | Heavy Tapper recipe (was 5 forage dishes, note 92) | New forage, eating (exists) |

### 2. Larder

Room reward: the greenhouse.

| # | Bundle | Rule | Reward | Needs |
| --- | --- | --- | --- | --- |
| 7 | Spring Crops | 4 of 6 | 20 fast-grow fertiliser | Exists (crops), fertiliser |
| 8 | Summer Crops | 4 of 6 | 20 quality fertiliser | Exists (crops), fertiliser |
| 9 | Autumn Crops | 4 of 6 | Bee house | Autumn crops, bee house |
| 10 | Quality Crops | 3 of 4 crops, 5 each, silver or better | Preserving jar | Minimum-quality rule, preserves |
| 11 | Animal Goods | 4 of 5 | Cheese press | Animals, processing |
| 12 | Artisan Goods | 4 of 6 | Keg | Processing |

Spring pool: parsnip, potato, cauliflower, green bean, kale, garlic. Summer
pool: melon, tomato, radish, hot pepper, corn, red cabbage.

### 3. Water room

Built 2026-11-10 (issue #596): bundles 13 to 18 are in the hall data, with pools in `21_fishing.md` ("Built in slice 4, part two"). The glow ring and the Beach warp totem are kept placeholders until the equipment slot and the totem's use exist.

Room reward: the ferry is repaired and a lake cove opens inside ring 1. No
bundle in this room may need cove fish, since the cove opens only when the
room is done (decided 2026-10-29). Lake fish come from the three open lakes. It
replaces Stardew's panning, which the owner dislikes. Ring 1 also has a coast
(decided 2026-10-28), which the Sea Fish bundle uses.

| # | Bundle | Rule | Reward | Needs |
| --- | --- | --- | --- | --- |
| 13 | Stream Fish | 3 of 5 | 30 bait | Fishing |
| 14 | Lake Fish | 3 of 4 | Lure | Fishing, the Forest, Mountain and delta lakes |
| 15 | Sea Fish | 4 of 6 | 5 warp totems to the Beach | Fishing, a coast, warp totem |
| 16 | Night Fishing | 3 of 4 | Glow ring | Fishing, night, equipment slot |
| 17 | Specialty Fish | All 4: one rare fish each from stream, lake and sea, plus one rare shellfish | 5 fish dishes | Fishing, cooking |
| 18 | Trap Catch | 5 of 8, fresh and salt water | 3 crab pots | Fishing, traps |

### 4. Hearth

Room reward: carts between the farm, the hall, the town and the mines.

| # | Bundle | Rule | Reward | Needs |
| --- | --- | --- | --- | --- |
| 19 | Smith's | All: 5 copper bars, 5 iron bars, 3 gold bars | 20 coal | Smelting, ore from the mines or the smith |
| 20 | Lamplighter's | 2 of 3: 3 lamps, 10 oil, 20 candles (owner, 2026-11-11, was torches) | A small glow ring | Light, equipment slot, oil maker (slice 4, see `35_bundle_pools.md`) |
| 21 | Weaver's | All: 8 wool, 20 fiber (raw goods, since the reward is the loom, see `63_bundle_pools_part_two.md`) | Loom | Wool, animals |

The mines are not unlocked by the Hearth (see "The mines" below).

### 5. Guests' Board

Room reward: two hearts with every villager who is not a candidate and whom the player has met (`61_friendship_and_gifts.md`).

| # | Bundle | Rule | Reward | Needs |
| --- | --- | --- | --- | --- |
| 22 | Cook's | 3 of 5 dishes | 3 feast dishes | Cooking |
| 23 | Dyer's | 4 of 6 raw colour goods (flowers, berries, cabbage), not dyes | Dye vat | Dyes, tailoring |
| 24 | Host's | 3 of 4: bread, cake, tea, a festival treat (any festival stall) | Set of 3 festival hats | Cooking, hats, festivals |
| 25 | Fodder | All: 20 hay, 10 wheat, 10 root crops | Coop heater | Animals, coop |
| 26 | Storyteller's | 3 of 5 herbs and old things found in the valley | A green-glass lantern, Old Greencoat's keepsake (placeable) | Found items, a lore item |

Storyteller's pool: rare herbs, an old seed packet, a carved bead, a faded
ribbon, a pressed flower.

### 6. The Last Seat (last and hardest)

Room reward: the bridge is mended and the road to ring 2 opens.

| # | Bundle | Asks for | Reward | Needs |
| --- | --- | --- | --- | --- |
| 27 | Harvest Feast | All 4: a cooked meal, a preserve, a cheese, a honey. 3 of each. | Crystalarium | Cooking, preserves, animals, bee house, gems from the mines |
| 28 | The Catch | All 4: a stream, lake, sea and night fish, each gold quality | Magnet ring | Fishing, fish quality, equipment slot, mines |
| 29 | The Hearth Fire | All 4: 10 bars, 5 lamps, 5 bolts of cloth, 3 dyes | Large chest | Smelting, light, cloth, dyes |
| 30 | The Long Road | 100 wood, 100 stone, 20 bars, 10 bolts of cloth and 5,000g | A letter to the elves | A story item only |

- The Long Road is a story reward on purpose: the letter is Old Greencoat's
  introduction to the elves. The Dawn Carrier who guides the player on the way
  (`09_story_and_lore.md`) is a separate help. Neither replaces the other.
- The gold is a money sink sized below the 10000g top tool tier.
- Quantities are placeholders. "100 wood" assumes bulk gathering, which has no
  design yet.

## Rewards by kind

- **Machines and tools:** seed maker, charcoal kiln, bee house, preserving jar,
  cheese press, keg, furnace, loom, dye vat, crystalarium.
- **Seeds and consumables:** seeds, fertiliser, bait, dishes, crab
  pots, warp totems.
- **Wearable equipment:** small glow ring, glow ring and magnet ring. All need an equipment
  slot, designed in `37_equipment.md`.
- **Charm and story:** festival hats, the coop heater, the keepsake and the
  letter to the elves.

## Systems this note depends on

Each is its own design work. Until one exists, its rewards and bundles stay
placeholders.

- Fishing, the lake cove, the ferry and the coast (Water room, bundles 13 to
  18 and 28). Needs its own design note.
- The mines, with gentle combat (Hearth ore, torches, the magnet ring). Needs
  its own design note.
- Processing machines and cooking (Larder, Hearth, Guests' Board).
- Animals and coops (bundles 11, 25 and 27). The neglect rules wait on them
  (#135).
- Autumn and winter: the first playable has two seasons, so bundles 3, 4 and 9
  wait for them.
- Cloth, tailoring and dyes (`10_customisation.md`).
- An equipment slot for rings.
- A minimum-quality rule on a bundle item (bundle 10), and quality on fish.
- The greenhouse as a building.
- Warp totems (bundle 15), a consumable that returns the player to the Beach.

## The mines

Decided 2026-10-28. The mines open early, on a fixed day, and not through the
hall. A rockfall blocks the entrance until then. Old Greencoat comes to the
door and says the way is clear, which fits his part of opening each road in a
small way. In Stardew the mines open on Spring day 5 by a letter, and the
Boiler Room only adds a minecart. The opening day is Spring day 5 (decided
2026-10-30, `22_mines.md`). The furnace is now a gift from the smith dwarf, not
the Smith's bundle reward, and the big furnace is a ring 2 reward. This lets the Hearth's metal come from the mines
before its carts arrive. Combat is wanted in the mines but must stay gentle
(cartoonish creatures, a soft penalty when beaten). That, and the mines' size,
belong in the mines note.

## Relation to the first playable

The five bundles in `src/content/bundles.json` stay as the first slice. They
map onto this note as follows: Spring Foraging and Summer Foraging are bundles
1 and 2, Spring Crops and Summer Crops are bundles 7 and 8, and the Pantry, a
mixed bundle that did not appear here, was dropped on 2026-10-31 (the owner
chose the Stardew behaviour: its Pantry room has no mixed bundle). The
current rewards (seeds and money) stay until the systems above exist.

## Who grants a room reward

Decided 2026-10-31 (the owner chose this at the start of #180). The hall scene
shows a finished room's reward and records it; it does not grant it. Each
reward system reads `Hall.completedRooms` when that system is built, so the hall
never depends on systems that do not exist yet. Until then a room reward is
shown in the hall as text only. Stardew grants a Community Center reward when
its room is finished, but the Stardew wiki was not checked for this note.

## Open questions

- **Revisit every bundle reward once more of the design is settled** (noted
  2026-10-30). Rewards were chosen before the mines, fishing, processing,
  animals, cooking and the completion tracker were designed, and several have
  already moved (bundle 19 gave the furnace and now gives a charcoal kiln, see
  `22_mines.md`). Expect to rebalance them against what each system can supply
  and when, so no reward arrives too early or too late, and none duplicates a
  gift from an NPC. Do this after the processing, animals and cooking notes
  exist, and before the bundle data (#179, #180) is final.
- **Rewards pass done 2026-10-31** (issue #201, in part). Bundle 27 gives a
  crystalarium, which copies a gem or mineral put in it (the owner's choice, in
  place of the dropped duplicator). Bundle 19 gives 20 coal, since bundle 5
  already gives the charcoal kiln. Bundle 12 keeps its keg, as in Stardew. Still
  to do: the equipment slot rewards (bundles 16 and 28) wait on that design, and
  the rest need a check against the final bundle data (#179, #180).
- Whether a player must finish at least one bundle in every room before the
  last room appears.
- Item pools: 1 to 10, 12 and 19 are in `35_bundle_pools.md`, 13 to 18 in
  `21_fishing.md`, and 11, 21 and 22 to 26 in `63_bundle_pools_part_two.md`
  (2026-11-06, which also does the rewards pass of #201).
- The Last Seat quantities and the bridge cost, once wood, stone and bars
  have real production rates.
- Whether 30 bundles fit the 1.5 year pacing target. This needs a playtest
  once enough of them exist.
- Stardew's room thresholds and reward lists come from guide sites and a forum
  reply, not the wiki, which blocked fetches.

## Sim run for the Last Seat pacing (2026-11-24, #181)

`npm run sim -- <persona> 40 112`, the three personas of note 98, 40 seeds each,
112 days (the sim's year). The target is about 1.5 years for centre 1: 6
seasons of 28 days, day 168 (note 00; a season is 28 days, note 07). The sim
reports each room and a Last Seat line since this run.

**Limit: the bot plays 11 of the 30 bundles.** It does not fish, keep animals,
cook, keep bees, or weave, so it skips the whole Water room, the animal, cooking
and weaving bundles, Fodder, and all four Last Seat bundles. The Last Seat opens
only after all 26 others, so the sim cannot measure when it opens or finishes,
and no day for "all 30" exists. What it gives is the day the played 11 are done,
which is a floor for the Last Seat opening.

| Persona | Foragers' Shelf (5 of 6 played) | Larder (4 of 6) | Hearth (1 of 3) | Guests' Board (1 of 5) | Water room, Last Seat | Played 11 all done |
| --- | --- | --- | --- | --- | --- | --- |
| Expert | day 94 (30 of 40 runs) | day 67 (32 of 40) | day 61 (40 of 40) | day 32 (40 of 40) | not played | day 94, range 86 to 111 (24 of 40) |
| Intermediate | day 99 (14 of 40) | day 66 (36 of 40) | day 60 (40 of 40) | day 36 (40 of 40) | not played | day 99, range 90 to 111 (13 of 40) |
| Casual | none finished | none | none | none | not played | none by day 112 |

Medians over the runs that finished the room. Casual finished only the first
two foraging bundles (3 and 6 of 40 runs): it forages 3 spots on a third of its
days and sells what the hall wants. The earlier "55 of 100 by day 112" was a
different mix and an older bot; this run does not reproduce it (24, 13 and 0 of
40). Last Seat open and finish days: not measurable by the bot.

**What gates the played 11.** Winter Foraging opens on day 85 and is the last
one done (day 94 to 99), so the played set cannot finish before about day 86 in
year 1. Autumn Foraging (median 68 to 75) and the Woodland bundle (65) follow the
calendar too. The 15 unplayed others are on the same calendar: Water room fish
and the Fodder, animal and cooking bundles all want gear, animals or a season
the bot lacks, so a human player almost surely opens the Last Seat after day 99.

**The Last Seat's long pole, from the data (not the sim).** Quantities are in
`bundles.json`. Ore for a bar is 5 ore and 1 coal (`ore.ts`).

- 30 bars across The Hearth Fire (10) and The Long Road (20): 150 ore and 30
  coal, plus smelting time. With the Mountain mine and one furnace this is the
  largest single stock.
- 100 wood and 100 stone (Long Road): bulk gathering; the Woodland bundle asks
  for 50 of each, so this is twice that again.
- 15 cloth (5 Hearth Fire, 10 Long Road): wool from sheep, a loom, so it waits
  on animals as well.
- The Catch: four fish, each gold quality, one per water (stream, lake, sea,
  night). Rod level and fishing skill gate gold, not the calendar.
- Harvest Feast: 3 meals, 3 preserves, 3 cheese, 3 honey: cheese and honey wait
  on a coop or barn and a bee house.

The Long Road has no 5,000g now (the stand-in note at the top of this file).

**Reading against the target.** If the played 11 finish near day 94 to 99 and the
other 15 take until about day 120 to 140, the Last Seat opens in year 2 spring
or summer, leaving about 30 to 50 days to the 168 day target for 30 bars,
100 wood, 100 stone, 15 cloth and four gold fish. That is tight but not
impossible for an expert. Casual play misses the target by a wide margin, as the
casual does for the first 11 alone. This is a guess, not a measurement.

**Number changes to choose from (none applied):**

1. **Cut the Last Seat stock.** Long Road to 60 wood, 60 stone, 12 bars, 6 cloth,
   and Hearth Fire to 6 bars. Total bars fall from 30 to 18, cutting the ore and
   smelting pole by 40 percent. Recommended if the hand-play shows bars are the
   wall.
2. **Soften The Catch.** Require gold for two of the four fish and silver for
   the other two. Keeps it the hardest bundle without tying the finish to
   luck on night and sea fish.
3. **Measure first.** Teach the bot to fish, keep two animals and run a bee
   house, then rerun for a real "all 26 others" day before changing any number.
   The sim cannot honestly answer the pacing question until it plays the Water
   room and the animal bundles.

### Rerun with the taught bot (2026-11-24, #181)

The bot now plays all 30 bundles with the real core rules: fishing with the bar
and the size roll (so quality is real), shellfish pots on the farm pond and the
sea, a coop and barn ladder (coop, hens, barn, cow, kitchen, big coop and duck,
deluxe coop and rabbits), hay by grazing, silo grass and bought bales, the
kitchen and stove, cheese press, loom, oil maker, dye vat and bee house, wheat
and root crops for the Fodder bundle, furnace bars for any metal, Forest trips
(forage, dig spots, wood), the mailbox and a daily call on the innkeeper for her
recipe, and the carpenter's lamps. `npm run sim -- <persona> 40 168`, 40 seeds,
168 days (6 seasons, the 1.5 year target).

**Result: no run of any persona finishes the hall, so the Last Seat never opens
and there is still no measured open or finish day.** This is a bot limit as much
as a pacing finding (below). What it measured:

| Persona | Runs that finish a room (of 40), median day | Bundles done at day 168 (best, from the per bundle lines) | Last Seat open, finished, all 30 |
| --- | --- | --- | --- |
| Expert | Foragers' Shelf 36, day 119; Larder 1, day 153; Guests' Board 3, day 119; Hearth, Water room, Last Seat 0 | 24 of 30 done in at least one run each: all 4 foraging, crops, fodder, storytellers, dyers; weakest Smith's 8 runs, Cook's 6, Host's 9, Specialty Fish 1 | 0 of 40, 0 of 40, 0 of 40 |
| Intermediate | Foragers' Shelf 28, day 96; Water room 1, day 84; the rest 0 | Smith's 19 runs, Animal Goods 7, Weaver's 3, Lamplighter's 1, Host's 1, Trap Catch 3 | 0, 0, 0 |
| Casual | none | only the first foraging bundles (22 of 40 for Spring Foraging) | 0, 0, 0 |

Bundles no run ever finished: expert, Lamplighter's, Trap Catch and all four Last
Seat bundles; intermediate, Artisan Goods, Cook's and the Last Seat. Medians run
to the 168 day cap, so a day near 168 means "barely".

**The long pole is money, then the bot's own farming, not the Last Seat's stock.**

- The herd ladder (coop 4,000, barn 4,000, kitchen 10,000 and 450 wood, big coop
  10,000, deluxe coop 20,000, rabbits 8,000 each for the 23 wool of the Weaver's,
  Hearth Fire and Long Road) is about 60,000g before any ore. The bot's money at
  the end of each season sat at 3,000 to 8,000 (expert medians 3,772, 7,632,
  7,045, 4,430), so it reached the big coop in some runs and the deluxe coop in
  none. Without rabbits there is no wool, so Weaver's, the cloth of Hearth Fire
  and Long Road, and Animal Goods (needs a duck egg or wool) stall.
- Dishes that need a letter (Cook's wants a third dish) and Host's (honey, wheat,
  egg, tea) are second: expert finished Cook's in 6 of 40 runs, Host's in 9.
- Time is the bot's limit too: it lost a median of 584 crops per expert run to
  watering skipped when fishing and Forest trips ran long, so income stayed low.
  A human player with sprinklers and a better farm would earn far more, so the
  money figure is a bot floor, not a measure of the design.
- Water room: most single fish bundles finish by day 40 to 65 in 17 to 36 of 40
  expert runs, but Specialty Fish (rare fish and the Pearl Lobster) and Trap
  Catch (five shellfish, two of them salt) almost never finish. Storytellers
  (digging) finished in 39 of 40 expert runs by about day 60.
- Gold quality for The Catch was never reached because the room did not open, so
  that bundle is still unmeasured.

**What the bot still cannot do:** use sprinklers or a greenhouse, take up the
villager gifts beyond the innkeeper, set more than five pots, fight in deeper
mine floors for ore (it buys ore from the smith), use the Cove, candles for the
Lamplighter's (it tries lamps and oil), hear the shop hours (it ignores them),
or tune a day when the herd, the fish and the farm all want the same hours. The
bundle gathering for the Last Seat starts only when 8 other bundles are left, as
a player stocks up late.

**Number changes to choose from (none applied; the numbers above do not yet say
the Last Seat is too big, only that the herd money is the wall):**

1. **Cheaper wool path.** Let the Weaver's and the cloth of the Last Seat take
   wool from the barn's sheep at the big barn (tier 2, 10,000g) instead of the
   deluxe tier, or cut wool needs from 23 to about 14 (Weaver's 5 wool, Hearth Fire
   3 cloth, Long Road 6 cloth). This removes the 30,000g deluxe step from the long
   pole. Recommended first, since the bot never got past the big coop.
2. **Lower the Last Seat bulk as well** (Long Road 60 wood, 60 stone, 12 bars, Hearth
   Fire 6 bars). It was never reached, so this is a hedge, not a response to data.
3. **Teach the bot sprinklers and rerun before changing numbers.** The farm lost
   hundreds of crops to missed watering; a bot with sprinklers would earn much
   more and show whether the 60,000g herd is out of reach for a good player.
   Recommended with option 1: the next run should measure the Last Seat, which
   this one could not.

### Rerun with sprinklers (2026-11-24, #181, option 3)

The bot now builds and uses sprinklers with the real rules (`scripts/sim/bot.ts`,
`tendSprinklers`, `placeSprinklers`). The recipe is Farming level 2 and one copper
bar plus one iron bar; the quality one is level 6 and needs a gold bar and a
quartz crystal. The bot queues a sprinkler when crops stand out of reach (one per
four crops), buys the ore and coal for its bars first (the furnace takes one bar
at a time, so this is slow), crafts it, stands it where it waters the most dry
soil, and plants on watered tiles first. It swaps a basic for a quality one when
it holds one, but quartz only comes from mine rocks and the bot does not hunt it,
so it built no quality sprinklers in practice. The casual persona has no furnace
and so builds none. Same settings as the last run: `npm run sim -- <persona> 40 168`.

**Result: still no run of any persona finishes the hall, so the Last Seat never
opens, and the sprinklers did not move the pacing.**

| | Expert | Intermediate | Casual |
| --- | --- | --- | --- |
| Sprinklers at day 168 (median) | 14, first on day 39 | 6, first on day 49 | 0 |
| Withered crops a run (median), before and after | 584 to 505 | not recorded to 216 | not recorded to 102 |
| Money at season ends 1 to 6 (median) | 2,690; 5,267; 9,142; 4,513; 9,431; 23,125 | 3,134; 4,158; 4,881; 3,637; 5,572; 7,609 | 2,906; 7,030; 6,239; 6,252; 7,750; 9,498 |
| Runs finishing Smith's / Cook's / Host's (of 40) | 3 / 3 / 5 | 0 / 0 / 0 | 0 / 0 / 0 |
| Hall finished, Last Seat open, Last Seat finished | 0, 0, 0 | 0, 0, 0 | 0, 0, 0 |

- **Money did not rise.** The expert's season 4 end was 4,513 against 4,430 before:
  14 sprinklers cost about 6,000g in ore and coal and many furnace hours, and that
  paid back about what it cost. Only season 6 shows a jump (23,125), too late for
  the herd ladder (about 60,000g) to finish. No persona got past the big coop.
- **The "crops lost to missed watering" figure was a misreading.** The report
  counts crops that wither when a season ends (`report.withered`), not crops dried
  out by a skipped watering. Sprinklers cut it only from 584 to 505 for the expert,
  so most are crops still short of ripe at the season turn (planted too late, or
  grown slowly by a dry day), not a watering failure. Not yet traced.
- **The sprinklers cost the Smith's bundle.** One furnace smelts one bar at a time.
  Sprinkler bars (2 each, about 28 for 14 sprinklers) now compete with the Smith's
  bars (5 copper, 5 iron, 3 gold) and the silo's copper. Even with the bot giving
  the hall every other day, the expert finished Smith's in 3 of 40 runs (8 before)
  and the intermediate in 0 (19 before). This is a bot tradeoff, but it shows the
  furnace, not only money, is a pole: bars for the hall, the silo and sprinklers
  all share one furnace and one 120 minute iron bar.
- **The new long pole is the same one, plus the furnace.** Herd money (about
  60,000g) is still the wall for wool, Weaver's, Animal Goods and the cloth of the
  Last Seat. Bars (one furnace) hold Smith's, Hearth Fire and Long Road. The bot
  still never reaches the Last Seat, so its stock and The Catch stay unmeasured.
- An unhelpful side effect of the bot's rules: the bot holds 600g back from seeds
  and the herd while a sprinkler's ore is unbought, and hands no queued bars to the
  hall. A human would also spend this way, so it is kept.

**Number changes to choose from (none applied):**

1. **Cheaper wool path (still recommended first).** Wool from the big barn's sheep
   (tier 2) or fewer wool in the Weaver's, Hearth Fire and Long Road. The sim now
   says sprinklers do not pay for the herd, so the herd money is the design
   question, not the bot. Removes the 30,000g deluxe step.
2. **Let a second furnace or a faster smelt in.** Iron bars take 120 minutes and
   gold 300 with one furnace. A second furnace, or halving smelt time, would free
   the Smith's bars and the sprinkler bars together. This touches the tuning
   numbers in note 07; needs the owner's call.
3. **Lower the Last Seat bulk** (Long Road 60 wood, 60 stone, 12 bars, Hearth Fire
   6 bars). Still a hedge: the room has never opened.
4. **Do not tune the bot further for pacing.** Two reruns now say the bot floor is
   near its limit, and the bot is not a good player at planning a day. Hand play
   decides. The remaining bot work, if wanted, is to trace the 505 withered crops
   (a season end planting cutoff), and to mine for quartz.

## Room rewards that did nothing (owner, 2026-11-12, #871)

- **Guests' Board:** +500 friendship with everyone met (Stardew, recalled, the saved
  Bulletin Board page does not confirm it). `rooms.json` must change from
  `hat-standing-boost` to it, and `Friendship.bundleBonus()` (built, never called) must be
  wired.
- **Hearth `carts` (decided 2026-11-12):** four reserved stops (town square, hall,
  farm, the Mountain's mine mouth, note 77), free, running from the morning after the
  room opens (Stardew's minecart opens the next day; its fare is not on the saved page).
  More stops join as the Quarry and Lake cove open. Needs the cart screen and a `cart`
  service kind on the maps.
- **Foragers' Shelf `herb-stall` (decided 2026-11-12):** Old Greencoat's stall at the hall
  sells a weekly rotating stock of herbs and forage plant seeds. Stock list and prices
  are open.
- Both of the last two are ours, with no Stardew equivalent. The glow ring (bundle 16) and
  Beach warp totem (bundle 15) placeholders are still to check.

### Built status (2026-11-12, #871)

Built: `src/core/roomrewards.ts`, `src/content/carts.json`, `src/content/herb-stall.json`, `CartScene`.

- **Guests' Board:** `rooms.json` now says `friendship-boost`. `payGuestsBoard` calls `Friendship.bundleBonus()` once (world flag `guests-board-paid`), when the hall scene finishes the last bundle, with a night catch-up for a room finished any other way.
- **Carts:** `carts-running` is raised the first night after the Hearth room is done (so they run the next morning, with a report line). `cart` services sit at the town square (66,58), beside the hall door in Hearthwell, on both farm maps, and on the Mountain road at (66,20). The cart screen lists the other three stops and rides for free. Before then the cart shows an idle line.
- **Herb stall:** a `herb-stall` service in the hall opens the shop screen once the Foragers' Shelf is done. Stock is 3 to 5 goods a week from `herb-stall.json` at 1.5 times sell value (the trader's markup, all placeholders).
- **Placeholders and gaps:** the mine mouth stop is below the rockfall, not in the pocket at (68, 13), since the pocket is cut off until the mines open and a cart there would skip it. Forage plant seeds are not built, so the stall sells herbs and forage only. Stop places other than the square, the cart fare for later stops (Quarry, Lake cove), and cart art are open.
