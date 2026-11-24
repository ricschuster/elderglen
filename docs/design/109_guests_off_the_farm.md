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
10. **Slayer counts: open (owner chose Stardew; not checked, SC-222).** Whether the wall list at Maren's
    counts kills per player or for the world waits for the owner's check. Until then the build keeps counts
    as they are and the guest group in this note does not touch them.

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

1. The lever rule 9 (single player too; small, can go first).
2. Map and reach on the existing intents, and ground pickup for guests.
3. Off-farm world intents: forage, axe and pickaxe on every map, fishing cast and catch.
4. Mine floors with several players: shared floors kept loaded, creatures chasing the nearest player, swing
   intents, fainting per player, mine chests per player.

## Open

- SC-222: slayer kill counts in multiplayer (rule 10).
- A guest's own cabin, kitchen and bed (design item 3).
- Festivals with several players (design item 4).
