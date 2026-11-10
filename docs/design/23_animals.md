# 23 Animals

Status: **decided with the owner on 2026-10-30**, in two rounds of questions.
The species, buildings and professions are settled. The numbers under "Placeholder
numbers" are our draft and are listed under "Open". Every number is a
placeholder. Only the slices under "Built" below are built. Stardew facts
were checked against the Stardew Valley Wiki "Animals" page on 2026-10-30.

## Built, slice 1 (2026-11-08, #531)

A small vertical slice is built (`src/core/animals.ts`, `CoopScene`, `coop.json`):
the base coop, chickens only. Everything else here is still unbuilt.

- **Coop.** The carpenter builds it (placeholder 4000g, 300 wood, 100 stone, 3
  days, one carpenter job at a time with the house). It stands on the farm map
  at a fixed site (6 by 3 tiles, door bottom row, second tile) and opens as the
  11 by 8 base interior, door bottom left, feeding bench on the back wall. It
  lands overnight with a morning report line. Holds 4.
- **Chicken.** Bought young at a placeholder carpenter row (800g) because the
  Forest keeper does not exist yet. Named by the player (a text prompt for now,
  default names if left blank). Grows up in 4 fed days. An unfed chick does not
  grow, a new chick needs nothing the first night.
- **Care.** Feed all from the silo, pet (once a day), let out (clear days, not
  winter), collect eggs. Friendship 0 to 1000, mood 0 to 255, starting at 0 and
  128. Petting +15 and +32 mood, grass +8 and full mood, unfed -20 and -100 mood
  at night, unpetted -10 and -30, slept outside halves mood and loses the egg
  only. A grown, fed hen in the coop lays one egg a night, chance mood / 70
  under 70 mood. Quality: silver over a score of 0.5, gold over 0.75, normal
  below 150 mood (`animalQuality`). An uncollected egg waits.
- **Hay.** Silo of 240, filled by cutting weeds (2 hay each, once a coop
  stands), since there is no scythe or grass tile yet. The carpenter sells 10
  hay for 500g as the backstop.
