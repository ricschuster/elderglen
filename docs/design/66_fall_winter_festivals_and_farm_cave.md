# 66 Fall and winter festivals, and the farm cave (draft)

Status: draft, 2026-11-07. The four forks below were decided with the owner.
Everything else is the assistant's proposal and every number is a placeholder.
Nothing here is built. It unblocks build 4 (fall and winter) and the rest of
build 5 (the farm cave) in slice 1 (`33_build_order.md`). Stardew's saved
Festival, Fair, Spirit's Eve, Festival of Ice, Winter Star, The Cave and
Artisan Goods pages were read as reference only and nothing is copied
(ADR 0002). Our names, items, maps and text.

## What was already settled

The handoff of 2026-11-07b said the #61 numbers were open. They are not. Note 07
holds the fall crops, the fall and winter forage and goods, winter soil
digging, rare finds, fall and winter weather and the six fruit trees (decided
2026-10-31). Build 4's data work (crops, forage, trees, nightfall, snow) can
start without more input. The gaps were the four festivals (note 14 gives names
and one line each) and the mushroom cave. Both are below. The farm cave mark
(25,000g of total earnings) and the fruit bat chances are in note 07.

## Decided with the owner (2026-11-07)

1. **Frostday is an ice sculpture day in slice 1.** Fishing is slice 2, so the
   ice fishing contest is added then (Stardew's Festival of Ice is built round
   a fishing contest, checked). Ours has the sculptures, snowmen and a shop
   first, and gains the contest later.
2. **Hollow Eve is a lantern maze with a prize at the end (Stardew).** Stardew's
   Spirit's Eve is a haunted maze at night with a chest at the end (checked).
   Ours has harmless scares only, as note 14 says.
3. **The mushroom cave comes with a free dehydrator (Stardew).** We add the
   dehydrator as a machine (below). Stardew's mushroom cave includes one
   (checked).
4. **The Harvest Showing is a display of up to nine goods, scored for points
   (Stardew).** Stardew's Grange Display scores quality and diversity, and the
   place won pays tokens (checked). The weights are ours.

## Harvest Showing (Fall 9)

- Opens at noon on the green, as every festival (`14_festival_calendar.md`).
  A display table stands by the judge. The player puts up to 9 goods on it,
  then talks to the judge. Goods go back to the pack after judging, so nothing is ever lost.
- **Points**, all ours:
  - Base 14, given always.
  - Items: 2 per item shown, minus 9, so a full table gives 9 and an empty one
    gives minus 9. Filling the table always helps (the shape is Stardew's, from
    the saved page).
  - Categories: 5 for each of the groups shown, up to 30. Our groups for
    slice 1 are artisan goods, cooked dishes, foraged goods, fruit, vegetables
    and minerals. Six groups, so six is the full mark. Fish and animal products
    join in slices 2 and 3.
  - Value: per item, quality points (normal 0, silver 1, gold 2) plus 1 for
    every 100g of sell price, up to 3. At most 5 an item, 45 in all. Stardew's
    own value rule was not in the saved page (SC-53).
  - A table of nine goods in six groups at top value scores 98.
- **Places** (placeholder): first 85 points or more, second 70, third 55,
  otherwise fourth.
- **Prize**: show tokens. 1,000 for first, 500 for second, 250 for third, 50 for
  fourth. Tokens do not carry between years. Stardew's amounts and pacing are
  from the saved page, ours are the same on purpose.
- **Prize counter.** The elderfruit stays a gold purchase, as note 39 decided
  (2,000g, a gold sink that is never missable). Show tokens buy the rest: a
  seasonal hat, two furniture pieces and a seed pack. The item list and names
  are open.
- Achievement hook: first place gives the First Rosette achievement and Rosette
  Hat (`38_achievements.md`).
- No time pressure and no minigames. Judging is one tap.

## Hollow Eve (Fall 21)

- Opens at 8 pm and closes at 11:30 pm, then the player is sent home at
  midnight. The player goes to the green after dark. The game asks first.
  (Stardew's festival runs from 10 pm and ends at midnight, checked. Ours opens
  earlier because nightfall in fall is 7 pm.)
- **One maze**, the same layout every year to begin with. It is a hedge maze
  hung with lanterns, with no dead ends longer than a few tiles, no timer and
  nothing that hurts. The scares are stationary: a scarecrow that turns, a
  pumpkin that grins, a ghost sheet that drifts. Villagers stand inside and
  react to them in a line each (Stardew's maze has talkers inside, checked).
  A second, larger maze for year two is parked.
- A chest sits at the end. The first time, it holds a unique reward (a hat, name
  open). Each later year it holds a mixed sack worth about 500g of forage and
  fall goods. A cart or shortcut brings the player back to the entrance.
- A booth outside the maze sells fall decor: a carved gourd lamp and two
  furniture pieces. It uses the festival counter built in build 8.

## Frostday (Winter 8)

- Opens at noon on the frozen riverbank, closes at 6 pm. The river is frozen
  and the shops stay open until noon as note 14 says.
- **Slice 1**: ice sculptures and snowmen to look at and talk to, a few
  villagers building them, and a booth selling winter decor (a snow lamp, a
  warm rug, a wreath). There is nothing to win. It is the cozy winter scene.
- **Slice 2**: ice fishing joins at the same place. The player fishes through
  holes in the ice against a few villagers, and wins with at least five fish.
  The first win is a unique reward, later wins pay gold. The details belong in
  `21_fishing.md`, and Stardew's contest shape is checked (needs five fish,
  first win unique).

