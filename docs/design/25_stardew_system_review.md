# 25 Stardew system review (step 1: the system list)

Status: **working draft, 2026-10-30.** Nothing here is decided. This is a list
of Stardew's systems laid against our own design, to show what we have covered,
what we have only half covered and what nobody has discussed. It is step 1 of a
review plan. Steps 2 to 4 (read the saved wiki pages one at a time, record the
gaps, choose what to design next) wait for the owner.

The "built" and "not built" words in the table are as of 2026-10-30 and are out of
date: most systems listed as not built (animals, monsters, boots, rings, fish and
tackle, four seasons, fruit trees) are built now. `03_milestones.md` holds the
current status.

The system names come from the wiki's main page index, which groups the game
into Basics, Farm, Environment, Gameplay, Items, the Valley and Beyond. The
notes are in our own words. No wiki text is copied here
(`docs/decisions/0002-stardew-valley-inspired.md`).

## How to read this

Status words:

- **Covered**: decided in a note, or built.
- **Partial**: some of it is decided, or a piece is missing.
- **Absent**: no note or code mentions it as a system.
- **Out**: excluded by the brief or an earlier decision.
- **Unclear**: a search found hints but no clear answer. Needs a closer look.

The "Our area" column uses the area names in `docs/overview.json`. The "Where"
column points at the note or code. The statuses come from a keyword search of
`docs/design/`, `docs/decisions/`, `src/` and the overview, plus the notes read
in earlier sessions. They are a first pass and the page-by-page reads in step 2
will correct them.

## Basics