- **Saves.** `animals` field, absent in old saves (no coop).
- **Left out of slice 1** (slice 2 below builds the tiers, duck, rabbit and
  auto-feeder): other species, the barn, incubator, heater, big and
  deluxe tiers (the coop interior does not grow yet, #531), professions,
  auto-collect, spouse feeding, the keeper, the Meadow start coop (the Meadow
  farm type is not built), a real scythe and grass, hearts art and animal art
  (animals are blocks), per animal interaction on the map (the bench opens a
  list).

## Built, slice 2 (2026-11-08, #531 coop half)

- **Tiers.** The carpenter upgrades the coop to big (10000g, 400 wood, 150 stone)
  and deluxe (20000g, 500 wood, 200 stone), 3 days each, placeholders. One job at
  a time with the house and any coop work. It lands overnight, the outside
  footprint never changes. Holds 4, 8 and 12. The interior is one map that grows
  right to 15 and 22 wide (note 68): animals and the bench keep their tiles,
  unbuilt space is black void, the camera clamps. Slots 5 to 8 stand on the big
  tier's new tiles, 9 to 12 on the deluxe tier's.
- **Species.** Duck (big coop, 1200g, egg every 2 fed nights, a feather instead
  of the egg 25 percent of the time at 4 hearts or more) and rabbit (deluxe coop,
  8000g, wool every 4 fed nights). A night outside resets the clock. The
  carpenter placeholder row sells each species once its tier is built. Save
  loading drops a species the saved tier does not open.
- **Auto-feeder.** At the deluxe tier the night tick feeds everyone inside from
  the silo (hay still runs out). Drawn as a grey chute on the back wall.
- **Left out:** the incubator (built in slice 3), the heater, professions, the
  barn (built in slice 3).

## Built, slice 3 (2026-11-08, #531 barn half)

- **Barn.** The carpenter builds and upgrades it like the coop (same
  placeholders: 4000g, 300 wood, 100 stone, then big 10000g, 400 wood, 150 stone
  and deluxe 20000g, 500 wood, 200 stone, 3 days each). One carpenter job at a
  time across house, coop and barn (`build.building` names which). It stands on
  the farm at a fixed site (7 by 4 tiles, door bottom row, fourth tile) and
  opens as one growing interior, 17, 21 and 24 wide by 13 deep (note 68). It
  holds 4, 8 and 12, counted apart from the coop. The silo and hay are shared.
- **Species.** Cow (base barn, 1500g, milk every fed night), goat (big barn,
  4000g, goat milk every 2 fed nights), sheep (deluxe barn, 8000g, wool every 3
  fed nights) and pig (deluxe barn, 16000g, a truffle on each fed night it was
  let out). Opening tiers follow the "Placeholder numbers" table below (cow at
  the base barn); the species table above said "Big barn" for the cow, which
  would leave the base barn with nothing to sell, so the cow opens at the base.
- **Moonwool.** A sheep at friendship 800 or more, fed and at 70 mood or more,
  has a 5 percent chance on a night it makes wool to leave one Moonwool beside
  it (sells 1200g, placeholder). Friendship tops out at 1000 here (5 hearts), so
  the "8 hearts" of the 2026-11-06 decision is read as 8 of 10, which is 800.
  Taking the wool takes the Moonwool too; a full pack keeps it waiting.
- **Pig.** Needs to be let out on a clear day outside winter (the existing
  let-out rules), and brought in before night: a pig left out overnight finds
  nothing, as for other products. None in rain or winter.
- **Auto-feeder.** At the deluxe barn the night tick feeds every barn animal from
  the silo, as for the deluxe coop.
- **Stall wing.** Built in the bottom left as a small walled alcove with straw,
  cosmetic only (SC-69), at every tier.
- **Incubator.** Comes with the big coop, one egg at a time. Put a chicken egg
  or duck egg of any quality in from the bench screen (it is a bench row, not a
  tile on the map yet). It hatches after 6 nights into a young chicken or duck,
  named by default (rename at the bench). With no room in the coop it waits and
  the morning report says so. The Coopmaster's half time is not built.
- **Bench screen.** `BarnScene` is the coop bench screen for the barn's animals.
- **Left out:** the heater, professions, auto-collect, per-animal map
  interaction, sheep regrowing wool a day sooner at high friendship, the keeper
  selling animals, animal art.

## Why

Bundles 11, 25 and 27 already assume animal goods and a coop, and the loom, the
cheese press and the dyer need wool and milk (`16_bundles.md`). The neglect rule
is written (`09_story_and_lore.md`). The animals' farmstead and its keeper sit in
the Forest (`19_valley_layout.md`, `20_ring1_cast.md`). This note settles the
animals before any code, so they do not feel bolted on.

## Decided with the owner (2026-10-30)

- **Exception, the Meadow farm.** It starts with a built coop and two chickens,
  skipping the carpenter and keeper for the first coop only
  (`32_farm_types.md`).
- **Buildings stand on the home farm.** A coop and a barn, each upgradable, and
  an upgrade never changes the building's footprint (`41_house.md`). A
  carpenter in Hearthwell builds and upgrades them (an existing cast member,
  see "Cast"). The Forest farmstead keeper sells animals and gives advice (built 2026-11-09, note 72: young animals, hay and a line of advice; the carpenter no longer sells them).
- **Care is Stardew-like:** feed, pet, let out.
- **Products come on a timer per species.** Auto-collect can come later, not in
  the first build.
- **Hay comes from grass and a silo.** No treats: grain and root crops do not
  raise mood. Bundle 25 (Fodder) stays as written, because its items are goods
  to hand in, not feed.
- **Winter needs the coop heater to keep mood up,** as in Stardew. The heater is
  the bundle 25 reward.
- **A spouse feeds hay only.** You still pet, let out and collect.
- **Animal professions follow Stardew's tree** (see "Professions").
- **No animal of our own in the first build.** The slot is left for the art
  pass (#58).
- **Animals are bought young and grow up, and an incubator hatches eggs.** Same
  system as Stardew.
- **Animals are named by the player and show a heart meter.**
- **Left outside at night, an animal sleeps outside.** The door stays shut. It
  costs mood and the next day's product, nothing else. It costs no friendship.
  No animal is ever lost or hurt.

## What Stardew has (checked against the wiki, 2026-10-30)

| Building | Animals | Products |
| --- | --- | --- |
| Coop, 3 tiers | Chicken, duck, rabbit, plus incubated void chicken, dinosaur, golden chicken | Egg daily, duck egg every 2 days, wool every 4 days |
| Barn, 3 tiers | Cow, goat, sheep, pig | Milk, goat milk, wool every 3 days, truffles on clear non-winter days |

- Friendship runs 0 to 1000 (5 hearts). Petting is +15, milking or shearing +5,
  outdoor grass +8. At day end, not fed is -20, trapped outside is -20, and not
  petted is -5 to -10. Mood runs 0 to 255.
- Mood: petting +32 to +36, outdoor grass sets it to 255, not fed -100, not
  petted -20 to -40, slept outside halves it. Rain and winter outdoors, and
  outdoors after 7pm, drain it.
- A fed animal with under 70 mood may make nothing (chance is mood / 70). Quality
  and large products need 150 mood or more, with some chance below that.
- Quality score is friendship / 1000 - (1 - mood / 225). Large products need 200
  friendship. Duck feathers and rabbit's feet also use daily luck.
- Sheep regrow wool every 3rd day, fed and at 70 mood or more, and every 2nd day
  at 900 friendship. Pigs find truffles only when let outdoors, so none in winter
  or rain.
- Hay goes on a bench, with a silo behind it and an auto-feeder at the deluxe
  tier. Animals prefer fresh grass, and stay in when it is winter or wet. Newly
  arrived animals need no feeding on the first day, and babies who go unfed do
  not grow.
- Stardew loses an animal only when it is trapped outside with the doors closed,
  and then only on a random night event. We do not copy that.
- Stardew also has ostriches, golden animal crackers and optional pregnancy for
  barn animals. We take none of them for now.

## Animals

Seven species, in two buildings. Prices and days are placeholders.

| Animal | Building | Product | Days between |
| --- | --- | --- | --- |
| Chicken | Coop | Egg | 1 |
| Duck | Big coop | Duck egg, feather at high friendship | 2 |
| Rabbit | Deluxe coop | Wool | 4 |
| Cow | Big barn | Milk | 1 |
| Goat | Big barn | Goat milk | 2 |
| Sheep | Deluxe barn | Wool | 3 |
| Pig | Deluxe barn | Truffle, when let out (not winter or rain) | 1 |

- **Cut:** void chicken, dinosaur and golden chicken. They are secret finds and
  belong with the completion tracker (#196).
- **Why these:** eggs feed bundle 11, milk feeds the cheese press, wool feeds the
  loom and dyer (bundle 23), and truffles need a processing machine for the
  processing note.
- **A valley animal of our own** is wanted for the setting's own character. It is
  optional and not designed here.

## Buildings

- **Coop and barn, three tiers each**, after Stardew: base, big, deluxe. Each tier
  raises capacity and unlocks more species. The deluxe tier adds an auto-feeder.
- Capacity per tier, prices and build times go in `07_tuning_numbers.md`.
- The incubator comes with the big coop.
- Building runs through the keeper or the carpenter. Who builds is open.

## Care loop

Daily, in the morning and evening:

1. **Feed.** Hay goes on the bench. Grass-fed hay fills the silo.
2. **Pet.** Petting adds friendship and mood.
3. **Let out.** An animal outside on grass on a clear day eats free and gains
   mood.
4. **Bring in, close up.** The evening choice. An animal left out sleeps out.

Neglect follows the written rule:

- Unfed animals make nothing that day.
- Unpetted animals lose a little friendship and mood. Left-out animals lose mood
  only. Both lower product quality.
- Nothing is removed, nobody scolds, nobody gets angry. Animals cope with a few
  days of absence (`01_system_map.md`).

## Products and quality

- Each species has its own timer. Quality tiers follow friendship and mood and
  reuse the existing quality system.
- High friendship and mood give a chance of a large or rare product, such as the
  duck feather.
- **Moonwool (decided 2026-11-06, name a placeholder).** A sheep at friendship
  of 8 hearts or more, fed and at 70 mood or more, has a small daily chance
  (placeholder 5 percent) to leave one Moonwool beside its normal wool. It is
  the rare animal product and a universal gift love
  (`61_friendship_and_gifts.md`). It sells high, is never bought, and is not a
  bundle item. Quality follows the sheep's, as for other products.
- The first build collects by hand. Auto-collect is a later upgrade.

## Feed and the silo

**Decided with the owner on 2026-11-08 (supersedes the lines below where they
differ; built the same day).** Slices 1 to 3 gave a free silo of 240 and a hay count.
That was wrong. The design is Stardew's, checked against the saved Silo page:

- **Hay is a pack item.** The carpenter sells it (10 bales for 500g, placeholder).
  It takes pack slots and stacks like any good. There is no hay count outside the
  pack until a silo stands.
- **No silo at the start.** Feeding without one: stand at the feeding bench and
  drop hay from the pack, one bale per animal (our choice, Stardew's no-silo
  feeding was not checked).
- **The silo is a farm building** the carpenter sells and builds. Stardew: 100g,
  100 stone, 10 clay, 5 copper bars, 3 by 3, 2 days, holds 240, several allowed
  and their capacity adds up. Our materials follow Stardew. Clay turns up when tilling
  soil (Stardew's Hoe page: tilling may yield it; 3 percent a tile, placeholder).
  The silo stands at a fixed site on the farm until note 60 (#611) lands, one
  silo for now.
- **A silo adds a hay hopper** inside each coop and barn. The hopper feeds the
  bench from the silo, wherever it stands. The deluxe auto-feeder keeps feeding
  from the silo as built.
- **Filling a silo:** click it while holding hay, or click a hopper while
  holding hay. Cutting grass with the scythe adds hay to the silo, 50 percent of
  the time with the basic scythe (Stardew).
- **No free hay before the scythe.** Remove the weed-cutting hay (2 per weed).
  Until grass and the scythe exist, hay is bought only (owner, Stardew).
- **Building placement** (note 60, #611) covers where the silo stands.

- Cutting grass with the scythe fills the silo with hay. The keeper sells hay as a
  backstop.
- The silo holds hay for winter and rain, when there is little grass.
- No treats. Grain and root crops are not feed. Bundle 25 uses them only as goods.

## Young animals and the incubator

- Young animals are bought from the keeper, and grow into adults in a few days.
  They make nothing until grown.
- Eggs hatch in the incubator, as in Stardew (about six days there).
- Animals do not breed on their own.

## Names and hearts

- The player names each animal when it arrives.
- Friendship shows as hearts, up to five. The meter shows only on the animal's
  own card, not in the main interface.
- A few lines per species in the voice sheet style are possible later, not
  settled here.

## Professions

Decided with the owner: Stardew's tree. Checked against the Stardew Valley Wiki
"Skills" page (saved by the owner on 2026-10-30).

- **Level 5, farming:** Rancher (animal goods sell for 20 percent more) or Tiller
  (crops sell for 10 percent more). Agriculturist moves to level 10.
- **Level 10, under Rancher:** Coopmaster (befriend coop animals faster, coop
  goods are better quality, the incubator takes half the time) or Shepherd
  (befriend barn animals faster, barn goods are better quality, sheep regrow
  wool a day sooner).
- **Level 10, under Tiller:** Artisan (artisan goods sell for 40 percent more) or
  Agriculturist (crops grow 10 percent faster).
- This needs a level 10 choice, which `professions.ts` does not have yet. Today
  the farming choice is Tiller or Agriculturist at level 5, so building this
  changes that file, its tests and the skills screen. Artisan needs the
  processing note.

## Cast

The carpenter is already on the cast list (`20_ring1_cast.md`, the carpenter
household, deep tier, runs the sawmill). The carpenter now also builds and
upgrades the coop and barn. The farmstead keeper sells animals, hay and the
incubator eggs. No new cast slot is needed.

## Placeholder numbers

Our draft, to be tuned in playtests and copied into `07_tuning_numbers.md`.

| Building | Tier | Holds | Opens |
| --- | --- | --- | --- |
| Coop | Coop | 4 | Chicken |
| Coop | Big coop | 8 | Duck, incubator |
| Coop | Deluxe coop | 12 | Rabbit, auto-feeder |
| Barn | Barn | 4 | Cow |
| Barn | Big barn | 8 | Goat |
| Barn | Deluxe barn | 12 | Sheep, pig, auto-feeder |

- Each tier costs money and wood and stone, and takes a few days to build. Prices
  start near Stardew's and are rebalanced to our economy: coop 4000g, big coop
  10000g, deluxe coop 20000g, with the same for the barn. Animals cost 800g
  (chicken) to 16000g (pig), as in the table above.
- Tiers open with money and materials only. No hall gating yet.
- The keeper sells whichever species the owned building can hold, so each tier
  opens its animals.
- Young animals grow up in about 4 to 5 days. The incubator hatches in about 6.

## Open

- Prices, wood and stone costs, build times and the grow-up days are
  placeholders to rebalance. Animal prices need checking against bundle rewards
  (`16_bundles.md`, "Open questions", issue #201).
- Whether the carpenter also builds other things (the silo, the stable, a fish
  pond).
- The level 10 tier of professions: the choice screen, the file change, and how
  it ties to the processing note for Artisan.
- Whether pigs also need rain and winter rules beyond "let out" in the code.
- Whether the keeper or the carpenter sells the silo. The carpenter does until the keeper exists (2026-11-08).
- Clay's chance and sell price (20g, Stardew's, unchecked). Several silos wait for #611.
- The scythe and grass tiles (a prerequisite for grass hay).
- A valley animal of our own, with the art pass (#58).
- Whether hall gating belongs on the deluxe tiers.
