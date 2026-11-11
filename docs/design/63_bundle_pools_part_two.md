# 63 Bundle item pools, part two, and the reward rebalance (draft)

Status: draft, 2026-11-06. The three forks below were decided with the owner.
The item lists and counts are the assistant's proposal for the owner to reshape,
and every number is a placeholder. Nothing here is built. It finishes the
pools that `35_bundle_pools.md` left open (bundles 11, 21 and 22 to 26) and
does the rewards pass of #201. Bundles 13 to 18 already have their pools in
`21_fishing.md`, and bundle 20 keeps its rule in `16_bundles.md`. Stardew's
Bundles page was read as reference only (ADR 0002). No text is copied.

## Decided with the owner (2026-11-06)

1. **Weaver's asks for raw goods.** Its reward is the loom, so it cannot ask
   for cloth. It takes wool and plant fibre, and the loom then makes the cloth
   for bundles 29 and 30. Thread is dropped (we have no thread item).
2. **Fodder takes wheat, as in Stardew.** Wheat is a new crop, summer and fall.
   It is also the grain for the hay bundle. Numbers go in `07_tuning_numbers.md`
   when the crop is built.
3. **Slice 4 stays as note 33 has it.** The Larder's last bundle, the Hearth and
   the Guests' Board all finish there. It is the slice most likely to run long.
4. (Later the same day.) **Bundle 15 gives warp totems to the Beach, as in Stardew** (the saved
   Bundles page shows a Beach warp totem as its Ocean Fish reward). The totem is
   a consumable that returns the player to the Beach. Its recipe and count are
   for the crafting note.
5. (Later the same day.) **Bundle 20 gives a small glow ring.** It is a plain light ring of radius 5
   (`37_equipment.md`), not the radius 10 glow ring of bundle 16. Rings of the
   same kind stack, so a player who has both gets the sum. The slot is built in
   slice 3, so the ring is ready when slice 4 hands it out.
6. (Later the same day.) **Bundle 29 gives a large chest.**
7. (Later the same day.) **Found things come from surface digging and the mines.** The hoe on an
   artifact spot gives a find, commoner in winter, as in Stardew (saved
   Artifacts page). The mines add ruins, quiet floors and Old Diggers.

## A rule the pools follow

A bundle must be fillable before its own reward exists. Bundle 12 already
follows this (no keg goods). The same check found two circles in
`16_bundles.md`: Weaver's (loom) and Dyer's (dye vat). Both now ask for raw
goods. Bundle 11 (cheese press) and bundle 25 (coop heater) were checked and are
fine.

## The pools

"N of M" as in `16_bundles.md`. Any quality counts. Names of dishes are ours and
are settled in the dish list later (`24_processing_and_cooking.md`).

| # | Bundle | Rule | Pool | Reward |
| --- | --- | --- | --- | --- |
| 11 | Animal Goods | 4 of 5 | Egg, duck egg, milk, goat milk, wool | Cheese press |
| 21 | Weaver's | All | 8 wool, 20 fiber | Loom |
| 22 | Cook's | 3 of 5 | Fried egg, garden stew, forager's salad, baked sweet potato, berry compote | 3 feast dishes |
| 23 | Dyer's | 4 of 6 | Daffodil, sweet pea, red cabbage, cranberry, bramble berry, crocus | Dye vat |
| 24 | Host's | 3 of 4 | Bread, honey cake, herb tea, a festival treat | Set of festival hats |
| 25 | Fodder | All | 20 hay, 10 wheat, 10 root crops (parsnip, potato, radish, beet or sweet potato, any mix) | Coop heater |
| 26 | Storyteller's | 3 of 5 | Wild ginger or snowcap mushroom (a rare herb), an old seed packet, a carved bead, a faded ribbon, a pressed flower | A keepsake from Old Greencoat |

### Notes on the pools

