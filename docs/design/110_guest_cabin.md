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

## As built (build, 2026-11-24)

Steps 1 to 5, with the build choices where this note was silent. Code: `src/core/cabins.ts` (the book, styles, load),
`homes.ts` (instances, beds, wake spots), `cabinhome.ts` (the occupant's carpenter orders, builds, mailbox),
`cabinmap.ts` (cabins on the farm map), `roomworld.ts` (join, sleep, wake, drop). Tests: `tests/cabin-homes.test.ts`,
`tests/cabin-socket.test.ts` (real host and three guests over sockets).

- **Cabin book in the save (step 1).** `GameState.cabins` is the book and the world reads and writes it, so it is saved
  and goes out with every `farm` snapshot. It is an optional field within save version 4 (the `playerMarriage`
  precedent), not a version bump: an old save loads with no book and a first hosting starts one; an empty book is not
  written. Each cabin now also holds `style`, `tier`, `renos` and `build`; a save that lacks them loads the defaults
  (Log, tier 0, none). Beds are `book.beds[owner]`.
- **One `house` instance per owner.** The instance id is `house@<owner>` (the host's is plain `house`).
  `MapRegistry.get`, `getWith`, `marksWith` and `maxTier` strip the `@owner` suffix (`baseMapId`), `isHouseMap` accepts
  it, and furniture, chests, locks and the screen reach checks key on the full instance id, so each home has its own
  with no other change. A home's tier and renovations come from its owner (`homeData`, `homeHoldsOf`); the farm scene
  builds the instance with them.
- **Cabin on the farm.** Occupied cabins are drawn (placeholder colour, roof, door, mailbox) and stand on the scene's
  farm map: footprint blocked except the door tile, which is an exit to the owner's instance; the mailbox tile is
  blocked and is a service. Leaving a guest's cabin lands at its door (`cabinSpawnTile`), not at the farmhouse. The
  host may walk into any cabin.
- **Join, rejoin and drop.** `hello` carries `start`, the tile in the guest's own home by their bed, and the lobby
  starts the scene there (a rejoin too). A dropped guest is moved there on the host's books (a `Placement` the Room
  applies to their last position).
- **Beds (step 2).** The bed prompt in any home sends `sleep`; the host records which home they slept in from their
  position. At the new morning each guest gets `wake {map, x, y}`: the slept home's owner's bed tile, or their own
  home's after a pass-out. The faint path uses the same spot (`faint.at`) instead of the farmhouse door. A bed is a
  tile, not furniture: the default is the wake tile of the tier (40,31 at tier 0, 46,24 from tier 1) and the
  `bed-move {map, x, y}` intent, owner only (a married pair share the proposer's home), puts it on any free floor tile
  of their own home at their tier (no furniture, chest, service or door). The bed prompt has a "Move my bed here"
  button in a session. The bed fixtures themselves (the two `bed` services in `house.json`) do not move; sleeping is
  at those.
- **Mailbox (step 3).** `PlayerRecord.mail` is each player's own mailbox (the local accessor `g.mail` follows the
  acting player). The host's letters stay in the flat save; a guest's are in their player record. At the morning the
  host delivers what is due into each guest's mailbox. A `mailbox` screen opens only on the sender's own mailbox
  (their cabin's, or the farm's for the host: "That is not your mailbox."), and `mail-read {id}` opens a delivered
  letter and takes its gift as the sender. The scene shows the guest the card and says the gift is in their pack.
  Letters are queued into a guest only by what the host does for them (the trainer's post and the like); the
  achievement and friendship letters stay the host's, since those triggers read the host's record.
- **Styles (step 4).** Log, Stone and Plank, in `CABIN_STYLES`. A cabin takes a style when it is bought (`buyCabin`
  takes one; the free multiplayer-start cabin takes the first, Log). The occupant changes it at the carpenter
  (`carp-style`, a row per style on the House tab), free and any time. Choice: only the occupant may, as with every
  cabin change; the host has no style of its own (the farmhouse is the art pass's).
- **Tiers and renovations (step 5).** The carpenter's `carp-house` and `carp-reno` now act on the sender's own cabin
  for a guest (their wallet and pack; renovation refunds check their own instance's furniture and chests). The
  carpenter screen reads the player's own home (`homeViewOf`). A cabin build runs three mornings like the
  farmhouse's, independent of the host's farmhouse build and of the farm builds (choice: no shared "carpenter is busy"
  across homes). A night counts unless the occupant passed out away from the farm and the farm's houses; a festival
  morning never counts. The morning report tells the guest when their rooms opened.

Choices, listed so the owner can overrule them: the cabin's mailbox stands at the door's right, one tile below the
footprint; a visitor who sleeps in another home wakes in that home (the owner's bed tile), but a pass-out is always
to the player's own home; a rejoining guest starts in their own cabin even if they dropped while in another home; a
cabin upgrade by a guest does not need the host's carpenter to be free.

Not done (needs the owner or a later pass): furniture and decor placing for guests, so a cabin's furniture and chests
are structural only (the keys are per instance and tested for the lock and reach paths, but a guest cannot place
anything yet); the spouse room and divorce chest in a cabin (a cabin never holds `spouse`); a guest's own
achievement and friendship letters; guests' spouse walkers and children in the cabin; moving a cabin after placement
and demolishing one from a screen (`demolishCabin` exists in core, no screen); the host's choice of site and style
when it buys a cabin (the screen for `buy-cabin`); real names and art for the three styles; a browser run of any of
the scene edits (all untested in a browser, only type-checked).
