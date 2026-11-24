# 108. Guests using screens (M4)

Drafted and settled with the owner on 2026-11-24. Extends note 53 (multiplayer). Today a guest may open
only the menu, the journal and the catalogue (`guestMayOpen`, `src/core/menupages.ts`); every other screen
is refused with "Only the host can do that for now." This note settles which screens a guest may use, the
shared-thing rules, and how a screen's changes reach the host. Stardew claims are from the saved
Multiplayer and Carpenter's Shop pages (read 2026-11-24) unless marked "from memory".

## Decided (owner, 2026-11-24)

1. **A guest uses every screen the host can (Stardew, from memory, SC-216).** Shops, shipping bin, chests,
   crafting, cooking, furnace and the other machines, animals, ponds, hall bundles, orders and the request
   board, carpenter, tailor, smith, gallery and shrine. A guest pays from their own purse (or the shared one,
   note 53 money rule) and uses their own pack, skills, tool tiers and professions.
2. **A chest is used by one player at a time (Stardew, from memory, SC-217).** A second player who opens it
   sees "Someone is using this chest." until the first closes it. The same lock covers the fridge, a pond's
   menu, a machine's menu and the camp chest. A lock frees when its holder closes the screen, leaves, or
   drops from the game.
3. **Hall bundle rewards: items to the finisher, world effects to all (Stardew, saved Multiplayer page).**
   The page says the Bulletin Board reward "is applied to all players, although item rewards are only given
   to the player turning in the bundle." So a bundle's items, hats and furniture go to the player who hands
   in its last item; its gold goes to that player's purse (the shared purse when money is shared). A room
   reward that changes the world (an opened area, a mended bridge, a new building) applies to everyone.
4. **Machines are shared (Stardew, from memory, SC-218).** Anyone may load a furnace, keg, cask,
   crystalarium or other machine, and whoever collects gets the goods and any experience.
5. **Limited shop stock is shared (ours, recommended).** One stock for the world: the travelling cart,
   Night Market stalls and one-a-day items. When it is gone, it is gone for everyone. It follows "only the
   host changes the world" (note 53).
6. **Animals: petting once a day per animal, by anyone (Stardew, from memory, SC-219).** The player who pets
   gets the experience. Products go to whoever collects them. Anyone may feed, buy or sell animals.
7. **Carpenter: anyone orders buildings with their own money (Stardew, from memory, SC-216).** A building
   records who ordered it (`owner`, the player id), for rule 9.
8. **A home is upgraded only by its occupant (Stardew, saved Multiplayer page).** The page says a cabin
   "can be upgraded at the Carpenter's Shop by the farmhand who occupies it, but not by the host or any
   other player", and the farmhand must be on the farm for the build nights. The farmhouse goes to the host
   by the same rule. A build night counts only when the occupant sleeps on the farm that night, so a guest
   who is away pauses their own cabin's build.