- **Bundle 11 needs three animal tiers.** Duck eggs need the big coop, goat milk
  the big barn and wool the deluxe tier (`23_animals.md`). Eggs and milk alone
  give two, so a player needs a big building or a second species to fill four of
  five. That is the point of the bundle. Stardew asks for large goods here. We
  take any quality.
- **Bundle 21 is the slowest to fill.** Wool comes from a rabbit (4 days) or a
  sheep (3 days), both deluxe-tier animals. Eight wool is about one animal for a
  fortnight. The two cloth bundles that follow (29 and 30) need 15 cloth, so the
  loom's output rate must be checked in a playtest.
- **Bundle 22 uses five ring 1 dishes** that any player can cook with no
  recipe from beyond the valley. Fried egg is the starting recipe, so it is a
  free fill. The four others come from the inn kitchen, friendship mail or skill
  rewards (`24_processing_and_cooking.md`). Three of five leaves a choice.
- **Bundle 23 asks for raw colour goods, not dye.** There is at least one source
  in each season (spring daffodil, summer sweet pea and red cabbage, fall
  cranberry and bramble berry, winter crocus), so no season blocks it. The
  vat's reward then turns them into the dyes bundle 29 asks for. The red cabbage
  is on bundle 8's pool too, and is not yet in `crops.json`.
- **Bundle 24's festival treat** is sold at a festival stall or prize counter.
  Skipping it still leaves three of four. Bread and honey cake need honey from
  bundle 9's bee house, so this bundle cannot finish before the bee house.
- **Bundle 25 has a spare hay problem.** Hay comes from cutting grass into the
  silo, and the keeper sells it (`23_animals.md`). Ours counts hay from the
  player's pack, so the player must take hay out of the silo or buy it.
- **Bundle 26 needs found things.** The mines note gives old tools, cups, a
  buckle and a bent key (`22_mines.md`). The carved bead, faded ribbon, seed
  packet and pressed flower are new found things. They come from ruins, the quiet
  mine floors, Old Diggers and surface digging. The surface artifact spots are
  not designed (`25_stardew_system_review.md`), and the completion tracker note
  names the items.

## The rewards pass (#201)

Each reward against the system that gives it, and the slice that builds it
(`33_build_order.md`).

| # | Reward | Arrives | Verdict |
| --- | --- | --- | --- |
| 1, 2, 3 | Seeds | Slice 1 | Fine. |
| 4 | Seed maker | Slice 1 | Fine. |
| 5 | Charcoal kiln | Slice 1 | Fine. |
| 6 | 5 forage dishes | Slice 1 | Cooking is slice 4. Until then it gives raw forage of the same worth, and the dishes come when cooking exists. |
| 7, 8 | Fertilizer | Slice 1 | Fine. |
| 9 | Bee house | Slice 1 | Fine. |
| 10 | Preserves jar | Slice 1 | Fine. |
| 11 | Cheese press | Slice 4 | Fine, animals come with it. |
| 12 | Keg | Slice 1 | Fine. |
| 13 | 30 bait | Slice 2 | Fine. |
| 14 | Lure | Slice 2 | Fine. |
| 15 | 5 warp totems to the Beach | Slice 2 | **Changed** from warp charms (decision 4). The totem recipe is for the crafting note. |
| 16 | Glow ring | Slice 2 | The equipment slot is settled (`37_equipment.md`) but combat widens in slice 3. A placeholder reward until then, as note 33 says. |
| 17 | 5 fish dishes | Slice 2 | As bundle 6: raw fish of the same worth until cooking exists. |
| 18 | 3 crab pots | Slice 2 | Fine. |
| 19 | 20 coal | Slice 1 | Fine. |
| 20 | A small glow ring | Slice 4 | **Changed** from torches (decision 5). The mines open in slice 1, so torches would arrive too late to matter. |
| 21 | Loom | Slice 4 | Fine. |
| 22 | 3 feast dishes | Slice 4 | Fine. |
| 23 | Dye vat | Slice 4 | Fine. |
| 24 | Festival hats | Slice 4 | Fine. Hats are slice 1, so the set slots into an existing system. |
| 25 | Coop heater | Slice 4 | Fine, but winter animals are slice 4 too. The heater only matters from the first winter after the coop. |
| 26 | Old Greencoat's keepsake | Slice 4 | A lore item. Its form is for the story note. |
| 27 | Crystalarium | Slice 5 | Fine. |
| 28 | Magnet ring | Slice 5 | Needs the equipment slot, which exists by then. |
| 29 | Large chest | Slice 5 | **Decided** (decision 6). |
| 30 | Letter to the elves | Slice 5 | Story only. |

