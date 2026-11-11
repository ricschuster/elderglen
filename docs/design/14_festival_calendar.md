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
role except the boats, all ours in content and art. All open 17:00 to 24:00 (owner: keep our
close, not Stardew's 02:00, so staying late never costs the next day). Every
stock and price below is a placeholder for tuning.

1. **The road trader.** The Outpost's road trader himself (note 57), moved to
   the square for the three evenings (owner, 2026-11-11; Stardew's Desert
   Trader is a separate character, from memory, unchecked). He gives one free
   hot drink each evening, a small energy buff, and sells a few rare winter
   goods, the "rare winter goods counter" this note already promised. He is
   away from the Outpost only on the three evenings, after its counter hours,
   so no shop day is lost.
2. **The lantern stall (decor).** A stall under strung lanterns by the river
   bank sells decor without limit per item: seasonal candles, plants and lamps,
   some only here.
3. **The travelling hat-maker.** Not a painter: a visiting hat-maker, to fit
   the folk's hat culture (owner, 2026-11-11; Stardew's is a painter, saved
   Night Market page). One hat a night, 1,200g placeholder, **nine hats on a
   three-year cycle** (Stardew's shape): each evening of each year sells a
   different one, so a player sees all nine only by coming to all three
   evenings for three years. Each hat stands for a place in or beyond the
   valley, as the visitor's road, and is worn, not hung (owner: "Hats").
   Nine hats need nine pieces of art and `hats.json` entries. A hat-maker in
   the valley already exists (Cordelia, note 80), so the visitor is a separate
   person and the two may talk about each other (a line, not a feature).

4. **The curio stall.** Different stock each evening: decor, seeds at shop
   price and one fireplace, unlimited per item.
5. **Night fishing from the lit pier.** A paid permit (1,000g placeholder,
   closes at 23:00) lets the player fish off a lantern-lit pier on the river
   arm at the square, with fish found only here, plus a small chance of a
   pearl. The pier is a stretch of the real river bank, so it needs no boat.
   Needs fishing (note 21) and a handful of market-only fish, so it builds
   after the fishing slices and is not part of the first Night Market build.
6. **Floating a lantern.** A small fee (50g placeholder) to set a paper lantern
   on the river arm at the pier: a short cosmetic scene and one line from the
   keeper, and a small luck buff until morning. The cheapest of the six. Ours,
   with no Stardew source (see SC-113).

**No boats (owner, 2026-11-11).** The first draft had moored boats and a boat
ride. The owner dropped them as too close to Stardew's docks. All six
attractions stand on the square, with the stalls and the pier along the east
bank of the main river arm (x 62, beside the square at x 64 to 80, note 77), so
the fishing happens from the bank. SC-113 (the Mermaid Boat) is now only
background for what we chose not to do.

- **Build order.** Stalls 1 to 4 and 6 first (one stall panel each, over the
  existing shop panel), then 5 with fishing. The nine hats need art; a
  placeholder hat sprite stands in until then.
- **Animals.** The clock runs, so animals still need feeding on the three
  days, as on any other day. Stardew does the same (saved page).
- **Stock source (owner, 2026-11-11): mixed.** The lantern stall and curio stall
  sell the existing winter decor without limit per item, plus a short
  market-only list that is never sold elsewhere: **4 new decor pieces and 1 fireplace**, plus the
  hat-maker's nine hats (above). The market-only items are the
  reason to come each year. They need art and data entries (`furniture.json`,
  `hats.json`), not built yet.
- **Placeholder stock (owner-checked 2026-11-11 on decor and fireplace prices).**
  Owner chose Stardew's scale (saved Night Market page: decor 200 to 1,000g, the
  unique fireplace 15,000g), so the numbers below are raised to match. Check 15,000g against note 7 before
  building. Unlimited per item.
  - Lantern stall, always: snow lamp 220, winter wreath 200, warm rug 200, hanging
    planter 210, plus the 4 market-only decor pieces: a lantern string 500, a
    frost-glass candle 600, a pine garland 700, a sleigh bench 1,000.
  - Curio stall, by evening: day 1 a market-only fireplace 15,000 (owner); day 2 seeds
    at shop price and the fireplace; day 3 the fireplace and a pair of decor
    pieces. (A first sketch: the real split comes with the item list.)
  - Road trader (owner, 2026-11-11: rotating, a different set each evening, not
    a fixed list as Stardew's Desert Trader from memory): 4 to 6 rare winter goods at 1.5 times sell value (note 57's
    rule), chosen from winter forage and the cooked winter dishes.
  - Hat-maker: one hat, 1,200g. Nine hats over three years, placeholder
    names and places: Cove Dusk Cap (the cove), Summit Lamp Hat (the summit),
    Mine Mouth Hood (the mine mouth), Snowbound Hall Cap (the hall), Lakeside
    Reed Hat (the forest lake), Marsh Heron Hat (the delta), Bridgewright Cap
    (the quarry), Square Festival Hat (Hearthwell square) and one hat from a
    far place we never visit, a hint of ring 2. Year 1 evening 1 to 3 are the
    first three, year 2 the next three, year 3 the last three.
  - Pier permit and lantern float: 1,000g and 50g.
  Two caps for later: the market-only items should not undercut the hall's
  rewards, and gold sunk here should be a sink, not a route to anything the
  bundles need.
