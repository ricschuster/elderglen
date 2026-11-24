# 109. Guests off the farm (M4)

Drafted and settled with the owner on 2026-11-24. Extends notes 53 (multiplayer) and 108 (guests using
screens). Today a guest's tool intents (till, plant, water, harvest, axe, pickaxe) work on the farm map only,
the host does not check how near the guest is or which map they stand on, and a guest cannot pick up ground
drops (note 53 "Built status"). This note settles the world rules for players on every map. Stardew claims are
from the saved Multiplayer page (read 2026-11-24) unless marked "from memory".

## Decided (owner, 2026-11-24)

1. **One world for everyone.** Every map is shared: forage, trees, rocks, fishing spots, creatures and
   ground piles off the farm are the same for all players, and the first to take a thing has it. The host
   holds every map a player is on (the note 53 spike found all 38 maps fit in about 69 MB).
2. **Mine floors are shared (Stardew, from memory, SC-221).** A floor is made once a day, and everyone on it
   sees the same rocks, ladders, chests and creatures. A rock one player breaks is gone for all. Floors reset
   daily as in single player (note 22, "Daily reset only").
3. **Mine progress is shared (Stardew, saved Multiplayer page: "Mine progress is global").** The deepest
   floor and the lift stops are the world's, so any player can ride to a floor another reached.
