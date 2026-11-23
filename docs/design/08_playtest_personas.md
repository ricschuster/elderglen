# 08 Playtest by persona (draft)

Status: draft. Written 2026-10-25 after the first scripted playthroughs of the
first playable. Numbers come from one run per persona, so treat them as
orders of magnitude, not as balance data.

## Method

A script drove the dev build in headless Chromium with key presses only (plus
one mouse click on the end screen). It read the live game state after every
shop, hall and farm action to check the result, so a wrong price, a double key
press or a bad growth step would have been reported. The game's own randomness
(weather, forage) was not seeded, so reruns differ. The scripts are not in the
repo.

Three personas played a new game on the placeholder map and went on until all
five bundles were done (the Pantry has since been dropped, so the runs below include a bundle that no longer exists), or until day 85 (the calendar wraps into a second year).

- Expert: knows every bundle, plants each bundle crop on day 1 and replants
  every cycle, sweeps all visible forage every day, visits the hall and shop
  every day.
- Intermediate: knows the bundles but farms a small patch (12 parsnips, 2
  each of the other crops), forages on 6 days in 10, visits the hall and shop
  every third day, forgets to water on 1 day in 10.
- Casual: plays about 3 days in 4, plants 6 parsnips and a handful of other
  crops late, forages on about a third of days (3 goods at most), sells
  everything at the shop, visits the hall every sixth day, forgets to water on
  3 days in 10, and once works until the energy runs out. The casual persona
  is deliberately harsh. It is a check on the floor, not a typical player.

Separate test: one new game left standing still until 2 am.

## Results

| | Expert | Intermediate | Casual |
| --- | --- | --- | --- |
| All five bundles done | day 41 | day 45 | not by day 85 |
| Spring Foraging | by day 4 | by day 4 | year 2 (day 84) |
| Spring Crops | by day 14 | by day 16 | stuck at 2 of 3 |
| Pantry | by day 32 | by day 31 | by day 49 |
| Summer Foraging | by day 32 | by day 40 | by day 49 |
| Summer Crops | day 41 | day 45 | stuck at 2 of 3 |
| Money at day 28 | 5385g | 3250g | about 1000g |
| Bugs or console errors | none | none | none |

"By day N" is the first morning the hall showed the bundle done.

Checked and correct in every run: planting, watering, growth (a watered crop
gains one day, a dry one none, rain waters all), harvest, forage, every hall
hand-in, every shop sale and purchase (amounts and money), the season change and
crop withering, the overnight report, saving and Continue after a reload, and
the end screen with its Keep playing button. Entering and leaving the house
works. Opening the shop or hall with Space never bought or sold anything, so the
double key event seen on the farm did not show up in menus.

Pass-out rules matched the tuning note. Running out of energy cost 10 percent
of money (50g of 500g) and gave 135 energy next morning (50 percent). Staying up
until 2 am cost the same and gave 203 energy (75 percent; that was the old rule, a 2 am pass-out is now half, 2026-11-23).

## What the runs say

1. Money has no use. The expert had 1190g by day 10 and 5385g by day 28, and the
   only thing to spend it on is seeds. The parsnip loop (20g seed, 35g crop, 4
   days) beats everything else from day 5. The starting 500g is more than a
   player needs. This answers the open questions in the tuning note about
   starting cash and seed payback.
2. Two seasons are enough for a careful player, with room to spare. The expert
   finished with 15 days of summer left. Real time was never the limit: energy
   (135 tool uses a day) was never close to binding for a 22 plot farm.
3. The casual floor fails, for two reasons that are not bot mistakes.
   - The shop sells things the hall wants. The casual persona sold both
     tomatoes and most of its forage before handing them in, because nothing in
     the shop says the hall needs them. Items sold are final, so the second
     tomato had to be grown again. The handoff already lists this as a risk.
   - Spring Crops needs cauliflower, which takes 12 watered days in a 28 day
     season, and a crop withers when the season ends. A player who skips days
     and forgets to water cannot reliably do it. Missing a bundle at season end
     has no second chance until the next year.
4. Forage luck matters more than the earlier simulation suggested for part time
   players. Some mornings have no forage at all, and the intermediate persona
   waited 9 days for one summer item. Foraging bundles that need every item
   depend on visiting often.
5. Seeds sell back at half price. The tuning note said there was no spread. That
   is now corrected there.

## Options for the owner

These are suggestions. The bundle questions belong to issue #21.

Owner decisions (2026-10-25): no sell warning for now, since the game this one
is inspired by does not warn either; revisit if real players get caught. The
Spring Crops bundle stays as it is. A bundle missed in year 1 can be finished in
a later year. No money sink for now; it will come with more game complexity.

- Mark items the hall still needs in the shop sell list, or ask before selling
  them. Cheap and removes the worst casual trap.
- Make a long crop optional in Spring Crops (for example 2 of 3 instead of all
  3), or let a missed bundle roll into the next season.
- Add a money sink before tuning prices, so the answer to "is 500g enough" is
  not simply "yes, wildly".