### Room rewards

- **Foragers' Shelf:** Old Greencoat's herb and seed stall. Fine in slice 1.
- **Larder:** the greenhouse. Slice 4, since bundle 11 needs animals.
- **Water room:** the ferry and the cove. Slice 2.
- **Hearth:** the carts. Slice 4, because bundles 20 and 21 need oil and cloth.
- **Guests' Board:** two hearts with every villager who is not a candidate and
  whom the player has met (`61_friendship_and_gifts.md`). `16_bundles.md` still
  said "a hat standing boost", which note 61 replaced. The festival extras are
  dropped from this reward, since the hats are bundle 24's.
- **The Last Seat:** the bridge.

### Duplicates with villager gifts

None found. The furnace is the smith dwarf's gift (`22_mines.md`), and the big
furnace is a ring 2 reward. The mayonnaise machine and oil maker come from
farming levels, and no bundle gives them.

## Dependencies this creates

- **Bundles 22 and 24 cannot finish before cooking** (slice 4). Bundle 24 also
  needs honey from the bee house (slice 1) and a festival stall.
- **Wheat joins the crop list.** It is needed by bundle 25 and for flour in
  dishes later. It is summer and fall, like corn.
- **Bundle 21 and the Last Seat share cloth.** The loom's rate sets how long
  the player waits for bundles 29 and 30.

## Open

- **The found things for bundle 26.** The sources are decided (decision 7). Their
  names, spawn rates and the artifact spot design stay for the completion tracker
  note and the gathering notes.
- **The warp totem recipe and count for bundle 15.**
- **Bundle counts** (8 wool, 20 fiber, 20 hay, 10 wheat) are placeholders until
  gathering and animal rates are known.
- The Last Seat numbers and the second-year rule stay in #181.

Settled with the saved Crops page (Stardew, read only): wheat grows in 4 days,
summer and fall, seeds 10g, sells for 25g. Red cabbage is 9 days, seed 100g, sells
260g. Both are in `07_tuning_numbers.md`. Stardew sells red cabbage seed only
from year two, a gate we do not copy. It is only one of Dyer's six dye goods,
so no bundle needs it.

## Decisions 2026-11-11m (owner answers)

- **Year two loses nothing.** Bundles stay open with no deadline, and year two only
  changes the festival cycle and shop stock.
- **Ring 1 ending: a scene on the bridge and a letter, then play continues.** No
  credits. The letter points to ring 2, and the completion tracker shows a marker.
  Not built.
- **Bundles 3, 6, 20, 22, 24 and 26** (absent from `bundles.json`): Claude drafts
  each ask and reward from notes 16 and 63 for the owner to check, before any build.

Built 2026-11-11 (owner chose the rewards): bundle 3 Autumn Foraging (4 of 6, 15
beet seeds), bundle 6 Rare Finds (3 of 5, 5 mushroom stews) and bundle 22 Cook's
(3 of 5 dishes, 3 Innkeeper's roasts, a placeholder feast dish) are in
`bundles.json`. The Last Seat now needs all 23 other bundles (owner, 2026-11-11; the built gate still says 20 and needs changing).
Still absent: 20, 24 and 26 (they need lamps and oil, festival dishes and the
Storyteller's items, none built). The sim bot leaves 6 and 22 unplayed.