4. **Mine treasure chests are per player (Stardew, saved Multiplayer page: "each player can open chests for
   themselves").** Each player opens each chest once for their own reward. This matches note 22's
   "one item once per player, never reset" on every 10th floor.
5. **Ground drops: anyone may pick them up (Stardew, from memory, SC-221).** The first player to walk within
   their pickup radius (note 43, `pickupRadius`) takes the pile. Drops now land on the host's ground and
   reach every guest, so a guest can see them and take them.
6. **Fainting and passing out: the single-player rule, per player (Stardew, from memory, SC-221).** Only the
   player who faints pays our single-player cost and wakes at home. The others play on. The day end rules of
   note 53 are unchanged.
7. **Creatures chase the nearest player on their floor or map (ours, recommended).** Health, hits, buffs and
   rings stay per player. The player who lands the beating blow gets the combat experience and the kill
   (ours). Loot falls as ground piles (rule 5).
8. **The dangerous-mode lever: anyone may flip it, for everyone (ours, recommended).** Any player may flip
   it once the world has reached floor 120 (rule 3). Every player is told.
9. **The lever takes effect the next day, on every floor (owner, 2026-11-24, "what Stardew does").** A
   flip sets the mode for tomorrow. Today's floors, dug or not yet made, keep today's mode, so nobody loses
   dug progress and nothing rerolls. This replaces the 2026-11-23 build rule ("floors made after the flip
   change today") in single player too. The lever's prompt says "From tomorrow, the mine is dangerous."
   (or "is calm."). Flipping twice in a day cancels it out.
10. **Slayer counts: per player (owner chose Stardew; SC-222 answered 2026-11-24).** Each player has their own
    kill counts on the wall list at Maren's and claims each reward once for themselves. One player's kills
    never fill another player's goal. A co-op perfection guide says Stardew's goals cannot be shared between
    players (a fan source, not the wiki). Build with the guest groups: counts move from the farm to each player.

## How it works (technical, ours)

- **Intents carry the map.** Every tool and world intent (`till`, `plant`, `water`, `harvest`, `axe`,
  `pickaxe`, and the weapon, rod, bomb and forage intents added here) names the map and tile. The host runs
  it on that map as the sender, through `asPlayer`, like the farm intents.
- **Reach and map check.** The host accepts an intent only if the sender stands on that map and the tile is
  within the same reach as the host's own Use. Otherwise it is rejected ("Too far away.").
- **Pickup.** The host checks each player's position against the ground piles on their map each tick and
  moves a pile into the first pack that has room (the single-player rule, note 43). Piles are part of the
  map state sent to guests.
- **Mine floors.** A floor that any player is on stays loaded on the host. Creatures step on the host and
  their positions go out with the position snapshot. Combat hits are intents (`swing {map, x, y, facing}`);
  the host resolves damage and sends health changes to the hit player.
- **Fishing.** Each player's catch screen runs on their own device as a screen (note 108). The cast and the
  catch are intents, so the host picks the fish and the result follows the single-player rules.
- **Randomness.** All rolls happen on the host (`#977` injectable RNG), so the guest's copy never drifts.

## Build order

After note 108 group 1 (the dispatcher and locks), as one group per pull request step:

1. The lever rule 9 (single player too; small, can go first). **Built 2026-11-24:** `Mines.dangerousTomorrow`, applied by `Mines.endDay` from `sleep`; saved as `dangerousTomorrow` only while it differs from today's mode.
2. Map and reach on the existing intents, and ground pickup for guests. **Built 2026-11-24** (see "As built").
3. Off-farm world intents: forage, axe and pickaxe on every map, fishing cast and catch. **Built 2026-11-24**, with the guest catch bar and ice casts (finishing pass).
4. Mine floors with several players: shared floors kept loaded, creatures chasing the nearest player, swing
   intents, fainting per player, mine chests per player. **Built 2026-11-24**, with the slayer wall list screen, bombs and health bars (finishing pass).

## Open

- A guest's own cabin, kitchen and bed (design item 3).
- Festivals with several players (design item 4).

## As built (build, 2026-11-24)

Steps 2 to 4, with the build choices where this note was silent. Code: `src/core/roommaps.ts` (any map as the host
works it), `roomintents.ts` (map named intents), `roomplay.ts` (pickup, map state, creatures, swings, fainting,
fishing), `roomworld.ts` (the gates), `src/net/guestapply.ts` (the guest's copy). Tests: `tests/roomplay.test.ts`,
`tests/offfarm-socket.test.ts` (real host and two guests).

- **Map and reach (step 2).** `till`, `water`, `plant`, `harvest`, `axe`, `pickaxe`, `forage` carry an optional `map`
  (the farm when absent). A guest's intent is refused "Too far away." unless they stand on that map and within
  `REACH_TILES` (2) of the tile; a map the host does not run (not the farm, an area map or a mine floor 1 to 120)
  is refused "Nothing to do here." The host's own player is not checked (its scene judges). Crops, machines and
  ponds are farm only. The machine and pond intents keep their older gate and its lower case line.
- **One world at a time in the state.** The state's `trees`, `rocks`, `ground` and the rest hold one map. For a
  guest's intent the host swaps that map's world in for the call and puts back the host's own (`withWorld`,
  `onMap`). A mine floor gets an empty world whose ground is the floor's, so a farm sprinkler or machine on the same
  tile is never touched from the mines.
- **Ground pickup.** Each tick the host moves any pile within the guest's pickup radius (their own magnet rings)
  into their pack, on every map; the first guest to arrive takes it. The host's own pickup stays in its scene.
- **Map state out.** A `mapstate` message (ground piles, and for a mine floor its rocks and ladder) goes to the
  guests on a map when it changes and whole to a guest who arrives. A `creatures` message goes every tick to the
  players on a floor or creature map. A guest's copy takes both as sent (`applyServerMsg`).
- **Forage (step 3).** A `forage {map, x, y}` intent runs the Action pick rule as the sender, only where forage lies.
- **Fishing (step 3).** `cast {map, x, y, rod, distance}`: the host checks the water tile, the reach (rod range + 1),
  the rod in the pack and the sender's energy, rolls the bite with the host's dice, and sends the sender a `bite`
  message. `catch {perfect}` or `catch {miss: true}` lands or drops it (fish, Pearl Lobster, trash, find) as the
  sender; the result reaches them as a `player` message. Choices: a cast spends the guest's energy but no game time
  (the clock is everyone's); guests fish without bait or lures (the rigs and the fish log are the farm's, not a
  player's); no ice contest or pier cast for guests yet; `perfect` is the guest's word. The scene lands a plain
  catch after a beat for now (no bar on the guest's screen yet).
- **Per player combat (step 4).** Each player record now holds its own `combat` (health, trainer, kills, slayer
  claims, camp chests opened) and `equipment` (rings). `g.combat` and `g.equipment` follow the acting player through
  `asPlayer`, so slayer counts are per player (rule 10) with no other change; guests' records are saved with them.
  Also fixed: slayer `goal:` claims were dropped on load (a reload let an item goal be claimed again).
- **Creatures (rule 7).** The host steps every floor or creature map that has a guest and no host (each creature goes
  for its nearest player). On the host's own map its scene steps them with the same nearest-player rule, over the
  host and the guests there, and a guest's hit goes to `RoomPlay.hurtPlayer`. Guests step nothing; they draw the
  creatures the host sends. Guests' Assist and "no creatures" settings are device settings the host does not know,
  so a guest is always hit at full strength (loose end).
- **Swings.** `swing {map, weapon, facing, x, y}`: the weapon must be in the sender's pack and the sender must stand
  on the map (the host's own record of where they stand wins over x and y). The host finds the creatures in reach,
  hits with the sender's skills and kill buff, splits slimes, and a beaten creature pays out to the sender (kill
  count, experience, drops on the ground, the ladder roll). The cooldown is kept on the host, with 20 percent slack.
  Slings aim along the facing only for now.
- **Fainting (rule 6).** When a guest's health runs out they pay the pass-out gold share (cap as the day end) and lose
  up to three stacks to the trainer's counter (their own `counter`), health is refilled, and the host sends `faint`;
  the scene sends them home. The day does not end, energy is unchanged, and they are not chased again on that map
  until they leave it. The host's own fainting is unchanged (it ends the day).
- **Camp chest (rule 4).** Each player takes each camp item once (guests' list on their combat record; the host's is
  still `Mines.campOpened`). Casks are in the cellar, not the mines, and are not in this note.
- **Shared floors.** A floor is made once a day by `Mines.visit`, which every player on it shares, and it stays in
  memory with the state; dropped or sleeping guests are not targets or pickers.

### Finishing pass (build, 2026-11-24, later)

- **Slayer wall list as a guest screen.** Screen kind `walllist` (service `wall-list` at Maren's counter in the
  mine hall), opened with `open` like the other screens. `slayer-claim {goal}` and `slayer-buy {item}` run on the
  host as the sender (`asPlayer`), so the kills, the claims and the purse are the sender's own. The scene sends
  them through the dispatcher and no longer edits the copy for guests. The wardrobe is still one for the farm, so a
  hat reward goes to the shared wardrobe (loose end, as for the hall's hat bundle).
- **Guest fishing bar.** After `bite`, the guest's `FishingScene` opens in guest mode (`FishingData.guest`): the
  hook window and the bar play locally for the fish the host named, then the scene sends `catch {perfect}` or
  `catch {miss}`. Trash, finds and the Pearl Lobster have no bar: the scene sends a plain catch at once. The guest's
  fishing assist is a device setting and shapes their own bar. The scene lands nothing locally; the pack changes
  when the host's `player` message arrives. The cast itself is still instant on Use (no charge on the guest).
- **Ice fishing and the pier.** The host's cast applies the Frostday rules: the lake is shut until it opens
  ("The lake opens at noon."), and a cast into a hole can bring the Frostfin. A guest's
  hole catch now counts for the contest (note 111 decision 5, replacing the earlier "host only"). The pier checks
  (permit and hours from the plank the sender stands on, the night odds, market fish, the pearl) are in the host's
  cast, and since note 111's build Hearthwell is hosted for casting (`townView`), so a guest can fish from the pier
  with their own permit.
- **Bombs.** `bomb {map, x, y, item}`: the host places it as the sender (the single player rule, the sender's
  pack), keeps the fuse, and on the blast breaks the rocks the thrower's Mining level allows and hurts creatures,
  every kill paying the thrower. Guests in the circle lose health (a share of maximum, never lethal). `bomb` (lit)
  and `blast` messages go to the guests on the map, whose scene blinks the tile and plays the boom. Not done: the
  host's own player is not hurt by a guest's bomb, and the host's scene does not draw the guest's fuse or boom
  (it sees the rocks and creatures change).
- **Training dummy.** A guest hits the dummy on their own screen (the number and the line); nothing is sent, as the
  dummy has no state.
- **Creature health bars.** The `creatures` message rows carry `max` (full health, three times on a dangerous
  floor). Every player's scene (the host's too, which had none) draws a thin bar over a creature that has lost
  health.
- **Sling aim.** A guest's sling shot sends `ax` and `ay` (the direction to the pointer or tapped spot); the host
  fires along it.

Not done (needs the owner or a later pass): Assist and "no creatures" for guests (they stay a device setting the
host does not know, so a guest is always hit at full strength); casks and the cellar; a browser run of any of it
(all scene edits are untested in a browser); the contest count per player; the host feeling a guest's bomb.
