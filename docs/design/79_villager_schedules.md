# 79 Villager schedules

Status: **decided with the owner on 2026-11-10.** Names, birthdays and age
bands are set too (see "Next"). **Built (#599, `src/core/villagers.ts`, `src/content/villagers.json`, `tests/villagers.test.ts`):** the routes, rain and weekday and season layers, shop hours and where-at. Not built: festival and spouse route layers. It feeds #599 (slice 4
of `33_build_order.md`), alongside `20_ring1_cast.md` (who), `61_friendship_and_gifts.md`
(talk and gifts) and `77_hearthwell.md` (the places).

## Why

Notes 20, 61 and 62 settle the cast, friendship, gifts and heart events. No note
said where people are during a day. This note sets the rules, so the schedule
data and the walking code can be written once.

## Decisions

Where an option was Stardew's, it is marked. Stardew behaviour is from memory
and unchecked (register rows SC-106 to SC-111 in note 54).

1. **Per-person routine of timed stops (Stardew).** A stop is a time, a place
   and an idle action. A day is a list of stops, and the person walks between
   them. Stops are written as data under `src/content/`.
2. **Overrides by weekday, season, weather and festival (Stardew).**
   - A **default route** per person, plus **weekday overrides** for the people
     who need them.
   - **Season overrides** where a person suits one (the fisher in winter, for
     example). Others share one route all year.
   - **A separate rain route per person**, authored by hand (not a default
     rule). Storm days use the rain route.
   - **Festival days:** each person keeps their normal day until the festival
     hours, then stands at their festival spot (note 14), and goes back
     afterwards. Shops are shut during festival hours.
3. **Seven named days, Monday to Sunday (Stardew).** The 28-day season is four
   weeks. This settles the open week question in note 61. Day names appear on
   the calendar and the HUD. Weekday overrides and shop closed days use them.
4. **Shops keep hours and close one day a week (Stardew).** Each Hearthwell shop
   has set opening hours and one closed weekday, different per shop. The keeper
   goes home after closing. The closed day is data per shop and is shown on the
   shop door and in the Social tab entry for its keeper.
5. **Night: everyone is home and asleep, doors locked (Stardew).** Interiors
   shut after the bedtime for that home. The player cannot enter another home at
   night. The player's own farmhouse is never locked.
6. **People outside Hearthwell visit town on set days (Stardew).** Each area
   resident has one or two weekly Hearthwell trips written into the weekday
   overrides. On those days their home area has no one in it. The Social tab
   entry shows the weekday of the trip once the person has been met.
7. **Heart level does not change the route, except by marriage (Stardew).** A
   heart event never switches a route (note 84). A spouse moves to the farm with a
   spouse route built from their old one (`12_marriage.md`, note 84).
8. **Where someone is, in the Social tab: a rough "last seen" area.** For each
   person met, the tab shows the area where they were this morning, never the
   exact spot. (Not Stardew, which has no help.)
9. **No off-screen walking.** When the player enters an area, each person who
   belongs there is placed where their schedule puts them at that time, then
   walks on from there. The "last seen" line reads the same function. Pure
   function of person, day, weather and time, in `src/core/`, unit tested.
10. **Blocked paths: wait a moment, then step around.** If the way is still
    blocked after the wait, the person skips to their next stop. Nobody gets
    stuck.
11. **Talking to a walker (Stardew).** The person pauses while the player talks,
    then resumes. The tap area on a moving person is generous (tablet), but
    this does not change the pause rule.

## Shop hours (decided with the owner on 2026-11-10)

The day runs 6:00 to 26:00 (2 am). Checked against saved Stardew shop pages
(SC-107): a shop has counter hours and longer building hours, closes on a fixed
weekday, shuts on festival days, and the closed day of Pierre and Clint ends
after the Community Center. Rules, each the Stardew way (owner):

1. **Counter hours and door hours differ.** The keeper leaves the counter at
   closing and goes home. The door stays open until the door time, so the player
   can walk in and look but not buy. After door time the interior locks (rule 5).
