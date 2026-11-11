# 14 Festival calendar

Built: all eight festivals are in `src/content/festivals.json` (spring and
summer 2026-11-07, fall and winter since), each with an optional free hat and a
counter.

Status: accepted 2026-10-27 (issue #131), extended 2026-10-31 to four seasons
and eight festivals, and to nine on 2026-11-10 (Winter Night Market).
Design only. The festival system (#132) builds from this.
Dates are ours and cheap to change; change them with a new dated decision
here.

## Rules

- Two festivals per season (`09_story_and_lore.md`). The year has four seasons
  (`26_seasons.md`), so the calendar had eight festivals. Winter has a third, the Night Market, so
  nine. The code has all four
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
| Summer | 24 | Lamplight Evening | The summer solstice: a quiet lantern gathering at dusk on the longest day. Moved from day 20 (2026-11-10). |
| Fall | 9 | Harvest Showing | Crops judged on the green, with a prize counter. The counter sells one elderfruit (`39_completion_total.md`). |
| Fall | 21 | Hollow Eve | A spooky evening walk. Quiet scares only, no threat. |
| Winter | 8 | Frostday | Ice fishing on the river. |
| Winter | 16 to 18 | Winter Night Market | A three-evening market on the square. Shops keep their normal hours. Added 2026-11-10 (see "Winter Night Market"). |
| Winter | 25 | Midwinter Feast | The winter solstice: a gift exchange with one villager. The hall steward's (Cuthbert, the reeve, note 20) letter names the recipient on Winter 18, random among people met (`61_friendship_and_gifts.md`). |

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
- **Fall, days 9 and 21, and winter, day 8.** The same spacing as spring
  and summer, and clear of the last week. The two solstice festivals moved
  late (see "Solstice festivals"). Hollow Eve is an evening festival
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

## Solstice festivals (decided 2026-11-10, owner)

The year has two solstice festivals, the summer and winter ones, and they are
the existing Lamplight Evening and Midwinter Feast moved late in their seasons,
as Stardew puts its winter feast on winter 25 (saved Calendar page). The solstice
change adds none. The year has 9 festivals with the Winter Night Market.

- **Lamplight Evening, Summer 24 (was 20).** The summer solstice. Day 24 keeps
  clear of the store keeper's birthday (Summer 25) and Hester's (Summer 22).
- **Midwinter Feast, Winter 25 (was 20).** The winter solstice, on Stardew's own
  day. The steward's letter moves to Winter 18, a week before, as Stardew does.
  Winter 25 is clear of Walter's (24) and the hall steward's (26) birthdays.
- **The last-week rule is relaxed for these two.** The rule (no festival on days
  22 to 28) stays for the other six. A solstice festival may fall late because
  neither is on a crop-rush day that matters: Midwinter has no crops in
  winter, and Lamplight Evening opens at dusk, after the day's chores.
- **Still to build:** `festivals.json`, `tests/festivals.test.ts` and
  `tests/showing.test.ts` hold the old days (summer 20, winter 20) and the
  letter day. A build task, not done here.
- The count is 9 once the Winter Night Market is added (below).

## Winter Night Market (decided 2026-11-10, owner)

The ninth festival. The owner wanted one more and chose winter, because the
player has less farming to do. It follows Stardew's Night Market, which runs
winter 15 to 17 (saved Calendar page); ours runs **Winter 16 to 18**, since
Winter 15 is Thalwen's birthday and a birthday never falls on a festival day.
Winter then has three festivals: Frostday (8), the Night Market (16 to 18) and
Midwinter Feast (25).

- **Three evenings, shops keep normal hours (owner).** Unlike the other eight, no
  shop or home closes and the clock keeps running: the market is open from
  17:00 to 24:00 each evening, after counters close, so it never costs the player
  a working day. The "time stands still, noon to 6 pm" rule does not apply.
- **Where:** the Hearthwell square, decorated each evening (a festival map
  variant, note 66). The six attractions are designed below (2026-11-11). Stock and
  prices are still placeholders.
- **Villagers:** the evening inn crowd (note 80) moves to the square from 18:00
  to 22:00 on the three days. Everyone else keeps their route. A festival spot
  per person is written with the festival maps.
- **Weather:** the three evenings are fair like other festival days.
- **The steward's letter** (Winter 18, note 61) lands on the third market day.
  It is mail, not a festival event, so nothing conflicts.
- **To build:** an entry in `festivals.json` with a three-day span (the lookup
  returns one day today), the square variant and the counter. Not started.

### Night Market attractions (decided 2026-11-11, owner)

Owner answers, each as Stardew does (saved Night Market page, read 2026-11-11)
except the closing time. The market has **six attractions**, one per Stardew
role, all ours in content and art. All open 17:00 to 24:00 (owner: keep our
close, not Stardew's 02:00, so staying late never costs the next day). Every
stock and price below is a placeholder for tuning.

1. **The road trader.** The Outpost's road trader himself (note 57), moved to
   the square for the three evenings (owner, 2026-11-11; Stardew's Desert
   Trader is a separate character, from memory, unchecked). He gives one free
   hot drink each evening, a small energy buff, and sells a few rare winter
   goods, the "rare winter goods counter" this note already promised. He is
   away from the Outpost only on the three evenings, after its counter hours,
   so no shop day is lost.
2. **The lantern boat (decor).** A moored boat on the river arm sells decor
   without limit per item: seasonal candles, plants and lamps, some only here.
3. **The travelling artist.** One painting a night, 1,200g placeholder, **nine
   paintings on a three-year cycle** (Stardew's shape): each evening of each
   year sells a different one, so a player sees every painting only by coming
   to all three evenings over three years. Nine pieces of art are needed, one
   a year per evening.
4. **The curio boat.** Different stock each evening: decor, seeds at shop
   price, one hat and one fireplace, unlimited per item. Prices may move over
   the three days for the hat.
5. **The night-fishing outing.** A paid boat trip (1,000g placeholder, closes
   at 23:00) that takes the player onto dark water for a fishing stretch with
   fish found only here, plus a small chance of a pearl. Needs fishing (note 21)
   and a handful of new market-only fish, so it builds after the fishing slices
   and is not part of the first Night Market build.
6. **The lantern-boat ride.** A short ride along Hearthwell's river arm for a
   small fee: a cosmetic scene and a single line from the boat keeper. The
   cheapest of the six. Stardew's matching boat was not read, so this ride is
   our own and the exact Stardew behaviour is a register row (SC-113).

- **Build order.** Stalls 1 to 4 and 6 first (one stall panel each, over the
  existing shop panel), then 5 with fishing. The nine paintings need art; a
  placeholder frame stands in until then.
- **Animals.** The clock runs, so animals still need feeding on the three
  days, as on any other day. Stardew does the same (saved page).
- **Stock source (owner, 2026-11-11): mixed.** The decor boat and curio boat
  sell the existing winter decor and hats without limit per item, plus a short
  market-only list that is never sold elsewhere: **4 new decor pieces, 3 new
  hats (one per evening) and 1 fireplace.** The market-only items are the
  reason to come each year. They need art and data entries (`furniture.json`,
  `hats.json`), not built yet.
- **Placeholder stock (my proposal, 2026-11-11, not yet owner-checked).** Prices
  sit near the existing furniture (60 to 520g). Unlimited per item.
  - Decor boat, always: snow lamp 220, winter wreath 120, warm rug 180, hanging
    planter 210, plus the 4 market-only decor pieces at 300 each (a lantern
    string, a frost-glass candle, a pine garland, a sleigh bench).
  - Curio boat, by evening: day 1 a market-only hat 900 and a market-only
    fireplace 1,500; day 2 the same hat at 600 (the price dips on the middle
    night, as Stardew's hat does) and seeds at shop price; day 3 the same hat
    at 900 and the third hat. Each evening also sells one existing winter hat.
  - Road trader: 4 to 6 rare winter goods at 1.5 times sell value (note 57's
    rule), chosen from winter forage and the cooked winter dishes.
  - Artist: one painting, 1,200g.
  - Outing and ride: 1,000g and 50g.
  Two caps for later: the market-only items should not undercut the hall's
  rewards, and gold sunk here should be a sink, not a route to anything the
  bundles need.
- **Seller names (owner, 2026-11-11).** Placeholder role names in the data
  ("the artist", "the boat keeper"); real names come with the voice sheets and
  art, as for the road trader.
- **Still open:** the owner's check of the placeholder stock, the nine
  paintings' subjects, the market-only fish list, and each person's festival
  spot (note 80 open item 3).

## Open

- The fall and winter festivals are designed in
  `66_fall_winter_festivals_and_farm_cave.md` (2026-11-07): Harvest Showing
  display scoring, a Hollow Eve maze, Frostday as an ice sculpture day until
  fishing arrives. Maps and the prize counter lists are still build tasks.
