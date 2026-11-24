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

## As built (build, 2026-11-24)

All four build steps. Code: `src/core/festivalgate.ts` (the gate), `roomfestival.ts` (the host: gate, events, display,
rewards, held by `GameRoomWorld.festival`), `seedhunt.ts`, `icefishing.ts`, `cakeday.ts` and `showing.ts` (the counts),
`roommaps.ts` (`townView`), `src/net/session.ts` and `src/scenes/farm-festival-net.ts` (the scene side). Tests:
`tests/festivalcounts.test.ts` (core) and `tests/festival-socket.test.ts` (a real host and two guests).

- **Per-player record (step 4 groundwork).** `PlayerRecord.festivalsJoined` and `showTokens` are now each player's own,
  reached through the same local accessors as `mail` (`g.festivalsJoined`, `g.showTokens` follow `asPlayer`). A guest's
  are saved in their record (`festivals`, `tokens`, optional, so an old save loads empty); the host's stay the save's
  flat fields. Because the once-a-year and once-ever keys of the parade, lantern, maze chest, hunt and ice prizes, the
  cake mark, the Feast draws and the market permit, float, drink and pearl all live in that list, they became per player
  with no other change. The market's day keys moved from world flags to this list (an evening's permit in an old save is
  lost, nothing else). The Night Market pearl is now once for each player (before it was only a 1 in 200 roll).
- **Gate (step 1).** `festival-enter` and `festival-leave` intents. A festival with its own map (the green, the hedge)
  is entered when the scene asks the host before walking through the gate (no position check, the host cannot see the
  gate); one held in place is entered by standing in its zone (checked against the sender's position). Choices: while
  the festival is not yet on, "Waiting for Ada and Bram." is the `line` of the festival view and shows to players inside;
  a player cannot choose to leave until it is on; a player who arrives after it went ahead walks straight in; the
  festival ends when every connected player who is inside has chosen to leave, or a main event ends it. The clock
  stands still (the host scene's tick stops) only for a festival with its own map, as in single player; the festivals
  held in place keep the clock running (the march and the stalls run on it) and the gate only sequences the day. On
  the end the host sets the clock to the festival's end and the scenes send everyone back to the farm entry
  (`from_festival`). Everything else in a festival (counter, hunt, parade, lantern) needs the player in and the festival
  on. A guest who drops is not present; the Night Market has no gate (`festivalDayToday` skips it).
- **Hunt (step 2).** `HuntContest`: the packets lie on the map, the first player onto a tile takes it, the target is 9,
  7, 6, 5 for one to four or more present players (the entered ones at the start). The host picks packets up from the
  positions it knows (the `hunt-pick {x, y}` intent also works, checked within one tile). It is over at the timer, when
  the packets are gone, or when a player has reached the target and no one else can (one player: at the target, as
  before). The most packets among those who reached the target wins, ties win together, else the rival wins; it then
  ends the festival. Each winner gets the prize as the sender (hat once ever, packet once a year).
- **Ice (step 2).** `IceContest`: each player's own count and judging. A guest's hole catch counts (the host's cast
  marks it a hole cast, the landing counts it) and so does the host's own (its fishing scene calls
  `festival.iceCatch`). Each player is judged on their own by talking to Cuthbert (`ice-judge`): five fish win, a short
  count loses from 17:00, and every winner is paid. The contest ends the festival when every player who has entered it
  (fished a hole or been judged) is judged. A player who never fishes does not hold it up.
- **Cake (step 2).** `cake-give {item}` takes the dish from the sender and notes its quality; the tasting happens when
  every present player has given one, or on `cake-taste` by anyone (a present player with no dish makes it the poor
  one, the lowest quality, normal). Everyone present then gets the friendship gain and their own mark.
- **Showing (step 3).** The table is one screen kind, `showing`, locked for the whole farm (both of the green's tiles
  share one lock, as a chest has). The holder sends `showing-set {ids}` (up to nine goods, held in the table, shown to
  all in the festival view) and `showing-judge`; goods are checked against the holder's pack and never taken. The
  judge scores it once for the farm: the placing is a world flag `showing-result:<year>:<place>:<points>` (saved), the
  same for every player. Each player sends `showing-collect` for tokens, and the Rosette Hat and Blue Ribbon Melon
  for first, once a year, whether or not they held the table.
- **Rewards (step 4).** `parade-join {map, x, y}` and `parade-done`, `lantern-buy`, `lantern-launch`, `maze-chest`,
  `feast-give {map, id, held}`, `festival-buy {entry}`, `pier-permit`, `pier-float`, `pier-drink` run as the sender
  (their pack, purse and keys); a guest's record comes back as a `player` message and the host's words as `fline`.
  A guest draws their own Feast recipient and giver (their id is in the seed; the host's draw is unchanged).
- **Messages.** `festival` (the view: gate, hunt, ice, cake, showing) to every present player when it changes, and
  `fline {text}` to one player. The host's own player reads both from `HostSession`.
- **Town maps (hosting the festival maps needs).** `townView`: Hearthwell, the green and the hedge are hosted for a
  cast only (an empty world, a free pack slot needed since a town has no ground to drop on). The pier's plank tile
  now counts only on Hearthwell, and the permit, the hours and the pearl are checked as the sender. Guests' other
  intents (tools, forage) on a town are still refused "Nothing to do here."

Not done or loose ends, for the owner:

- **Friendship is still one pool for the farm** (note 53 says per player, not built). Each player's parade, lantern
  and cake awards add to that pool, so more players give more points (capped by hearts), and the host's gift
  exchange moves the same pool. The wardrobe is also one: a guest who wins a hat puts it in the farm's wardrobe, and
  the hat parade checks the farm's worn hat.
- A guest's own letters (the Feast letter, achievement letters) are not made; the Feast draw is read from the
  scene as in single player.
- A first-time hosted day where a player already had this festival's key before the gate existed (the host
  walked in before others joined) is not entered for them; they walk out and in again.
- The scenes are type-checked and linted but not run in a browser: the waiting line, the hunt drawn from the view,
  the showing panel in a session, the cake "Taste" row, the lantern and pier through the host, and the walk
  home at the end. The Hat Parade march itself is still run on each player's own device from their own join minute.
- Guest versions of the Feast reveal walk, and the hedge maze walk for guests (movement inside the maze is the
  scene's own), are as in single player and were not changed.
- The host scene's fishing quirk: the pier gate on the host's own cast reads the plank tile on any map (the guest path
  now checks Hearthwell).