## Which personas to keep running

Three is the useful number here: expert (the fastest path and the ceiling),
intermediate (the likely typical player) and casual (the floor). They stress
different things, and a change that passes all three is unlikely to break a
real player's path. More than that only adds runs without adding new failure
types. Add a persona only for a new system, for example a tablet touch player
once the tablet pass starts, or a fishing persona if fishing is added. Rerun the
three after any change to prices, bundles, growth or energy.

## Touch persona (emulated tablet)

`npm run playtest:touch` drives the game with touch events only, in a touch
browser sized like the SM-T500 (1200x700 CSS pixels, the game scaled 1.25x).
Result: the farm loop, shop, hall, report and Continue all work by touch, the
stick keeps working while a second finger taps Use, and there were no console
errors. Two things came out of it:

- There was no touch way to sleep (only Z). Sleeping is now done in a bed in
  the house: use the bed and a Yes or No prompt asks. Z still works as a
  keyboard shortcut.
- The run also found a bug: after any map change the farm scene kept a stale
  resume listener per restart, so a resume ran twice (sleep skipped a day).
  Fixed.
- Buttons in the shop and hall were 30 to 38 CSS pixels tall, under the 40
  pixel line the script uses. Menu rows are now taller and tapping a row does
  its main action (Buy 1, Sell 1, Hand in), as in the Stardew mobile menus. The
  second button (Buy 5, Sell all) stays. The rerun has no findings.

An emulator cannot judge feel, frame rate or Android Chrome's address bar and
zoom behaviour, so a short check on the real tablet is still worth doing before
the tablet pass is called done.

## Rerun on 2026-10-26

The three keyboard personas were run again on `main` after quality tiers, tool
upgrades, professions, more crops and forage, and the forecast landed. One run
each, the same scripts, no console errors and no findings.

| | Expert | Intermediate | Casual |
| --- | --- | --- | --- |
| All five bundles done | day 41 | day 45 | not by day 85 |
| Spring Foraging | day 4 | day 10 | day 32 |
| Spring Crops | day 14 | day 16 | stuck at 2 of 3 |
| Pantry | day 34 | day 37 | day 49 |
| Summer Foraging | day 33 | day 40 | stuck at 2 of 3 |
| Money at day 28 | 4718g | 3635g | about 800g |

- Almost nothing moved. The expert and intermediate finish on the same days as
  the first runs. The small differences in single bundles and in money look like
  forage and weather luck, not a change in the rules.
- The casual floor still fails. Spring Crops is stuck at 2 of 3 again (the
  cauliflower), and this time Summer Foraging is stuck at 2 of 3 as well. Spring
  Foraging came in much earlier (day 32, was day 84), which is luck.
- These runs say nothing about upgrade prices, red cabbage or professions. The
  bots never buy a tool upgrade or red cabbage seed, and no run reached a
  profession. The seeds they bought were parsnip, potato, cauliflower, radish,
  tomato and melon.
- Money still has no use. The expert ended with 8003g. Any upgrade at the current
  prices would be an easy purchase for a player who farms well. This agrees with
  the owner decision above to wait for more complexity before adding a money
  sink.
- To tune upgrade prices and red cabbage, a persona that buys them on purpose is
  needed. That is not built.

## Rerun on 2026-10-31

The three keyboard personas were run again on `main` after the Pantry bundle was
dropped (#278), the house and hall became walkable maps and the soil and menu
art changed. The three runs went at the same time against one dev server. No
console errors and no findings in the final runs.

| | Expert | Intermediate | Casual |
| --- | --- | --- | --- |
| All four bundles done | day 41 | day 45 | not by day 85 |
| Spring Foraging | day 4 | day 9 | day 84 |
| Spring Crops | day 13 | day 15 | not done |
| Summer Foraging | day 32 | day 33 | not done (1 of 3) |
| Summer Crops | day 41 | day 45 | not done |
| Money at day 28 | 4967g | 3538g | not sampled |
| Real time | 22.0 min | 16.1 min | 12.7 min |

- The finish days match the 2026-10-26 runs (41 and 45), which had five bundles.
  Dropping the Pantry did not move them, since the Pantry was not the last
  bundle for either persona. The last bundle is still Summer Crops.
- The casual floor still fails, and does worse than on 2026-10-26: only Spring
  Foraging is done, on day 84. Casual skips about a quarter of days and gathers
  little forage, so this is a known floor, not a regression. It is worth a look
  when the bundle pools are tuned (#181).
- A first expert and intermediate run on the same day logged 31 and 18 "no stand
  tile" script errors. That was a playtest script bug (a stale map after leaving
  the hall), fixed in `scripts/playtest/lib.mjs`, not a game fault. See
  `scripts/playtest/README.md`.
- The same limits as before: no persona buys tool upgrades or red cabbage, and
  none reached a profession, so money still has no use.

## Not covered

The real tablet (see above), the Start over button, saving the clock (a reload
mid day restarts at 6 am), and anything on a second map beyond the house.