2. **One closed weekday per shop.** The door and the Social tab entry show it.
   Festival hours shut every shop (rule 4 of "Decisions").
3. **Rain opens some shops on their closed day (mixed by shop):** the sawmill
   and carpenter, the delta fisher and the Forest keeper. Every other shop stays
   shut on a rainy closed day.
4. **The general store and the smithy open every day** once the last ring 1 hall
   project is done (the Stardew "Key to the Town" case). Others keep their day.
5. **Area counters:** the Forest farmstead and the delta fisher have hours and a
   closed day. The Mountain forge, the Beach elf's stall and the Quarry dwarf
   are open daily with long hours, and stand at the counter by their route.

Draft table (numbers are placeholders, changed in data, not code):

| Place | Counter | Door open until | Closed | Opens in rain |
| --- | --- | --- | --- | --- |
| General store | 9:00 to 17:00 | 21:00 | Wednesday | no |
| Smithy | 9:00 to 16:00 | 19:00 | Friday | no |
| Sawmill and carpenter | 9:00 to 17:00 | 20:00 | Tuesday | yes |
| Hatter | 10:00 to 17:00 | 19:00 | Sunday | no |
| Library | 10:00 to 18:00 | 20:00 | Monday | no |
| Healer | 9:00 to 17:00 | 20:00 | Saturday | no |
| Inn and kitchen | 12:00 to 24:00 | 24:00 | Thursday | no |
| Outpost post counter | 8:00 to 18:00 | 20:00 | Sunday | no |
| Forest farmstead | 9:00 to 16:00 | 18:00 | Monday | yes |
| Delta fisher | 9:00 to 17:00 | 17:00 | Saturday | yes |
| Mountain forge | 9:00 to 19:00 | none | daily | n/a |
| Beach elf's stall | 10:00 to 18:00 | none | daily | n/a |
| Quarry dwarf | 8:00 to 20:00 | none | daily | n/a |

The Long Table has no fixed hours: the reeve opens it for hall business. Closed
days are spread so that no weekday has more than two Hearthwell closures.
Data: a `hours` block per counter (`open`, `close`, `doorClose`, `closedDay`,
`rainOpen`, `dailyAfterHall`), read by one pure function with the weekday and
weather, unit tested.

## Data shape (to build)

- One entry per person: `default` route, `weekday` overrides keyed by weekday,
  `season` overrides, `rain` route, `festival` spot and `home` place with a
  bedtime.
- A route is an ordered list of stops: time in game minutes, place id (an area
  and a spot from the map files or an interior door) and an idle action key.
  Placeholder art has no poses, so the idle action is a string that does
  nothing until art exists.
- Place ids come from `77_hearthwell.md` and the area notes (71 to 78) and the
  interiors in `58_interiors.md`. A test checks that every place id exists.
- Selection order for a day: heart-event or spouse route, then festival,
  then rain, then weekday, then season, then default. Tested as a table.

## Writing load

Per-person rain routes and weekday and season overrides are the biggest data
cost: 30 people. The fixes are the same as for dialogue (note 18): write the
default route and the rain route for everyone first, then weekday and season
overrides in layers, with a test that a missing override falls through to the
default. Children and retirees get short routes.

## Settled names (do not change)

Checked on 2026-11-10 against notes 09 and 20, the ADRs and `src/`. Any name
draft must keep these, and must not reuse them or sit close to them:

