# 61 Friendship and gift tastes

Status: **core rules decided with the owner on 2026-11-06, loose ends settled
later the same day.** The points, caps, gift limits, decay, bad gifts, taste
tiers, how tastes are learned, birthdays, the quality bonus, the six universal
loves, the universal hates, the Midwinter pairing and the first eight people's
lists are set (lists are drafts for the owner to reshape). Rows marked "proposed" were not asked and stand
unless the owner objects. Nothing here is built. It feeds slice 4
(`33_build_order.md`), house tiers 2 and 3 (#286) and the recipe mail
(`24_processing_and_cooking.md`).

Source: the saved Stardew Friendship page, read 2026-11-06. The numbers are
facts about Stardew, used as a starting point for our own rules (ADR 0002). No
text or villager list is copied.

## Why

Friendship was decided to exist (`09_story_and_lore.md`) and marriage was
designed on top of it (`12_marriage.md`), but the mechanics had no note. This
note sets the points, the gifts and the tastes, so that the dialogue, the
recipe mail, the hat standing and the achievements all read one system.

## Decided (2026-11-06)

1. **Scale: Stardew's.** One heart is 250 points. Friends run to 10 hearts
   (2,500 points). A courtable person stops at 8 hearts (2,000) until the player
   gives them a bouquet, then runs to 10. A spouse runs to 14 (`12_marriage.md`).
   Notes 38 and 39 are built on these caps.
2. **Talking is +20 a day,** once per villager per day.
3. **Gifts: one a day, two a week (Stardew).** The week starts on Sunday. Two
   gifts in one week add +10 points the next Sunday morning. A birthday gift
   is always allowed and does not count against the two. A spouse can be given
   a gift every day, with gains and losses halved.
4. **No decay.** Not talking to someone never costs hearts. This keeps the
   rule in `09_story_and_lore.md` and `12_marriage.md`.
5. **Bad gifts do cost points (Stardew).** Dislike is -20 and hate is -40. This
   narrows two earlier lines. "Hearts never fall" in `18_dialogue.md` now means
   no loss from neglect or from dialogue choices. A single bad gift can still
   cost points, and the spouse takes half. No anger, no lasting grudge: the
   villager answers with a wry line, and a later good gift earns the points
   back.
6. **Five taste tiers with universal categories (Stardew).** Love, like,
   neutral, dislike, hate. Points for a gift on an ordinary day:

   | Taste | Points |
   | --- | --- |
   | Love | +80 |
   | Like | +45 |
   | Neutral | +20 |
   | Dislike | -20 |
   | Hate | -40 |

   A villager's own list overrides the universal taste. An item on no list falls
   to its category's universal taste, then to neutral.
7. **How the player learns tastes.** Three ways:
   - **A gift log** on the Social tab (`49_menu_and_journal.md`) records each
     gift given and the reaction, kept per villager.
   - **Family and friends hint** (Stardew). From 1 heart a villager may say what
     a relative or friend loves or hates. The links are cast data
     (`20_ring1_cast.md`, households).
   - **The inn hint (ours).** The inn keeper's family give one hint a day to
     anyone who asks, about a villager the player has met. No secret notes in
     the first build.
8. **Birthdays: one each (Stardew).** A gift on the birthday counts x8 and
   ignores the weekly cap. The calendar shows birthdays. None falls on a
   festival day. A birthday in Hearthwell is a small hat day in the Brimmers'
   custom (flavour only, no extra mechanic).
9. **Quality counts for liked and loved gifts (Stardew).** Silver x1.1, gold
   x1.25, iridium x1.5. A normal quality loved gift still beats an iridium
   liked one (80 against 67). Our quality tiers are assumed to match the
   crops' tiers in `07_tuning_numbers.md`. Check at build.

## Points table (derived)

| Gift | Ordinary day | Birthday (x8) | Midwinter Feast (x5, proposed) |
| --- | --- | --- | --- |
| Love | 80 | 640 | 400 |
| Like | 45 | 360 | 225 |
| Neutral | 20 | 160 | 100 |
| Dislike | -20 | -160 | -100 |
| Hate | -40 | -320 | -200 |

Quality multiplies only the Love and Like rows. A normal loved gift on a day
that is not special is a little under a third of a heart.

## Proposed (not asked)

These follow the saved page and our earlier notes. They stand unless the owner
objects.

1. **A request delivery is +150 points** to the poster (`50_request_board_and_quests.md`).
   It is not a gift and does not use the daily gift.
2. **Midwinter Feast** (`14_festival_calendar.md`): the player gives a gift to
   one assigned villager, worth x5. A villager gives the player one back.
   Speaking at any festival is still +20, the same as any day. The pairing rule
   is decided, see "Midwinter pairing" below.
3. **The Guests' Board bundles** (22 to 26, `16_bundles.md`): when the last of
   the five is finished, every villager who is not a candidate and whom the
   player has met gains +500 (two hearts). Stardew gives this for its bulletin
   board. A letter from the hall steward arrives the next morning.
4. **First meeting.** The first talk with each person is when they join the
   Social tab. People not yet met show as "???" and gain no points from the
   bundle bonus.
5. **Flower Dance equivalent:** the dance partner at the spring festival gains
   one heart (250). Whether we have such a dance is for the festival design.
6. **A person's door.** The player may enter a villager's home room at 2
   hearts, as in Stardew. Before that the door is shut and the person is met
   outside, at the shop or on the street. It stays open once unlocked
   (`58_interiors.md`).
7. **Heart events** (settled in `62_heart_events.md`) at 2, 4, 6, 8 and 10 hearts for the 14 candidates and the
   deep tier, fewer for the rest. They are released in layers: layer 1 for
   everyone before layer 3 for anyone (`18_dialogue.md`). Courtship events
   unlock after the bouquet. Missed events can be seen later, in any order,
   except where the story needs one first. An event never takes hearts away
   through a choice. A choice may change how fast hearts rise.
8. **Recipe mail** at 5 and 10 hearts, for people who cook or keep a shop
   (`24_processing_and_cooking.md`). Keepsake mail from other people at the same
   steps (`10_customisation.md`, `51_mail_and_letters.md`).
9. **Spouse perk:** at 12.5 hearts (3,125 points) the spouse gives a rare
   permanent boost, our own item (`12_marriage.md`).
10. **Hat standing stays cosmetic.** The player's hat is only a look. Brimmers'
    dialogue and the Hat Parade react to hearts, not to which hat is worn.
    This settles the open question in `10_customisation.md`.
11. **No per-villager hat record (removed 2026-11-10).** Hats are not given to
    villagers, and the summit scene shows each villager's usual hat
    (`39_completion_total.md`, "Summit build decisions").
12. **Courtship and proposal items** are the bouquet and the unworn token from
    `12_marriage.md`. Flower types and the token's name stay open.
13. **Children have a lower weight.** They use the 10 heart cap and the standard
    dialogue tier. They do not count toward the Friends category in note 39 or
    the heart achievements in note 38, as already set.

## Universal tastes (decided 2026-11-06)

**Seven gift categories (Stardew's grouping, our items):** artisan goods,
dishes, flowers, foraged minerals, tree fruit, gems and vegetables. Each item
in the game belongs to at most one. Every item carries a `giftCategory` field in
its data, or none.

- **Processed goods count as artisan goods (Stardew).** Wine, jam, honey,
  cheese, cloth and the rest are liked by default, whatever went in. Exceptions
  are per item in the data, such as raw oil (disliked).
- **No universal rule for eggs, milk, fish and other forage (Stardew).** They
  have no category. Each villager's own list names the ones they love, like,
  dislike or hate. Anything unlisted is neutral (+20).
- **Flowers are a category, and a foraged flower is a flower.** The daffodil
  and the sweet pea are flowers, so liked by default. (This follows from the
  flower category, and Stardew does the same.)
- **Six universal loves, a fixed named list (Stardew, decided 2026-11-06).**
  Stardew has six fixed named items that every villager loves. Ours has six of
  our own, one per slot type:

  | Slot | Item | State |
  | --- | --- | --- |
  | Rare sea find | The Pearl Lobster's pearl | Designed (`21_fishing.md`) |
  | Legend fish | The Hearthwell Carp | Designed (`21_fishing.md`) |
  | Late artisan good | Truffle oil | Designed (`24_processing_and_cooking.md`) |
  | Rare animal product | Moonwool, a rare fleece from a well kept sheep | Designed, name is a placeholder (`23_animals.md`) |
  | Prize crop | The Blue Ribbon Melon, the Harvest Showing first prize | Designed, name is a placeholder (`14_festival_calendar.md`) |
  | Top gem | The Glimmerstone | Designed, name is a placeholder (`22_mines.md`) |

  The common Carp is a universal hate (below) and the Hearthwell Carp a
  universal love. They are different items, as the cove legend is a separate
  record. Elderfruit is not a gift love, so a boost is never spent as a present.
  Exceptions are per villager, as in Stardew where one person hates a
  universal love.
- **Universal hates: a long list, categories plus named items (Stardew,
  checked 2026-11-06).** This replaces an earlier line here that said Stardew
  has two or three. The saved Friendship page, section Universal Hates, shows
  four whole categories and about sixty named items, mostly things that are not
  meant as presents. The page also lists per-villager exceptions, as ours does. Ours follows that shape with our own items, and
  is data (a `hate` flag on the item, or a category rule), never code:
  - **Whole categories:** all bait, all found things (our fossil and artifact
    equivalent, note 63), all monster drops, all trash. The exceptions that are
    only disliked follow Stardew's pattern: driftwood among the trash, and the
    two rare essences among the drops once those exist.
  - **Named items, by kind:** raw ores and coal (copper ore, iron ore),
    warp totems and other travel items, the placed or tool-like items (cookout
    kit, crab pot, torch, tent), hay, sap, seaweed and algae, snails, slime
    eggs, sea urchins, the common Carp, the poppy and the red mushroom, spoiled
    and burnt dishes, and raw sugar-like staples when we have them.
  - **Written as the items exist.** The data holds the four categories and the
    named items we already have. A new item gets its taste when it is added,
    so the list stays complete.

| Taste | Rule |
| --- | --- |
| Love | The six rare items. Exceptions per villager |
| Like | The seven categories |
| Neutral | Everything else, including eggs, milk, fish, other forage, grain, plain bread and fried egg |
| Dislike | Raw oil, junk and trash, weeds and raw stone, and a few more per item |
| Hate | The four categories (bait, found things, monster drops, trash) and a long list of named items, as above |

Our lists are built from our items (`src/content/`), never a copy of Stardew's.
Each person's own list overrides these.

## Personal lists (decided 2026-11-06)

- **Size, checked on six saved Stardew pages (SC-43).** Stardew's named loves
  run 2 to 8 per person, named likes 2 to 5, named dislikes 1 to 3 and named
  hates 1 to 5. The rest of a person's taste is a short list of category
  exceptions, such as "dislikes all fruit and all eggs, except these". Ours
  follows that shape: per person about 3 to 6 loves (up to 8 for the deep
  tier), 2 to 5 likes, 1 to 3 dislikes, 1 to 3 hates, plus up to three category
  overrides. A few people (Stardew's doctor is the case) may have a long list.
  The writing load is held by layer (`18_dialogue.md`).
- **Written first, for slice 4: the people it touches.** Inn keeper, carpenter,
  keeper of the animal farmstead, hat-maker, store keeper, healer, hall steward
  and the gardener. They run the kitchen, builders, animals, hats and shop.
  The other 22 are added by layer. Stardew has everyone giftable from the
  start, and ours does not.
- **Personalities come first (owner's choice, 2026-11-06).** Each list below
  follows a one line temperament, so a taste always has a reason. The
  temperaments are drafts. They seed the voice sheets (`18_dialogue.md`), and
  the voice sheet may change them, so the lists follow if it does. Names are
  still open, so each person is shown by role.

### The first eight (draft, for the owner to reshape)

Items are ours. "Likes all X" is a category override. Anything on no list falls
to the universal taste. The six universal loves and the hates above apply to
everyone unless a row says otherwise.

| Person | Temperament | Loves | Likes | Dislikes | Hates |
| --- | --- | --- | --- | --- | --- |
| Inn keeper | Warm, loud, feeds everyone and keeps a mental ledger of who owes whom a pie | Cheese, beer, pickles | Honey, goat cheese, all eggs, leek, potato, corn | Raw oil, fiber | Coal, clay |
| Carpenter | Dry and practical, fond of well made things, dislikes fuss | Copper bar, iron bar, hot pepper, wood | Tomato, cauliflower, beer | Jam, wine | Sweet pea, dandelion |
| Animal keeper | Shy and gentle, talks to animals more than to people | Goat milk, cloth, egg, flower honey, sweet pea | Wool, milk, hay-free dishes (all dishes except burnt ones) | Wine, beer | Smoked fish, mayonnaise |
| Hat-maker | Bright, vain and chatty, notices what you wear | Cloth, dye, wine, grape, daffodil | Wool, sweet pea, jam | Coal, clay, hay | Sap, raw stone |
| Store keeper | Brisk and shrewd, counts coins and admires a good crop | Jam, melon, cauliflower | All vegetables, wine | All forage except grape and spice berry | Pearlback (hard to price), dandelion |
| Healer | Calm and precise, mixes tonics, likes quiet things | Flower honey, daffodil, fiddlehead fern, juice, quartz | Garlic, spice berry, dandelion | All alcohol (wine, beer, mead) | Coal, smoked fish |
| Hall steward | Formal and fond of order, hides a sweet tooth | Mead, goat cheese, honey, radish | Corn, cauliflower, cloth | Hot pepper, garlic | Dandelion, salmonberry |
| Gardener | Easy going, always in the dirt, hums to the seedlings | Red cabbage, kale, spice berry, salmonberry, garlic | Tomato, green bean, fiddlehead fern, radish | Cheese, mayonnaise | Hot pepper, slime |

Overlaps were spread on 2026-11-06 (owner's choice): melon, beer and honey
each have one lover, and the steward's sweet tooth now shows through honey.
Cloth stays shared by the animal keeper and hat-maker on purpose.

Sizes follow the shape above (3 to 6 loves, 2 to 5 likes, 1 to 3 dislikes, 1 to
3 hates, up to three overrides). The inn keeper's family, the carpenter and
the steward are the people most linked to bundles and the kitchen, so their
likes lean on cooked and made goods. Wheat joins the lists when it exists
(`63_bundle_pools_part_two.md`).

## Birthdays (decided 2026-11-06)

- **Even spread, one birthday a day.** Two of the first eight per season, and
  about 7 or 8 a season at 30 people. No two people share a day. Never on a
  festival day (`14_festival_calendar.md`), on day 1 of a season, or on Spring 5
  (the day the mines open). Stardew keeps one name a day and puts 8 or 9 in each
  season, and keeps them off festival days, from the saved Calendar page (SC-44).
  The day 1 and Spring 5 rules are ours.
- **The first eight:**

  | Season | Day | Person |
  | --- | --- | --- |
  | Spring | 14 | Hat-maker |
  | Spring | 26 | Healer |
  | Summer | 13 | Gardener |
  | Summer | 25 | Store keeper |
  | Fall | 4 | Carpenter |
  | Fall | 17 | Animal farmstead keeper |
  | Winter | 12 | Inn keeper |
  | Winter | 26 | Hall steward |

- **The calendar shows them.** The farmhouse calendar and the Social tab list a
  season's birthdays, as Stardew's calendar does. The hat-maker's sibling stays
  on a different day from the hat-maker.
- **The other 22 (decided 2026-11-10, owner),** by the same rules. Spring 8,
  summer 8, fall 7, winter 7. The late-reveal people show their birthday once
  met, like everyone, under the name the player knows (Old Greencoat for
  Rundahl, Lane for Aldreth). Rundahl (winter), Aldreth (spring) and
  Rosmarin (fall) are kept in different seasons because they drive the story
  (owner, 2026-11-10).

  | Season | Day | Person |
  | --- | --- | --- |
  | Spring | 3 | Toby |
  | Spring | 7 | Linnet |
  | Spring | 12 | Bramwell |
  | Spring | 18 | Marl |
  | Spring | 23 | Rushie |
  | Spring | 28 | Aldreth |
  | Summer | 2 | Fitch |
  | Summer | 5 | Maren |
  | Summer | 11 | Barnaby |
  | Summer | 16 | Dunmar |
  | Summer | 22 | Hester |
  | Summer | 28 | Podge |
  | Fall | 2 | Wren |
  | Fall | 7 | Korvi |
  | Fall | 12 | Thistle |
  | Fall | 24 | Rufus |
  | Fall | 27 | Rosmarin |
  | Winter | 3 | Pim |
  | Winter | 6 | Dorrie |
  | Winter | 15 | Thalwen |
  | Winter | 22 | Rundahl |
  | Winter | 24 | Walter |

## Midwinter pairing (decided 2026-11-06)

- **A letter a week before.** On Winter 13 the hall steward's letter names the
  villager the player gives a gift to at the feast on Winter 20. Stardew sends
  its letter a week before its feast, on the 18th for the 25th, and names the
  recipient the same way, from the saved Feast of the Winter Star page.
- **Random among people the player has met.** Stardew picks any villager at
  random. Ours never names someone not yet met (the safety rule), and never a
  child below the standard tier, so the letter is always something the player
  can act on. If fewer than three people are met, the steward is named.
- **The giver stays a secret until the feast,** as in Stardew. A met villager
  is drawn at random to give the player one gift. The gift is a taste based
  pick, an item that villager loves or likes, so it always reads as chosen.
- **The player's gift** is worth x5 (the points table). The recipient's reply
  is the festival reaction line. The rule is data in `festivals.json`.

## Data and build

- **Item data:** crops, forage and later items gain an optional `giftCategory`
  (one of the seven). Today `crops.json` and `forage.json` have none.
- **Villager row:** id, birthday (season and day), tier, candidate flag, heart
  cap (8 or 10), loves, likes, dislikes, hates, family and friends for hints.
  Lists can name an item or a category. Adding a villager never means a code
  change (`09_story_and_lore.md`).
- **Save fields:** points per villager, gifts given this week, whether the
  daily talk and gift were done, the gift log, whether the bouquet was given,
  the last hat given, and the spouse state. It goes in a save version bump
  (`src/scenes/storage.ts`).
- **Core module:** `src/core/friendship.ts`, free of Phaser, covers points,
  caps, the weekly rule, taste lookup and the quality multiplier. It is unit
  tested.
- **Interface:** the Social tab (`49_menu_and_journal.md`) shows hearts, the
  weekly gift boxes and the gift log. The talk and gift prompts live on the
  villager.
- **Build order:** slice 4 (`33_build_order.md`). Layer 1 of the dialogue and
  the first eight villagers' tastes go first.

## Not decided (open)

- The final names of Moonwool, the Blue Ribbon Melon and the Glimmerstone. Their
  systems are settled (notes 23, 14 and 22), but the Harvest Showing scoring and
  the gem list are not.
- The other 22 people's lists, written by layer. Names and voices for all.
- ~~Whether the week has seven named days.~~ Settled 2026-11-10: seven days,
  Monday to Sunday (note 79).
- Heart event content (see `62_heart_events.md`).
- The courtship bouquet's flowers and the proposal token's name.
- Whether telephone-like contact exists. It does not now.

## Stardew checks

All numbers above come from the saved Friendship page, read 2026-11-06. The
universal hate list is from the same page, section Universal Hates (the owner's
screenshot was of it), so no register row is needed. The Midwinter letter timing is from the saved Feast of the Winter
Star page. Not checked: the gift log's exact reactions, and
the Friendship 101 book (+10 percent gains), which we do not have.
