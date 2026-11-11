# 14 Festival calendar

Built: all eight festivals are in `src/content/festivals.json` (spring and
summer 2026-11-07, fall and winter since), each with an optional free hat and a
counter.

Status: accepted 2026-10-27 (issue #131), extended 2026-10-31 to four seasons
and eight festivals. Design only. The festival system (#132) builds from this.
Dates are ours and cheap to change; change them with a new dated decision
here.

## Rules

- Two festivals per season (`09_story_and_lore.md`). The year has four seasons
  (`26_seasons.md`), so the calendar has eight festivals. The code has all four
  seasons (`src/core/calendar.ts`).
- A festival falls on a fixed day of the season, every year.
- Not on day 1 (the always sunny start of a season) and not in the last week
  (days 22 to 28),
  so a festival never competes with the end-of-season crop rush.
- Festival days are always sunny, like day 1, so rain never decides whether to go.
- The village changes for the day (decoration, villagers gathered at the
  green). The festival is open from noon to 6 pm so the player can still do the
  morning chores. As in Stardew, time stands still while the player is at the
  festival. Leaving puts the player back where they went in, with the clock at
  10 pm (from memory of Stardew; the day does not end, so the player can still
  water and then sleep). The game asks before going in, since the lost
  afternoon cannot be undone. Nothing is lost by skipping it (revised during
  #132).
- No pressure: no timer on joining, no penalty for missing one, no score
  required. A prize counter or minigame is a bonus (`11_minigames.md`).

## The calendar

| Season | Day | Festival | Notes |
| --- | --- | --- | --- |
| Spring | 10 | Hat Parade | The M3 festival. Everyone shows off their best hat. |
| Spring | 21 | Seedswap Fair | Neighbours trade seeds. Mostly a prize counter. |
| Summer | 8 | Cake Day | Brimmers dress in food-looking clothes. |
| Summer | 20 | Lamplight Evening | A quiet lantern gathering at dusk. |
| Fall | 9 | Harvest Showing | Crops judged on the green, with a prize counter. The counter sells one elderfruit (`39_completion_total.md`). |
| Fall | 21 | Hollow Eve | A spooky evening walk. Quiet scares only, no threat. |
| Winter | 8 | Frostday | Ice fishing on the river. |
| Winter | 20 | Midwinter Feast | A gift exchange with one villager. The hall steward's (Cuthbert, the reeve, note 20) letter names the recipient on Winter 13, random among people met (`61_friendship_and_gifts.md`). |

Names are final for now (2026-10-31). The fall and winter pair follow Stardew's
shape (a harvest fair and a spooky night, then an ice day and a gift feast),
with our names and dates, and none of Stardew's text. Stardew's own dates are
fall 16 and 27 and winter 8 and 25, from the saved Festivals page.

## Why these dates

- **Hat Parade in spring, day 10.** Spring is the first season, so the parade
  is the first thing the player sees the village do. Day 10 gives nine days to
  find or earn a first hat (`10_customisation.md`), and it is the first
  festival a new player meets. It also shows the folk's hat culture early,
  which the lore wants (hats as a readout of standing).
- **Seedswap Fair, spring day 21.** Late enough to follow the first bundles,
  early enough to leave a week clear before the season ends. It moved from day
  22 on 2026-10-31, because day 22 is in the last week, which breaks the rule
  above. Spring's two are now eleven days apart.
- **Cake Day in summer, day 8.** Cake day suits a season of plenty, and a
  summer date keeps it clear of the parade so the two costume festivals are
  not back to back. Early in the season for the same reason as the parade.
- **Lamplight Evening, summer day 20.** A calm counterpoint late in the run.
  It is also a natural place for the first light touch of the ember and ash
  theme later (a few lamps gutter), without any threat.
- **Fall, days 9 and 21, and winter, days 8 and 20.** The same spacing as spring
  and summer, and clear of the last week. Hollow Eve is an evening festival
  like Lamplight Evening, so the two quiet ones are in different seasons.

Each season has its two festivals twelve days apart, so a player always has a
festival to look ahead to.

## What the player sees

- The calendar (or the sleep summary) shows the next festival and its day.
  Needs a small UI change in #132, not here.
- The day before a festival, the morning message says it is tomorrow.

## Hooks for #132

- Each festival is data: season, day, name, a map or map overlay, a list of
  villagers and where they stand, an optional prize counter, and an optional
  minigame id. Content stays in data files, not code.
- A festival lookup lives in `src/core/` and is pure: given a date, return the
  festival or nothing. Unit test it against this table.
- Weather: a festival date forces sunny weather in `src/core/weather.ts`.
- Save: nothing new is stored for the calendar itself. Whether the player has
  joined this year's parade is stored when the prize counter needs it.

## Harvest Showing prize (decided 2026-11-06)

The first place crop wins one **Blue Ribbon Melon** (name a placeholder), once
per year. It is a universal gift love (`61_friendship_and_gifts.md`) and cannot
be bought. Judging uses a crop of the player's own, scored on quality, with a
top quality melon needed for first place. The scoring, number of entries and
the other prizes are not settled and need the festival note before #132 builds
it.

## M3 cut

This was the M3 cut (`13_m3_scope.md`); all eight are built since. The Seedswap
Fair note below is history. The Seedswap Fair is the cheapest second festival,
because it is mostly a prize counter.

## Shop hours (decided 2026-10-31)

The shop stays open until the festival opens at noon, then closes for the
afternoon, since the shopkeeper goes to the green. The morning is free for
buying seeds and selling, and the shipping bin still pays at sleep. Stardew
locks every shop and home all day on festival days, except four festivals where
time keeps passing (saved Festivals page). Ours is looser on purpose.

## Open

- The fall and winter festivals are designed in
  `66_fall_winter_festivals_and_farm_cave.md` (2026-11-07): Harvest Showing
  display scoring, a Hollow Eve maze, Frostday as an ice sculpture day until
  fishing arrives. Maps and the prize counter lists are still build tasks.