## Midwinter Feast (Winter 20)

Already designed in note 61 (secret gift pairing, the steward's letter on
Winter 13, a gift counts x5). Its map and shop only need the festival counter.
The booth sells winter furniture from the build 8 list.

## The farm cave

- **Place.** An opening in the farm's north edge leads to a small cave. A floor
  of about 50 tiles, a single room, a lamp at the entrance. It is empty and the
  door is shut until the choice is made (checked on the saved page, which
  gives the entrance near the north edge and a floor of about 50 tiles).
- **Trigger.** The game counts total earnings over the whole game (all gold
  received, as Stardew, owner 2026-11-07, SC-54). When the count passes 25,000g, a villager (name open,
  a wildlife-minded one from notes 19 and 20) arrives the next morning and asks
  to use the cave. A short two-button panel asks the player to pick fruit bats
  or mushrooms. The choice is permanent. The panel shows what each does.
- **Fruit bats.** Each night an empty cave gets no fruit 48 percent, 1 fruit 25
  percent, 2 fruit 13 percent, 3 fruit 7 percent and 4 or more 7 percent
  (`07_tuning_numbers.md`, line 525). Fruit stays until picked up, and more
  fruit in the cave leaves less room. Includes foraged fruit out of season.
  Picking gives 7 foraging experience, Botanist makes the fruit top grade and
  Gatherer can double it.
- **Mushrooms.** Six growing boxes. Each box makes one mushroom every second
  day, picked by hand. Mix of five kinds, our weights: field mushroom 50 percent,
  morel 20, chanterelle 15, cave mushroom 10, snowcap 5. Always normal quality,
  Botanist does not change it. Picking gives 5 foraging experience. Because our
  rare finds are season-locked in the wild (note 07), the cave is the one place
  they come every season, which is the point of the choice.
- **The free dehydrator.** The mushroom cave comes with one dehydrator
  already placed. Everyone else crafts it (below).
- No monsters, no combat, as the farm rule says (`25_stardew_system_review.md`).

## The dehydrator (new machine)

Stardew's dehydrator takes 5 fruit or edible mushrooms and gives a dried
version the next morning (checked on the saved Artisan Goods page).

- **Recipe in our case**, ours: 30 wood, 5 stone, 1 iron bar. Learned at
  Farming level 4 (placeholder). Stardew's recipe uses clay and fire quartz,
  which we do not have yet, and sells it for 10,000g.
- **Input**: 5 of one kind of fruit or edible mushroom. Not red mushrooms or
  any good that harms. Output: dried mushrooms or dried fruit, ready the next
  morning (1 day, as Stardew).
- **Price**: 7.5 times the base price of the input plus 25g, and energy 3 times
  the input's, both as on the saved page. Normal quality only.
- Data in `recipes.json` like the other machines. It uses the multi-source
  recipe support from build 7.

## Build 4 and 5 work this unlocks

1. Fall and winter in the calendar, nightfall at 7 and 6 pm (`26_seasons.md`),
   fall crops and corn's fall season, the eight fall and seven winter goods,
   winter soil digging, rare spawns.
2. The two fall trees (apple, pomegranate), then swap bundle stand-in pools
   back (bundles 4, 9, 10 and 12).
3. The festivals above, using the festival counter and wardrobe from build 8.
   Harvest Showing and the maze need a new map each, Frostday and Midwinter
   one each.
4. The earnings counter, the cave map, the choice panel, the two cave
   behaviours and the dehydrator.

## Built so far (2026-11-07)

The four festivals are built as screens over the farm, like the first four (no
festival maps yet). Harvest Showing: table of up to 9 goods, scoring and places
as above, show tokens (saved with their year), prize counter in tokens. Hollow
Eve: a grid maze in `src/content/maze.json` with stationary scares and a talker,
the chest (Lantern Hood first, then a sack of about 530g once a year), and a
gold counter. Frostday: sights to look at and a winter decor counter. Midwinter
Feast: counter only (the gift pairing waits for friendship). Placeholders,
owner to settle: the Harvest Showing prize counter list (Harvest Crown, two
festival furniture pieces, a pumpkin seed pack), the Hollow Eve hat name, the
festival furniture and hats. Without a dish group the table tops out at 93
points, so first place (85) needs five groups of top goods.

The farm cave is built too (2026-11-07). Earnings from the bin and the shop
count toward 25,000g. Decided later (SC-54, 2026-11-07): all gold received counts, so bundle rewards will too. The build still counts sales only, a leftover. The villager
comes the next morning as a choice screen, once a morning until answered. The
door sits at the north edge of every farm map (column 36), shut until the
choice. Fruit bats and mushroom boxes follow the numbers above, picked with
Action. The free dehydrator lives in the cave as its own state, not in the
farm's machine list, so it needs no map awareness in `Machines`. The villager's
name is still open, so the screen says "a neighbour".

## Still open

- The villager who asks to use the cave, and the Hollow Eve first-time hat.
- The Harvest Showing prize counter list and the points thresholds.
- Stardew's value-point rule for the Grange (SC-53).
