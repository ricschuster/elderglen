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

1. **Trade:** the dispatcher and `open` action with the lock, shops (buy, sell, shared stock), the shipping
   bin, chests (and the camp chest).
2. **Making:** crafting, cooking (farmhouse kitchen and fridge), furnace and the other machines.
3. **Animals and ponds:** animal buy and sell at the farmstead, petting, feeding, collecting, pond menus.
4. **Hall:** bundles (rule 3), orders and the request board.
5. **The rest:** carpenter (rules 7 to 9, with the host setting on the players list), tailor, smith, gallery,
   shrine, and any screen still on the refusal list.

## Open (later items, not this note)

- A guest's own cabin interior, its kitchen and its bed, and picking up ground drops (design item 3).
- Guests on maps other than the farm for tool and world intents, and mine floors (design item 2). Screens
  work on any map under the rule above, because they do not change map tiles.
- Festivals with several players (design item 4).
