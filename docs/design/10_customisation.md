# 10 Customisation and decoration (draft)

Built 2026-11-07: hats (wardrobe on H or the Hats button, a placeholder block on
the player, hats from the Hat Parade gift and counter). Furniture is built the same day: ten one tile
pieces sold from the carpenter's daily stock and placed in the house. The
wallpaper, floors, the hatter and achievement hats are not built.

Status: draft. Written from reader 1's feedback (decorating was raised three
times) and the design talk of 2026-10-27. Nothing here is built. It is outside
the first playable, so it needs this note before any code (see CLAUDE.md,
Scope). Target: M3 for the first slice, more later.

Built 2026-11-08: wallpaper and flooring. Two of each (`src/content/decor.json`),
200g each at the carpenter's (Stardew's price, placeholder, always on sale),
backpack items that cannot be sold. Use on a faced tile of a built room covers
that whole room (`src/content/house-rooms.json`, five rooms by house tier) and
the item is used up; a new floor or wallpaper replaces the old one. Saved as
`decor` per room (old saves have none). Drawn as a flat tint on the floor and
wall tiles. Not built: hall bundle rewards that give wallpaper, other shops, and
whether Stardew's general store should sell them instead (still not asked).

## Why

Reader 1, a long-time Stardew Valley player, named decorating as a genre like,
as something expeditions should give, and as what would keep them playing for
40 hours. Customisation is a long-term reason to keep playing that does not
need combat or threat, which suits a cozy game.

## Approach

Mechanics follow Stardew Valley's shape, in our own content and names (ADR
0002): customisation is earned as rewards, not only bought. The Brimmers
already love hats (see `09_story_and_lore.md`), so hats and clothes are a
natural centre.

Parts to consider, each a separate slice:

1. **Home decoration.** Place furniture in the house. Wallpaper and flooring.
   Sources: village hall bundle rewards, shops, quests and expedition finds.
   Placement is a grid on the house interior.
2. **House upgrades.** Larger house in steps, paid in coin and materials.
   More rooms mean more space to decorate.
3. **Character look.** Hats, clothes and hair. Hats come first because they are
   already part of the lore (a hat shows standing in the ledger).
4. **Tailoring.** A sewing machine station that turns cloth and found items
   into clothes and hats. Cloth comes from farming (a fibre crop and a loom, or
   similar) and expeditions, so it feeds the farm loop.
5. **Dyes.** Colour clothes with dyes made from crops and forage. Gives
   flowers and forage a second use.
6. **Farm decoration.** Fences, paths, lamps and small ornaments outdoors.
   Later.

## Where it comes from

- Hall bundles: a few bundle rewards are furniture or wallpaper. This reuses
  the existing bundle reward data.
- Shops: the general store sells basic furniture, rotating stock later.
- Expeditions (ring 2): rare furniture, cloth and dye plants.
- Friendship: villagers give or sell a keepsake at set hearts.
- Festivals: a festival shop or prize (see the festival list in
  `09_story_and_lore.md`).

## Fit with the rest

- Items are data, so furniture and clothes are new item kinds, not new systems.
- Saving needs to store placed items and what the player wears. Plan the save
  version bump when the first slice lands.
- No decay, no upkeep: decoration never needs maintaining.
- Placeholder art first. Furniture is many small sprites, so it is an art cost
  to budget for the art pass (#58).

## Decisions (2026-10-31)

Each was a choice with a Stardew option, checked against the saved Furniture
and Hats pages.

- **Furniture stock is random and daily, with a catalogue (Stardew).** The
  carpenter offers a random selection of furniture each day at fixed prices.
  After the first house upgrade the carpenter also sells a furniture catalogue.
  Once placed, using it gives unlimited copies at 0g. Furniture cannot be sold
  or gifted. Built: the catalogue is a 200,000g one-time purchase after house
  tier 1 that yields a placeable item. Stand it in the house; Action on it opens
  a list of every piece to take at 0g, and the hand picks it up again. Old saves
  that bought the shop unlock are given the item. Slice 1 needs a pool big enough that a daily pick feels varied, so
  the "five to ten pieces" the first slice once named is the floor, not the
  target. Prices and the pool size are open.
- **One catalogue per people, later.** The owner wants a catalogue for each
  group (halflings, humans, wizards, elves, dwarves), each with its own
  furniture style, as a way to use the groups from `09_story_and_lore.md`.
  Slice 1 has the one general catalogue. The others wait until their groups
  are designed. Where each one comes from is open.
- **Hats unlock by achievement (Stardew).** Each achievement unlocks a hat for
  sale at a hat seller, and a few hats come from festivals and bundle rewards.
  In Stardew the first achievement triggers a letter from the seller, and the
  seller is a mouse in the Abandoned House. Ours is a hatter's shop in
  Hearthwell run by the Hat-maker household already in `20_ring1_cast.md`
  (decided 2026-10-31), a shop-and-home interior like the others, because the
  Brimmers are named for hats and Hearthwell had no such shop. The
  achievement list is in `38_achievements.md` (#196). Stardew's prices run from
  1,000g to 25,000g.
- **Hats show in the world sprite (Stardew).** The hat is drawn on the player
  on the map, not only in a portrait. This replaces the M3 decision in
  `13_m3_scope.md` (portrait only), which already named the world sprite as the
  first thing to cut. Hats need art per facing and walk frame, so the world
  sprite stays the cut if slice 1 runs long.
- **Hats show standing in the ledger (ours).** Stardew's hats do nothing. Ours
  are also free of gameplay bonuses, but wearing one reads as a sign of
  standing among the Brimmers, as `09_story_and_lore.md` decided: a light
  cosmetic readout of friendship, with no separate favour currency and no ledger
  screen.
- **Grid, stacking and the sewing machine (proposed, not asked).** Furniture
  snaps to the 16 px tile grid, as in `06_map_style.md` and Stardew. There is
  no stacking in slice 1 (rugs sit under other pieces; items on tables come
  later). The sewing machine is not in slice 1. These stand unless the owner
  objects.

## Suggested first slice (M3)

Furniture placement in the house with a daily random stock, two wallpapers, two
floors, and hats you can wear and see on the world sprite. Rewards from two
bundles. Tailoring, dyes, house upgrades and the per-people catalogues follow
once the first slice feels good.

## Open

- The hatter's shop is not yet on the Hearthwell map, and the cast planner
  and `20_ring1_cast.md` now list it. The hat-makers' dialogue and the
  achievement letter are not written.
- The first hat list is the achievement list in `38_achievements.md`. Hats for
  achievements that need systems we lack get names when those are designed.
  Bundle 24's festival hats and the Hat Parade prize are extra hats outside it.
- How the standing readout works when the player can pick any hat they own. One
  option is that the Brimmers' dialogue and the parade react to standing, and
  the hat is only the look. Settled in `61_friendship_and_gifts.md`: the hat is only the look.
- The furniture pool size, prices, and which house upgrade offers the
  catalogue (the house upgrade list is in `41_house.md`; which tier offers the
  catalogue is still open).
- What the sewing machine costs and how the player unlocks it.
- Where each per-people catalogue comes from, and what makes the furniture
  style differ.
- Wallpaper and flooring: Stardew sells them at 200g each from the general
  store, each covering a whole room, as read from the saved pages. Whether
  ours match is not yet asked.

Details of Stardew Valley's own system were checked against the saved
Furniture and Hats pages on 2026-10-31. Earlier lines of this note that
describe Stardew were recalled from memory.
