# 110. The guest's cabin (M4)

Drafted and settled with the owner on 2026-11-24. Builds on note 85 ("The cabin"), note 53 ("Cabin rules")
and notes 108 and 109. Most of the cabin was settled in note 85 (2026-11-11): this note adds the few missing
rules and the build order. Stardew claims are from the saved Cabin, Carpenter's Shop and Multiplayer pages
unless marked.

## Settled before (not reopened)

- The cabin interior is the farmhouse map, not a copy: one `house.json`, with per-owner tier, renovations,
  furniture, chests, spouse and bed (note 85, Stardew checked: identical to the farmhouse).
- Only the occupant upgrades or renovates their cabin, with their own wallet (note 85, note 108 rule 8). A
  build night counts only when the occupant sleeps on the farm.
- A visitor may enter any cabin and sleep in it. Only the owner can move their own bed (note 85, Stardew
  checked).
- Cap of 7 cabins, free at a multiplayer start, 100 gold and built at once otherwise, placed freely (note 53).
- A dropped guest counts as in bed and is put in their cabin (note 53).
- Cooking at any home kitchen (note 108 rule 10); mine chests and the camp chest gift are per player (note
  109 rule 4).

## Decided (owner, 2026-11-24)

1. **A player wakes in the bed they slept in (ours, recommended).** Any bed in any home counts for the day
   end. A player who passed out (the day limit or exhaustion) wakes in their own home, as in single player.
2. **Three outside styles (Stardew, saved Carpenter's Shop page: log, stone and plank cabins).** Ours get
   three placeholder looks, picked when the cabin is placed (the first one at a multiplayer start, changeable
   later at the carpenter; ours). Names and art come with the art pass (M3d); the placeholder names are
   Log, Stone and Plank.
3. **Each player has their own mailbox by their home (Stardew, saved Multiplayer page: "Each player has a
   separate mailbox and spouse porch area").** A guest's mail (note 53: mail is per player) arrives in the
   mailbox beside their cabin door.

## How it works (technical, ours)

- **One map, one instance per owner.** The `house` map loads once per home that any player is in, holding
  that owner's tier, renovations, furniture, chests and bed. A cabin's farm door is an exit to its owner's
  instance. The host holds the instances in use (note 53 spike: memory is fine).
- **The cabin book is saved.** Today the cabin book (who owns which cabin, where, its style) is not in the
  save (note 53, step 6 "Left"). It goes into the world save with a version bump (note 52).
- **Join and rejoin.** A guest starts the day and rejoins in their own cabin, by their bed.
- **Beds.** A bed service in any home instance sends `sleep` (note 53). The wake tile is saved per player.

## Build order

After notes 108 and 109 groups that it needs (the dispatcher for the carpenter screen):

1. Cabin book in the save; the `house` instance per owner; the cabin door exit; join, rejoin and dropped
   guest placement in the own cabin.
2. Beds in any home, wake where slept, pass-out to own home; the owner-only bed move.
3. Per-player mailbox at each cabin.
4. The three placeholder styles, picked at placement and changed at the carpenter.
5. Cabin tiers and renovations through the carpenter (note 108 group 5).