9. **Moving and removing buildings: a host setting (Stardew, saved Multiplayer page).** Off, own only, or
   all, set on the host's players list (Stardew uses a chat command; we have no chat). "Own" means the
   building's `owner` from rule 7; buildings made before this have the host as owner. Default: own only
   (Stardew's default is not on the page). The setting covers removing as well as moving.
10. **Cooking: any home kitchen (Stardew, from memory, SC-220).** A guest cooks at the farmhouse kitchen
    now, and at their own cabin's once cabins have kitchens (design item 3, cabin and pickup). They cook
    from their own pack and that kitchen's fridge (lock as rule 2).
11. **Build order: trade first (owner).** See "Build order" below.

Already settled elsewhere and not reopened: the gallery (each player collects their own reward, note 53),
special orders and the request board (every player gets the reward, note 53), the shrine (one shared score,
note 53 and 83), the bin pays the shipper when money is separate (note 53), and menus do not pause the clock
in a multiplayer game (note 53).

## How a screen's change reaches the host (technical, ours)

The rule from note 53 stands: only the host changes the world, and the guest never changes its copy before
the host's answer (no prediction, no rollback).

- **Screen actions.** Every change a screen makes becomes a named action in `src/core/` (for example
  `shop-buy {shop, id, n}`, `chest-move {chest, from, to, slot, n}`, `craft {recipe}`, `bundle-give {bundle,
  slot, item}`), run by one function `applyScreenAction(g, playerId, action)` through `asPlayer` (the same
  path as the farm intents, `src/core/roomintents.ts`). Screens stop editing the state directly; they call a
  dispatcher.
- **One dispatcher.** In single player and on the host, `dispatch(action)` runs `applyScreenAction` on the
  local state at once, so single-player play is unchanged. On a guest it sends the action as an intent and
  the screen redraws when the host's `applied` reaches the guest's copy (about 30 ms on one router, note 53
  spike). A `rejected` shows its reason in the screen.
- **Where the player stands.** The host accepts a screen action only if the sender stands at that screen's
  service (the counter, chest, machine or bed it opened from) on the same map, using the same reach rule as
  the host's own Use. Opening a screen is itself an action (`open {service}`), which also takes the lock of
  rule 2. This closes the "how near, which map" gap in note 53's farm intents for screens.
- **Shared screens refresh.** A guest's open chest, bundle or shop shows other players' changes as their
  `applied` messages arrive (stock, bundle slots, machine output).
- **Tests.** Each action gets a core test as the host (single player) and through a `Room` with a guest,
  including a refusal (not enough money, chest locked, wrong place). The single-player screens keep their
  existing tests.

This overlaps the FarmScene split (note 106, #904): screen actions move rules out of scenes into core.
Build each screen's actions as that screen is opened to guests; do not move every screen first.

## Build order

One group at a time, each with its own tests; each screen is removed from the guest refusal list
(`guestMayOpen`) when its actions are built.

1. **Trade (built 2026-11-24, #1014):** the dispatcher and `open` action with the lock, shops (buy, sell,
   shared stock), the shipping bin, chests (and the camp chest). See "Group 1 as built" below.
2. **Making (built 2026-11-24, #1014):** crafting, cooking (farmhouse kitchen), furnace and the other machines. See "Group 2 as built" below. The fridge is not in the game yet, so it is not built.
3. **Animals and ponds:** animal buy and sell at the farmstead, petting, feeding, collecting, pond menus.
4. **Hall:** bundles (rule 3), orders and the request board.
5. **The rest:** carpenter (rules 7 to 9, with the host setting on the players list), tailor, smith, gallery,
   shrine, and any screen still on the refusal list.

## Group 1 as built (build, 2026-11-24)

Code: `src/core/screens.ts` (the host's book of open screens, the locks, the reach check),
`src/core/screenintents.ts` (chest, camp chest and Night Market actions), `src/core/shopoffers.ts` (what each
counter sells and one `shopBuy`), the gate in `GameRoomWorld.apply` (`src/core/roomworld.ts`), and
`openShared`, `closeWhenDone` and `dispatch` in `src/scenes/guestlive.ts`. Tests: `tests/screens.test.ts`
(through a `Room`) and `tests/screens-socket.test.ts` (a host and two guests over real sockets).

- **`open {screen}` and `close`.** A screen ref is `{kind, map, x, y}` plus `stock` (a shop's special counter,
  or a market stall), `ore` (the ore bin) or `floor` (a camp chest). The host checks the ref (the chest exists, or
  the service of that kind stands on that tile), checks the reach, then takes the lock when the screen has one.
  Screens shown from `open`: `shop` (the general store and the fisher, pin, herb, trader, rain and hermit
  counters), `market` (Night Market stalls), `bin` (and the ore bin), `chest`, `camp-chest`. Only `chest` and
  `camp-chest` lock. The lock key is the tile, or the floor for a camp chest.
- **Every other action must name the screen the sender has open.** `buy`, `sell`, `ship`, `take-back`,
  `market-buy`, `chest-move`, `chest-send`, `chest-fill`, `chest-sort`, `chest-colour` and `camp-take` are
  refused with "open the screen first", "too far away" (the sender walked off) or "not the screen you opened"
  (a different chest, stall, floor or counter than the open one). A `buy` must also name something the open
  counter sells today, and a `ship` must match the bin (ore or not). The host's own player is exempt from this
  gate (it is at its own screen) but takes the same chest locks.
- **Reach (build, 2026-11-24).** The note says "the same reach rule as the host's own Use". The host's Use is
  the faced tile, and the host does not know a guest's facing in time, so the reading is: the guest's last
  reported tile is within 2 tiles (`REACH_TILES`) of the service tile on the same map, which allows a step of
  lag. A camp chest checks the floor's map only, because the floor's layout is made in the scene, not in core.
  The gate is on only when the world is given a `where` function (a real host session passes the Room's
  positions; the unit tests that call `apply` without one are unchanged).
- **Locks free** when the holder closes the screen, opens another, leaves, or drops (`Room.disconnect` calls
  `playerDropped`, which releases). The refusal reads "Someone is using this chest." The host's own chest screen
  takes the same lock, so a guest in a chest locks the host out and the other way round.
- **Shared stock (rule 5).** The counters' one-off stock is a world flag in the host's state (the hermit's
  elderfruit, a market line's `once`, the Homeward pin), and every buy runs on the host, so once one player has
  it, it is gone for all. Nothing in the market stock is limited at the moment (no line has `once`), so the
  hermit's elderfruit is the live case, and it is tested with two guests.
- **Sell and bin credit.** A guest's `sell` pays the sender's wallet (their own purse, or the shared one when
  money is shared). `ship` and `take-back` are the existing note 53 behaviour: the bin line records its shipper
  and the night pays the shipper's wallet.
- **Host through the Room (build, 2026-11-24).** In a hosted game, the host's own chest moves and its bin ship
  and take-back go through `Room.hostIntent`, so they reach every guest's copy as `applied`. Before this the host's
  bin lines never reached a guest's copy, which also threw off a guest's `take-back` index. The host's shop and
  market buys still change the host's state directly (a guest's copy of the host's purse is only refreshed at
  night, harmless because the host judges everything).
- **Guest's screen.** A guest's Action on one of these tiles sends `open` and waits for the host's answer
  (`GuestSession.ask`); the screen appears on yes and the farm shows the reason on no. A refusal while the screen
  is up shows in the screen. The chest screen redraws when another player's `applied` arrives.
- **Left for later.** The shop hours (`counterShutLine`) are checked in the guest's scene, not by the host. The
  backpack upgrade row stays host only ("Only the host can do that for now."). The chest colour bar on a guest's
  screen does not repaint its highlight until the screen is reopened. Mine floors for guests (note 53, design
  item 2) are still open, so the camp chest action exists but a guest cannot yet reach a floor.

## Group 2 as built (build, 2026-11-24)

Code: the new intents are in `src/core/screenintents.ts` (`craft`, `cook`, `smelt`, `furnace-take`, and
`screenNeed`, which says which screen an intent needs) and `src/core/roomintents.ts` (`machine-load`,
`machine-collect`); screen kinds `crafting`, `cooking` and `furnace` in `src/core/screens.ts`; the machine reach
check in `GameRoomWorld` (`machineGate`). The three scenes use `dispatch`, `followGuest` and `closeWhenDone`.
Tests: the "making" block of `tests/screens.test.ts` and the group 2 test in `tests/screens-socket.test.ts`.

- **Screens.** `crafting` opens from a workbench (a furniture piece on a house tile), `cooking` from the stove,
  `furnace` from the furnace. `cook`, `smelt` and `furnace-take` need their screen open (same gate as group 1:
  open, in reach, the screen you opened). A `craft` with a `bench` needs the workbench open and then draws on the
  chests beside it (the chests are read from the opened tile, not from the intent). A `craft` with no `bench` is
  the pause menu's crafting, from the sender's pack alone, and needs no screen. The Craft tab is no longer
  hidden from a guest's menu.
- **Who gets what.** Every action runs as the sender (`asPlayer`): ingredients leave the sender's pack, dishes
  and bars go to the sender's pack, recipes known are the sender's. The furnace is one shared machine, so anyone
  may load it and whoever takes the bar gets it (rule 4).
- **Locks.** Only the furnace locks (rule 2, "a machine's menu"): "Someone is using the furnace." The host takes
  the same lock when it opens the furnace. The stove and the workbench do not lock: they hold nothing between
  uses. A workbench draws on the chests beside it without asking whether another player has one of them open.
- **Machines on the farm (kegs, jars, bee houses, bins and the rest).** They have no menu, so no screen and no
  lock. A guest's Use with a held good on a machine sends `machine-load {x, y, item}`, which runs the host's
  `resolveUse` as the sender. A guest's Action sends `machine-collect {x, y}`, which runs `resolveAction` as the
  sender, and only for a finished batch (a working machine answers "machine busy", it is never lifted by this
  action). Both must come from within 2 tiles of the machine (the same reach as screens). Whoever collects gets
  the goods and any experience.
- **Fridge (build, 2026-11-24).** Rule 10 and the build order name the kitchen's fridge, but the game has no
  fridge yet (no item, furniture or save field), so cooking draws on the sender's pack only, as the host's does.
  The fridge, its lock and cooking from it come with whichever note adds a fridge. A guest's own cabin kitchen
  also waits for cabins to have one (design item 3).
- **Casks and the cave dehydrator** (cellar and cave maps) are not reached: guests are on the farm map for
  world intents (design item 2). They are the same kind of change when that opens.

## Open (later items, not this note)

- A guest's own cabin interior, its kitchen and its bed, and picking up ground drops (design item 3).
- Guests on maps other than the farm for tool and world intents, and mine floors (design item 2). Screens
  work on any map under the rule above, because they do not change map tiles.
- Festivals with several players (design item 4).
