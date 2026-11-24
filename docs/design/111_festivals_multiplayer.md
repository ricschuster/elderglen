# 111. Festivals with several players (M4)

Drafted and settled with the owner on 2026-11-24. Closes the festival line of note 53 ("counts and joining
for the Feast, the gift exchange and the in-place festivals are still open"). Builds on notes 14, 82 and 105.
Stardew claims are from the saved Festivals, Egg Festival, Festival of Ice, Luau, Stardew Valley Fair, Night
Market and Multiplayer pages (read 2026-11-24) unless marked "from memory".

## Decided (owner, 2026-11-24)

1. **All in first (Stardew, saved Festivals page: "every player who is present needs to enter the festival
   area to proceed (except for the Night Market)").** A festival goes ahead only when every connected player
   has entered it. "Entered" is walking through the festival gate (the green, the hedge) or onto the festival
   area of an in-place festival (its map and spots, note 82). Until then:
   - Players already in stand at the entry and see "Waiting for Ada and Bram." The clock is still running for
     everyone (time stands still only once the festival goes ahead, note 14).
   - The game still asks before going in, as now (the lost afternoon cannot be undone).
   - When the last player enters, the clock stops for everyone and the festival goes ahead.
   - A dropped guest does not count as present (note 53 rule for the day end).
2. **The Night Market is exempt (Stardew, same page).** Its three evenings keep normal time and shop hours
   (note 14), so every player comes and goes freely.
3. **Leave together (ours, recommended; Stardew from memory, SC-223).** A player who chooses to leave waits at
   the exit ("Waiting for the others to leave."). When every player has chosen to leave, or a main event that
   ends the festival finishes (the seed hunt and the ice contest, note 82), everyone goes back where they came
   in and the clock is 22:00.
4. **Seed hunt: a lower target, the top player wins (Stardew, saved Festivals and Egg Festival pages).** The
   target drops with the number of players present (placeholder: 9 for one, 7 for two, 6 for three, 5 for
   four or more). The player with the most packets who reached the target wins the prize; a tie for the most
   gives each tied player the prize. If nobody reaches it, the rival wins as now.
5. **Ice fishing: every winner is rewarded (Stardew, saved Festival of Ice page).** Every player who beats
   Rushie's count gets the prize.
6. **Harvest Showing: one shared display (Stardew, saved Stardew Valley Fair page).** One table for the farm,
   used by one player at a time (the lock of note 108 rule 2). The judge scores it once and every player gets
   the same placement. Each player collects the prize from the judge themselves.
7. **Cake Day: everyone adds a dish, the worst sets it (Stardew, saved Luau page; the mixing rule from
   memory, SC-224).** Every present player must hand in a dish before the tasting, or the result is the poor
   one. With all dishes in, the lowest dish's quality sets the friendship gain, which each player gets with
   every attendee (relationships are per player).
8. **Midwinter Feast: villagers only (ours, recommended).** Each player draws their own villager recipient
   and giver, as in single player; two players may share a recipient (note 105 decision 10). Players are not
   drawn.
9. **Per-player rewards (Stardew, saved Multiplayer page: own relationships; saved Night Market page: one
   pearl per player).** Each player marches in the parade and gets its friendship, floats their own lantern
   and gets the keepsake once, opens the Hollow Eve maze chest once for themselves (as the mine chests, note
   109 rule 4), and gets the Night Market pearl once.

## How it works (technical, ours)

- **The festival gate is host state.** The host keeps, for today's festival, who has entered, who has chosen
  to leave, and whether it has gone ahead. Entering and leaving are intents (`festival-enter`,
  `festival-leave`). The waiting lines come from that state.
- **The clock.** The host stops the shared clock when the festival goes ahead and sets it to 22:00 when it
  ends, as the single-player code does.
- **Main events** (the march, the hunt, the contest, the judging, the tasting, the launch, the exchange) run on
  the host. Each player's part is an intent (`hunt-pick {x, y}`, `cake-give {item}`, `showing-set ...`), and
  the result is sent to everyone.
- **Counts in core.** `seedhunt.ts` takes the number of players for the target; `icefishing.ts` returns every
  winner; `cakeday.ts` takes a list of dishes; `showing.ts` stays one display. Each keeps its one-player
  numbers.

## Build order

After note 108 group 1 (the dispatcher and the lock):

1. The festival gate: all in first, waiting lines, clock stop, leave together, Night Market exempt.
2. The counts in core: seed hunt target and top winner, ice fishing winners, cake dishes and worst rule.
3. Shared Harvest Showing display with the lock and per-player prize collection.
4. Per-player rewards (parade, lantern keepsake, maze chest, pearl) and the Feast draws per player.

## Open

- SC-223: how Stardew handles one player leaving a festival early (ours chosen either way).
- SC-224: how Stardew's soup mixes several players' items (ours chosen either way).