| Name | Who | Where decided |
| --- | --- | --- |
| Rosmarin | The hermit witch (the Wizard's own name, Rasmodius, is a separate, recalled one, SC-101) | note 09, 2026-11-09 |
| Old Greencoat | The Wanderer. The valley folk's name for him, no personal name yet | note 09, 2026-10-27 |
| Aldreth | The courier, the warden head (heard at stage 4). Her ring 1 alias is Lane | ADR 0013, 2026-11-09 |
| Surt, "the Smoulderer" | The ring 2 antagonist, not a villager | note 09, 2026-10-27 |
| Thimblemoss | The player's family name | note 09, 2026-10-27 |
| Oriel | The player's relative | note 09, 2026-10-27 |
| Dilly | The Forest animal keeper (F, halfling, candidate) | owner, 2026-11-10 |
| Korvi | The Mountain smith dwarf (F, candidate) | owner, 2026-11-10 |
| Marl | The Mountain stonekeeper dwarf (M, candidate) | owner, 2026-11-10 |
| Rundahl | The Wanderer's personal name (M, wizard), heard late. Valley folk still say Old Greencoat. Mimir and its variants are ruled out (owner) | owner, 2026-11-10 |
| Thalwen | The Beach sea elf (F, candidate), replaced Ondrel (too close to Oriel, so Ondrel is out) | note 09, 2026-11-09 |
| Maren | The Mines trainer (F, human, candidate) | owner, 2026-11-10 |
| Rushie | The delta fisher (F, halfling, candidate) | owner, 2026-11-10 |
| Bramwell | Hearthwell smith (M, halfling, candidate) | owner, 2026-11-10 |
| Hattie | Inn keeper (F, halfling) | owner, 2026-11-10 |
| Podge | Inn keeper's partner (M, halfling) | owner, 2026-11-10 |
| Pim | Inn keeper's child (F, halfling) | owner, 2026-11-10 |
| Odette | Store keeper (F, halfling) | owner, 2026-11-10 |
| Dorrie | Store keeper's partner (F, halfling) | owner, 2026-11-10 |
| Fitch | Store keeper's child (M, halfling) | owner, 2026-11-10 |
| Alder | Gardener (M, halfling, candidate) | owner, 2026-11-10 |
| Aurelle | Healer (F, elf, candidate) | owner, 2026-11-10 |
| Dunmar | Librarian (M, dwarf, candidate) | owner, 2026-11-10 |
| Tilda | Carpenter (F, halfling) | owner, 2026-11-10 |
| Rufus | Carpenter's partner (M, halfling) | owner, 2026-11-10 |
| Wren | Carpenter's child (F, halfling) | owner, 2026-11-10 |
| Cuthbert | Hall steward and postmaster (M, halfling) | owner, 2026-11-10 |
| Cordelia | Hat-maker (F, halfling, candidate) | owner, 2026-11-10 |
| Barnaby | Hat-maker's sibling (M, halfling, candidate) | owner, 2026-11-10 |
| Linnet | Young adult A (F, halfling, candidate) | owner, 2026-11-10 |
| Thistle | Young adult B (F, halfling, candidate) | owner, 2026-11-10 |
| Hester | Retiree A (F, halfling) | owner, 2026-11-10 |
| Walter | Retiree B (M, halfling) | owner, 2026-11-10 |
| Toby | Grandchild of the retirees (M, halfling) | owner, 2026-11-10 |
| Brimmers | The halfling hat folk (a people's name, not a surname) | note 09 |

Also off limits: Tolkien's dwarf and elf names and the Norse dwarf-name list
(note 09), and Stardew's villager names (ADR 0002).

## Next

1. **Names, in batches by place** (owner). Batch 1 (the Forest and the Mountain) is done, see "Settled names". Batch 2 (the Mines, delta and Beach) is done too. Batch 3 (all 21 Hearthwell people) is done too, so all 30 are named. The plan was: the Forest and the Mountain first,
   then the Mines, delta and Beach, then Hearthwell by household. Plain given
   given names only, distinct by race (owner, 2026-11-10: plain given names, no
   family names, so households are told apart by role and home, and "Brimmers"
   stays the people's name, not a surname). No ages shown, only age bands
   (child, young adult, adult, elder), and no ageing over the years.
2. **Birthdays**: done, see note 61 "Birthdays" (decided 2026-11-10).
3. Shop hours and closed days: done, see "Shop hours". The first routes
   (default and rain for each of the 30) are drafted in note 80.

## Stardew checks

All Stardew claims above are from memory and unchecked. Register rows SC-106 to
SC-111 in note 54.
