# 112. Year two (M3c, #604)

Drafted and settled with the owner on 2026-11-24. Closes the "year two rules" part of #604. Rule 6 was revised the same day after reading the saved Special Orders page. Stardew claims
are from the saved Carpenter's Shop, Blacksmith, Stone, Coal, ore, Crops and Crab Pot pages (read
2026-11-24) unless marked "from memory".

## Settled before (not reopened)

- Winter 28 rolls straight into spring of year 2, with no year-end screen (note 33, SC-05).
- Year two loses nothing: bundles stay open with no deadline (note 63, SC-129).
- Festivals alternate by year: the seed hunt spots (odd and even years) and the larger Hollow Eve maze in
  even years (notes 66 and 82, built).
- The shrine evaluation runs at the start of year 3 (note 83, built).
- The end screen comes only from finishing the Last Seat (note 33).

## Decided (owner, 2026-11-24)

1. **Play goes on after the ending (Stardew, from memory, SC-226).** The Last Seat's bridge scene and end
   screen close into the next morning, with the bridge mended. Nothing stops.
2. **Raw materials cost more from year two (Stardew, saved pages).** On Spring 1 of year 2 the carpenter's
   and the smith's buy prices step up by Stardew's factors, and a notice letter arrives that morning
   ("The price of raw materials at the carpenter's and the smith's has gone up."; placeholder text). Selling
   prices do not change (Stardew, saved Carpenter's Shop page).

   | Good | Stardew year 1 to 2+ | Factor | Ours year 1 | Ours year 2+ |
   | --- | --- | --- | --- | --- |
   | Wood (carpenter) | 10g to 50g | x5 | 10g (450 for 4,500g, note 41) | 50g (450 for 22,500g, note 41) |
   | Stone (carpenter) | 20g to 100g | x5 | as now | x5 |
   | Copper ore (smith) | 75g to 150g | x2 | 25g | 50g |
   | Iron ore (smith) | 150g to 250g | x5/3 | 50g | 85g (rounded up to 5) |
   | Coal (smith) | 150g to 250g | x5/3 | 50g | 85g |
   | Gold ore (smith) | 400g to 750g | x1.875 | 100g | 190g (rounded up to 5) |

   Any ore or material the smith or carpenter sells that Stardew does not (Hearthsilver ore, hardwood,
   clay) keeps its price. Prices stay placeholders in note 07.
3. **Three seeds are held back to year two (Stardew, saved Crops page).** Garlic, red cabbage and artichoke
   seeds are sold from Spring 1 of year 2 only. This reverses note 07 ("Ours are open in year one"). Mixed
   seeds can still give them in year one (Stardew, saved Crops page). No bundle is blocked: Autumn Crops
   needs 4 of its 6 and Dyer's 4 of its 12 (checked against `bundles.json`), and no special order asks for
   them.
4. **The Animal Catalogue and deluxe speed-gro are sold from year two (Stardew, from memory; already
   written in notes 23 and 07).** The catalogue (5,000g) at the farmstead, opening the animal shop when the
   keeper is away; deluxe speed-gro (150g) at the general store.
5. **Year-two lines (ours).** Each villager gets a few lines (placeholder: 2) that join their talk only from
   year two, so the village remembers. Villagers have no per-person lines yet (`townfolk.ts` has one
   placeholder line per kind of meeting), so this rule lands with the voice sheets (M3d).
6. **Harder special orders after the Last Seat (Stardew, saved Special Orders page).** The saved page shows
   Stardew's town orders are not held back by year (prerequisites are none, a season or the island); its
   harder set (Mr. Qi's) opens at a late milestone. Ours: a second set of 6 orders joins the board the
   morning after the Last Seat is finished (the bridge mended), so play-on (rule 1) has new goals; the first
   ten stay. From the same morning the request board's counts are x1.5 (ours, rounded up). Year two adds no
   orders. Gold raised toward the top of Stardew's town range (owner; the page runs 500g to 6,000g).

## Harder special orders (placeholders, owner accepted 2026-11-24)

Built from the order kinds that exist (`orders.json`): `ship-one-crop`, `ship-quality-vegetables`,
`catch-one-fish`, `catch-water`, `slay-one`, `hand-in` (`total`, `one-kind`, `distinct`).

| id | Title | Ask | Days | Gold |
| --- | --- | --- | --- | --- |
| `deep-haul` | Deep Haul | hand in 10 gold bars at the smithy | 14 | 3,500 |
| `fine-harvest-2` | The Finest Table | ship 50 gold quality vegetables | 28 | 3,000 |
| `long-lines` | Long Lines | catch 40 fish in the sea | 7 | 3,000 |
| `deep-patrol` | Deep Patrol | beat 100 of one creature from floor 81 down | 7 | 6,000 |
| `jewel-case` | The Jewel Case | hand in 10 different gems at the library | 14 | 3,000 |
| `timber-yard` | Timber Yard | hand in 100 hardwood at the carpenter's | 14 | 3,000 |

## Build order

1. Gates in core: a `fromYear` field on shop rows, and an `afterLastSeat` flag on orders, read by the shop and the board.
2. The price rise (rule 2) as a year-two price per row, and the Spring 1 letter.
3. The seed gate (rule 3), the catalogue and deluxe speed-gro (rule 4).
4. The six harder orders and the x1.5 request board counts after the Last Seat (rule 6).
5. Play on after the ending (rule 1): check the end screen returns to the next morning, with a test.

Rule 5 waits for the voice sheets (M3d).

## Open

- SC-226: Stardew's play-on after the Community Center (ours chosen either way).

## As built (build, 2026-11-25)

Steps 1 to 5 are built. Data is `src/content/year-two.json` (gates, raw prices, request factor), rules are
`src/core/yeartwo.ts`, tests are `tests/yeartwo.test.ts`.

- **Gates.** `rowOpen(id, day)` reads a list of rows with `fromYear`. The general store's seed list takes the day
  (`seedStock(season, day)`), so garlic, red cabbage and artichoke seeds show from Spring 1 of year 2. The Night
  Market's seeds are not gated. Orders carry `afterLastSeat`; `weeklyPick`, `Orders.board`, `Orders.accept`, and the
  request board take a `hard` flag that the scenes and intents set from `afterLastSeat(g)`.
- **"The morning after" is simplified.** The flag is `g.hall.bridgeMended`, derived, so the harder orders and the x1.5
  counts apply as soon as the Last Seat is done, not from the next morning. Nothing is saved.
- **Price rise.** Item `buyPrice` stays the year one price. `buyPriceOn(id, day)` gives the year-two price, and the
  smith's `smith-buy` ore intent and the ore rows use it. Stone and wood are in the table, but the carpenter does not
  sell them yet (note 41), so nothing reads those two rows. The letter (`price-rise-letter`) uses a new `year` mail
  trigger and arrives on Spring 1 of year 2 (a save already past that day gets it on its next morning).
- **Deluxe speed-gro** is `deluxe-speed-fertilizer` (+25 percent growth, 150g, sells 40g, from year 2, general store).
  The +25 percent is Stardew's, from memory (SC-47 family).
- **Animal Catalogue.** An item bought once for 5,000g at the farmstead keeper from year 2 (`keeper-buy`, `catalogue`).
  Its use, opening the animal shop when the keeper is away, is not built; it is only a kept item for now.
- **Harder orders.** Six rows in `orders.json` with `afterLastSeat`. Places: smithy (8,8), library (23,21), sawmill (6,8).
  Deep Patrol counts any floor, since the kill tally has no floor; the "from floor 81 down" condition is left out. The
  first-reward text is "the thanks of the valley" (gold only). Request pay follows the x1.5 count.
- **Play on.** The end screen's Keep playing now ends the day (`FarmScene.endDay`), so the player wakes the next
  morning with the bridge mended, as a guest or host goes to bed. `endDue` still fires once (`endSeen`). The test sleeps
  once the hall is full and checks the next day, no second end screen, and the bridge mended.
