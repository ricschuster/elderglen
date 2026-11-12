# 90 Gift tastes for the other 22 people (draft)

Status: **decided as drafted (owner, 2026-11-12); single lists may still change later.** Closes the design part of #872. Rules, sizes
and the first eight lists are in `61_friendship_and_gifts.md` (sizes: 3 to 6 loves, up
to 8 for the deep tier, 2 to 5 likes, 1 to 3 dislikes, 1 to 3 hates, up to three category
overrides). The six universal loves and the universal hates apply unless a row says
otherwise. Temperaments are one line, drafts that the voice sheets (`18_dialogue.md`) may
change. Item ids are the built ones. A name in `#` is a category. Nothing here is built.

Overlap rule kept from note 61: a named item has at most two lovers. Where an item is
already loved by the first eight, it is not a love here unless marked.

## Lists

| Person | Temperament | Loves | Likes | Dislikes | Hates |
| --- | --- | --- | --- | --- | --- |
| Bramwell (smith) | Gruff and slow to warm, proud of honest work | iron-bar, gold-bar, hearty-omelette, baked-potato | copper-bar, cheese-melt, #mineral | #flower, jam | sweet-pea, juice |
| Dorrie (store keeper's partner) | Tidy, keeps the books, bakes at night | market-pie, peach, pomegranate, inn-custard | #fruit, tomato, garden-salad | field-mushroom, wild-garlic | gloop-jelly, bat-wing |
| Fitch (store keeper's child) | Sweet-toothed and magpie-minded | apple, cherry, bramble-berry, pocket-coin | corn, hazelnut, fried-egg | kale, garlic, radish | field-mushroom, hot-pepper |
| Podge (inn keeper's partner) | Easy, cooks all day, tastes everything | mushroom-stew, harvest-hotpot, red-cabbage, chanterelle | #dish, potato, cheese | #gem, clay | frost-berry, ice-shard |
| Pim (inn keeper's child) | Loud and curious, hates being told no | inn-custard, apple, honey | egg, fried-egg, corn | leek, kale | garlic, snow-tuber |
| Dunmar (librarian) | Dry and precise, keeps favour ledgers | quartz-crystal, mushroom-stew, juice | #mineral, cheese, red-cabbage | #monster-drop, beer | hay, gloop-jelly |
| Rufus (carpenter's partner) | Cheerful, whittles, always sawdust | wood, baked-potato, beer, corn | hearty-omelette, cheese, goat-milk | fiber, jam | sap, clay |
| Wren (carpenter's child) | Climbs things, collects bits | chestnut, pine-nut, pocket-coin, fried-egg | apple, hazelnut, honey | eggplant, beet | wild-ginger, wine |
| Barnaby (hat-maker's sibling) | Roguish, makes a joke of everything | wine, pomegranate, red-cabbage, hot-pepper | cheese, jam, #fruit | milk, oil | fiddlehead-fern, seaweed |
| Linnet (inn, young adult) | Bright, hurried, always the first in | juice, peach, garden-salad, snowdrop | #flower, fried-egg, cherry | beer, fisher-stew | field-mushroom, snowcap |
| Thistle (inn, young adult) | Dreamy, reads under the counter | crocus, cherry, spice-berry, moonmirror | #flower, mushroom-stew, honey | #monster-drop, hot-pepper | sunk-boot-loach, hay |
| Hester (retiree) | Warm and nosy, knits | cloth, wool, flower-honey, pumpkin-soup | tomato, melon, inn-custard | hot-pepper, mayonnaise | clay, seaweed |
| Walter (retiree) | Quiet fisher, tells long tales | perch, catfish, fisher-stew, beer | mackerel, baked-potato, wheat | #flower, jam | pin-urchin |
| Toby (retirees' grandchild) | Shy, collects bugs and shells | cockleshell, pearly-shell, spiral-shell, apple | honey, fried-egg, corn | cheese, kale | wild-garlic, garlic |
| Rosmarin (the hermit) | Wry, distrusts visitors, fond of odd roots | frost-root, snow-tuber, wild-ginger, truffle-oil | #forage, mushroom-stew | #dish, juice | cheese, beer |
| Rundahl (the Wanderer) | Gentle, old, dresses in green | wild-garlic, fiddlehead-fern, holly-sprig, hazelnut | #forage, honey | #monster-drop | fisher-stew, coal |
| Korvi (mountain smith) | Blunt and generous with fire | gold-bar, iron-bar, copper-bar, ember-trout | hearty-omelette, hot-pepper, #gem | #flower, juice | sweet-pea, snowdrop |
| Marl (quarry stonekeeper) | Patient as a stone, hums low | quartz-crystal, granite-gudgeon, baked-potato | #mineral, wheat, beer | #flower, mayonnaise | frost-berry, dandelion |
| Maren (mines trainer) | Direct, sporty, counts reps | hearty-omelette, harvest-hotpot, ember-trout, melon | #dish, egg, juice | wine, jam | gloop-jelly, bat-wing |
| Rushie (Delta fisher) | Easy and salty, laughs a lot | mackerel, cod, harbour-ray, kelp-ribbon | #fish except the legendary, beer, fisher-stew | wine, cheese | clay, hay |
| Thalwen (sea elf) | Remote, curious about the land | pearlback, sea-fan, lantern-squid, razor-clam | #shell, juice, honey | #artisan except juice, hay | coal, carp |
| Aldreth (courier) | Brisk and warm, tired of roads | fried-egg, hearty-omelette, fisher-stew, juice | #dish, cheese, honey | wine, oil | gloop-jelly, hay |

## Defaults

`defaultList` is the safety net for any item a person has no taste for and no category
taste either. Once all 30 lists exist, it only meets new items. Fill it with the
universal taste shape: neutral on everything but the hates, so a new item is never a
surprise gift.

## Left for the owner

- Reshape any list. These are drafts built on temperament, not on the villagers' voice.
- Items that do not exist yet (tea, more jams, sardine oil) join the lists when they do.