- **Who attends (owner, 2026-11-11).** The evening inn crowd plus anyone whose
  route is already in town that evening, 18:00 to 22:00, standing at the stalls.
  Families with children come 18:00 to 20:00 and go home. Area residents
  (Wanderer, hermit, dwarf) stay away. About 18 of 30 people. Stardew's
  attendance was not checked on the saved page (SC-114).
- **Lines (owner, 2026-11-11).** A different line per person each evening, three
  lines each, about 54 plus the six keepers' own lines. Placeholder lines
  meanwhile; the real ones come with the voice sheets. Above Stardew, which
  has one line per festival as I recall (unchecked, SC-114).
- **Festival spots on the square (owner accepted as drafted, 2026-11-11).** The
  18 who attend (the rule above, applied to note 80's routes) each get a spot
  zone. Tile positions come with the festival map. Zones: **stalls** (browsing
  one stall), **well** (chat by the well), **bench**, **pier** (watching the
  fishing), **lanterns** (by the strung lights). The market runs 17:00 to 24:00,
  but villagers stand there 18:00 to 22:00 (children 18:00 to 20:00), as note 14
  already says; the rest of the time they follow their ordinary route.

  | Person | Spot | Stays | Note |
  | --- | --- | --- | --- |
  | Cuthbert | well | 18:00 to 22:00 | The host. Welcomes the player, says what each stall is |
  | Odette | stalls (curio) | 18:00 to 22:00 | Store keeper, buys seeds at the curio stall |
  | Dorrie | stalls (lantern) | 18:00 to 22:00 | With Odette's lines |
  | Bramwell | stalls (trader) | 19:00 to 22:00 | Comes from the inn |
  | Hattie | inn door | 18:00 to 24:00 | Keeps the inn open; stands at its door, not a stall |
  | Podge | stalls (hat-maker) | 18:00 to 22:00 | |
  | Aurelle | pier | 19:00 to 21:00 | Her river walk joins the market |
  | Dunmar | bench | 19:30 to 22:00 | Reads by the lanterns |
  | Cordelia | stalls (hat-maker) | 19:00 to 21:00 | Talks about the visitor's hats, the cross-line from the hat-maker note |
  | Barnaby | stalls (hat-maker) | 19:00 to 22:00 | |
  | Linnet | stalls (trader) | 18:00 to 22:00 | Serves at the inn, comes out between orders |
  | Thistle | stalls (lantern) | 18:00 to 22:00 | |
  | Walter | pier | 19:30 to 21:00 | Fishing talk |
  | Aldreth | well | 18:00 to 22:00 | The courier, a visitor too |
  | Fitch, Pim, Wren, Toby | lanterns | 18:00 to 20:00 | Children play under the lights, then go home |

  Not at the market: Hester (asleep by 21:00, keeps her early route), Alder,
  Tilda, Rufus and the area residents (Wanderer, hermit, dwarf, plus Dilly,
  Marl, Maren, Rushie and Thalwen, who stay in their areas). Each attendee has
  three lines, one per evening, per the lines rule above.
- **Layout on the square (owner accepted as drafted, 2026-11-11).** The festival
  variant of the Hearthwell map (note 66) dresses the square (x 64 to 80, y 54
  to 70, note 77) with lantern strings and no new map. The main river arm runs
  along its west edge (x 56 to 62), so the bank is x 63.
  - **Pier:** a lantern-lit wooden strip on the bank, x 62 to 63, y 64 to 69,
    south of the cart road so the bridge approach (y 60 to 64) stays clear. The
    permit seller (the pier keeper) stands at its landward end, and the lantern
    floating is done from its tip. It is placed fishing water: the river arm's
    ordinary river fish also bite here, plus the market-only ones below.
  - **Stalls:** four along the north and east edges of the square, each a
    2 by 2 tile counter with a keeper: lantern stall (66, 55), curio stall
    (70, 55), road trader (74, 55) and hat-maker (78, 58). The pier keeper
    stands at the pier. The cart stop at (66, 58) and the well stay free.
  - **Crowd space:** the middle of the square, around the well, stays open for
    standing villagers. Benches and the lantern strings are props.
  - **Doors:** none shut. Shops keep normal hours (owner), so the festival
    variant of this map leaves every door open, unlike the other festivals.
- **Market-only fish (owner accepted four, 2026-11-11; Stardew has three).** Four fish caught only from
  the pier on the three evenings, with the permit, plus the pearl. None counts
  toward bundles or the fish tracker's normal list, but each is a catch that
  counts for the collection. Rarities and bars follow the cove's table in note
  21; sell prices sit with the cove's (450 to 700g).

  | Fish | Time | Rarity | Bar | Sell |
  | --- | --- | --- | --- | --- |
  | Lamp Minnow | Night | Common | dart 30 | 120 |
  | Frostveil | Night | Uncommon | floater 55 | 400 |
  | Midnight Gar | Night | Rare | sinker 70 | 650 |
  | Hush Lantern | Night | Rare | smooth 75 | 800 |

  The pearl is a small chance, about 1 in 200, as a rare find. Pier catches
  use the night odds from 17:00 to 23:00. The permit lasts the evening, and
  the pier closes at 23:00. Stardew's equivalent has three exclusive fish and
  a pearl (saved Night Market page).
- **Weather (decided in this pass).** Each evening is fair like other festival
  days (note 14's earlier rule). Snow still falls only on days that the weather
  table says; the market's three days are forced clear, so the question of
  whether snow counts as rain does not arise here. It still stands for ordinary
  days (note 80).
- **Build order, summary.** (1) `festivals.json` three-day span and the
  square variant with its four stalls and no shut doors. (2) The stall
  panels: trader, lantern, curio, hat-maker, float. (3) The pier and its
  permit and fish with the fishing slices. The attendance, lines and spots are
  content for the voice sheets. Nothing here is built.

- **Seller names (owner, 2026-11-11).** Placeholder role names in the data
  ("the hat-maker", "the pier keeper"); real names come with the voice sheets and
  art, as for the road trader.
- **Still open:** the owner's check of the placeholder stock, prices, spots, layout and fish above, the hats' art and names, and the festival spots for the other festivals (note 80 open item 3). The design is otherwise complete for a build.

## Open

- The fall and winter festivals are designed in
  `66_fall_winter_festivals_and_farm_cave.md` (2026-11-07): Harvest Showing
  display scoring, a Hollow Eve maze, Frostday as an ice sculpture day until
  fishing arrives. Maps and the prize counter lists are still build tasks.