| Stardew system | Our area | Status | Where, and what is missing |
| --- | --- | --- | --- |
| Getting started, player, controls | Platform and release | Partial | Browser and touch controls work. The real-tablet check is not done (#59). |
| Energy | Farming and the day | Covered | Built. `07_tuning_numbers.md`. |
| Health | Mines and gentle combat | Covered | One health bar shown only where health can be lost (`22_mines.md`). |
| Skills | Skills, tools and quality | Partial | Farming and foraging built. Fishing decided (`21_fishing.md`), combat skill drafted (`22_mines.md`). Level 10 professions not built. |
| Day cycle | Farming and the day | Covered | Built. |
| Inventory and backpack | Skills, tools and quality | Covered | Built, backpack upgrades in `07_tuning_numbers.md`. |
| Farm maps (several farm types) | Valley and town map | Gap, to design | Owner decision 2026-10-30: farm type choices will happen. We have one fixed farm (`19_valley_layout.md`). Which parts of the map are set and which are generated is open. |

## The farm

| Stardew system | Our area | Status | Where, and what is missing |
| --- | --- | --- | --- |
| Crops | Farming and the day | Covered | Built for two seasons. Autumn and winter crops are #61. |
| Selling and the shipping bin | Farming and the day | Designed | Owner decision 2026-10-30: add a shipping bin. Rules settled 2026-10-31 in `28_shipping_bin.md`. |
| Animals | Processing and animals | Covered | `23_animals.md`. Not built. |
| Fruit trees | none | Absent | Orchards are not mentioned anywhere. Tree growth over several days or seasons is a different loop from crops. |
| Artisan goods and machines | Processing and animals | Designed | Eight machines, craftable after the first bundle gift, cask later. `24_processing_and_cooking.md`, 2026-10-31. |
| Sprinklers, scarecrows, irrigation | none | Absent | No automation of watering or crop defence exists. The watering can has four tiers (`07_tuning_numbers.md`). This is the main way Stardew lets a farm grow past what one player can water by hand. |
| Fertilizer and soil quality | Farming and the day | Partial | Two fertilizers appear only as bundle items (`16_bundles.md`). The farming feature itself is not designed. |
| Farmhouse and upgrades | Customisation and hats | Partial | Furniture and decoration are in `10_customisation.md`. House upgrades (kitchen, extra rooms, child room) are mentioned in pieces only. |
| The farm cave | none | Absent | A first-year cave with a choice of produce is not mentioned. |
| Greenhouse | Village hall and bundles | Partial | It is a room reward in `16_bundles.md`. How it works is not designed. |
| Cabins and multiplayer | none | Later | Planned as M4, after M3 (`docs/decisions/0007-multiplayer-milestone.md`). Not designed yet. |

## Environment

| Stardew system | Our area | Status | Where, and what is missing |
| --- | --- | --- | --- |
| Weather | Seasons, weather, foraging | Covered | Built, with a forecast. |
| Seasons | Seasons, weather, foraging | Partial | Two of four built. Four are planned (#61). |
| Festivals | Festivals and minigames | Partial | Calendar in `14_festival_calendar.md`. Hat Parade first, minigame a stretch goal. |
| Monsters | Mines and gentle combat | Covered | `22_mines.md`. Not built. |
| Television | Seasons, weather, foraging | Partial | The forecast is covered, shown at the bed (`07_tuning_numbers.md`). The other uses (tips, recipes) are not mentioned. |

## Gameplay

| Stardew system | Our area | Status | Where, and what is missing |
| --- | --- | --- | --- |
| Villagers | Cast and villagers | Covered | 30 people, 14 candidates (`20_ring1_cast.md`). Names open. |
| Friendship | Friendship and marriage | Designed | Points, gifts, tastes and birthdays in `61_friendship_and_gifts.md`. Own tastes and heart events still to write. |
| Marriage | Friendship and marriage | Covered | `12_marriage.md`. |
| Children | Friendship and marriage | Covered | By player choice only (`12_marriage.md`). Child room upgrade open. |
| Quests, help-wanted requests | Dialogue and voice | Unclear | Hints only: the hermit's requests, the warden head's errands (`17_call_feedback_2026-10-28.md`). No request board or repeatable quest system is described. |
| Bundles and the community center | Village hall and bundles | Covered | `16_bundles.md`. Five bundles built, thirty designed. |
| Achievements and a completion total | Fishing and the water | Partial | Achievements and hats in `38_achievements.md`. The completion total is in `39_completion_total.md`. |
| Multiplayer | none | Later | Planned as M4, after M3 (`docs/decisions/0007-multiplayer-milestone.md`). Not designed yet. |
| Modding | none | Under discussion | Owner wants to discuss (2026-10-30). Content is data files, which helps. See "Modding, to discuss". |

## Items

| Stardew system | Our area | Status | Where, and what is missing |
| --- | --- | --- | --- |
| Tools | Skills, tools and quality | Covered | Built. A fifth tier is planned (#194). |
| Weapons | Mines and gentle combat | Covered | `22_mines.md`. |
| Hats | Customisation and hats | Covered | Portrait only in M3 (`13_m3_scope.md`). |
| Footwear | none | Designed | Boots with Defense and Immunity, `37_equipment.md`, 2026-10-31. Not built. |
| Rings (equipment) | none | Designed | Two ring slots and Stardew's ring list, `37_equipment.md`, 2026-10-31. Not built. |
| Foraging | Seasons, weather, foraging | Covered | Built for two seasons. |
| Fish, bait and tackle | Fishing and the water | Covered | `21_fishing.md`, checked against the Fish page 2026-10-31. Not built. |
| Cooking and recipes | Processing and animals | Designed | Kitchen with the first house upgrade, 81 recipes across three rings. `24_processing_and_cooking.md`, 2026-10-31. |
| Crafting (craftable items) | none | Partial | Machines and furnace are planned. The general craftable list is in `34_crafting.md`. |
| Trees and wood | Valley and town map | Partial | The axe fells a tree (`22_mines.md`) and there is a sawmill (`19_valley_layout.md`). Common trees, chopping, sap, seeds and regrowth are in `36_gathering_trees_sap_fiber.md`. Tapping and the sawmill are not. |
| Secret notes and books | none | Absent | A hidden-notes collection and skill books are not mentioned. |
| Artifacts and minerals | Mines and gentle combat | Partial | Geodes, gems and found things are covered in `22_mines.md`. Digging artifact spots on the surface and a place to donate them are not. |
| Museum | none | Absent | The valley has a library (`20_ring1_cast.md`) but no collection hall. The completion tracker may take this role. |
| Furniture, wallpaper, flooring | Customisation and hats | Covered | `10_customisation.md`. |

## The valley and beyond

| Stardew place | Our equivalent | Status | Where, and what is missing |
| --- | --- | --- | --- |
| Town (Pelican Town) | Hearthwell | Covered | `19_valley_layout.md`. |
| Clinic | Healer | Partial | A healer is listed (`09_story_and_lore.md`). Healing as a service is not described. |
| Corporate rival store | none | Absent | No antagonist business that competes with the hall. Probably intentional given our tone, but it is not recorded. |
| Saloon | Inn and kitchen | Covered | In the cast (`20_ring1_cast.md`). |
| Forest, Secret Woods, Beach | Valley areas | Covered | `19_valley_layout.md`. |
| Ranch (animal seller) | Carpenter and coop | Partial | The carpenter builds the coop and barn (`23_animals.md`). Who sells the young animals is not stated. |
| Traveling cart | none | Absent | A visiting rare-goods seller is not mentioned. The cart in `11_minigames.md` is a ride, not a merchant. |
| Wizard's tower | Hermit's tower | Covered | The hermit is a witch (`20_ring1_cast.md`). Tower design open (#178). |
| Fish shop | River delta fisher | Covered | `21_fishing.md`. |
| Mountain, quarry, mines | Mountain and mines | Covered | `22_mines.md`. |
| Adventurer's guild | Trainer and training dummy | Partial | A trainer is in the mines note. Selling monster loot there is not described. |
| Blacksmith | Smith dwarf | Covered | Tool upgrades, geode cracking (`22_mines.md`). |
| Spa, railroad, desert, casino, bus and warps | Ring 2 | Out for now | Ring 2 is open (#20). |
| Ginger Island style late region | Ring 2 | Out for now | Owner decided 2026-10-31: ring 2 is the counterpart. Ring 3 is unknown and may not happen at this scale. |
| Skull Cavern style dig | Ring 2 | Covered in intent | Owner confirmed 2026-10-30: it is a ring 2 feature (#20). Its design waits for the ring 2 note. |

## Things Stardew has that the wiki index does not list

Added from what we know of the game, so these need a source check too:

| System | Status | Note |
| --- | --- | --- |
| Pets | Absent | No farm pet is mentioned. |
| Horse | Designed | A stable and a horse, as in Stardew (owner, 2026-11-06). See `59_horse.md`. |
| Mail | Designed | A farm mailbox, next-morning delivery and a journal Mail section (`51_mail_and_letters.md`). The 2026-10-29 drop only covered the warden reveal. |
| Calendar board | Partial | The festival calendar exists. The in-world board is not described. |
| Dating events and gift tastes | Partial | Gift rules in `61_friendship_and_gifts.md`. Events and each person's tastes open. |

## Owner decisions, 2026-10-30

- **The gaps below are added to the game.** Each gets a design note before any
  build, as `CLAUDE.md` requires. The first pass at the list was "for
  discussion"; it is now the to-design list.
- **A shipping bin is added.** Rules are in `28_shipping_bin.md`.
- **Farm type choices are added.** The player picks one of several different
  farms at the start, each with its own layout and theme. The three exits to the
  valley are the fixed part on every farm. The house and the pond are not
  fixed. Which parts of the wider map are set and which are generated is being
  settled area by area, in the Stardew way (some parts fixed).
- **The valley and village are fixed**, the same on every farm type. Only the
  farm differs. Clutter (weeds, stones, twigs) is placed at the start of each
  season, as in Stardew.
- **Farm type layout:** each type is a hand-authored map with fixed starting
  clutter, as in Stardew (checked against the Farm Maps page, `30_farm_types.md`; full note in
  `32_farm_types.md`).
- **Farm type count:** two in the first version, about six in the long run.
  More types give replay value and a theme each, but cost map authoring, balance
  work and a rule for every system that assumes a pond or house position. Build
  the farm as data (a map plus a list of rule changes) and add types one at a
  time.
- **Farm trade-off (Stardew's, from the Farm Maps page):** the Standard farm has
  the most farmland. Every other type has less, in exchange for a perk tied to
  one activity.
- **First version:** the Standard farm plus a Woodland farm (foraging, which is
  already built). Long-run list, a first sketch: Standard, Riverside (fishing),
  Woodland (foraging), Hilltop (mining), Meadow (animals).
- **Hilltop yes, Wild no.** A Hilltop farm has a small daily quarry. No farm
  spawns monsters, so the mines' no-creatures setting needs no special case.
- **Each farm type has a rule of its own**, leaning toward an activity (more
  water for fishing, more wild land for foraging). The hall bundles stay
  completable on every farm.
- **Modding: keep it in mind, build nothing.** No loader, pack format or script
  support. Keep content in clean data files so modding stays possible later.
- **Skull Cavern is a ring 2 thing.** Earlier listed as unclear in error.

## What stands out

These are the gaps that look biggest from a game-level view, in no order. All
are now on the to-design list (see the decisions above), together with the
shipping bin and farm types.

1. **Farm growth tools** (sprinklers, scarecrows, fruit trees, fertilizer,
   greenhouse). Designed 2026-10-31 in `31_farm_growth.md`. Built since, except decorative scarecrows.
2. **A general crafting list**, beyond the eight machines.
3. **A collection hall or museum**, tied to the completion tracker (#196).
4. **Request and quest system**, and whether there is a request board.
5. **Equipment slots** (footwear, rings), designed in `37_equipment.md`.
6. **Visitors and surprise** (traveling cart, pets), the small things that make
   a year feel alive.

## Order of the design notes (agreed 2026-10-30)

One note at a time, each settled with the owner before the next.

1. **Farm note.** Shipping bin, sprinklers and scarecrows, fruit trees,
   fertilizer, greenhouse and farm cave. These change the core loop, so they are
   designed together.
2. **Farm types note.** Needs the owner's answer on what is fixed and what is
   generated (the brief lists generated content as out of scope).
3. **Crafting list**, alongside `24_processing_and_cooking.md`.
4. **Collection hall and quests**, tied to the completion tracker (#196). Whether
   there is a request board belongs here.
5. **Equipment slots, visitors and pets.**

Modding is a separate discussion. Starting point: keep the data schemas clean so
data-only mods are possible later, and defer any loader or script support.

## Next steps (from the plan)

- Step 2: read the saved pages one at a time and compare. Order proposed:
  farm and economy, people, calendar, goals, combat, fishing.
- Step 3: keep a running gap list in this note, tagged build it, design it or
  skip it, with the owner's decision beside each.
- Step 4: choose what to design next, and update the handoff.
