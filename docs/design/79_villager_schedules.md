# 79 Villager schedules

Status: **decided with the owner on 2026-11-10.** Names, birthdays and ages
are still to come (see "Next"). Nothing here is built. It feeds #599 (slice 4
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
7. **Heart level does not change the route, except by a heart event or by
   marriage (Stardew).** A heart event may switch a person to a new route, as
   data. A spouse moves to the farm with a spouse route (`12_marriage.md`).
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

## Next

1. **Names, in batches by place** (owner): the Forest and the Mountain first,
   then the Mines, delta and Beach, then Hearthwell by household. Plain given
   names, distinct by race, with a shared family name for each Hearthwell
   household (Brimmer is already in the lore). No ages shown, only age bands
   (child, young adult, adult, elder), and no ageing over the years.
2. **Birthdays**: one per person, spread so each season has seven or eight,
   avoiding festival days (Stardew's spread, unchecked). Waits for the names.
3. Shop hours and closed days per shop, and the first routes, once the names
   exist.

## Stardew checks

All Stardew claims above are from memory and unchecked. Register rows SC-106 to
SC-111 in note 54.
